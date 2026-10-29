import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isBackendConfigured } from "@/services/supabase/client";
import { getMyProfile, type Profile } from "@/services/account/profileService";
import {
  LocalPersistenceAdapter,
  setPersistence,
} from "@/services/persistence";
import {
  AuthContext,
  type AuthState,
  type AuthStatus,
  type AuthUser,
} from "./authContext";

function toUser(session: Session | null): AuthUser | null {
  const u = session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    createdAt: u.created_at,
    emailConfirmed: Boolean(u.email_confirmed_at ?? u.confirmed_at),
  };
}

/**
 * Owns the session for the whole app and decides where results are saved:
 * on the device for guests, in the account once signed in. Every game goes
 * through `getPersistence()`, so swapping the adapter here is what connects
 * all seven of them to the backend.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isBackendConfigured();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(
    configured ? "loading" : "disabled",
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const signOutExpected = useRef(false);
  const currentUserId = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      setProfile(await getMyProfile(userId));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    let onOnline: (() => void) | undefined;

    void (async () => {
      const [sb, { SupabasePersistenceAdapter }] = await Promise.all([
        getSupabase(),
        import("@/services/persistence/supabaseAdapter"),
      ]);
      if (!active) return;

      const apply = (session: Session | null) => {
        const next = toUser(session);
        const changed = (next?.id ?? null) !== currentUserId.current;
        currentUserId.current = next?.id ?? null;
        setUser(next);
        setStatus(next ? "signed-in" : "signed-out");
        if (!changed) return;

        if (onOnline) window.removeEventListener("online", onOnline);
        onOnline = undefined;
        if (next) {
          const adapter = new SupabasePersistenceAdapter(
            sb,
            next.id,
            localStorage,
          );
          setPersistence(adapter);
          onOnline = () => void adapter.flush();
          window.addEventListener("online", onOnline);
          void adapter.flush();
          void loadProfile(next.id);
        } else {
          setPersistence(new LocalPersistenceAdapter());
          setProfile(null);
        }
        // Every cached result belonged to the previous owner.
        void queryClient.resetQueries();
      };

      const { data } = sb.auth.onAuthStateChange((event, session) => {
        // Supabase warns against awaiting its own calls inside this callback:
        // everything async is scheduled, not awaited.
        if (event === "PASSWORD_RECOVERY") setRecovering(true);
        if (event === "SIGNED_OUT") {
          if (!signOutExpected.current && currentUserId.current)
            setSessionExpired(true);
          signOutExpected.current = false;
          setRecovering(false);
        }
        if (event === "SIGNED_IN") setSessionExpired(false);
        setTimeout(() => active && apply(session), 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    })().catch(() => {
      // The client could not load (offline on first visit): behave as a guest.
      if (active) setStatus("signed-out");
    });

    return () => {
      active = false;
      unsubscribe?.();
      if (onOnline) window.removeEventListener("online", onOnline);
    };
  }, [configured, loadProfile, queryClient]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      user,
      profile,
      sessionExpired,
      recovering,
      expectSignOut: () => {
        signOutExpected.current = true;
      },
      dismissExpired: () => setSessionExpired(false),
      refreshProfile: async () => {
        if (user) await loadProfile(user.id);
      },
    }),
    [status, user, profile, sessionExpired, recovering, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
