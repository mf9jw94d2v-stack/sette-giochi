import { CountUp } from "@/components/ui/CountUp";
import { cn } from "@/lib/utils";

export interface Figure {
  label: string;
  value: number;
  hint?: string;
}

/**
 * A row of headline figures set as type, not as tiles: a large number, its
 * label, and an optional note, separated by rules.
 */
export function Figures({
  items,
  className,
}: {
  items: Figure[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 border-y border-border lg:grid-cols-4",
        className,
      )}
    >
      {items.map((f, i) => (
        <div
          key={f.label}
          className={cn(
            "flex flex-col py-5 pr-4",
            i % 2 === 1 && "border-l border-border pl-4",
            i > 1 && "border-t border-border lg:border-t-0",
            i === 2 && "lg:border-l lg:pl-4",
          )}
        >
          <dt className="order-2 mt-1 text-sm font-medium">{f.label}</dt>
          <dd className="order-1 font-display text-[clamp(2.25rem,5vw,3.25rem)] font-bold leading-none tabular-nums">
            <CountUp value={f.value} />
          </dd>
          {f.hint && (
            <dd className="order-3 mt-0.5 text-xs text-muted-foreground">
              {f.hint}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
