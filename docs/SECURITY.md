# Sicurezza

_Aggiornato: 29 ottobre 2026._ Cosa protegge cosa, e cosa resta scoperto.

## Segreti

- Nel browser arrivano solo l'URL del progetto e la chiave **publishable**
  (o la vecchia anon key), pubbliche per costruzione e limitate da RLS.
- Se per errore viene configurata una chiave segreta (`sb_secret_…`) o una
  `service_role`, l'app **rifiuta di usarla** e lo scrive in console
  (`src/services/supabase/client.ts`, testato).
- La chiave di servizio esiste solo nelle Edge Functions, fornita da Supabase.
- `.env*` è ignorato da Git tranne `.env.example`, che non contiene valori.
- Ricerca di segreti nei file tracciati e nella cronologia: nessuna chiave di
  questo progetto. Vedi `docs/PROJECT_COMPLETENESS_AUDIT.md` per l'unica
  corrispondenza trovata (una chiave publishable pubblica di un sito terzo,
  nelle catture d'analisi).
- I log non contengono dati dei giocatori né token.

## Accesso ai dati

- **RLS attiva su ogni tabella** e privilegi SQL minimi: un giocatore legge
  solo le proprie righe e scrive solo dove serve (dettaglio in
  `docs/DATABASE.md`). Un ospite (`anon`) legge solo `games` e le classifiche.
- I privilegi sono per colonna dove conta: un giocatore non può cambiare il
  proprio `id`, la data di iscrizione o la data di una partita.
- Le classifiche espongono solo nome utente, nome visualizzato e punteggio.

## Integrità dei risultati

| Tipo                          | Come viene protetto                                                                                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sfida ufficiale (classifiche) | scritta solo dalla Edge Function `submit-daily`: token verificato, livello rigenerato dalla data, risposte rigiocate, punteggio ricalcolato; il database rifiuta giorni non aperti, punteggi oltre il massimo e un secondo risultato per lo stesso giorno |
| Versione del gioco            | se il browser ha un generatore diverso da quello del server, il risultato è rifiutato con «ricarica la pagina» invece di essere calcolato su domande diverse                                                                                              |
| Allenamento e archivio        | non competitivi: scritti dal giocatore, con limiti di formato, punteggio e frequenza                                                                                                                                                                      |
| Risultati da ospite importati | ricontrollati in SQL, marcati `guest_import`, **mai in classifica**                                                                                                                                                                                       |

### Cosa NON è protetto (dichiarato)

- **Le risposte si possono leggere dal codice.** I livelli sono generati nel
  browser: chi studia il bundle può conoscere le soluzioni prima di giocare.
  Il server impedisce i punteggi inventati, non questo.
- **Il tempo non è verificato.** Il timer di Krillion e l'uso dell'indizio di
  Fact Map sono applicati solo dal browser.
- Rimedio possibile, non implementato: generare i livelli sul server e
  rivelare la soluzione round per round, con una sessione di gioco lato
  server. Cambia tutti e sette i giochi e richiede rete a ogni round.
- **Limiti di frequenza**: a livello di database per `free_results` e
  preferenze; per le Edge Functions valgono solo i limiti della piattaforma
  Supabase (una sfida ufficiale per gioco e giorno limita comunque ciò che si
  può salvare).

Questo **non è un sistema anti-cheat**: è una verifica che il punteggio
corrisponda alle risposte date.

## Autenticazione

- Supabase Auth, flusso PKCE, sessione salvata nel browser e rinnovata in
  automatico. Conferma email obbligatoria (`supabase/config.toml`).
- Messaggi d'errore che non rivelano se un'email è registrata (registrazione
  e recupero password rispondono allo stesso modo).
- Cambio password dall'account: richiede la password attuale.
- Dopo l'accesso si torna solo a percorsi interni (`safeNextPath`): niente
  redirect verso altri siti (testato e2e).
- Pagine private (`/account`) protette da `RequireAuth`: nulla di privato
  viene mostrato prima che la sessione sia verificata.
- Sessione scaduta: l'app lo dice invece di diventare ospite in silenzio.
- Eliminazione dell'account: Edge Function con API admin, richiede sessione
  valida e la parola di conferma.
- Il Quality Lab resta escluso dalla build di produzione (ADR-0008); non usa
  ancora un ruolo amministratore.

## Test di sicurezza eseguiti

| Cosa                                                                                         | Dove                                               | Esito    |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------- |
| Isolamento fra due utenti, ospite, ruolo di servizio                                         | `src/backend/database.test.ts` (PostgreSQL/PGlite) | superati |
| Privilegi per colonna, scritture vietate, funzioni chiuse                                    | idem                                               | superati |
| Punteggio inventato dal client → salvato quello del server                                   | `src/backend/submitDaily.test.ts`                  | superato |
| Token mancante o falso, corpo troppo grande, giorno chiuso, versione diversa                 | idem                                               | superati |
| Rarità di Krillion falsificata, risposte malformate                                          | `src/games/replay.test.ts`                         | superati |
| Chiave privilegiata nel frontend                                                             | `src/services/supabase/client.test.ts`             | superato |
| Redirect esterno dopo login, route privata, nessuna scrittura diretta di risultati ufficiali | `tests/e2e/backend/account.spec.ts`                | superati |

**Non eseguiti** (serve il progetto reale): test contro GoTrue e PostgREST
veri, recapito delle email, comportamento in Deno.
