#!/usr/bin/env node
/**
 * Comunica o calendário corrigido do ciclo Full 02/2026.
 *
 * O primeiro anúncio saiu com as datas erradas — etapas de 10/08, 11–18/08 e
 * 19–26/08, e o título dizia 02/2022. Quem leu programou-se pelo que estava
 * escrito, então o corretivo precisa liderar pela data nova, não pelo pedido
 * de desculpa.
 *
 * Três canais, de propósito: DM no Slack chega onde a O2 conversa, o e-mail
 * fica registrado para quem só abre no fim do dia, e a notificação espera na
 * plataforma para quem entrar direto. Nada de post em canal — quem precisa
 * agir tem nome e sobrenome, e repetir o erro em público não ajuda ninguém.
 *
 * Quem já respondeu recebe outro texto: não há nada para refazer, só datas
 * novas para anotar.
 *
 *   node scripts/notify-cycle-dates.mjs                 # DRY-RUN
 *   node scripts/notify-cycle-dates.mjs --test EMAIL    # só para um endereço
 *   node scripts/notify-cycle-dates.mjs --apply         # dispara
 */
import { loadEnv, COMPANY_ID } from "./feedz/lib.mjs";

const CYCLE_ID = "5583a18b-90ea-4ef2-82dd-d2feb981c205";
const APP_URL = "https://oxypeople20.vercel.app";

const apply = process.argv.includes("--apply");
const testeIdx = process.argv.indexOf("--test");
const testeEmail = testeIdx > -1 ? process.argv[testeIdx + 1] : null;

const db = loadEnv();

const { data: cycle, error: cycleErr } = await db
  .from("performance_cycles")
  .select("name,start_date,end_date,response_deadline")
  .eq("id", CYCLE_ID).single();
if (cycleErr) { console.error(`ciclo não encontrado: ${cycleErr.message}`); process.exit(1); }

const dataBR = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const prazo = dataBR(cycle.response_deadline ?? cycle.end_date);

const ETAPAS = [
  ["Etapa 1 – Avaliações (auto e lideranças)", "até 13/08/2026"],
  ["Etapa 2 – Calibragem interna (comitê de liderança)", "14 a 20/08/2026"],
  ["Etapa 3 – Devolutivas (feedback individual)", "21 a 27/08/2026"],
];

// ---------------- quem recebe ----------------
const { data: evs } = await db
  .from("performance_evaluations").select("evaluator_id,status").eq("cycle_id", CYCLE_ID);

const porPessoa = new Map();
for (const e of evs) {
  if (!porPessoa.has(e.evaluator_id)) porPessoa.set(e.evaluator_id, { total: 0, feitas: 0 });
  const x = porPessoa.get(e.evaluator_id);
  x.total++;
  if (e.status === "completed") x.feitas++;
}

const { data: users } = await db
  .from("users").select("id,email,full_name").in("id", [...porPessoa.keys()]);

const primeiroNome = (n) => (n ?? "").trim().split(" ")[0] || "você";
const pendentesDe = (id) => {
  const x = porPessoa.get(id) ?? { total: 0, feitas: 0 };
  return x.total - x.feitas;
};

// ---------------- textos ----------------
function slackText(u) {
  const faltam = pendentesDe(u.id);
  const cabeca = faltam
    ? `Olá, ${primeiroNome(u.full_name)} — o calendário da *Avaliação de Desempenho Full | 02/2026* foi corrigido.`
    : `Olá, ${primeiroNome(u.full_name)} — sua avaliação já está registrada, não há nada a refazer. Só o calendário mudou.`;

  const linhas = [
    cabeca,
    "",
    "O primeiro comunicado saiu com datas erradas. Estas são as que valem:",
    ...ETAPAS.map(([nome, quando]) => `🗓️  ${nome}: *${quando}*`),
    "",
  ];

  if (faltam) {
    linhas.push(
      `Você tem *${faltam} avaliaç${faltam > 1 ? "ões" : "ão"}* para responder até *${prazo}*.`,
      "Leva cerca de 10 minutos cada, dá para salvar e continuar depois.",
      "",
      `👉 ${APP_URL}/performance`,
    );
  } else {
    linhas.push("Nada a fazer da sua parte agora — a devolutiva acontece entre 21 e 27/08.");
  }

  return linhas.join("\n");
}

