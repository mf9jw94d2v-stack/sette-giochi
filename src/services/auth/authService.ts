import { getSupabase, isBackendConfigured } from "@/services/supabase/client";
import { authErrorCode, AUTH_MESSAGES, type AuthErrorCode } from "./errors";

/**
 * Every account action the pages need, each returning a plain outcome with
 * an Italian message — never a raw Supabase error.
 */

export type AuthOutcome<T = void> =
  { ok: true; value: T } | { ok: false; code: AuthErrorCode; message: string };

function fail(error: unknown): {
  ok: false;
  code: AuthErrorCode;
  message: string;
} {
  const code = authErrorCode(error);
  return { ok: false, code, message: AUTH_MESSAGES[code] };
}

const client = getSupabase;

function notConfigured(): { ok: false; code: AuthErrorCode; message: string } {
  return {
    ok: false,
    code: "not_configured",
    message: AUTH_MESSAGES.not_configured,
  };
}

function siteUrl(path: string): string {
  // Includes the base path, so links in emails come back to the right place
  // when the site is served from a sub-folder (GitHub Pages).
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return new URL(base + path, window.location.origin).toString();
}

/** Only same-site paths: never redirect to another site after signing in. */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  )
    return fallback;
  return next;
}

export const PASSWORD_MIN_LENGTH = 8;

export async function signUp(input: {
  email: string;
  password: string;
  username: string;
}): Promise<AuthOutcome<{ needsConfirmation: boolean }>> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    const { data, error } = await sb.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: siteUrl("/auth/callback"),
        data: { username: input.username },
      },
    });
    if (error) return fail(error);
    // With email confirmation on there is no session yet. (For an email that
    // is already registered Supabase answers the same way, on purpose: the
    // page must not reveal who has an account.)
    return { ok: true, value: { needsConfirmation: !data.session } };
  } catch (e) {
    return fail(e);
  }
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthOutcome> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    const { error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? fail(error) : { ok: true, value: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function signInWithGoogle(next: string): Promise<AuthOutcome> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: siteUrl(
          `/auth/callback?next=${encodeURIComponent(safeNextPath(next))}`,
        ),
      },
    });
    return error ? fail(error) : { ok: true, value: undefined };
  } catch (e) {
    return fail(e);
  }
}

export function isGoogleEnabled(): boolean {
  return import.meta.env.VITE_AUTH_GOOGLE_ENABLED === "true";
}

export async function signOut(): Promise<AuthOutcome> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    // "local": end the session on this device. Signing out everywhere is a
    // separate, deliberate choice.
    const { error } = await sb.auth.signOut({ scope: "local" });
    return error ? fail(error) : { ok: true, value: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function requestPasswordReset(
  email: string,
): Promise<AuthOutcome> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: siteUrl("/reset-password"),
    });
    // Rate limits are worth telling; anything else is answered like success,
    // so the form never confirms whether an email is registered.
    if (error && authErrorCode(error) === "rate_limited") return fail(error);
    if (error && authErrorCode(error) === "network") return fail(error);
    return { ok: true, value: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function resendConfirmation(email: string): Promise<AuthOutcome> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    const { error } = await sb.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: siteUrl("/auth/callback") },
    });
    return error ? fail(error) : { ok: true, value: undefined };
  } catch (e) {
    return fail(e);
  }
}

/** Set a new password for the signed-in (or recovering) account. */
export async function updatePassword(password: string): Promise<AuthOutcome> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    const { error } = await sb.auth.updateUser({ password });
    return error ? fail(error) : { ok: true, value: undefined };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Changing the password from the account page asks for the current one, so
 * an unattended open session is not enough to take the account over.
 */
export async function changePassword(
  email: string,
  current: string,
  next: string,
): Promise<AuthOutcome> {
  const check = await signIn(email, current);
  if (!check.ok) {
    return check.code === "invalid_credentials"
      ? {
          ok: false,
          code: "invalid_credentials",
          message: "La password attuale non è corretta.",
        }
      : check;
  }
  return updatePassword(next);
}

/** Finish an email link that carries a token hash (confirmation, recovery). */
export async function verifyEmailLink(
  tokenHash: string,
  type: "signup" | "email" | "recovery" | "invite" | "email_change",
): Promise<AuthOutcome> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    return error ? fail(error) : { ok: true, value: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteAccount(): Promise<AuthOutcome> {
  if (!isBackendConfigured()) return notConfigured();
  try {
    const sb = await client();
    const { error } = await sb.functions.invoke("delete-account", {
      body: { confirm: "ELIMINA" },
    });
    // The caller signs out once it has left any private page.
    return error ? fail(error) : { ok: true, value: undefined };
  } catch (e) {
    return fail(e);
  }
}
