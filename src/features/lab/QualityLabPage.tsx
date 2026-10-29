import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FlaskConical,
  Layers,
  RefreshCw,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { GAME_IDS, type Difficulty, type GameId } from "@/types/game";
import { getGameMeta } from "@/games/registry";
import { GAME_THEMES } from "@/games/theme";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFound } from "@/components/shared/NotFound";
import { StatCard } from "@/components/shared/StatCard";
import { challengeDate } from "@/lib/dailyDate";
import { formatDayMedium } from "@/lib/formatDate";
import { cn } from "@/lib/utils";
import { isQualityLabEnabled } from "./access";
import { reviewAll, rereview } from "@/services/quality";
import type { LevelReview, QualityReport } from "@/services/quality";

const WINDOWS = [30, 90, 365, 730] as const;

const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Facile",
  medium: "Media",
  hard: "Difficile",
  expert: "Esperto",
};

const REASON_LABEL: Record<string, string> = {
  "generation-error": "Errore di generazione",
  structure: "Struttura non valida",
  verification: "Verifica indipendente fallita",
  duplicate: "Duplicato",
};

const DIFF_COLOR: Record<Difficulty, string> = {
  easy: "var(--success)",
  medium: "var(--primary)",
  hard: "#d97706",
  expert: "#b91c1c",
};

function pct(v: number | null): string {
  return v === null ? "—" : `${(v * 100).toFixed(1)} %`;
}

