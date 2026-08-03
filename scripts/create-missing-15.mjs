#!/usr/bin/env node
/**
 * Cria os membros ativos do Pipefy que ainda não existem no sistema.
 * Puxa nome/cargo/time/data de contratação do database Pessoas (Pipefy),
 * cria auth user (senha Alterar@01), public.users, company_membership (o2-growth)
 * e user_role. Depois pode enviar o e-mail de acesso (--email).
 *
 *   node scripts/create-missing-15.mjs            # DRY-RUN
 *   node scripts/create-missing-15.mjs --apply    # cria
 *   node scripts/create-missing-15.mjs --apply --email   # cria + envia e-mail de acesso
 *
 * Requer PIPEFY_TOKEN no ambiente e SUPABASE_* / N8N_ENPS_* no .env.local.
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

const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PIPEFY_TOKEN = process.env.PIPEFY_TOKEN;
const WEBHOOK = process.env.N8N_ENPS_WEBHOOK_URL;
const SECRET = process.env.N8N_ENPS_SECRET;
if (!SUPA_URL || !KEY || !PIPEFY_TOKEN) { console.error("Faltando SUPABASE_* ou PIPEFY_TOKEN"); process.exit(1); }

const APPLY = process.argv.includes("--apply");
const SEND_EMAIL = process.argv.includes("--email");
const COMPANY_ID = "4a6cdaea-daef-47d2-897f-54d5ae999638"; // o2-growth
const PASSWORD = "Alterar@01";
const APP_URL = "https://oxypeople20.vercel.app/auth";
const TABLE = "_XuxdWOx";

const TARGET_EMAILS = [
  "belissa.cecim@o2inc.com.br","bruna.mota@o2inc.com.br","bruno.mendes@o2inc.com.br",
  "carolina.casagrande@o2inc.com.br","diego.rosales@o2inc.com.br","felipe.dalpra@o2inc.com.br",
  "fernanda.gregorio@o2inc.com.br","icaro.santana@o2inc.com.br","joao.soares@o2inc.com.br",
  "kethlin.moreira@o2inc.com.br","lizandra.garcia@o2inc.com.br","manuela.valente@o2inc.com.br",
  "pamela.coelho@o2inc.com.br","paulo.cerqueira@o2inc.com.br","ricardo.armando@o2inc.com.br",
];

const db = createClient(SUPA_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function gql(query) {
  const r = await fetch("https://api.pipefy.com/graphql", {
    method: "POST", headers: { Authorization: "Bearer " + PIPEFY_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(JSON.stringify(j.errors).slice(0, 300));
  return j.data;
}

function toISO(d) {
  if (!d) return null;
  const s = String(d).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
function firstName(f) { return (f || "").trim().split(/\s+/)[0] || "Olá"; }

// --- puxa Pessoas do Pipefy ---
const wanted = new Set(TARGET_EMAILS);
const found = new Map();
let cursor = null, has = true;
while (has) {
  const after = cursor ? `, after:"${cursor}"` : "";
  const d = await gql(`{ table(id:"${TABLE}"){ table_records(first:50${after}){ edges{ node{ record_fields{ name value } } } pageInfo{ hasNextPage endCursor } } } }`);
  const tr = d.table.table_records;
  for (const e of tr.edges) {
    const f = {}; for (const rf of e.node.record_fields) f[rf.name] = rf.value;
    const email = (f["E-mail O2"] || "").toString().trim().toLowerCase();
    if (wanted.has(email)) {
      found.set(email, {
        email,
        nome: (f["Nome"] || "").toString().trim(),
        cargo: (f["Cargo"] || "").toString().trim() || null,
        time: (f["Time"] || "").toString().trim() || null,
        hire: toISO(f["Data de contratação"]),
        birth: toISO(f["Data de nascimento"]),
      });
    }
  }
  has = tr.pageInfo.hasNextPage; cursor = tr.pageInfo.endCursor;
}

const people = TARGET_EMAILS.map((e) => found.get(e)).filter(Boolean);
console.log(`Encontrados no Pipefy: ${people.length}/${TARGET_EMAILS.length}`);
const missing = TARGET_EMAILS.filter((e) => !found.has(e));
if (missing.length) console.log("⚠️ não achados no Pipefy:", missing.join(", "));
console.table(people.map((p) => ({ nome: p.nome, email: p.email, cargo: p.cargo, time: p.time, hire: p.hire })));

if (!APPLY) { console.log("\n(DRY-RUN) rode com --apply para criar."); process.exit(0); }

// mapa auth existente (evita duplicar)
const authByEmail = new Map();
{ let page = 1; while (true) { const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 }); for (const u of data.users) if (u.email) authByEmail.set(u.email.toLowerCase(), u); if (data.users.length < 1000) break; page++; } }

const created = [];
for (const p of people) {
  if (authByEmail.has(p.email)) { console.log(`  = ${p.email} já existe no auth — pulado`); continue; }
  const { data: au, error: ae } = await db.auth.admin.createUser({
    email: p.email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: p.nome },
  });
  if (ae) { console.log(`  ✗ ${p.email} createUser: ${ae.message}`); continue; }
  const uid = au.user.id;
  await new Promise((r) => setTimeout(r, 120)); // trigger handle_new_user
  const uUp = { updated_at: new Date().toISOString(), primary_company_id: COMPANY_ID };
  if (p.nome) uUp.full_name = p.nome;
  if (p.birth) uUp.birth_date = p.birth;
  await db.from("users").update(uUp).eq("id", uid);
  const mem = { user_id: uid, company_id: COMPANY_ID, status: "active", joined_at: new Date().toISOString() };
  if (p.cargo) mem.position = p.cargo;
  if (p.time) mem.department = p.time;
  if (p.hire) mem.hire_date = p.hire;
  const { error: me } = await db.from("company_memberships").insert(mem);
  if (me) console.log(`  ! ${p.email} membership: ${me.message}`);
  await db.from("user_roles").insert({ user_id: uid, company_id: COMPANY_ID, role: "member" });
  created.push(p);
  console.log(`  ✓ ${p.email} criado (${p.cargo || "sem cargo"} / ${p.time || "sem time"})`);
}
console.log(`\nCriados: ${created.length}`);

// e-mail de acesso só para os criados agora
if (SEND_EMAIL && WEBHOOK && SECRET && created.length) {
  console.log("\nEnviando e-mail de acesso aos criados...");
  for (const p of created) {
    const html = accessHtml(firstName(p.nome), p.email);
    const r = await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, to: p.email, subject: "✅ Seu acesso à plataforma Oxy People está pronto", html }) });
    console.log(`  ${r.ok ? "✓" : "✗"} ${p.email}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

function accessHtml(nome, loginEmail) {
  return `<div style="margin:0;padding:0;background:#f4f6f8;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f6f8;padding:24px 0;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);font-family:Arial,Helvetica,sans-serif;"><tr><td style="background:#0b6b4a;padding:28px 32px;"><h1 style="margin:0;color:#fff;font-size:22px;">Oxy People</h1><p style="margin:6px 0 0;color:#cdeede;font-size:14px;">Gestão de Pessoas · O2</p></td></tr><tr><td style="padding:32px;"><h2 style="margin:0 0 12px;color:#0b6b4a;font-size:20px;">Olá, ${nome}! Seu acesso está pronto 🎉</h2><p style="margin:0 0 16px;color:#53626b;font-size:15px;line-height:1.6;">A plataforma <strong>Oxy People</strong> já está disponível para você. É onde acompanhamos OKRs, performance, feedbacks, PDI, 1:1s, reconhecimentos e as pesquisas de clima do time.</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6f8;border-radius:8px;margin:8px 0 20px;"><tr><td style="padding:16px 20px;color:#334;font-size:15px;line-height:1.8;"><strong>Login:</strong> ${loginEmail}<br><strong>Senha provisória:</strong> <code style="background:#e7f4ee;padding:2px 8px;border-radius:4px;color:#0b6b4a;font-size:15px;">${PASSWORD}</code></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;"><tr><td align="center" bgcolor="#00c853" style="border-radius:8px;"><a href="${APP_URL}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:bold;color:#fff;text-decoration:none;border-radius:8px;">Acessar a plataforma</a></td></tr></table><p style="margin:0 0 8px;color:#53626b;font-size:14px;line-height:1.6;">🔒 <strong>Por segurança, troque sua senha no primeiro acesso.</strong></p><p style="margin:16px 0 0;color:#8a97a0;font-size:13px;line-height:1.6;">Qualquer dificuldade, é só responder este e-mail. Bom uso! 💚</p></td></tr><tr><td style="background:#f0f3f5;padding:16px 32px;color:#9aa6ad;font-size:12px;text-align:center;">Oxy People · O2 — comunicado automático de acesso.</td></tr></table></td></tr></table></div>`;
}
