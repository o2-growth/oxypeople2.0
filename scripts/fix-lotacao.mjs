#!/usr/bin/env node
/**
 * Correções manuais de lotação — as exceções que a regra automática não pega.
 *
 * `setup-org-structure.mjs` monta a estrutura e distribui gente pelo cargo. Isso
 * acerta a maioria e erra quem lidera um time cujo nome não tem nada a ver com o
 * próprio cargo. Em vez de encher aquele script de casos particulares, as
 * exceções ficam aqui, cada uma com o motivo — assim dá para reconferir depois
 * sem ter que perguntar de novo.
 *
 * Rodar duas vezes não muda nada além da primeira.
 *
 *   node scripts/fix-lotacao.mjs            # DRY-RUN
 *   node scripts/fix-lotacao.mjs --apply    # aplica
 */
import { loadEnv, COMPANY_ID, norm } from "./feedz/lib.mjs";

const apply = process.argv.includes("--apply");
const db = loadEnv();

/**
 * `exclusivo: true` tira a pessoa dos outros times; `false` acumula.
 *
 * Acumular é raro e intencional: quem lidera uma frente e ainda atende como CFO
 * ocupa duas cadeiras de verdade, e mostrar só uma esconde metade do trabalho.
 */
const LOTACOES = [
  {
    pessoa: "Eduardo Milani Pedrolo",
    time: "Time Setup",
    role: "lead",
    exclusivo: true,
    porque:
      "Head de Projetos, mas quem ele lidera é o Setup: os quatro membros do time " +
      "são liderados diretos dele. O cargo mandava para Serviços Especiais.",
  },
  {
    pessoa: "Mariana Luz da Silva",
    time: "Time Serviços Especiais",
    role: "lead",
    exclusivo: false,
    porque:
      "Lidera Serviços Especiais e acumula o CFO as a Service da própria O2 — " +
      "segue também no Squad Mariana Luz da Silva, dentro do CAAS, com a Raissa.",
  },
];

const { data: users } = await db.from("users").select("id,full_name");
const { data: pessoas } = await db
  .from("company_memberships").select("user_id,position,status").eq("company_id", COMPANY_ID);
const { data: times } = await db
  .from("teams").select("id,name,parent_team_id,department").eq("company_id", COMPANY_ID);
const { data: vinculos } = await db.from("team_members").select("id,team_id,user_id,role");

const nome = new Map(users.map((u) => [u.id, u.full_name ?? "?"]));
const ativos = new Set(pessoas.filter((p) => p.status === "active").map((p) => p.user_id));
const timePorNome = new Map(times.map((t) => [norm(t.name), t]));
const nomeDoTime = new Map(times.map((t) => [t.id, t.name]));

console.log("=".repeat(78));
console.log(apply ? "LOTAÇÃO — APPLY" : "LOTAÇÃO — DRY-RUN (não escreve)");
console.log("=".repeat(78));

let erros = 0;
for (const lot of LOTACOES) {
  const alvo = users.find((u) => norm(u.full_name) === norm(lot.pessoa));
  const time = timePorNome.get(norm(lot.time));

  console.log(`\n▸ ${lot.pessoa} → ${lot.time} [${lot.role}]`);
  console.log(`  ${lot.porque}`);

  if (!alvo) { console.log(`  ✗ pessoa não encontrada`); erros++; continue; }
  if (!time) { console.log(`  ✗ time não encontrado`); erros++; continue; }
  if (!ativos.has(alvo.id)) console.log(`  ! atenção: membership não está ativa`);

  const meus = vinculos.filter((v) => v.user_id === alvo.id);
  const noAlvo = meus.find((v) => v.team_id === time.id);
  const sobrando = lot.exclusivo ? meus.filter((v) => v.team_id !== time.id) : [];

  if (noAlvo && noAlvo.role === lot.role) console.log(`  = já está lá como ${lot.role}`);
  else if (noAlvo) console.log(`  ~ ajustar papel: ${noAlvo.role} → ${lot.role}`);
  else console.log(`  + entrar como ${lot.role}`);

  for (const v of sobrando) console.log(`  − sair de ${nomeDoTime.get(v.team_id)}`);
  if (!lot.exclusivo) {
    const outros = meus.filter((v) => v.team_id !== time.id);
    if (outros.length) {
      console.log(`  · acumula: ${outros.map((v) => `${nomeDoTime.get(v.team_id)} (${v.role})`).join(", ")}`);
    }
  }

  if (!apply) continue;

  for (const v of sobrando) {
    const { error } = await db.from("team_members").delete().eq("id", v.id);
    if (error) { console.log(`  ERRO ao remover: ${error.message}`); erros++; }
  }
  if (noAlvo) {
    if (noAlvo.role !== lot.role) {
      const { error } = await db.from("team_members").update({ role: lot.role }).eq("id", noAlvo.id);
      if (error) { console.log(`  ERRO ao ajustar papel: ${error.message}`); erros++; }
    }
  } else {
    const { error } = await db
      .from("team_members").insert({ team_id: time.id, user_id: alvo.id, role: lot.role });
    if (error) { console.log(`  ERRO ao inserir: ${error.message}`); erros++; }
  }
}

if (!apply) {
  console.log(`\nPara aplicar: node scripts/fix-lotacao.mjs --apply`);
  process.exit(erros ? 1 : 0);
}

// ---- confere como ficou ----
const { data: depois } = await db.from("team_members").select("team_id,user_id,role");
console.log("\n" + "=".repeat(78));
for (const lot of LOTACOES) {
  const time = timePorNome.get(norm(lot.time));
  if (!time) continue;
  const membros = depois.filter((v) => v.team_id === time.id);
  console.log(`\n${lot.time} (${membros.length}):`);
  for (const m of membros.sort((a, b) => (a.role === "lead" ? -1 : 1))) {
    console.log(`   ${(nome.get(m.user_id) ?? "?").padEnd(38)} ${m.role}`);
  }
}

const emVarios = new Map();
for (const v of depois) emVarios.set(v.user_id, (emVarios.get(v.user_id) ?? 0) + 1);
const acumulando = [...emVarios].filter(([, n]) => n > 1);
console.log(`\nEm mais de um time: ${acumulando.length || "ninguém"}`);
for (const [uid] of acumulando) {
  const onde = depois.filter((v) => v.user_id === uid)
    .map((v) => `${nomeDoTime.get(v.team_id)} (${v.role})`);
  console.log(`   ${(nome.get(uid) ?? "?").padEnd(38)} ${onde.join(" + ")}`);
}

process.exit(erros ? 1 : 0);
