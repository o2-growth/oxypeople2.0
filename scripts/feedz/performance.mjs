/**
 * Avaliações de desempenho.
 *
 * O relatório do Feedz é achatado: uma linha por colaborador com o nome da
 * avaliação, o período e a nota final. Não vem o detalhe por competência nem
 * quem avaliou — só o resultado. Então cada "Nome da avaliação de desempenho"
 * distinto vira um performance_cycle, e cada linha vira uma
 * performance_evaluation fechada com overall_score.
 *
 * O avaliador é registrado como o próprio avaliado (auto-referência): o dado
 * não existe na origem e a coluna é obrigatória. `source='feedz'` deixa claro
 * que é histórico importado, não avaliação conduzida aqui.
 */
import { COMPANY_ID, sheet, parseDateOnly, insertBatched, section } from "./lib.mjs";

const ARQ = "RelatorioAvaliacaoDesempenho - 2026-07-30.xlsx";

export async function importPerformance(db, idx, { apply }) {
  section("3. AVALIAÇÕES DE DESEMPENHO");
  const rows = sheet(ARQ);

  // 1. ciclos distintos (nome + período)
  // "Sem avaliação de desempenho" é o placeholder do Feedz para quem nunca foi
  // avaliado — 44 das 52 linhas. Não é ciclo nem avaliação; fica de fora.
  const VAZIO = /^sem avalia[çc][ãa]o/i;
  const ciclos = new Map();
  let semAvaliacao = 0;
  for (const r of rows) {
    const nome = (r["Nome da avaliação de desempenho"] ?? "").toString().trim();
    if (!nome) continue;
    if (VAZIO.test(nome)) { semAvaliacao++; continue; }
    const ini = parseDateOnly(r["Período inicial avaliado da última avaliação de desempenho"]);
    const fim = parseDateOnly(r["Período final avaliado da última avaliação de desempenho"]);
    const chave = `${nome}|${ini ?? ""}|${fim ?? ""}`;
    if (!ciclos.has(chave)) ciclos.set(chave, { nome, ini, fim, linhas: [] });
    ciclos.get(chave).linhas.push(r);
  }

  console.log(`  linhas no backup: ${rows.length}`);
  console.log(`  nunca avaliados (placeholder do Feedz, ignorados): ${semAvaliacao}`);
  console.log(`  ciclos distintos: ${ciclos.size}`);
  for (const c of ciclos.values()) {
    console.log(`     "${c.nome}"  ${c.ini ?? "?"} → ${c.fim ?? "?"}  (${c.linhas.length} avaliações)`);
  }

  // quem não casou (só entre as linhas que têm avaliação de verdade)
  const comAvaliacao = [...ciclos.values()].flatMap((c) => c.linhas);
  const semUser = [];
  for (const r of comAvaliacao) {
    if (!idx.resolve(null, r["Nome do colaborador"])) semUser.push(r["Nome do colaborador"]);
  }
  if (semUser.length) console.log(`  sem pessoa correspondente: ${semUser.length} → ${semUser.slice(0, 5).join(", ")}`);

  if (!apply) return { ciclos: ciclos.size, avaliacoes: comAvaliacao.length - semUser.length, semAvaliacao };

  // 2. grava ciclos (reusa se já existir um com mesmo nome e período)
  const { data: existentes } = await db
    .from("performance_cycles")
    .select("id,name,start_date,end_date")
    .eq("company_id", COMPANY_ID);
  const idPorChave = new Map((existentes ?? []).map((c) => [`${c.name}|${c.start_date ?? ""}|${c.end_date ?? ""}`, c.id]));

  // created_by precisa de um user válido: usa o primeiro admin encontrado
  const { data: admin } = await db
    .from("company_memberships")
    .select("user_id")
    .eq("company_id", COMPANY_ID)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const createdBy = admin?.user_id ?? null;

  let ciclosCriados = 0;
  for (const [chave, c] of ciclos) {
    if (idPorChave.has(chave)) continue;
    const { data, error } = await db
      .from("performance_cycles")
      .insert({
        company_id: COMPANY_ID,
        name: c.nome,
        description: "Importado do Feedz",
        start_date: c.ini ?? "2025-01-01",
        end_date: c.fim ?? "2025-12-31",
        status: "completed",
        type: "self",
        created_by: createdBy,
        target_all: true,
        source: "feedz",
        imported_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) { console.log(`     ERRO no ciclo "${c.nome}": ${error.message}`); continue; }
    idPorChave.set(chave, data.id);
    ciclosCriados++;
  }
  console.log(`\n  ciclos criados: ${ciclosCriados}`);

  // 3. avaliações
  const avaliacoes = [];
  for (const [chave, c] of ciclos) {
    const cycleId = idPorChave.get(chave);
    if (!cycleId) continue;
    for (const r of c.linhas) {
      const nome = (r["Nome do colaborador"] ?? "").toString().trim();
      const user = idx.resolve(null, nome);
      if (!user) continue;
      const nota = r["Nota final da última avaliação de desempenho"];
      avaliacoes.push({
        company_id: COMPANY_ID,
        cycle_id: cycleId,
        evaluated_id: user.id,
        evaluator_id: user.id,      // origem não informa quem avaliou
        relationship: "self",
        relationship_type: "self",
        status: "completed",
        overall_score: nota == null ? null : Number(nota),
        due_date: c.fim ?? "2025-12-31",
        completed_at: c.fim ? `${c.fim}T12:00:00Z` : null,
        source: "feedz",
        imported_at: new Date().toISOString(),
        feedz_ref: `${c.nome}|${nome}`,
      });
    }
  }

  const r = await insertBatched(db, "performance_evaluations", avaliacoes, { onConflict: "company_id,feedz_ref" });
  console.log(`  avaliações gravadas: ${r.inseridos}${r.erros.length ? ` | ERROS: ${JSON.stringify(r.erros.slice(0, 2))}` : ""}`);
  return { ciclos: ciclosCriados, avaliacoes: r.inseridos };
}
