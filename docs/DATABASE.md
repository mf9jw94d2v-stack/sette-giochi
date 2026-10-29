# Database

_Aggiornato: 29 ottobre 2026._ Schema in `supabase/migrations/` (tre file,
applicati in ordine). Tipi TypeScript corrispondenti in
`src/services/supabase/database.types.ts`, confrontati con lo schema reale da
`src/backend/schemaTypes.test.ts`.

## Tabelle

| Tabella            | Contenuto                                                                              | Lettura         | Scrittura da parte del giocatore                                    |
| ------------------ | -------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------- |
| `games`            | i sette giochi: round e punteggio massimo                                              | tutti           | nessuna                                                             |
| `profiles`         | nome utente (pubblico), nome visualizzato, visibilità in classifica                    | solo il proprio | solo `username`, `display_name`, `show_in_leaderboards` del proprio |
| `daily_results`    | sfide ufficiali: una per (utente, gioco, giorno), con risposte e punteggio ricalcolato | solo le proprie | **nessuna** (scrive la Edge Function)                               |
| `free_results`     | allenamento e archivio                                                                 | solo le proprie | inserire ed eliminare le proprie, max 20 al minuto                  |
| `user_preferences` | chiave/valore dell'interfaccia                                                         | solo le proprie | tutte le operazioni sulle proprie, max 50 chiavi                    |

Email e password non sono in queste tabelle: restano in `auth.users`
(Supabase Auth), mai esposta dall'API.

### Vincoli principali

- `daily_results`: `unique (user_id, game_id, challenge_date)`; punteggio fra 0
  e `games.max_score` (trigger); `verification in ('server_replay',
'guest_import')`; un risultato `server_replay` ha sempre le risposte;
  dimensioni massime di `answers` (8 KB) e `detail` (4 KB).
- `free_results`: `mode in ('archive','practice')` (mai `daily`), formato di
  `level_id`, `created_at` impostato solo dal server.
- `profiles`: nome utente `^[a-z0-9_]{3,20}$`, unico, alcuni nomi riservati;
  nome visualizzato 1–40 caratteri senza caratteri di controllo.
- Cancellare l'utente in `auth.users` cancella profilo, risultati e
  preferenze (`on delete cascade`).

### Indici

`daily_results (game_id, challenge_date, score desc, created_at)` parziale sui
risultati verificati, per le classifiche; `daily_results (user_id,
challenge_date desc)` e `free_results (user_id, created_at desc)` per
cronologia e statistiche personali.

## Funzioni

| Funzione                                            | Chi può chiamarla   | Cosa fa                                                              |
| --------------------------------------------------- | ------------------- | -------------------------------------------------------------------- |
| `record_verified_daily_result(...)`                 | solo `service_role` | inserisce un risultato verificato se il giorno è aperto; idempotente |
| `import_guest_results(daily, free)`                 | utente autenticato  | importa risultati da ospite, ricontrollando ogni riga                |
| `username_available(nome)`                          | tutti               | il nome è libero e valido?                                           |
| `daily_leaderboard(gioco, giorno, limite, offset)`  | tutti               | classifica del giorno, max 100 righe per pagina                      |
| `weekly_leaderboard(gioco, lunedì, limite, offset)` | tutti               | somma settimanale di un gioco                                        |
| `my_daily_standing(gioco, giorno)`                  | utente autenticato  | posizione e partecipanti                                             |
| `private.*`                                         | nessun client       | giorno della sfida, controlli, trigger                               |

**Giorno della sfida**: `private.challenge_day()` usa UTC, come
`VITE_DAILY_TIMEZONE` nel client. Un giorno accetta risultati fino all'una
(UTC) del giorno dopo, per chi ha iniziato poco prima di mezzanotte.

**Regole delle classifiche**: solo risultati `server_replay`; a pari punti
stessa posizione (1, 1, 3); fra pari viene prima chi ha inviato prima; le
posizioni sono calcolate su tutti i partecipanti, chi ha scelto di non
comparire non viene mostrato agli altri.

## Come sono provati

`npm run test:db` (incluso in `npm test`): le migrazioni vengono applicate a
un PostgreSQL vero (PGlite) sopra `supabase/tests/supabase-shim.sql`, che
riproduce i ruoli `anon`/`authenticated`/`service_role`, `auth.uid()` e i
privilegi predefiniti di Supabase. 30 test con due utenti distinti, un ospite
e il ruolo di servizio coprono isolamento, privilegi per colonna, vincoli,
idempotenza, finestra del giorno, limiti di frequenza, import, classifiche e
cancellazione a cascata. Sono stati verificati introducendo apposta una
policy troppo larga e una grant di troppo: i test falliscono.

**Limite**: lo shim non è Supabase. Le migrazioni non sono ancora state
applicate a un progetto reale (vedi `docs/DEPLOYMENT.md`).

## Regole per le migrazioni

- Mai modificare una migrazione già applicata a un database reale: se ne
  aggiunge una nuova.
- Ogni tabella nuova: `enable row level security`, `revoke all ... from anon,
authenticated`, poi grant minime e policy esplicite.
- Funzioni con `set search_path = ''` e nomi qualificati.
- Aggiornare `database.types.ts` e i test in `src/backend/` nello stesso
  commit.
- Niente migrazioni distruttive automatiche in produzione: `db push` si
  esegue a mano, dopo averlo letto.
