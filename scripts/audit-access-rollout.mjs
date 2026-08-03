#!/usr/bin/env node
/**
 * AUDITORIA (SOMENTE LEITURA) para o rollout de acesso:
 *  - config do pipefy-sync (qual empresa/tabela)
 *  - memberships por status + lista nominal dos ativos
 *  - cruzamento com auth.users (tem login? confirmado? já acessou?)
 *  - e-mails fora do domínio @o2inc.com.br
 *  - localiza desligados a remover (Rafael Fleck, Liliana)
 *
 * NÃO escreve nada.
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
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const DOMAIN = "@o2inc.com.br";

// --- auth users (paginado) → mapa por id e por email ---
async function allAuthUsers() {
  const byId = new Map(), byEmail = new Map(), list = [];
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) { byId.set(u.id, u); if (u.email) byEmail.set(u.email.toLowerCase(), u); list.push(u); }
    if (data.users.length < 1000) break;
    page++;
  }
  return { byId, byEmail, list };
}

const { byId: authById, list: authList } = await allAuthUsers();
console.log(`\n=== AUTH.USERS: ${authList.length} contas ===`);

// --- config do pipefy-sync ---
const { data: cfg } = await db.from("pipefy_sync_config").select("*");
console.log("\n=== pipefy_sync_config ===");
for (const c of cfg || []) {
  console.log({ company_id: c.company_id, table_id: c.table_id ?? c.tableId, last_sync_at: c.last_sync_at, sync_status: c.sync_status });
}

const { data: companies } = await db.from("companies").select("id, name");

for (const c of companies || []) {
  const { data: mem } = await db
    .from("company_memberships")
    .select("user_id, status, hire_date, department, position")
    .eq("company_id", c.id);

  const byStatus = {};
  for (const m of mem || []) byStatus[m.status] = (byStatus[m.status] || 0) + 1;

  console.log(`\n\n########## ${c.name} (${c.id}) ##########`);
  console.log("Status:", byStatus);

  // hidrata email/nome via public.users
  const ids = (mem || []).map((m) => m.user_id);
  const { data: pub } = await db.from("users").select("id, email, full_name").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const pubById = new Map((pub || []).map((u) => [u.id, u]));

  const rows = (mem || []).map((m) => {
    const p = pubById.get(m.user_id) || {};
    const a = authById.get(m.user_id);
    const email = (p.email || a?.email || "").toLowerCase();
    return {
      nome: p.full_name || "(sem nome)",
      email,
      status: m.status,
      dominioOK: email.endsWith(DOMAIN) ? "sim" : "NAO",
      temLogin: a ? "sim" : "NAO",
      jaAcessou: a?.last_sign_in_at ? "sim" : "nunca",
    };
  });

  const ativos = rows.filter((r) => r.status === "active");
  console.log(`\n-- ATIVOS: ${ativos.length} --`);
  console.table(ativos.sort((x, y) => x.nome.localeCompare(y.nome)));

  const foraDominio = ativos.filter((r) => r.dominioOK === "NAO");
  if (foraDominio.length) { console.log(`\n⚠️  ATIVOS fora de ${DOMAIN}:`); console.table(foraDominio); }

  const semLogin = ativos.filter((r) => r.temLogin === "NAO");
  if (semLogin.length) { console.log(`\n⚠️  ATIVOS sem conta de login:`); console.table(semLogin); }

  // desligados-alvo
  const alvo = rows.filter((r) => /fleck|rafael|liliana/i.test(r.nome) || /fleck|liliana/i.test(r.email));
  if (alvo.length) { console.log(`\n🎯  Candidatos a REMOÇÃO (Rafael Fleck / Liliana):`); console.table(alvo); }
}

console.log("\nFim da auditoria (nenhuma escrita realizada).");
