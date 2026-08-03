/**
 * Extrato de moedas do Feedz → gamification_points.
 *
 * O extrato tem 13.8k lançamentos e é log de gamificação, não reconhecimento
 * entre pessoas: cada linha registra que alguém ganhou pontos por uma ação
 * ("Mudou foto do perfil", "Respondeu uma eNPS"). A primeira importação o
 * mandou para `recognitions` e a página de Reconhecimento passou a exibir
 * pessoas parabenizando a si mesmas por trocar a foto.
 *
 * Dedup: a origem não tem id, e o mesmo tipo de evento se repete no mesmo dia
 * com o mesmo valor — a data vem sem hora. Então a chave inclui a descrição e
 * um contador de ocorrência, senão dois eventos legítimos do mesmo dia
 * colapsariam num só (foi o que aconteceu: 261 "Celebração enviada" viraram 11).
 */
import { COMPANY_ID, sheet, parseDate, insertBatched, section } from "./lib.mjs";

const ARQ = "Feedzcoins-20263007.xlsx";

/** Crédito de sistema que não representa ação da pessoa. */
const IGNORAR = /login|acesso di[áa]rio|cadastro|resgate|ajuste|b[ôo]nus autom/i;

/** Descrição do extrato → action_type. */
const ACTION = {
  "Celebração enviada": "celebration_sent",
  "Celebração recebida": "celebration_received",
  "Respondeu uma eNPS": "enps_answered",
  "Respondeu uma Pesquisa Rápida": "pulse_answered",
  "Mudou foto do perfil": "profile_photo_updated",
  "Feedback enviado": "feedback_sent",
  "Feedback recebido": "feedback_received",
  "Criou um Plano de Desenvolvimento": "pdi_created",
};

export function actionType(descricao) {
  return ACTION[(descricao ?? "").trim()] ?? "other";
}

export async function importGamification(db, idx, { apply }) {
  section("13. PONTOS DE GAMIFICAÇÃO (extrato de moedas)");
  const rows = sheet(ARQ);

  const candidatos = [];
  let ignorados = 0;
  for (const m of rows) {
    const desc = (m["Descrição"] ?? "").toString().trim();
    const moedas = Number(m["Moedas"] ?? 0);
    const quem = idx.resolve(m["E-Mail"] ?? m["E-mail"], m["Colaborador"]);
    const quando = parseDate(m["Data"]);
    if (!quem || !desc || !quando || moedas <= 0 || IGNORAR.test(desc)) { ignorados++; continue; }
    candidatos.push({ userId: quem.id, desc, moedas, quando });
  }

  // A chave natural é (pessoa, instante, valor, descrição) — mas ela se repete
  // legitimamente: a mesma pessoa envia duas celebrações no mesmo dia e a data
  // da origem não tem hora. Então guardamos a contagem por chave em vez de um
  // conjunto de chaves únicas; a dedup compara quantidades, não presença.
  const contagem = new Map();
  const linhas = [];
  for (const c of candidatos) {
    const chave = `${c.userId}|${new Date(c.quando).getTime()}|${c.moedas}|${c.desc}`;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    linhas.push({
      _chave: chave,
      company_id: COMPANY_ID,
      user_id: c.userId,
      points: Math.round(c.moedas),
      action_type: actionType(c.desc),
      description: c.desc,
      created_at: c.quando,
    });
  }

  const porTipo = {};
  for (const l of linhas) porTipo[l.description] = (porTipo[l.description] ?? 0) + 1;

  console.log(`  lançamentos no extrato: ${rows.length}`);
  console.log(`  ignorados (sistema/sem pessoa): ${ignorados}`);
  console.log(`  a importar: ${linhas.length}`);
  for (const [d, n] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${String(n).padStart(4)}x  ${d}`);
  }

  if (!apply) return { pontos: linhas.length };

  // PostgREST devolve no máximo 1000 linhas por requisição. Sem paginar, a
  // dedup enxergaria só as primeiras mil e reimportaria todo o resto a cada
  // execução — foi o que aconteceu na primeira tentativa.
  const existentes = [];
  const PAGINA = 1000;
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error: e } = await db
      .from("gamification_points")
      .select("user_id,points,description,created_at")
      .eq("company_id", COMPANY_ID)
      .order("created_at", { ascending: true })
      .range(inicio, inicio + PAGINA - 1);
    if (e) throw new Error(`gamification_points (leitura): ${e.message}`);
    existentes.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGINA) break;
  }

  const jaTem = new Map();
  for (const g of existentes ?? []) {
    const chave = `${g.user_id}|${new Date(g.created_at).getTime()}|${g.points}|${g.description}`;
    jaTem.set(chave, (jaTem.get(chave) ?? 0) + 1);
  }

  // Insere só a diferença: se a origem tem 3 do mesmo evento e o banco já tem 1,
  // faltam 2. Comparar presença em vez de quantidade perderia repetições.
  const restante = new Map(jaTem);
  const novas = [];
  for (const l of linhas) {
    const sobra = restante.get(l._chave) ?? 0;
    if (sobra > 0) { restante.set(l._chave, sobra - 1); continue; }
    const { _chave, ...linha } = l;
    novas.push(linha);
  }

  const r = await insertBatched(db, "gamification_points", novas, { chunk: 300 });
  console.log(`\n  inseridos: ${r.inseridos}  (já existiam: ${linhas.length - novas.length})${r.erros.length ? ` | ERROS: ${JSON.stringify(r.erros.slice(0, 2))}` : ""}`);
  return { pontos: r.inseridos };
}
