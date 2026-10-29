import { Link } from "react-router-dom";
import { GAMES } from "@/games/registry";
import { GameCover } from "@/components/games/GameCover";
import { gamePath } from "@/games/slugs";

export function NotFound() {
  return (
    <section className="grid items-center gap-10 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <p className="font-display text-[clamp(5rem,16vw,10rem)] font-bold leading-none text-muted-foreground">
          404
        </p>
        <h1 className="mt-2 font-display text-title font-bold">
          Questa pagina non esiste
        </h1>
        <p className="mt-3 max-w-md text-base text-muted-foreground">
          L&apos;indirizzo potrebbe essere sbagliato o la pagina è stata
          spostata. I sette giochi sono ancora tutti qui.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[filter] hover:brightness-110"
          >
            Torna alla home
          </Link>
          <Link
            to="/games"
            className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Vedi i giochi
          </Link>
        </div>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4">
        {GAMES.map((g) => (
          <li key={g.id}>
            <Link to={gamePath(g.id)} className="cover-link block">
              <GameCover id={g.id} showName={false} className="aspect-square" />
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {g.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
