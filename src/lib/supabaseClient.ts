import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://idgrfypntnjlphmqqgnp.supabase.co'
const supabaseKey =  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZ3JmeXBudG5qbHBobXFxZ25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5ODMwNDEsImV4cCI6MjA3MDU1OTA0MX0.BzpEJZkaw6FRLdMVbgU6LkJdtgcqZOg8U7frCKFO0zM'  // PUBLIC_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
