# Analisi Comparativa dei Sette Giochi

**Data redazione:** 2026-10-27  
**Progetto:** Piattaforma Sette Giochi (`~/Projects/seven-games-platform`)  
**Metodologia:** Reverse engineering empirico condotto con REA (Playwright headless CDP, analisi DOM/CSS/JS, interazioni live e scoring reverse engineering).

---

## 1. Matrice Comparativa Generale

| Gioco          | Dominio / Tema        | Metafora Core                         | Meccanica di Input                               | Tipologia di Feedback                                      | Punteggio / Round                                  | Punti Totali   | Durata Sessione |
| :------------- | :-------------------- | :------------------------------------ | :----------------------------------------------- | :--------------------------------------------------------- | :------------------------------------------------- | :------------- | :-------------- |
| **Krillion**   | Trivia culturale      | Immersione sottomarina (0–7.000 m)    | Testo aperto + invio (25s countdown)             | Tier di rarità (Plankton → One in a Krillion)              | 10–100 pt / 100–1.000 m (7 prompt)                 | 7.000 m        | ~4 min          |
| **Plain**      | Stima del mondo reale | Quota aerea (climb 0–5.000 m)         | Numero o testo con unità                         | % di errore relativo (under/over) + aneddoto               | Guadagno in metri scalati (7 target)               | 5.000 m        | ~3 min          |
| **Fact Map**   | Geografia e storia    | Spillo su mappa del mondo             | Click / Tap su mappa WebGL (MapLibre)            | Distanza in km con linea geodesica + retroscena            | Decadimento continuo (max 1.000 pt/round, 5 round) | 5.000 pt       | ~4 min          |
| **Estimania**  | Stima di Fermi        | Scala logaritmica ordini di grandezza | Input numerico (`decimal`)                       | Calcolo ratio-based $1 - \|\log_{10}(G/A)\|$ + spiegazione | 0–100 pt (5 domande)                               | 500 pt         | ~3 min          |
| **Size It Up** | Dimensioni e fisica   | Confronto visuale tra sagome          | Drag & resize su Canvas HTML5                    | Sovrapposizione scala reale + % scostamento                | 0–100 pt (tolleranza 6% per 100 pt, 5 round)       | 500 pt         | ~3 min          |
| **GeoSlice**   | Demografia e confini  | Sezionamento demografico della mappa  | Linea vettoriale SVG su mappa Leaflet            | Percentuale di popolazione per lato (es. 48/52)            | Scostamento dalla parità (3 round)                 | 300 / 1.000 pt | ~4 min          |
| **Gazillion**  | Cronologia e storia   | Viaggio nel tempo paleontologico      | Doppia maniglia a trappola su slider logaritmico | Trapped vs Missed (anni di scostamento) + credito parziale | Decadimento morbido con smoothstep (5 round)       | 5.000 pt       | ~3 min          |

---

## 2. Analisi Dettagliata per Criterio

### 2.1 Personalità Visiva e Identità di Design

Ogni gioco originale possiede un'identità grafica forte e deliberatamente diversa, lontana dall'effetto "dashboard generica":

