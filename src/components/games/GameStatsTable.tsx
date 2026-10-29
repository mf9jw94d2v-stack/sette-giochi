import { Link } from "react-router-dom";
import { getGameMeta } from "@/games/registry";
import { GameCover } from "@/components/games/GameCover";
import type { GameStats } from "@/features/stats/stats";
import { formatDayRelative } from "@/lib/formatDate";

function num(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("it-IT");
}

/**
 * Per-game figures as a real table: one row per game, the columns a player
 * compares down the page. On a phone the secondary columns step aside.
 */
export function GameStatsTable({
  rows,
  today,
  caption,
}: {
  rows: GameStats[];
  today: string;
  caption: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">
              Gioco
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Sfide
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 text-right font-medium sm:table-cell"
            >
              Media
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Migliore
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-medium">
              Serie
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const meta = getGameMeta(s.gameId);
            const played = s.dailyPlayed > 0 || s.archivePlayed > 0;
            return (
              <tr key={s.gameId} className="border-b border-border">
                <th scope="row" className="py-3 pr-3 font-normal">
                  <Link
                    to={`/games/${s.gameId}`}
                    className="cover-link group flex items-center gap-3"
                  >
                    <GameCover
                      id={s.gameId}
                      showName={false}
                      className="h-10 w-10 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block font-display font-bold group-hover:underline">
                        {meta?.name ?? s.gameId}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {!played
                          ? "Mai giocato"
                          : s.lastPlayed
                            ? `Ultima sfida ${formatDayRelative(s.lastPlayed, today)}${s.archivePlayed > 0 ? `, ${s.archivePlayed} in archivio` : ""}`
                            : `${s.archivePlayed} in archivio`}
                      </span>
                    </span>
                  </Link>
                </th>
                <td className="px-3 py-3 text-right font-display font-semibold tabular-nums">
                  {s.dailyPlayed}
                </td>
                <td className="hidden px-3 py-3 text-right font-display font-semibold tabular-nums sm:table-cell">
                  {num(s.avgScore)}
                </td>
                <td className="px-3 py-3 text-right font-display font-semibold tabular-nums">
                  {num(s.bestScore)}
                </td>
                <td className="py-3 pl-3 text-right font-display font-semibold tabular-nums">
                  {s.streak.current}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
