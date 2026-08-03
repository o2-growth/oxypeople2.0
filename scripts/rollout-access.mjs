#!/usr/bin/env node
/**
 * Rollout de acesso (O2). Por padrão roda em DRY-RUN (não escreve).
 * Use --apply para efetivar.
 *
 *  Passo 1 — REMOVER acesso dos desligados (por e-mail exato):
 *            ban do login (auth) + company_memberships.status = 'inactive'
 *  Passo 2 — SENHA padrão Alterar@01 em todos os membros 'active' (pós-remoção)
 *
 * Uso:
 *   node scripts/rollout-access.mjs            # dry-run
 *   node scripts/rollout-access.mjs --apply    # efetiva
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
if (!URL || !KEY) { console.error("Faltando SUPABASE_URL / SERVICE_ROLE_KEY"); process.exit(1); }

const APPLY = process.argv.includes("--apply");
const DEFAULT_PASSWORD = "Alterar@01";
const BAN_DURATION = "876000h"; // ~100 anos
const REMOVE_EMAILS = ["rafael.fleck@o2inc.com.br", "liliana.almeida@o2inc.com.br"];

const db = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const tag = APPLY ? "APPLY" : "DRY-RUN";
console.log(`\n=== ROLLOUT DE ACESSO [${tag}] ===\n`);

async function allAuthUsers() {
  const byEmail = new Map();
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (u.email) byEmail.set(u.email.toLowerCase(), u);
    if (data.users.length < 1000) break;
    page++;
  }
  return byEmail;
}

const authByEmail = await allAuthUsers();

// ---------- PASSO 1: REMOVER ----------
console.log("── Passo 1: remover acesso dos desligados ──");
const removedUserIds = new Set();
for (const email of REMOVE_EMAILS) {
  const u = authByEmail.get(email);
  if (!u) { console.log(`  ? ${email} — não encontrado no auth (pulado)`); continue; }
  removedUserIds.add(u.id);
  console.log(`  → ${email} (${u.id})  ban=login + membership=inactive`);
  if (APPLY) {
    const { error: banErr } = await db.auth.admin.updateUserById(u.id, { ban_duration: BAN_DURATION });
    if (banErr) console.error(`     ✗ ban: ${banErr.message}`); else console.log("     ✓ login banido");
    const { error: memErr, count } = await db
      .from("company_memberships")
      .update({ status: "inactive", updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("user_id", u.id);
    if (memErr) console.error(`     ✗ membership: ${memErr.message}`);
    else console.log(`     ✓ membership(s) inativada(s): ${count ?? "?"}`);
  }
}

// ---------- PASSO 2: SENHA PADRÃO NOS ATIVOS ----------
console.log("\n── Passo 2: senha padrão nos membros ativos ──");
const { data: activeMem, error: memErr } = await db
  .from("company_memberships")
  .select("user_id, company_id, status")
  .eq("status", "active");
if (memErr) { console.error("Erro lendo memberships:", memErr.message); process.exit(1); }

const targetIds = [...new Set((activeMem || []).map((m) => m.user_id))].filter((id) => !removedUserIds.has(id));
console.log(`  Alvos (membros ativos únicos, exceto removidos): ${targetIds.length}`);

let ok = 0, fail = 0;
for (const id of targetIds) {
  if (APPLY) {
    const { error } = await db.auth.admin.updateUserById(id, { password: DEFAULT_PASSWORD });
    if (error) { console.error(`  ✗ ${id} — ${error.message}`); fail++; } else ok++;
  }
}
if (APPLY) console.log(`  Senha aplicada: ✓ ${ok}  |  ✗ ${fail}`);
else console.log(`  (dry-run) aplicaria Alterar@01 em ${targetIds.length} contas`);

console.log(`\n=== FIM [${tag}] ===`);
if (!APPLY) console.log("Nada foi escrito. Rode com --apply para efetivar.\n");
