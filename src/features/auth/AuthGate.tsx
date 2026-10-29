import type { ReactNode } from "react";
import { useAuth } from "./authContext";

/**
 * Holds a game board until the session is known. A board asks at once
 * whether today's challenge was already played; asked before the session is
 * restored, it would look on the device instead of in the account and offer
 * the challenge again.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading")
    return (
      <p
        role="status"
        className="py-16 text-center text-sm text-muted-foreground"
      >
        Caricamento…
      </p>
    );
  return <>{children}</>;
}
