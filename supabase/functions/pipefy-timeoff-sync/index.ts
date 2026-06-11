import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PIPE_ID = Deno.env.get("PIPEFY_TIMEOFF_PIPE_ID") ?? "306506057";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- helpers (espelham o import inicial) ----
const norm = (s: string | null) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function firstOf(v: string | null): string | null {
  if (!v) return null;
  try { const a = JSON.parse(v); return Array.isArray(a) ? (a[0] ?? null) : v; } catch { return v; }
}

function toISO(d: string | null): string | null {
  if (!d) return null;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

async function fetchAllCards(token: string) {
  const query = `query($pipeId: ID!, $after: String) {
    allCards(pipeId: $pipeId, first: 50, after: $after) {
      edges { node {
        id title current_phase { name }
        fields { value array_value field { id } }
      } }
      pageInfo { hasNextPage endCursor }
    }
  }`;
  const out: any[] = [];
  let after: string | null = null;
  do {
    const res = await fetch("https://api.pipefy.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { pipeId: PIPE_ID, after } }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    const conn = json.data.allCards;
    out.push(...conn.edges.map((e: any) => e.node));
    after = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (after);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pipefyToken = Deno.env.get("PIPEFY_TOKEN");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: "Missing service role configuration" });
  if (!pipefyToken) return jsonResponse(500, { error: "PIPEFY_TOKEN não configurado" });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Autenticação do chamador
  const authHeader = req.headers.get("authorization") ?? "";
  const caller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: { user }, error: authErr } = await caller.auth.getUser();
  if (authErr || !user) return jsonResponse(401, { error: "Unauthorized" });

  const { companyId } = await req.json().catch(() => ({})) as { companyId?: string };
  if (!companyId) return jsonResponse(400, { error: "companyId é obrigatório" });

  // Apenas admin/owner
  const { data: roleRow } = await admin
    .from("user_roles").select("role")
    .eq("user_id", user.id).eq("company_id", companyId).maybeSingle();
  if (!roleRow || !["admin", "owner"].includes(roleRow.role)) {
    return jsonResponse(403, { error: "Forbidden: admin ou owner requerido" });
  }

  // Memberships da empresa (p/ casar pessoa)
  const { data: members } = await admin
    .from("company_memberships")
    .select("id, pipefy_card_id, status, users:users!company_memberships_user_id_fkey(full_name)")
    .eq("company_id", companyId);

  const byPipefyId = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const m of (members ?? []) as any[]) {
    if (m.pipefy_card_id) byPipefyId.set(m.pipefy_card_id, m.id);
    const name = norm(m.users?.full_name);
    if (name && (!byName.has(name) || m.status === "active")) byName.set(name, m.id);
  }

  let cards: any[];
  try { cards = await fetchAllCards(pipefyToken); }
  catch (e) { return jsonResponse(502, { error: `Falha ao consultar Pipefy: ${(e as Error).message}` }); }

  const today = new Date().toISOString().slice(0, 10);
  const rows: any[] = [];
  const membershipBootstrap = new Map<string, string>();
  let matched = 0;
  const unmatched: string[] = [];

  for (const c of cards) {
    const f: Record<string, string | null> = {};
    const arr: Record<string, string[] | null> = {};
    for (const fl of c.fields) { f[fl.field.id] = fl.value; arr[fl.field.id] = fl.array_value; }

    const personName = firstOf(f.dados_pessoais);
    const start = toISO(f.data_de_in_cio_das_f_rias);
    let end = toISO(f.data_de_fim_das_f_rias);
    if (!personName || !start || !end) continue;
    if (end < start) end = start; // dado sujo: fim antes do início

    const days = f.dias_solicitados ? parseInt(f.dias_solicitados, 10) : null;
    const personPipefyId = arr.dados_pessoais?.[0] ?? null;

    let status: string;
    if (c.current_phase?.name === "Arquivado") status = "arquivada";
    else if (end < today) status = "realizada";
    else if (start > today) status = "agendada";
    else status = "em_andamento";

    let membershipId: string | null = null;
    if (personPipefyId && byPipefyId.has(personPipefyId)) membershipId = byPipefyId.get(personPipefyId)!;
    else if (byName.has(norm(personName))) membershipId = byName.get(norm(personName))!;

    if (membershipId) {
      matched++;
      if (personPipefyId) membershipBootstrap.set(membershipId, personPipefyId);
    } else unmatched.push(personName);

    rows.push({
      company_id: companyId,
      membership_id: membershipId,
      person_name: personName,
      start_date: start,
      end_date: end,
      days: days != null && !isNaN(days) ? days : null,
      type: "suspensao_pj",
      status,
      source: "pipefy",
      pipefy_card_id: c.id,
      manager_name: firstOf(f.gestor_respons_vel_1_1),
      substitute_name: firstOf(f.respons_vel_durante_a_aus_ncia),
      notes: f.justificativa_observa_es ?? null,
    });
  }

  // dias null -> calcula inclusivo
  for (const r of rows) if (r.days == null) {
    r.days = Math.max(1, Math.round((Date.parse(r.end_date) - Date.parse(r.start_date)) / 86400000) + 1);
  }

  const { error: upErr } = await admin.from("time_off").upsert(rows, { onConflict: "pipefy_card_id" });
  if (upErr) return jsonResponse(500, { error: `Falha ao gravar: ${upErr.message}` });

  // bootstrap do vínculo por ID (só onde ainda não tem)
  for (const [mid, pid] of membershipBootstrap) {
    await admin.from("company_memberships").update({ pipefy_card_id: pid })
      .eq("id", mid).is("pipefy_card_id", null);
  }

  return jsonResponse(200, {
    success: true,
    total: rows.length,
    matched,
    unmatched: [...new Set(unmatched)],
  });
});
