/**
 * Feedbacks, humor e e-NPS.
 *
 * Feedbacks: no Feedz eram enviados espontaneamente; aqui a tabela é
 * feedback_requests (pedido → resposta). O histórico entra como pedido já
 * respondido: requester = quem escreveu, subject/respondent = quem recebeu.
 *
 * Humor: vai para mood_entries, criada para isso. Guarda person_name além do
 * user_id, então registro de quem já saiu não se perde.
 *
 * e-NPS: 12 planilhas, uma por rodada, sem identificação do respondente (é
 * anônimo por design). Cada arquivo vira um nps_survey com suas respostas.
 */
import { readdirSync } from "node:fs";
import { COMPANY_ID, BACKUP_DIR, sheet, parseDate, insertBatched, section } from "./lib.mjs";

export async function importFeedbacks(db, idx, { apply }) {
  section("8. FEEDBACKS");
  const rows = sheet("Feedbacks-20263007.xlsx");

  const pedidos = [];
  let semPessoa = 0;
  for (const [i, f] of rows.entries()) {
    const de = idx.resolve(null, f["De"]);
    const para = idx.resolve(null, f["Para"]);
    const texto = (f["Feedback"] ?? "").toString().trim();
    if (!de || !para || !texto) { semPessoa++; continue; }

    const anonimo = /sim/i.test((f["Anônimo"] ?? "").toString());
    const quando = parseDate(f["Data"]);

    // No Feedz o feedback era espontâneo: "De" escreveu sobre "Para". O modelo
    // daqui é pedido→resposta e exige requester <> respondent (a menos que o
    // requester seja o próprio sujeito). Então quem recebeu entra como
    // requester e sujeito, e quem escreveu como respondent — o texto fica
    // atribuído a quem de fato o escreveu.
    pedidos.push({
      company_id: COMPANY_ID,
      requester_id: para.id,
      respondent_id: de.id,
      subject_user_id: para.id,
      question: (f["Template"] ?? "Feedback").toString().trim().slice(0, 300),
      response: texto.slice(0, 4000),
      status: "answered",
      // Feedback anônimo no Feedz não revelava o autor ao destinatário. Aqui o
      // equivalente mais próximo é 'private_requester' — o texto não é exposto
      // ao sujeito. Os demais entram como 'shared_with_subject', que era o
      // comportamento padrão da origem.
      visibility: anonimo ? "private_requester" : "shared_with_subject",
      competency_tags: f["Avaliação"] ? [String(f["Avaliação"])] : [],
      answered_at: quando,
      due_date: quando ? quando.slice(0, 10) : null,
      source: "feedz",
      imported_at: new Date().toISOString(),
      feedz_ref: `feedback|${i}|${quando ?? ""}`,
    });
  }

  console.log(`  linhas no backup: ${rows.length}`);
  console.log(`  a importar: ${pedidos.length}   (sem pessoa nas duas pontas: ${semPessoa})`);
  if (!apply) return { feedbacks: pedidos.length };

  const r = await insertBatched(db, "feedback_requests", pedidos, { onConflict: "company_id,feedz_ref" });
  console.log(`  gravados: ${r.inseridos}${r.erros.length ? ` | ERROS: ${JSON.stringify(r.erros.slice(0, 2))}` : ""}`);
  return { feedbacks: r.inseridos };
}

