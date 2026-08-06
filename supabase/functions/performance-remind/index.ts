import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { sendEmails, sendSlackDMs, type EmailTarget } from "./_lib/notify.ts";

/**
 * Lembrete de avaliação pendente.
 *
 * Cobrar quem não respondeu era a peça que faltava para o RH tocar um ciclo
 * sozinho: sem isto, a única saída era pedir para alguém rodar um script.
 *
 * Recebe `cycleId` (cobra todo mundo que ainda deve) ou `evaluationIds` (cobra
 * pessoas específicas). O envio é por PESSOA, não por avaliação: quem tem três
 * pendências recebe uma mensagem dizendo três, não três mensagens.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function log(level: "info" | "warn" | "error", msg: string, ctx?: Record<string, unknown>) {
  const payload = { level, msg, ts: new Date().toISOString(), ...ctx };
  if (level === "error") console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface Pendencia {
  evaluator_id: string;
  cycle_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { success: false, error: "Não autenticado" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  try {
    const body = await req.json();
    const cycleId: string | undefined = body.cycleId;
    const evaluationIds: string[] | undefined = body.evaluationIds;
    const channels: string[] = body.channels ?? ["inapp", "email", "slack"];
    const quer = (c: string) => channels.includes(c);

    if (!cycleId && !evaluationIds?.length) {
      return json(400, { success: false, error: "informe cycleId ou evaluationIds" });
    }

    // ---- quem está pedindo ----
    const { data: callerData, error: callerErr } = await caller.auth.getUser();
    if (callerErr || !callerData?.user) {
      return json(401, { success: false, error: "Não autenticado" });
    }
    const callerId = callerData.user.id;

    // ---- o que está pendente ----
    let query = admin
      .from("performance_evaluations")
      .select("id, evaluator_id, cycle_id, company_id, status")
      .in("status", ["pending", "in_progress"]);

    if (evaluationIds?.length) query = query.in("id", evaluationIds);
    else query = query.eq("cycle_id", cycleId!);

    const { data: pendentes, error: pendErr } = await query;
    if (pendErr) throw new Error(`avaliações: ${pendErr.message}`);

    if (!pendentes?.length) {
      return json(200, { success: true, reminded: 0, message: "Nada pendente para cobrar" });
    }

    const companyId = pendentes[0].company_id as string;

    // Só admin da empresa cobra. A checagem vem depois de saber a empresa, que
    // sai da própria avaliação — assim ninguém cobra time de outra companhia.
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", callerId).eq("company_id", companyId).maybeSingle();
    if (roleRow?.role !== "admin" && roleRow?.role !== "owner") {
      log("warn", "remind:forbidden", { callerId, companyId });
      return json(403, { success: false, error: "Apenas admins podem enviar lembretes" });
    }

    // ---- agrupa por pessoa ----
    const porPessoa = new Map<string, number>();
    const cicloDe = new Map<string, string>();
    for (const p of pendentes as Pendencia[]) {
      porPessoa.set(p.evaluator_id, (porPessoa.get(p.evaluator_id) ?? 0) + 1);
      cicloDe.set(p.evaluator_id, p.cycle_id);
    }
    const alvos = [...porPessoa.keys()];

    const { data: cycles } = await admin
      .from("performance_cycles")
      .select("id, name, end_date, response_deadline")
      .in("id", [...new Set([...cicloDe.values()])]);
    const cicloPorId = new Map((cycles ?? []).map((c) => [c.id, c]));

    const prazoDe = (uid: string) => {
      const c = cicloPorId.get(cicloDe.get(uid)!);
      const iso = c?.response_deadline ?? c?.end_date;
      return iso
        ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })
        : null;
    };
    const nomeDoCiclo = (uid: string) => cicloPorId.get(cicloDe.get(uid)!)?.name ?? "avaliação";

    const { data: users } = await admin
      .from("users").select("id, email, full_name").in("id", alvos);

    const texto = (uid: string, nome: string | null) => {
      const quantas = porPessoa.get(uid) ?? 1;
      const prazo = prazoDe(uid);
      const primeiro = (nome ?? "").trim().split(" ")[0] || "Olá";
      return (
        `${primeiro}, você ainda tem ${quantas} avaliaç${quantas > 1 ? "ões" : "ão"} ` +
        `de "${nomeDoCiclo(uid)}" para responder${prazo ? `, até ${prazo}` : ""}. ` +
        `Leva cerca de 10 minutos cada.`
      );
    };

    let notificacoes = 0;
    let emails = 0;
    let slacks = 0;

    // ---- notificação na plataforma ----
    if (quer("inapp")) {
      const rows = alvos.map((uid) => {
        const u = (users ?? []).find((x) => x.id === uid);
        return {
          user_id: uid,
          company_id: companyId,
          type: "performance_evaluation_reminder",
          title: "Avaliação pendente",
          message: texto(uid, u?.full_name ?? null),
          reference_id: cicloDe.get(uid),
          reference_type: "performance_cycle",
        };
      });
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await admin.from("notifications").insert(rows.slice(i, i + 200));
        if (error) log("warn", "remind:notif-failed", { error: error.message });
        else notificacoes += Math.min(200, rows.length - i);
      }
    }

    // ---- e-mail e Slack ----
    if (quer("email") || quer("slack")) {
      const appUrl = Deno.env.get("APP_BASE_URL") ?? "https://oxypeople20.vercel.app";

      for (const u of users ?? []) {
        if (!u.email) continue;
        const msg = texto(u.id, u.full_name);
        const alvo: EmailTarget[] = [{ email: u.email, fullName: u.full_name }];

        if (quer("slack")) {
          slacks += await sendSlackDMs(alvo, `${msg}\n\n👉 ${appUrl}/performance`, log);
        }
        if (quer("email")) {
          emails += await sendEmails(
            alvo,
            "Lembrete: avaliação de desempenho pendente",
            `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;
                        padding:24px;color:#53626b;font-size:15px;line-height:1.7;">
               <p style="margin:0 0 18px;">${msg}</p>
               <p style="margin:0 0 24px;">Dá para salvar e continuar depois.</p>
               <a href="${appUrl}/performance"
                  style="display:inline-block;padding:13px 28px;background:#0b6b4a;color:#fff;
                         text-decoration:none;border-radius:8px;font-weight:bold;">
                 Responder agora
               </a>
             </div>`,
            log,
          );
        }
      }
    }

    log("info", "remind:done", { alvos: alvos.length, notificacoes, emails, slacks, callerId });

    return json(200, {
      success: true,
      reminded: alvos.length,
      pending: pendentes.length,
      notificacoes,
      emails,
      slacks,
    });
  } catch (error) {
    const message = (error as Error).message;
    log("error", "remind:fatal", { message });
    return json(500, { success: false, error: message });
  }
});
