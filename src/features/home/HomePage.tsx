import { Link } from "react-router-dom";
import { GAMES } from "@/games/registry";
import { GAME_THEMES } from "@/games/theme";
import { DoneTag, GameCover } from "@/components/games/GameCover";
import { TodayMeter } from "@/components/games/TodayMeter";
import { useToday } from "@/features/daily/useToday";
import { formatDayLong } from "@/lib/formatDate";

/**
 * Home: today first. The banner says what day it is and how far you are, and
 * sends you straight to the next game not yet played; below it the seven
 * games, each as a large cover in its own colours.
 */
export function HomePage() {
  const { today, done, next, streak, isLoading } = useToday();
  const total = GAMES.length;

  const progress = isLoading
    ? " "
    : done.size === 0
      ? "Oggi non hai ancora giocato."
      : done.size === total
        ? "Hai completato tutte e sette le sfide di oggi."
        : `Hai completato ${done.size} ${done.size === 1 ? "sfida" : "sfide"} su ${total}.`;

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-10 sm:px-10 sm:py-14">
        {/* editorial line-art illustration — decorative, right side, behind content */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[88%] overflow-hidden sm:w-[64%] lg:w-[54%]"
        >
          <img
            src={`${import.meta.env.BASE_URL}hero-illustration.png`}
            alt=""
            loading="eager"
            draggable={false}
            className="hero-illustration h-full w-full object-cover object-right"
          />
        </div>
        <div className="relative z-10 max-w-xl">
          <p className="text-sm font-medium text-muted-foreground first-letter:uppercase">
            {formatDayLong(today)}
          </p>
          <h1 className="mt-3 text-balance text-display font-bold">
            Sette giochi, una sfida nuova ogni giorno.
          </h1>

          <div className="mt-8 max-w-md">
            <TodayMeter done={done} />
            <p className="mt-3 text-base" role="status">
              {progress}
              {streak.current > 1 && ` Sei a ${streak.current} giorni di fila.`}
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {next ? (
              <Link
                to={`/games/${next.id}`}
                className="inline-flex h-12 items-center rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
              >
                {done.size === 0
                  ? `Inizia da ${next.name}`
                  : `Continua con ${next.name}`}
              </Link>
            ) : (
              <Link
                to="/stats"
                className="inline-flex h-12 items-center rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-[filter,transform] hover:brightness-110 active:scale-[0.98]"
              >
                Guarda le statistiche
              </Link>
            )}
            <Link
              to="/daily"
              className="inline-flex h-12 items-center rounded-lg border border-border bg-background/60 px-5 text-base font-medium transition-colors hover:bg-accent"
            >
              Tutte le sfide di oggi
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="shelf-heading">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="shelf-heading" className="font-display text-2xl font-bold">
            I giochi di oggi
          </h2>
          <Link
            to="/games"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Cosa sono e come si gioca
          </Link>
        </div>

        {/* Large covers, as the home always had them: one per row on a
            phone, two on a tablet, three on a wide screen. */}
        <ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => {
            const result = done.get(game.id);
            return (
              <li key={game.id}>
                <Link
                  to={`/games/${game.id}`}
                  className="cover-link group block"
                >
                  <GameCover
                    id={game.id}
                    nameSize="lg"
                    className="aspect-[16/10]"
                  >
                    {result && <DoneTag />}
                  </GameCover>
                  <span className="mt-3 flex items-baseline justify-between gap-3">
                    <span className="text-base font-semibold">
                      {GAME_THEMES[game.id].mechanic}
                    </span>
                    <span
                      className={
                        result
                          ? "shrink-0 text-sm font-medium tabular-nums"
                          : "shrink-0 text-sm text-muted-foreground"
                      }
                    >
                      {result
                        ? `${result.score.toLocaleString("it-IT")} punti`
                        : "Da giocare"}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {game.tagline}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-label="Altro"
        className="grid gap-x-10 gap-y-6 border-t border-border pt-8 sm:grid-cols-3"
      >
        <MoreLink
          to="/archive"
          title="Archivio"
          text="Hai saltato un giorno? Ogni sfida passata si può rigiocare, senza toccare i risultati ufficiali."
          action="Apri l'archivio"
        />
        <MoreLink
          to="/stats"
          title="Statistiche"
          text={
            streak.current > 0
              ? `Serie attuale: ${streak.current} ${streak.current === 1 ? "giorno" : "giorni"}. La migliore: ${streak.best}.`
              : "Serie, calendario e punteggi per gioco, calcolati dalle tue partite."
          }
          action="Vedi le statistiche"
        />
        <MoreLink
          to="/history"
          title="Cronologia"
          text="Tutte le tue partite, giorno per giorno, ufficiali e d'archivio."
          action="Apri la cronologia"
        />
      </section>
    </div>
  );
}

function MoreLink({
  to,
  title,
  text,
  action,
}: {
  to: string;
  title: string;
  text: string;
  action: string;
}) {
  return (
    <div>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {text}
      </p>
      <Link
        to={to}
        className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        {action}
      </Link>
    </div>
  );
}
