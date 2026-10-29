# Progress Report

Reverse-chronological log of real, verified increments.

## 2026-10-29 (3) — Nomi propri, condivisione, anteprime, app installabile

- **Nomi propri** per i sette giochi (prima usavano i nomi degli originali):
  Abissi, Quota, Atlante, Stima, In Scala, Taglio, Epoche, con indirizzi
  propri; i vecchi indirizzi reindirizzano. Identificativi interni invariati.
- **Condividi il risultato** in ogni gioco: una riga con un segno per round
  (quanto vicino, mai la risposta), punteggio e link.
- **Anteprime dei link** (1200×630) disegnate dalle copertine vere; una
  pagina vera per ogni indirizzo pubblico (niente più 404 per i link
  diretti), sitemap.
- **App installabile e offline**: manifest, icone, service worker.
- **Home**: immagine 4 volte più leggera a pixel identici, settima copertina
  centrata, festa e conto alla rovescia quando completi tutte e sette.
- **Traguardi** personali nel profilo.
- **Accessibilità**: audit automatico axe su tutte le pagine e i giochi, nei
  due temi e nelle pagine account; quattro problemi trovati e corretti.
- **Supabase sveglio**: lettura pianificata ogni tre giorni.

**Non fatto, e perché:** promemoria con notifiche (serve un servizio di
notifiche push), classifiche fra amici (nuove tabelle e inviti: lavoro a
sé), più contenuti nei giochi (cambiare i dati cambia anche i giorni
passati: va fatto con una nuova versione dei generatori), protezione
completa delle soluzioni, analytics ed error tracking (servono servizi
esterni e una tua scelta), testi legali (da professionista), dominio
proprio, email SMTP e piano Supabase a pagamento (tuoi account).

## 2026-10-29 (2) — Copertine grandi, tema chiaro e scuro nei giochi

- **Home**: i giochi tornano grandi come prima del ridisegno (una colonna sul
  telefono, due sul tablet, tre su schermo largo), con la copertina vera di
  ogni gioco e il nome in grande.
- **Tema chiaro e scuro in tutti e sette i giochi**: dettagli in
  `docs/game-identities.md`. Contrasti misurati (minimo 4,5:1); tre coppie
  sotto soglia scurite prima del commit.
- **Account provato su tutti e sette i giochi**: ai test e2e di Estimania e
  Gazillion si aggiungono Krillion, Plain, Fact Map, Size It Up e GeoSlice,
  giocati fino in fondo con account. Size It Up e GeoSlice con risposte vere,
  non saltate: il punteggio salvato dal server coincide con quello mostrato.

**Verifiche:** typecheck, lint, formattazione, 278 unit, bundle delle
funzioni, build, 108 e2e. Screenshot dei sette giochi in entrambi i temi,
schermata iniziale e partita.

## 2026-10-29 — Il backend: account, risultati verificati, classifiche

**Obiettivo:** direttiva «backend-first». Audit iniziale in
`docs/PROJECT_COMPLETENESS_AUDIT.md`, poi implementazione.

**Cosa è stato costruito:**

- **Database** (`supabase/migrations/`, 3 file): giochi, profili,
  preferenze, risultati ufficiali e liberi, import ospite, classifiche
  giornaliere e settimanali. RLS su ogni tabella, privilegi per colonna.
- **Ricalcolo del punteggio sul server** (`src/games/replay.ts` +
  `answers.ts` di ogni gioco): il server rigenera il livello dalla data e
  rigioca le risposte. Krillion: la rarità è ricalcolata, non presa dal client.
- **Edge Functions** `submit-daily` e `delete-account`: logica in
  `src/backend/`, compilata per Deno da `scripts/functions/build.mjs`.
- **Client**: Supabase caricato solo se configurato; `AuthProvider`; pagine
  di accesso, registrazione, recupero e reimpostazione password, callback,
  account, classifiche, privacy; navbar con account; avvisi di salvataggio;
  coda offline; offerta di import dei risultati da ospite.
- **I sette giochi** passano dallo stesso adattatore: con un account salvano
  sul server senza essere stati riscritti.

**Difetti trovati e corretti strada facendo:**

