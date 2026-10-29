import { BarChart3 } from "lucide-react";
import { GAMES } from "@/games/registry";
import { GameStatsTable } from "@/components/games/GameStatsTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Figures } from "@/components/shared/Figures";
import { PageHeader } from "@/components/shared/PageHeader";
import { Calendar, CalendarLegend } from "./Calendar";
import { calendarDays, gameStats, overallStats } from "./stats";
import { useAllResults } from "./useResults";
import { challengeDate } from "@/lib/dailyDate";

const WEEKS = 16;

export function StatsPage() {
  const today = challengeDate();
  const { daily, archive, isLoading } = useAllResults();

  const overall = overallStats(daily, archive, today);
  const hasData = daily.length > 0 || archive.length > 0;

  return (
    <div>
      <PageHeader
        title="Statistiche"
        description="Calcolate solo dalle partite realmente registrate su questo dispositivo."
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Caricamento statistiche…
        </p>
      ) : !hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Ancora nessun dato"
          description="Gioca la tua prima sfida quotidiana: da lì iniziano serie, calendario e statistiche."
          ctaLabel="Vai alle sfide di oggi"
          ctaTo="/daily"
        />
      ) : (
        <div className="space-y-12">
          <Figures
            items={[
              { label: "Sfide completate", value: overall.dailyCompleted },
              {
                label: "Serie attuale",
                value: overall.streak.current,
                hint: overall.streak.current === 1 ? "giorno" : "giorni",
              },
              {
                label: "Serie migliore",
                value: overall.streak.best,
                hint: overall.streak.best === 1 ? "giorno" : "giorni",
              },
              { label: "Giorni attivi", value: overall.daysActive },
            ]}
          />

          <section aria-labelledby="cal-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="cal-heading" className="font-display text-xl font-bold">
                  Calendario
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ultime {WEEKS} settimane. Più il quadrato è pieno, più giochi
                  hai completato quel giorno. Contano solo le sfide ufficiali.
                </p>
              </div>
              <CalendarLegend />
            </div>
            <Calendar days={calendarDays(daily, today, WEEKS * 7)} size="lg" />
          </section>

          <section aria-labelledby="games-heading">
            <h2
              id="games-heading"
              className="mb-3 font-display text-xl font-bold"
            >
              Per gioco
            </h2>
            <GameStatsTable
              rows={GAMES.map((g) => gameStats(g.id, daily, archive, today))}
              today={today}
              caption="Sfide, media, miglior punteggio e serie per ogni gioco"
            />
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Media e miglior punteggio contano solo le sfide ufficiali. I
              punteggi non si confrontano tra giochi diversi: ognuno ha la sua
              scala.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
