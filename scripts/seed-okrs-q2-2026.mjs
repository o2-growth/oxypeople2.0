#!/usr/bin/env node
/**
 * Seed OKRs Q2 2026 a partir do PDF "OKRs Q2_2026.pdf"
 *
 * Estrutura:
 *   Strategic → Operational (com KRs)
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-okrs-q2-2026.mjs
 *
 * A chave service_role fica em: Supabase Dashboard → Project Settings → API → service_role
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Load .env
for (const f of [".env.local", ".env"]) {
  try {
    const env = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] ||= m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error("❌ Precisa da variável SUPABASE_SERVICE_ROLE_KEY.");
  console.error("   Copie em: Supabase Dashboard → Project Settings → API → service_role");
  console.error("   Uso: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seed-okrs-q2-2026.mjs");
  process.exit(1);
}

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const COMPANY_ID = "4a6cdaea-daef-47d2-897f-54d5ae999638"; // o2-growth
const DUE_DATE   = "2026-06-30"; // Q2 2026

// ─── Buscar owner admin ───────────────────────────────────────────────────────
const { data: adminUser, error: adminErr } = await supa
  .from("users")
  .select("id, email")
  .eq("email", "rafael.fleck@o2inc.com.br")
  .single();

if (adminErr || !adminUser) {
  console.error("❌ Usuário admin não encontrado:", adminErr?.message);
  process.exit(1);
}
const OWNER_ID = adminUser.id;
console.log(`✓ Owner: ${adminUser.email} (${OWNER_ID})`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function insertObjective({ title, type, commitment, department, parentId }) {
  const { data, error } = await supa
    .from("objectives")
    .insert({
      company_id:      COMPANY_ID,
      title,
      type,
      commitment_type: commitment,
      department,
      parent_id:       parentId ?? null,
      owner_id:        OWNER_ID,
      created_by:      OWNER_ID,
      due_date:        DUE_DATE,
      status:          "active",
      is_active:       true,
      progress:        0,
    })
    .select("id")
    .single();

  if (error) {
    console.error(`  ❌ Objetivo "${title}":`, error.message);
    process.exit(1);
  }
  console.log(`  + Objetivo: ${title} [${type}/${commitment}]`);
  return data.id;
}

async function insertKRs(objectiveId, krs) {
  for (const kr of krs) {
    const { error } = await supa.from("key_results").insert({
      objective_id:     objectiveId,
      title:            kr.title,
      kr_type:          kr.type,
      direction:        kr.direction,
      initial_value:    0,
      current_value:    0,
      target_value:     kr.target,
      unit:             kr.unit ?? null,
      status:           "active",
      weight_percentage: Math.round(100 / krs.length),
    });
    if (error) {
      console.error(`    ❌ KR "${kr.title}":`, error.message);
    } else {
      console.log(`    • KR: ${kr.title}`);
    }
  }
}

// ─── Verificar duplicatas ─────────────────────────────────────────────────────
const { data: existing } = await supa
  .from("objectives")
  .select("title")
  .eq("company_id", COMPANY_ID)
  .eq("due_date", DUE_DATE)
  .is("deleted_at", null);

const existingTitles = new Set((existing ?? []).map((o) => o.title));

if (existingTitles.size > 0) {
  console.log(`\n⚠️  Já existem ${existingTitles.size} objetivo(s) com due_date Q2/2026:`);
  for (const t of existingTitles) console.log(`   - ${t}`);
  const args = process.argv.slice(2);
  if (!args.includes("--force")) {
    console.log("\nUse --force para inserir mesmo assim.\n");
    process.exit(0);
  }
  console.log("--force ativo, continuando...\n");
}

// ═════════════════════════════════════════════════════════════════════════════
// GROWTH — MARKETING
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Growth - Marketing ──────────────────────────────────────────");

const growthMarketingId = await insertObjective({
  title: "Growth - Marketing",
  type: "strategic",
  commitment: "committed",
  department: "Marketing",
});

// Marketing · Modelo Atual (committed)
const mktModeloId = await insertObjective({
  title: "Marketing · Modelo Atual",
  type: "operational",
  commitment: "committed",
  department: "Marketing",
  parentId: growthMarketingId,
});
await insertKRs(mktModeloId, [
  { title: "Generate > 1.501 MQLs",             type: "numeric",  direction: "up",   target: 1501,    unit: "MQLs" },
  { title: "Cost per MQL < R$ 461,27",           type: "currency", direction: "down", target: 461.27,  unit: "R$"   },
  { title: "CPV Cost < R$ 9.355,89",             type: "currency", direction: "down", target: 9355.89, unit: "R$"   },
  { title: "ROI PEDRO > 2",                      type: "numeric",  direction: "up",   target: 2,       unit: "x"    },
  { title: "ROAS > 4",                           type: "numeric",  direction: "up",   target: 4,       unit: "x"    },
]);

// Marketing · Expansão (aspirational)
const mktExpansaoId = await insertObjective({
  title: "Marketing · Expansão",
  type: "operational",
  commitment: "aspirational",
  department: "Marketing",
  parentId: growthMarketingId,
});
await insertKRs(mktExpansaoId, [
  { title: "Generate > 692 MQLs (Expansão)",     type: "numeric",  direction: "up",   target: 692,     unit: "MQLs" },
]);

// ═════════════════════════════════════════════════════════════════════════════
// GROWTH — COMMERCIAL
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Growth - Commercial ─────────────────────────────────────────");

const growthCommercialId = await insertObjective({
  title: "Growth - Commercial",
  type: "strategic",
  commitment: "committed",
  department: "Comercial",
});

// Commercial · Modelo Atual (committed)
const comModeloId = await insertObjective({
  title: "Commercial · Modelo Atual",
  type: "operational",
  commitment: "committed",
  department: "Comercial",
  parentId: growthCommercialId,
});
await insertKRs(comModeloId, [
  { title: "Speed-to-lead SLA MQL < 5 minutos",       type: "sla_time", direction: "down", target: 5,       unit: "min"  },
  { title: "No Show Rate < 15%",                       type: "percent",  direction: "down", target: 15,      unit: "%"    },
  { title: "Deal Conversion Rate > 15%",               type: "percent",  direction: "up",   target: 15,      unit: "%"    },
  { title: "ARPU > R$ 16.250",                         type: "currency", direction: "up",   target: 16250,   unit: "R$"   },
  { title: "MRR Adicionado > R$ 487,5k",               type: "currency", direction: "up",   target: 487500,  unit: "R$"   },
  { title: "TQR (Total Quarterly Revenue) > R$ 3,75M", type: "currency", direction: "up",   target: 3750000, unit: "R$"   },
  { title: "Revenue Add > R$ 1,95M",                   type: "currency", direction: "up",   target: 1950000, unit: "R$"   },
]);

// Commercial · Expansão (aspirational)
const comExpansaoId = await insertObjective({
  title: "Commercial · Expansão",
  type: "operational",
  commitment: "aspirational",
  department: "Comercial",
  parentId: growthCommercialId,
});
await insertKRs(comExpansaoId, [
  { title: "Close 6 Oxy Hackers",                type: "numeric",  direction: "up",   target: 6,       unit: "units" },
  { title: "Close 11 Franchise Units",           type: "numeric",  direction: "up",   target: 11,      unit: "units" },
  { title: "Generate > R$ 1,756M revenue",       type: "currency", direction: "up",   target: 1756000, unit: "R$"    },
]);

// ═════════════════════════════════════════════════════════════════════════════
// OPERATING
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Operating ───────────────────────────────────────────────────");

const operatingId = await insertObjective({
  title: "Operating",
  type: "strategic",
  commitment: "committed",
  department: "Operações",
});

const operatingKrId = await insertObjective({
  title: "Operating · Metas Q2",
  type: "operational",
  commitment: "committed",
  department: "Operações",
  parentId: operatingId,
});
await insertKRs(operatingKrId, [
  { title: "Gross Margin > 62,5%",                type: "percent",  direction: "up",   target: 62.5,  unit: "%" },
  { title: "Logo Churn < 5% a.m.",                type: "percent",  direction: "down", target: 5,     unit: "%" },
  { title: "Revenue Churn < 5% a.m.",             type: "percent",  direction: "down", target: 5,     unit: "%" },
  { title: "Average Churn LT > 8 meses",          type: "numeric",  direction: "up",   target: 8,     unit: "meses" },
  { title: "Gestão de Rotinas 100%",              type: "percent",  direction: "up",   target: 100,   unit: "%" },
  { title: "NPS (0-100) > 40",                    type: "numeric",  direction: "up",   target: 40,    unit: "pts" },
  { title: "CSAT > 80%",                          type: "percent",  direction: "up",   target: 80,    unit: "%" },
]);

// ═════════════════════════════════════════════════════════════════════════════
// TECH
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Tech ────────────────────────────────────────────────────────");

const techId = await insertObjective({
  title: "Tech",
  type: "strategic",
  commitment: "committed",
  department: "Tech",
});

const techKrId = await insertObjective({
  title: "Tech · Entregas Q2",
  type: "operational",
  commitment: "committed",
  department: "Tech",
  parentId: techId,
});
await insertKRs(techKrId, [
  { title: "Integrations: Tiny, Protheus, SAP B1 + 2",                              type: "numeric", direction: "up", target: 4,  unit: "integrações" },
  { title: "Oxy Playbook: Playbook e treinamento da ferramenta",                     type: "binary",  direction: "up", target: 1,  unit: null },
  { title: "Budget Feature",                                                          type: "binary",  direction: "up", target: 1,  unit: null },
  { title: "Builder V2 (W/ AI Copilot)",                                             type: "binary",  direction: "up", target: 1,  unit: null },
  { title: "Open Finance: Saldo bancário real-time",                                 type: "binary",  direction: "up", target: 1,  unit: null },
  { title: "Modularizar ferramenta e criar Freemium/Trial (por aba + gênio sep.)",   type: "binary",  direction: "up", target: 1,  unit: null },
]);

// ═════════════════════════════════════════════════════════════════════════════
// EXTRA / INICIATIVAS
// ═════════════════════════════════════════════════════════════════════════════
console.log("\n── Extra / Iniciativas ─────────────────────────────────────────");

const extraId = await insertObjective({
  title: "Extra / Iniciativas",
  type: "strategic",
  commitment: "aspirational",
  department: "Estratégia",
});

const extraKrId = await insertObjective({
  title: "Extra · Entregas Q2",
  type: "operational",
  commitment: "aspirational",
  department: "Estratégia",
  parentId: extraId,
});
await insertKRs(extraKrId, [
  { title: "Dados Facilitados (Tech Ops)",                                           type: "binary", direction: "up", target: 1, unit: null },
  { title: "O2 com CFOaaS",                                                          type: "binary", direction: "up", target: 1, unit: null },
  { title: "Padronizações | Documentação | Playbook",                                type: "binary", direction: "up", target: 1, unit: null },
  { title: "IA em setup, diagnósticos, rotina CFO, atendimento SaaS",               type: "binary", direction: "up", target: 1, unit: null },
  { title: "Módulos na Oxy",                                                         type: "binary", direction: "up", target: 1, unit: null },
  { title: "Analista Operacional",                                                   type: "binary", direction: "up", target: 1, unit: null },
  { title: "BPO na operação CFOaaS e SaaS",                                         type: "binary", direction: "up", target: 1, unit: null },
  { title: "Gestão de rotinas rodando",                                              type: "binary", direction: "up", target: 1, unit: null },
]);

// ─── Sumário ──────────────────────────────────────────────────────────────────
console.log("\n✅ Seed concluído!");
console.log("   Acesse /objectives e selecione Q2 · 2026 para ver os OKRs.");
