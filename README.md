# Sette Giochi

Sette rompicapo quotidiani in un'unica applicazione: Krillion, Plain, Fact
Map, Estimania, Size It Up, GeoSlice e Gazillion. Ogni giorno ogni gioco ha
una sfida nuova, uguale per tutti; si può rigiocare l'archivio, seguire serie
e statistiche e, con un account, salvare i risultati sul server ed entrare
nelle classifiche.

> **Condividere l'infrastruttura, non le meccaniche.** Ogni gioco ha motore,
> regole, punteggio, generatore e identità visiva propri; la piattaforma unisce
> ciò che sta intorno.

I giochi sono **implementazioni originali ispirate** agli originali citati in
`docs/game-analysis.md`. Nessun asset o dato proprietario è copiato.

## Stato

- **Giocabile e verificato**: i sette giochi, sfide del giorno, archivio,
  statistiche, cronologia, profilo, impostazioni, modalità ospite.
- **Backend implementato e testato in locale, non ancora pubblicato**:
  account (registrazione, conferma email, accesso, recupero password, gestione
  ed eliminazione), salvataggio dei risultati nell'account con punteggio
  ricalcolato dal server, classifiche, import dei risultati da ospite.
  Per accenderlo serve un progetto Supabase: `docs/DEPLOYMENT.md`.

Stato requisito per requisito: `docs/PROJECT_COMPLETENESS_AUDIT.md` e
`docs/final-audit.md`. Nulla è dichiarato fatto se non è implementato **e**
verificato.

## Stack

React 19 · TypeScript 7 · Vite 8 · Tailwind CSS 4 · React Router 7 · TanStack
Query · Supabase (PostgreSQL, Auth, Edge Functions) · Vitest · fast-check ·
PGlite (test del database) · Playwright · GitHub Actions.

## Requisiti

Node.js 24 e npm 11. Per pubblicare il backend: un account Supabase e la sua
CLI (via `npx supabase`).

## Avvio locale

```bash
npm install
```

```bash
npm run dev
```

Senza configurazione si gioca come ospite (risultati nel browser). Per usare
un backend Supabase copia `.env.example` in `.env.local` e compila
`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (la chiave publishable,
mai quella segreta: l'app la rifiuta).

## Variabili d'ambiente

| Variabile                       | A cosa serve                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`             | URL del progetto Supabase                                                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chiave pubblica del browser (vecchio nome accettato: `VITE_SUPABASE_ANON_KEY`) |
| `VITE_AUTH_GOOGLE_ENABLED`      | `true` solo dopo aver configurato Google in Supabase                           |
| `VITE_DAILY_TIMEZONE`           | fuso del giorno di gioco, `UTC` (uguale al database)                           |
| `VITE_ENABLE_QUALITY_LAB`       | include il Quality Lab in una build di produzione                              |

## Comandi

```bash
npm run typecheck        # TypeScript
npm run lint             # ESLint (JS; il TS lo controlla tsc, ADR-0003)
npm run format:check     # Prettier
npm test                 # unit, property-based, generatori, database
npm run test:db          # solo database: migrazioni + RLS su PostgreSQL (PGlite)
npm run test:e2e         # Playwright: build ospite e build con account
npm run build            # build di produzione in dist/
npm run functions:build  # ricompila la logica delle Edge Functions
npm run functions:check  # verifica che sia aggiornata e che giri fuori da Vite
npm run quality:report   # rigenera docs/quality-report.md
```

## Architettura in breve

- `src/games/<id>/` — un gioco: UI, motore puro, generatore, `answers.ts`.
- `src/games/replay.ts` — rigioca le risposte dalla data: lo usa il server.
- `src/services/persistence/` — un'interfaccia, due adattatori (dispositivo,
  account) e la coda offline.
- `src/services/auth`, `src/services/account` — accesso, profilo,
  classifiche, import.
- `src/backend/` — logica delle Edge Functions, testata in Node.
- `supabase/` — migrazioni, funzioni, configurazione.

Dettagli: `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`,
`docs/DEPLOYMENT.md`, decisioni in `docs/decisions.md`.

## Privacy

Come ospite tutto resta nel browser. Con un account il server conserva email
(in Supabase Auth), profilo, risultati e preferenze; esportabili ed
eliminabili dalla pagina Account. Niente pubblicità, analytics o tracciamento.
Vedi la pagina `/privacy` e `docs/privacy-and-data.md`.
