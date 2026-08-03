#!/usr/bin/env node
/**
 * Disparo do e-mail de "seu acesso está pronto" para os membros ATIVOS
 * com e-mail @o2inc.com.br. Envia via webhook n8n (Gmail o2@o2inc.com.br).
 *
 * Modos:
 *   node scripts/send-access-welcome.mjs                 # DRY-RUN (lista, não envia)
 *   node scripts/send-access-welcome.mjs --test EMAIL    # envia só para EMAIL (teste)
 *   node scripts/send-access-welcome.mjs --apply         # envia para TODOS os ativos
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

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK = process.env.N8N_ENPS_WEBHOOK_URL;
const SECRET = process.env.N8N_ENPS_SECRET;
if (!URL || !KEY || !WEBHOOK || !SECRET) { console.error("Faltando envs (SUPABASE / N8N_ENPS_*)"); process.exit(1); }

const APP_URL = "https://oxypeople20.vercel.app/auth";
const PASSWORD = "Alterar@01";
const DOMAIN = "@o2inc.com.br";

const testIdx = process.argv.indexOf("--test");
const TEST_EMAIL = testIdx > -1 ? process.argv[testIdx + 1] : null;
const APPLY = process.argv.includes("--apply");

const db = createClient(URL, KEY, { auth: { persistSession: false } });

function firstName(full) {
  return (full || "").trim().split(/\s+/)[0] || "Olá";
}

function buildHtml(nome, loginEmail) {
  return `<div style="margin:0;padding:0;background:#f4f6f8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);font-family:Arial,Helvetica,sans-serif;">
        <tr><td style="background:#0b6b4a;padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;">Oxy People</h1>
          <p style="margin:6px 0 0;color:#cdeede;font-size:14px;">Gestão de Pessoas · O2</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 12px;color:#0b6b4a;font-size:20px;">Olá, ${nome}! Seu acesso está pronto 🎉</h2>
          <p style="margin:0 0 16px;color:#53626b;font-size:15px;line-height:1.6;">
            A plataforma <strong>Oxy People</strong> já está disponível para você. É onde acompanhamos OKRs,
            performance, feedbacks, PDI, 1:1s, reconhecimentos e as pesquisas de clima do time.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6f8;border-radius:8px;margin:8px 0 20px;">
            <tr><td style="padding:16px 20px;color:#334;font-size:15px;line-height:1.8;">
              <strong>Login:</strong> ${loginEmail}<br>
              <strong>Senha provisória:</strong> <code style="background:#e7f4ee;padding:2px 8px;border-radius:4px;color:#0b6b4a;font-size:15px;">${PASSWORD}</code>
            </td></tr>
          </table>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;">
            <tr><td align="center" bgcolor="#00c853" style="border-radius:8px;">
              <a href="${APP_URL}" target="_blank" rel="noopener"
                 style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
                Acessar a plataforma
              </a>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;color:#53626b;font-size:14px;line-height:1.6;">
            🔒 <strong>Por segurança, troque sua senha no primeiro acesso.</strong> Basta entrar com a senha
            provisória acima e alterá-la nas configurações da conta.
          </p>
          <p style="margin:16px 0 0;color:#8a97a0;font-size:13px;line-height:1.6;">
            Se tiver qualquer dificuldade para entrar, é só responder este e-mail. Bom uso! 💚
          </p>
        </td></tr>
        <tr><td style="background:#f0f3f5;padding:16px 32px;color:#9aa6ad;font-size:12px;text-align:center;">
          Oxy People · O2 — este é um comunicado automático de acesso.
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;
}

async function send(to, nome) {
  const html = buildHtml(nome, to);
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET, to, subject: "✅ Seu acesso à plataforma Oxy People está pronto", html }),
  });
  return res.ok;
}

// alvos: membros ativos com e-mail do domínio
const { data: mem } = await db.from("company_memberships").select("user_id, status").eq("status", "active");
const ids = [...new Set((mem || []).map((m) => m.user_id))];
const { data: us } = await db.from("users").select("id, email, full_name").in("id", ids);
const targets = (us || [])
  .filter((u) => (u.email || "").toLowerCase().endsWith(DOMAIN))
  .map((u) => ({ email: u.email.toLowerCase(), nome: firstName(u.full_name) }))
  .sort((a, b) => a.nome.localeCompare(b.nome));

console.log(`Alvos (ativos ${DOMAIN}): ${targets.length}`);

if (TEST_EMAIL) {
  const ok = await send(TEST_EMAIL, "Andrey (teste)");
  console.log(`\n[TESTE] enviado para ${TEST_EMAIL}: ${ok ? "OK ✓" : "FALHOU ✗"}`);
  process.exit(0);
}

if (!APPLY) {
  console.log("\n(DRY-RUN) receberiam o e-mail:");
  for (const t of targets) console.log(`  • ${t.nome.padEnd(14)} <${t.email}>`);
  console.log("\nRode com --test SEU_EMAIL para um teste, ou --apply para disparar a todos.");
  process.exit(0);
}

console.log("\n>>> ENVIANDO PARA TODOS <<<");
let ok = 0, fail = 0;
for (const t of targets) {
  const r = await send(t.email, t.nome);
  if (r) { ok++; console.log(`  ✓ ${t.email}`); } else { fail++; console.log(`  ✗ ${t.email}`); }
  await new Promise((r) => setTimeout(r, 300)); // gentil com o Gmail
}
console.log(`\nConcluído: ✓ ${ok}  |  ✗ ${fail}`);
