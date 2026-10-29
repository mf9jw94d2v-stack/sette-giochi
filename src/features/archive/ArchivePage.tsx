import { useMemo } from "react";
import { Link } from "react-router-dom";
import { GAMES } from "@/games/registry";
import { GAME_THEMES } from "@/games/theme";
import { GameCover } from "@/components/games/GameCover";
import {
  DayLegend,
  DayStrip,
  type DayState,
} from "@/components/games/DayStrip";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAllResults } from "@/features/stats/useResults";
import { addDays } from "@/features/stats/stats";
import { levelIdFor } from "@/games/playable";
import { challengeDate } from "@/lib/dailyDate";
import { archivePath } from "@/games/slugs";

const SPAN = 14;

/**
 * The archive is about time, so each game shows its last two weeks at a
 * glance: what was played, what was replayed, what is still there to catch up.
 */
export function ArchivePage() {
  const today = challengeDate();
  const { daily, archive } = useAllResults();

  // Oldest first, ending yesterday: today's challenge is not in the archive.
  const dates = useMemo(
    () => Array.from({ length: SPAN }, (_, i) => addDays(today, -(SPAN - i))),
    [today],
  );

  const officialDays = useMemo(
    () => new Set(daily.map((r) => `${r.gameId}|${r.challengeDate}`)),
    [daily],
  );
  const replayedLevels = useMemo(
    () => new Set(archive.map((r) => r.levelId)),
    [archive],
  );
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of archive) m.set(r.gameId, (m.get(r.gameId) ?? 0) + 1);
    return m;
  }, [archive]);

  return (
    <div>
      <PageHeader
        title="Archivio"
        description="Rigioca la sfida di un giorno passato. Ogni data produce sempre la stessa sfida: puoi recuperare un giorno saltato o riprovare quello andato storto. Le partite d'archivio restano separate: non cambiano i risultati ufficiali, le serie né il calendario."
      />

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg font-bold">
          Le ultime due settimane
        </h2>
        <DayLegend />
      </div>

      <ul className="border-t border-border">
        {GAMES.map((game) => {
          const n = counts.get(game.id) ?? 0;
          const days = dates.map((date) => {
            const state: DayState = officialDays.has(`${game.id}|${date}`)
              ? "official"
              : replayedLevels.has(levelIdFor(game.id, date))
                ? "replayed"
                : "none";
            return { date, state };
          });
          const missing = days.filter((d) => d.state === "none").length;
          return (
            <li key={game.id} className="border-b border-border">
              <Link
                to={archivePath(game.id)}
                className="cover-link group grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:gap-x-6"
              >
                <GameCover
                  id={game.id}
                  showName={false}
                  className="row-span-2 aspect-square sm:row-span-1"
                />
                <span className="min-w-0">
                  <span className="block font-display text-xl font-bold leading-tight">
                    {game.name}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {GAME_THEMES[game.id].mechanic}.{" "}
                    {n === 0
                      ? "Nessuna partita d'archivio."
                      : `${n} ${n === 1 ? "partita" : "partite"} d'archivio.`}
                  </span>
                </span>
                <span className="flex flex-col gap-1.5 sm:items-end">
                  <DayStrip days={days} />
                  <span className="text-xs text-muted-foreground">
                    {missing === 0
                      ? "Nessun giorno da recuperare"
                      : `${missing} ${missing === 1 ? "giorno" : "giorni"} da recuperare`}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
