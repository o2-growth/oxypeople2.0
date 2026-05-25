import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type InvitePayload = {
  email?: string;
  position?: string | null;
  departmentId?: string | null;
  companyId?: string;
};

function log(level: "info" | "warn" | "error", msg: string, ctx?: Record<string, unknown>) {
  const payload = { level, msg, ts: new Date().toISOString(), ...ctx };
  if (level === "error") console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sendResendWelcomeEmail(args: {
  email: string;
  inviterName: string | null;
  companyName: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    log("info", "invite-user:resend-skip", { reason: "no RESEND_API_KEY — user must use Supabase magic link" });
    return { ok: true };
  }

  const fromAddress = Deno.env.get("RESEND_FROM_EMAIL") ?? "no-reply@o2-growth.com";
  const inviter = args.inviterName ?? "alguém da equipe";
  const company = args.companyName ?? "oxypeople";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [args.email],
        subject: `Convite para entrar no ${company}`,
        html: `
          <p>Olá!</p>
          <p>${inviter} convidou você para fazer parte do <strong>${company}</strong>.</p>
          <p>Você receberá em paralelo um e-mail do Supabase com o link mágico para criar sua senha. Use-o para entrar.</p>
          <p>Qualquer dúvida, é só responder este e-mail.</p>
        `,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      log("warn", "invite-user:resend-failed", { status: res.status, body });
      return { ok: false, error: `resend ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    log("warn", "invite-user:resend-exception", { msg });
    return { ok: false, error: msg };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { success: false, error: "Method not allowed" });
  }

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    log("warn", "invite-user:no-auth-header");
    return jsonResponse(401, { success: false, error: "Missing Authorization header" });
  }

  // Service-role client for privileged ops (auth admin + bypass RLS for memberships insert)
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  // Caller-scoped client used only to resolve the invoking user from the JWT
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  log("info", "invite-user:start");

  let payload: InvitePayload;
  try {
    payload = (await req.json()) as InvitePayload;
  } catch (err) {
    log("warn", "invite-user:bad-json", { msg: (err as Error).message });
    return jsonResponse(400, { success: false, error: "Invalid JSON body" });
  }

  const email = (payload.email ?? "").trim().toLowerCase();
  const companyId = payload.companyId;
  const position = payload.position?.trim() || null;
  const departmentId = payload.departmentId || null;

  if (!email || !email.includes("@")) {
    return jsonResponse(400, { success: false, error: "Email inválido" });
  }
  if (!companyId) {
    return jsonResponse(400, { success: false, error: "companyId obrigatório" });
  }

  // Resolve caller
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData?.user) {
    log("warn", "invite-user:auth-failed", { msg: callerErr?.message });
    return jsonResponse(401, { success: false, error: "Não autenticado" });
  }
  const callerId = callerData.user.id;

  // Verify caller is admin/owner for the target company
  const { data: roleRow, error: roleErr } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (roleErr) {
    log("error", "invite-user:role-lookup-failed", { msg: roleErr.message, callerId, companyId });
    return jsonResponse(500, { success: false, error: "Erro ao verificar permissões" });
  }
  const callerRole = roleRow?.role;
  if (callerRole !== "admin" && callerRole !== "owner") {
    log("warn", "invite-user:forbidden", { callerId, companyId, role: callerRole });
    return jsonResponse(403, { success: false, error: "Apenas admins podem convidar usuários" });
  }

  // Build invite metadata so the new user lands with the right context
  const inviteMetadata = {
    position,
    department_id: departmentId,
    company_id: companyId,
    invited_by: callerId,
  };

  const DEFAULT_PASSWORD = "Alterar@01";

  // Create user with default password so they can log in immediately (no magic link needed).
  // email_confirm: true skips the confirmation e-mail — admin shares the password directly.
  const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: inviteMetadata,
  });

  let invitedUserId: string | null = inviteData?.user?.id ?? null;

  if (inviteErr) {
    // If the user already exists, fetch their id and continue (allow re-invite without auth churn)
    const errMsg = inviteErr.message?.toLowerCase() ?? "";
    if (errMsg.includes("already") || errMsg.includes("registered") || errMsg.includes("exists")) {
      log("info", "invite-user:user-exists-recovering", { email });
      const { data: existing, error: existingErr } = await adminClient
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existingErr || !existing?.id) {
        log("error", "invite-user:user-lookup-failed", { msg: existingErr?.message });
        return jsonResponse(409, {
          success: false,
          error: "Usuário já existe e não foi possível localizá-lo",
        });
      }
      invitedUserId = existing.id;
    } else {
      log("error", "invite-user:invite-failed", { msg: inviteErr.message });
      return jsonResponse(500, { success: false, error: inviteErr.message });
    }
  }

  if (!invitedUserId) {
    log("error", "invite-user:no-user-id");
    return jsonResponse(500, { success: false, error: "Convite criado sem retorno de user id" });
  }

  // Insert membership in 'invited' state. Service role bypasses RLS.
  // Use upsert-style guard: if a membership row already exists, we keep status as-is to avoid
  // resetting an active member back to 'invited'.
  const { data: existingMembership } = await adminClient
    .from("company_memberships")
    .select("id, status")
    .eq("user_id", invitedUserId)
    .eq("company_id", companyId)
    .maybeSingle();

  let membershipId: string;
  if (existingMembership?.id) {
    membershipId = existingMembership.id;
    if (existingMembership.status === "invited") {
      // Touch updated_at to bump invite freshness
      await adminClient
        .from("company_memberships")
        .update({ position, department_id: departmentId, invited_by: callerId })
        .eq("id", membershipId);
    } else {
      log("info", "invite-user:membership-already-exists", {
        membershipId,
        status: existingMembership.status,
      });
    }
  } else {
    const { data: insertData, error: insertErr } = await adminClient
      .from("company_memberships")
      .insert({
        user_id: invitedUserId,
        company_id: companyId,
        status: "invited",
        invited_by: callerId,
        is_new_hire: true,
        position,
        department_id: departmentId,
      })
      .select("id")
      .single();

    if (insertErr || !insertData) {
      log("error", "invite-user:membership-insert-failed", { msg: insertErr?.message });
      return jsonResponse(500, {
        success: false,
        error: insertErr?.message ?? "Falha ao gravar membership",
      });
    }
    membershipId = insertData.id;
  }

  // Best-effort welcome email via Resend (no-op if RESEND_API_KEY missing)
  const { data: inviterRow } = await adminClient
    .from("users")
    .select("full_name")
    .eq("id", callerId)
    .maybeSingle();
  const { data: companyRow } = await adminClient
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  const emailResult = await sendResendWelcomeEmail({
    email,
    inviterName: inviterRow?.full_name ?? null,
    companyName: companyRow?.name ?? null,
  });

  const durationMs = Date.now() - startedAt;
  log("info", "invite-user:done", {
    membershipId,
    invitedUserId,
    emailSent: emailResult.ok,
    durationMs,
  });

  return jsonResponse(200, {
    success: true,
    membershipId,
    userId: invitedUserId,
    emailSent: emailResult.ok,
    emailError: emailResult.error,
    durationMs,
  });
});
