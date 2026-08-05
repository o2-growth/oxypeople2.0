#!/usr/bin/env node
/**
 * Comunica a mudança de formato do ciclo de avaliação.
 *
 * O disparo padrão anuncia "o ciclo começou", o que confundiria quem já
 * respondeu e vai encontrar o formulário zerado e diferente. Este comunicado
 * explica o que mudou e por quê.
 *
 * Dois textos: quem já havia respondido precisa saber que vai refazer; quem
 * ainda não respondeu só precisa do formato novo.
 *
 *   node scripts/notify-cycle-update.mjs                 # DRY-RUN
 *   node scripts/notify-cycle-update.mjs --test EMAIL    # só para um endereço
 *   node scripts/notify-cycle-update.mjs --apply         # dispara
 */
import { loadEnv, COMPANY_ID } from "./feedz/lib.mjs";

const CYCLE_ID = "5583a18b-90ea-4ef2-82dd-d2feb981c205";
const APP_URL = "https://oxypeople20.vercel.app";

const apply = process.argv.includes("--apply");
const testeIdx = process.argv.indexOf("--test");
const testeEmail = testeIdx > -1 ? process.argv[testeIdx + 1] : null;

const db = loadEnv();

const { data: cycle } = await db
  .from("performance_cycles").select("name,end_date").eq("id", CYCLE_ID).single();

const prazo = new Date(`${cycle.end_date}T12:00:00Z`)
  .toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "long" });

const { data: evs } = await db
  .from("performance_evaluations").select("evaluator_id").eq("cycle_id", CYCLE_ID);
const avaliadores = [...new Set(evs.map((e) => e.evaluator_id))];

const { data: users } = await db.from("users").select("id,email,full_name").in("id", avaliadores);

// quem já tinha respondido antes da troca de formato
// Nome completo como está no banco: abreviar faz o aviso de retrabalho não
// casar e a pessoa recebe o texto errado.
const REFAZEM = new Set([
  "Carlos Eduardo Ramos",
  "Pedro Oppermann Michelucci Pimenta",
  "Amanda Teixeira Serafim",
]);

const quantasPor = new Map();
for (const e of evs) quantasPor.set(e.evaluator_id, (quantasPor.get(e.evaluator_id) ?? 0) + 1);

