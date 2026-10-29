# Audit di completezza del progetto — stato iniziale

_Redatto il 29 ottobre 2026, prima di qualsiasi modifica, sul commit `79ca180`.
È la fotografia del punto di partenza della direttiva «backend-first». Lo stato
aggiornato dopo i lavori è in fondo, nella sezione «Stato dopo i lavori»._

## Come è stato fatto

- Letti: struttura delle cartelle, `package.json` e lockfile (npm), configurazioni
  di Vite, TypeScript, ESLint, Prettier e Playwright, router, layout, provider,
  hook, servizi, tipi, i sette motori, `.env.example`, `.gitignore`, il workflow
  CI e tutta la documentazione in `docs/`, compreso
  `docs/ui-ux-reverse-engineering/FORENSIC-UI-UX-AUDIT.md` (intero).
- Eseguiti sul codice non modificato:

| Controllo              | Esito                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run typecheck`    | 0 errori                                                                |
| `npm run lint`         | nessun errore (ESLint copre solo i file JS: vedi ADR in `decisions.md`) |
| `npm run format:check` | ok                                                                      |
| `npm test`             | 212/212 test, 22 file                                                   |
| `npm run test:e2e`     | 70/70 (eseguito su questo stesso commit poco prima dell'audit)          |
| `npm run build`        | ok, bundle principale 455 kB                                            |

Non c'erano errori preesistenti da distinguere da quelli nuovi.

- Strumenti disponibili sulla macchina: Node e npm. **Non** sono installati
  Docker, Supabase CLI, PostgreSQL né Deno. Quindi non si può avviare uno stack
  Supabase locale, e non esiste un progetto Supabase remoto a cui collegarsi.

## Legenda

COMPLETO E VERIFICATO · IMPLEMENTATO MA NON VERIFICATO · PARZIALE · ASSENTE ·
DIFETTOSO · BLOCCATO DA DIPENDENZE ESTERNE · NON APPLICABILE

## Stato effettivo

### Giochi e meccaniche

| Requisito                                            | Stato                 | Note                                                                                    |
| ---------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| Sette giochi giocabili (modalità Oggi e Allenamento) | COMPLETO E VERIFICATO | unit + e2e su ogni gioco                                                                |
| Motori puri, livello generato dal seme (data)        | COMPLETO E VERIFICATO | `generator.generate(seed)` deterministico; base per ricalcolare il punteggio sul server |
| Archivio dei giorni passati                          | COMPLETO E VERIFICATO | separato dai risultati ufficiali                                                        |
| Regole consultabili durante la partita (DEF-02)      | COMPLETO E VERIFICATO | `RulesDialog` in tutti e sette                                                          |
| Layout immersivi, niente card strette (DEF-01)       | COMPLETO E VERIFICATO | rotte `handle.immersive`, nessun `max-w-*` sul tabellone                                |
| Sette identità visive distinte                       | COMPLETO E VERIFICATO | CSS e tipografia propri per gioco, `docs/game-identities.md`                            |

### Piattaforma e pagine

| Requisito                                                                   | Stato                 | Note                                               |
| --------------------------------------------------------------------------- | --------------------- | -------------------------------------------------- |
| Home, catalogo, sfide, archivio, statistiche, cronologia, impostazioni, 404 | COMPLETO E VERIFICATO | ridisegnate al commit `79ca180`                    |
| Profilo                                                                     | PARZIALE              | solo ospite: dichiara che gli account non esistono |
| Statistiche e cronologia su dati reali                                      | COMPLETO E VERIFICATO | calcolate dai risultati salvati nel browser        |
| Esportazione e cancellazione dati                                           | COMPLETO E VERIFICATO | solo dati locali                                   |
| Pagine di accesso, registrazione, recupero password                         | ASSENTE               |                                                    |
| Gestione account (nome utente, password, eliminazione)                      | ASSENTE               |                                                    |
| Classifiche                                                                 | ASSENTE               |                                                    |

### Backend, autenticazione, sicurezza

| Requisito                                                  | Stato                 | Note                                                               |
| ---------------------------------------------------------- | --------------------- | ------------------------------------------------------------------ |
| Contratto di persistenza (`PersistenceAdapter`)            | COMPLETO E VERIFICATO | un solo punto da cui salvano tutti e sette i giochi                |
| Adattatore locale (localStorage), dati validati in lettura | COMPLETO E VERIFICATO |                                                                    |
| Adattatore Supabase                                        | ASSENTE               |                                                                    |
| Client Supabase, dipendenza `@supabase/supabase-js`        | ASSENTE               |                                                                    |
| Cartella `supabase/`, migrazioni, schema                   | ASSENTE               | `docs/database-design.md` è solo una bozza                         |
| RLS e privilegi SQL                                        | ASSENTE               |                                                                    |
| Verifica del punteggio sul server                          | ASSENTE               | oggi il punteggio è quello che dice il browser                     |
| Giorno della sfida deciso dal server                       | ASSENTE               | il client usa un fuso fisso (UTC), ma nessuno lo verifica          |
| Un solo risultato ufficiale per gioco e giorno             | PARZIALE              | solo nel browser, aggirabile                                       |
| Autenticazione e route private                             | ASSENTE               |                                                                    |
| Modalità ospite                                            | COMPLETO E VERIFICATO | è l'unica modalità esistente                                       |
| Import dei risultati ospite in un account                  | ASSENTE               |                                                                    |
| Funzionamento offline del salvataggio online               | NON APPLICABILE       | non c'è ancora un salvataggio online                               |
| Quality Lab protetto                                       | PARZIALE              | escluso dalla build di produzione, non è autenticazione (ADR-0008) |

### Segreti e configurazione

| Requisito                                              | Stato                 | Note                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env*` ignorati da Git, solo `.env.example` tracciato | COMPLETO E VERIFICATO | `git ls-files` non contiene file `.env`                                                                                                                                                                                                                                                                                                                                                                          |
| Nessun segreto nel codice o nella cronologia           | COMPLETO E VERIFICATO | ricerca di JWT, chiavi `sb_secret_`/`sb_publishable_`, chiavi private, token GitHub e AWS nei file tracciati e nella cronologia. Unica corrispondenza: una chiave _publishable_ del sito originale di Gazillion, presente nella sua pagina pubblica e catturata in `docs/rea-analysis/evidence/gazillion/practice-scenario.json`. Non è di questo progetto e non è segreta per costruzione; non la riproduco qui |
| `.env.example` usa `VITE_SUPABASE_ANON_KEY`            | DIFETTOSO (lieve)     | il nome attuale di Supabase è «publishable key»; da allineare mantenendo la compatibilità                                                                                                                                                                                                                                                                                                                        |

