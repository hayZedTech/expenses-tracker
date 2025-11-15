// api/list-users.ts
import { createClient } from '@supabase/supabase-js';

// Load Supabase env variables from Vercel
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables"
  );
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // List users from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (authError) throw authError;

    const authUsers = authData?.users ?? [];

    // Fetch profiles from your table
    const { data: profiles, error: tableError } = await supabase
      .from('expenses_profiles')
      .select('*');
    if (tableError) throw tableError;

    // Match confirmed users
    const confirmedUsers = (profiles || []).filter((p: any) =>
      authUsers.some((a: any) => {
        const sameId = a.id === p.id;
        const sameEmail =
          typeof a.email === 'string' &&
          typeof p.email === 'string' &&
          a.email.toLowerCase() === p.email.toLowerCase();
        const confirmed = Boolean(a.email_confirmed_at || a.confirmed_at);
        return confirmed && (sameId || sameEmail);
      })
    );

    return res.status(200).json({ success: true, users: confirmedUsers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
