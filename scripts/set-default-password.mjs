#!/usr/bin/env node
/**
 * One-shot: set every auth user's password to the DEFAULT_PASSWORD.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env or .env.local.
 *
 * Usage:
 *   node scripts/set-default-password.mjs
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = "Alterar@01";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌  SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env ou .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getAllUsers() {
  const users = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
    page++;
  }
  return users;
}

const users = await getAllUsers();
console.log(`🔍  ${users.length} usuário(s) encontrado(s)`);

let ok = 0;
let fail = 0;

for (const user of users) {
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: DEFAULT_PASSWORD,
  });
  if (error) {
    console.error(`  ✗ ${user.email} — ${error.message}`);
    fail++;
  } else {
    console.log(`  ✓ ${user.email}`);
    ok++;
  }
}

console.log(`\n✅  ${ok} atualizados  |  ❌  ${fail} falhas`);
