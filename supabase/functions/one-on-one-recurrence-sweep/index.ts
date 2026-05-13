import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type RunReport = {
  success: boolean;
  swept: number;
  durationMs: number;
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

  log("info", "one-on-one-recurrence-sweep:start");

  const report: RunReport = {
    success: false,
    swept: 0,
    durationMs: 0,
  };

  try {
    // AC4: Find 1:1s that are recurring, still in 'scheduled' status,
    // but whose scheduled_at is more than 7 days in the past.
    // These are stale — mark as 'no_show' so the trigger generates the next one.
    const { data: stale, error: fetchError } = await supabase
      .from("one_on_ones")
      .select("id")
      .neq("recurrence", "none")
      .eq("status", "scheduled")
      .lt("scheduled_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (fetchError) throw fetchError;

    const staleIds = (stale ?? []).map((r: { id: string }) => r.id);

    log("info", "one-on-one-recurrence-sweep:found-stale", { count: staleIds.length });

    if (staleIds.length === 0) {
      report.success = true;
      report.swept = 0;
      report.durationMs = Date.now() - startedAt;
      log("info", "one-on-one-recurrence-sweep:done", { swept: 0, durationMs: report.durationMs });
      return new Response(
        JSON.stringify({ success: true, data: report }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update each stale 1:1 to 'no_show'. The DB trigger
    // trg_one_on_one_generate_next fires automatically and creates the
    // next occurrence.
    const { error: updateError, count } = await supabase
      .from("one_on_ones")
      .update({ status: "no_show" })
      .in("id", staleIds)
      .neq("status", "no_show"); // idempotency guard

    if (updateError) throw updateError;

    report.swept = count ?? staleIds.length;
    report.success = true;
    report.durationMs = Date.now() - startedAt;

    log("info", "one-on-one-recurrence-sweep:done", {
      swept: report.swept,
      durationMs: report.durationMs,
    });

    return new Response(
      JSON.stringify({ success: true, data: report }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    report.durationMs = Date.now() - startedAt;
    const msg = (error as Error).message;
    log("error", "one-on-one-recurrence-sweep:fatal", { msg, durationMs: report.durationMs });

    return new Response(
      JSON.stringify({ success: false, data: report, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
