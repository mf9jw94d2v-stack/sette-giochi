import { useState } from "react";
import { History, Check } from "lucide-react";
import { getGameMeta } from "@/games/registry";
import { GameCover } from "@/components/games/GameCover";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { historyEntries, type HistoryEntry } from "@/features/stats/stats";
import { useAllResults } from "@/features/stats/useResults";
import { challengeDate } from "@/lib/dailyDate";
import { formatDayMedium, formatDayRelative } from "@/lib/formatDate";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/authContext";
import type { GameId } from "@/types/game";

type Filter = "all" | "daily" | "archive";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tutte" },
  { id: "daily", label: "Sfide ufficiali" },
  { id: "archive", label: "Archivio" },
];

function groupByDate(entries: HistoryEntry[]): [string, HistoryEntry[]][] {
  const map = new Map<string, HistoryEntry[]>();
  for (const e of entries) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return [...map.entries()];
}

function Row({ entry }: { entry: HistoryEntry }) {
  const meta = getGameMeta(entry.gameId);
  const official = entry.kind === "daily";
  return (
    <li className="flex items-center gap-3 py-3">
      <GameCover
        id={entry.gameId as GameId}
        showName={false}
        className="h-9 w-9 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {meta?.name ?? entry.gameId}
        </span>
        <span className="text-xs text-muted-foreground">
          {official ? "Sfida ufficiale" : "Archivio"}
          {entry.verification === "guest_import" && ", importata da ospite"}
          {entry.verification === "pending" && ", in attesa di invio"}
          {!official &&
            entry.levelDate &&
            entry.levelDate !== entry.date &&
            `, sfida del ${formatDayMedium(entry.levelDate)}`}
        </span>
      </span>
      {entry.won && (
        <Check
          className="h-4 w-4 shrink-0 text-success"
          aria-label="Riuscita"
        />
      )}
      <span className="w-20 shrink-0 text-right font-display text-lg font-bold tabular-nums">
        {entry.score.toLocaleString("it-IT")}
      </span>
    </li>
  );
}

/** Days shown at first, and added by each "Mostra altri giorni". */
const DAYS_PER_PAGE = 30;

export function HistoryPage() {
  const today = challengeDate();
  const { daily, archive, isLoading } = useAllResults();
  const { status } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [days, setDays] = useState(DAYS_PER_PAGE);

  const all = historyEntries(daily, archive);
  const entries = all.filter((e) => filter === "all" || e.kind === filter);
  const allGroups = groupByDate(entries);
  const groups = allGroups.slice(0, days);

  return (
    <div>
      <PageHeader
        title="Cronologia"
        description={
          status === "signed-in"
            ? "Tutte le partite salvate nel tuo account, giorno per giorno. Le sfide ufficiali e le partite d'archivio restano separate."
            : "Tutte le partite registrate su questo dispositivo, giorno per giorno. Le sfide ufficiali e le partite d'archivio restano separate."
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : all.length === 0 ? (
        <EmptyState
          icon={History}
          title="Nessuna partita registrata"
          description="Quando giochi una sfida o una partita d'allenamento la ritrovi qui."
          ctaLabel="Vai alle sfide di oggi"
          ctaTo="/daily"
        />
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Filtra la cronologia"
            className="mb-6 inline-flex rounded-lg border border-border p-1"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => {
                  setFilter(f.id);
                  setDays(DAYS_PER_PAGE);
                }}
                className={cn(
                  "min-h-9 rounded-md px-3.5 text-sm font-medium transition-colors",
                  filter === f.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {entries.length === 0 ? (
            <p className="border-y border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nessuna partita in questa categoria.
            </p>
          ) : (
            <div className="border-t border-border">
              {groups.map(([date, items]) => (
                <section
                  key={date}
                  className="grid gap-x-8 border-b border-border py-4 sm:grid-cols-[11rem_minmax(0,1fr)]"
                >
                  <h2 className="pt-3 font-display text-lg font-bold first-letter:uppercase sm:sticky sm:top-[calc(var(--nav-h)+1rem)] sm:self-start">
                    {formatDayRelative(date, today)}
                    <span className="block text-sm font-normal text-muted-foreground">
                      {items.length}{" "}
                      {items.length === 1 ? "partita" : "partite"}
                    </span>
                  </h2>
                  <ul className="divide-y divide-border">
                    {items.map((e) => (
                      <Row key={e.id} entry={e} />
                    ))}
                  </ul>
                </section>
              ))}
              {allGroups.length > groups.length && (
                <div className="py-6">
                  <button
                    type="button"
                    onClick={() => setDays((d) => d + DAYS_PER_PAGE)}
                    className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-accent"
                  >
                    Mostra altri giorni
                  </button>
                  <span className="ml-3 text-sm text-muted-foreground">
                    {groups.length} di {allGroups.length} giorni
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
