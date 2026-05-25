import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function log(level: "info" | "warn" | "error", msg: string, ctx?: Record<string, unknown>) {
  const payload = { level, msg, ts: new Date().toISOString(), ...ctx };
  if (level === "error") console.error(JSON.stringify(payload));
  else console.log(JSON.stringify(payload));
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceRoleKey || !supabaseUrl) {
    return jsonResponse(500, { success: false, error: "Missing service role configuration" });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller is authenticated and is admin/owner
  const authHeader = req.headers.get("authorization") ?? "";
  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser();
  if (authErr || !caller) {
    return jsonResponse(401, { success: false, error: "Unauthorized" });
  }

  const { email, companyId } = await req.json() as { email?: string; companyId?: string };
  if (!email || !companyId) {
    return jsonResponse(400, { success: false, error: "email and companyId are required" });
  }

  // Verify caller is admin or owner of the company
  const { data: roleRow } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!roleRow || !["admin", "owner"].includes(roleRow.role)) {
    log("warn", "reset-user-password:forbidden", { callerId: caller.id, companyId });
    return jsonResponse(403, { success: false, error: "Forbidden: admin or owner required" });
  }

  log("info", "reset-user-password:start", { callerId: caller.id, email });

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error || !data?.properties?.action_link) {
    log("error", "reset-user-password:generate-failed", { msg: error?.message });
    return jsonResponse(500, { success: false, error: error?.message ?? "Failed to generate link" });
  }

  log("info", "reset-user-password:done", { callerId: caller.id, email });

  return jsonResponse(200, { success: true, link: data.properties.action_link });
});
