import { Link, useParams } from "react-router-dom";
import { getGameMeta } from "@/games/registry";
import { PlaceholderPage } from "@/components/shared/PlaceholderPage";
import type { GameMetadata } from "@/types/game";

const STATO: Record<GameMetadata["status"], string> = {
  planned: "In arrivo",
  prototype: "Anteprima",
  playable: "Giocabile",
};

export function GameDetailPage() {
  const { gameId } = useParams();
  const meta = getGameMeta(gameId ?? "");

  if (!meta) {
    return (
      <PlaceholderPage
        title="Gioco non trovato"
        description={`Nessun gioco corrisponde a "${gameId ?? ""}".`}
        status="Scegli un gioco dall'elenco Giochi."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/games" className="text-sm text-primary hover:underline">
        &larr; Tutti i giochi
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{meta.name}</h1>
      <p className="mt-2 text-muted-foreground">{meta.description}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Categoria</dt>
          <dd className="font-medium">{meta.category}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Stato</dt>
          <dd className="font-medium">{STATO[meta.status]}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground">Originale (riferimento)</dt>
          <dd>
            <a
              href={meta.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              {meta.originalUrl}
            </a>
          </dd>
        </div>
      </dl>
      <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        Il motore giocabile di questo gioco non è ancora pronto. Le sue
        meccaniche verificate sono documentate in{" "}
        <code>docs/game-analysis.md</code> prima dell&apos;implementazione: le
        regole non vengono inventate.
      </div>
    </div>
  );
}
