import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type CompanyResult = {
  companyId: string;
  objectivesScanned: number;
  atRisk: number;
  notificationsCreated: number;
  errors: string[];
};

type RunReport = {
  totalCompanies: number;
  totalObjectivesScanned: number;
  totalAtRisk: number;
  totalNotificationsCreated: number;
  durationMs: number;
  perCompany: CompanyResult[];
};

function log(level: "info" | "warn" | "error", msg: string, ctx?: Record<string, unknown>) {
  const payload = { level, msg, ts: new Date().toISOString(), ...ctx };
  if (level === "error") console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  log("info", "okr-escalation:start");

  const report: RunReport = {
    totalCompanies: 0,
    totalObjectivesScanned: 0,
    totalAtRisk: 0,
    totalNotificationsCreated: 0,
    durationMs: 0,
    perCompany: [],
  };
  const fatalErrors: string[] = [];

  try {
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id");

    if (companiesError) throw companiesError;

    if (!companies?.length) {
      report.durationMs = Date.now() - startedAt;
      log("info", "okr-escalation:no-companies", { durationMs: report.durationMs });
      return new Response(
        JSON.stringify({ success: true, data: report }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    report.totalCompanies = companies.length;

    for (const company of companies) {
      const companyResult: CompanyResult = {
        companyId: company.id,
        objectivesScanned: 0,
        atRisk: 0,
        notificationsCreated: 0,
        errors: [],
      };

      try {
        const { data: settings } = await supabase
          .from("okr_settings")
          .select("*")
          .eq("company_id", company.id)
          .maybeSingle();

        const { data: objectives, error: objError } = await supabase
          .from("objectives")
          .select(`
            id, title, type, progress, auto_status, expected_progress, owner_id, team_id, company_id,
            owner:users!objectives_owner_id_fkey(id, full_name, email),
            key_results(id, title, current_value, target_value, last_checkin_at)
          `)
          .eq("company_id", company.id)
          .eq("is_active", true)
          .in("status", ["planned", "active"]);

        if (objError) throw objError;
        companyResult.objectivesScanned = objectives?.length ?? 0;

        if (!objectives?.length) {
          report.perCompany.push(companyResult);
          continue;
        }

        for (const obj of objectives) {
          await supabase.rpc("update_objective_auto_status", { p_objective_id: obj.id });
        }

        const { data: updatedObjectives, error: updErr } = await supabase
          .from("objectives")
          .select(`
            id, title, type, progress, auto_status, expected_progress, owner_id, team_id, company_id,
            owner:users!objectives_owner_id_fkey(id, full_name, email)
          `)
          .eq("company_id", company.id)
          .eq("is_active", true)
          .in("auto_status", ["risk", "overdue"]);

        if (updErr) throw updErr;
        companyResult.atRisk = updatedObjectives?.length ?? 0;

        if (!updatedObjectives?.length) {
          report.perCompany.push(companyResult);
          continue;
        }

        for (const obj of updatedObjectives) {
          try {
            const owner = obj.owner as { id: string; full_name: string | null; email: string } | null;
            const ownerName = owner?.full_name || owner?.email || "Desconhecido";
            const deviation = Math.round(Number(obj.expected_progress || 0) - obj.progress);
            const statusLabel = obj.auto_status === "overdue" ? "⏰ ATRASADO" : "🔴 EM RISCO";

            const notifyUserIds = new Set<string>();
            if (obj.owner_id) notifyUserIds.add(obj.owner_id);

            if (obj.type === "operational" && obj.team_id) {
              // 'lead' é o que os cadastros gravam; 'leader' é a grafia do
              // comentário original da coluna. Filtrar só por uma delas
              // deixaria o líder sem o aviso de OKR fora da curva.
              const { data: leaders } = await supabase
                .from("team_members")
                .select("user_id")
                .eq("team_id", obj.team_id)
                .in("role", ["lead", "leader"]);
              leaders?.forEach((l) => notifyUserIds.add(l.user_id));
            }

            if (obj.type === "tactical" || obj.type === "strategic") {
              const { data: admins } = await supabase
                .from("user_roles")
                .select("user_id")
                .eq("company_id", company.id)
                .in("role", ["admin", "owner"]);
              admins?.forEach((a) => notifyUserIds.add(a.user_id));
            }

            const message = `${statusLabel} — "${obj.title}" (${ownerName}) está ${deviation}% abaixo da curva esperada. Progresso: ${obj.progress}% vs esperado ${Math.round(Number(obj.expected_progress || 0))}%.`;

            const today = new Date().toISOString().split("T")[0];

            for (const userId of notifyUserIds) {
              const { data: existing } = await supabase
                .from("notifications")
                .select("id")
                .eq("user_id", userId)
                .eq("reference_id", obj.id)
                .eq("type", "okr_escalation")
                .gte("created_at", today)
                .limit(1);

              if (existing && existing.length > 0) continue;

              const { error: insertErr } = await supabase.from("notifications").insert({
                user_id: userId,
                company_id: company.id,
                type: "okr_escalation",
                title: `OKR ${statusLabel}`,
                message,
                reference_id: obj.id,
                reference_type: "objective",
              });

              if (insertErr) {
                companyResult.errors.push(`notify ${userId} for obj ${obj.id}: ${insertErr.message}`);
                continue;
              }

              companyResult.notificationsCreated++;
            }
          } catch (objErr) {
            const msg = (objErr as Error).message;
            companyResult.errors.push(`obj ${obj.id}: ${msg}`);
            log("error", "okr-escalation:obj-error", { companyId: company.id, objectiveId: obj.id, msg });
          }
        }
      } catch (companyErr) {
        const msg = (companyErr as Error).message;
        companyResult.errors.push(`company-level: ${msg}`);
        log("error", "okr-escalation:company-error", { companyId: company.id, msg });
      }

      report.perCompany.push(companyResult);
      report.totalObjectivesScanned += companyResult.objectivesScanned;
      report.totalAtRisk += companyResult.atRisk;
      report.totalNotificationsCreated += companyResult.notificationsCreated;
    }

    report.durationMs = Date.now() - startedAt;
    log("info", "okr-escalation:done", {
      companies: report.totalCompanies,
      atRisk: report.totalAtRisk,
      notifications: report.totalNotificationsCreated,
      durationMs: report.durationMs,
    });

    const success = report.perCompany.every((c) => c.errors.length === 0);

    return new Response(
      JSON.stringify({ success, data: report, errors: success ? undefined : ["partial-failures"] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    report.durationMs = Date.now() - startedAt;
    const msg = (error as Error).message;
    fatalErrors.push(msg);
    log("error", "okr-escalation:fatal", { msg, durationMs: report.durationMs });

    return new Response(
      JSON.stringify({ success: false, data: report, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
