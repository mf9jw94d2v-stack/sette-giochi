import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/authContext";
import {
  guestDataSummary,
  guestImportHandled,
  importGuestResults,
  markGuestImportHandled,
  type GuestSummary,
} from "@/services/account/guestImport";

/**
 * After signing in, offer once to copy what was played as a guest on this
 * device into the account. Never automatic, never deletes the device copy.
 */
export function GuestImportBanner() {
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const [summary, setSummary] = useState<GuestSummary | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    setSummary(null);
    setState("idle");
    if (status !== "signed-in" || !user || guestImportHandled(user.id)) return;
    let active = true;
    void guestDataSummary().then((s) => {
      if (active && s.daily + s.archive > 0) setSummary(s);
    });
    return () => {
      active = false;
    };
  }, [status, user]);

  if (!user || (!summary && state !== "done")) return null;

  async function run() {
    if (!user) return;
    setState("busy");
    try {
      const out = await importGuestResults(user.id);
      const n = out.dailyImported + out.freeImported;
      setResult(
        n === 0
          ? "Non c'era niente di nuovo da aggiungere: il tuo account aveva già questi giorni."
          : `Aggiunti ${n} risultati al tuo account.${out.skipped > 0 ? ` ${out.skipped} non aggiunti perché già presenti o non validi.` : ""} Restano anche su questo dispositivo.`,
      );
      setState("done");
      void queryClient.invalidateQueries({ queryKey: ["results"] });
    } catch {
      setState("error");
    }
  }

  function decline() {
    if (user) markGuestImportHandled(user.id, "declined");
    setSummary(null);
  }

  if (state === "done") {
    return (
      <div
        role="status"
        className="mb-8 rounded-xl border border-border bg-card px-5 py-4 text-sm"
      >
        {result}{" "}
        <button
          type="button"
          onClick={() => setState("idle")}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Chiudi
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Risultati giocati come ospite"
      className="mb-8 rounded-xl border border-border bg-card px-5 py-4"
    >
      <p className="text-base">
        Su questo dispositivo ci sono{" "}
        <strong className="font-semibold">
          {summary!.daily} sfide ufficiali e {summary!.archive} partite
          d&apos;archivio
        </strong>{" "}
        giocate come ospite. Vuoi aggiungerle al tuo account?
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Contano per la tua cronologia e le tue serie, non per le classifiche: il
        server non può verificare partite giocate senza account.
      </p>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          Non sono riuscito ad aggiungerle. Riprova tra poco.
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={run}
          disabled={state === "busy"}
          className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {state === "busy" ? "Aggiunta…" : "Aggiungi al mio account"}
        </button>
        <button
          type="button"
          onClick={decline}
          className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
        >
          No, grazie
        </button>
      </div>
    </section>
  );
}
