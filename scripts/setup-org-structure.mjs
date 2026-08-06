#!/usr/bin/env node
/**
 * Estrutura de áreas, times e squads da O2.
 *
 * Definida pelo Andrey em 06/08/2026. A organização anterior era plana: 6
 * departamentos e 26 times no mesmo nível, com squads (Inbound, células de
 * CFO) indistinguíveis de times.
 *
 * Reaproveita o que já existe casando pelo nome — renomear um time preserva
 * seus membros; recriar do zero os perderia.
 *
 *   node scripts/setup-org-structure.mjs            # DRY-RUN
 *   node scripts/setup-org-structure.mjs --apply    # aplica
 */
import { loadEnv, COMPANY_ID, norm } from "./feedz/lib.mjs";

const apply = process.argv.includes("--apply");
const db = loadEnv();

/**
 * `de` é o nome atual no banco, quando o time já existe com outro nome.
 * `status: "building"` = anunciado, ainda sem operação.
 */
const ESTRUTURA = [
  {
    area: "Revenue", cor: "#8b5cf6",
    times: [
      {
        nome: "Time de Marketing", de: "Marketing",
        squads: [
          { nome: "Squad de Aquisição & Performance" },
          { nome: "Squad de Comunicação" },
        ],
      },
      {
        nome: "Time Comercial",
        squads: [
          { nome: "Squad Inbound", de: "Inbound" },
          { nome: "Squad Outbound", de: "Outbound" },
          { nome: "Squad Eventos", de: "Eventos", status: "building" },
          { nome: "Squad Franchising", de: "Franchising", status: "building" },
        ],
      },
    ],
  },
  {
    area: "Operação", cor: "#0b6b4a",
    times: [
      { nome: "Time Setup", de: "Setup" },
      { nome: "Time CAAS", de: "CAAS", squadsDeCFO: true },
      { nome: "Time Serviços Especiais", de: "Serviços Especiais" },
      { nome: "Time CX", de: "CX" },
      { nome: "Time BPO", de: "BPO" },
      { nome: "Time Coordenador Financeiro" },
      { nome: "Time Crédito", de: "Crédito" },
    ],
  },
  {
    area: "Backoffice", cor: "#0ea5e9",
    times: [
      { nome: "Time Financeiro", de: "Financeiro" },
      { nome: "Time Administrativo", de: "Administrativo" },
      { nome: "Time de Pessoas e Cultura", de: "Pessoas e Cultura" },
      { nome: "Time Jurídico e Tributário", de: "Jurídico e Tributário" },
    ],
  },
  {
    area: "Tecnologia", cor: "#f59e0b",
    times: [
      { nome: "Time de Infraestrutura" },
      { nome: "Time de Desenvolvimento", de: "Engenharia" },
      { nome: "Time de IA", de: "IA" },
    ],
  },
  {
    area: "Diretoria", cor: "#64748b",
    times: [{ nome: "Time Gestão", de: "Gestão" }],
  },
];

/** Quem vai para qual squad de Marketing, pelo cargo. */
const SQUADS_MARKETING = [
  { cargo: /captação|performance|tráfego/i, squad: "Squad de Aquisição & Performance" },
  { cargo: /designer|social media|comunica/i, squad: "Squad de Comunicação" },
];

/** Time sem lugar na nova estrutura e sem ninguém dentro. */
const REMOVER_SE_VAZIO = ["Expansão"];

const { data: depsAtuais } = await db.from("departments").select("id,name").eq("company_id", COMPANY_ID);
const { data: timesAtuais } = await db.from("teams").select("id,name,department,department_id,parent_team_id,status").eq("company_id", COMPANY_ID);
const { data: membros } = await db.from("team_members").select("id,team_id,user_id,role");
const { data: pessoas } = await db.from("company_memberships").select("user_id,position").eq("company_id", COMPANY_ID);
const { data: users } = await db.from("users").select("id,full_name");

const nome = new Map(users.map((u) => [u.id, u.full_name ?? "?"]));
const cargoDe = new Map(pessoas.map((p) => [p.user_id, p.position ?? ""]));
const acharTime = (n) => timesAtuais.find((t) => norm(t.name) === norm(n));
const contar = (id) => membros.filter((m) => m.team_id === id).length;

console.log("=".repeat(76));
console.log(apply ? "ESTRUTURA — APPLY" : "ESTRUTURA — DRY-RUN (não escreve)");
console.log("=".repeat(76));

const acoes = [];
for (const bloco of ESTRUTURA) {
  const areaExiste = depsAtuais.find((d) => norm(d.name) === norm(bloco.area));
  console.log(`\n▸ ÁREA ${bloco.area.toUpperCase()}${areaExiste ? "" : "  (criar)"}`);

  for (const time of bloco.times) {
    const existente = time.de ? acharTime(time.de) : acharTime(time.nome);
    const n = existente ? contar(existente.id) : 0;
    const marca = !existente ? "criar " : time.de && norm(time.de) !== norm(time.nome) ? "renomear" : "manter";
    console.log(`   ${time.nome.padEnd(34)} [${marca.padEnd(8)}] ${n} membro(s)${existente?.name && marca === "renomear" ? `  (era "${existente.name}")` : ""}`);

    for (const sq of time.squads ?? []) {
      const sqExiste = sq.de ? acharTime(sq.de) : acharTime(sq.nome);
      const sn = sqExiste ? contar(sqExiste.id) : 0;
      const sm = !sqExiste ? "criar " : sq.de && norm(sq.de) !== norm(sq.nome) ? "renomear" : "manter";
      console.log(`      └─ ${sq.nome.padEnd(31)} [${sm.padEnd(8)}] ${sn}${sq.status === "building" ? "  em construção" : ""}`);
    }
    if (time.squadsDeCFO) {
      const celulas = timesAtuais.filter((t) => t.name.startsWith("CFO "));
      for (const c of celulas) {
        console.log(`      └─ ${("Squad " + c.name.replace(/^CFO /, "")).slice(0, 31).padEnd(31)} [vira squad] ${contar(c.id)}`);
      }
    }
  }
}

