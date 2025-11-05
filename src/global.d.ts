declare module '*.css';

// src/types/global.d.ts
export {}

declare global {
  interface Window {
    createAdminClient?: () => ReturnType<typeof import("@supabase/supabase-js").createClient>;
  }
}
