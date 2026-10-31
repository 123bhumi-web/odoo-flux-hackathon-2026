// Follow this setup guide to integrate the Deno Edge Function with Supabase:
// https://supabase.com/docs/guides/functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials in Edge Function environment");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse optional run_date from request body
    let runDate = new Date().toISOString().split("T")[0];
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.run_date) {
          runDate = body.run_date;
        }
      } catch {
        // use default date
      }
    }

    // Call the stored SQL procedure run_scheduled_billing
    const { data, error } = await supabase.rpc("run_scheduled_billing", {
      p_run_date: runDate,
    });

    if (error) {
      console.error("Error executing run_scheduled_billing:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, result: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
