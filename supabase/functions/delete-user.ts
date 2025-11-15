// delete-user.ts
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

// Load environment variables locally if needed
let supabaseUrl = Deno.env.get("SUPABASE_URL");
let supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseServiceRoleKey) {
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
  // Handle preflight CORS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = await req.json();
    const userId = body.id;

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "User ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Delete user profile from table
    const { error: tableError } = await supabase
      .from("expenses_profiles")
      .delete()
      .eq("id", userId);
    if (tableError) throw tableError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
