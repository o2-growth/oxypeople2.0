#!/usr/bin/env node
/**
 * Corrige a importação das moedas do Feedz.
 *
 * O extrato de Feedzcoins foi importado como `recognitions`, partindo da ideia
 * de que "lançamento com mensagem e valor positivo" era reconhecimento entre
 * pessoas. Estava errado: o extrato é log de gamificação. As 520 linhas têm
 * from_user_id igual a to_user_id e mensagens que são eventos do sistema
 * ("Mudou foto do perfil", "Respondeu uma eNPS", "Celebração enviada"), então
 * a página de Reconhecimento passou a exibir 520 cartões de pessoas
 * "reconhecendo" a si mesmas por trocar a foto.
 *
 * O destino certo é gamification_points, que existe exatamente para isso.
 *
 *   node scripts/fix-feedz-recognitions.mjs            # DRY-RUN
 *   node scripts/fix-feedz-recognitions.mjs --apply    # move e limpa
 */
import { loadEnv, COMPANY_ID } from "./feedz/lib.mjs";

const apply = process.argv.includes("--apply");
const db = loadEnv();

/** Mensagem do extrato → action_type da gamificação. */
const ACTION = {
  "Celebração enviada": "celebration_sent",
  "Celebração recebida": "celebration_received",
  "Respondeu uma eNPS": "enps_answered",
  "Respondeu uma Pesquisa Rápida": "pulse_answered",
  "Mudou foto do perfil": "profile_photo_updated",
  "Feedback enviado": "feedback_sent",
  "Criou um Plano de Desenvolvimento": "pdi_created",
};

const { data: recs, error } = await db
  .from("recognitions")
  .select("id,from_user_id,to_user_id,message,points,created_at,source")
  .eq("company_id", COMPANY_ID)
  .eq("source", "feedz");
if (error) { console.error("erro ao ler:", error.message); process.exit(1); }

// Reconhecimento de verdade tem duas pessoas distintas. Se algum registro do
// Feedz tiver isso, fica onde está.
const gamificacao = recs.filter((r) => r.from_user_id === r.to_user_id);
const legitimos = recs.filter((r) => r.from_user_id !== r.to_user_id);

console.log("=".repeat(66));
console.log(apply ? "CORREÇÃO — MODO APPLY" : "CORREÇÃO — DRY-RUN (não escreve)");
console.log("=".repeat(66));
console.log(`  recognitions com source=feedz:     ${recs.length}`);
console.log(`  são log de gamificação (mover):    ${gamificacao.length}`);
console.log(`  são reconhecimento real (manter):  ${legitimos.length}`);

const porTipo = {};
for (const r of gamificacao) porTipo[r.message] = (porTipo[r.message] ?? 0) + 1;
console.log(`\n  por tipo de evento:`);
for (const [msg, n] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) {
  console.log(`     ${String(n).padStart(4)}x  ${msg.padEnd(34)} → ${ACTION[msg] ?? "other"}`);
}

if (!apply) {
  console.log(`\nPara efetivar: node scripts/fix-feedz-recognitions.mjs --apply`);
  process.exit(0);
}

// Não duplica se o script rodar duas vezes.
const { data: jaMigrados } = await db
  .from("gamification_points")
  .select("user_id,created_at,points")
  .eq("company_id", COMPANY_ID);
const vistos = new Set(
  (jaMigrados ?? []).map((g) => `${g.user_id}|${new Date(g.created_at).getTime()}|${g.points}`),
);

const linhas = [];
for (const r of gamificacao) {
  const chave = `${r.to_user_id}|${new Date(r.created_at).getTime()}|${r.points}`;
  if (vistos.has(chave)) continue;
  vistos.add(chave);
  linhas.push({
    company_id: COMPANY_ID,
    user_id: r.to_user_id,
    points: r.points,
    action_type: ACTION[r.message] ?? "other",
    description: r.message,
    created_at: r.created_at,
  });
}

let inseridos = 0;
for (let i = 0; i < linhas.length; i += 200) {
  const { error: e } = await db.from("gamification_points").insert(linhas.slice(i, i + 200));
  if (e) { console.error(`  ERRO ao inserir: ${e.message}`); process.exit(1); }
  inseridos += Math.min(200, linhas.length - i);
}
console.log(`\n  gamification_points inseridos: ${inseridos}`);

// Só remove depois de a migração ter dado certo.
let removidos = 0;
const ids = gamificacao.map((r) => r.id);
for (let i = 0; i < ids.length; i += 100) {
  const { error: e } = await db.from("recognitions").delete().in("id", ids.slice(i, i + 100));
  if (e) console.error(`  ERRO ao remover: ${e.message}`);
  else removidos += Math.min(100, ids.length - i);
}
console.log(`  recognitions removidos: ${removidos}`);

const { count: sobrou } = await db
  .from("recognitions").select("*", { count: "exact", head: true }).eq("company_id", COMPANY_ID);
const { count: pontos } = await db
  .from("gamification_points").select("*", { count: "exact", head: true }).eq("company_id", COMPANY_ID);
console.log(`\n  recognitions agora: ${sobrou}  |  gamification_points: ${pontos}`);
