import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { isDue } from "./_lib/dueCheck.ts";
import { dispatchPulse } from "./_lib/dispatchPulse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PulseError {
  pulseId: string;
  message: string;
}

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

  log("info", "pulse-dispatch:start");

  const now = new Date();
  let dispatched = 0;
  let skipped = 0;
  const errors: PulseError[] = [];

  try {
    const { data: pulses, error: fetchError } = await supabase
      .from("pulse_surveys")
      .select(
        "id, company_id, name, question, question_type, frequency, day_of_week, day_of_month, send_hour_utc, target_all, target_departments, target_teams, active, last_dispatched_at, created_at",
      )
      .eq("active", true);

    if (fetchError) throw fetchError;

    if (!pulses?.length) {
      const durationMs = Date.now() - startedAt;
      log("info", "pulse-dispatch:no-active-pulses", { durationMs });
      return new Response(
        JSON.stringify({ success: true, dispatched: 0, skipped: 0, errors: [], durationMs }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    for (const pulse of pulses) {
      if (
        !isDue(
          {
            active: pulse.active,
            frequency: pulse.frequency,
            day_of_week: pulse.day_of_week,
            day_of_month: pulse.day_of_month,
            send_hour_utc: pulse.send_hour_utc,
            last_dispatched_at: pulse.last_dispatched_at,
            created_at: pulse.created_at,
          },
          now,
        )
      ) {
        skipped++;
        continue;
      }

      try {
        const result = await dispatchPulse(
          supabase,
          {
            id: pulse.id,
            company_id: pulse.company_id,
            name: pulse.name,
            question: pulse.question,
            question_type: pulse.question_type,
            target_all: pulse.target_all,
            target_departments: pulse.target_departments ?? [],
            target_teams: pulse.target_teams ?? [],
          },
          log,
        );

        if (result.error) {
          errors.push({ pulseId: pulse.id, message: result.error });
          log("error", "pulse-dispatch:pulse-error", { pulseId: pulse.id, error: result.error });
        } else {
          dispatched++;
          log("info", "pulse_dispatch_run", {
            pulseId: pulse.id,
            targetCount: result.targetCount,
            emailsSent: result.emailsSent,
            slackDMsSent: result.slackDMsSent,
            slackPosted: result.slackPosted,
            duration: Date.now() - startedAt,
            status: "success",
          });
        }
      } catch (err) {
        const message = (err as Error).message;
        errors.push({ pulseId: pulse.id, message });
        log("error", "pulse-dispatch:pulse-exception", { pulseId: pulse.id, message });
      }
    }

    const durationMs = Date.now() - startedAt;
    log("info", "pulse-dispatch:done", { dispatched, skipped, errors: errors.length, durationMs });

    return new Response(
      JSON.stringify({ success: true, dispatched, skipped, errors, durationMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = (error as Error).message;
    log("error", "pulse-dispatch:fatal", { message, durationMs });

    return new Response(
      JSON.stringify({ success: false, dispatched, skipped, errors, durationMs, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
