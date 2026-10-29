/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase "publishable" key (browser-safe, protected by RLS). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Older name of the same browser-safe key, still accepted. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** "true" only once Google sign-in is configured in Supabase. */
  readonly VITE_AUTH_GOOGLE_ENABLED?: string;
  readonly VITE_DAILY_TIMEZONE?: string;
  readonly VITE_ENABLE_QUALITY_LAB?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