### Test

| Requisito                                     | Stato                 | Note            |
| --------------------------------------------- | --------------------- | --------------- |
| Unit e property-based sui motori              | COMPLETO E VERIFICATO |                 |
| e2e su build di produzione (desktop + mobile) | COMPLETO E VERIFICATO |                 |
| Test dello schema SQL e delle policy RLS      | ASSENTE               | nessun database |
| Test di autenticazione                        | ASSENTE               |                 |
| Test di isolamento tra due utenti             | ASSENTE               |                 |
| Test di punteggi manipolati                   | ASSENTE               |                 |

### Deployment

| Requisito                                  | Stato                          | Note                                                |
| ------------------------------------------ | ------------------------------ | --------------------------------------------------- |
| Build di produzione riproducibile          | COMPLETO E VERIFICATO          |                                                     |
| Configurazione dell'hosting (redirect SPA) | ASSENTE                        |                                                     |
| URL di callback dell'autenticazione        | ASSENTE                        |                                                     |
| Pubblicazione                              | BLOCCATO DA DIPENDENZE ESTERNE | serve un account di hosting e la tua autorizzazione |

## Problemi architetturali individuati

1. **Il punteggio non è verificabile.** Il browser calcola il punteggio e lo
   salva così com'è. Con un database condiviso, chiunque potrebbe scrivere
   qualsiasi numero in classifica.
2. **Krillion si fida della rarità dichiarata dal client.** La mossa `accept`
   porta con sé il `tier`; il motore lo usa senza ricontrollarlo. Sul server
   bisogna ricalcolarlo dalla risposta.
3. **Le soluzioni sono nel bundle.** I livelli si generano nel browser, quindi
   chi legge il codice può conoscere le risposte. Ricalcolare il punteggio sul
   server impedisce i numeri inventati, non questo. Per impedirlo servirebbe
   generare i livelli sul server e rivelare la soluzione round per round:
   è una riscrittura dei sette giochi, da valutare a parte.
4. **Salvataggio «spara e dimentica».** `usePersistResult` non riporta errori:
   con un backend, un salvataggio fallito sparirebbe in silenzio.
5. **Nessun backend.** Tutto il resto (account, classifiche, sincronizzazione)
   dipende da questo.

## Dipendenze esterne e attività che richiedono credenziali

