import type { GameId } from "@/types/game";
import { getSupabase } from "@/services/supabase/client";

export const LEADERBOARD_PAGE = 50;

export interface LeaderboardRow {
  rank: number;
  username: string;
  displayName: string | null;
  /** Daily: the score. Weekly: the sum of the week's daily scores. */
  score: number;
  /** Weekly only. */
  daysPlayed?: number;
  isMe: boolean;
}

export interface Standing {
  rank: number;
  participants: number;
  score: number;
}

function toRow(
  r: Record<string, unknown>,
  scoreKey: "score" | "total",
): LeaderboardRow | null {
  const rank = Number(r.rank);
  const score = Number(r[scoreKey]);
  if (
    !Number.isFinite(rank) ||
    !Number.isFinite(score) ||
    typeof r.username !== "string"
  )
    return null;
  return {
    rank,
    username: r.username,
    displayName: typeof r.display_name === "string" ? r.display_name : null,
    score,
    daysPlayed: r.days_played === undefined ? undefined : Number(r.days_played),
    isMe: r.is_me === true,
  };
}

export async function dailyLeaderboard(
  gameId: GameId,
  date: string,
  offset = 0,
): Promise<LeaderboardRow[]> {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("daily_leaderboard", {
    p_game_id: gameId,
    p_challenge_date: date,
    p_limit: LEADERBOARD_PAGE,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toRow(r, "score")).filter((r) => r !== null);
}

export async function weeklyLeaderboard(
  gameId: GameId,
  weekStart: string,
  offset = 0,
): Promise<LeaderboardRow[]> {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("weekly_leaderboard", {
    p_game_id: gameId,
    p_week_start: weekStart,
    p_limit: LEADERBOARD_PAGE,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toRow(r, "total")).filter((r) => r !== null);
}

export async function myDailyStanding(
  gameId: GameId,
  date: string,
): Promise<Standing | null> {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc("my_daily_standing", {
    p_game_id: gameId,
    p_challenge_date: date,
  });
  if (error) throw new Error(error.message);
  const r = data?.[0];
  if (!r) return null;
  return {
    rank: Number(r.rank),
    participants: Number(r.participants),
    score: Number(r.score),
  };
}

/** Monday of the week containing `day` (`YYYY-MM-DD`, UTC calendar). */
export function weekStartOf(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
