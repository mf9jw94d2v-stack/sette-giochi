import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GAMES, getGameMeta } from "@/games/registry";
import type { GameId } from "@/types/game";
import { GameCover } from "@/components/games/GameCover";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/features/auth/authContext";
import { isBackendConfigured } from "@/services/supabase/client";
import {
  dailyLeaderboard,
  LEADERBOARD_PAGE,
  myDailyStanding,
  weeklyLeaderboard,
  weekStartOf,
  type LeaderboardRow,
} from "@/services/account/leaderboardService";
import { addDays } from "@/features/stats/stats";
import { challengeDate } from "@/lib/dailyDate";
import { cn } from "@/lib/utils";
import { GAME_SLUG, gameIdFromParam, gamePath } from "@/games/slugs";

type Period = "day" | "week";

function dayLabel(day: string, today: string): string {
  if (day === today) return "Oggi";
  if (day === addDays(today, -1)) return "Ieri";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function weekLabel(monday: string): string {
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
    });
  return `Dal ${fmt(monday)} al ${fmt(addDays(monday, 6))}`;
}

/**
 * One leaderboard per game: the seven games score on different scales, so a
 * single ranking across games would compare the games, not the players.
 */
export function LeaderboardPage() {
  const today = challengeDate();
  const [params, setParams] = useSearchParams();
  const rawGame = params.get("game");
  const gameId: GameId = gameIdFromParam(rawGame) ?? GAMES[0].id;
  const period: Period = params.get("period") === "week" ? "week" : "day";
  const rawDate = params.get("date");
  const anchor =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate <= today
      ? rawDate
      : today;
  const day = anchor;
  const monday = weekStartOf(anchor);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const header = (
    <PageHeader
      title="Classifiche"
      description="Una classifica per gioco, per giorno e per settimana. Contano solo le sfide ufficiali il cui punteggio è stato ricalcolato dal server a partire dalle risposte."
    />
  );

  if (!isBackendConfigured()) {
    return (
      <div>
        {header}
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Le classifiche hanno bisogno del server, e questa installazione non ne
          ha uno: si gioca come ospite e i risultati restano nel browser. Le tue
          statistiche personali sono in{" "}
          <Link
            to="/stats"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Statistiche
          </Link>
          .
        </p>
      </div>
    );
  }

  const prevAnchor = period === "day" ? addDays(day, -1) : addDays(monday, -7);
  const nextAnchor = period === "day" ? addDays(day, 1) : addDays(monday, 7);
  const canGoNext =
    period === "day" ? day < today : addDays(monday, 7) <= today;

  return (
    <div>
      {header}

      <nav
        aria-label="Scegli il gioco"
        className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        <ul className="flex gap-2 sm:grid sm:grid-cols-7">
          {GAMES.map((g) => {
            const active = g.id === gameId;
            return (
              <li key={g.id} className="w-28 shrink-0 sm:w-auto">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => set({ game: GAME_SLUG[g.id] })}
                  className={cn(
                    "cover-link group block w-full rounded-xl p-1 text-left transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "hover:bg-accent",
                  )}
                >
                  <GameCover
                    id={g.id}
                    showName={false}
                    className="aspect-[16/10]"
                  />
                  <span className="block px-1.5 py-1.5 text-sm font-semibold">
                    {g.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
        <div
          role="radiogroup"
          aria-label="Periodo"
          className="inline-flex rounded-lg border border-border p-1"
        >
          {(["day", "week"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={period === p}
              onClick={() => set({ period: p === "day" ? null : "week" })}
              className={cn(
                "h-9 rounded-md px-4 text-sm font-medium",
                period === p
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p === "day" ? "Giorno" : "Settimana"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => set({ date: prevAnchor })}
            aria-label={
              period === "day" ? "Giorno precedente" : "Settimana precedente"
            }
            className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p
            className="min-w-44 text-center text-sm font-medium first-letter:uppercase"
            aria-live="polite"
          >
            {period === "day" ? dayLabel(day, today) : weekLabel(monday)}
          </p>
          <button
            type="button"
            onClick={() =>
              set({ date: nextAnchor > today ? null : nextAnchor })
            }
            disabled={!canGoNext}
            aria-label={
              period === "day" ? "Giorno successivo" : "Settimana successiva"
            }
            className="grid h-10 w-10 place-items-center rounded-lg border border-border hover:bg-accent disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Board
        gameId={gameId}
        period={period}
        day={day}
        monday={monday}
        today={today}
      />
    </div>
  );
}

function Board({
  gameId,
  period,
  day,
  monday,
  today,
}: {
  gameId: GameId;
  period: Period;
  day: string;
  monday: string;
  today: string;
}) {
  const { status } = useAuth();
  const game = getGameMeta(gameId);
  const key = period === "day" ? day : monday;

  const rows = useInfiniteQuery({
    queryKey: ["leaderboard", gameId, period, key, status],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      period === "day"
        ? dailyLeaderboard(gameId, day, pageParam)
        : weeklyLeaderboard(gameId, monday, pageParam),
    getNextPageParam: (last, all) =>
      last.length === LEADERBOARD_PAGE
        ? all.length * LEADERBOARD_PAGE
        : undefined,
  });

  const standing = useQuery({
    queryKey: ["standing", gameId, day, status],
    queryFn: () => myDailyStanding(gameId, day),
    enabled: period === "day" && status === "signed-in",
  });

  const list: LeaderboardRow[] = rows.data?.pages.flat() ?? [];

  return (
    <section aria-labelledby="board-title" className="mt-6">
      <h2 id="board-title" className="sr-only">
        Classifica di {game?.name}
      </h2>

      {period === "day" && status === "signed-in" && standing.data && (
        <p className="mb-4 text-base">
          Sei <strong className="font-semibold">{standing.data.rank}°</strong>{" "}
          su {standing.data.participants}{" "}
          {standing.data.participants === 1 ? "partecipante" : "partecipanti"},
          con {standing.data.score.toLocaleString("it-IT")} punti.
        </p>
      )}
      {status === "signed-out" && (
        <p className="mb-4 text-sm text-muted-foreground">
          <Link
            to="/login?next=/leaderboard"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Accedi
          </Link>{" "}
          per entrare in classifica: le partite da ospite restano sul
          dispositivo.
        </p>
      )}

      {rows.isPending ? (
        <p role="status" className="py-10 text-sm text-muted-foreground">
          Caricamento della classifica…
        </p>
      ) : rows.isError ? (
        <div role="alert" className="py-10">
          <p className="text-base">Non riesco a caricare la classifica.</p>
          <button
            type="button"
            onClick={() => void rows.refetch()}
            className="mt-3 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
          >
            Riprova
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="py-10">
          <p className="text-base">
            Nessun risultato verificato{" "}
            {period === "day" ? "per questo giorno" : "in questa settimana"}.
          </p>
          {day === today && period === "day" && (
            <Link
              to={gamePath(gameId)}
              className="mt-3 inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:brightness-110"
            >
              Gioca la sfida di oggi
            </Link>
          )}
        </div>
      ) : (
        <>
          <table className="w-full text-left text-base">
            <caption className="sr-only">
              Posizione, giocatore e{" "}
              {period === "day" ? "punti" : "punti della settimana"}. A pari
              punti si ha la stessa posizione.
            </caption>
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th scope="col" className="w-16 py-2 font-medium">
                  Pos.
                </th>
                <th scope="col" className="py-2 font-medium">
                  Giocatore
                </th>
                {period === "week" && (
                  <th
                    scope="col"
                    className="hidden py-2 text-right font-medium sm:table-cell"
                  >
                    Giorni
                  </th>
                )}
                <th scope="col" className="py-2 text-right font-medium">
                  Punti
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr
                  key={`${r.username}-${i}`}
                  className={cn(
                    "border-b border-border",
                    r.isMe && "[&>td]:bg-accent",
                  )}
                >
                  <td className="py-3 font-display font-bold tabular-nums">
                    {r.rank}
                  </td>
                  <td className="py-3">
                    <span className="font-medium">
                      {r.displayName ?? r.username}
                    </span>
                    {r.displayName && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        @{r.username}
                      </span>
                    )}
                    {r.isMe && (
                      <span className="ml-2 rounded bg-foreground px-1.5 py-0.5 text-xs font-semibold text-background">
                        Tu
                      </span>
                    )}
                  </td>
                  {period === "week" && (
                    <td className="hidden py-3 text-right tabular-nums sm:table-cell">
                      {r.daysPlayed}/7
                    </td>
                  )}
                  <td className="py-3 text-right font-semibold tabular-nums">
                    {r.score.toLocaleString("it-IT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.hasNextPage && (
            <button
              type="button"
              onClick={() => void rows.fetchNextPage()}
              disabled={rows.isFetchingNextPage}
              className="mt-5 inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-accent disabled:opacity-60"
            >
              {rows.isFetchingNextPage ? "Caricamento…" : "Mostra altri"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
