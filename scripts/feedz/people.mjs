/**
 * Colaboradores: cadastro, datas pessoais, demografia e histórico de cargo.
 *
 * Os 110 desligados do backup entram como registro em public.users SEM conta
 * de login (decisão do Andrey em 03/08/2026): o histórico fica vinculado e
 * navegável, ninguém consegue autenticar e não consome licença.
 */
import { randomUUID } from "node:crypto";
import { COMPANY_ID, sheet, norm, parseDate, parseDateOnly, insertBatched, section } from "./lib.mjs";

const ARQ = "Colaboradores_20262907050138.xlsx";

export async function importPeople(db, idx, { apply }) {
  section("1. COLABORADORES");
  const colabs = sheet(ARQ);

  const novos = [];
  const paraAtualizar = [];
  const novasMemberships = [];
  const demografia = [];
  const vistosMembership = new Set();
  const vistosDemografia = new Set();

  for (const c of colabs) {
    const email = norm(c["Email"]);
    if (!email) continue;

    const nome = (c["Nome completo"] || c["Nome"] || "").toString().trim();
    const ativo = (c["Situação"] ?? "").toString().trim() === "Ativo";
    const existente = idx.resolve(email, nome);

    let userId;
    if (existente) {
      userId = existente.id;
      // só preenche o que está vazio — nunca sobrescreve o que já foi editado aqui
      if (!existente.birth_date && c["Data de Nascimento"]) {
        paraAtualizar.push({ id: userId, birth_date: parseDateOnly(c["Data de Nascimento"]) });
      }
    } else {
      userId = randomUUID();
      novos.push({
        id: userId,
        email,
        full_name: nome,
        display_name: (c["Nome"] || nome).toString().trim(),
        birth_date: parseDateOnly(c["Data de Nascimento"]),
        bio: c["Biografia"] ? c["Biografia"].toString().trim() : null,
        role: "member",
        locale: "pt-BR",
      });
      idx.register({ id: userId, email, full_name: nome });
    }

    // Membership: só para quem ainda não tem vínculo nesta empresa.
    // O `vistos` cobre o caso de duas linhas do backup resolverem para a mesma
    // pessoa (nome repetido, e-mail reaproveitado) — sem ele o lote inteiro
    // falha na constraint company_id+user_id.
    if (!idx.membershipByUser.has(userId) && !vistosMembership.has(userId)) {
      vistosMembership.add(userId);
      novasMemberships.push({
        company_id: COMPANY_ID,
        user_id: userId,
        status: ativo ? "active" : "inactive",
        position: c["Cargo"] ? c["Cargo"].toString().trim() : null,
        department: c["Departamento"] ? c["Departamento"].toString().trim() : null,
        hire_date: parseDateOnly(c["Data Admissão"]),
        employee_code: c["Matrícula"] ? c["Matrícula"].toString().trim() : null,
        unit: c["Unidade"] ? c["Unidade"].toString().trim() : null,
        termination_type: c["Desligamento - Tipo"] ? c["Desligamento - Tipo"].toString().trim() : null,
        termination_reason: c["Desligamento - Motivo"] ? c["Desligamento - Motivo"].toString().trim() : null,
        last_working_day: parseDateOnly(c["Último dia trabalhado"]),
        feedz_id: c["ID"] ? c["ID"].toString().trim() : null,
      });
    }

    const temDemo = c["CPF"] || c["Etnia"] || c["Sexo"] || c["Gênero"];
    if (temDemo && !vistosDemografia.has(userId)) {
      vistosDemografia.add(userId);
      demografia.push({
        company_id: COMPANY_ID,
        user_id: userId,
        cpf: c["CPF"] ? c["CPF"].toString().trim() : null,
        ethnicity: c["Etnia"] ? c["Etnia"].toString().trim() : null,
        sex: c["Sexo"] ? c["Sexo"].toString().trim() : null,
        gender: c["Gênero"] ? c["Gênero"].toString().trim() : null,
        source: "feedz",
        imported_at: new Date().toISOString(),
      });
    }
  }

  console.log(`  linhas no backup:        ${colabs.length}`);
  console.log(`  users a criar:           ${novos.length}   (sem conta de login)`);
  console.log(`  users a completar:       ${paraAtualizar.length}  (só data de nascimento vazia)`);
  console.log(`  memberships a criar:     ${novasMemberships.length}`);
  console.log(`    ativos:                ${novasMemberships.filter((m) => m.status === "active").length}`);
  console.log(`    inativos (desligados): ${novasMemberships.filter((m) => m.status === "inactive").length}`);
  console.log(`  demografia a gravar:     ${demografia.length}`);

  if (!apply) {
    console.log("\n  (dry-run) amostra de users a criar:");
    for (const u of novos.slice(0, 3)) console.log(`     - ${u.full_name} <${u.email}> nasc:${u.birth_date ?? "-"}`);
    return { novos: novos.length, memberships: novasMemberships.length };
  }

  const r1 = await insertBatched(db, "users", novos);
  console.log(`\n  users criados: ${r1.inseridos}${r1.erros.length ? ` | ERROS: ${JSON.stringify(r1.erros.slice(0, 2))}` : ""}`);

  let atualizados = 0;
  for (const u of paraAtualizar) {
    const { error } = await db.from("users").update({ birth_date: u.birth_date }).eq("id", u.id);
    if (!error) atualizados++;
  }
  console.log(`  users completados: ${atualizados}`);

  const r2 = await insertBatched(db, "company_memberships", novasMemberships, { onConflict: "company_id,user_id" });
  console.log(`  memberships criadas: ${r2.inseridos}${r2.erros.length ? ` | ERROS: ${JSON.stringify(r2.erros.slice(0, 2))}` : ""}`);

  const r3 = await insertBatched(db, "employee_demographics", demografia, { onConflict: "company_id,user_id" });
  console.log(`  demografia gravada: ${r3.inseridos}${r3.erros.length ? ` | ERROS: ${JSON.stringify(r3.erros.slice(0, 2))}` : ""}`);

  return { novos: r1.inseridos, memberships: r2.inseridos };
}

