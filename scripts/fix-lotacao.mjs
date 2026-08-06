#!/usr/bin/env node
/**
 * Correções manuais de lotação — as exceções que a regra automática não pega.
 *
 * `setup-org-structure.mjs` monta a estrutura e distribui gente pelo cargo. Isso
 * acerta a maioria e erra quem lidera um time cujo nome não tem nada a ver com o
 * próprio cargo, ou quem foi movido depois por decisão de negócio. Em vez de
 * encher aquele script de casos particulares, as exceções ficam aqui, cada uma
 * com o motivo — assim dá para reconferir depois sem ter que perguntar de novo.
 *
 * Rodar duas vezes não muda nada além da primeira.
 *
 *   node scripts/fix-lotacao.mjs            # DRY-RUN
 *   node scripts/fix-lotacao.mjs --apply    # aplica
 */
import { loadEnv, COMPANY_ID, norm } from "./feedz/lib.mjs";

const apply = process.argv.includes("--apply");
const db = loadEnv();

/** Squads que precisam existir antes de alguém ser lotado neles. */
const SQUADS_A_GARANTIR = [
  {
    nome: "Squad Expansão",
    pai: "Time Comercial",
    descricao: "Closer e SDR dedicados à expansão da base",
    porque: "A frente de expansão existe e não tinha squad: Bruna e Kethlin ficavam no Inbound.",
  },
];

/**
 * Uma entrada por pessoa, com todos os times dela.
 *
 * `exclusivo: true` significa "é exatamente nestes times que ela está" — sai de
 * qualquer outro. `false` acumula: quem lidera uma frente e ainda atende como
 * CFO, ou quem é CTO e responde por dois times de tecnologia, ocupa mais de uma
 * cadeira de verdade, e mostrar só uma esconde metade do trabalho.
 */
const LOTACOES = [
  {
    pessoa: "Eduardo Milani Pedrolo",
    times: [{ nome: "Time Setup", role: "lead" }],
    exclusivo: true,
    porque:
      "Head de Projetos, mas quem ele lidera é o Setup: os quatro membros do time " +
      "são liderados diretos dele. O cargo mandava para Serviços Especiais.",
  },
  {
    pessoa: "Mariana Luz da Silva",
    times: [
      { nome: "Time Serviços Especiais", role: "lead" },
      { nome: "Squad Mariana Luz da Silva", role: "lead" },
    ],
    exclusivo: true,
    porque:
      "Lidera Serviços Especiais e acumula o CFO as a Service da própria O2, " +
      "com a Raissa no squad dela, dentro do CAAS.",
  },
  {
    pessoa: "Vinicius Franzoi Sanfelice",
    times: [
      { nome: "Time de Desenvolvimento", role: "lead" },
      { nome: "Time de IA", role: "lead" },
      { nome: "Time Gestão", role: "member" },
    ],
    exclusivo: true,
    porque:
      "CTO: responde pelos dois times de tecnologia e senta na Gestão junto " +
      "com CEO e COO. Os dois times estavam sem líder.",
  },
  {
    pessoa: "Daniel da Silva Trindade",
    times: [
      { nome: "Squad Inbound", role: "lead" },
      { nome: "Squad Outbound", role: "lead" },
      { nome: "Squad Expansão", role: "lead" },
    ],
    exclusivo: true,
    porque: "Lidera as três frentes comerciais — todo o comercial reporta a ele.",
  },
  {
    pessoa: "Matheus Staruck dos Reis",
    times: [{ nome: "Squad Outbound", role: "member" }],
    exclusivo: true,
    porque: "BDR de outbound; estava no Inbound junto com o resto do comercial.",
  },
  {
    pessoa: "Bruna Patricio Mota",
    times: [{ nome: "Squad Expansão", role: "member" }],
    exclusivo: true,
    porque: "Closer da frente de expansão.",
  },
  {
    pessoa: "Kethlin da Silva Moreira",
    times: [{ nome: "Squad Expansão", role: "member" }],
    exclusivo: true,
    porque: "SDR da frente de expansão.",
  },
];

const { data: users } = await db.from("users").select("id,full_name");
const { data: pessoas } = await db
  .from("company_memberships").select("user_id,position,status").eq("company_id", COMPANY_ID);
let { data: times } = await db
  .from("teams").select("id,name,parent_team_id,department,department_id,order_index").eq("company_id", COMPANY_ID);
let { data: vinculos } = await db.from("team_members").select("id,team_id,user_id,role");

const nome = new Map(users.map((u) => [u.id, u.full_name ?? "?"]));
const ativos = new Set(pessoas.filter((p) => p.status === "active").map((p) => p.user_id));
const achaTime = (n) => times.find((t) => norm(t.name) === norm(n));
const nomeDoTime = (id) => times.find((t) => t.id === id)?.name ?? "?";

console.log("=".repeat(78));
console.log(apply ? "LOTAÇÃO — APPLY" : "LOTAÇÃO — DRY-RUN (não escreve)");
console.log("=".repeat(78));

