#!/usr/bin/env node
/**
 * Corrige o texto e as datas do ciclo Full 02/2026.
 *
 * O que estava errado: o título dizia "02/2022", as três etapas tinham datas
 * antigas (10/08, 11–18/08, 19–26/08) e o `end_date` era 26/08 — o que fazia a
 * plataforma cobrar o prazo errado, porque quem responde tem até 13/08 e o
 * resto do calendário é calibragem e devolutiva.
 *
 * As quebras de linha importam: a tela agora respeita linha em branco como
 * parágrafo e quebra simples como item de lista.
 *
 *   node scripts/fix-cycle-02-2026.mjs            # DRY-RUN
 *   node scripts/fix-cycle-02-2026.mjs --apply    # aplica
 */
import { loadEnv } from "./feedz/lib.mjs";

const CYCLE_ID = "5583a18b-90ea-4ef2-82dd-d2feb981c205";
const apply = process.argv.includes("--apply");
const db = loadEnv();

const DESCRICAO = [
  "Damos início à Avaliação de Desempenho – Full | 02/2026, com foco em promover autoconhecimento, alinhamento e desenvolvimento individual.",
  "",
  "Nesta versão, a avaliação será composta por três olhares: autoavaliação, avaliação dos liderados e avaliação da liderança.",
  "",
  "O processo será dividido em três etapas principais:",
  "🗓️ Etapa 1 – Avaliações (auto e lideranças): até 13/08/2026",
  "🗓️ Etapa 2 – Calibragem interna (comitê de liderança): 14 a 20/08/2026",
  "🗓️ Etapa 3 – Devolutivas (feedback individual): 21 a 27/08/2026",
  "",
  "🔎 A avaliação considera nossos valores, atitudes inegociáveis e critérios de entrega esperados para cada papel.",
  "",
  "🗣️ Após o encerramento, cada líder conduzirá uma conversa 1:1 com seu liderado, com base nos resultados, focando em aprendizados e próximos passos.",
  "",
  "Contamos com a participação ativa e cuidadosa de todos(as) para garantir um processo construtivo, transparente e alinhado à nossa cultura.",
].join("\n");

const NOVO = {
  name: "Avaliação de Desempenho Full - 02/2026",
  description: DESCRICAO,
  start_date: "2026-08-03",
  end_date: "2026-08-27",        // fim das devolutivas
  response_deadline: "2026-08-13", // fim da Etapa 1 — é o que a plataforma cobra
};

const { data: antes, error } = await db
  .from("performance_cycles").select("*").eq("id", CYCLE_ID).single();
if (error) { console.error(`ciclo não encontrado: ${error.message}`); process.exit(1); }

console.log("=".repeat(74));
console.log(apply ? "CICLO 02/2026 — APPLY" : "CICLO 02/2026 — DRY-RUN");
console.log("=".repeat(74));

for (const campo of ["name", "start_date", "end_date", "response_deadline"]) {
  const de = antes[campo] ?? "—";
  const para = NOVO[campo];
  console.log(`  ${campo.padEnd(18)} ${String(de).padEnd(38)} → ${para}${de === para ? "  (igual)" : ""}`);
}

console.log("\n  descrição — como vai aparecer:\n");
console.log(DESCRICAO.split("\n").map((l) => (l ? `    │ ${l}` : "    │")).join("\n"));

// As avaliações apontam para o prazo antigo; o card de cada pessoa lê daqui.
const { data: evs } = await db
  .from("performance_evaluations").select("id,due_date,status").eq("cycle_id", CYCLE_ID);
const comPrazoAntigo = evs.filter((e) => e.due_date && e.due_date.slice(0, 10) !== NOVO.response_deadline);
console.log(`\n  avaliações: ${evs.length} (${evs.filter((e) => e.status === "completed").length} respondidas)`);
console.log(`  com prazo desatualizado: ${comPrazoAntigo.length} → passam para ${NOVO.response_deadline}`);

if (!apply) {
  console.log(`\nPara aplicar: node scripts/fix-cycle-02-2026.mjs --apply`);
  process.exit(0);
}

const { error: e1 } = await db.from("performance_cycles").update(NOVO).eq("id", CYCLE_ID);
if (e1) { console.error(`\nERRO ao atualizar o ciclo: ${e1.message}`); process.exit(1); }

const { error: e2 } = await db
  .from("performance_evaluations")
  .update({ due_date: NOVO.response_deadline })
  .eq("cycle_id", CYCLE_ID);
if (e2) { console.error(`ERRO ao atualizar prazos: ${e2.message}`); process.exit(1); }

const { data: depois } = await db
  .from("performance_cycles")
  .select("name,start_date,end_date,response_deadline,description")
  .eq("id", CYCLE_ID).single();

console.log("\n  ✓ ciclo atualizado");
console.log(`    ${depois.name}`);
console.log(`    ${depois.start_date} → ${depois.end_date} · respostas até ${depois.response_deadline}`);
console.log(`    descrição: ${depois.description.length} caracteres, ${depois.description.split("\n\n").length} parágrafos`);
console.log(`  ✓ ${evs.length} avaliações com prazo ${NOVO.response_deadline}`);
