import { cn } from "@/lib/utils";

export type DayState = "official" | "replayed" | "none";

const WORD: Record<DayState, string> = {
  official: "sfida ufficiale giocata",
  replayed: "rigiocata in archivio",
  none: "non giocata",
};

/**
 * The last days of one game, oldest on the left: a filled square for a day
 * whose official challenge was played, an outlined one for a day replayed
 * from the archive, a faint one for a day never played. Shape, not colour,
 * tells them apart.
 */
export function DayStrip({
  days,
  className,
}: {
  days: { date: string; state: DayState }[];
  className?: string;
}) {
  const official = days.filter((d) => d.state === "official").length;
  const replayed = days.filter((d) => d.state === "replayed").length;
  return (
    <span
      role="img"
      aria-label={`Ultimi ${days.length} giorni: ${official} sfide ufficiali giocate, ${replayed} rigiocate in archivio`}
      className={cn("inline-flex gap-1", className)}
    >
      {days.map((d) => (
        <DaySquare key={d.date} state={d.state} />
      ))}
    </span>
  );
}

export function DaySquare({ state }: { state: DayState }) {
  return (
    <span
      title={WORD[state]}
      className={cn(
        "block h-3 w-3 rounded-[2px]",
        state === "official" && "bg-foreground",
        state === "replayed" && "border-2 border-foreground",
        state === "none" && "bg-muted",
      )}
    />
  );
}

/** The key to the three squares, in words. */
export function DayLegend({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground",
        className,
      )}
    >
      {(Object.keys(WORD) as DayState[]).map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <DaySquare state={s} />
          {WORD[s]}
        </li>
      ))}
    </ul>
  );
}
