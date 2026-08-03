/**
 * OKRs históricos.
 *
 * O backup traz três trimestres — Q3/2025, Q4/2025 e Q1/2026 — num relatório
 * achatado: uma linha por resultado-chave, repetindo os dados do objetivo, e
 * mais uma linha por plano de ação. A reconstrução agrupa por "Código do
 * objetivo" e "Código do Resultado Chave", que são estáveis na origem e viram
 * o feedz_ref de cada registro.
 *
 * Os períodos trimestrais já existem no banco (Q1/2025…Q4/2026), então o
 * mapeamento é por data de início/fim — nenhum período novo é criado.
 */
import { COMPANY_ID, sheet, norm, parseDate, parseDateOnly, insertBatched, section } from "./lib.mjs";

// O relatório de 157 linhas é o mais completo (3 períodos, 39 objetivos);
// o de 89 linhas é um recorte com objetivos que não aparecem no primeiro.
const ARQUIVOS = [
  "Gestão de Objetivos/Objetivos_Metas_e_Planos_de_acao_30_07_2026_10_43_40.xlsx",
  "Gestão de Objetivos/Objetivos_Metas_e_Planos_de_acao_30_07_2026_10_43_52.xlsx",
];

/** "Tipo de meta" do Feedz → (kr_type, direction, unit) do nosso schema. */
function tipoMeta(tipo) {
  switch ((tipo ?? "").toString().trim()) {
    case "Porcentagem": return { kr_type: "percent", direction: "up", unit: "%" };
    case "Financeira": return { kr_type: "currency", direction: "up", unit: "R$" };
    case "Número": return { kr_type: "numeric", direction: "up", unit: null };
    case "Manter acima de": return { kr_type: "numeric", direction: "up", unit: null };
    case "Manter abaixo de": return { kr_type: "numeric", direction: "down", unit: null };
    case "Atingido/Não atingido (0%/100%)": return { kr_type: "binary", direction: "up", unit: null };
    default: return { kr_type: "numeric", direction: "up", unit: null };
  }
}

/** Status do objetivo a partir do % atingido; o Feedz não exporta status. */
function statusPorAtingido(pct) {
  if (pct >= 100) return "completed";
  if (pct >= 70) return "active";
  return "risk";
}

/** Segunda-feira da semana da data — `actions.week_bucket` é NOT NULL sem default. */
function segundaFeiraDe(valor) {
  const base = valor ? new Date(valor) : new Date();
  const d = Number.isNaN(base.getTime()) ? new Date() : base;
  const dia = d.getUTCDay() || 7;               // domingo (0) conta como 7
  const segunda = new Date(d);
  segunda.setUTCDate(d.getUTCDate() - dia + 1);
  return segunda.toISOString().slice(0, 10);
}

const num = (v) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

