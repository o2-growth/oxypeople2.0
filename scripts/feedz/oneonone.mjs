/**
 * Reuniões 1:1.
 *
 * O relatório traz uma linha por reunião com os dois lados lado a lado: tópicos
 * e anotações do líder e do liderado em colunas separadas. Aqui isso vira:
 *   one_on_ones        — a reunião (líder, liderado, data, status)
 *   one_on_one_topics  — os tópicos de cada lado, um por linha
 *   one_on_one_notes   — anotações privadas, com visibility='private' para
 *                        preservar que eram privadas na origem
 *
 * Tópicos vêm concatenados em texto livre; a origem separa por quebra de linha.
 */
import { COMPANY_ID, sheet, parseDate, insertBatched, section } from "./lib.mjs";

const ARQ = "1on1-report-20260729.xlsx";

const STATUS = {
  "Realizado": "completed",
  "Realizada": "completed",
  "Concluído": "completed",
  "Atrasado": "scheduled",
  "Atrasada": "scheduled",
  "Agendado": "scheduled",
  "Agendada": "scheduled",
  "Cancelado": "canceled",
  "Cancelada": "canceled",
};

/** Tópicos e ações são listas: uma linha = um item. */
function splitTopics(v) {
  if (!v) return [];
  return v.toString().split(/\r?\n/).map((s) => s.trim()).filter((s) => s.length > 1);
}

/**
 * Anotação é texto corrido, não lista. Quebrar por linha fragmentaria um
 * registro de 30 linhas em 30 anotações soltas e destruiria o contexto —
 * então vai inteira, como foi escrita.
 */
function wholeNote(v) {
  const s = (v ?? "").toString().trim();
  return s.length > 1 ? [s] : [];
}

