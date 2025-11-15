// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Supabase project details from VITE_* envs (public)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Normal client for public use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Extend global `Window` once with proper typing
declare global {
  interface Window {
    // kept for compatibility, but will NOT return a service-role client in production
    createAdminClient?: () => SupabaseClient<
      unknown,
      { PostgrestVersion: string },
      never,
      never,
      { PostgrestVersion: string }
    > | null
  }
}

// IMPORTANT: never expose service role key in the browser.
// createAdminClient will warn and return null. Use your server functions for admin actions.
if (!window.createAdminClient) {
  window.createAdminClient = (): SupabaseClient<
    unknown,
    { PostgrestVersion: string },
    never,
    never,
    { PostgrestVersion: string }
  > | null => {
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.warn(
        '⚠️ No VITE_SUPABASE_SERVICE_ROLE_KEY found (good). For admin actions, call your server functions instead.'
      )
      return null
    }

    // If the service key is present in VITE_* (NOT recommended), still refuse to create in-browser admin client:
    console.warn(
      '⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY is present in client env. This is insecure and should be removed. Admin client will not be created in browser.'
    )
    return null
  }
}
