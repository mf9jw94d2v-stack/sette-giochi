import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { GAMES } from "@/games/registry";
import { GAME_THEMES } from "@/games/theme";
import { GameCover } from "@/components/games/GameCover";
import { TodayMeter } from "@/components/games/TodayMeter";
import { NextChallenge } from "@/components/games/NextChallenge";
import { PageHeader } from "@/components/shared/PageHeader";
import { CountUp } from "@/components/ui/CountUp";
import { useToday } from "./useToday";
import { formatDayLong } from "@/lib/formatDate";
import { cn } from "@/lib/utils";
import { gamePath } from "@/games/slugs";

/**
 * Today's scoreboard: seven rows, one per game, each saying whether today's
 * challenge is done and with what score. One row is one link.
 */
export function DailyPage() {
  const { today, done, streak, isLoading } = useToday();
  const total = GAMES.length;

  return (
    <div>
      <PageHeader
        title="Sfide di oggi"
        description={
          <>
            <span className="first-letter:uppercase inline-block">
              {formatDayLong(today)}.
            </span>{" "}
            Ogni gioco ha la sua sfida: completarne una non completa le altre, e
            ognuna conta una volta sola.
          </>
        }
        aside={
          <div className="sm:text-right">
            <p className="font-display text-5xl font-bold leading-none tabular-nums">
              {isLoading ? "–" : <CountUp value={done.size} />}
              <span className="text-2xl text-muted-foreground"> / {total}</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              completate
              {streak.current > 0 &&
                `, serie di ${streak.current} ${streak.current === 1 ? "giorno" : "giorni"}`}
            </p>
            {done.size === total && (
              <p className="mt-1 text-sm font-medium">
                <NextChallenge />
              </p>
            )}
          </div>
        }
      />

      <TodayMeter done={done} labels className="mb-8 hidden sm:grid" />

      <section aria-labelledby="daily-heading">
        <h2 id="daily-heading" className="sr-only">
          Le sfide di oggi
        </h2>
        <ol className="border-t border-border">
          {GAMES.map((game) => {
            const result = done.get(game.id);
            return (
              <li key={game.id} className="border-b border-border">
                <Link
                  to={gamePath(game.id)}
                  className="cover-link group grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-4 py-4 sm:grid-cols-[7.5rem_minmax(0,1fr)_auto_auto] sm:gap-x-6"
                >
                  <GameCover
                    id={game.id}
                    showName={false}
                    className="aspect-[4/3]"
                  />
                  <span className="min-w-0">
                    <span className="block font-display text-xl font-bold leading-tight">
                      {game.name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {GAME_THEMES[game.id].mechanic}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-right",
                      result ? "font-medium" : "text-muted-foreground",
                    )}
                  >
                    {result ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-sm text-success">
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Fatta
                        </span>
                        <span className="block font-display text-lg font-bold tabular-nums">
                          {result.score.toLocaleString("it-IT")}
                          <span className="text-sm font-normal text-muted-foreground">
                            {" "}
                            punti
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className="text-sm">Da giocare</span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "hidden h-10 items-center rounded-lg px-4 text-sm font-semibold transition-[filter] sm:inline-flex",
                      result
                        ? "border border-border group-hover:bg-accent"
                        : "bg-primary text-primary-foreground group-hover:brightness-110",
                    )}
                  >
                    {result ? "Risultato" : "Gioca"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
