import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

const env = config({ path: "./.env" });

console.log({
  SUPABASE_URL_exists: Boolean(env.SUPABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY_exists: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
});
