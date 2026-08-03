/**
 * Aniversários, celebrações e reconhecimentos.
 *
 * Aniversários: o backup tem data de nascimento dos 162 (o banco tinha 15).
 * Viram company_events recorrentes, que é como o calendário da plataforma lê.
 * O ano do evento é normalizado para o ano corrente — o que importa é dia/mês.
 *
 * Celebrações: eram posts no feed do Feedz ("hoje é aniversário de @fulano").
 * Viram company_events do tipo 'celebration' preservando texto e data.
 *
 * Reconhecimentos: o extrato de moedas tem 13.8k lançamentos, a maioria
 * automática (login diário etc.). Só entram os que têm outra pessoa envolvida
 * e mensagem — reconhecimento de verdade, não crédito de sistema.
 */
import { COMPANY_ID, sheet, parseDate, parseDateOnly, insertBatched, section } from "./lib.mjs";

export async function importBirthdays(db, idx, { apply }) {
  section("5. ANIVERSÁRIOS");

  const { data: users } = await db
    .from("users")
    .select("id,full_name,birth_date")
    .not("birth_date", "is", null);

  // Reconsulta os vínculos: a etapa de pessoas roda antes e cria ~98 memberships.
  // Usar o índice montado no início do script deixaria de fora justamente quem
  // acabou de entrar.
  const { data: vinculos } = await db
    .from("company_memberships")
    .select("user_id")
    .eq("company_id", COMPANY_ID);
  const membros = new Set((vinculos ?? []).map((m) => m.user_id));
  const anoAtual = new Date().getUTCFullYear();

  const eventos = [];
  for (const u of users ?? []) {
    if (!membros.has(u.id)) continue;          // só quem tem vínculo com a empresa
    const d = new Date(u.birth_date);
    if (isNaN(d)) continue;
    const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dia = String(d.getUTCDate()).padStart(2, "0");
    eventos.push({
      company_id: COMPANY_ID,
      title: `Aniversário de ${u.full_name ?? "colaborador"}`,
      description: null,
      event_type: "birthday",
      event_date: `${anoAtual}-${mes}-${dia}`,
      is_recurring: true,
      color: "#f59e0b",
      created_by: null,
      metadata: { user_id: u.id, day: dia, month: mes },
      source: "feedz",
      imported_at: new Date().toISOString(),
      feedz_ref: `birthday|${u.id}`,
    });
  }

  console.log(`  users com data de nascimento e vínculo: ${eventos.length}`);
  if (!apply) return { aniversarios: eventos.length };

  // created_by é obrigatório em company_events: usa um admin da empresa
  const { data: admin } = await db
    .from("company_memberships").select("user_id")
    .eq("company_id", COMPANY_ID).eq("status", "active").limit(1).maybeSingle();
  for (const e of eventos) e.created_by = admin?.user_id ?? null;

  const r = await insertBatched(db, "company_events", eventos, { onConflict: "company_id,feedz_ref" });
  console.log(`  eventos de aniversário criados: ${r.inseridos}${r.erros.length ? ` | ERROS: ${JSON.stringify(r.erros.slice(0, 2))}` : ""}`);
  return { aniversarios: r.inseridos };
}

export async function importCelebrations(db, idx, { apply }) {
  section("6. CELEBRAÇÕES");
  const rows = sheet("Celebrações-20262907.xlsx");

  const { data: admin } = await db
    .from("company_memberships").select("user_id")
    .eq("company_id", COMPANY_ID).eq("status", "active").limit(1).maybeSingle();

  const eventos = [];
  for (const c of rows) {
    const msg = (c["Mensagem"] ?? "").toString().trim();
    if (!msg) continue;
    const autor = idx.resolve(null, c["Colaborador enviou"]);
    const quando = parseDate(c["Data"]);
    const codigo = (c["Código"] ?? "").toString().trim();

    eventos.push({
      company_id: COMPANY_ID,
      title: msg.split("\n")[0].slice(0, 120),
      description: msg,
      event_type: "celebration",
      event_date: quando ? quando.slice(0, 10) : "2026-01-01",
      is_recurring: false,
      color: "#22c55e",
      created_by: autor?.id ?? admin?.user_id ?? null,
      metadata: {
        autor: c["Colaborador enviou"] ?? null,
        cargo_autor: c["Cargo do colaborador que enviou"] ?? null,
        destinatarios: c["Colaboradores que receberam"] ?? null,
        curtidas: c["Quantidade de curtidas"] ?? 0,
        comentarios: c["Quantidade de comentários"] ?? 0,
      },
      source: "feedz",
      imported_at: new Date().toISOString(),
      feedz_ref: `celebration|${codigo}`,
    });
  }

  console.log(`  linhas no backup: ${rows.length}`);
  console.log(`  celebrações a importar: ${eventos.length}`);
  if (!apply) return { celebracoes: eventos.length };

  const r = await insertBatched(db, "company_events", eventos, { onConflict: "company_id,feedz_ref" });
  console.log(`  gravadas: ${r.inseridos}${r.erros.length ? ` | ERROS: ${JSON.stringify(r.erros.slice(0, 2))}` : ""}`);
  return { celebracoes: r.inseridos };
}

export async function importRecognitions(db, idx, { apply }) {
  section("7. RECONHECIMENTOS (moedas)");
  const rows = sheet("Feedzcoins-20263007.xlsx");

  // ruído do extrato: crédito automático, sem outra pessoa envolvida
  const AUTOMATICO = /login|acesso|cadastro|check-?in|resgate|ajuste|bônus autom|humor/i;

  const recs = [];
  let ignorados = 0;
  for (const [i, m] of rows.entries()) {
    const desc = (m["Descrição"] ?? "").toString().trim();
    const moedas = Number(m["Moedas"] ?? 0);
    const quem = idx.resolve(m["E-Mail"] ?? m["E-mail"], m["Colaborador"]);

    if (!quem || !desc || moedas <= 0 || AUTOMATICO.test(desc)) { ignorados++; continue; }

    recs.push({
      company_id: COMPANY_ID,
      from_user_id: quem.id,      // a origem não separa quem deu de quem recebeu
      to_user_id: quem.id,
      message: desc.slice(0, 500),
      points: Math.round(moedas),
      badge_id: null,
      source: "feedz",
      imported_at: new Date().toISOString(),
      feedz_ref: `coin|${i}|${parseDateOnly(m["Data"]) ?? ""}`,
    });
  }

  console.log(`  lançamentos no extrato: ${rows.length}`);
  console.log(`  reconhecimentos a importar: ${recs.length}`);
  console.log(`  ignorados (automáticos/sem pessoa): ${ignorados}`);
  if (!apply) return { reconhecimentos: recs.length };

  const r = await insertBatched(db, "recognitions", recs, { onConflict: "company_id,feedz_ref", chunk: 500 });
  console.log(`  gravados: ${r.inseridos}${r.erros.length ? ` | ERROS: ${JSON.stringify(r.erros.slice(0, 2))}` : ""}`);
  return { reconhecimentos: r.inseridos };
}
