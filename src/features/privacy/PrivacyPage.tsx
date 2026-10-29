import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { isBackendConfigured } from "@/services/supabase/client";

const link = "font-medium text-primary underline-offset-4 hover:underline";

/**
 * What is stored, where, who sees it, and how to take it back. A plain
 * description of how the app works — not a legal notice, and it says so.
 */
export function PrivacyPage() {
  const accounts = isBackendConfigured();
  return (
    <div>
      <PageHeader
        title="Privacy e dati"
        description="Cosa salva Sette Giochi, dove lo salva e come cancellarlo. È una descrizione di come funziona l'applicazione, non un'informativa legale."
      />
      <div className="max-w-3xl space-y-10 text-base leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-bold">
            Se giochi come ospite
          </h2>
          <p className="mt-2">
            Tutto resta nel tuo browser: risultati delle sfide, partite
            d&apos;archivio e di allenamento, tema e preferenze. Non c&apos;è un
            account e non viene inviato nulla a un server. Svuotare i dati del
            browser li cancella; puoi esportarli o cancellarli dalle{" "}
            <Link to="/settings" className={link}>
              impostazioni
            </Link>
            .
          </p>
        </section>

        {accounts && (
          <section>
            <h2 className="font-display text-xl font-bold">
              Se crei un account
            </h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                <strong className="font-semibold">Email e password</strong>{" "}
                servono solo ad accedere e a recuperare l&apos;accesso. Sono
                gestite dal servizio di autenticazione (Supabase): la password
                non è mai visibile né a noi né agli altri giocatori, e
                l&apos;email non compare mai nelle classifiche.
              </li>
              <li>
                <strong className="font-semibold">Profilo</strong>: nome utente
                (obbligatorio, pubblico), nome visualizzato (facoltativo,
                pubblico), data di iscrizione e la scelta se comparire nelle
                classifiche.
              </li>
              <li>
                <strong className="font-semibold">Risultati</strong>: per ogni
                sfida ufficiale, il gioco, il giorno, le risposte date round per
                round e il punteggio che il server ne ricalcola; per
                l&apos;archivio e l&apos;allenamento, il livello e il punteggio.
                Le risposte servono a verificare il punteggio, nient&apos;altro.
              </li>
              <li>
                <strong className="font-semibold">Preferenze</strong>{" "}
                dell&apos;interfaccia, se le salvi nell&apos;account.
              </li>
            </ul>
            <p className="mt-3">
              Ognuno vede solo i propri dati: lo impone il database stesso, non
              solo l&apos;interfaccia. Gli altri giocatori vedono soltanto nome
              utente, nome visualizzato e punteggi in classifica, e nemmeno
              quelli se scegli di non comparire.
            </p>
          </section>
        )}

        <section>
          <h2 className="font-display text-xl font-bold">Cosa non facciamo</h2>
          <p className="mt-2">
            Niente pubblicità, niente analytics, niente cookie di tracciamento.
            I caratteri tipografici sono caricati da Google Fonts: quella
            richiesta raggiunge i server di Google, come succede su molti siti.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">
            I tuoi diritti, in pratica
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong className="font-semibold">Vedere ed esportare</strong>:
              dalle{" "}
              <Link to="/settings" className={link}>
                impostazioni
              </Link>{" "}
              (ospite) o dalla pagina{" "}
              <Link to="/account" className={link}>
                Account
              </Link>
              , in un file JSON.
            </li>
            <li>
              <strong className="font-semibold">Correggere</strong>: nome
              utente, nome visualizzato e visibilità si cambiano dalla pagina
              Account.
            </li>
            <li>
              <strong className="font-semibold">Cancellare</strong>: «Elimina
              l&apos;account» rimuove account, profilo, risultati e preferenze
              dal server, subito e per sempre.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