| Attività                                   | Serve da te                                          |
| ------------------------------------------ | ---------------------------------------------------- |
| Applicare le migrazioni a un database vero | un progetto Supabase (gratuito) e l'accesso alla CLI |
| Pubblicare le Edge Functions               | lo stesso progetto e `supabase login`                |
| Email di conferma e di recupero password   | configurazione SMTP o il servizio email di Supabase  |
| Login con Google (facoltativo)             | credenziali OAuth Google: non configurato            |
| Pubblicazione del sito                     | account di hosting e autorizzazione esplicita        |

## Piano di implementazione (in ordine di dipendenza)

1. Schema dati, migrazioni versionate, RLS e privilegi, provati su un vero
   motore PostgreSQL in locale (PGlite) con due utenti distinti.
2. Funzione di riproduzione delle partite (`replay`): rigenera il livello dal
   giorno e ricalcola il punteggio dalle risposte. Base della verifica.
3. Edge Function `submit-daily`: unico canale per scrivere un risultato
   ufficiale, con il giorno deciso dal server.
4. Client Supabase caricato solo se configurato; `AuthProvider`; pagine di
   accesso, registrazione, recupero e reimpostazione della password; route
   private; gestione dell'account.
5. Adattatore Supabase dietro lo stesso `PersistenceAdapter`, così tutti e sette
   i giochi si collegano senza riscriverli; coda per i salvataggi falliti;
   messaggio visibile sull'esito del salvataggio.
6. Import dei risultati ospite (marcati come non verificati, fuori dalle
   classifiche).
7. Classifiche giornaliere e settimanali per gioco, solo su risultati verificati.
8. Test: SQL/RLS su PGlite, unit dell'adattatore e della funzione, e2e
   dell'autenticazione contro un'API Supabase simulata.
9. Configurazione di hosting, documentazione (README, CLAUDE.md, ARCHITECTURE,
   DATABASE, SECURITY, DEPLOYMENT).

## Stato dopo i lavori (29 ottobre 2026)

| Area                                         | Stato                                              | Note                                                                                                     |
| -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Schema, migrazioni, vincoli, indici          | IMPLEMENTATO MA NON VERIFICATO (su Supabase reale) | testato su PostgreSQL 18 (PGlite), 30 test                                                               |
| RLS e privilegi SQL                          | IMPLEMENTATO MA NON VERIFICATO (su Supabase reale) | due utenti, ospite, ruolo di servizio; mutazioni intercettate                                            |
| Verifica del punteggio sul server            | COMPLETO E VERIFICATO (in locale)                  | riproduzione esatta sui 7 giochi (property test), funzione testata con il database                       |
| Edge Functions                               | IMPLEMENTATO MA NON VERIFICATO (in Deno)           | bundle provato in Node; Deno non installato                                                              |
| Autenticazione e pagine account              | IMPLEMENTATO MA NON VERIFICATO (su Supabase reale) | e2e contro API simulata, desktop e mobile                                                                |
| Collegamento dei sette giochi                | COMPLETO E VERIFICATO (in locale)                  | e2e con account su tutti e sette i giochi, giocati fino in fondo (aggiornato il 29/10, seconda sessione) |
| Cronologia, statistiche, profilo con account | IMPLEMENTATO MA NON VERIFICATO (su Supabase reale) | stesse pagine, dati dall'account; cronologia paginata                                                    |
| Classifiche                                  | IMPLEMENTATO MA NON VERIFICATO (su Supabase reale) | SQL testato; e2e del rendering                                                                           |
| Import da ospite, coda offline               | IMPLEMENTATO MA NON VERIFICATO (su Supabase reale) | SQL e e2e                                                                                                |
| Achievement, XP, funzioni sociali            | ASSENTE                                            | per scelta, motivata in `docs/ARCHITECTURE.md`                                                           |
| Anti-cheat completo                          | PARZIALE                                           | soluzioni nel bundle, tempo non verificato (`docs/SECURITY.md`)                                          |
| Pubblicazione                                | BLOCCATO DA DIPENDENZE ESTERNE                     | `docs/DEPLOYMENT.md`                                                                                     |
| Sette identità visive, layout immersivi      | COMPLETO E VERIFICATO                              | invariati, nessuna regressione negli e2e                                                                 |

Interventi che restano a te: creare il progetto Supabase, eseguire i
comandi di `docs/DEPLOYMENT.md` (login, link, `db push`, deploy delle due
funzioni), configurare URL di redirect e modelli email, scegliere l'hosting e
autorizzare la pubblicazione.
