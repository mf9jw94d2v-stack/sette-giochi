# Audit finale — requisito per requisito

_Aggiornato: 29 ottobre 2026._ Documento **vivo**: viene aggiornato a ogni
incremento. Segue la "Checklist obbligatoria" della sezione 35 del master
prompt, nello stesso ordine.

Stati ammessi (sezione 35):

- **COMPLETATO E VERIFICATO**
- **IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO**
- **PARZIALMENTE IMPLEMENTATO**
- **NON IMPLEMENTATO**
- **BLOCCATO DA DIPENDENZA ESTERNA**

## Come leggere le evidenze

| Comando                   | Cosa prova                                                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`       | 0 errori di tipo                                                                                                                 |
| `npm test`                | **278 test** in 29 file: unità, property-based, dataset, database (PGlite)                                                       |
| `npm run test:db`         | solo migrazioni, privilegi e RLS su PostgreSQL                                                                                   |
| `npm run functions:check` | il bundle delle Edge Functions corrisponde al sorgente e gira fuori da Vite                                                      |
| `npm run test:e2e`        | **108 test end-to-end** su desktop e mobile, build ospite e build con account (i sette giochi giocati fino in fondo con account) |
| `npm run build`           | build di produzione; JS caricato all'avvio 463 kB (era 455 kB)                                                                   |
| `npm run quality:check`   | i conteggi del report di qualità sono riproducibili                                                                              |

Ultima esecuzione completa in locale: 29 ottobre 2026, tutti verdi.

------------------------ | ------------------------------------------------------------- |
| `npm run typecheck` | 0 errori di tipo |
| `npm test` | **165 test** unitari / property-based / dataset, 16 file |
| `npm run test:e2e` | **68 test end-to-end** (34 × desktop + mobile) su build reale |
| `npm run build` | build di produzione, bundle principale 451 kB |
| `npm run quality:report` | rigenera `docs/quality-report.md` da un'esecuzione vera |
| `npm run quality:check` | prova che quei conteggi sono riproducibili |

Ultima esecuzione completa in locale: 28 ottobre 2026, tutti verdi (165 unit, 68 e2e, typecheck, lint, formattazione, build, report riproducibile).

---

## 1. Giochi originali

| Requisito                         | Stato                   | Evidenza                                                                                                                      |
| --------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Krillion analizzato e integrato   | COMPLETATO E VERIFICATO | `src/games/krillion/`, 8 test, e2e, giocato nel browser                                                                       |
| Plain analizzato e integrato      | COMPLETATO E VERIFICATO | `src/games/plain/`, 10 test, e2e                                                                                              |
| Fact Map analizzato e integrato   | COMPLETATO E VERIFICATO | `src/games/fact-map/`, 9 test, geometria Natural Earth reale                                                                  |
| Estimania analizzato e integrato  | COMPLETATO E VERIFICATO | `src/games/estimania/`, 10 test, formula verificata                                                                           |
| Size It Up analizzato e integrato | COMPLETATO E VERIFICATO | `src/games/size-it-up/`, ricostruito il 28/10 come confronto visivo di sagome: 34 test unitari + 11 e2e, 22 sagome vettoriali |
| GeoSlice analizzato e integrato   | COMPLETATO E VERIFICATO | `src/games/geoslice/`, 7 test                                                                                                 |
| Gazillion analizzato e integrato  | COMPLETATO E VERIFICATO | `src/games/gazillion/`, formula verificata, 3 file di test                                                                    |

**Limitazioni dichiarate** (dettagli in `docs/game-analysis.md`): la rarità di
Abissi (Krillion) è **pre-autorata**, non misurata sulla folla come
nell'originale. Taglio (GeoSlice) usa dal 29/10 **dati reali**: contorni e città
di Natural Earth, popolazione delle aree urbane (stime, non censimenti); Grecia
e Argentina sono escluse perché una sola città supera metà della popolazione
considerata. Atlante usa Natural Earth 1:50m (laghi non ritagliati). Le sagome
di In Scala sono disegnate in metri con proporzioni pubbliche dove esistono,
semplificate; **il catalogo non contiene animali**.

## 2. Architettura

| Requisito                 | Stato                   | Evidenza                                                               |
| ------------------------- | ----------------------- | ---------------------------------------------------------------------- |
| Motori indipendenti       | COMPLETATO E VERIFICATO | un `engine.ts` per gioco, nessuna regola di gioco nel codice condiviso |
| Componenti condivisi      | COMPLETATO E VERIFICATO | `src/components/`, `GamePlate`, layout, navigazione                    |
| Contratti TypeScript      | COMPLETATO E VERIFICATO | `src/types/game.ts` (`GameModule`, `LevelGenerator`, `LevelValidator`) |
| Struttura modulare        | COMPLETATO E VERIFICATO | `src/games/<id>/`, registrati in `src/games/modules.ts`                |
| Documentazione aggiornata | COMPLETATO E VERIFICATO | 14 file in `docs/`, questo incluso                                     |

## 3. Strumenti

| Requisito                        | Stato                                         | Evidenza                                                                                                                                                                                                   |
| -------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dipendenze necessarie installate | COMPLETATO E VERIFICATO                       | `package.json`, `npm ci` in CI                                                                                                                                                                             |
| Versioni compatibili             | COMPLETATO E VERIFICATO                       | build + test verdi                                                                                                                                                                                         |
| shadcn/ui                        | NON IMPLEMENTATO (scelta motivata)            | componenti equivalenti scritti a mano con `cva`; shadcn non è una dipendenza ma un generatore di codice, e i suoi template presuppongono typescript-eslint. Vedi ADR-0003                                  |
| Supabase                         | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO | `@supabase/supabase-js` 2.118, migrazioni, Edge Functions; manca un progetto reale                                                                                                                         |
| Zod                              | PARZIALMENTE IMPLEMENTATO (scelta misurata)   | installato e conservato per il confine Supabase. Non usato per i dati locali: costava +91 kB di bundle per validare tre record (ADR-0009); al suo posto type guard scritti a mano, +2,4 kB, stessi 13 test |
| Vitest                           | COMPLETATO E VERIFICATO                       | 165 test                                                                                                                                                                                                   |
| Playwright                       | COMPLETATO E VERIFICATO                       | `playwright.config.ts`, 46 test su build di produzione                                                                                                                                                     |
| fast-check                       | COMPLETATO E VERIFICATO                       | property test in 8 file, incluso `src/services/quality/pipeline.test.ts`                                                                                                                                   |
| GitHub Actions                   | COMPLETATO E VERIFICATO                       | `ci.yml` e `pages.yml` girati su GitHub il 29/10: tutti i job verdi, sito pubblicato                                                                                                                       |
| Nessuna dipendenza ridondante    | COMPLETATO E VERIFICATO                       | `jiti` dichiarato esplicitamente perché usato dagli script                                                                                                                                                 |

## 4. Interfaccia

| Requisito             | Stato                                         | Evidenza                                                                                                                                                                                    |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage              | COMPLETATO E VERIFICATO                       | e2e: i 7 giochi sono visibili                                                                                                                                                               |
| Navigazione           | COMPLETATO E VERIFICATO                       | e2e: tutte le destinazioni raggiungibili                                                                                                                                                    |
| Responsive design     | COMPLETATO E VERIFICATO                       | e2e girano anche su profilo **mobile** (Pixel 7); test esplicito di assenza di overflow orizzontale, anche sui sette giochi prima e dopo l'inizio                                           |
| Pagine di gioco       | COMPLETATO E VERIFICATO                       | sette pagine a tutto schermo con identità propria (`docs/game-identities.md`); verificate nel browser a 1440×900 e 375×812 in intro, partita, rivelazione, risultati                        |
| Pagine piattaforma    | COMPLETATO E VERIFICATO                       | copertine vere dei giochi e una forma per pagina (`docs/platform-design.md`); verificate a 1440×900 (scuro, chiaro in parte) e 375×812, overflow controllato su tutte                       |
| Tema chiaro           | COMPLETATO E VERIFICATO                       | e2e: cambio tema + persistenza dopo reload                                                                                                                                                  |
| Tema scuro            | COMPLETATO E VERIFICATO                       | idem                                                                                                                                                                                        |
| Accessibilità         | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO | audit automatico axe-core (WCAG 2.1 A/AA) su tutte le pagine, i sette giochi e le pagine account, nei due temi: 0 violazioni (`tests/e2e/a11y.spec.ts`). Non fatto: prova con screen reader |
| Stati di caricamento  | COMPLETATO E VERIFICATO                       | fallback su ogni rotta lazy, "Caricamento…" sulle pagine dati                                                                                                                               |
| Gestione degli errori | COMPLETATO E VERIFICATO                       | 404 reale, stati vuoti espliciti, error boundary sulla pagina (`ErrorBoundary`, 4 test): un crash non lascia una pagina bianca e non viene trascinato alla pagina successiva                |

## 5. Account

Backend implementato il 29/10 (dettagli in `docs/ARCHITECTURE.md`). «Non
completamente verificato» significa: testato su PostgreSQL vero (PGlite) e
end-to-end contro un'API Supabase simulata, **non** su un progetto Supabase
reale, che ancora non esiste.

| Requisito                                                           | Stato                                                                                           | Evidenza                                                                                       |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Registrazione con conferma email                                    | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | `/signup`, `/auth/callback`; e2e: registrazione → «Controlla la posta» → link → dentro         |
| Login / Logout / sessione al ricaricamento                          | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | e2e su desktop e mobile, uscita voluta non scambiata per sessione scaduta                      |
| Recupero e reimpostazione password                                  | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | `/forgot-password`, `/reset-password`; e2e dal link alla nuova password; link scaduto spiegato |
| Route private                                                       | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | `RequireAuth`; e2e `/account` → login → ritorno; nessun redirect esterno                       |
| Gestione account (nome, visibilità, password, export, eliminazione) | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | `/account`; e2e per rinomina, nome già usato, eliminazione con parola di conferma              |
| Login con Google                                                    | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | pulsante solo con `VITE_AUTH_GOOGLE_ENABLED=true`; mai provato: servono credenziali OAuth tue  |
| Profilo                                                             | COMPLETATO E VERIFICATO                                                                         | `/profile`: ospite o account, aggregati reali                                                  |
| Persistenza                                                         | COMPLETATO E VERIFICATO (dispositivo) · IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO (account) | stesso `PersistenceAdapter`, adattatore Supabase con coda offline (e2e offline → online)       |
| Sincronizzazione tra dispositivi                                    | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | i risultati stanno nell'account; serve il progetto reale per provarla su due dispositivi       |
| Import dei risultati da ospite                                      | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | offerta una volta, mai automatica, copia locale conservata; SQL testato, e2e                   |

## 6. Sfide giornaliere

| Requisito                       | Stato                                                                                           | Evidenza                                                                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una sfida per gioco e data      | COMPLETATO E VERIFICATO                                                                         | e2e "sette sfide indipendenti"                                                                                                                                                |
| Indipendenza dei sette giochi   | COMPLETATO E VERIFICATO                                                                         | idem                                                                                                                                                                          |
| Assegnazione deterministica     | COMPLETATO E VERIFICATO                                                                         | il seme **è** la data; test di determinismo su tutti e 7 i generatori                                                                                                         |
| Persistenza server-side         | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO                                                   | `daily_results` con `unique (user_id, game_id, challenge_date)`; testato su PostgreSQL (PGlite)                                                                               |
| Protezione dalle duplicazioni   | COMPLETATO E VERIFICATO (dispositivo) · IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO (account) | in locale come prima; con account, vincolo UNIQUE + funzione idempotente (secondo invio → resta il primo), testati in SQL e e2e                                               |
| Test delle richieste simultanee | PARZIALMENTE IMPLEMENTATO                                                                       | invii ripetuti testati; una vera corsa fra due connessioni non è riproducibile su PGlite (una sola connessione). La garanzia è il vincolo UNIQUE con `on conflict do nothing` |
| Gestione del fuso orario        | COMPLETATO E VERIFICATO                                                                         | `VITE_DAILY_TIMEZONE` (UTC), `src/lib/dailyDate.ts` + test; e2e con orologio del dispositivo spostato: nessun risultato doppio per lo stesso giorno                           |

## 7. Archivio e statistiche

| Requisito                           | Stato                   | Evidenza                                                                                                         |
| ----------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Archivio                            | COMPLETATO E VERIFICATO | `/archive`, `/archive/:gioco`, `/archive/:gioco/:data`                                                           |
| Modalità libera                     | COMPLETATO E VERIFICATO | "Allenamento" in ogni gioco                                                                                      |
| Separazione dai risultati ufficiali | COMPLETATO E VERIFICATO | e2e: rigiocare un giorno passato non tocca il risultato ufficiale; la sfida di oggi non è apribile dall'archivio |
| Storico                             | COMPLETATO E VERIFICATO | `/history`, filtrabile, ufficiale vs archivio                                                                    |
| Calendario                          | COMPLETATO E VERIFICATO | `/stats` e `/profile`                                                                                            |
| Streak                              | COMPLETATO E VERIFICATO | regola documentata, 6 test unitari, mai influenzata dall'archivio                                                |
| Statistiche coerenti                | COMPLETATO E VERIFICATO | calcolate dai risultati reali; stati vuoti espliciti, mai valori inventati                                       |

## 8. Livelli

| Requisito               | Stato                                           | Evidenza                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generatori specifici    | COMPLETATO E VERIFICATO                         | 7 generatori distinti, versionati                                                                                                                                                           |
| Validazione strutturale | COMPLETATO E VERIFICATO                         | `validateStructure` per gioco                                                                                                                                                               |
| Verifica indipendente   | COMPLETATO E VERIFICATO (con limiti dichiarati) | `verifySolution` usa un algoritmo distinto. Solo Fact Map raggiunge `verified` (haversine ricalcolato); gli altri sono `heuristic` e il Lab lo mostra gioco per gioco invece di nasconderlo |
| Deduplicazione          | COMPLETATO E VERIFICATO                         | hash sul **contenuto**, mai sull'id; 69 duplicati intercettati su 2555 semi                                                                                                                 |
| Difficoltà              | COMPLETATO E VERIFICATO (euristica dichiarata)  | stima per meccanica in ogni gioco (ADR-0007); distribuzione reale e non degenere per tutti e 7                                                                                              |
| Quarantena              | COMPLETATO E VERIFICATO                         | niente viene pubblicato senza superare entrambi i controlli; motivo registrato; riesame per seme dal Lab; 13 test sui fallimenti                                                            |
| Report di qualità       | COMPLETATO E VERIFICATO                         | `docs/quality-report.md` generato, mai scritto a mano; `quality:check` ne prova la riproducibilità                                                                                          |
| Conteggi reali          | COMPLETATO E VERIFICATO                         | 2486 livelli distinti pubblicati su 365 giorni di semi (erano 956 prima di questo incremento)                                                                                               |
| Riproducibilità         | COMPLETATO E VERIFICATO                         | seme → livello identico, testato su tutti e 7 i giochi                                                                                                                                      |

**Sul requisito "centinaia o migliaia di livelli" (sezione 18).** Su una
finestra di 365 giorni la piattaforma produce 2486 livelli distinti e validati.
Il limite non è più combinatorio: Krillion sceglie 7 prompt su 24, GeoSlice 3
regioni su 20. GeoSlice resta il più povero (81,4 % di validità: su due anni di
semi ricompaiono le stesse terne) — è documentato nel report, non nascosto.

## 9. Sicurezza

Dettagli e limiti in `docs/SECURITY.md`.

| Requisito                   | Stato                                         | Evidenza                                                                                                                                                                                             |
| --------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS e privilegi SQL         | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO | ogni tabella; 30 test SQL con due utenti, ospite e ruolo di servizio; mutazioni intercettate. Non ancora su Supabase reale                                                                           |
| Isolamento degli utenti     | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO | idem; e2e: la pagina non scrive mai direttamente risultati ufficiali                                                                                                                                 |
| Integrità dei punteggi      | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO | ricalcolo per riproduzione (ADR-0011), property test sui 7 giochi, test della funzione su PostgreSQL, bundle provato fuori da Vite. **Limite**: soluzioni leggibili nel bundle, tempo non verificato |
| Segreti protetti            | COMPLETATO E VERIFICATO                       | nessun segreto nel repository; chiave privilegiata nel frontend rifiutata (testato)                                                                                                                  |
| Funzioni riservate protette | PARZIALMENTE IMPLEMENTATO                     | Lab escluso dalla build di produzione (ADR-0008), ancora senza ruolo amministratore                                                                                                                  |

## 10. Test e rilascio

| Requisito                  | Stato                                         | Evidenza                                                                                                                                       |
| -------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Test unitari               | COMPLETATO E VERIFICATO                       | 278 in 29 file: motori, punteggi, riproduzione, date, streak, persistenza, servizi, database                                                   |
| Test d'integrazione        | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO | funzione `submit-daily` collegata al database PGlite; e2e contro API Supabase simulata. Manca la prova sul progetto reale                      |
| Test end-to-end            | COMPLETATO E VERIFICATO                       | 96: 70 sul build ospite + 26 sul build con account, desktop + mobile                                                                           |
| Test dei generatori        | COMPLETATO E VERIFICATO                       | property-based su tutti e 7 + pipeline di qualità                                                                                              |
| Test di sicurezza          | IMPLEMENTATO, MA NON COMPLETAMENTE VERIFICATO | RLS, privilegi, punteggi falsificati, token falsi, redirect esterni, chiavi privilegiate (elenco in `docs/SECURITY.md`). Non su Supabase reale |
| Build                      | COMPLETATO E VERIFICATO                       | `npm run build` verde, code splitting per gioco                                                                                                |
| Documentazione             | COMPLETATO E VERIFICATO                       | `docs/` allineato al codice                                                                                                                    |
| Preparazione al deployment | COMPLETATO E VERIFICATO (preparazione)        | migrazioni, funzioni, `config.toml`, `vercel.json`, passaggi esatti in `docs/DEPLOYMENT.md`. **Nessuna pubblicazione effettuata**              |

---

## Requisiti non ancora soddisfatti — elenco esplicito

Nessuno di questi è nascosto altrove nel documento.

1. **Backend su un progetto reale**: il codice c'è ed è testato in locale;
   applicare migrazioni, pubblicare le funzioni e configurare le email
   richiede il tuo account Supabase (`docs/DEPLOYMENT.md`).
2. **Pubblicazione del sito**: fatta il 29/10 su GitHub Pages, https://mf9jw94d2v-stack.github.io/sette-giochi/ (autorizzata).
3. **Anti-cheat completo**: il server verifica che il punteggio corrisponda
   alle risposte, ma le soluzioni restano nel bundle e il tempo non è
   verificato (ADR-0011).
4. **Login con Google**: pronto ma mai provato, servono credenziali OAuth.
5. **Achievement/XP, funzioni sociali**: non implementati, per scelta.
6. **shadcn/ui**: non adottato (ADR-0003/0004).
7. **Lint TypeScript**: bloccato a monte da typescript-eslint (ADR-0003).
8. **Audit di accessibilità completo** (screen reader, contrasto misurato su
   tutti gli stati) e **Lighthouse**: non eseguiti.
9. ~~CI su GitHub~~: girata il 29/10, tutta verde.
10. **Corsa concorrente reale** sui risultati ufficiali: da provare sul
    database vero.

## Il progetto è concluso?

**No.** I giochi, la piattaforma e il backend sono implementati e testati in
locale; ma il backend non ha ancora girato su Supabase reale e il sito non è
pubblicato. Le due cose dipendono da te: account e autorizzazione.
