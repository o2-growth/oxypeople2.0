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

/**
 * E-mail em tabela com estilo inline: cliente de e-mail ignora folha de estilo
 * e boa parte do CSS moderno, então flex/grid quebrariam no Outlook.
 *
 * O corpo diz o que a pessoa precisa fazer e quanto tempo leva — a versão
 * anterior só anunciava que o ciclo abriu, o que não move ninguém a responder.
 */
function emailBody(cycleName: string, prazo: string, appUrl: string | null, quantas: number) {
  const plural = quantas > 1;
  const cta = appUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
         <tr><td align="center" bgcolor="#0b6b4a" style="border-radius:8px;">
           <a href="${appUrl}/performance" target="_blank" rel="noopener"
              style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;
                     color:#ffffff;text-decoration:none;border-radius:8px;">
             ${plural ? "Fazer minhas avaliações" : "Fazer minha avaliação"}
           </a>
         </td></tr>
       </table>`
    : "";

  return `<div style="margin:0;padding:0;background:#f4f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,.08);font-family:Arial,Helvetica,sans-serif;">
          <tr><td style="background:#0b6b4a;padding:28px 32px;">
            <h1 style="margin:0;color:#fff;font-size:22px;">Avaliação de desempenho</h1>
            <p style="margin:6px 0 0;color:#cdeede;font-size:14px;">Oxy People · O2</p>
          </td></tr>

          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 12px;color:#0b6b4a;font-size:19px;">${cycleName}</h2>
            <p style="margin:0 0 18px;color:#53626b;font-size:15px;line-height:1.6;">
              Chegou a hora da avaliação de desempenho. Você tem
              <strong style="color:#111;">${quantas} avaliaç${plural ? "ões" : "ão"}</strong>
              para preencher${prazo ? ` até <strong style="color:#111;">${prazo}</strong>` : ""}.
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f4f6f8;border-radius:8px;margin:0 0 22px;">
              <tr><td style="padding:16px 20px;color:#53626b;font-size:14px;line-height:1.7;">
                Você avalia de 1 a 5 em cada um dos nossos cinco valores, e pode
                deixar um comentário.<br>
                <strong style="color:#111;">Leva cerca de 5 minutos por avaliação</strong>,
                e dá para salvar rascunho e continuar depois.
              </td></tr>
            </table>

            ${cta}

            <p style="margin:16px 0 0;color:#8a97a0;font-size:13px;line-height:1.6;text-align:center;">
              Se já preencheu, pode ignorar este e-mail.
            </p>
          </td></tr>

          <tr><td style="background:#f0f3f5;padding:16px 32px;color:#9aa6ad;font-size:12px;text-align:center;">
            Oxy People · O2 — comunicado automático de avaliação.
          </td></tr>
        </table>
      </td></tr>
    </table>
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

    // Gestor desligado não pode virar avaliador: a avaliação ficaria atribuída
    // a quem não trabalha mais aqui e nunca seria respondida. Nesse caso a
    // pessoa fica sem a avaliação do gestor, e o relatório abaixo diz quem é.
    const { data: todosVinculos } = await supabase
      .from("company_memberships")
      .select("user_id,status")
      .eq("company_id", cycle.company_id);
    const ativo = new Set(
      (todosVinculos ?? [])
        .filter((v: { status: string }) => v.status === "active")
        .map((v: { user_id: string }) => v.user_id),
    );

    const gestoresInvalidos: string[] = [];
    const participants: Participant[] = elegiveis.map((m) => {
      const gestorOk = m.manager_id && ativo.has(m.manager_id);
      if (m.manager_id && !gestorOk) gestoresInvalidos.push(m.user_id);
      return {
        userId: m.user_id,
        managerId: gestorOk ? m.manager_id : null,
        teamIds: timesPorUser.get(m.user_id) ?? [],
      };
    });
    if (gestoresInvalidos.length) {
      log("warn", "cycle-start:gestor-inativo", { cycleId, quantidade: gestoresInvalidos.length });
    }

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

    const noBanco = (r: string) => (r === "direct_report" ? "subordinate" : r);
    const novas = pares
      .filter((p) => !jaExiste.has(`${p.evaluatorId}|${p.evaluatedId}|${noBanco(p.relationship)}`))
      .map((p) => ({
        company_id: cycle.company_id,
        cycle_id: cycle.id,
        evaluator_id: p.evaluatorId,
        evaluated_id: p.evaluatedId,
        // A constraint do banco usa 'subordinate' para "liderado avalia o
        // gestor"; internamente o nome é direct_report, que descreve melhor
        // quem é o avaliador. Traduz aqui, na fronteira.
        relationship: p.relationship === "direct_report" ? "subordinate" : p.relationship,
        relationship_type: p.relationship === "direct_report" ? "subordinate" : p.relationship,
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
        `📋 *Avaliação de desempenho — ${cycle.name}*\n` +
        `Você tem avaliações para preencher${prazoBR ? ` até *${prazoBR}*` : ""}.\n` +
        `Nota de 1 a 5 nos cinco valores, ~5 min cada. Dá para salvar rascunho.\n` +
        (appUrl ? `👉 ${appUrl}/performance` : "");
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
        semGestorAtivo: gestoresInvalidos.length,
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
