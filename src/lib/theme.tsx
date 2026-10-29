import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "sgp-theme";

interface ThemeContextValue {
  /** The user's chosen preference. */
  choice: ThemeChoice;
  /** The theme actually applied right now. */
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
  /** Cycle light -> dark -> system. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Sette Giochi is a dark site by default: with no stored choice, the theme
 * is dark. Light and "follow the system" remain a choice in the settings.
 */
export const DEFAULT_THEME: ThemeChoice = "dark";

function readStoredChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolve(choice: ThemeChoice): ResolvedTheme {
  if (choice === "system") return systemPrefersDark() ? "dark" : "light";
  return choice;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredChoice);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolve(choice),
  );

  const apply = useCallback((next: ResolvedTheme) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    setResolved(next);
  }, []);

  // Apply whenever the choice changes, and remember it (including "system",
  // which is no longer the default and so must be stored to be kept).
  useEffect(() => {
    apply(resolve(choice));
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore */
    }
  }, [choice, apply]);

  // Follow the OS when the preference is "system".
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice, apply]);

  const setChoice = useCallback(
    (next: ThemeChoice) => setChoiceState(next),
    [],
  );

  const toggle = useCallback(() => {
    setChoiceState((c) =>
      c === "light" ? "dark" : c === "dark" ? "system" : "light",
    );
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, resolved, setChoice, toggle }),
    [choice, resolved, setChoice, toggle],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = use(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
