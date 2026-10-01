import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { generateStrongPassword, sendAccessEmail } from "../_shared/access-email.ts";

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

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    log("warn", "invite-user:no-auth-header");
    return jsonResponse(401, { success: false, error: "Missing Authorization header" });
  }

  // Service-role client for privileged ops (auth admin + bypass RLS for memberships insert)
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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

  // Resolve caller. O token vai explícito: getUser() sem argumento, num client
  // de edge function, não tem sessão e devolve 401 para todo mundo — foi por
  // isso que esta função nunca funcionou.
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: callerData, error: callerErr } = await adminClient.auth.getUser(jwt);
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

  // Senha provisória única, que vai no e-mail de acesso. email_confirm pula a
  // confirmação: a pessoa entra direto com login e senha.
  let senhaProvisoria: string | null = generateStrongPassword();
  const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.createUser({
    email,
    password: senhaProvisoria,
    email_confirm: true,
    user_metadata: inviteMetadata,
  });

  let invitedUserId: string | null = inviteData?.user?.id ?? null;

  if (inviteErr) {
    // If the user already exists, fetch their id and continue (allow re-invite without auth churn)
    const errMsg = inviteErr.message?.toLowerCase() ?? "";
    if (errMsg.includes("already") || errMsg.includes("registered") || errMsg.includes("exists")) {
      log("info", "invite-user:user-exists-recovering", { email });
      // Conta que já existia tem senha própria; só ganha uma nova se o convite
      // ainda estiver pendente (abaixo).
      senhaProvisoria = null;
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
      // Reenvio: a pessoa nunca entrou, então ganha senha nova e outro e-mail.
      await adminClient
        .from("company_memberships")
        .update({ position, department_id: departmentId, invited_by: callerId })
        .eq("id", membershipId);
      senhaProvisoria = generateStrongPassword();
      const { error: pwdErr } = await adminClient.auth.admin.updateUserById(invitedUserId, {
        password: senhaProvisoria,
      });
      if (pwdErr) {
        log("error", "invite-user:password-reset-failed", { msg: pwdErr.message });
        return jsonResponse(500, { success: false, error: pwdErr.message });
      }
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

    // Papel de membro, como o sync do Pipefy faz. Sem ele a pessoa entra sem
    // permissão nenhuma. Se já houver papel nessa empresa, fica o existente.
    const { data: roleExistente } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", invitedUserId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!roleExistente) {
      const { error: roleInsertErr } = await adminClient
        .from("user_roles")
        .insert({ user_id: invitedUserId, company_id: companyId, role: "member" });
      if (roleInsertErr) {
        log("warn", "invite-user:role-insert-failed", { msg: roleInsertErr.message });
      }
    }
  }

  // E-mail de acesso (n8n → Gmail), o mesmo do sync do Pipefy. Só sai quando
  // há senha nova para entregar; quem já tinha conta entra com a dele.
  let emailResult: { ok: boolean; error?: string } = {
    ok: false,
    error: "Pessoa já tinha conta; nenhuma senha nova foi enviada",
  };
  if (senhaProvisoria) {
    const { data: invitedRow } = await adminClient
      .from("users")
      .select("full_name")
      .eq("id", invitedUserId)
      .maybeSingle();
    const ok = await sendAccessEmail(email, invitedRow?.full_name ?? null, senhaProvisoria);
    emailResult = ok ? { ok } : { ok, error: "Falha ao enviar o e-mail de acesso" };
  }

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
