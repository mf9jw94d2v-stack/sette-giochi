import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type AppSupabaseClient = SupabaseClient<Database>;

export interface BackendConfig {
  url: string;
  key: string;
}

/**
 * True for keys that must never reach a browser: Supabase "secret" keys and
 * legacy JWT keys whose role is service_role. Both bypass Row Level Security.
 */
export function isPrivilegedKey(key: string): boolean {
  if (key.startsWith("sb_secret_")) return true;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { role?: unknown };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

/** Read the browser-safe backend settings; null when not configured. */
export function readBackendConfig(
  env: Partial<ImportMetaEnv> = import.meta.env,
): BackendConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = (
    env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY
  )?.trim();
  if (!url || !key) return null;
  if (isPrivilegedKey(key)) {
    // Refuse loudly rather than run with a key that defeats every policy.
    console.error(
      "[supabase] La chiave configurata è una chiave privilegiata (secret/service_role) e non può essere usata nel browser. Usa la chiave publishable.",
    );
    return null;
  }
  return { url: url.replace(/\/+$/, ""), key };
}

const CONFIG = readBackendConfig();

/** Whether this build talks to a Supabase backend at all. */
export function isBackendConfigured(): boolean {
  return CONFIG !== null;
}

export function backendUrl(): string | null {
  return CONFIG?.url ?? null;
}

let clientPromise: Promise<AppSupabaseClient> | null = null;

/**
 * The shared Supabase client, created on first use. The library is imported
 * dynamically so a guest-only build does not ship it in the main bundle.
 */
export function getSupabase(): Promise<AppSupabaseClient> {
  if (!CONFIG) {
    return Promise.reject(new Error("Backend non configurato"));
  }
  const { url, key } = CONFIG;
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient<Database>(url, key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "sgp-auth",
      },
    }),
  );
  return clientPromise;
}
