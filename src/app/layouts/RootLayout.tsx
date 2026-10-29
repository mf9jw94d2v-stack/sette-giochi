import { Link, Outlet, useLocation, useMatches } from "react-router-dom";
import { Navbar } from "@/components/navigation/Navbar";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SaveNotice } from "@/features/sync/SaveNotice";
import { useDocumentTitle } from "./useDocumentTitle";
import { GuestImportBanner } from "@/features/sync/GuestImportBanner";
import { SessionExpiredBanner } from "@/features/sync/SessionExpiredBanner";

/** Set on a route's `handle` to give it the whole viewport. */
export interface RouteHandle {
  immersive?: boolean;
}

export function RootLayout() {
  const { pathname } = useLocation();
  useDocumentTitle();
  // Game pages are their own places: no reading-width column, no page
  // padding, no footer. Everything else keeps the comfortable 72rem column.
  const immersive = useMatches().some(
    (m) => (m.handle as RouteHandle | undefined)?.immersive,
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Vai al contenuto
      </a>
      <Navbar />
      <SessionExpiredBanner />
      <main
        id="main"
        className={
          immersive
            ? "flex w-full flex-1 flex-col"
            : "mx-auto w-full max-w-6xl flex-1 px-4 py-8"
        }
      >
        {/* Scoped to the page, so a crash inside one route keeps the shell —
            navigation and theme — usable instead of blanking the app. Keyed on
            the path so navigating away clears the error instead of carrying it
            to the next page. */}
        <ErrorBoundary key={pathname}>
          {!immersive && <GuestImportBanner />}
          <Outlet />
        </ErrorBoundary>
      </main>
      {!immersive && (
        <footer className="mt-16 border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-sm">
              Sette rompicapo quotidiani, una sola casa. I giochi sono
              implementazioni originali ispirate agli originali citati.
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li>
                <Link to="/profile" className="hover:text-foreground">
                  Profilo
                </Link>
              </li>
              <li>
                <Link to="/settings" className="hover:text-foreground">
                  Impostazioni
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground">
                  Privacy e dati
                </Link>
              </li>
            </ul>
          </div>
        </footer>
      )}
      <SaveNotice />
    </div>
  );
}
