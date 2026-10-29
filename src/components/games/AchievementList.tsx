import { Award } from "lucide-react";
import type { Achievement } from "@/features/stats/achievements";
import { cn } from "@/lib/utils";

/**
 * Milestones as a short list. Earned ones are filled and say so in words;
 * the others show how far along you are. Shape and text, not colour alone.
 */
export function AchievementList({ items }: { items: Achievement[] }) {
  const earned = items.filter((a) => a.earned).length;
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {earned} su {items.length} ottenuti.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((a) => (
          <li
            key={a.id}
            className={cn(
              "flex gap-3 rounded-xl border p-4",
              a.earned ? "border-primary/50 bg-primary/5" : "border-border",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full",
                a.earned
                  ? "bg-primary text-primary-foreground"
                  : "border-2 border-dashed border-border text-muted-foreground",
              )}
            >
              <Award className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold leading-tight">
                {a.title}
              </span>
              <span className="mt-1 block text-sm leading-snug text-muted-foreground">
                {a.rule}
              </span>
              <span className="mt-2 block text-xs font-medium tabular-nums">
                {a.earned ? "Ottenuto" : `${a.progress} su ${a.goal}`}
              </span>
              {!a.earned && a.progress > 0 && (
                <span
                  aria-hidden="true"
                  className="mt-1 block h-1 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full bg-foreground/60"
                    style={{ width: `${(a.progress / a.goal) * 100}%` }}
                  />
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
