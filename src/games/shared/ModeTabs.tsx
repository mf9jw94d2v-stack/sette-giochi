import { useRef, type KeyboardEvent } from "react";
import type { PlayMode } from "./session";

const MODES: { id: PlayMode; label: string }[] = [
  { id: "daily", label: "Oggi" },
  { id: "practice", label: "Allenamento" },
];

/**
 * The Oggi/Allenamento switch, WITHOUT a look of its own.
 *
 * It owns the accessible part — a real tablist, arrow keys move between the
 * two, only the selected tab is in the tab order — and nothing else. Each game
 * passes its own classes, so the switch is a lime toggle in Plain, a pixel
 * command in Krillion and an atlas tab in Fact Map, while behaving the same.
 */
export function ModeTabs({
  value,
  onChange,
  className,
  tabClassName,
  label = "Modalità di gioco",
}: {
  value: PlayMode;
  onChange: (mode: PlayMode) => void;
  className?: string;
  tabClassName: (selected: boolean) => string;
  label?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = MODES.findIndex((m) => m.id === value);
    const next =
      (i + (e.key === "ArrowRight" ? 1 : -1) + MODES.length) % MODES.length;
    onChange(MODES[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={className}
      onKeyDown={onKeyDown}
    >
      {MODES.map((m, i) => {
        const selected = m.id === value;
        return (
          <button
            key={m.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(m.id)}
            className={tabClassName(selected)}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
