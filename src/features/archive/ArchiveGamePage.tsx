import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getGameMeta } from "@/games/registry";
import { GameCover } from "@/components/games/GameCover";
import { DayLegend, DaySquare } from "@/components/games/DayStrip";
import { useAllResults } from "@/features/stats/useResults";
import { addDays } from "@/features/stats/stats";
import { levelIdFor } from "@/games/playable";
import { challengeDate } from "@/lib/dailyDate";
import { formatDayLong, parseDay } from "@/lib/formatDate";

const weekday = new Intl.DateTimeFormat("it-IT", { weekday: "short" });
const month = new Intl.DateTimeFormat("it-IT", { month: "short" });

const PAGE = 14;

export function ArchiveGamePage() {
  const { gameId } = useParams();
  const meta = getGameMeta(gameId ?? "");
  const today = challengeDate();
  const { daily, archive } = useAllResults();
  const [days, setDays] = useState(PAGE);

  const dates = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(today, -(i + 1))),
    [days, today],
  );

  const official = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of daily) {
      if (r.gameId === gameId) m.set(r.challengeDate, r.score);
    }
    return m;
  }, [daily, gameId]);

  const replays = useMemo(() => {
    const m = new Map<string, { n: number; best: number }>();
    for (const r of archive) {
      const cur = m.get(r.levelId);
      m.set(r.levelId, {
        n: (cur?.n ?? 0) + 1,
        best: Math.max(cur?.best ?? 0, r.score),
      });
    }
    return m;
  }, [archive]);

  if (!meta) {
    return (
      <div className="border-y border-border px-6 py-14 text-center">
        <h1 className="font-display text-title font-bold">Gioco non trovato</h1>
        <Link
          to="/archive"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Torna all&apos;archivio
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/archive"
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Archivio
      </Link>

      <header className="mb-8 mt-2 grid items-end gap-6 border-b border-border pb-7 sm:grid-cols-[16rem_minmax(0,1fr)]">
        <GameCover id={meta.id} className="aspect-[16/10]" />
        <div>
          <h1 className="font-display text-title font-bold">
            {meta.name}, giorni passati
          </h1>
          <p className="mt-2.5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Scegli un giorno da rigiocare. Il punteggio finisce in archivio e
            non tocca la sfida ufficiale di quel giorno.
          </p>
        </div>
      </header>

      <DayLegend className="mb-4" />

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {dates.map((date) => {
          const score = official.get(date);
          const replay = replays.get(levelIdFor(meta.id, date));
          const d = parseDay(date);
          return (
            <li key={date}>
              <Link
                to={`/archive/${meta.id}/${date}`}
                aria-label={`Rigioca ${meta.name} di ${formatDayLong(date)}`}
                className="flex h-full min-h-32 flex-col rounded-md border border-border bg-card p-3 transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{weekday.format(d)}</span>
                  <DaySquare
                    state={
                      score !== undefined
                        ? "official"
                        : replay
                          ? "replayed"
                          : "none"
                    }
                  />
                </span>
                <span className="mt-1 font-display text-3xl font-bold leading-none">
                  {d.getUTCDate()}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">
                    {month.format(d)}
                  </span>
                </span>
                <span className="mt-3 text-xs leading-snug">
                  {score !== undefined
                    ? `Ufficiale: ${score.toLocaleString("it-IT")}`
                    : "Non giocata"}
                  {replay && (
                    <span className="block text-muted-foreground">
                      Rigiocata {replay.n} {replay.n === 1 ? "volta" : "volte"},
                      meglio {replay.best.toLocaleString("it-IT")}
                    </span>
                  )}
                </span>
                <span className="mt-auto pt-2 text-sm font-semibold text-primary">
                  Rigioca
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setDays((d) => d + PAGE)}
        className="mt-6 inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium transition-colors hover:bg-accent"
      >
        Mostra altri {PAGE} giorni
      </button>
    </div>
  );
}
