import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";

/** The session ended on its own: say so, instead of silently becoming a guest. */
export function SessionExpiredBanner() {
  const { sessionExpired, status, dismissExpired } = useAuth();
  const { pathname } = useLocation();
  if (!sessionExpired || status !== "signed-out" || pathname === "/login")
    return null;
  return (
    <div role="alert" className="border-b border-border bg-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-sm">
        <p className="flex-1">
          La sessione è scaduta: da ora i risultati restano su questo
          dispositivo.
        </p>
        <Link
          to={`/login?next=${encodeURIComponent(pathname)}`}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Accedi di nuovo
        </Link>
        <button
          type="button"
          onClick={dismissExpired}
          className="text-muted-foreground hover:text-foreground"
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
