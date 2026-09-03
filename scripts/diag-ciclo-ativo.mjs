#!/usr/bin/env node
/**
 * Leitura pura: mostra os ciclos de avaliação e o estado das respostas.
 * Não escreve nada. Serve para decidir com dado na mão antes de mexer em prazo.
 *
 *   node scripts/diag-ciclo-ativo.mjs
 */
import { loadEnv } from "./feedz/lib.mjs";

const db = loadEnv();
const hoje = new Date().toISOString().slice(0, 10);

const { data: ciclos, error } = await db
  .from("performance_cycles")
  .select("id,name,status,start_date,end_date,response_deadline,updated_at")
  .order("start_date", { ascending: false })
  .limit(10);
if (error) { console.error(error.message); process.exit(1); }

console.log("=".repeat(78));
console.log(`CICLOS DE AVALIAÇÃO — hoje ${hoje}`);
console.log("=".repeat(78));

for (const c of ciclos) {
  const prazo = c.response_deadline ?? c.end_date;
  const dias = Math.ceil((new Date(prazo) - new Date(hoje)) / 86400000);
  console.log(`\n▸ ${c.name}`);
  console.log(`  id                ${c.id}`);
  console.log(`  status            ${c.status}`);
  console.log(`  start_date        ${c.start_date}`);
  console.log(`  end_date          ${c.end_date}       (fim do processo)`);
  console.log(`  response_deadline ${c.response_deadline ?? "— (usa end_date)"}       (prazo cobrado)`);
  console.log(`  → prazo efetivo   ${prazo}  ${dias < 0 ? `VENCIDO há ${-dias}d` : `faltam ${dias}d`}`);

  const { data: evs } = await db
    .from("performance_evaluations")
    .select("id,status,due_date,completed_at")
    .eq("cycle_id", c.id);
  if (!evs?.length) { console.log(`  avaliações        nenhuma`); continue; }

  const porStatus = evs.reduce((a, e) => ((a[e.status] = (a[e.status] || 0) + 1), a), {});
  const prazos = [...new Set(evs.map((e) => e.due_date?.slice(0, 10) ?? "null"))];
  console.log(`  avaliações        ${evs.length} → ${Object.entries(porStatus).map(([k, v]) => `${k}: ${v}`).join(" · ")}`);
  console.log(`  due_date delas    ${prazos.join(", ")}`);

  const ids = evs.map((e) => e.id);
  let respostas = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const { count } = await db
      .from("performance_answers")
      .select("id", { count: "exact", head: true })
      .in("evaluation_id", ids.slice(i, i + 200));
    respostas += count ?? 0;
  }
  console.log(`  respostas salvas  ${respostas} (em performance_answers)`);
}
console.log();
