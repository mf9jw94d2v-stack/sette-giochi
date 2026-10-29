import { useEffect, useState } from "react";
import { DEFAULT_TIMEZONE } from "@/lib/dailyDate";

/** Milliseconds until the next challenge day starts (midnight UTC). */
export function msUntilNextChallenge(now: Date = new Date()): number {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return next - now.getTime();
}

export function formatWait(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * "Le prossime sfide tra 5 h 12 min", kept up to date. Only for the UTC day
 * the site uses; with another configured timezone it says nothing rather
 * than something wrong.
 */
export function NextChallenge({ className }: { className?: string }) {
  const [ms, setMs] = useState(() => msUntilNextChallenge());
  useEffect(() => {
    const t = setInterval(() => setMs(msUntilNextChallenge()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (DEFAULT_TIMEZONE !== "UTC") return null;
  return (
    <span className={className}>Le prossime sfide tra {formatWait(ms)}.</span>
  );
}
