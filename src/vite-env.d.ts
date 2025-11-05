/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SUPABASE_SERVICE_ROLE_KEY?: string; // if you use it
  // add other environment variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
