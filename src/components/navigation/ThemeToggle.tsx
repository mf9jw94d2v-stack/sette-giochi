import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { choice, toggle } = useTheme();
  const Icon = choice === "light" ? Sun : choice === "dark" ? Moon : Monitor;
  const label =
    choice === "light"
      ? "Tema chiaro"
      : choice === "dark"
        ? "Tema scuro"
        : "Tema di sistema";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${label} (clicca per cambiare)`}
      title={`${label} — clicca per cambiare`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border",
        "bg-card text-card-foreground transition-colors hover:bg-accent",
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