- Al ricaricamento, un gioco controllava «già giocata» prima che la sessione
  fosse ripristinata e riproponeva la sfida (trovato dall'e2e): ora le pagine
  di gioco aspettano la sessione e il controllo si ripete se cambia l'account.
- Uscendo dall'account si finiva sulla pagina di accesso invece che in home.
- Il modulo di riproduzione faceva caricare a ogni gioco i dati di tutti e
  sette (+86 kB): ogni gioco ora passa solo le proprie risposte.
- Il contenitore degli avvisi aveva `role="status"` sempre presente.
- Il test e2e sulle proporzioni di Size It Up arrotondava a pixel interi una
  sagoma alta 15 px: falliva con il livello di oggi anche sul commit
  precedente. La sagoma era corretta (rapporto 3,5714 prima e dopo).

**Verifiche eseguite:** typecheck, lint, Prettier, 278 test unitari (30 sul
database con due utenti), bundle delle funzioni aggiornato e provato in Node,
build (JS iniziale 455 → 463 kB; `supabase-js` 214 kB solo se configurato),
96 e2e, report di qualità riproducibile. Pagine nuove guardate in
screenshot, chiaro e scuro, desktop e mobile.

**Non verificato:** nulla è girato su un progetto Supabase reale né in Deno;
email reali; login Google; screen reader.

## 2026-10-28 (4) — Le pagine della piattaforma: «La vetrina»

**Obiettivo:** migliorare il design della home e di tutte le altre pagine.
Prima Giochi, Sfide e Archivio erano la stessa griglia di schede identiche,
con i colori di giochi che non esistevano più. Direzione in
`docs/platform-design.md`.

**Cosa è cambiato:** ogni gioco compare con la sua copertina vera (colori,
carattere e miniatura del proprio gioco), e ogni pagina ha una forma legata al
suo compito: home con la barra delle sfide di oggi e lo scaffale, catalogo a
righe, tabellone delle sfide, strisce di 14 giorni nell'archivio, tabelle e
calendario grande nelle statistiche, linea del tempo nella cronologia,
impostazioni a due colonne, 404 con le copertine. Banner e illustrazione con
la sfumatura invariati.

**Difetti trovati e corretti:**

- Le descrizioni di Plain, Size It Up e GeoSlice descrivevano meccaniche
  diverse da quelle implementate.
- I pulsanti di stato passavano dal colore pieno al contorno con una
  transizione visibile mentre i risultati si caricavano.
- Su telefono lo scaffale si agganciava al bordo dello schermo e il calendario
  si apriva sulle settimane più vecchie.
- **Estimania** su telefono scorreva di lato (13–73 px) con alcune domande: la
  griglia senza colonna esplicita si allargava al campo numerico. Trovato dal
  test e2e di overflow (intermittente perché l'allenamento cambia domande);
  dopo la correzione 0 casi su 60 prove nel browser e 12/12 ripetizioni del
  test.

**Test eseguiti e superati:** typecheck · lint · formattazione · `npm test`
**212/212** · `npx playwright test` **70/70** · build (bundle principale
455 kB, +4,5 kB per i disegni delle copertine).

**Verifiche visive realmente fatte** (browser integrato): tutte le dieci
pagine a 1440×900 in tema scuro; home e giochi anche in tema chiaro; a 375×812
home, giochi, sfide, archivio e statistiche, più il controllo programmatico
dell'overflow orizzontale su tutte e dieci.

**Limiti dichiarati:** contrasto non misurato strumento per strumento su ogni
stato; nessuna prova con screen reader.

## 2026-10-28 (3) — Sette pagine di gioco immersive, sette identità

**Obiettivo:** trasformare i sette giochi da schede centrate in un layout
comune in sette pagine a tutto schermo, ognuna con un'identità visiva propria
derivata dalla sua meccanica (brief del 28/10 + `FORENSIC-UI-UX-AUDIT.md`).
Le sette direzioni sono descritte in `docs/game-identities.md`.

**Infrastruttura condivisa (solo comportamento, nessuno stile):**
rotte con `handle: { immersive: true }` (niente contenitore centrale né footer),
`src/games/shared/` con blocco giornaliero, salvataggio del risultato, audio,
movimento ridotto, numero della sfida, schede Oggi/Allenamento accessibili e
dialogo «Come si gioca» su `<dialog>` nativo. L'archivio riusa gli stessi
componenti di gioco con il proprio contesto. Ogni gioco ha un proprio file CSS
con token locali, caricato solo con il suo chunk.

**Le sette pagine:** Fact Map (mappa a tutta pagina, pannelli fluttuanti,
inquadratura che evita i pannelli) · GeoSlice (campo scuro + console ancorata,
taglio trascinabile, ruotabile e da tastiera) · Gazillion (linea del tempo a
tutta larghezza con trappola a due maniglie) · Estimania (pagina editoriale a
due colonne con righello delle grandezze) · Plain (domanda in tipografia
gigante, barra d'altitudine a tutta altezza) · Krillion (colonna di profondità

- terminale con ossigeno a tempo) · Size It Up (palcoscenico a tutta pagina,
  didascalie da museo, barra di scala, dock dei comandi, risultati come galleria
  di tavole).

**Difetti trovati e corretti durante la verifica nel browser:**

- Il font dei titoli globale scavalcava quello di ogni gioco (Fact Map, Plain e
  Krillion mostravano Bricolage): override per gioco in `@layer base`.
- `CountUp` mostrava «−1» nel primo fotogramma (test aggiunto).
- Estimania leggeva «1.200» come 1,2: parser dei numeri all'italiana in
  `src/lib/italianNumber.ts` (test), usato anche da Plain e Gazillion.
- Krillion moltiplicava due volte la profondità («10.000 m su 7000»).
- Size It Up: su telefono un triplo tocco su «Blocca la scala» finiva sul
  pulsante «Prossimo confronto» comparso nello stesso punto, saltando la
  rivelazione e bloccando anche il confronto dopo (trovato dall'e2e mobile).
- Etichette che si sovrapponevano su Gazillion, pannelli che coprivano il
  segnaposto su Fact Map, barra di Plain che scorreva via, overflow orizzontale
  transitorio.

**Test eseguiti e superati:** `npm run typecheck` · `npm run lint` ·
formattazione · `npm test` **212/212** · `npx playwright test` **70/70**
(desktop + mobile; nuovo test di assenza di overflow su tutti e sette i giochi,
prima e dopo l'inizio) · `npm run build` · `quality:check`.

**Verifiche visive realmente fatte** (browser integrato): a 1440×900
introduzione, partita, rivelazione e risultati di tutti e sette i giochi; a
375×812 almeno introduzione e partita di ciascuno, più rivelazione e risultati
di Fact Map, Gazillion, Estimania, Plain e Size It Up; blocco giornaliero dopo
il ricaricamento; controllo programmatico dell'overflow orizzontale.

**Limiti dichiarati:** nessun audit con screen reader reale; il contrasto è
stato scelto con i token, non misurato su ogni stato. Le pressioni di «+» e
«−» non arrivano dal browser integrato (limite dello strumento): sono coperte
dagli e2e Playwright.

## 2026-10-28 (2) — Size It Up ricostruito: sagome vettoriali e confronto di scala

**Obiettivo:** il gioco era un confronto fra due barre a capsula con un
cursore tarato in metri. L'originale è un'altra cosa — si ridimensiona una
**sagoma** accanto a una sagoma di riferimento — e il dossier REA lo segnalava
già come la discrepanza più grave del progetto.

**Analisi dell'originale.** Rianalizzato dal vivo con il browser integrato
(cookie non essenziali rifiutati). Confermati linea di terra condivisa,
guida tratteggiata sul riferimento, maniglia d'angolo sul bersaglio, zoom sul
canvas, `Lock In`, e la rivelazione che disegna la sagoma reale **dentro** la
stima. Raccolto un **terzo punto di calibrazione** del punteggio: stima 68,5 cm
su 5,7 cm reali → `Off by 1102%`, `0/100`. Tutto in
`docs/rea-analysis/size-it-up.md`.

**Cosa è reale e verificato:**

- **22 sagome vettoriali disegnate a mano** (oggetti, veicoli, architettura),
  ognuna normalizzata sull'asse che il gioco misura.
- **Normalizzazione automatica**: ogni sagoma porta il proprio **riquadro
  misurato**, prodotto da `scripts/validation/silhouette-bbox.mjs`, non un
  viewBox che l'autore prometteva di riempire. Serviva: la chitarra si fermava
  all'8 % dal bordo e sarebbe stata disegnata l'8 % più piccola del vero,
  con il giocatore penalizzato per un difetto del disegno.
- **Due difetti di disegno trovati così:** il London Eye usciva di 39 unità
  dal riquadro (un arco scritto in forma degenere faceva uscire un disco dalla
  cima del palco) e le porte del campo da calcio sporgevano oltre la linea
  laterale, allungando del 6 % i 105 m che rappresentano. Corretti entrambi;
  un test vieta ora quella forma di arco.
- **Punteggio ricalibrato** sui tre punti verificati e reso **simmetrico**: il
  decadimento è sul logaritmo del rapporto, così "il doppio" e "la metà"
  costano uguale. Prima, sbagliare per eccesso costava il doppio.
- **Palcoscenico che si inquadra da solo**: le sagome non vengono mai tagliate
  dal bordo; stima, scala di disegno e zoom restano tre numeri distinti e lo
  zoom non tocca la risposta (verificato da un test e2e).
- **Tre strade per rispondere** — maniglia (pointer, anche touch), cursore
  logaritmico accessibile, pulsanti +/− e tastiera (+ − frecce, Shift per i
  passi fini, Invio per bloccare).
- **Rivelazione**: sagoma reale in verde, stima tratteggiata in rosso nello
  stesso sistema di coordinate, con stima, misura reale, scarto, direzione,
  punteggio, curiosità e **fonte verificabile**.
- **Catalogo onesto**: 22 oggetti con asse, fonte e nota di precisione. Dove
  una misura non ha un'autorità da citare lo dice ("valore tipico") invece di
  inventare un URL.

**Difetti trovati e corretti durante la verifica nel browser:** le pressioni
rapide dei tasti venivano perse (closure obsoleta), i pulsanti di zoom
coprivano la maniglia su schermo stretto, i bersagli touch erano sotto i 44 px,
e due errori d'italiano ("regola la altezza", "4× del riferimento").

**Test eseguiti e superati:** `npm run typecheck` · `npm test` **165/165**
(34 su Size It Up) · `npm run test:e2e` **68/68** (11 nuovi su Size It Up,
desktop + mobile) · lint · formattazione · build · `quality:check`.

**Limiti dichiarati:** il catalogo **non contiene animali** — i disegni non
erano riconoscibili e una sagoma che non si riconosce peggiora il confronto;
aggiungerli richiede illustrazioni vere, non altri tentativi. La curva di
punteggio passa per i tre punti osservati ma la sua forma fra quelli è una
nostra scelta, non una ricostruzione.

**Prossimo passo:** invariato — Supabase, oppure l'audit di accessibilità.

## 2026-10-28 — Audit del master prompt: pipeline di qualità, Quality Lab, e2e, CI

**Obiettivo:** verificare il master prompt requisito per requisito e costruire
ciò che mancava. Il risultato dell'audit vive in `docs/final-audit.md`.

**Cosa è reale e verificato:**

- **Pipeline di qualità** (`src/services/quality/`): generazione →
  validazione strutturale → verifica indipendente → difficoltà →
  deduplicazione sul contenuto → pubblicazione | quarantena | rifiuto, con 30
  test, tre moduli deliberatamente rotti per provare che i fallimenti non
  vengono ingoiati, e una property-based che prova che un livello pubblicato
  non è mai un duplicato.
- **Due difetti reali scoperti eseguendola.** (1) Krillion e GeoSlice erano
  esauriti combinatoriamente: 180 semi davano 36 e 20 livelli distinti.
  Dataset portati a 24 prompt e 20 regioni → su 365 giorni di semi i livelli
  distinti passano da 956 a **2486**. (2) Sei generatori su sette scrivevano
  `difficulty: "medium"` a mano: ora ognuno stima la difficoltà dalla propria
  meccanica (ADR-0007).
- **Il validatore ha bocciato dati appena scritti qui:** Canada ed Egitto non
  avevano alcun taglio bilanciato. Canada corretto con altre città, Egitto
  sostituito con il Marocco — non allentando il controllo.
- **Game Quality Lab** (`/lab`): metriche misurate sul momento per i 7 giochi,
  filtri, export JSON, lista di quarantena con motivi e riesame per seme,
  stato vuoto esplicito. Escluso dalla build di produzione (ADR-0008).
- **Profilo e Impostazioni** reali al posto dei segnaposto: aggregati veri,
  calendario, scelta del tema, fuso della giornata, **esportazione dei propri
  dati** e **cancellazione in due passaggi** (nuovi `exportAll` / `eraseAll`).
- **46 test end-to-end** con Playwright su una build di produzione servita da
  `vite preview`, desktop + mobile: le sette sfide indipendenti, nessun doppio
  risultato dopo reload o doppio clic, orologio del dispositivo spostato,
  archivio che non tocca i risultati ufficiali, temi, overflow, diritti sui
  dati, Quality Lab.
- **CI GitHub Actions**: typecheck, lint, formattazione, test, build,
  riproducibilità del report di qualità, e2e con artefatto, audit delle
  dipendenze.
- **Code splitting**: bundle principale da 543 kB a **448 kB**, un chunk per
  gioco.
- **`docs/privacy-and-data.md`**: cosa viene salvato, dove, per quanto, come
  esportarlo e cancellarlo, e cosa dovrà essere deciso prima del backend.

**Test eseguiti e superati:** `npm run typecheck` pulito · `npm test` 129/129 ·
`npm run test:e2e` 46/46 · `npm run lint` · `prettier --check` · `npm run
build` · `npm run quality:check` (conteggi riproducibili).

**Problemi aperti / bloccati:**

- Tutto ciò che richiede Supabase resta bloccato (account, integrità
  server-side, sincronizzazione).
- Il workflow CI non è mai girato su GitHub: il repository non ha un remote.
- `typescript-eslint` rifiuta TS 7 (upstream #10940): `.ts`/`.tsx` non sono
  lintati, `tsc` li controlla. Tentativi documentati in ADR-0003.
- Manca un error boundary globale e un audit di accessibilità completo.

**Prossimo passo:** Supabase, quando deciderai di configurarlo — oppure
l'error boundary e l'audit di accessibilità, che non dipendono da nulla.

## 2026-10-27 — UI/UX overhaul: design system, home, Gazillion identity

**Feature:** Richer, differentiated visual design — shared system + per-game
identity.

**What's real and verified:**

- **Design system:** Google Fonts (Inter body, Space Grotesk display, JetBrains
  Mono), font tokens, display headings. Shared UI primitives `Button` and
  `Badge` (cva). Per-game identity in `src/games/theme.ts` (palette + mechanic
  label) and 7 bespoke hand-drawn SVG motifs (`components/games/Motifs.tsx`) —
  no emoji.
- **Home redesigned:** hero (colour glows, CTAs, stats) + differentiated game
  cards (per-game gradient + motif, hover lift, focus ring, clear Giocabile vs
  In arrivo). Games list uses themed motif thumbnails.
- **Gazillion in-game identity:** intro screen, themed header with progress
  dots + live score + optional sound toggle (WebAudio, persisted mute), a visual
  **timeline** that shows the trapped range and reveals the true year
  (green=trapped / red=miss) with points, and a results screen. All Italian.
  Fixed a reveal bug (was showing the next round's prompt).

**Tests run / passed:** tsc clean; Vitest 32/32; vite build. Browser-verified
on desktop and mobile (375px, no horizontal overflow, no console errors):
home, cards, Gazillion intro→play→reveal.

**Open issues:** remaining six games still show the generic detail/placeholder
(their bespoke layouts are a later increment); loading/error boundaries not yet
designed.

**Next task:** give the six not-yet-playable games a distinct landing/preview
layout (clearly marked "non giocabile"), or wire Stats/streak.

## 2026-10-27 — Gazillion vertical slice + local persistence

**Feature:** First game (Gazillion) implemented end-to-end, plus the local
persistence layer and a seeded RNG — all verified.

**What's real and verified:**

- **RNG** (`src/lib/rng.ts`): deterministic mulberry32 + string hash + shuffle,
  implementing the `Rng` contract.
- **Daily date** (`src/lib/dailyDate.ts`): timezone-defined `YYYY-MM-DD` day
  boundary (not device clock), with tests at the TZ boundary.
- **Persistence** (`src/services/persistence/`): `PersistenceAdapter` interface
  - localStorage adapter. Daily saves are **idempotent** per (game, date) —
    mirrors the DB unique constraint planned for Supabase. Archive results kept
    separate from official daily results. Tested.
- **Gazillion** (`src/games/gazillion/`): original event dataset (71 events,
  open-knowledge), seeded generator (5 distinct rounds/session), two-pass
  validator (structure + independent era/year consistency + dedup hash), and an
  engine whose **scoring reproduces the real game's formula** (verified via REA
  from the public client — tolerance/narrowOf/near-miss). Playable UI with
  Daily (idempotent) and Practice modes, wired at `/games/gazillion`; registry
  status now `playable`.

**Verification used REA** (`recover_javascript_sources` needs Linux/Wakaru, so
scoring was read from the minified client and reimplemented originally).

**Tests run / passed:** typecheck pass; **Vitest 32/32 pass** (incl. a
fast-check property over 200 seeds: every generated level passes both validation
passes; dataset integrity: all 71 events structurally valid and era-consistent;
persistence idempotency; TZ boundary). Production build succeeds. Browser-
verified: played a daily round, trapped 1975 → 927 pts, advanced correctly, no
console errors.

**Open issues:** BC years use `-(BC number)` in data vs astronomical numbering
in scoring (≤1-yr offset, negligible given ancient tolerance; documented). No
server-side score recomputation yet (planned with Supabase). Daily integrity is
single-device locally.

**Next task:** second game, OR wire the Daily/Stats/History pages to persistence
(streak + calendar), OR stand up Supabase (needs your account).

## 2026-10-27 — Foundation scaffold

**Feature:** Project foundation — toolchain, app shell, theming, docs.

**What's real and verified:**

- Vite + React 19 + TypeScript 7 project initialised in-place over the existing
  empty Git repo. Dependencies installed (see `package.json`).
- Tailwind v4 theme with light/dark tokens; class-based dark mode applied
  pre-paint (no flash).
- App shell: router, providers (QueryClient + ThemeProvider), root layout,
  shared responsive navbar with mobile menu, footer, skip-link, focus-visible,
  reduced-motion support.
- Homepage with all seven game cards; `/games` list; `/games/:id` detail;
  honest placeholder pages for daily/archive/stats/history/profile/settings
  (each states what it needs and that it isn't built).
- Game-module contract (`src/types/game.ts`) and game registry
  (`src/games/registry.ts`). Game descriptions are provisional placeholders, not
  verified rules; every game is `status: "planned"`.
- Theme toggle (light → dark → system) with persistence.
- Docs set created under `docs/` reflecting real status.

**Files created:** package.json, tsconfig*.json, vite.config.ts, index.html,
.gitignore, .env.example, eslint.config.js, .prettierrc.json, `.claude/launch.json`,
`public/favicon.svg`, `src/**` (main, App, index.css, lib/{utils,theme},
types/game, games/{registry,registry.test}, app/{providers,layouts,router},
components/{navigation,shared}, features/{home,games}, test/setup),
`docs/*.md`, README.md.

**Commands run:** `npm install …` (runtime + dev deps), `npx tsc -b`,
`npx vitest run`, `npx vite build`, dev server via preview.

**Tests run / passed:** typecheck pass; Vitest 4/4 pass; production build
succeeds. Verified in the browser (dev server): homepage renders, light & dark
themes work, nav and placeholder routes work, no console errors.

**Tests failed:** none.

**Open issues:** TS 7 vs typescript-eslint peer gap (ADR-0003); Playwright
browsers not installed; no CI yet.

**External limitations:** backend (Supabase) and deployment need your
account/authorization — not blocking the UI, which uses a local fallback.

**Next task:** verify the seven games' mechanics (fill `game-analysis.md`),
define the `PersistenceAdapter` + local adapter, detail the DB schema, then
implement the first game as a vertical slice.