export async function importOneOnOnes(db, idx, { apply }) {
  section("4. REUNIÕES 1:1");
  const rows = sheet(ARQ);

  const reunioes = [];
  const pendentes = [];   // {feedz_ref, topicos:[{content, autor}], notas:[{content, autor}]}
  let semPessoa = 0;

  for (const r of rows) {
    const lider = idx.resolve(r["E-mail (Líder/Participante)"], r["Líder/Participante"]);
    const liderado = idx.resolve(r["Email (Líderado/Participante)"], r["Liderado/Participante"]);
    if (!lider || !liderado) { semPessoa++; continue; }

    const agendada = parseDate(r["Data agendada"]);
    const realizada = parseDate(r["Data realizada"]);
    const statusOrigem = (r["Status"] ?? "").toString().trim();
    const status = STATUS[statusOrigem] ?? "scheduled";

    // chave natural: os dois participantes + o horário agendado
    const ref = `${lider.id}|${liderado.id}|${agendada ?? ""}`;

    reunioes.push({
      company_id: COMPANY_ID,
      leader_id: lider.id,
      member_id: liderado.id,
      scheduled_at: agendada ?? realizada ?? new Date().toISOString(),
      duration_minutes: 30,
      status,
      recurrence: "none",
      completed_at: status === "completed" ? realizada ?? agendada : null,
      source: "feedz",
      imported_at: new Date().toISOString(),
      feedz_ref: ref,
    });

    pendentes.push({
      ref,
      topicos: [
        ...splitTopics(r["Tópicos (Líder/Participante)"]).map((t) => ({ content: t, autor: lider.id })),
        ...splitTopics(r["Tópicos (Liderado/Participante)"]).map((t) => ({ content: t, autor: liderado.id })),
      ],
      // visibility respeita o dono da anotação: no Feedz cada lado só via a
      // própria, e a RLS daqui aplica a mesma regra por 'private_leader' /
      // 'private_member'. Usar 'shared' vazaria anotação privada de gestor.
      notas: [
        ...wholeNote(r["Anotações Privadas (Líder/Participante)"]).map((t) => ({
          content: t, autor: lider.id, visibility: "private_leader",
        })),
        ...wholeNote(r["Anotações Privadas (Liderado/Participante)"]).map((t) => ({
          content: t, autor: liderado.id, visibility: "private_member",
        })),
      ],
      acoes: [
        ...splitTopics(r["Ações Ativas (Líder/Participante)"]).map((t) => ({ content: t, autor: lider.id, done: false })),
        ...splitTopics(r["Ações Concluídas (Líder/Participante)"]).map((t) => ({ content: t, autor: lider.id, done: true })),
        ...splitTopics(r["Ações Ativas (Liderado/Participante)"]).map((t) => ({ content: t, autor: liderado.id, done: false })),
        ...splitTopics(r["Ações Concluídas (Liderado/Participante)"]).map((t) => ({ content: t, autor: liderado.id, done: true })),
      ],
    });
  }

  const totTopicos = pendentes.reduce((a, p) => a + p.topicos.length, 0);
  const totNotas = pendentes.reduce((a, p) => a + p.notas.length, 0);
  const totAcoes = pendentes.reduce((a, p) => a + p.acoes.length, 0);

  console.log(`  linhas no backup:   ${rows.length}`);
  console.log(`  reuniões a importar: ${reunioes.length}   (sem pessoa: ${semPessoa})`);
  console.log(`    por status: ${JSON.stringify(reunioes.reduce((a, m) => { a[m.status] = (a[m.status] ?? 0) + 1; return a; }, {}))}`);
  console.log(`  tópicos:  ${totTopicos}`);
  console.log(`  anotações privadas: ${totNotas}`);
  console.log(`  ações:    ${totAcoes}`);

  if (!apply) return { reunioes: reunioes.length, topicos: totTopicos, notas: totNotas };

  const r1 = await insertBatched(db, "one_on_ones", reunioes, { onConflict: "company_id,feedz_ref" });
  console.log(`\n  reuniões gravadas: ${r1.inseridos}${r1.erros.length ? ` | ERROS: ${JSON.stringify(r1.erros.slice(0, 2))}` : ""}`);

  // recupera os ids recém-criados para pendurar tópicos/notas
  const { data: criadas } = await db
    .from("one_on_ones")
    .select("id,feedz_ref")
    .eq("company_id", COMPANY_ID)
    .not("feedz_ref", "is", null);
  const idPorRef = new Map((criadas ?? []).map((m) => [m.feedz_ref, m.id]));

  // Tópicos e anotações não têm feedz_ref (são filhos da reunião, que já tem).
  // Sem uma checagem explícita, reexecutar duplicaria cada um — foi o que
  // aconteceu na primeira importação. Carrega o que já existe e pula repetido.
  const oids = [...idPorRef.values()];
  const { data: topicosExistentes } = await db
    .from("one_on_one_topics").select("one_on_one_id,content,created_by").in("one_on_one_id", oids);
  const { data: notasExistentes } = await db
    .from("one_on_one_notes").select("one_on_one_id,content,author_id").in("one_on_one_id", oids);
  const jaTemTopico = new Set((topicosExistentes ?? []).map((t) => `${t.one_on_one_id}|${t.content}|${t.created_by}`));
  const jaTemNota = new Set((notasExistentes ?? []).map((n) => `${n.one_on_one_id}|${n.content}|${n.author_id}`));

  const topicos = [];
  const notas = [];
  for (const p of pendentes) {
    const oid = idPorRef.get(p.ref);
    if (!oid) continue;
    let ordem = 0;
    const addTopico = (content, autor, done) => {
      if (jaTemTopico.has(`${oid}|${content}|${autor}`)) return;
      jaTemTopico.add(`${oid}|${content}|${autor}`);
      topicos.push({ one_on_one_id: oid, content, created_by: autor, done, order_index: ordem++ });
    };
    for (const t of p.topicos) addTopico(t.content, t.autor, false);
    for (const a of p.acoes) addTopico(`[ação] ${a.content}`, a.autor, a.done);

    for (const n of p.notas) {
      const chave = `${oid}|${n.content}|${n.autor}`;
      if (jaTemNota.has(chave)) continue;
      jaTemNota.add(chave);
      notas.push({ one_on_one_id: oid, content: n.content, author_id: n.autor, visibility: n.visibility });
    }
  }

  const r2 = await insertBatched(db, "one_on_one_topics", topicos);
  console.log(`  tópicos gravados: ${r2.inseridos}${r2.erros.length ? ` | ERROS: ${JSON.stringify(r2.erros.slice(0, 2))}` : ""}`);
  const r3 = await insertBatched(db, "one_on_one_notes", notas);
  console.log(`  anotações gravadas: ${r3.inseridos}${r3.erros.length ? ` | ERROS: ${JSON.stringify(r3.erros.slice(0, 2))}` : ""}`);

  return { reunioes: r1.inseridos, topicos: r2.inseridos, notas: r3.inseridos };
}