- **Krillion:** Estetica retro-arcade pixel terminale anni '80 (font `VT323`, sfondo nero abisso, testo azzurro ghiaccio, profondimetro).
- **Plain:** Design contemporaneo "developer-luxe" stile Vercel/Linear (font `Geist`, dark mode profonda `#0b0d12`, accento fluorescente lime `#d2fa4b`, micro-interazioni secche).
- **Fact Map:** Atmosfera cartografica da diario di viaggio geografico (font `Outfit`, sfondi caldi carta pergamena `#efefef`, linee sottili grafite, pannelli semitrasparenti sospesi).
- **Estimania:** Pulizia editoriale chiara e rassicurante (palette Teal `#0d9488`, card arrotondate `rounded-xl`, tipografia solida ad alta leggibilità, focus sull'approfondimento didattico).
- **Size It Up:** Museo di scienze naturali / tavola anatomica (sfondo sabbia `#fffaf4`, sagoma fissa blu indaco `#1e3a8a`, sagoma utente rossa vermiglio `#ab341f`, canvas incorniciato).
- **GeoSlice:** Infografica GIS ad alta densità (mappa scura con heatmap di densità demografica, linee di taglio al neon ciano/bianco, look tecnico e cartografico).
- **Gazillion:** Avventura cosmico-paleontologica (gradiente temporale dal presente al Big Bang, maniglie ambra accese, dinosauro stilizzato, emoji delle ere geologiche).

### 2.2 Organizzazione dello Spazio e Layout di Gioco

- **Giochi a tutto schermo (Full Viewport):**
  - `Fact Map` e `GeoSlice`: La mappa **deve** occupare il 100% dell'area utile; i comandi, la domanda e i punteggi sono display fluttuanti HUD. Non possono vivere dentro una card stretta al centro di uno sfondo vuoto.
  - `Gazillion`: La timeline logaritmica orizzontale richiede respiro e larghezza piena per consentire precisione millimetrica alle maniglie sia su desktop che su mobile.
- **Giochi a Canvas Centrato ad Alta Risoluzione:**
  - `Size It Up`: Canvas `840x510` fisso/scalabile in 16:9 con ampi margini per le sagome e pulsanti zoom dedicati.
- **Giochi a Colonna Focalizzata di Lettura:**
  - `Estimania`, `Plain`, `Krillion`: Colonna ergonomica centrale da 600–750px max-width, che evita dispersioni dello sguardo e rende la digitazione da tastiera immediata.

### 2.3 Qualità delle Interazioni e Input

- **Tastiera e testo:**
  - `Estimania` usa saggiamente `inputmode="decimal"`, aprendo il tastierino numerico su mobile e validando numeri con virgola/punto.
  - `Plain` consente l'invio rapido sia cliccando che premendo `Enter`, offrendo feedback istantaneo.
  - `Krillion` ha un timer a 25 secondi e tolleranza typo con domanda di conferma.
- **Manipolazione diretta e Slider:**
  - `Gazillion` ha inventato una delle migliori interazioni: non solo stringere le due maniglie, ma traslare l'intera finestra temporale tenendo premuto il centro (`◀ MOVE ▶`).
  - `Size It Up` usa il drag visivo della silhouette su canvas, con zoom per soggetti enormi.
  - `GeoSlice` usa le maniglie vettoriali di rotazione e traslazione della retta demografica.

### 2.4 Chiarezza delle Istruzioni e Feedback

- Tutti i giochi eccellono nel chiarire l'obiettivo in meno di 10 secondi:
  - Badge riassuntivo (es. _5 domande, circa 3 minuti_).
  - 3 o 4 passaggi illustrati senza gergo tecnico.
  - **Feedback educativo post-round:** In `Plain`, `Estimania` e `Fact Map`, la risposta non è solo un numero: è accompagnata da una breve curiosità che spiega _perché_ quel valore o quel luogo sono speciali, corredata dalla fonte.

---

## 3. Elementi Comuni per il Design System Condiviso

Sebbene ciascun gioco debba avere la sua personalità, la piattaforma beneficia di componenti e standard condivisi:

1. **Header unificato di gioco (HUD Header):**
   - Tasto "Home / Torna ai giochi" o drawer laterale discreto.
   - Indicatore del round corrente (`Round X di Y` o barra a segmenti discreti).
   - Punteggio parziale accumulato con animazione `CountUp`.
   - Tasto Mute/Audio per la gestione unificata dei suoni.
   - Tasto "Come si gioca" che apre una modale rapida contestuale.
2. **Sistema di Transizione e Feedback (Game State Machine):**
   - Stati standard: `intro` (landing del giorno) → `playing` (interazione attiva) → `reveal` (esito del round con animazione punti) → `summary` (schermata finale di completamento).
3. **Schermata Finale di Riepilogo (Summary Card):**
   - Punteggio finale su massimo teorico (es. 4.350 / 5.000 m, 460 / 500 pt).
   - Valutazione qualitativa o medaglia (Bronzo, Argento, Oro, Diamante).
   - Griglia o riga emoji per la condivisione "Wordle-style" sui social / clipboard.
   - Pulsante "Rigioca (modalità infinita / archivio)" e "Torna alla dashboard".
4. **Sistema di Persistenza Locale (Daily Storage):**
   - Salvataggio dello stato giornaliero per data ISO (`YYYY-MM-DD`): impedisce di barare rigiocando la giornaliera dopo aver visto le risposte, salvando statistiche storiche e streak.

---

## 4. Elementi che Devono Rimanere Strettamente Distintivi

| Gioco          | Elementi da NON uniformare / da mantenere unici                                                                                     |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Krillion**   | Font retrò `VT323`, tema abisso sottomarino, scala in metri negativi (0–7.000m), timer a 25s, tier di rarità.                       |
| **Plain**      | Font `Geist`, sfondo `#0b0d12` con accento lime `#d2fa4b`, quota aerea scalata (0–5.000m), % di errore relative.                    |
| **Fact Map**   | Motore WebGL `MapLibre`, mappa a tutto schermo, stile carta naturale `#efefef`, indizio con penalità (-250pt).                      |
| **Estimania**  | Identità Teal `#0d9488`, formula ratio-based Fermi $\left(1 - \|\log_{10}(G/A)\|\right)$, tastierino decimale.                      |
| **Size It Up** | Canvas `840x510` con sagome 2D blu e rossa ridimensionabili, sfondo crema sabbia, tolleranza 6% per 100pt.                          |
| **GeoSlice**   | Mappa Leaflet scura con heatmap demografica, overlay SVG con linea di taglio a maniglie rotanti, 3 varianti di taglio.              |
| **Gazillion**  | Timeline logaritmica ad ampiezza variabile con maniglie ambra `[FROM, TO]`, dinosauro viaggiatore, crediti parziali per mancamento. |
