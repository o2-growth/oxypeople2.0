/**
 * Inicia um ciclo de avaliação de desempenho.
 *
 * Antes disto, "Iniciar Ciclo" só trocava o status para 'active': nenhuma
 * avaliação era criada e ninguém era avisado — o ciclo abria vazio e silencioso.
 * Esta função faz o que o Feedz fazia:
 *
 *   1. resolve quem participa (target_all ou departamentos/times/pessoas)
 *   2. gera as avaliações conforme o tipo do ciclo (self, 180, 360, …)
 *   3. cria a notificação in-app de cada avaliador
 *   4. dispara e-mail e DM no Slack
 *   5. só então marca o ciclo como 'active'
 *
 * A ordem importa: o status só muda depois de as avaliações existirem. Se algo
 * falhar no meio, o ciclo continua em rascunho e pode ser reiniciado — em vez
 * de ficar 'active' e vazio.
 *
 * É idempotente: avaliação que já existe não é recriada, e reenviar só alcança
 * quem ainda não tinha sido notificado.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { buildEvaluationPairs, evaluatorsToNotify, type CycleType, type Participant } from "./_lib/participants.ts";
import { sendEmails, sendSlackDMs, type EmailTarget } from "./_lib/notify.ts";

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

function emailBody(cycleName: string, prazo: string, appUrl: string | null, quantas: number) {
  const cta = appUrl
    ? `<p style="margin:24px 0;">
         <a href="${appUrl}/performance" style="background:#0b6b4a;color:#fff;padding:12px 22px;
            border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
           Fazer minha avaliação
         </a>
       </p>`
    : "";
  return `
    <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#111;line-height:1.6;">
      <h2 style="margin:0 0 8px;color:#0b6b4a;">Avaliação de desempenho aberta</h2>
      <p>O ciclo <strong>${cycleName}</strong> começou.</p>
      <p>Você tem <strong>${quantas}</strong> avaliação${quantas > 1 ? "ões" : ""} para preencher${prazo ? `, até <strong>${prazo}</strong>` : ""}.</p>
      ${cta}
      <p style="color:#666;font-size:13px;">Se já preencheu, pode ignorar este e-mail.</p>
    </div>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // `channels` permite gerar as avaliações e avisar dentro da plataforma sem
    // disparar comunicação externa — útil para consertar um ciclo que já foi
    // ativado, sem mandar e-mail para a empresa inteira de novo.
    const body = await req.json();
    const { cycleId } = body;
    const notify = body.notify ?? true;
    const channels: string[] = body.channels ?? ["inapp", "email", "slack"];
    const quer = (c: string) => notify && channels.includes(c);
    if (!cycleId) {
      return new Response(JSON.stringify({ success: false, error: "cycleId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("info", "cycle-start:begin", { cycleId });

    const { data: cycle, error: cycleErr } = await supabase
      .from("performance_cycles")
      .select("id,company_id,name,type,status,start_date,end_date,target_all,target_departments,target_teams,target_users")
      .eq("id", cycleId)
      .single();
    if (cycleErr || !cycle) throw new Error(`ciclo não encontrado: ${cycleErr?.message}`);

    // ---- 1. participantes ----
    let query = supabase
      .from("company_memberships")
      .select("user_id,manager_id,department_id")
      .eq("company_id", cycle.company_id)
      .eq("status", "active");

    if (!cycle.target_all) {
      const users = cycle.target_users ?? [];
      const deps = cycle.target_departments ?? [];
      if (users.length) query = query.in("user_id", users);
      else if (deps.length) query = query.in("department_id", deps);
    }
    const { data: membros, error: memErr } = await query;
    if (memErr) throw new Error(`memberships: ${memErr.message}`);

    let elegiveis = membros ?? [];

    // times entram por fora: team_members não é coluna de membership
    const teams = cycle.target_teams ?? [];
    if (!cycle.target_all && teams.length) {
      const { data: tm } = await supabase.from("team_members").select("user_id").in("team_id", teams);
      const doTime = new Set((tm ?? []).map((t: { user_id: string }) => t.user_id));
      elegiveis = elegiveis.filter((m) => doTime.has(m.user_id));
    }

    if (!elegiveis.length) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum participante ativo no escopo do ciclo." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: todosTimes } = await supabase
      .from("team_members").select("user_id,team_id")
      .in("user_id", elegiveis.map((m) => m.user_id));
    const timesPorUser = new Map<string, string[]>();
    for (const t of todosTimes ?? []) {
      if (!timesPorUser.has(t.user_id)) timesPorUser.set(t.user_id, []);
      timesPorUser.get(t.user_id)!.push(t.team_id);
    }

    const participants: Participant[] = elegiveis.map((m) => ({
      userId: m.user_id,
      managerId: m.manager_id ?? null,
      teamIds: timesPorUser.get(m.user_id) ?? [],
    }));

    // ---- 2. avaliações ----
    const pares = buildEvaluationPairs(participants, cycle.type as CycleType);
    if (!pares.length) {
      return new Response(
        JSON.stringify({ success: false, error: `O tipo "${cycle.type}" não gerou nenhuma avaliação. Verifique gestores e times dos participantes.` }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existentes } = await supabase
      .from("performance_evaluations")
      .select("evaluator_id,evaluated_id,relationship")
      .eq("cycle_id", cycle.id);
    const jaExiste = new Set(
      (existentes ?? []).map((e: { evaluator_id: string; evaluated_id: string; relationship: string }) =>
        `${e.evaluator_id}|${e.evaluated_id}|${e.relationship}`),
    );

    const novas = pares
      .filter((p) => !jaExiste.has(`${p.evaluatorId}|${p.evaluatedId}|${p.relationship}`))
      .map((p) => ({
        company_id: cycle.company_id,
        cycle_id: cycle.id,
        evaluator_id: p.evaluatorId,
        evaluated_id: p.evaluatedId,
        relationship: p.relationship,
        relationship_type: p.relationship,
        status: "pending",
        due_date: cycle.end_date,
      }));

    let criadas = 0;
    for (let i = 0; i < novas.length; i += 200) {
      const { error } = await supabase.from("performance_evaluations").insert(novas.slice(i, i + 200));
      if (error) throw new Error(`avaliações: ${error.message}`);
      criadas += Math.min(200, novas.length - i);
    }
    log("info", "cycle-start:evaluations", { cycleId, criadas, total: pares.length });

    // ---- 3. notificação in-app ----
    const avaliadores = evaluatorsToNotify(pares);
    const quantasPor = new Map<string, number>();
    for (const p of pares) quantasPor.set(p.evaluatorId, (quantasPor.get(p.evaluatorId) ?? 0) + 1);

    const prazoBR = cycle.end_date
      ? new Date(`${cycle.end_date}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })
      : "";

    let notificacoes = 0;
    let emails = 0;
    let slacks = 0;

    if (quer("inapp")) {
      const { data: jaNotificados } = await supabase
        .from("notifications")
        .select("user_id")
        .eq("reference_id", cycle.id)
        .eq("type", "performance_cycle_started");
      const pulaNotificacao = new Set((jaNotificados ?? []).map((n: { user_id: string }) => n.user_id));

      const rows = avaliadores
        .filter((uid) => !pulaNotificacao.has(uid))
        .map((uid) => ({
          user_id: uid,
          company_id: cycle.company_id,
          type: "performance_cycle_started",
          title: "Avaliação de desempenho aberta",
          message: `O ciclo "${cycle.name}" começou. Você tem ${quantasPor.get(uid) ?? 0} avaliação(ões) para preencher${prazoBR ? ` até ${prazoBR}` : ""}.`,
          reference_id: cycle.id,
          reference_type: "performance_cycle",
        }));

      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from("notifications").insert(rows.slice(i, i + 200));
        if (error) log("warn", "cycle-start:notif-failed", { error: error.message });
        else notificacoes += Math.min(200, rows.length - i);
      }

    }

    if (quer("email") || quer("slack")) {
      // ---- 4. e-mail e Slack (best-effort) ----
      const { data: users } = await supabase
        .from("users").select("id,email,full_name").in("id", avaliadores);
      const appUrl = Deno.env.get("APP_BASE_URL") ?? null;

      // Uma pessoa pode ter N avaliações; o texto diz quantas, então o envio é
      // por pessoa e não por avaliação.
      const alvos: EmailTarget[] = [];
      for (const u of users ?? []) {
        if (u.email) alvos.push({ email: u.email, fullName: u.full_name });
      }

      const assunto = `Avaliação de desempenho: ${cycle.name}`;
      // O corpo varia com a quantidade por pessoa; agrupa por quantidade para
      // não montar um HTML por destinatário.
      const porQuantidade = new Map<number, EmailTarget[]>();
      for (const u of users ?? []) {
        if (!u.email) continue;
        const q = quantasPor.get(u.id) ?? 1;
        if (!porQuantidade.has(q)) porQuantidade.set(q, []);
        porQuantidade.get(q)!.push({ email: u.email, fullName: u.full_name });
      }
      if (quer("email")) {
        for (const [q, lista] of porQuantidade) {
          emails += await sendEmails(lista, assunto, emailBody(cycle.name, prazoBR, appUrl, q), log);
        }
      }

      const textoSlack =
        `📋 *Avaliação de desempenho aberta*\n` +
        `O ciclo *${cycle.name}* começou.${prazoBR ? ` Prazo: *${prazoBR}*.` : ""}\n` +
        (appUrl ? `Responda em ${appUrl}/performance` : "");
      if (quer("slack")) slacks = await sendSlackDMs(alvos, textoSlack, log);
    }

    // ---- 5. ativa o ciclo ----
    const { error: upErr } = await supabase
      .from("performance_cycles").update({ status: "active" }).eq("id", cycle.id);
    if (upErr) throw new Error(`ativação: ${upErr.message}`);

    const durationMs = Date.now() - startedAt;
    log("info", "cycle-start:done", { cycleId, criadas, notificacoes, emails, slacks, durationMs });

    return new Response(
      JSON.stringify({
        success: true,
        cycleId: cycle.id,
        participantes: participants.length,
        avaliacoesCriadas: criadas,
        avaliacoesTotais: pares.length,
        notificacoes, emails, slackDMs: slacks, durationMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = (error as Error).message;
    log("error", "cycle-start:fatal", { message });
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
