import { useMemo } from "react";
import { GAMES } from "@/games/registry";
import { useAllResults } from "@/features/stats/useResults";
import { overallStats } from "@/features/stats/stats";
import { challengeDate } from "@/lib/dailyDate";
import type { DailyResultRecord } from "@/services/persistence";
import type { GameId } from "@/types/game";

/**
 * Today's official challenges as the platform pages need them: which games
 * are done (with their result), which one to play next, and the streak.
 */
export function useToday() {
  const today = challengeDate();
  const { daily, archive, isLoading } = useAllResults();

  return useMemo(() => {
    const done = new Map<GameId, DailyResultRecord>();
    for (const r of daily) {
      if (r.challengeDate === today) done.set(r.gameId as GameId, r);
    }
    const next = GAMES.find((g) => !done.has(g.id)) ?? null;
    const streak = overallStats(daily, archive, today).streak;
    return { today, done, next, streak, daily, archive, isLoading };
  }, [today, daily, archive, isLoading]);
}
