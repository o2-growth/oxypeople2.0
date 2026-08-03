#!/usr/bin/env node
/**
 * Restaura os gestores diretos a partir do backup do Feedz.
 *
 * 18 pessoas ativas estavam sem gestor ou apontando para alguém já desligado —
 * o que as deixa de fora da avaliação de gestor e quebra o organograma. O
 * backup traz a coluna "Gestor Direto - E-mail", e ela resolve 14 dos casos.
 *
 * Só aplica quando o gestor indicado está ATIVO hoje: reapontar para outro
 * desligado apenas trocaria um problema por outro.
 *
 *   node scripts/restore-managers.mjs            # DRY-RUN
 *   node scripts/restore-managers.mjs --apply    # aplica
 */
import { loadEnv, COMPANY_ID, sheet, norm } from "./feedz/lib.mjs";

const apply = process.argv.includes("--apply");
const db = loadEnv();

const { data: ms } = await db
  .from("company_memberships")
  .select("id,user_id,manager_id,position,status")
  .eq("company_id", COMPANY_ID);
const { data: us } = await db.from("users").select("id,full_name,email");

const nome = new Map(us.map((u) => [u.id, u.full_name ?? "?"]));
const porEmail = new Map(us.map((u) => [norm(u.email), u]));
const statusDe = new Map(ms.map((m) => [m.user_id, m.status]));
const ativo = (id) => statusDe.get(id) === "active";

// nome do gestor no backup, por e-mail da pessoa
const gestorFeedz = new Map();
for (const c of sheet("Colaboradores_20262907050138.xlsx")) {
  const e = norm(c["Email"]);
  const g = norm(c["Gestor Direto - E-mail"]);
  if (e && g) gestorFeedz.set(e, g);
}

const semGestorValido = ms.filter(
  (m) => m.status === "active" && (!m.manager_id || !ativo(m.manager_id)),
);

const aplicaveis = [];
const pendentes = [];
for (const m of semGestorValido) {
  const pessoa = us.find((u) => u.id === m.user_id);
  const gestorEmail = gestorFeedz.get(norm(pessoa?.email));
  const gestor = gestorEmail ? porEmail.get(gestorEmail) : null;

  if (gestor && ativo(gestor.id) && gestor.id !== m.user_id) {
    aplicaveis.push({ membership: m.id, userId: m.user_id, gestor });
  } else {
    pendentes.push({
      nome: nome.get(m.user_id),
      cargo: m.position,
      motivo: !gestor ? "sem gestor no backup" : "gestor do backup também está desligado",
      sugerido: gestor?.full_name ?? null,
    });
  }
}

console.log("=".repeat(74));
console.log(apply ? "GESTORES — APPLY" : "GESTORES — DRY-RUN (não escreve)");
console.log("=".repeat(74));
console.log(`  ativos sem gestor válido: ${semGestorValido.length}`);
console.log(`  resolvidos pelo backup:   ${aplicaveis.length}`);
console.log(`  seguem pendentes:         ${pendentes.length}\n`);

for (const a of aplicaveis) {
  console.log(`  ${nome.get(a.userId).slice(0, 32).padEnd(34)} → ${a.gestor.full_name}`);
}

if (pendentes.length) {
  console.log(`\n  PENDENTES (precisam de decisão):`);
  for (const p of pendentes) {
    console.log(`     ${(p.nome ?? "?").slice(0, 30).padEnd(32)} ${(p.cargo ?? "-").slice(0, 26).padEnd(28)} ${p.motivo}${p.sugerido ? ` (${p.sugerido})` : ""}`);
  }
}

if (!apply) {
  console.log(`\nPara aplicar: node scripts/restore-managers.mjs --apply`);
  process.exit(0);
}

let ok = 0;
for (const a of aplicaveis) {
  const { error } = await db
    .from("company_memberships")
    .update({ manager_id: a.gestor.id })
    .eq("id", a.membership);
  if (error) console.log(`  ERRO em ${nome.get(a.userId)}: ${error.message}`);
  else ok++;
}
console.log(`\n  gestores atualizados: ${ok}`);
