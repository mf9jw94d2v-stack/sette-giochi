import { createContext, useContext } from "react";
import type { Profile } from "@/services/account/profileService";

/**
 * - "disabled":   this build has no backend; everything is device-only.
 * - "loading":    the stored session is being checked. Private content must
 *                 not render yet.
 * - "signed-out" / "signed-in": settled.
 */
export type AuthStatus = "disabled" | "loading" | "signed-out" | "signed-in";

export interface AuthUser {
  id: string;
  email: string | null;
  createdAt: string;
  emailConfirmed: boolean;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  profile: Profile | null;
  /** The session ended without the player signing out (expired, revoked). */
  sessionExpired: boolean;
  /** Arrived through a password-recovery link: a new password is expected. */
  recovering: boolean;
  /** Mark the next sign-out as the player's own choice. */
  expectSignOut(): void;
  dismissExpired(): void;
  refreshProfile(): Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
