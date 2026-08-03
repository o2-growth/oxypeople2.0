#!/usr/bin/env node
/**
 * Cria (ou reusa) o pulse e-NPS ativo e dispara para TODOS os ativos:
 *   in-app (notifications) + e-mail (n8n) + Slack DM + post no #general.
 *
 *   node scripts/send-enps-blast.mjs            # DRY-RUN
 *   node scripts/send-enps-blast.mjs --apply    # cria pulse + dispara tudo
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  try {
    const env = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const SUPA_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK = process.env.N8N_ENPS_WEBHOOK_URL;
const SECRET = process.env.N8N_ENPS_SECRET;
const SLACK = process.env.SLACK_BOT_TOKEN;
const CHANNEL = process.env.PULSE_SLACK_CHANNEL_ID;
const APPLY = process.argv.includes("--apply");

const COMPANY_ID = "4a6cdaea-daef-47d2-897f-54d5ae999638"; // o2-growth
const APP_URL = "https://oxypeople20.vercel.app";
const QUESTION = "Em uma escala de 0 a 10, o quanto você recomendaria a O2 como um bom lugar para trabalhar?";
const NAME = "e-NPS — Pesquisa de Clima";

const db = createClient(SUPA_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// ---- copy ----
const slackText = `📊 *e-NPS O2 — sua opinião importa!*\n> ${QUESTION}\nÉ rápido e anônimo. Responda em ${APP_URL}`;
const emailSubject = "📊 e-NPS O2 — leva menos de 1 minuto";
const emailHtml = `<div style="margin:0;padding:0;background:#f4f6f8;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:24px 0;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);font-family:Arial,Helvetica,sans-serif;"><tr><td style="background:#0b6b4a;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:22px;">Pesquisa de e-NPS</h1><p style="margin:6px 0 0;color:#cdeede;font-size:14px;">Oxy People · O2</p></td></tr><tr><td style="padding:32px;"><h2 style="margin:0 0 12px;color:#0b6b4a;font-size:19px;">Sua opinião importa 💚</h2><p style="margin:0 0 18px;color:#53626b;font-size:16px;line-height:1.6;"><strong>${QUESTION}</strong></p><p style="margin:0 0 20px;color:#53626b;font-size:14px;line-height:1.6;">Leva menos de 1 minuto e é anônimo. Cada resposta ajuda a melhorar o dia a dia do time.</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;"><tr><td align="center" bgcolor="#00c853" style="border-radius:8px;"><a href="${APP_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:bold;color:#fff;text-decoration:none;border-radius:8px;">Responder agora</a></td></tr></table><p style="margin:0;color:#8a97a0;font-size:13px;">Se já respondeu, pode ignorar este e-mail. 🙌</p></td></tr><tr><td style="background:#f0f3f5;padding:16px 32px;color:#9aa6ad;font-size:12px;text-align:center;">Oxy People · O2 — pesquisa de clima.</td></tr></table></td></tr></table></div>`;

console.log("=== e-NPS BLAST ===  modo:", APPLY ? "APPLY" : "DRY-RUN");
console.log("Pergunta:", QUESTION);

// alvos
const { data: mem } = await db.from("company_memberships").select("user_id, status").eq("status", "active");
const ids = [...new Set((mem || []).map((m) => m.user_id))];
const { data: us } = await db.from("users").select("id, email, full_name").in("id", ids);
const targets = (us || []).filter((u) => u.email);
console.log("Alvos ativos:", targets.length);

if (!APPLY) {
  console.log("\n(DRY-RUN) — nada enviado. Canais: in-app + e-mail(n8n) + Slack DM + #general");
  console.log("Slack/DM text:\n" + slackText);
  process.exit(0);
}

// 1) cria (ou reusa) pulse e-NPS ativo
let pulseId;
const { data: existing } = await db.from("pulse_surveys")
  .select("id").eq("company_id", COMPANY_ID).eq("question_type", "enps_0_10").eq("active", true).maybeSingle();
if (existing) { pulseId = existing.id; console.log("Reusando pulse e-NPS:", pulseId); }
else {
  const admin = targets.find((t) => t.email === "andrey.lopes@o2inc.com.br");
  const { data: created, error } = await db.from("pulse_surveys").insert({
    company_id: COMPANY_ID, created_by: admin?.id ?? ids[0],
    name: NAME, question: QUESTION, question_type: "enps_0_10",
    frequency: "monthly", day_of_month: 1, send_hour_utc: 12,
    target_all: true, target_departments: [], target_teams: [],
    active: true, anonymous: true,
  }).select("id").single();
  if (error) { console.error("Erro criando pulse:", error.message); process.exit(1); }
  pulseId = created.id; console.log("Pulse e-NPS criado:", pulseId);
}

// 2) in-app notifications
let inapp = 0;
for (let i = 0; i < ids.length; i += 100) {
  const batch = ids.slice(i, i + 100).map((uid) => ({
    user_id: uid, company_id: COMPANY_ID, type: "pulse_request",
    title: "📊 e-NPS: sua opinião importa", message: QUESTION,
    reference_id: pulseId, reference_type: "pulse_survey",
  }));
  const { error } = await db.from("notifications").insert(batch);
  if (!error) inapp += batch.length; else console.log("in-app erro:", error.message);
}
console.log("in-app criadas:", inapp);

// 3) e-mail via n8n
let emails = 0;
for (const t of targets) {
  const r = await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET, to: t.email, subject: emailSubject, html: emailHtml }) });
  if (r.ok) emails++;
  await new Promise((r) => setTimeout(r, 250));
}
console.log("e-mails enviados:", emails);

// 4) Slack DM
let dms = 0;
const H = { Authorization: "Bearer " + SLACK, "Content-Type": "application/json" };
for (const t of targets) {
  try {
    const lu = await (await fetch("https://slack.com/api/users.lookupByEmail?email=" + encodeURIComponent(t.email), { headers: H })).json();
    if (!lu.ok) continue;
    const pm = await (await fetch("https://slack.com/api/chat.postMessage", { method: "POST", headers: H,
      body: JSON.stringify({ channel: lu.user.id, text: slackText, blocks: [{ type: "section", text: { type: "mrkdwn", text: slackText } }] }) })).json();
    if (pm.ok) dms++;
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}
console.log("Slack DMs enviadas:", dms);

// 5) post no #general
const post = await (await fetch("https://slack.com/api/chat.postMessage", { method: "POST", headers: H,
  body: JSON.stringify({ channel: CHANNEL, text: slackText, blocks: [{ type: "section", text: { type: "mrkdwn", text: slackText } }] }) })).json();
console.log("#general post:", post.ok ? "OK" : "FALHOU: " + post.error);

// marca last_dispatched_at
await db.from("pulse_surveys").update({ last_dispatched_at: new Date().toISOString() }).eq("id", pulseId);
console.log("\n✅ Concluído. pulseId:", pulseId);
