/**
 * Base compartilhada dos importadores do Feedz.
 *
 * O backup é um conjunto de planilhas exportadas em 29-30/07/2026, sem IDs
 * estáveis na maioria dos artefatos — a identificação das pessoas é feita por
 * e-mail quando existe e por nome quando não existe. Por isso o resolvedor
 * abaixo é o coração da importação: quase todo erro de import nasce de uma
 * pessoa que não casou.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

export const REPO = "/Users/andreylopes/Desktop/O2/oxypeople2.0";

/** Empresa alvo: o2-growth (a "O2 Inc" tem 1 membership de teste). */
export const COMPANY_ID = "4a6cdaea-daef-47d2-897f-54d5ae999638";

export const BACKUP_DIR =
  process.env.FEEDZ_BACKUP_DIR ??
  "/private/tmp/claude-501/-Users-andreylopes/5a4b0c60-99c5-4195-95d6-23f82650c7f5/scratchpad/feedz_data/[BACKUP] Dados Feedz";

export function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      const env = readFileSync(`${REPO}/${f}`, "utf8");
      for (const line of env.split("\n")) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
      }
    } catch {}
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Lê a primeira aba de uma planilha do backup como array de objetos. */
export function sheet(relPath) {
  const wb = XLSX.readFile(`${BACKUP_DIR}/${relPath}`);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });
}

export const norm = (v) => (v ?? "").toString().trim().toLowerCase();

/**
 * Datas do Feedz chegam em três formatos: serial do Excel (número), Date já
 * convertido pelo xlsx, ou string "dd/mm/aaaa hh:mm:ss". Devolve ISO ou null.
 */
export function parseDate(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v) ? null : v.toISOString();
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, Math.floor(d.S || 0))).toISOString();
  }
  const s = v.toString().trim();
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (br) {
    const [, dd, mm, yyyy, H = "0", M = "0", S = "0"] = br;
    return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +H, +M, +S)).toISOString();
  }
  const iso = new Date(s);
  return isNaN(iso) ? null : iso.toISOString();
}

/** Só a parte da data (para colunas `date`). */
export function parseDateOnly(v) {
  const iso = parseDate(v);
  return iso ? iso.slice(0, 10) : null;
}

/**
 * Índice de pessoas: e-mail e nome → user do banco.
 * O mapa de nomes usa o cadastro do Feedz como ponte quando a planilha só
 * traz o nome (caso de avaliações, feedbacks, humor e turnover).
 */
export async function buildPeopleIndex(db) {
  const { data: users, error } = await db.from("users").select("id,email,full_name,birth_date");
  if (error) throw new Error(`users: ${error.message}`);

  const { data: memberships } = await db
    .from("company_memberships")
    .select("id,user_id,status,hire_date,position,department,employee_code,feedz_id")
    .eq("company_id", COMPANY_ID);

  const byEmail = new Map();
  const byName = new Map();
  for (const u of users) {
    if (u.email) byEmail.set(norm(u.email), u);
    if (u.full_name) byName.set(norm(u.full_name), u);
  }

  // cadastro do Feedz: nome -> e-mail, usado como ponte
  const colabs = sheet("Colaboradores_20262907050138.xlsx");
  const feedzNameToEmail = new Map();
  for (const c of colabs) {
    if (c["Nome"]) feedzNameToEmail.set(norm(c["Nome"]), norm(c["Email"]));
    if (c["Nome completo"]) feedzNameToEmail.set(norm(c["Nome completo"]), norm(c["Email"]));
  }

  const membershipByUser = new Map((memberships ?? []).map((m) => [m.user_id, m]));

  return {
    users,
    memberships: memberships ?? [],
    colabs,
    membershipByUser,
    byEmail,

    /** Resolve por e-mail; cai para nome; por último tenta nome→e-mail do Feedz. */
    resolve(email, nome) {
      const e = norm(email);
      if (e && byEmail.has(e)) return byEmail.get(e);
      const n = norm(nome);
      if (n && byName.has(n)) return byName.get(n);
      const viaFeedz = feedzNameToEmail.get(n);
      if (viaFeedz && byEmail.has(viaFeedz)) return byEmail.get(viaFeedz);
      return null;
    },

    /** Registra alguém recém-criado para as etapas seguintes enxergarem. */
    register(user) {
      if (user.email) byEmail.set(norm(user.email), user);
      if (user.full_name) byName.set(norm(user.full_name), user);
    },
  };
}

/** Insere em lotes; devolve {inseridos, erros}. */
export async function insertBatched(db, table, rows, { chunk = 200, onConflict } = {}) {
  let inseridos = 0;
  const erros = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const q = onConflict
      ? db.from(table).upsert(batch, { onConflict, ignoreDuplicates: true })
      : db.from(table).insert(batch);
    const { error } = await q;
    if (error) erros.push({ lote: i / chunk, message: error.message });
    else inseridos += batch.length;
  }
  return { inseridos, erros };
}

export function parseArgs(argv) {
  const apply = argv.includes("--apply");
  const onlyArg = argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()) : null;
  return { apply, only };
}

export function banner(apply) {
  console.log("=".repeat(72));
  console.log(apply ? "IMPORTAÇÃO FEEDZ — MODO APPLY (escreve no banco)" : "IMPORTAÇÃO FEEDZ — DRY-RUN (não escreve nada)");
  console.log(`empresa: ${COMPANY_ID}  (o2-growth)`);
  console.log("=".repeat(72));
}

export function section(t) {
  console.log(`\n${"-".repeat(72)}\n${t}\n${"-".repeat(72)}`);
}
