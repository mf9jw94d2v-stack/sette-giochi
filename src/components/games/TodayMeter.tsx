import { GAMES } from "@/games/registry";
import { GAME_THEMES } from "@/games/theme";
import { cn } from "@/lib/utils";
import type { GameId } from "@/types/game";

/**
 * Today's seven challenges as seven segments, in registry order. A finished
 * one is filled with its game's own colours; an open one is an empty dashed
 * slot. Filled versus empty carries the meaning, so it reads without colour.
 */
export function TodayMeter({
  done,
  labels = false,
  className,
}: {
  done: ReadonlySet<GameId> | ReadonlyMap<GameId, unknown>;
  /** Show each game's name under its segment. */
  labels?: boolean;
  className?: string;
}) {
  const names = GAMES.filter((g) => done.has(g.id)).map((g) => g.name);
  return (
    <div
      role="img"
      aria-label={
        names.length === 0
          ? "Nessuna sfida completata oggi"
          : `Completate oggi: ${names.join(", ")}`
      }
      className={cn("grid grid-cols-7 gap-1.5", className)}
    >
      {GAMES.map((g) => {
        const t = GAME_THEMES[g.id];
        const isDone = done.has(g.id);
        return (
          <div key={g.id} className="min-w-0">
            <span
              className={cn(
                "block h-2.5 rounded-sm",
                isDone
                  ? "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]"
                  : "border border-dashed border-muted-foreground/50",
              )}
              style={
                isDone
                  ? {
                      background: `linear-gradient(90deg, ${t.from}, ${t.accent})`,
                    }
                  : undefined
              }
            />
            {labels && (
              <span
                className={cn(
                  "mt-1.5 block truncate text-[11px]",
                  isDone ? "font-medium" : "text-muted-foreground",
                )}
              >
                {g.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
