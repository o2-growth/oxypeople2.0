#!/usr/bin/env node
/**
 * Diagnóstico: por que o headcount ativo marca menos do que o esperado.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/diagnose-active-headcount.mjs
 * (ou coloque a chave em .env.local / .env como SUPABASE_SERVICE_ROLE_KEY)
 *
 * NÃO escreve nada. Apenas lê e compara.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  try {
    const env = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltando SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: companies } = await supabase.from("companies").select("id, name");
console.log("\n=== EMPRESAS ===");
console.table(companies);

for (const c of companies || []) {
  console.log(`\n########## ${c.name} (${c.id}) ##########`);

  // Contagem por status
  const { data: memberships } = await supabase
    .from("company_memberships")
    .select("user_id, status, hire_date, department, position, employment_type, is_new_hire")
    .eq("company_id", c.id);

  const byStatus = {};
  let semHireDate = 0;
  for (const m of memberships || []) {
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    if (m.status === "active" && !m.hire_date) semHireDate++;
  }
  console.log("Memberships por status:", byStatus);
  console.log(`Ativos SEM hire_date (somem do widget Headcount): ${semHireDate}`);

  // Ativos sem e-mail em auth (indicaria criação incompleta)
  const active = (memberships || []).filter((m) => m.status === "active");
  console.log(`Total ATIVOS (o que a plataforma deveria mostrar): ${active.length}`);

  // Último log de sync
  const { data: logs } = await supabase
    .from("pipefy_sync_logs")
    .select("started_at, status, records_synced, records_created, records_updated, records_skipped, error_message")
    .eq("company_id", c.id)
    .order("started_at", { ascending: false })
    .limit(3);
  console.log("\nÚltimos syncs Pipefy:");
  console.table(logs);
}

console.log("\nPronto. Compare 'Total ATIVOS' com o esperado (53) e olhe 'records_skipped'.");
