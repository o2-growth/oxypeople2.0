#!/usr/bin/env node
/**
 * Importa o histórico do Feedz para o Oxy People.
 *
 * O Feedz foi desativado; o backup exportado em 29-30/07/2026 é a única cópia
 * desses dados. Este script é idempotente: reimportar não duplica, porque cada
 * artefato carrega a chave da origem (feedz_ref / feedz_id) com índice único.
 *
 *   node scripts/import-feedz.mjs                      # DRY-RUN (padrão)
 *   node scripts/import-feedz.mjs --apply              # efetiva
 *   node scripts/import-feedz.mjs --only=people,perf   # só algumas etapas
 *
 * Etapas: people, turnover, perf, oneonone, birthdays, celebrations,
 *         recognitions, feedbacks, mood, enps, okrs
 *
 * Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local e o backup
 * descompactado (FEEDZ_BACKUP_DIR aponta para outra pasta se preciso).
 */
import { loadEnv, buildPeopleIndex, parseArgs, banner } from "./feedz/lib.mjs";
import { importPeople, importTurnover } from "./feedz/people.mjs";
import { importPerformance } from "./feedz/performance.mjs";
import { importOneOnOnes } from "./feedz/oneonone.mjs";
import { importBirthdays, importCelebrations, importRecognitions } from "./feedz/celebrations.mjs";
import { importFeedbacks, importMood, importEnps } from "./feedz/engagement.mjs";
import { importOKRs } from "./feedz/okrs.mjs";

const { apply, only } = parseArgs(process.argv);
const run = (etapa) => !only || only.includes(etapa);

const db = loadEnv();
banner(apply);

const idx = await buildPeopleIndex(db);
console.log(`índice: ${idx.users.length} users, ${idx.memberships.length} memberships nesta empresa`);

const resumo = {};

if (run("people")) resumo.people = await importPeople(db, idx, { apply });
if (run("turnover")) resumo.turnover = await importTurnover(db, idx, { apply });
if (run("perf")) resumo.perf = await importPerformance(db, idx, { apply });
if (run("oneonone")) resumo.oneonone = await importOneOnOnes(db, idx, { apply });
if (run("birthdays")) resumo.birthdays = await importBirthdays(db, idx, { apply });
if (run("celebrations")) resumo.celebrations = await importCelebrations(db, idx, { apply });
if (run("recognitions")) resumo.recognitions = await importRecognitions(db, idx, { apply });
if (run("feedbacks")) resumo.feedbacks = await importFeedbacks(db, idx, { apply });
if (run("mood")) resumo.mood = await importMood(db, idx, { apply });
if (run("enps")) resumo.enps = await importEnps(db, idx, { apply });
if (run("okrs")) resumo.okrs = await importOKRs(db, idx, { apply });

console.log(`\n${"=".repeat(72)}`);
console.log(apply ? "IMPORTAÇÃO CONCLUÍDA" : "DRY-RUN CONCLUÍDO — nada foi escrito");
console.log("=".repeat(72));
for (const [k, v] of Object.entries(resumo)) {
  console.log(`  ${k.padEnd(14)} ${JSON.stringify(v)}`);
}
if (!apply) console.log("\nPara efetivar: node scripts/import-feedz.mjs --apply");
