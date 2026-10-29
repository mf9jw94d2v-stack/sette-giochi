import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { shareResult, type ShareOutcome } from "./share";

const LABEL: Record<ShareOutcome | "idle", string> = {
  idle: "Condividi il risultato",
  shared: "Condiviso",
  copied: "Copiato: incollalo dove vuoi",
  failed: "Non riesco a copiarlo",
};

/**
 * Behaviour only: the look comes from the game, through `className`, so the
 * button is drawn in each game's own language like the rest of its controls.
 */
export function ShareButton({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  const [state, setState] = useState<ShareOutcome | "idle">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 3000);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const out = await shareResult(text);
        if (out) setState(out);
      }}
    >
      <Share2 className="h-4 w-4" aria-hidden="true" />
      <span aria-live="polite">{LABEL[state]}</span>
    </button>
  );
}
