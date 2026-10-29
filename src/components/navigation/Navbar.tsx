import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/authContext";
import { isBackendConfigured } from "@/services/supabase/client";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

/**
 * Only destinations that are actually built. "Classifiche" exists only when
 * there is a server to rank results; without one it would be an empty page.
 */
const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", end: true },
  { to: "/games", label: "Giochi" },
  { to: "/daily", label: "Sfide" },
  { to: "/archive", label: "Archivio" },
  { to: "/stats", label: "Statistiche" },
  { to: "/history", label: "Cronologia" },
  ...(isBackendConfigured()
    ? [{ to: "/leaderboard", label: "Classifiche" }]
    : []),
];

/** Sign-in link for guests, account link once signed in. */
function AccountLink({
  onNavigate,
  mobile = false,
}: {
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const { status, profile } = useAuth();
  if (status === "disabled") return null;
  if (status === "loading")
    return mobile ? null : (
      <span aria-hidden="true" className="hidden h-9 w-20 md:block" />
    );
  const signedIn = status === "signed-in";
  const label = signedIn ? (profile?.username ?? "Account") : "Accedi";
  if (mobile)
    return (
      <NavLink
        to={signedIn ? "/account" : "/login"}
        className={mobileClass}
        onClick={onNavigate}
      >
        {signedIn ? `Account (${label})` : "Accedi o registrati"}
      </NavLink>
    );
  return (
    <NavLink
      to={signedIn ? "/account" : "/login"}
      aria-label={signedIn ? `Account di ${label}` : undefined}
      className={({ isActive }) =>
        cn(
          "hidden h-9 max-w-40 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors md:inline-flex",
          signedIn
            ? "border-border hover:bg-accent"
            : "border-primary bg-primary text-primary-foreground hover:brightness-110",
          isActive && signedIn && "bg-accent",
        )
      }
    >
      {signedIn && (
        <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function deskClass({ isActive }: { isActive: boolean }): string {
  return cn(
    "relative py-5 text-sm font-medium transition-colors",
    isActive
      ? "text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary"
      : "text-muted-foreground hover:text-foreground",
  );
}

function mobileClass({ isActive }: { isActive: boolean }): string {
  return cn(
    "flex h-12 items-center rounded-lg px-3 text-base font-medium transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { status } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <NavLink
          to="/"
          className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight"
        >
          <span
            aria-hidden="true"
            className="grid h-7 w-7 place-items-center rounded-md bg-primary font-display text-sm text-primary-foreground"
          >
            7
          </span>
          Sette Giochi
        </NavLink>

        <nav aria-label="Principale" className="ml-auto hidden gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={deskClass}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <AccountLink />
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border md:hidden"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav
          aria-label="Menu"
          className="border-t border-border bg-background px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={mobileClass}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            {status !== "disabled" && status !== "loading" && (
              <li className="mt-1 border-t border-border pt-2">
                <AccountLink mobile onNavigate={() => setOpen(false)} />
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
