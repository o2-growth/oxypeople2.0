#!/usr/bin/env node
/**
 * Confere se pessoas, times e hierarquia contam a mesma história.
 *
 * Três fontes descrevem onde alguém trabalha: a área na ficha da pessoa
 * (`company_memberships.department_id`), o time em que ela está
 * (`team_members` → `teams.department`) e quem a lidera (`manager_id`). Nada
 * obriga as três a concordarem, e é fácil mover uma pessoa numa tela e deixar
 * as outras duas desatualizadas.
 *
 * Só lê — não corrige nada.
 *
 *   node scripts/audit-org-consistency.mjs
 */
import { loadEnv, COMPANY_ID, norm } from "./feedz/lib.mjs";

const db = loadEnv();

const [{ data: pessoas }, { data: users }, { data: times }, { data: vinculos }, { data: areas }] =
  await Promise.all([
    db.from("company_memberships").select("user_id,position,department_id,manager_id,status").eq("company_id", COMPANY_ID),
    db.from("users").select("id,full_name"),
    db.from("teams").select("id,name,department,department_id,parent_team_id,status").eq("company_id", COMPANY_ID),
    db.from("team_members").select("team_id,user_id,role"),
    db.from("departments").select("id,name").eq("company_id", COMPANY_ID),
  ]);

const nome = new Map(users.map((u) => [u.id, u.full_name ?? "sem nome"]));
const areaNome = new Map(areas.map((a) => [a.id, a.name]));
const timePorId = new Map(times.map((t) => [t.id, t]));
const ativos = pessoas.filter((p) => p.status === "active");

const timesDe = (uid) => vinculos.filter((v) => v.user_id === uid).map((v) => timePorId.get(v.team_id)).filter(Boolean);
/** A área de um squad é a do time-pai. */
const areaDoTime = (t) => (t.parent_team_id ? timePorId.get(t.parent_team_id)?.department : t.department) ?? null;

const linha = (t) => "─".repeat(t);
const bloco = (titulo, itens, comoMostrar = (x) => x) => {
  console.log(`\n${titulo}  (${itens.length})`);
  console.log(linha(74));
  if (!itens.length) { console.log("   nada a apontar"); return; }
  for (const i of itens.slice(0, 25)) console.log(`   ${comoMostrar(i)}`);
  if (itens.length > 25) console.log(`   … e mais ${itens.length - 25}`);
};

console.log("=".repeat(74));
console.log(`CONSISTÊNCIA DA ESTRUTURA — ${ativos.length} pessoas ativas, ${times.length} times/squads`);
console.log("=".repeat(74));

// 1. sem time
const semTime = ativos.filter((p) => timesDe(p.user_id).length === 0);
bloco("▸ ATIVOS SEM NENHUM TIME", semTime, (p) =>
  `${nome.get(p.user_id).slice(0, 34).padEnd(36)} ${(p.position ?? "—").slice(0, 30)}`);

// 2. sem gestor
const semGestor = ativos.filter((p) => !p.manager_id);
bloco("▸ ATIVOS SEM GESTOR", semGestor, (p) =>
  `${nome.get(p.user_id).slice(0, 34).padEnd(36)} ${(p.position ?? "—").slice(0, 30)}`);

// 3. gestor inativo ou fora da empresa
const idsAtivos = new Set(ativos.map((p) => p.user_id));
const gestorSumiu = ativos.filter((p) => p.manager_id && !idsAtivos.has(p.manager_id));
bloco("▸ GESTOR INATIVO OU INEXISTENTE", gestorSumiu, (p) =>
  `${nome.get(p.user_id).slice(0, 34).padEnd(36)} → ${nome.get(p.manager_id) ?? "id órfão"}`);

// 4. times sem líder
const semLider = times.filter((t) => {
  const membros = vinculos.filter((v) => v.team_id === t.id);
  return membros.length > 0 && !membros.some((m) => m.role === "lead" || m.role === "leader");
});
bloco("▸ TIMES COM GENTE E SEM LÍDER", semLider, (t) =>
  `${t.name.slice(0, 38).padEnd(40)} ${vinculos.filter((v) => v.team_id === t.id).length} membro(s)`);

// 5. times vazios
const vazios = times.filter((t) =>
  !vinculos.some((v) => v.team_id === t.id) && !times.some((s) => s.parent_team_id === t.id));
bloco("▸ TIMES VAZIOS", vazios, (t) =>
  `${t.name.slice(0, 38).padEnd(40)} ${t.status === "building" ? "em construção (esperado)" : "sem ninguém"}`);

// 6. área da ficha ≠ área do time
const areaDivergente = [];
for (const p of ativos) {
  const daFicha = p.department_id ? areaNome.get(p.department_id) : null;
  if (!daFicha) continue;
  const doTime = timesDe(p.user_id).map(areaDoTime).filter(Boolean);
  if (doTime.length && !doTime.some((a) => norm(a) === norm(daFicha))) {
    areaDivergente.push({ p, daFicha, doTime: [...new Set(doTime)].join(", ") });
  }
}
bloco("▸ ÁREA DA FICHA DIFERENTE DA ÁREA DO TIME", areaDivergente, (x) =>
  `${nome.get(x.p.user_id).slice(0, 28).padEnd(30)} ficha: ${x.daFicha.padEnd(14)} time: ${x.doTime}`);

// 7. lidera gente mas não está em time nenhum com eles
const lideram = new Set(ativos.filter((p) => p.manager_id).map((p) => p.manager_id));
const gestorForaDoTime = [];
for (const gid of lideram) {
  const liderados = ativos.filter((p) => p.manager_id === gid).map((p) => p.user_id);
  const meusTimes = new Set(timesDe(gid).map((t) => t.id));
  const juntos = liderados.filter((l) => timesDe(l).some((t) => meusTimes.has(t.id)));
  if (meusTimes.size && juntos.length === 0) {
    gestorForaDoTime.push({ gid, liderados: liderados.length });
  }
}
bloco("▸ GESTOR SEM NENHUM LIDERADO NO MESMO TIME", gestorForaDoTime, (x) =>
  `${(nome.get(x.gid) ?? "?").slice(0, 34).padEnd(36)} ${x.liderados} liderado(s)`);

// 8. pessoa em mais de um time — informativo, não é erro
const emVarios = ativos
  .map((p) => ({ p, ts: timesDe(p.user_id) }))
  .filter((x) => x.ts.length > 1);
bloco("▸ EM MAIS DE UM TIME (esperado quando acumula frentes)", emVarios, (x) =>
  `${nome.get(x.p.user_id).slice(0, 28).padEnd(30)} ${x.ts.map((t) => t.name).join(" + ")}`);

console.log("\n" + "=".repeat(74));
const problemas =
  semTime.length + semGestor.length + gestorSumiu.length + semLider.length + areaDivergente.length;
console.log(`${problemas} ponto(s) para revisar · ${emVarios.length} acúmulo(s) intencional(is)`);
