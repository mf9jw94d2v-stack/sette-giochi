import { useEffect, useRef, useState } from "react";
import { getGameMeta } from "@/games/registry";
import {
  onSaveEvent,
  type SaveEvent,
  type SaveRejection,
} from "@/services/persistence/saveEvents";

const REJECTION: Record<SaveRejection, string> = {
  challenge_closed:
    "la sfida di quel giorno è chiusa. Se succede con la sfida di oggi, controlla data e ora del dispositivo.",
  version_mismatch:
    "il gioco è stato aggiornato mentre giocavi. Ricarica la pagina: la sfida di oggi resta da giocare.",
  invalid: "il server non ha potuto verificare la partita.",
  unauthorized: "la sessione è scaduta. Accedi di nuovo.",
  rate_limited: "troppi salvataggi in poco tempo. Riprova tra un minuto.",
  server_error: "il server non ha risposto. Riprova più tardi.",
};

function describe(
  e: SaveEvent,
): { text: string; tone: "info" | "ok" | "warn" } | null {
  const name = "gameId" in e ? (getGameMeta(e.gameId)?.name ?? "il gioco") : "";
  switch (e.kind) {
    case "saving":
      return null;
    case "saved":
      return e.adjustedScore !== undefined
        ? {
            tone: "warn",
            text: `${name}: risultato salvato. Il server ha ricalcolato il punteggio: ${e.adjustedScore.toLocaleString("it-IT")} punti.`,
          }
        : { tone: "ok", text: `${name}: risultato salvato nel tuo account.` };
    case "already":
      return {
        tone: "info",
        text: `${name}: questa sfida era già nel tuo account, resta il primo risultato.`,
      };
    case "queued":
      return {
        tone: "warn",
        text: `${name}: sei offline. Il risultato è salvato qui e lo invio appena torni in linea.`,
      };
    case "synced":
      return {
        tone: "ok",
        text:
          e.count === 1
            ? "Un risultato in attesa è stato salvato nel tuo account."
            : `${e.count} risultati in attesa sono stati salvati nel tuo account.`,
      };
    case "rejected":
      return {
        tone: "warn",
        text: `${name}: risultato non salvato, ${REJECTION[e.reason]}`,
      };
  }
}

/**
 * Says what happened to a save, in the shell, for a few seconds. Only account
 * saves emit events: saving on the device is instant and silent, as before.
 */
export function SaveNotice() {
  const [notice, setNotice] = useState<{
    id: number;
    text: string;
    tone: "info" | "ok" | "warn";
  } | null>(null);
  const seq = useRef(0);

  useEffect(
    () =>
      onSaveEvent((e) => {
        const d = describe(e);
        if (d) setNotice({ id: ++seq.current, ...d });
      }),
    [],
  );

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(
      () => setNotice(null),
      notice.tone === "warn" ? 9000 : 5000,
    );
    return () => clearTimeout(t);
  }, [notice]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      {notice && (
        <div
          key={notice.id}
          className="pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg"
        >
          <span
            aria-hidden="true"
            className={
              notice.tone === "ok"
                ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success"
                : notice.tone === "warn"
                  ? "mt-1.5 h-2 w-2 shrink-0 rotate-45 bg-primary"
                  : "mt-1.5 h-2 w-2 shrink-0 rounded-full border-2 border-foreground"
            }
          />
          <p className="flex-1">{notice.text}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="-my-1 -mr-1 h-8 rounded-md px-2 text-muted-foreground hover:text-foreground"
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}
