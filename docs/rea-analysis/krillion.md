# Analisi Approfondita REA — Krillion (krillion.cc)

**Data analisi:** 2026-10-27  
**URL originale:** https://krillion.cc/  
**Strumenti REA utilizzati:** `capture_browser_scenario`, estrazione DOM & Accessibility Tree, tracciamento risorse di rete (Turbopack, Next.js).  
**Evidenze raccolte:** `docs/rea-analysis/evidence/krillion/` (landing page, screenshot di gioco, DOM completo, tier feedback, tier table).

---

## 1. Identità Visiva e Principi di Design

- **Metafora visiva [Verificato]:** Immersione oceanica (_Ocean Depth_). La profondità raggiunta corrisponde al punteggio del giocatore (da 0 m sulla superficie dell'isola con faro fino a 7.000 m nel pavimento della fossa oceanica / _trench floor_).
- **Tipografia [Verificato]:**
  - Font primario: `VT323` (font pixel monospaziato retrò a 22px body, 44px H1, 36px H2).
  - Look & feel volutamente arcade / terminale sottomarino vintage.
- **Palette colori [Verificato]:**
  - Sfondo base: Nero profondo / blu abissale `rgb(0, 0, 0)` / gradienti marini scuri.
  - Testo primario: Bianco ghiaccio / azzurro pallido `rgb(232, 241, 255)`.
  - Accenti: Verde corallo, ambra per avvisi, blu ciano per i livelli d'acqua.
- **Composizione e layout [Verificato]:**
  - Layout verticale centrato su desktop, full-width fluido su mobile.
  - Il contatore di profondità (profondimetro) occupa una posizione prominente con indicatori di profondità crescenti.

---

## 2. Struttura Completa delle Schermate

### 2.1 Homepage & Landing

- **Navbar [Verificato]:** Logo "Krillion", link alle modalità (`Daily`, `Unlimited`, `Archive`, dropdown `Variants` con `Noillirk`, `Eraly`, `Clueffy`, `More Games`).
- **Hero Section [Verificato]:** Titolo "Krillion: name what nobody else names", payoff "The free trivia game where only uncommon answers score. The rarer your answer, the deeper you sink."
- **Card di lancio [Verificato]:**
  - `THE DAILY DIVE`: indicazione "7 prompts · 25 seconds each · rarer answers sink deeper".
  - Badge `DAILY · #57` e `UNLIMITED ∞`.
  - Pulsante primario di inizio: `▼ BEGIN DESCENT ▼`.
  - Pulsante secondario: `▸ PLAY WITH FRIENDS`.
- **Sezioni informative [Verificato]:** Spiegazione delle regole, tabella dei 6 livelli di rarità, architettura "Under the Hood" sul calcolo crowd-sourced, mappa dell'oceano ("The Descent") con le 6 zone batimetriche.

### 2.2 Schermata di Gioco (The Dive)

- **HUD superiore [Verificato]:**
  - Indicatore di progresso: `PROMPT X OF 7`.
  - Profondimetro attivo: `DEPTH [X]m`.
  - Timer circolare / barra decrescente impostata su 25 secondi per round.
  - Pulsante `QUIT` in alto a destra.
- **Area centrale [Verificato]:**
  - Zona oceanica corrente (es. `THE CORAL GARDEN: a city built by animals the size of a pea`).
  - Il prompt aperto (es. "Name a sea creature", "Name a bird").
  - Vincoli e regole tra parentesi (es. "(not a fish)", "(current franchises)").
- **Input e controlli [Verificato]:**
  - Campo di input testuale centrale con autofocus.
  - Pulsante azione `Dive` (invia risposta) e opzione `Pass` (salta per 0 punti).

### 2.3 Schermata di Feedback del Round

- **Animazione di discesa [Verificato]:** La risposta viene validata e "affonda" visivamente attraverso i livelli.
- **Rivelazione del Tier [Verificato]:**
  - Nome del livello ottenuto (es. `PLANKTON`, `SCHOOLER`, `RARE`, `ONE IN A KRILLION`).
  - Punteggio e profondità guadagnati (es. `+10 PTS · sink 100m`).
  - Sottotitolo descrittivo (es. _“The answer the whole ocean says.”_).
  - Pulsante `NEXT ▸` per procedere al prompt successivo.

### 2.4 Schermata Finale (Surface & Compare)

- **Profondità finale [Verificato]:** Somma totale dei metri raggiunti (massimo teorico: 7.000 m con 7 "One in a Krillion" da 1.000 m ciascuna).
- **Breakdown risposte [Verificato]:** Lista di tutte e 7 le risposte fornite, con percentuale e numero esatto di giocatori globali che hanno dato la stessa risposta.
- **Confronto globale [Verificato]:** Grafico a istogramma / curva di distribuzione di tutti i giocatori del giorno.
- **Condivisione [Verificato]:** Griglia emoji riassuntiva per copiare il risultato negli appunti (stile Wordle / Daily Dive).

---

## 3. Regole e Meccaniche Osservate

- **Obiettivo [Verificato]:** Dare risposte corrette ma il più possibile **rare** e insolite rispetto alla popolazione dei giocatori.
- **Struttura partita [Verificato]:** Esattamente 7 prompt a partita, 25 secondi a prompt, 1 sola risposta accettata per prompt.
- **I 6 Tier di Punteggio [Verificato]:**
  1. `Plankton`: 10 pt (affonda 100 m) — Risposte ovvie/comunissime (es. "Paris" per capitale europea).
  2. `Too clever`: 15 pt (affonda 150 m) — Risposte che molti scelgono credendo di essere furbi (es. "Flamingo" per uccello).
  3. `Schooler`: 30 pt (affonda 300 m) — Risposta specifica e valida, ma ancora condivisa da un gruppo cospicuo.
  4. `Rare`: 60 pt (affonda 600 m) — Risposta genuinamente poco comune.
  5. `Deep cut`: 85 pt (affonda 850 m) — Grande oscurità, pochissimi la nominano.
  6. `One in a krillion`: 100 pt (affonda 1.000 m) — Corretta e quasi nessun altro giocatore l'ha inserita.
- **Gestione errori e typo [Verificato]:**
  - Risposta errata: rifiutata senza penalità di punti (costa solo il tempo che scorre sul timer da 25s).
  - Correzione automatica typo: Krillion mostra "Did you mean...?" e chiede conferma rapida prima di scartare.
  - Pass o Timeout: 0 punti per quel round.

---

## 4. Animazioni e Feedback Visivo

- **Discesa sottomarina [Verificato]:** Grafica di bolle e particelle marine che salgono mentre la camera virtuale scende in profondità.
- **Transizione batimetrica [Verificato]:** Il gradiente dello sfondo sfuma dinamicamente passando per le zone:
  - 0 m: _Sunlit shallows_ (azzurro chiaro, barriera corallina)
  - 200 m: _Twilight zone_ (blu scuro, balene e meduse bioluminescenti)
  - 1.000 m: _Midnight zone_ (nero bluastro, pesci abissali)
  - 3.800 m: _The Wreck_ (relitto della nave)
  - 6.000 m: _Hadal zone_ (abisso nero)
  - 7.000 m: _Trench floor_ (fondo della fossa delle Marianne)

---

## 5. Elementi Distintivi da Preservare nel Nostro Progetto

1. **Metafora completa dell'abisso marino:** Non fare un banale quiz testuale con punteggio 0-100; mantenere la misurazione in **metri di profondità** (0m - 7000m) e il tema batimetrico.
2. **Font Pixel retrò:** L'uso di `VT323` o `JetBrains Mono` con un tocco arcade anni '80 dona a Krillion un'identità inconfondibile rispetto a tutti gli altri 6 giochi.
3. **Timer a pressione (25 secondi):** Crea ritmo e impedisce a chi gioca di cercare risposte online con comodo.
4. **Riconoscimento typo e tolleranza ortografica:** Essenziale per non frustrare l'utente su prompt aperti.

---

## 6. Limiti dell'Analisi e Questioni Aperte

- **Dipendenza dai dati aggregati [Verificato/Critico]:** Krillion originale ricalcola i tier dinamicamente dal database di tutte le risposte dei giocatori della giornata. Per la nostra piattaforma autonoma locale/offline, dovremo simulare la curva di rarità con un dataset curato con frequenze di campionamento pre-assegnate o un modello euristico locale basato sulla frequenza lessicale/popolarità Wikipedia.