export async function importOKRs(db, idx, { apply }) {
  section("11. OKRs HISTÓRICOS");

  // ---- 1. lê e consolida as duas planilhas ----
  const linhas = [];
  for (const arq of ARQUIVOS) {
    try {
      linhas.push(...sheet(arq));
    } catch (e) {
      console.log(`  aviso: não li ${arq} (${e.message})`);
    }
  }

  const objetivos = new Map();   // código -> { dados, krs: Map, planos: [] }
  for (const r of linhas) {
    const codigo = (r["Código do objetivo"] ?? "").toString().trim();
    const titulo = (r["Objetivo"] ?? "").toString().trim();
    if (!codigo || !titulo) continue;

    if (!objetivos.has(codigo)) {
      objetivos.set(codigo, {
        codigo,
        titulo,
        pai: (r["Nome do objetivo Pai"] ?? "").toString().trim() || null,
        codigoPai: (r["Código do objetivo Pai"] ?? "").toString().trim() || null,
        responsavelEmail: r["E-mail do responsável pelo objetivo"],
        responsavelNome: r["Responsável pelo objetivo"],
        area: (r["Pessoal/Área do Objetivo"] ?? "").toString().trim() || null,
        inicio: parseDateOnly(r["Data Inicio"] ?? r["Data Início"]),
        fim: parseDateOnly(r["Data Fim"]),
        krs: new Map(),
        planos: [],
      });
    }
    const obj = objetivos.get(codigo);

    const krCod = (r["Código do Resultado Chave"] ?? "").toString().trim();
    const krTitulo = (r["Resultado Chave"] ?? "").toString().trim();
    if (krCod && krTitulo && !obj.krs.has(krCod)) {
      obj.krs.set(krCod, {
        codigo: krCod,
        titulo: krTitulo,
        descricao: (r["Descrição do Resultado Chave"] ?? "").toString().trim() || null,
        tipo: r["Tipo de meta"],
        peso: r["Peso configurado no resultado chave"],
        inicial: num(r["Valor inicial"]) ?? 0,
        meta: num(r["Meta"]) ?? 0,
        atual: num(r["Valor do Último Check-in no Resultado Chave"]),
        checkinData: parseDate(r["Data do Último Check-in no Resultado Chave"]),
        checkinDesc: (r["Descrição do Último Check-in no Resultado Chave"] ?? "").toString().trim() || null,
        atingido: num(r["Atingido (%)"]) ?? 0,
        responsavelEmail: r["E-mail do responsável pelo Resultado Chave"],
        responsavelNome: r["Responsável pelo Resultado Chave"],
      });
    }

    const plano = (r["Plano de Ação"] ?? "").toString().trim();
    if (plano) {
      obj.planos.push({
        titulo: plano,
        responsavelNome: r["Responsável"],
        criadoEm: parseDate(r["Data de criação"]),
        prazo: parseDateOnly(r["Prazo de conclusão"]),
        status: (r["Status"] ?? "").toString().trim() || null,
        concluidoEm: parseDate(r["Data de Conclusão"]),
      });
    }
  }

  const totalKrs = [...objetivos.values()].reduce((a, o) => a + o.krs.size, 0);
  const totalPlanos = [...objetivos.values()].reduce((a, o) => a + o.planos.length, 0);

  // ---- 2. mapeia períodos existentes por data ----
  const { data: periodos } = await db
    .from("periods").select("id,name,start_date,end_date").eq("company_id", COMPANY_ID);
  const periodoPorData = new Map((periodos ?? []).map((p) => [`${p.start_date}|${p.end_date}`, p]));

  const porPeriodo = new Map();
  const semPeriodo = [];
  for (const o of objetivos.values()) {
    const chave = `${o.inicio}|${o.fim}`;
    const p = periodoPorData.get(chave);
    if (!p) { semPeriodo.push(o); continue; }
    o.periodId = p.id;
    o.periodName = p.name;
    if (!porPeriodo.has(p.name)) porPeriodo.set(p.name, []);
    porPeriodo.get(p.name).push(o);
  }

  console.log(`  linhas lidas:       ${linhas.length}`);
  console.log(`  objetivos:          ${objetivos.size}`);
  console.log(`  resultados-chave:   ${totalKrs}`);
  console.log(`  planos de ação:     ${totalPlanos}`);
  console.log(`\n  mapeamento por período (períodos já existem no banco):`);
  for (const [nome, lista] of [...porPeriodo].sort()) {
    const krs = lista.reduce((a, o) => a + o.krs.size, 0);
    console.log(`     ${nome.padEnd(16)} ${String(lista.length).padStart(3)} objetivos, ${String(krs).padStart(3)} KRs`);
  }
  if (semPeriodo.length) {
    console.log(`  SEM período correspondente: ${semPeriodo.length}`);
    for (const o of semPeriodo.slice(0, 3)) console.log(`     ${o.inicio} → ${o.fim}  "${o.titulo.slice(0, 40)}"`);
  }

  // ---- 3. o que já existe (dedup por período + título) ----
  const { data: existentes } = await db
    .from("objectives").select("id,title,period_id,type").eq("company_id", COMPANY_ID);
  const jaExiste = new Map((existentes ?? []).map((o) => [`${o.period_id}|${norm(o.title)}`, o.id]));
  const tipoPorId = new Map((existentes ?? []).map((o) => [o.id, o.type]));

  const aCriar = [...objetivos.values()].filter(
    (o) => o.periodId && !jaExiste.has(`${o.periodId}|${norm(o.titulo)}`),
  );
  console.log(`\n  objetivos já presentes no banco: ${objetivos.size - semPeriodo.length - aCriar.length}`);
  console.log(`  objetivos a criar:              ${aCriar.length}`);

  if (!apply) {
    return { objetivos: aCriar.length, krs: aCriar.reduce((a, o) => a + o.krs.size, 0), planos: totalPlanos };
  }

  // ---- 4. grava ----
  const { data: admin } = await db
    .from("company_memberships").select("user_id")
    .eq("company_id", COMPANY_ID).eq("status", "active").limit(1).maybeSingle();
  const fallbackOwner = admin?.user_id;

  // Objetivo já existente também precisa entrar no mapa: os filhos (KRs,
  // check-ins, planos) são gravados numa etapa posterior e uma execução
  // interrompida no meio deixaria o objetivo sem eles para sempre.
  const idPorCodigo = new Map();
  let pulados = 0;
  for (const o of objetivos.values()) {
    if (!o.periodId) continue;
    const existente = jaExiste.get(`${o.periodId}|${norm(o.titulo)}`);
    if (!existente) continue;
    // Objetivo que já existia e não é 'operational' foi criado pelo time, não
    // por esta importação. O trigger recusa KR nele, e mudar o tipo alheio
    // reclassificaria trabalho de outra pessoa — então fica de fora.
    if (tipoPorId.get(existente) !== "operational") { pulados++; continue; }
    idPorCodigo.set(o.codigo, existente);
  }
  if (pulados) {
    console.log(`  objetivos existentes ignorados (tipo não-operacional): ${pulados}`);
  }

  let criados = 0;
  for (const o of aCriar) {
    const dono = idx.resolve(o.responsavelEmail, o.responsavelNome);
    const atingidoMedio = o.krs.size
      ? [...o.krs.values()].reduce((a, k) => a + (k.atingido ?? 0), 0) / o.krs.size
      : 0;

    const { data, error } = await db
      .from("objectives")
      .insert({
        company_id: COMPANY_ID,
        title: o.titulo,
        description: o.pai ? `Contribui para: ${o.pai}` : null,
        period_id: o.periodId,
        owner_id: dono?.id ?? fallbackOwner,
        assignee_id: dono?.id ?? null,
        created_by: fallbackOwner,
        department: o.area,
        // Um trigger do banco recusa key result em objetivo que não seja
        // 'operational'. Todo objetivo do Feedz vem com KRs, então é esse o tipo.
        type: "operational",
        commitment_type: "committed",
        visibility: "company",
        status: statusPorAtingido(atingidoMedio),
        progress: Math.min(100, Math.round(atingidoMedio)),
        due_date: o.fim,
        is_active: false,          // histórico: não entra nos painéis do ciclo corrente
        tags: ["feedz", "histórico"],
      })
      .select("id")
      .single();
    if (error) { console.log(`     ERRO no objetivo "${o.titulo.slice(0, 40)}": ${error.message}`); continue; }
    idPorCodigo.set(o.codigo, data.id);
    criados++;
  }
  console.log(`\n  objetivos criados: ${criados}`);

  // key results — para todo objetivo mapeado que ainda não os tenha
  const objetivosComId = [...objetivos.values()].filter((o) => idPorCodigo.has(o.codigo));

  const { data: krsExistentes } = await db
    .from("key_results").select("objective_id,title").in("objective_id", [...idPorCodigo.values()]);
  const jaTemKr = new Set((krsExistentes ?? []).map((k) => `${k.objective_id}|${norm(k.title)}`));

  const krs = [];
  for (const o of objetivosComId) {
    const oid = idPorCodigo.get(o.codigo);
    if (!oid) continue;
    for (const k of o.krs.values()) {
      if (jaTemKr.has(`${oid}|${norm(k.titulo)}`)) continue;
      jaTemKr.add(`${oid}|${norm(k.titulo)}`);
      const { kr_type, direction, unit } = tipoMeta(k.tipo);
      const peso = num(k.peso);
      const dono = idx.resolve(k.responsavelEmail, k.responsavelNome);
      krs.push({
        objective_id: oid,
        title: k.titulo,
        kr_type,
        direction,
        unit,
        initial_value: k.inicial,
        target_value: k.meta,
        current_value: k.atual ?? k.inicial,
        weight_percentage: peso ?? 0,
        status: (k.atingido ?? 0) >= 100 ? "on_track" : "active",
        owner_user_id: dono?.id ?? null,
        last_checkin_at: k.checkinData,
        is_automatic: false,
      });
    }
  }
  const rk = await insertBatched(db, "key_results", krs);
  console.log(`  resultados-chave criados: ${rk.inseridos}${rk.erros.length ? ` | ERROS: ${JSON.stringify(rk.erros.slice(0, 2))}` : ""}`);

  // check-ins: o backup só guarda o último de cada KR
  const { data: krsCriados } = await db
    .from("key_results").select("id,title,objective_id").in("objective_id", [...idPorCodigo.values()]);
  const krIdPorChave = new Map((krsCriados ?? []).map((k) => [`${k.objective_id}|${norm(k.title)}`, k.id]));

  const { data: checkinsExistentes, error: errCheckins } = await db
    .from("okr_checkins").select("key_result_id,new_value,created_at")
    .in("key_result_id", [...krIdPorChave.values()]);
  // Falhar aqui em silêncio deixaria o dedup vazio e reimportaria tudo a cada
  // execução — foi exatamente o que aconteceu quando o select pedia uma coluna
  // inexistente ('value' em vez de 'new_value').
  if (errCheckins) throw new Error(`okr_checkins (leitura para dedup): ${errCheckins.message}`);
  const jaTemCheckin = new Set(
    (checkinsExistentes ?? []).map((c) => `${c.key_result_id}|${new Date(c.created_at).getTime()}`),
  );

  const checkins = [];
  for (const o of objetivosComId) {
    const oid = idPorCodigo.get(o.codigo);
    if (!oid) continue;
    for (const k of o.krs.values()) {
      if (k.checkinData == null || k.atual == null) continue;
      const krId = krIdPorChave.get(`${oid}|${norm(k.titulo)}`);
      if (!krId) continue;
      const chaveCheckin = `${krId}|${new Date(k.checkinData).getTime()}`;
      if (jaTemCheckin.has(chaveCheckin)) continue;
      jaTemCheckin.add(chaveCheckin);
      // O backup só guarda o último check-in, sem o valor anterior — usa-se o
      // valor inicial do KR como referência. `perceived_risk` reflete o quanto
      // da meta foi atingido, já que o Feedz não exporta percepção de risco.
      const pct = k.atingido ?? 0;
      const autor = idx.resolve(k.responsavelEmail, k.responsavelNome);
      checkins.push({
        company_id: COMPANY_ID,
        objective_id: oid,
        key_result_id: krId,
        user_id: autor?.id ?? fallbackOwner,     // NOT NULL na tabela
        previous_value: k.inicial,
        new_value: k.atual,
        comment: k.checkinDesc ?? "Check-in importado do Feedz",
        perceived_risk: pct >= 70 ? "green" : pct >= 40 ? "yellow" : "red",
        has_blocker: false,
        created_at: k.checkinData,
      });
    }
  }
  const rc = await insertBatched(db, "okr_checkins", checkins);
  console.log(`  check-ins criados: ${rc.inseridos}${rc.erros.length ? ` | ERROS: ${JSON.stringify(rc.erros.slice(0, 2))}` : ""}`);

  // planos de ação
  // 'Atrasado' vira 'blocked': na origem significava prazo estourado, e é o
  // estado mais próximo aqui — 'todo' esconderia que já passou da data.
  const STATUS_ACAO = {
    "Concluído": "done",
    "Concluida": "done",
    "Concluída": "done",
    "Atrasado": "blocked",
    "Em andamento": "doing",
  };
  const { data: acoesExistentes } = await db
    .from("actions").select("objective_id,title").in("objective_id", [...idPorCodigo.values()]);
  const acoes = [];
  const vistas = new Set((acoesExistentes ?? []).map((a) => `${a.objective_id}|${a.title}`));
  for (const o of objetivosComId) {
    const oid = idPorCodigo.get(o.codigo);
    if (!oid) continue;
    for (const p of o.planos) {
      // Compara pelo título já truncado — é o que fica gravado, e comparar o
      // original faria o dedup falhar em todo plano com mais de 300 caracteres.
      const titulo = p.titulo.slice(0, 300);
      const chave = `${oid}|${titulo}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      const dono = idx.resolve(null, p.responsavelNome);
      acoes.push({
        objective_id: oid,
        company_id: COMPANY_ID,
        title: titulo,
        status: STATUS_ACAO[p.status] ?? "todo",
        due_date: p.prazo,
        owner_user_id: dono?.id ?? fallbackOwner,   // NOT NULL na tabela
        created_by: fallbackOwner,
        week_bucket: segundaFeiraDe(p.prazo ?? p.criadoEm),  // NOT NULL, sem default
        created_at: p.criadoEm ?? new Date().toISOString(),
      });
    }
  }
  const ra = await insertBatched(db, "actions", acoes);
  console.log(`  planos de ação criados: ${ra.inseridos}${ra.erros.length ? ` | ERROS: ${JSON.stringify(ra.erros.slice(0, 2))}` : ""}`);

  return { objetivos: criados, krs: rk.inseridos, checkins: rc.inseridos, acoes: ra.inseridos };
}
