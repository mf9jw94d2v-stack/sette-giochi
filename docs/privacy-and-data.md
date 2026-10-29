# Privacy e conservazione dei dati

_Aggiornato: 29 ottobre 2026._ Questo documento descrive **lo stato attuale**
del progetto, non un'intenzione.

> **Aggiornamento del 29 ottobre 2026: account.** Quando l'app è collegata a
> Supabase esistono gli account. Il server conserva allora: email e password
> (in Supabase Auth, mai esposte), profilo (nome utente e nome visualizzato,
> pubblici in classifica salvo scelta contraria), risultati con le risposte
> date (servono a ricalcolare il punteggio) e preferenze. Ognuno legge solo i
> propri dati, imposto dal database (RLS). Esportazione ed eliminazione
> completa dalla pagina Account. Il resto di questo documento descrive la
> modalità ospite, che resta invariata. Pagina per i giocatori: `/privacy`.
>
> Il sito installa un service worker (`public/sw.js`) che conserva nel
> browser i file del sito per l'uso offline: codice, immagini, caratteri. Non
> conserva dati del giocatore né risposte del server.

> Nota: questo è un documento tecnico, non un'informativa privacy legale. Prima
> di una pubblicazione reale serve una verifica legale (vedi "Decisioni che
> richiedono un intervento umano" in fondo).

## 1. Quali dati vengono raccolti

**Nessun dato personale.** Non esistono account, email, nomi, indirizzi IP
registrati, cookie di tracciamento, analytics o pubblicità. Non c'è alcun
server a cui inviare dati: l'applicazione è statica.

Nel browser del giocatore (`localStorage`) vengono salvati soltanto:

| Chiave                | Contenuto                                                                                                           | Perché                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `sgp:daily-results`   | Per ogni sfida ufficiale: gioco, data della sfida, punteggio, esito, dettagli della partita, istante di salvataggio | Mostrare serie, statistiche, cronologia e impedire di registrare due volte la stessa sfida |
| `sgp:archive-results` | Partite d'archivio e allenamento: gioco, livello, punteggio, esito, istante                                         | Cronologia separata, senza toccare i risultati ufficiali                                   |
| `sgp:theme`           | `light` o `dark`                                                                                                    | Ricordare il tema scelto                                                                   |
| `sgp:pref:*`          | Preferenze (es. audio disattivato)                                                                                  | Ricordare le impostazioni di gioco                                                         |

Non viene salvato nulla che identifichi la persona o il dispositivo.

## 2. Finalità

I dati servono solo a far funzionare il gioco per chi lo sta usando: continuità
della serie, statistiche, calendario e la regola "una sola sfida ufficiale al
giorno per gioco". Non vengono usati per profilazione, pubblicità o analisi.

## 3. Dove stanno e chi può vederli

Soltanto nel browser del dispositivo in uso. Non vengono trasmessi, non sono
condivisi con terze parti, non sono visibili allo sviluppatore. Di conseguenza
**non sono sincronizzati fra dispositivi**: il profilo lo dice esplicitamente.

Il sito carica font da Google Fonts: quella richiesta raggiunge i server di
Google ed espone l'indirizzo IP del visitatore, come ogni richiesta web. È
l'unica terza parte coinvolta. (Possibile miglioramento: ospitare i font in
locale — vedi `docs/risks-and-unknowns.md`.)

## 4. Per quanto tempo

Finché il giocatore non li cancella. Non c'è scadenza automatica: sarebbe
arbitraria e cancellerebbe la serie di chi torna dopo una pausa.
I dati spariscono quando:

- il giocatore usa **Impostazioni → Cancella i miei dati** (conferma in due
  passaggi, irreversibile);
- svuota i dati del sito dal browser;
- usa una finestra anonima e la chiude.

## 5. Diritti del giocatore, già implementati

| Diritto                   | Dove                                        | Stato  |
| ------------------------- | ------------------------------------------- | ------ |
| Sapere cosa viene salvato | questo documento + Impostazioni             | Attivo |
| Esportare i propri dati   | Impostazioni → Esporta i miei dati (JSON)   | Attivo |
| Cancellare i propri dati  | Impostazioni → Cancella i miei dati         | Attivo |
| Rettificare               | non applicabile: non ci sono dati personali | —      |

L'export usa `PersistenceAdapter.exportAll()` e la cancellazione
`eraseAll()`; entrambi sono coperti da test end-to-end
(`tests/e2e/settings.spec.ts`).

## 6. Log e telemetria

Nessun log applicativo, nessuna telemetria, nessun error reporting attivo. Il
master prompt cita Sentry come strumento possibile: **non è stato integrato**,
perché invierebbe dati a terzi e richiede una decisione esplicita.

## 7. Backup

Nessun backup: non c'è un server che possa farne. I dati del giocatore
esistono in un solo posto, il suo browser. Chi vuole una copia la scarica
dalle impostazioni.

## 8. Cosa cambierà con gli account (Supabase)

Quando verrà introdotto il backend, cambiano le condizioni sopra. Prima di
attivarlo servirà:

- **Dati nuovi raccolti**: email (per l'accesso), identificativo utente,
  risultati, preferenze, timestamp. Da elencare qui.
- **Base giuridica** e informativa privacy conformi al GDPR.
- **Isolamento**: Row Level Security, ogni riga leggibile solo dal suo
  proprietario (piano in `docs/security-design.md`).
- **Cancellazione account**: cancellazione a cascata dei risultati, verificata.
- **Conservazione**: per quanto restano i risultati dopo la cancellazione.
- **Regione dei dati** e sub-responsabili (Supabase, hosting).
- **Backup**: frequenza, cifratura, conservazione, procedura di ripristino.

Finché tutto questo non è deciso e implementato, **il backend non va
attivato**.

## 9. Decisioni che richiedono un intervento umano

1. Verifica legale dell'informativa privacy prima della pubblicazione.
2. Se ospitare i font localmente per evitare la richiesta a Google.
3. Se attivare un error reporting e con quale informativa.
4. Regione e fornitore dei dati quando arriverà il backend.
5. Tempi di conservazione dopo la cancellazione di un account.
