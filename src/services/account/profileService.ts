import { getSupabase } from "@/services/supabase/client";

/** The public identity of an account. Email stays in Supabase Auth. */
export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  showInLeaderboards: boolean;
  createdAt: string;
}

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

/** Normalise what the player types into a candidate username. */
export function normaliseUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function usernameProblem(name: string): string | null {
  if (name.length < 3) return "Almeno 3 caratteri.";
  if (name.length > 20) return "Al massimo 20 caratteri.";
  if (!USERNAME_PATTERN.test(name))
    return "Solo lettere minuscole senza accenti, numeri e trattino basso (_).";
  return null;
}

export type ProfileError = "taken" | "invalid" | "network" | "unknown";

export const PROFILE_MESSAGES: Record<ProfileError, string> = {
  taken: "Questo nome utente è già in uso.",
  invalid: "Questo nome non è valido o è riservato.",
  network: "Non riesco a raggiungere il server. Riprova.",
  unknown: "Non sono riuscito a salvare. Riprova tra poco.",
};

function profileError(e: { code?: string; message?: string }): ProfileError {
  if (e.code === "23505") return "taken";
  if (e.code === "23514") return "invalid";
  if (/fetch|network/i.test(e.message ?? "")) return "network";
  return "unknown";
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("profiles")
    .select("id, username, display_name, show_in_leaderboards, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    showInLeaderboards: data.show_in_leaderboards,
    createdAt: data.created_at,
  };
}

export async function updateMyProfile(
  userId: string,
  patch: {
    username?: string;
    displayName?: string | null;
    showInLeaderboards?: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: ProfileError; message: string }> {
  const sb = await getSupabase();
  const { error } = await sb
    .from("profiles")
    .update({
      ...(patch.username !== undefined && { username: patch.username }),
      ...(patch.displayName !== undefined && {
        display_name: patch.displayName?.trim()
          ? patch.displayName.trim()
          : null,
      }),
      ...(patch.showInLeaderboards !== undefined && {
        show_in_leaderboards: patch.showInLeaderboards,
      }),
    })
    .eq("id", userId);
  if (error) {
    const code = profileError(error);
    return { ok: false, error: code, message: PROFILE_MESSAGES[code] };
  }
  return { ok: true };
}

/** null when the check itself could not be done (offline, not configured). */
export async function isUsernameAvailable(
  name: string,
): Promise<boolean | null> {
  try {
    const sb = await getSupabase();
    const { data, error } = await sb.rpc("username_available", {
      p_username: name,
    });
    return error ? null : data === true;
  } catch {
    return null;
  }
}
