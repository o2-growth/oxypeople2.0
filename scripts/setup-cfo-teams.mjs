#!/usr/bin/env node
/**
 * Estrutura de células de CFO as a Service.
 *
 * O time CAAS agrupava 11 pessoas — 7 CFOs mais os analistas de todos eles
 * misturados. Mas a operação é por célula: cada CFO as a Service atende sua
 * carteira com os analistas ligados a ele (a Pamela responde ao Dagostini, o
 * Anderson ao Everton, e assim por diante). Um time por CFO reflete isso.
 *
 * Cria o departamento "CFO as a Service", um time por CFO ativo, e vincula
 * cada analista ao time do seu gestor. O CFO entra como 'lead' do próprio time.
 *
 *   node scripts/setup-cfo-teams.mjs            # DRY-RUN
 *   node scripts/setup-cfo-teams.mjs --apply    # efetiva
 *
 * Idempotente: time que já existe é reaproveitado, vínculo existente é mantido.
 */
import { loadEnv, COMPANY_ID, norm } from "./feedz/lib.mjs";

const apply = process.argv.includes("--apply");
const db = loadEnv();

console.log("=".repeat(72));
console.log(apply ? "CÉLULAS DE CFO — MODO APPLY" : "CÉLULAS DE CFO — DRY-RUN (não escreve)");
console.log("=".repeat(72));

// ---- levantamento ----
const { data: membros } = await db
  .from("company_memberships")
  .select("user_id,position,department,manager_id")
  .eq("company_id", COMPANY_ID)
  .eq("status", "active");

const { data: users } = await db.from("users").select("id,full_name");
const nome = new Map((users ?? []).map((u) => [u.id, u.full_name ?? "?"]));

const cfos = (membros ?? []).filter((m) => /cfo as a service/i.test(m.position ?? ""));
const liderados = new Map(cfos.map((c) => [c.user_id, (membros ?? []).filter((m) => m.manager_id === c.user_id)]));

console.log(`\nCFOs as a Service ativos: ${cfos.length}`);
for (const c of cfos) {
  console.log(`   ${nome.get(c.user_id).padEnd(30)} ${liderados.get(c.user_id).length} liderado(s)`);
}

// ---- departamento ----
const { data: deps } = await db.from("departments").select("id,name").eq("company_id", COMPANY_ID);
let depCfo = (deps ?? []).find((d) => norm(d.name) === "cfo as a service");

if (!depCfo) {
  console.log(`\n  departamento "CFO as a Service": a criar`);
  if (apply) {
    const { data, error } = await db
      .from("departments")
      .insert({ company_id: COMPANY_ID, name: "CFO as a Service", description: "Células de CFO as a Service", color: "#0b6b4a" })
      .select("id,name")
      .single();
    if (error) { console.error(`  ERRO: ${error.message}`); process.exit(1); }
    depCfo = data;
    console.log(`  criado: ${depCfo.id}`);
  }
} else {
  console.log(`\n  departamento "CFO as a Service": já existe`);
}

// ---- times, um por CFO ----
const { data: times } = await db.from("teams").select("id,name").eq("company_id", COMPANY_ID);
const timePorNome = new Map((times ?? []).map((t) => [norm(t.name), t]));

const { data: vinculos } = await db.from("team_members").select("id,team_id,user_id");
const timeAtualDoUser = new Map((vinculos ?? []).map((v) => [v.user_id, v]));

const plano = [];
for (const c of cfos) {
  const nomeCfo = nome.get(c.user_id);
  // Nome completo, sem abreviar: encurtar para primeiro+último produziria
  // "Mariana Silva" para a Mariana Luz e "Luis Dagostini" para o Dagostini —
  // apelidos que ninguém usa. Renomear na interface é trivial se quiser.
  const nomeTime = `CFO ${nomeCfo}`;
  plano.push({
    cfoId: c.user_id,
    nomeCfo,
    nomeTime,
    existente: timePorNome.get(norm(nomeTime)) ?? null,
    membros: liderados.get(c.user_id),
  });
}

console.log(`\n  times a garantir:`);
for (const p of plano) {
  const marca = p.existente ? "existe" : "criar ";
  console.log(`     [${marca}] ${p.nomeTime.padEnd(30)} ${p.membros.length + 1} pessoa(s)`);
}

if (!apply) {
  console.log(`\n  movimentações previstas:`);
  for (const p of plano) {
    for (const m of [{ user_id: p.cfoId }, ...p.membros]) {
      const atual = timeAtualDoUser.get(m.user_id);
      const de = atual ? (times ?? []).find((t) => t.id === atual.team_id)?.name ?? "?" : "(sem time)";
      console.log(`     ${nome.get(m.user_id).padEnd(32)} ${de.padEnd(14)} → ${p.nomeTime}`);
    }
  }
  console.log(`\nPara efetivar: node scripts/setup-cfo-teams.mjs --apply`);
  process.exit(0);
}

// ---- grava ----
let criados = 0;
let movidos = 0;
for (const p of plano) {
  let time = p.existente;
  if (!time) {
    const { data, error } = await db
      .from("teams")
      .insert({
        company_id: COMPANY_ID,
        name: p.nomeTime,
        description: `Célula de ${p.nomeCfo}`,
        department: "CFO as a Service",
        department_id: depCfo?.id ?? null,
      })
      .select("id,name")
      .single();
    if (error) { console.log(`  ERRO ao criar "${p.nomeTime}": ${error.message}`); continue; }
    time = data;
    criados++;
  }

  // O CFO lidera a própria célula; os liderados entram como membros.
  for (const [i, m] of [{ user_id: p.cfoId }, ...p.membros].entries()) {
    const atual = timeAtualDoUser.get(m.user_id);
    if (atual?.team_id === time.id) continue;
    // Uma pessoa pertence a uma célula por vez: sai da anterior antes de entrar.
    if (atual) await db.from("team_members").delete().eq("id", atual.id);
    const { error } = await db
      .from("team_members")
      .insert({ team_id: time.id, user_id: m.user_id, role: i === 0 ? "lead" : "member" });
    if (error) console.log(`  ERRO ao vincular ${nome.get(m.user_id)}: ${error.message}`);
    else movidos++;
  }
}

console.log(`\n  times criados: ${criados}  |  pessoas posicionadas: ${movidos}`);

const { data: final } = await db.from("teams").select("id,name").eq("company_id", COMPANY_ID);
const { data: vf } = await db.from("team_members").select("team_id");
console.log(`\n  distribuição final:`);
for (const t of (final ?? []).map((t) => ({ nome: t.name, n: (vf ?? []).filter((v) => v.team_id === t.id).length }))
  .filter((t) => t.n > 0).sort((a, b) => b.n - a.n)) {
  console.log(`     ${t.nome.padEnd(28)} ${t.n}`);
}
