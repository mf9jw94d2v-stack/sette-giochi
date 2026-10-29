import { useEffect, useRef } from "react";
import { parseDay, formatDayMedium } from "@/lib/formatDate";
import type { CalendarDay } from "./stats";

const WEEKDAYS = ["L", "M", "M", "G", "V", "S", "D"];

/** Monday-indexed weekday (0 = Monday). */
function weekdayIndex(date: string): number {
  return (parseDay(date).getUTCDay() + 6) % 7;
}

/**
 * Week-column heatmap of official daily challenges. Intensity = how many of the
 * seven games were completed that day (0–7).
 */
export function Calendar({
  days,
  size = "md",
}: {
  days: CalendarDay[];
  /** "lg": bigger squares, for the pages where the calendar is the subject. */
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "h-4 w-4" : "h-3 w-3";
  // On a narrow screen the weeks scroll sideways: open on the latest ones.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [days.length]);
  if (days.length === 0) return null;
  const pad = weekdayIndex(days[0].date);
  const cells: (CalendarDay | null)[] = [
    ...Array.from({ length: pad }, () => null),
    ...days,
  ];

  return (
    <div className="flex gap-2">
      <div
        className="grid gap-1 pt-0.5 text-[10px] leading-none text-muted-foreground"
        style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
      >
        {WEEKDAYS.map((d, i) => (
          <span
            key={i}
            className={`grid place-items-center ${box.split(" ")[0]}`}
          >
            {i % 2 === 0 ? d : ""}
          </span>
        ))}
      </div>
      <div
        ref={scroller}
        className="grid grid-flow-col gap-1 overflow-x-auto"
        style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
        role="img"
        aria-label="Calendario delle sfide completate"
      >
        {cells.map((cell, i) =>
          cell === null ? (
            <span key={`pad-${i}`} className={box} />
          ) : (
            <span
              key={cell.date}
              title={`${formatDayMedium(cell.date)}: ${cell.count} ${cell.count === 1 ? "gioco" : "giochi"}`}
              className={`${box} rounded-[3px]`}
              style={{
                backgroundColor:
                  cell.count === 0 ? "var(--muted)" : "var(--primary)",
                opacity: cell.count === 0 ? 1 : 0.3 + (0.7 * cell.count) / 7,
              }}
            />
          ),
        )}
      </div>
    </div>
  );
}

export function CalendarLegend() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>meno</span>
      {[0, 1, 3, 5, 7].map((c) => (
        <span
          key={c}
          className="h-3 w-3 rounded-[3px]"
          style={{
            backgroundColor: c === 0 ? "var(--muted)" : "var(--primary)",
            opacity: c === 0 ? 1 : 0.3 + (0.7 * c) / 7,
          }}
        />
      ))}
      <span>più</span>
    </div>
  );
}
