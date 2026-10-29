import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";

/** A compact metric tile. `value` is animated when numeric. */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </div>
      <div
        className="mt-1 font-display text-2xl font-bold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {typeof value === "number" ? <CountUp value={value} /> : value}
      </div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
