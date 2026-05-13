import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { path } = await req.json() as { path: string };
    if (!path || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create anon client with user JWT to validate identity
    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = user.id;

    // path format: {owner_id}/{plan_id}/{action_id}/filename
    const pathSegments = path.split("/");
    if (pathSegments.length < 4) {
      return new Response(JSON.stringify({ error: "Invalid path format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planId = pathSegments[1];

    // Use service role to check plan access without RLS blocking meta-queries
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: plan } = await serviceClient
      .from("pdi_plans")
      .select("user_id, manager_id, company_id")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isOwner = plan.user_id === requesterId;
    const isManager = plan.manager_id === requesterId;

    let isOrgManager = false;
    if (!isOwner && !isManager) {
      const { data } = await serviceClient.rpc("is_user_manager", {
        manager_id: requesterId,
        member_id: plan.user_id,
        company_id: plan.company_id,
      });
      isOrgManager = !!data;
    }

    if (!isOwner && !isManager && !isOrgManager) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL using service role (bypasses bucket policy for managers)
    const { data: urlData, error: urlError } = await serviceClient.storage
      .from("pdi-attachments")
      .createSignedUrl(path, 60);

    if (urlError || !urlData?.signedUrl) {
      return new Response(JSON.stringify({ error: urlError?.message ?? "Failed to generate signed URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, signedUrl: urlData.signedUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = (error as Error).message;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