/**
 * Turnovers → position_history. A tabela já nasceu preparada para importação
 * (tem source/imported_at), então é só alimentar.
 */
export async function importTurnover(db, idx, { apply }) {
  section("2. TURNOVER (histórico de saída)");
  const rows = sheet("Turnovers_20263007.xlsx");

  const registros = [];
  const vistos = new Set();
  let semUser = 0;
  let duplicados = 0;
  for (const t of rows) {
    const nome = (t["Nome"] ?? "").toString().trim();
    if (!nome) continue;
    const user = idx.resolve(null, nome);
    if (!user) { semUser++; continue; }

    // A tabela tem UNIQUE (user_id, changed_at, COALESCE(position,'')). Como o
    // relatório de turnover não traz cargo, duas saídas da mesma pessoa no
    // mesmo dia colidiriam — e o lote inteiro falharia.
    const quando = parseDate(t["Data do turnover"]) ?? new Date().toISOString();
    const chave = `${user.id}|${quando}`;
    if (vistos.has(chave)) { duplicados++; continue; }
    vistos.add(chave);

    registros.push({
      company_id: COMPANY_ID,
      user_id: user.id,
      position: null,
      department_name: t["Departamento"] ? t["Departamento"].toString().trim() : null,
      manager_name: null,
      reason: t["Razão"] ? t["Razão"].toString().trim() : null,
      notes: t["Tipo"] ? `Turnover: ${t["Tipo"]}` : "Turnover",
      changed_at: quando,
      source: "feedz",
      imported_at: new Date().toISOString(),
    });
  }

  console.log(`  linhas no backup:  ${rows.length}`);
  console.log(`  com pessoa casada: ${registros.length}`);
  console.log(`  sem correspondência: ${semUser}   duplicados no backup: ${duplicados}`);

  if (!apply) return { registros: registros.length };

  // Linha a linha: o índice único usa a expressão COALESCE(position,''), que o
  // PostgREST não consegue referenciar num ON CONFLICT. Assim uma colisão com o
  // que já está no banco pula só aquele registro em vez de derrubar o lote.
  let gravados = 0;
  let jaExistiam = 0;
  const outros = [];
  for (const reg of registros) {
    const { error } = await db.from("position_history").insert(reg);
    if (!error) gravados++;
    else if (error.code === "23505") jaExistiam++;
    else outros.push(error.message);
  }
  console.log(`  gravados: ${gravados}  |  já existiam: ${jaExistiam}${outros.length ? `  |  ERROS: ${outros.slice(0, 2)}` : ""}`);
  return { registros: gravados };
}
