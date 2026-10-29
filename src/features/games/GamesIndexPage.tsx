import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import { GAMES } from "@/games/registry";
import { GAME_THEMES } from "@/games/theme";
import { DoneTag, GameCover } from "@/components/games/GameCover";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAllResults } from "@/features/stats/useResults";
import { challengeDate } from "@/lib/dailyDate";
import { cn } from "@/lib/utils";

/** "krillion.cc" from "https://krillion.cc/". */
function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Lowercase and strip accents so "città" matches "citta". */
function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const ALL = "Tutti";

export function GamesIndexPage() {
  const today = challengeDate();
  const { daily } = useAllResults();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);

  const playedToday = useMemo(
    () =>
      new Set(
        daily.filter((r) => r.challengeDate === today).map((r) => r.gameId),
      ),
    [daily, today],
  );

  const categories = useMemo(
    () => [ALL, ...[...new Set(GAMES.map((g) => g.category))].sort()],
    [],
  );

  const results = useMemo(() => {
    const q = norm(query.trim());
    return GAMES.filter((g) => {
      if (category !== ALL && g.category !== category) return false;
      if (!q) return true;
      const haystack = norm(
        [
          g.name,
          g.tagline,
          g.description,
          g.category,
          GAME_THEMES[g.id].mechanic,
        ].join(" "),
      );
      return haystack.includes(q);
    });
  }, [query, category]);

  const filtered = query.trim() !== "" || category !== ALL;

  function reset() {
    setQuery("");
    setCategory(ALL);
  }

  return (
    <div>
      <PageHeader
        title="I sette giochi"
        description="Ognuno ha le sue regole, una sfida nuova ogni giorno e un archivio di tutte quelle passate."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un gioco o una meccanica"
            aria-label="Cerca un gioco o una meccanica"
            className="h-11 w-full rounded-lg border border-input bg-surface pl-9 pr-9 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Cancella la ricerca"
              className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtra per categoria"
        >
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
                category === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs text-muted-foreground" role="status">
        {results.length === GAMES.length
          ? `${GAMES.length} giochi`
          : `${results.length} ${results.length === 1 ? "gioco" : "giochi"} su ${GAMES.length}`}
      </p>

      {results.length === 0 ? (
        <div className="border-y border-border px-6 py-14 text-center">
          <Search
            className="mx-auto h-7 w-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="mt-3 font-display text-lg font-semibold">
            Nessun gioco corrisponde
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Prova con un altro termine, oppure togli i filtri per rivedere tutti
            e sette.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
          >
            Mostra tutti i giochi
          </button>
        </div>
      ) : (
        <ul className="border-t border-border">
          {results.map((game) => {
            const done = playedToday.has(game.id);
            return (
              <li
                key={game.id}
                className="grid gap-x-8 gap-y-4 border-b border-border py-7 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:grid-cols-[19rem_minmax(0,1fr)_auto] lg:items-center"
              >
                {/* The cover repeats the main link, so it is skipped by the
                    keyboard and by screen readers. */}
                <Link
                  to={`/games/${game.id}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="cover-link block"
                >
                  <GameCover id={game.id} className="aspect-[16/10]">
                    {done && <DoneTag label="Fatta oggi" />}
                  </GameCover>
                </Link>

                <div className="min-w-0">
                  <h2 className="font-display text-2xl font-bold leading-tight">
                    {game.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {game.tagline}
                  </p>
                  <p className="mt-3 max-w-prose leading-relaxed">
                    {game.description}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ispirato a{" "}
                    <a
                      href={game.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {host(game.originalUrl)}
                    </a>
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:col-start-2 lg:col-start-auto lg:flex-col lg:items-stretch">
                  <Link
                    to={`/games/${game.id}`}
                    className={cn(
                      "inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold transition-[filter]",
                      done
                        ? "border border-border hover:bg-accent"
                        : "bg-primary text-primary-foreground hover:brightness-110",
                    )}
                  >
                    {done ? "Rivedi il risultato" : "Gioca la sfida di oggi"}
                    <span className="sr-only"> di {game.name}</span>
                  </Link>
                  <Link
                    to={`/archive/${game.id}`}
                    className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    Giorni passati
                    <span className="sr-only"> di {game.name}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered && results.length > 0 && (
        <button
          type="button"
          onClick={reset}
          className="mt-6 text-sm font-medium text-primary hover:underline"
        >
          Togli i filtri
        </button>
      )}
    </div>
  );
}
