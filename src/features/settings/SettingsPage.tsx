import { useState } from "react";
import {
  AlertTriangle,
  Clock,
  Cloud,
  Download,
  Monitor,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  getPersistence,
  LocalPersistenceAdapter,
} from "@/services/persistence";
import { useAuth } from "@/features/auth/authContext";
import { resultKeys } from "@/features/stats/useResults";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { DEFAULT_TIMEZONE } from "@/lib/dailyDate";
import { PageHeader } from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Chiaro", icon: Sun },
  { id: "dark", label: "Scuro", icon: Moon },
  { id: "system", label: "Come il sistema", icon: Monitor },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-x-12 gap-y-4 border-b border-border py-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="min-w-0 lg:pt-1">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const { choice, resolved, setChoice } = useTheme();
  const queryClient = useQueryClient();
  const [confirmErase, setConfirmErase] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { status, user } = useAuth();
  const signedIn = status === "signed-in";

  async function exportData() {
    const data = await getPersistence().exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sette-giochi-dati-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const total = data.dailyResults.length + data.archiveResults.length;
    setNotice(
      `Esportate ${total} partite (${data.dailyResults.length} sfide ufficiali, ${data.archiveResults.length} d'archivio).`,
    );
  }

  async function eraseData() {
    // Always the device copy, never the account: an account is deleted from
    // its own page, on purpose and with a confirmation word.
    await new LocalPersistenceAdapter().eraseAll();
    await queryClient.invalidateQueries({ queryKey: resultKeys.daily });
    await queryClient.invalidateQueries({ queryKey: resultKeys.archive });
    setConfirmErase(false);
    setNotice("Dati cancellati da questo dispositivo.");
  }

  return (
    <div>
      <PageHeader
        title="Impostazioni"
        description="Aspetto, dati e account. Tema e dati del dispositivo valgono su questo browser."
      />

      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg bg-success/10 px-4 py-2.5 text-sm text-success"
        >
          {notice}
        </p>
      )}

      <div className="-mt-8">
        <Section
          title="Tema"
          description="Scegli chiaro, scuro o lascia che segua il sistema operativo. La scelta viene ricordata."
        >
          <div
            role="radiogroup"
            aria-label="Tema"
            className="flex flex-wrap gap-2"
          >
            {THEMES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={choice === id}
                onClick={() => setChoice(id)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
                  choice === id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            In uso adesso: tema {resolved === "dark" ? "scuro" : "chiaro"}.
          </p>
        </Section>

        <Section
          title="Giornata di gioco"
          description="Le sfide giornaliere cambiano a mezzanotte di un fuso orario fisso, uguale per tutti: così la sfida di oggi è la stessa per chiunque e spostare l'orologio del dispositivo non la cambia."
        >
          <p className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <Clock
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            Fuso di riferimento:{" "}
            <code className="font-medium">{DEFAULT_TIMEZONE}</code>
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            È una scelta di configurazione del sito (
            <code>VITE_DAILY_TIMEZONE</code>), non una preferenza personale: se
            fosse modificabile dal giocatore, si potrebbero ottenere più sfide
            ufficiali nello stesso giorno.
          </p>
        </Section>

        <Section
          title="I tuoi dati"
          description={
            signedIn
              ? "I tuoi risultati sono salvati nel tuo account. Puoi scaricarne una copia completa in qualsiasi momento."
              : "I risultati sono salvati nel browser di questo dispositivo. Puoi scaricarne una copia completa in qualsiasi momento."
          }
        >
          <button
            type="button"
            onClick={exportData}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Esporta i miei dati (JSON)
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            {signedIn
              ? "Il file contiene profilo, partite e preferenze del tuo account. "
              : "Il file contiene le tue partite e le tue preferenze. "}
            Cosa salviamo e perché:{" "}
            <Link
              to="/privacy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              privacy e dati
            </Link>
            .
          </p>
        </Section>

        <Section
          title="Account e sincronizzazione"
          description="Con un account ritrovi le tue partite su ogni dispositivo ed entri nelle classifiche."
        >
          {status === "disabled" ? (
            <p className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              <Cloud className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-medium text-foreground">
                  Non disponibile su questa installazione.
                </strong>{" "}
                Non è collegata a un server: si gioca come ospite e i risultati
                restano in questo browser.
              </span>
            </p>
          ) : signedIn ? (
            <p className="text-sm">
              Hai effettuato l&apos;accesso come{" "}
              <strong className="font-medium">{user?.email}</strong>.{" "}
              <Link
                to="/account"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Gestisci l&apos;account
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Link
                to="/login?next=/settings"
                className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
              >
                Accedi
              </Link>
              <Link
                to="/signup?next=/settings"
                className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent"
              >
                Crea un account
              </Link>
            </div>
          )}
        </Section>

        <Section
          title="Cancella i dati di questo dispositivo"
          description={
            signedIn
              ? "Elimina le partite giocate come ospite e le preferenze salvate in questo browser. Il tuo account non viene toccato: per eliminarlo vai alla pagina Account."
              : "Elimina tutte le partite e le preferenze salvate nel browser. Non si può annullare: esporta prima una copia se ti servono."
          }
        >
          {confirmErase ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="flex items-start gap-2 text-sm">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive-text"
                  aria-hidden="true"
                />
                <span>
                  Confermi? Verranno cancellate tutte le sfide ufficiali, le
                  partite d&apos;archivio e le preferenze salvate qui. Serie e
                  statistiche torneranno a zero.
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={eraseData}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-all hover:brightness-110"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Sì, cancella tutto
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmErase(false)}
                  className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmErase(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-destructive-text/50 px-4 text-sm font-medium text-destructive-text transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Cancella i miei dati
            </button>
          )}
        </Section>
      </div>
    </div>
  );
}
