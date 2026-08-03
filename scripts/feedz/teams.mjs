/**
 * Vincula cada pessoa ativa ao seu time.
 *
 * Os 19 times e os 5 departamentos já existiam no banco, mas team_members
 * estava vazio — ninguém pertencia a time nenhum. A coluna "Grupos" do backup
 * do Feedz, que seria a fonte natural, veio vazia para todos os 52 ativos, então
 * o vínculo é derivado de departamento + cargo.
 *
 * Regras confirmadas pelo Andrey em 03/08/2026:
 *   Comercial inteiro  → Inbound
 *   Growth inteiro     → Marketing (junto com o departamento Marketing)
 *   Operação/FP&A      → pendente: 14 analistas cujo gestor não mapeia para
 *                        nenhum dos 4 times de Operação (9 gestores distintos)
 */
import { COMPANY_ID, norm, insertBatched, section } from "./lib.mjs";

/**
 * Resolve o time a partir de departamento e cargo.
 * Devolve null quando não há regra — a pessoa fica sem time em vez de cair
 * num palpite.
 */
export function resolverTime(departamento, cargo) {
  const dep = (departamento ?? "").trim();
  const c = (cargo ?? "").trim().toLowerCase();
  const cargoTem = (...termos) => termos.some((t) => c.includes(t));

  // O cargo manda sobre o departamento nestes casos: a pessoa está lotada em
  // Operação mas o trabalho é de outro time.
  if (cargoTem("customer success", "relacionamento com cliente")) return "CX";
  if (cargoTem("crédito")) return "Crédito";
  if (cargoTem("head de ia", "integrações ai", "automaç")) return "IA";

  if (dep === "Tecnologia") return "Engenharia";
  if (dep === "Marketing" || dep === "Growth") return "Marketing";
  if (dep === "Comercial") return "Inbound";
  if (dep === "O2 TAX" || dep === "TAX") return "Jurídico e Tributário";
  if (dep === "Administrativo") return "Administrativo";
  if (dep === "CEO" || dep === "Diretoria") return "Gestão";
  if (dep === "CFO As a Service") return "CAAS";

  if (dep === "Operação") {
    if (cargoTem("cfo as a service")) return "CAAS";
    // Projetos e assessoria de negócios não é o BPO recorrente: é demanda
    // pontual, que é o que o time Serviços Especiais atende.
    if (cargoTem("projetos", "assessoria")) return "Serviços Especiais";
    if (cargoTem("bpo")) return "BPO";
    // FP&A e Financeiro: 13 pessoas sem regra. O backup não traz o time e os
    // gestores diretos são 9 para 4 times possíveis, então não há como derivar.
    return null;
  }

  return null;
}

export async function importTeams(db, idx, { apply }) {
  section("12. VÍNCULO DE PESSOAS AOS TIMES");

  const { data: times } = await db.from("teams").select("id,name,department").eq("company_id", COMPANY_ID);
  const timePorNome = new Map((times ?? []).map((t) => [norm(t.name), t]));

  const { data: membros } = await db
    .from("company_memberships")
    .select("user_id,department,position")
    .eq("company_id", COMPANY_ID)
    .eq("status", "active");

  const { data: vinculos } = await db.from("team_members").select("team_id,user_id");
  const jaVinculado = new Set((vinculos ?? []).map((v) => `${v.team_id}|${v.user_id}`));
  const jaTemTime = new Set((vinculos ?? []).map((v) => v.user_id));

  const novos = [];
  const semRegra = [];
  const porTime = new Map();

  for (const m of membros ?? []) {
    if (jaTemTime.has(m.user_id)) continue;

    const nomeTime = resolverTime(m.department, m.position);
    if (!nomeTime) { semRegra.push(m); continue; }

    const time = timePorNome.get(norm(nomeTime));
    if (!time) {
      console.log(`  aviso: time "${nomeTime}" não existe no banco`);
      continue;
    }
    if (jaVinculado.has(`${time.id}|${m.user_id}`)) continue;
    jaVinculado.add(`${time.id}|${m.user_id}`);

    novos.push({ team_id: time.id, user_id: m.user_id, role: "member" });
    porTime.set(time.name, (porTime.get(time.name) ?? 0) + 1);
  }

  console.log(`  times cadastrados:   ${times?.length ?? 0}`);
  console.log(`  pessoas ativas:      ${membros?.length ?? 0}`);
  console.log(`  já tinham time:      ${jaTemTime.size}`);
  console.log(`  a vincular:          ${novos.length}`);
  console.log(`  sem regra definida:  ${semRegra.length}`);

  if (porTime.size) {
    console.log(`\n  distribuição:`);
    for (const [nome, n] of [...porTime].sort((a, b) => b[1] - a[1])) {
      console.log(`     ${nome.padEnd(24)} ${n}`);
    }
  }
  if (semRegra.length) {
    console.log(`\n  sem time (aguardando definição):`);
    for (const m of semRegra.slice(0, 20)) {
      console.log(`     ${(m.department ?? "-").padEnd(14)} ${m.position ?? "-"}`);
    }
  }

  if (!apply) return { vinculos: novos.length, semRegra: semRegra.length };

  const r = await insertBatched(db, "team_members", novos);
  console.log(`\n  vínculos criados: ${r.inseridos}${r.erros.length ? ` | ERROS: ${JSON.stringify(r.erros.slice(0, 2))}` : ""}`);
  return { vinculos: r.inseridos, semRegra: semRegra.length };
}
