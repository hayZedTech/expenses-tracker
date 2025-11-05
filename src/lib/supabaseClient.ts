import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ✅ Your Supabase project details
const supabaseUrl = 'https://idgrfypntnjlphmqqgnp.supabase.co'
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZ3JmeXBudG5qbHBobXFxZ25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5ODMwNDEsImV4cCI6MjA3MDU1OTA0MX0.BzpEJZkaw6FRLdMVbgU6LkJdtgcqZOg8U7frCKFO0zM'

// ✅ Normal client for public use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ✅ Safely extend global `Window` once with proper typing
declare global {
  interface Window {
    createAdminClient?: () => SupabaseClient<any, 'public', 'public', any, any> | null
  }
}

// ✅ Only define it if it doesn't already exist
if (!window.createAdminClient) {
  window.createAdminClient = (): SupabaseClient<any, 'public', 'public', any, any> | null => {
    const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.warn(
        '⚠️ Missing VITE_SUPABASE_SERVICE_ROLE_KEY — admin actions will fail.'
      )
      return null
    }
    return createClient(supabaseUrl, serviceKey)
  }
}
