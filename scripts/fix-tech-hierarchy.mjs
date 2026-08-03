#!/usr/bin/env node
/**
 * Corrige a hierarquia de Tecnologia.
 *
 * O time apontava para dois gestores já desligados: João Gabriel (ex-CTO) e
 * Rafael Fleck (ex-CMO). Como a avaliação de desempenho monta os pares a partir
 * do gestor direto, isso gerou avaliações cujo avaliador não trabalha mais aqui
 * e nunca vai respondê-las.
 *
 * Estrutura informada pelo Andrey em 03/08/2026:
 *   Vinicius Sanfelice (CTO) → Andrey + time de engenharia
 *   Andrey (Head de IA)      → Icaro e João Victor
 *
 *   node scripts/fix-tech-hierarchy.mjs            # DRY-RUN
 *   node scripts/fix-tech-hierarchy.mjs --apply    # aplica
 */
import { loadEnv, COMPANY_ID, norm } from "./feedz/lib.mjs";

const apply = process.argv.includes("--apply");
const db = loadEnv();

const { data: us } = await db.from("users").select("id,full_name,email");
const acha = (termo) =>
  us.find((u) => norm(u.full_name).includes(termo) || norm(u.email).includes(termo));

const vinicius = acha("vinicius franzoi sanfelice") ?? acha("vinicius.sanfelice");
const andrey = acha("andrey lopes vieira") ?? acha("andrey.lopes");

if (!vinicius || !andrey) {
  console.error("não encontrei Vinicius (CTO) ou Andrey");
  process.exit(1);
}

// quem reporta a quem, por e-mail (estável; nome tem variação de grafia)
const HIERARQUIA = [
  { email: "andrey.lopes", gestor: vinicius, rotulo: "Andrey → Vinicius (CTO)" },
  { email: "pedro.santiago", gestor: vinicius, rotulo: "Pedro Santiago → Vinicius" },
  { email: "leonardo.rezende", gestor: vinicius, rotulo: "Leonardo Rezende → Vinicius" },
  { email: "felipe.bisotto", gestor: vinicius, rotulo: "Felipe Bisotto → Vinicius" },
  { email: "icaro.santana", gestor: andrey, rotulo: "Icaro → Andrey" },
  { email: "joao.victor", gestor: andrey, rotulo: "João Victor → Andrey" },
];

const { data: ms } = await db
  .from("company_memberships")
  .select("id,user_id,manager_id,position,status")
  .eq("company_id", COMPANY_ID);
const nome = new Map(us.map((u) => [u.id, u.full_name]));

console.log("=".repeat(70));
console.log(apply ? "HIERARQUIA DE TECNOLOGIA — APPLY" : "HIERARQUIA DE TECNOLOGIA — DRY-RUN");
console.log("=".repeat(70));
console.log(`CTO: ${vinicius.full_name}\nHead de IA: ${andrey.full_name}\n`);

let alterados = 0;
for (const h of HIERARQUIA) {
  const pessoa = us.find((u) => norm(u.email).includes(h.email));
  if (!pessoa) { console.log(`  ? não achei ${h.email}`); continue; }
  const m = ms.find((x) => x.user_id === pessoa.id);
  if (!m) { console.log(`  ? ${pessoa.full_name} sem vínculo na empresa`); continue; }

  const atual = m.manager_id ? nome.get(m.manager_id) : "(sem gestor)";
  if (m.manager_id === h.gestor.id) {
    console.log(`  [ok    ] ${h.rotulo.padEnd(34)} já está correto`);
    continue;
  }
  console.log(`  [ajusta] ${h.rotulo.padEnd(34)} de: ${atual}`);
  if (apply) {
    const { error } = await db
      .from("company_memberships")
      .update({ manager_id: h.gestor.id })
      .eq("id", m.id);
    if (error) console.log(`     ERRO: ${error.message}`);
    else alterados++;
  }
}

if (!apply) {
  console.log(`\nPara aplicar: node scripts/fix-tech-hierarchy.mjs --apply`);
} else {
  console.log(`\n  vínculos atualizados: ${alterados}`);
}
