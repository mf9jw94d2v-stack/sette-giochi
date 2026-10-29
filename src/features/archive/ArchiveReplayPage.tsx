import { Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { getGameMeta } from "@/games/registry";
import { GAME_BOARDS } from "@/games/playable";
import { challengeDate, isChallengeDate } from "@/lib/dailyDate";

function Problem({
  title,
  body,
  to,
  cta,
}: {
  title: string;
  body: string;
  to: string;
  cta: string;
}) {
  // The route is immersive (no page padding), so the message brings its own.
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <p className="font-display text-lg font-semibold">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {body}
        </p>
        <Link
          to={to}
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-all hover:brightness-110"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

export function ArchiveReplayPage() {
  const { gameId, date } = useParams();
  const meta = getGameMeta(gameId ?? "");
  const today = challengeDate();

  if (!meta) {
    return (
      <Problem
        title="Gioco non trovato"
        body="Scegli un gioco dall'archivio."
        to="/archive"
        cta="Vai all'archivio"
      />
    );
  }
  if (!date || !isChallengeDate(date)) {
    return (
      <Problem
        title="Data non valida"
        body="L'archivio usa date nel formato giorno-mese-anno. Scegli un giorno dall'elenco."
        to={`/archive/${meta.id}`}
        cta="Scegli un giorno"
      />
    );
  }
  if (date >= today) {
    return (
      <Problem
        title="Questa sfida è ancora di oggi"
        body="L'archivio parte da ieri. La sfida di oggi si gioca dalla pagina del gioco e conta per la tua serie."
        to={`/games/${meta.id}`}
        cta={`Gioca ${meta.name}`}
      />
    );
  }

  const Board = GAME_BOARDS[meta.id];

  // The game draws its own page — title, back link and the archive notice
  // included — in its own visual language. This route only says which day.
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center text-sm text-muted-foreground">
          Caricamento del gioco…
        </p>
      }
    >
      <Board
        key={`${meta.id}-${date}`}
        mode="practice"
        seed={date}
        context={{ kind: "archive", date, backTo: `/archive/${meta.id}` }}
      />
    </Suspense>
  );
}