let erros = 0;

// ---- squads que precisam existir ----
for (const sq of SQUADS_A_GARANTIR) {
  const existe = achaTime(sq.nome);
  const pai = achaTime(sq.pai);
  console.log(`\n▸ ${sq.nome}  ${existe ? "(já existe)" : "(criar)"}`);
  console.log(`  ${sq.porque}`);
  if (!pai) { console.log(`  ✗ time pai "${sq.pai}" não encontrado`); erros++; continue; }
  if (existe || !apply) continue;

  const irmaos = times.filter((t) => t.parent_team_id === pai.id).length;
  const { data, error } = await db.from("teams").insert({
    company_id: COMPANY_ID,
    name: sq.nome,
    description: sq.descricao,
    parent_team_id: pai.id,
    department: pai.department,
    department_id: pai.department_id,
    order_index: irmaos,
  }).select("id,name,parent_team_id,department,department_id,order_index").single();
  if (error) { console.log(`  ERRO ao criar: ${error.message}`); erros++; continue; }
  times.push(data);
  console.log(`  ✓ criado dentro de ${sq.pai}`);
}

// ---- lotações ----
for (const lot of LOTACOES) {
  const alvo = users.find((u) => norm(u.full_name) === norm(lot.pessoa));
  console.log(`\n▸ ${lot.pessoa}`);
  console.log(`  ${lot.porque}`);

  if (!alvo) { console.log(`  ✗ pessoa não encontrada`); erros++; continue; }
  if (!ativos.has(alvo.id)) console.log(`  ! atenção: membership não está ativa`);

  const querer = new Map();
  let faltaTime = false;
  for (const t of lot.times) {
    const time = achaTime(t.nome);
    if (!time) { console.log(`  ✗ time "${t.nome}" não encontrado`); faltaTime = true; erros++; continue; }
    querer.set(time.id, t.role);
  }
  if (faltaTime) continue;

  const meus = vinculos.filter((v) => v.user_id === alvo.id);
  const tenho = new Map(meus.map((v) => [v.team_id, v]));

  for (const [teamId, role] of querer) {
    const atual = tenho.get(teamId);
    if (!atual) console.log(`  + ${nomeDoTime(teamId)} como ${role}`);
    else if (atual.role !== role) console.log(`  ~ ${nomeDoTime(teamId)}: ${atual.role} → ${role}`);
    else console.log(`  = ${nomeDoTime(teamId)} (${role})`);
  }
  const sobrando = lot.exclusivo ? meus.filter((v) => !querer.has(v.team_id)) : [];
  for (const v of sobrando) console.log(`  − sai de ${nomeDoTime(v.team_id)}`);

  if (!apply) continue;

  for (const v of sobrando) {
    const { error } = await db.from("team_members").delete().eq("id", v.id);
    if (error) { console.log(`  ERRO ao remover: ${error.message}`); erros++; }
  }
  for (const [teamId, role] of querer) {
    const atual = tenho.get(teamId);
    if (!atual) {
      const { error } = await db.from("team_members").insert({ team_id: teamId, user_id: alvo.id, role });
      if (error) { console.log(`  ERRO ao inserir: ${error.message}`); erros++; }
    } else if (atual.role !== role) {
      const { error } = await db.from("team_members").update({ role }).eq("id", atual.id);
      if (error) { console.log(`  ERRO ao ajustar papel: ${error.message}`); erros++; }
    }
  }
}

if (!apply) {
  console.log(`\nPara aplicar: node scripts/fix-lotacao.mjs --apply`);
  process.exit(erros ? 1 : 0);
}

// ---- como ficou ----
({ data: times } = await db
  .from("teams").select("id,name,parent_team_id").eq("company_id", COMPANY_ID));
({ data: vinculos } = await db.from("team_members").select("team_id,user_id,role"));

const tocados = [...new Set(LOTACOES.flatMap((l) => l.times.map((t) => t.nome)))];
console.log("\n" + "=".repeat(78));
for (const n of tocados) {
  const t = achaTime(n);
  if (!t) continue;
  const ms = vinculos.filter((v) => v.team_id === t.id);
  console.log(`\n${n} (${ms.length}):`);
  for (const m of ms.sort((a, b) => (a.role === "lead" ? -1 : 1))) {
    console.log(`   ${(nome.get(m.user_id) ?? "?").padEnd(38)} ${m.role}`);
  }
}

const conta = new Map();
for (const v of vinculos) conta.set(v.user_id, (conta.get(v.user_id) ?? 0) + 1);
const acumulando = [...conta].filter(([, n]) => n > 1);
console.log(`\nEm mais de um time: ${acumulando.length || "ninguém"}`);
for (const [uid] of acumulando) {
  const onde = vinculos.filter((v) => v.user_id === uid).map((v) => `${nomeDoTime(v.team_id)} (${v.role})`);
  console.log(`   ${(nome.get(uid) ?? "?").padEnd(34)} ${onde.join(" + ")}`);
}

process.exit(erros ? 1 : 0);