export async function importMood(db, idx, { apply }) {
  section("9. HISTÓRICO DE HUMOR");
  const rows = sheet("HistoricoHumor_20263007.xlsx");

  const entradas = [];
  const vistos = new Set();
  for (const h of rows) {
    const nome = (h["Nome"] ?? "").toString().trim();
    if (!nome) continue;
    const quando = parseDate(h["Data"]);
    if (!quando) continue;

    // a chave natural da tabela é (empresa, nome, instante) — evita colisão no lote
    const chave = `${nome}|${quando}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const user = idx.resolve(null, nome);
    const media = h["Media"];

    entradas.push({
      company_id: COMPANY_ID,
      user_id: user?.id ?? null,
      person_name: nome,
      score: media == null || media === "" ? null : Number(media),
      mood_label: h["Humor Atual"] ? String(h["Humor Atual"]).trim() : null,
      description: h["Descrição"] ? String(h["Descrição"]).trim() : null,
      department: h["Departamento"] ? String(h["Departamento"]).trim() : null,
      unit: h["Unidade"] ? String(h["Unidade"]).trim() : null,
      recorded_at: quando,
      source: "feedz",
      imported_at: new Date().toISOString(),
    });
  }

  const semUser = entradas.filter((e) => !e.user_id).length;
  console.log(`  linhas no backup: ${rows.length}`);
  console.log(`  a importar: ${entradas.length}   (sem user vinculado, preserva nome: ${semUser})`);
  if (!apply) return { humor: entradas.length };

  const r = await insertBatched(db, "mood_entries", entradas, { onConflict: "company_id,person_name,recorded_at" });
  console.log(`  gravados: ${r.inseridos}${r.erros.length ? ` | ERROS: ${JSON.stringify(r.erros.slice(0, 2))}` : ""}`);
  return { humor: r.inseridos };
}

export async function importEnps(db, idx, { apply }) {
  section("10. e-NPS");

  const dir = `${BACKUP_DIR}/e-NPS`;
  const arquivos = readdirSync(dir).filter((f) => f.endsWith(".xlsx")).sort();

  const { data: admin } = await db
    .from("company_memberships").select("user_id")
    .eq("company_id", COMPANY_ID).eq("status", "active").limit(1).maybeSingle();

  let totalRespostas = 0;
  const rodadas = [];
  for (const arq of arquivos) {
    const rows = sheet(`e-NPS/${arq}`);
    const datas = rows.map((r) => parseDate(r["Data"])).filter(Boolean).sort();
    rodadas.push({ arq, rows, inicio: datas[0] ?? null, fim: datas[datas.length - 1] ?? null });
    totalRespostas += rows.length;
  }

  console.log(`  rodadas (arquivos): ${arquivos.length}`);
  console.log(`  respostas somadas:  ${totalRespostas}`);
  for (const r of rodadas) {
    console.log(`     ${r.arq.padEnd(28)} ${String(r.rows.length).padStart(3)} respostas  ${(r.inicio ?? "").slice(0, 10)} → ${(r.fim ?? "").slice(0, 10)}`);
  }
  if (!apply) return { rodadas: arquivos.length, respostas: totalRespostas };

  let surveys = 0;
  let respostas = 0;
  for (const r of rodadas) {
    const nome = `e-NPS ${(r.inicio ?? "").slice(0, 10) || r.arq.replace(".xlsx", "")}`;
    const ref = `enps|${r.arq}`;

    // Vai para pulse_surveys, não nps_surveys: nps_responses exige user_id e o
    // e-NPS é anônimo na origem. pulse_responses aceita nulo, já tem
    // question_type 'enps_0_10' e é onde o e-NPS ativo roda hoje — histórico e
    // corrente acabam no mesmo lugar.
    const { data: survey, error } = await db
      .from("pulse_surveys")
      .upsert(
        {
          company_id: COMPANY_ID,
          name: nome,
          question: "Em uma escala de 0 a 10, o quanto você recomendaria a O2 como lugar para trabalhar?",
          question_type: "enps_0_10",
          anonymous: true,
          active: false,                 // rodada encerrada; não entra no dispatch
          frequency: "monthly",
          send_hour_utc: 12,
          target_all: true,
          created_by: admin?.user_id ?? null,
          last_dispatched_at: r.fim ?? null,
          source: "feedz",
          imported_at: new Date().toISOString(),
          feedz_ref: ref,
        },
        { onConflict: "company_id,feedz_ref" },
      )
      .select("id")
      .single();
    if (error) { console.log(`     ERRO na rodada ${r.arq}: ${error.message}`); continue; }
    surveys++;

    // Resposta anônima não tem chave natural, e pulse_responses não tem coluna
    // de origem para pendurar um feedz_ref. Sem esta checagem, reexecutar
    // duplicaria as 180 respostas — foi o que aconteceu na primeira rodada.
    // O timestamp volta do banco como "+00:00" e é gerado aqui como ".000Z":
    // comparar as strings cruas nunca casa. Normaliza para epoch nos dois lados.
    const chaveResposta = (score, comment, quando) =>
      `${Number(score)}|${comment ?? ""}|${new Date(quando).getTime()}`;

    const { data: jaExistem } = await db
      .from("pulse_responses")
      .select("score,comment,created_at")
      .eq("pulse_survey_id", survey.id);
    const vistas = new Set((jaExistem ?? []).map((x) => chaveResposta(x.score, x.comment, x.created_at)));

    const linhas = [];
    for (const x of r.rows) {
      if (x["Nota"] == null || x["Nota"] === "") continue;
      const quando = parseDate(x["Data"]) ?? new Date().toISOString();
      const comment = x["Reposta"] ? String(x["Reposta"]).slice(0, 2000) : null;
      const chave = chaveResposta(x["Nota"], comment, quando);
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      linhas.push({
        pulse_survey_id: survey.id,
        score: Number(x["Nota"]),
        comment,
        user_id: null,                       // anônimo por design
        period_start: quando.slice(0, 10),
        created_at: quando,
      });
    }
    const ins = await insertBatched(db, "pulse_responses", linhas);
    respostas += ins.inseridos;
    if (ins.erros.length) console.log(`     ERROS em ${r.arq}: ${JSON.stringify(ins.erros.slice(0, 1))}`);
  }

  console.log(`\n  pesquisas criadas: ${surveys}  |  respostas gravadas: ${respostas}`);
  return { rodadas: surveys, respostas };
}
