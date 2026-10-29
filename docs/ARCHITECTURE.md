# Architettura

_Aggiornato: 29 ottobre 2026. Descrive ciò che è implementato, non un piano._

## In una frase

Un'applicazione React (SPA) con sette giochi indipendenti e una piattaforma
condivisa; quando è configurato, un backend **Supabase** (PostgreSQL, Auth,
due Edge Functions) conserva account e risultati e **ricalcola i punteggi
ufficiali** dalle risposte. Senza configurazione l'app funziona come prima,
solo come ospite.

```
Browser ──────────────────────────────────────────────────────────────
  Pagine (src/features/*)        Giochi (src/games/<id>/)
        │                          UI propria · motore puro · generatore
        │                          answers.ts (risposte round per round)
        ▼                                   │
  getPersistence()  ◄── AuthProvider sceglie l'adattatore
        │
   ┌────┴─────────────────┐
   │ LocalPersistence      │  ospite: localStorage
   │ SupabasePersistence   │  account: tabelle (lettura, RLS)
   └────┬─────────────────┘   + outbox sul dispositivo se offline
        │ risultati ufficiali: SOLO via Edge Function
        ▼
Supabase ─────────────────────────────────────────────────────────────
  Edge Function submit-daily ─ verifica il token
        │                      rigenera il livello dalla data
        │                      rigioca le risposte (stesso motore)
        ▼                      salva il punteggio ricalcolato
  public.record_verified_daily_result (solo service_role)
  Postgres: profiles · daily_results · free_results · user_preferences
            games · funzioni di classifica · RLS ovunque
  Edge Function delete-account (API admin)
```

## Separazione delle responsabilità

| Livello                       | Dove                                       | Regola                                               |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Interfaccia dei giochi        | `src/games/<id>/*Game.tsx`, CSS proprio    | nessun accesso diretto ai dati                       |
| Meccaniche                    | `engine.ts`, `generator.ts` per gioco      | pure: niente DOM, rete, React                        |
| Risposte                      | `src/games/<id>/answers.ts`                | stato finale → risposte; risposte non fidate → mosse |
| Riproduzione                  | `src/games/replay.ts`                      | gira nel browser e sul server                        |
| Stato della partita condiviso | `src/games/shared/session.ts`              | blocco giornaliero, salvataggio unico                |
| Persistenza                   | `src/services/persistence/`                | un'interfaccia, due adattatori                       |
| Autenticazione                | `src/services/auth/`, `src/features/auth/` | messaggi in italiano, nessun errore grezzo           |
| Profilo, classifiche, import  | `src/services/account/`                    |                                                      |
| Logica server                 | `src/backend/`                             | `Request`/`Response` standard, testata in Node       |
| Database                      | `supabase/migrations/`                     | RLS + privilegi + vincoli                            |

## Perché i sette giochi si collegano senza riscriverli

Tutti salvano tramite `usePersistResult` e controllano la sfida già giocata
con `useDailyLock`, che usano `getPersistence()`. L'`AuthProvider` sostituisce
l'adattatore al login e al logout; ogni gioco passa in più solo le proprie
risposte (`answers`) e la versione del generatore. Le pagine di gioco
attendono che la sessione sia nota (`AuthGate`), così il controllo «già
giocata» guarda nel posto giusto.

## Scelte principali

Vedi `docs/decisions.md`, in particolare ADR-0010 (solo Supabase, nessun
server proprio), ADR-0011 (ricalcolo per riproduzione), ADR-0012 (import
ospite non verificato), ADR-0013 (come è testato).

## Cosa non c'è, di proposito

- **Tabella delle sessioni di gioco**: i livelli si generano nel browser e il
  server verifica a fine partita; una sessione lato server servirebbe solo
  insieme a livelli generati sul server (vedi `docs/SECURITY.md`).
- **Achievement e XP**: rimandati finché il sistema dei risultati non è in
  produzione e verificato su dati veri.
- **Classifica unica fra giochi**: i punteggi hanno scale diverse (da 500 a
  7000), sommarli classificherebbe i giochi, non i giocatori.
- **Funzioni sociali** (amici, inviti): non richieste da nessuna schermata.