function emailHtml(nome, quantas, refaz) {
  const aviso = refaz
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="background:#fff8e6;border-left:4px solid #f0ad4e;border-radius:6px;margin:0 0 20px;">
         <tr><td style="padding:14px 18px;color:#6b5730;font-size:14px;line-height:1.6;">
           <strong>Você já tinha começado a responder.</strong> Como o formato mudou, o que
           foi preenchido antes não pôde ser aproveitado — pedimos desculpa pelo retrabalho.
           Ao abrir, o formulário estará em branco no novo formato.
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
            <h1 style="margin:0;color:#fff;font-size:22px;">Avaliação de desempenho atualizada</h1>
            <p style="margin:6px 0 0;color:#cdeede;font-size:14px;">Oxy People · O2</p>
          </td></tr>

          <tr><td style="padding:32px;">
            <p style="margin:0 0 16px;color:#53626b;font-size:15px;line-height:1.6;">
              Olá, ${(nome ?? "").split(" ")[0]}! O formulário da avaliação de desempenho mudou.
            </p>

            ${aviso}

            <p style="margin:0 0 12px;color:#53626b;font-size:15px;line-height:1.6;">
              Agora a avaliação é sobre as <strong style="color:#111;">12 atitudes inegociáveis</strong>
              da O2. Em cada uma você escolhe entre
              <strong style="color:#111;">Entrega Limitada</strong>,
              <strong style="color:#111;">Entrega</strong> e
              <strong style="color:#111;">Entrega e é Referência</strong>,
              e justifica a escolha com um comentário.
            </p>

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f4f6f8;border-radius:8px;margin:0 0 22px;">
              <tr><td style="padding:16px 20px;color:#53626b;font-size:14px;line-height:1.8;">
                Você tem <strong style="color:#111;">${quantas} avaliaç${quantas > 1 ? "ões" : "ão"}</strong>
                para preencher, até <strong style="color:#111;">${prazo}</strong>.<br>
                Leva cerca de 10 minutos cada, e dá para salvar rascunho e continuar depois.
              </td></tr>
            </table>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
              <tr><td align="center" bgcolor="#0b6b4a" style="border-radius:8px;">
                <a href="${APP_URL}/performance" target="_blank" rel="noopener"
                   style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:bold;
                          color:#ffffff;text-decoration:none;border-radius:8px;">
                  Fazer minha avaliação
                </a>
              </td></tr>
            </table>

            <p style="margin:18px 0 0;color:#8a97a0;font-size:13px;line-height:1.6;">
              A avaliação vale para quem tem 6 meses ou mais de empresa. Quem entrou
              há menos tempo participa do próximo ciclo.
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

console.log("=".repeat(72));
console.log(apply ? "COMUNICADO — APPLY" : testeEmail ? `TESTE → ${testeEmail}` : "COMUNICADO — DRY-RUN");
console.log("=".repeat(72));
console.log(`  ciclo: ${cycle.name} · prazo ${prazo}`);
console.log(`  destinatários: ${users.length}`);
console.log(`  dos quais já haviam respondido: ${users.filter((u) => REFAZEM.has(u.full_name)).length}`);

const alvos = testeEmail ? users.filter((u) => u.email === testeEmail) : users;
if (testeEmail && !alvos.length) { console.error(`  ${testeEmail} não está entre os avaliadores`); process.exit(1); }

if (!apply && !testeEmail) {
  console.log("\n  amostra:");
  for (const u of users.slice(0, 5)) {
    console.log(`     ${u.full_name.slice(0, 28).padEnd(30)} ${quantasPor.get(u.id)} avaliação(ões)${REFAZEM.has(u.full_name) ? "  [refaz]" : ""}`);
  }
  console.log(`\nPara testar em você: node scripts/notify-cycle-update.mjs --test seu@email`);
  console.log(`Para disparar:        node scripts/notify-cycle-update.mjs --apply`);
  process.exit(0);
}

// ---- notificação na plataforma ----
let notifs = 0;
if (apply) {
  const rows = users.map((u) => ({
    user_id: u.id,
    company_id: COMPANY_ID,
    type: "performance_cycle_updated",
    title: "Avaliação de desempenho atualizada",
    message: `O formulário mudou para as 12 atitudes inegociáveis. Você tem ${quantasPor.get(u.id) ?? 0} avaliação(ões) para preencher até ${prazo}.`,
    reference_id: CYCLE_ID,
    reference_type: "performance_cycle",
  }));
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from("notifications").insert(rows.slice(i, i + 100));
    if (error) console.log(`  ERRO na notificação: ${error.message}`);
    else notifs += Math.min(100, rows.length - i);
  }
  console.log(`\n  notificações na plataforma: ${notifs}`);
}

// ---- e-mail via webhook n8n ----
const webhook = process.env.N8N_ENPS_WEBHOOK_URL;
const secret = process.env.N8N_ENPS_SECRET;
if (!webhook || !secret) { console.error("  faltam N8N_ENPS_WEBHOOK_URL / N8N_ENPS_SECRET"); process.exit(1); }

let enviados = 0;
for (const u of alvos) {
  if (!u.email) continue;
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret,
      to: u.email,
      subject: `Avaliação de desempenho atualizada — ${cycle.name}`,
      html: emailHtml(u.full_name, quantasPor.get(u.id) ?? 1, REFAZEM.has(u.full_name)),
    }),
  });
  if (res.ok) enviados++;
  else console.log(`  falhou para ${u.email}: HTTP ${res.status}`);
}
console.log(`  e-mails enviados: ${enviados} de ${alvos.length}`);
