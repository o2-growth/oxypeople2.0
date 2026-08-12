#!/usr/bin/env node
/**
 * Cria o auth user da Karen Langhanz preservando o id da linha que já existe
 * em public.users (6ef5e3bf-...), para que memberships, roles e histórico
 * continuem apontando pro lugar certo e o login Google passe a linkar nela.
 *
 * PRÉ-REQUISITO: a migração 20260812120000_handle_new_user_tolerante.sql já
 * aplicada no banco — sem ela o trigger estoura na PK e o createUser falha.
 *
 *   node scripts/fix-karen-auth.mjs            # DRY-RUN
 *   node scripts/fix-karen-auth.mjs --apply    # cria
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
if (!SUPA_URL || !KEY) { console.error("Faltando SUPABASE_*"); process.exit(1); }

const APPLY = process.argv.includes("--apply");
const USER_ID = "6ef5e3bf-33c8-470f-9394-86ee5f93898a";
const EMAIL = "karen.langhanz@o2inc.com.br";
const PASSWORD = "Alterar@01"; // mesma senha provisória do create-missing-15

const db = createClient(SUPA_URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// estado atual
const { data: pub, error: pe } = await db.from("users").select("id,email,full_name").eq("id", USER_ID).single();
if (pe || !pub) { console.error("public.users não achou o id esperado:", pe?.message); process.exit(1); }
if (pub.email !== EMAIL) { console.error(`email divergente em public.users: ${pub.email}`); process.exit(1); }

const { data: existing } = await db.auth.admin.getUserById(USER_ID);
if (existing?.user) { console.log("Auth user já existe com esse id — nada a fazer."); process.exit(0); }

const { data: mem } = await db.from("company_memberships").select("status,department,position").eq("user_id", USER_ID);
console.log("public.users:", pub.full_name, "|", pub.email);
console.log("memberships:", JSON.stringify(mem));

if (!APPLY) { console.log("\n(DRY-RUN) rode com --apply para criar o auth user."); process.exit(0); }

const { data: au, error: ae } = await db.auth.admin.createUser({
  id: USER_ID,
  email: EMAIL,
  password: PASSWORD,
  email_confirm: true, // e-mail confirmado é o que permite o auto-link da identidade Google
  user_metadata: { full_name: pub.full_name },
});
if (ae) { console.error("createUser falhou:", ae.message, "\n(A migração do trigger foi aplicada?)"); process.exit(1); }
console.log(`✓ auth user criado: ${au.user.id} (${au.user.email})`);

// sanidade: não pode ter surgido linha duplicada em public.users
const { data: dup } = await db.from("users").select("id").eq("email", EMAIL);
console.log(dup.length === 1 ? "✓ public.users segue com 1 linha única" : `⚠️ public.users tem ${dup.length} linhas para o email!`);
console.log("\nPronto: Karen pode entrar com Google (ou email + senha provisória).");
