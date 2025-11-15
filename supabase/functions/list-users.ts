// list-users.ts
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

// Load .env locally if it exists
let supabaseUrl = Deno.env.get("SUPABASE_URL");
let supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // Fallback to loading .env (for local dev)
  const env = config({ path: "./.env" });
  supabaseUrl = env.SUPABASE_URL;
  supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env or environment variables");
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  // Handle OPTIONS preflight quickly
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (authError) throw authError;

    const authUsers = authData?.users ?? [];

    const { data: profiles, error: tableError } = await supabase
      .from("expenses_profiles")
      .select("*");
    if (tableError) throw tableError;

    const confirmedUsers = (profiles || []).filter((p: any) =>
      authUsers.some((a: any) => {
        const sameId = a.id === p.id;
        const sameEmail =
          typeof a.email === "string" &&
          typeof p.email === "string" &&
          a.email.toLowerCase() === p.email.toLowerCase();
        const confirmed = Boolean(a.email_confirmed_at || a.confirmed_at);
        return confirmed && (sameId || sameEmail);
      })
    );

    return new Response(JSON.stringify({ success: true, users: confirmedUsers }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
