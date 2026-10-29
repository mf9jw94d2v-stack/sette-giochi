import type { GameId } from "@/types/game";
import type {
  ArchiveResultRecord,
  DailyResultRecord,
} from "@/services/persistence";

/** Shift a `YYYY-MM-DD` day by `n` days (UTC-safe). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export interface Streak {
  current: number;
  best: number;
}

/**
 * Streak rule (documented, see docs/game-analysis.md / final-audit):
 * a day counts only when an **official daily** result exists for it. Archive and
 * practice play never affect the streak. The current streak counts back from
 * today; if today hasn't been played yet the streak is still alive from
 * yesterday, and only breaks once a whole day is missed.
 */
export function computeStreak(dates: readonly string[], today: string): Streak {
  const set = new Set(dates);
  if (set.size === 0) return { current: 0, best: 0 };

  const sorted = [...set].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = sorted[i] === addDays(sorted[i - 1], 1) ? run + 1 : 1;
    if (run > best) best = run;
  }

  const yesterday = addDays(today, -1);
  let cursor: string | null = set.has(today)
    ? today
    : set.has(yesterday)
      ? yesterday
      : null;
  let current = 0;
  while (cursor && set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

export interface GameStats {
  gameId: GameId;
  /** Official daily challenges recorded. */
  dailyPlayed: number;
  dailyCompleted: number;
  dailyWon: number;
  bestScore: number | null;
  avgScore: number | null;
  streak: Streak;
  /** Free play — deliberately kept apart from official results. */
  archivePlayed: number;
  archiveBest: number | null;
  lastPlayed: string | null;
}

export function gameStats(
  gameId: GameId,
  daily: readonly DailyResultRecord[],
  archive: readonly ArchiveResultRecord[],
  today: string,
): GameStats {
  const d = daily.filter((r) => r.gameId === gameId);
  const a = archive.filter((r) => r.gameId === gameId);
  const scores = d.map((r) => r.score);
  const dates = d.map((r) => r.challengeDate);
  return {
    gameId,
    dailyPlayed: d.length,
    dailyCompleted: d.filter((r) => r.completed).length,
    dailyWon: d.filter((r) => r.won).length,
    bestScore: scores.length ? Math.max(...scores) : null,
    avgScore: scores.length
      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
      : null,
    streak: computeStreak(dates, today),
    archivePlayed: a.length,
    archiveBest: a.length ? Math.max(...a.map((r) => r.score)) : null,
    lastPlayed: dates.length ? [...dates].sort().at(-1)! : null,
  };
}

export interface OverallStats {
  /** Total official daily results across all games. */
  dailyCompleted: number;
  /** Distinct days with at least one official result. */
  daysActive: number;
  /** Streak over "any game played that day". */
  streak: Streak;
  archivePlayed: number;
  gamesWithData: number;
}

export function overallStats(
  daily: readonly DailyResultRecord[],
  archive: readonly ArchiveResultRecord[],
  today: string,
): OverallStats {
  const dates = [...new Set(daily.map((r) => r.challengeDate))];
  return {
    dailyCompleted: daily.length,
    daysActive: dates.length,
    streak: computeStreak(dates, today),
    archivePlayed: archive.length,
    gamesWithData: new Set(daily.map((r) => r.gameId)).size,
  };
}

export interface CalendarDay {
  date: string;
  /** How many distinct games had an official result that day. */
  count: number;
}

/** The last `days` days ending today, oldest first. */
export function calendarDays(
  daily: readonly DailyResultRecord[],
  today: string,
  days = 56,
): CalendarDay[] {
  const byDate = new Map<string, Set<string>>();
  for (const r of daily) {
    const set = byDate.get(r.challengeDate) ?? new Set<string>();
    set.add(r.gameId);
    byDate.set(r.challengeDate, set);
  }
  const out: CalendarDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    out.push({ date, count: byDate.get(date)?.size ?? 0 });
  }
  return out;
}

/** Unified history entry for the history page. */
export interface HistoryEntry {
  id: string;
  gameId: GameId;
  kind: "daily" | "archive";
  /** `YYYY-MM-DD` for daily, ISO timestamp date for archive. */
  date: string;
  createdAt: string;
  score: number;
  won: boolean;
  /** For archive replays: the day whose level was replayed, when known. */
  levelDate?: string;
  /** Daily only, account only: where the score comes from. */
  verification?: DailyResultRecord["verification"];
}

export function historyEntries(
  daily: readonly DailyResultRecord[],
  archive: readonly ArchiveResultRecord[],
): HistoryEntry[] {
  const fromDaily: HistoryEntry[] = daily.map((r) => ({
    id: `d-${r.gameId}-${r.challengeDate}`,
    gameId: r.gameId,
    kind: "daily",
    date: r.challengeDate,
    createdAt: r.createdAt,
    score: r.score,
    won: r.won,
    verification: r.verification,
  }));
  const fromArchive: HistoryEntry[] = archive.map((r) => {
    // Generators stamp levelId as `${gameId}-${seed}`; for an archive replay of
    // a past daily the seed is that day, which is worth showing.
    const seed = r.levelId.startsWith(`${r.gameId}-`)
      ? r.levelId.slice(r.gameId.length + 1)
      : "";
    return {
      id: `a-${r.id}`,
      gameId: r.gameId,
      kind: "archive",
      date: r.createdAt.slice(0, 10),
      createdAt: r.createdAt,
      score: r.score,
      won: r.won,
      levelDate: /^\d{4}-\d{2}-\d{2}$/.test(seed) ? seed : undefined,
    };
  });
  return [...fromDaily, ...fromArchive].sort((x, y) =>
    y.createdAt.localeCompare(x.createdAt),
  );
}