function DifficultyBar({
  dist,
  total,
}: {
  dist: Record<Difficulty, number>;
  total: number;
}) {
  if (total === 0)
    return <span className="text-xs text-muted-foreground">nessun dato</span>;
  const order: Difficulty[] = ["easy", "medium", "hard", "expert"];
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {order.map((d) =>
          dist[d] ? (
            <span
              key={d}
              style={{
                width: `${(dist[d] / total) * 100}%`,
                backgroundColor: DIFF_COLOR[d],
              }}
              title={`${DIFF_LABEL[d]}: ${dist[d]}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        {order.map((d) => (
          <span key={d} className="inline-flex items-center gap-1">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: DIFF_COLOR[d] }}
            />
            {DIFF_LABEL[d]} {dist[d]}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuarantineRow({ failure }: { failure: LevelReview }) {
  const [recheck, setRecheck] = useState<LevelReview | null>(null);
  return (
    <li className="border-b border-border px-4 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          {failure.seed}
        </code>
        <Badge variant={failure.status === "rejected" ? "solid" : "muted"}>
          {failure.status === "rejected" ? "Rifiutato" : "In quarantena"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {REASON_LABEL[failure.reason ?? ""] ?? failure.reason}
        </span>
        <button
          type="button"
          onClick={() => setRecheck(rereview(failure.gameId, failure.seed))}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Riesamina
        </button>
      </div>
      {failure.reasons.length > 0 && (
        <ul className="mt-1.5 list-inside list-disc text-xs text-muted-foreground">
          {failure.reasons.slice(0, 4).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {recheck && (
        <p
          className={cn(
            "mt-2 rounded-md px-2.5 py-1.5 text-xs",
            recheck.status === "published"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive-text",
          )}
        >
          {recheck.status === "published"
            ? "Riesame: ora il livello supera entrambi i controlli. (Un duplicato torna valido se riesaminato da solo: il motivo originale era la collisione con un altro seme.)"
            : `Riesame: ancora bloccato — ${recheck.reasons.join("; ")}`}
        </p>
      )}
    </li>
  );
}

export function QualityLabPage() {
  // Second guard: the router already drops this route when the Lab is off,
  // but the page refuses to render on its own too.
  if (!isQualityLabEnabled()) return <NotFound />;
  return <QualityLab />;
}

function QualityLab() {
  const today = challengeDate();
  const [days, setDays] = useState<number>(365);
  const [runId, setRunId] = useState(0);
  const [focus, setFocus] = useState<GameId | "all">("all");

  const report: QualityReport = useMemo(
    // runId is the manual "re-run" dependency: the pipeline is deterministic,
    // so re-running only refreshes the timings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => reviewAll(today, days),
    [today, days, runId],
  );

  const games = report.games.filter(
    (g) => focus === "all" || g.gameId === focus,
  );
  const t = report.totals;

  function exportJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quality-report-${report.seeds.from}_${report.seeds.to}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-title font-bold">
            Game Quality Lab
          </h1>
          <Badge variant="solid">
            <FlaskConical className="h-3 w-3" aria-hidden="true" />
            Strumento tecnico
          </Badge>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Ogni numero di questa pagina viene calcolato adesso, eseguendo per
          davvero generatori e validatori sui semi reali delle sfide
          giornaliere. Non ci sono dati di esempio: se un valore è vuoto,
          significa che non esiste.
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-3 py-2.5">
        <ShieldAlert
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-xs text-muted-foreground">
          Pagina riservata, non collegata dal menu pubblico. In una build di
          produzione esiste solo se attivata esplicitamente (
          <code>VITE_ENABLE_QUALITY_LAB</code>).{" "}
          <strong className="font-medium text-foreground">
            Non è ancora autenticazione:
          </strong>{" "}
          il controllo per ruolo arriverà con Supabase Auth.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Finestra di semi
          </span>
          <div
            role="group"
            aria-label="Giorni analizzati"
            className="inline-flex rounded-lg border border-border p-1"
          >
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={days === w}
                onClick={() => setDays(w)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  days === w
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {w} giorni
              </button>
            ))}
          </div>
        </div>
        <div>
          <label
            htmlFor="lab-game"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Gioco
          </label>
          <select
            id="lab-game"
            value={focus}
            onChange={(e) => setFocus(e.target.value as GameId | "all")}
            className="h-9 rounded-lg border border-border bg-card px-2.5 text-sm"
          >
            <option value="all">Tutti</option>
            {GAME_IDS.map((id) => (
              <option key={id} value={id}>
                {getGameMeta(id)?.name ?? id}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setRunId((n) => n + 1)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Riesegui
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Esporta JSON
        </button>
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        Semi analizzati: {report.seeds.count} giorni, dal{" "}
        {formatDayMedium(report.seeds.from)} al{" "}
        {formatDayMedium(report.seeds.to)}. Esecuzione in {t.totalMs.toFixed(0)}{" "}
        ms.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Layers} label="Livelli generati" value={t.generated} />
        <StatCard
          icon={CheckCircle2}
          label="Pubblicati"
          value={t.published}
          hint={pct(t.generated ? t.published / t.generated : null)}
        />
        <StatCard
          icon={AlertTriangle}
          label="In quarantena"
          value={t.quarantined}
          hint={`di cui ${t.duplicates} duplicati`}
        />
        <StatCard icon={ShieldAlert} label="Rifiutati" value={t.rejected} />
        <StatCard
          icon={Timer}
          label="Tempo totale"
          value={`${t.totalMs.toFixed(0)} ms`}
          hint="generazione + 2 validazioni"
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-display text-lg font-semibold">Per gioco</h2>
        <div className="space-y-3">
          {games.map((g) => {
            const meta = getGameMeta(g.gameId);
            const theme = GAME_THEMES[g.gameId];
            return (
              <article
                key={g.gameId}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: theme?.accent }}
                  />
                  <h3 className="font-display font-semibold">
                    {meta?.name ?? g.gameId}
                  </h3>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {g.generatorVersion}
                  </code>
                  <Badge
                    variant={
                      g.quarantined + g.rejected === 0 ? "success" : "muted"
                    }
                    className="ml-auto"
                  >
                    validità {pct(g.validityRate)}
                  </Badge>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4 lg:grid-cols-7">
                  {[
                    ["Generati", g.generated],
                    ["Validati", g.validated],
                    ["Pubblicati", g.published],
                    ["Distinti", g.distinctLevels],
                    ["Quarantena", g.quarantined],
                    ["Duplicati", g.duplicates],
                    ["Rifiutati", g.rejected],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-display font-semibold tabular-nums">
                        {value as number}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Distribuzione della difficoltà (stima euristica)
                    </h4>
                    <DifficultyBar
                      dist={g.difficultyDistribution}
                      total={g.published}
                    />
                  </div>
                  <div>
                    <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Affidabilità del secondo controllo
                    </h4>
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      <li>
                        Dimostrata da un algoritmo indipendente:{" "}
                        <strong className="text-foreground">
                          {g.confidenceCounts.verified}
                        </strong>
                      </li>
                      <li>
                        Coerenza verificata, non dimostrata:{" "}
                        <strong className="text-foreground">
                          {g.confidenceCounts.heuristic}
                        </strong>
                      </li>
                      <li>
                        Non verificabile automaticamente:{" "}
                        <strong className="text-foreground">
                          {g.confidenceCounts.unverified}
                        </strong>
                      </li>
                    </ul>
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  Tempo medio per livello:{" "}
                  {g.avgMs === null ? "—" : `${g.avgMs.toFixed(3)} ms`}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold">Quarantena</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Nessun livello che non superi entrambi i controlli viene pubblicato.
          La generazione è deterministica, quindi un livello in quarantena si
          riesamina rieseguendo il suo seme: correggi i dati o il generatore e
          il livello esce dalla quarantena da solo.
        </p>
        {games.every((g) => g.failures.length === 0) ? (
          <EmptyState
            icon={CheckCircle2}
            title="Quarantena vuota"
            description="In questa finestra di semi tutti i livelli hanno superato la validazione strutturale, la verifica indipendente e il controllo dei duplicati."
          />
        ) : (
          <div className="space-y-4">
            {games
              .filter((g) => g.failures.length > 0)
              .map((g) => (
                <div key={g.gameId}>
                  <h3 className="mb-2 text-sm font-medium">
                    {getGameMeta(g.gameId)?.name ?? g.gameId} —{" "}
                    {g.failures.length}{" "}
                    {g.failures.length === 1 ? "livello" : "livelli"}
                  </h3>
                  <ul className="overflow-hidden rounded-xl border border-border bg-card">
                    {g.failures.slice(0, 25).map((f) => (
                      <QuarantineRow key={f.seed} failure={f} />
                    ))}
                  </ul>
                  {g.failures.length > 25 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Mostrati i primi 25 di {g.failures.length}. Esporta il
                      JSON per l&apos;elenco completo.
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
