import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";
import { AccountsDisabled } from "./AuthLayout";

/**
 * Guards a private page. Nothing private renders until the stored session has
 * been checked; then a guest is sent to sign in and brought back afterwards.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "disabled") return <AccountsDisabled />;
  if (status === "loading")
    return (
      <p
        role="status"
        className="py-16 text-center text-sm text-muted-foreground"
      >
        Controllo della sessione…
      </p>
    );
  if (status === "signed-out") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
