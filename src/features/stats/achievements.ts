import type {
  ArchiveResultRecord,
  DailyResultRecord,
} from "@/services/persistence";
import { GAME_IDS } from "@/types/game";
import { computeStreak } from "./stats";

/**
 * Personal milestones, computed from the player's own results. They are a
 * mirror, not a reward system: nothing is stored, nothing is ranked, nothing
 * is awarded by the server. Rules are written next to each one.
 */
export interface Achievement {
  id: string;
  title: string;
  /** How to get it, in plain words. */
  rule: string;
  /** Progress towards it, 0..goal. */
  progress: number;
  goal: number;
  earned: boolean;
}

export function achievements(
  daily: readonly DailyResultRecord[],
  archive: readonly ArchiveResultRecord[],
  today: string,
): Achievement[] {
  const days = [...new Set(daily.map((r) => r.challengeDate))];
  const streak = computeStreak(days, today);
  const gamesPlayed = new Set(daily.map((r) => r.gameId)).size;
  const perDay = new Map<string, Set<string>>();
  for (const r of daily) {
    const s = perDay.get(r.challengeDate) ?? new Set<string>();
    s.add(r.gameId);
    perDay.set(r.challengeDate, s);
  }
  const bestDay = Math.max(0, ...[...perDay.values()].map((s) => s.size));
  const wins = daily.filter((r) => r.won).length;

  const make = (
    id: string,
    title: string,
    rule: string,
    progress: number,
    goal: number,
  ): Achievement => ({
    id,
    title,
    rule,
    progress: Math.min(progress, goal),
    goal,
    earned: progress >= goal,
  });

  return [
    make(
      "first",
      "Si comincia",
      "Completa la tua prima sfida ufficiale.",
      daily.length,
      1,
    ),
    make(
      "explorer",
      "Esploratore",
      "Gioca almeno una sfida ufficiale di ognuno dei sette giochi.",
      gamesPlayed,
      GAME_IDS.length,
    ),
    make(
      "full-day",
      "Sette su sette",
      "Completa tutte e sette le sfide nello stesso giorno.",
      bestDay,
      GAME_IDS.length,
    ),
    make(
      "week",
      "Una settimana di fila",
      "Gioca almeno una sfida ufficiale per 7 giorni di fila.",
      streak.best,
      7,
    ),
    make(
      "month",
      "Un mese di fila",
      "Gioca almeno una sfida ufficiale per 30 giorni di fila.",
      streak.best,
      30,
    ),
    make(
      "wins",
      "Venti vittorie",
      "Vinci 20 sfide ufficiali, secondo la regola di ogni gioco.",
      wins,
      20,
    ),
    make(
      "hundred",
      "Cento sfide",
      "Completa 100 sfide ufficiali.",
      daily.length,
      100,
    ),
    make(
      "archivist",
      "Archivista",
      "Rigioca 10 sfide dei giorni passati dall'archivio.",
      archive.length,
      10,
    ),
  ];
}