function emailHtml(u) {
  const faltam = pendentesDe(u.id);

  const etapasHtml = ETAPAS.map(
    ([nome, quando]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e8edf0;color:#53626b;font-size:14px;line-height:1.5;">
          ${nome}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8edf0;color:#111;font-size:14px;
                   font-weight:bold;text-align:right;white-space:nowrap;padding-left:16px;">
          ${quando}
        </td>
      </tr>`,
  ).join("");

  const chamada = faltam
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#f4f6f8;border-radius:8px;margin:0 0 22px;">
         <tr><td style="padding:16px 20px;color:#53626b;font-size:14px;line-height:1.7;">
           Você tem <strong style="color:#111;">${faltam} avaliaç${faltam > 1 ? "ões" : "ão"}</strong>
           para responder até <strong style="color:#111;">${prazo}</strong>.<br>
           Leva cerca de 10 minutos cada, e dá para salvar e continuar depois.
         </td></tr>
       </table>

       <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
         <tr><td align="center" bgcolor="#0b6b4a" style="border-radius:8px;">
           <a href="${APP_URL}/performance" target="_blank" rel="noopener"
              style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;
                     color:#ffffff;text-decoration:none;border-radius:8px;">
             Responder minha avaliação
           </a>
         </td></tr>
       </table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#eef7f2;border-left:4px solid #0b6b4a;border-radius:6px;margin:0 0 22px;">
         <tr><td style="padding:14px 18px;color:#2f5c49;font-size:14px;line-height:1.6;">
           <strong>Sua avaliação já está registrada.</strong> Não há nada a refazer —
           a devolutiva acontece entre 21 e 27 de agosto.
         </td></tr>
       </table>`;

  return `<div style="margin:0;padding:0;background:#f4f6f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,.08);font-family:Arial,Helvetica,sans-serif;">
          <tr><td style="background:#0b6b4a;padding:28px 32px;">
            <h1 style="margin:0;color:#fff;font-size:22px;">Avaliação de Desempenho — Full | 02/2026</h1>
            <p style="margin:6px 0 0;color:#cdeede;font-size:14px;">Calendário atualizado · Oxy People</p>
          </td></tr>

          <tr><td style="padding:32px;">
            <p style="margin:0 0 20px;color:#53626b;font-size:15px;line-height:1.7;">
              Olá, ${primeiroNome(u.full_name)}! O primeiro comunicado saiu com as datas
              erradas. Estas são as que valem:
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              ${etapasHtml}
            </table>

            ${chamada}

            <p style="margin:22px 0 0;color:#53626b;font-size:14px;line-height:1.7;">
              A avaliação considera nossos valores, atitudes inegociáveis e critérios de
              entrega esperados para cada papel. Depois do encerramento, cada líder conduz
              uma conversa 1:1 com seu liderado, com foco em aprendizados e próximos passos.
            </p>

            <p style="margin:18px 0 0;color:#8a97a0;font-size:13px;line-height:1.6;">
              Participa quem tem 6 meses ou mais de empresa. Quem entrou há menos tempo
              entra no próximo ciclo.
            </p>
          </td></tr>

          <tr><td style="background:#f0f3f5;padding:16px 32px;color:#9aa6ad;font-size:12px;text-align:center;">
            Oxy People · O2 — comunicado de avaliação de desempenho.
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}

// ---------------- resumo ----------------
const alvos = testeEmail ? users.filter((u) => u.email === testeEmail) : users;
if (testeEmail && !alvos.length) {
  console.error(`${testeEmail} não está entre os avaliadores deste ciclo`);
  process.exit(1);
}

const comPendencia = users.filter((u) => pendentesDe(u.id) > 0);

console.log("=".repeat(74));
console.log(apply ? "COMUNICADO — APPLY" : testeEmail ? `TESTE → ${testeEmail}` : "COMUNICADO — DRY-RUN");
console.log("=".repeat(74));
console.log(`  ciclo:  ${cycle.name}`);
console.log(`  período: ${dataBR(cycle.start_date)} a ${dataBR(cycle.end_date)} · respostas até ${prazo}`);
console.log(`  destinatários: ${alvos.length} (${comPendencia.length} com pendência, ${users.length - comPendencia.length} já concluíram)`);
console.log(`  canais: Slack DM + e-mail + notificação na plataforma`);

if (!apply && !testeEmail) {
  console.log("\n  mensagem de quem tem pendência:\n");
  const exemplo = comPendencia[0];
  console.log(slackText(exemplo).split("\n").map((l) => `    │ ${l}`).join("\n"));

  const semPendencia = users.find((u) => pendentesDe(u.id) === 0);
  if (semPendencia) {
    console.log("\n  mensagem de quem já respondeu:\n");
    console.log(slackText(semPendencia).split("\n").map((l) => `    │ ${l}`).join("\n"));
  }

  console.log(`\nPara testar em você: node scripts/notify-cycle-dates.mjs --test growth@o2inc.com.br`);
  console.log(`Para disparar:       node scripts/notify-cycle-dates.mjs --apply`);
  process.exit(0);
}

// ---------------- notificação na plataforma ----------------
if (apply) {
  const rows = users.map((u) => {
    const faltam = pendentesDe(u.id);
    return {
      user_id: u.id,
      company_id: COMPANY_ID,
      type: "performance_cycle_updated",
      title: "Avaliação de desempenho — novas datas",
      message: faltam
        ? `O calendário foi corrigido: responda até ${prazo}. Você tem ${faltam} avaliação(ões) pendente(s).`
        : `O calendário foi corrigido. Sua avaliação já está registrada; as devolutivas acontecem de 21 a 27/08.`,
      reference_id: CYCLE_ID,
      reference_type: "performance_cycle",
    };
  });
  let notifs = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from("notifications").insert(rows.slice(i, i + 100));
    if (error) console.log(`  ERRO na notificação: ${error.message}`);
    else notifs += Math.min(100, rows.length - i);
  }
  console.log(`\n  notificações na plataforma: ${notifs}`);
}

// ---------------- Slack DM ----------------
const slackToken = process.env.SLACK_BOT_TOKEN;
let dms = 0, semSlack = [];
if (slackToken) {
  const headers = { Authorization: `Bearer ${slackToken}`, "Content-Type": "application/json" };
  for (const u of alvos) {
    if (!u.email) continue;
    try {
      const lookup = await fetch(
        `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(u.email)}`, { headers });
      const ld = await lookup.json();
      if (!ld.ok) { semSlack.push(`${u.full_name} (${ld.error})`); continue; }
      const texto = slackText(u);
      const post = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST", headers,
        body: JSON.stringify({
          channel: ld.user.id,
          text: texto,
          blocks: [{ type: "section", text: { type: "mrkdwn", text: texto } }],
        }),
      });
      const pd = await post.json();
      if (pd.ok) dms++;
      else semSlack.push(`${u.full_name} (${pd.error})`);
    } catch (err) {
      semSlack.push(`${u.full_name} (${err.message})`);
    }
  }
  console.log(`  Slack DMs: ${dms} de ${alvos.length}`);
  if (semSlack.length) console.log(`  sem Slack: ${semSlack.join(", ")}`);
} else {
  console.log("  Slack: SLACK_BOT_TOKEN ausente — pulado");
}

// ---------------- e-mail ----------------
const webhook = process.env.N8N_ENPS_WEBHOOK_URL;
const secret = process.env.N8N_ENPS_SECRET;
if (!webhook || !secret) {
  console.error("  faltam N8N_ENPS_WEBHOOK_URL / N8N_ENPS_SECRET — e-mail não enviado");
  process.exit(1);
}

let enviados = 0;
for (const u of alvos) {
  if (!u.email) continue;
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      to: u.email,
      subject: `Novas datas — Avaliação de Desempenho Full | 02/2026`,
      html: emailHtml(u),
    }),
  });
  if (res.ok) enviados++;
  else console.log(`  falhou para ${u.email}: HTTP ${res.status}`);
}
console.log(`  e-mails enviados: ${enviados} de ${alvos.length}`);