const orfaos = timesAtuais.filter((t) => {
  if (t.name.startsWith("CFO ")) return false;
  const naEstrutura = ESTRUTURA.some((b) =>
    b.times.some((tm) =>
      norm(tm.de ?? tm.nome) === norm(t.name) ||
      (tm.squads ?? []).some((s) => norm(s.de ?? s.nome) === norm(t.name))));
  return !naEstrutura;
});
if (orfaos.length) {
  console.log(`\n▸ FORA DA ESTRUTURA (${orfaos.length}):`);
  for (const o of orfaos) {
    const n = contar(o.id);
    const acao = REMOVER_SE_VAZIO.includes(o.name) && n === 0 ? "remover (vazio)" : "manter como está";
    console.log(`   ${o.name.padEnd(34)} ${n} membro(s)  → ${acao}`);
  }
}

if (!apply) {
  console.log(`\nPara aplicar: node scripts/setup-org-structure.mjs --apply`);
  process.exit(0);
}

// ---------------- aplica ----------------
const areaId = new Map();
for (const bloco of ESTRUTURA) {
  let d = depsAtuais.find((x) => norm(x.name) === norm(bloco.area));
  if (!d) {
    const { data, error } = await db.from("departments")
      .insert({ company_id: COMPANY_ID, name: bloco.area, color: bloco.cor })
      .select("id,name").single();
    if (error) { console.log(`ERRO área ${bloco.area}: ${error.message}`); continue; }
    d = data;
  }
  areaId.set(bloco.area, d.id);
}
console.log(`\náreas: ${areaId.size}`);

let criados = 0, renomeados = 0, squadsLigados = 0;

async function garantirTime({ nome: nomeNovo, de, status = "active" }, area, parentId = null, ordem = 0) {
  const atual = de ? acharTime(de) : acharTime(nomeNovo);
  const payload = {
    name: nomeNovo,
    department: area,
    department_id: areaId.get(area) ?? null,
    parent_team_id: parentId,
    status,
    order_index: ordem,
  };
  if (atual) {
    const { error } = await db.from("teams").update(payload).eq("id", atual.id);
    if (error) { console.log(`ERRO ${nomeNovo}: ${error.message}`); return null; }
    if (norm(atual.name) !== norm(nomeNovo)) renomeados++;
    atual.name = nomeNovo;
    return atual.id;
  }
  const { data, error } = await db.from("teams")
    .insert({ company_id: COMPANY_ID, ...payload }).select("id,name").single();
  if (error) { console.log(`ERRO ${nomeNovo}: ${error.message}`); return null; }
  timesAtuais.push({ ...data, parent_team_id: parentId });
  criados++;
  return data.id;
}

for (const [bi, bloco] of ESTRUTURA.entries()) {
  for (const [ti, time] of bloco.times.entries()) {
    const timeId = await garantirTime(time, bloco.area, null, bi * 100 + ti);
    if (!timeId) continue;

    for (const [si, sq] of (time.squads ?? []).entries()) {
      const sqId = await garantirTime(sq, bloco.area, timeId, si);
      if (sqId) squadsLigados++;
    }

    if (time.squadsDeCFO) {
      const celulas = timesAtuais.filter((t) => t.name.startsWith("CFO "));
      for (const [ci, c] of celulas.entries()) {
        const { error } = await db.from("teams").update({
          name: `Squad ${c.name.replace(/^CFO /, "")}`,
          department: bloco.area,
          department_id: areaId.get(bloco.area) ?? null,
          parent_team_id: timeId,
          order_index: ci,
        }).eq("id", c.id);
        if (error) console.log(`ERRO célula ${c.name}: ${error.message}`);
        else { c.name = `Squad ${c.name.replace(/^CFO /, "")}`; squadsLigados++; }
      }
    }
  }
}
console.log(`times criados: ${criados} | renomeados: ${renomeados} | squads ligados: ${squadsLigados}`);

// distribui o Marketing pelos squads, pelo cargo
const timeMkt = acharTime("Time de Marketing");
if (timeMkt) {
  const doMkt = membros.filter((m) => m.team_id === timeMkt.id);
  let movidos = 0;
  for (const m of doMkt) {
    const cargo = cargoDe.get(m.user_id) ?? "";
    const regra = SQUADS_MARKETING.find((r) => r.cargo.test(cargo));
    if (!regra) continue;                       // head fica no time
    const squad = acharTime(regra.squad);
    if (!squad) continue;
    await db.from("team_members").delete().eq("id", m.id);
    const { error } = await db.from("team_members").insert({ team_id: squad.id, user_id: m.user_id, role: "member" });
    if (error) console.log(`ERRO ao mover ${nome.get(m.user_id)}: ${error.message}`);
    else { console.log(`   ${nome.get(m.user_id)} → ${regra.squad}`); movidos++; }
  }
  console.log(`marketing distribuído: ${movidos}`);
}

// remove time vazio que ficou sem lugar
for (const n of REMOVER_SE_VAZIO) {
  const t = acharTime(n);
  if (t && contar(t.id) === 0) {
    await db.from("teams").delete().eq("id", t.id);
    console.log(`removido (vazio): ${n}`);
  }
}
