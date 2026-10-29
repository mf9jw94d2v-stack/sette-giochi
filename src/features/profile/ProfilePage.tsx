import { Link } from "react-router-dom";
import { Gamepad2 } from "lucide-react";
import { GAME_IDS } from "@/types/game";
import { getGameMeta } from "@/games/registry";
import { GameStatsTable } from "@/components/games/GameStatsTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { Figures } from "@/components/shared/Figures";
import { PageHeader } from "@/components/shared/PageHeader";
import { Calendar } from "@/features/stats/Calendar";
import { calendarDays, gameStats, overallStats } from "@/features/stats/stats";
import { useAllResults } from "@/features/stats/useResults";
import { challengeDate, DEFAULT_TIMEZONE } from "@/lib/dailyDate";
import { useAuth } from "@/features/auth/authContext";

const link = "font-medium text-primary underline-offset-4 hover:underline";

/** Who is playing, and where their results are kept. */
function Identity() {
  const { status, profile, user } = useAuth();
  if (status === "signed-in") {
    return (
      <PageHeader
        title={profile?.displayName ?? profile?.username ?? "Profilo"}
        description={
          <>
            {profile && (
              <>
                <span className="text-foreground">@{profile.username}</span>,
                iscritto dal{" "}
                {new Date(profile.createdAt).toLocaleDateString("it-IT", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .{" "}
              </>
            )}
            I risultati sono salvati nel tuo account
            {user?.email ? ` (${user.email})` : ""} e ti seguono su ogni
            dispositivo.
          </>
        }
        aside={
          <Link
            to="/account"
            className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium hover:bg-accent"
          >
            Gestisci l&apos;account
          </Link>
        }
      />
    );
  }
  return (
    <>
      <PageHeader
        title="Profilo"
        description={
          <>
            Stai giocando come{" "}
            <strong className="font-semibold text-foreground">ospite</strong> su
            questo dispositivo. I risultati restano qui, nel browser.
          </>
        }
      />
      <aside className="mb-10 max-w-3xl border-l-2 border-primary pl-4 text-sm leading-relaxed text-muted-foreground">
        {status === "disabled" ? (
          <>
            <strong className="font-semibold text-foreground">
              Questa installazione non ha account.
            </strong>{" "}
            Non è collegata a un server, quindi non ci sono accesso,
            sincronizzazione né classifiche. Svuotare i dati del browser
            cancella i risultati:{" "}
            <Link to="/settings" className={link}>
              puoi esportarli dalle impostazioni
            </Link>
            .
          </>
        ) : (
          <>
            <strong className="font-semibold text-foreground">
              Con un account i risultati ti seguono ovunque.
            </strong>{" "}
            <Link to="/login?next=/profile" className={link}>
              Accedi
            </Link>{" "}
            o{" "}
            <Link to="/signup?next=/profile" className={link}>
              crea un account
            </Link>
            : potrai aggiungere a quello anche le partite giocate fin qui, ed
            entrare in classifica.
          </>
        )}
      </aside>
    </>
  );
}

/**
 * The player's own page. Everything here is computed from results actually
 * stored — on this device for a guest, in the account once signed in.
 */
export function ProfilePage() {
  const today = challengeDate();
  const { daily, archive, isLoading } = useAllResults();
  const overall = overallStats(daily, archive, today);

  const perGame = GAME_IDS.map((id) => gameStats(id, daily, archive, today))
    .filter((s) => s.dailyPlayed > 0 || s.archivePlayed > 0)
    .sort((a, b) => b.dailyPlayed - a.dailyPlayed);

  // Only call a game a favourite when it is clearly ahead: with a two-way tie
  // the claim would be arbitrary, and "il gioco che apri più spesso" with one
  // single play says nothing at all.
  const top = perGame[0];
  const favourite =
    top &&
    top.dailyPlayed >= 2 &&
    top.dailyPlayed > (perGame[1]?.dailyPlayed ?? 0)
      ? top
      : null;

  return (
    <div>
      <Identity />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento…</p>
      ) : overall.dailyCompleted === 0 && overall.archivePlayed === 0 ? (
        <EmptyState
          icon={Gamepad2}
          title="Non hai ancora giocato"
          description="Gioca la tua prima sfida: da quel momento questa pagina mostra i tuoi progressi reali."
          ctaLabel="Vai alle sfide di oggi"
          ctaTo="/daily"
        />
      ) : (
        <div className="space-y-12">
          <div>
            <Figures
              items={[
                {
                  label: "Sfide completate",
                  value: overall.dailyCompleted,
                  hint: `su ${GAME_IDS.length} giochi`,
                },
                {
                  label: "Serie attuale",
                  value: overall.streak.current,
                  hint: `record ${overall.streak.best}`,
                },
                { label: "Giorni attivi", value: overall.daysActive },
                {
                  label: "Partite d'archivio",
                  value: overall.archivePlayed,
                  hint: "non contano per la serie",
                },
              ]}
            />
            {favourite && (
              <p className="mt-4 text-base">
                Il gioco che apri più spesso è{" "}
                <strong className="font-semibold">
                  {getGameMeta(favourite.gameId)?.name}
                </strong>
                : {favourite.dailyPlayed} sfide
                {favourite.bestScore !== null && (
                  <>
                    , miglior punteggio{" "}
                    {favourite.bestScore.toLocaleString("it-IT")}
                  </>
                )}
                .
              </p>
            )}
          </div>

          <section aria-labelledby="my-games">
            <h2 id="my-games" className="mb-3 font-display text-xl font-bold">
              I tuoi giochi
            </h2>
            <GameStatsTable
              rows={perGame}
              today={today}
              caption="I giochi che hai giocato, con sfide, media, miglior punteggio e serie"
            />
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Media e miglior punteggio contano solo le sfide ufficiali. Le
              partite d&apos;archivio restano fuori da questi numeri.
            </p>
          </section>

          <section aria-labelledby="my-cal">
            <h2 id="my-cal" className="font-display text-xl font-bold">
              Il tuo calendario
            </h2>
            <p className="mb-4 mt-1 max-w-2xl text-sm text-muted-foreground">
              Un quadrato per giorno: più è pieno, più giochi hai completato. Il
              giorno cambia a mezzanotte del fuso{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                {DEFAULT_TIMEZONE}
              </code>
              .
            </p>
            <Calendar days={calendarDays(daily, today, 70)} size="lg" />
          </section>
        </div>
      )}
    </div>
  );
}
