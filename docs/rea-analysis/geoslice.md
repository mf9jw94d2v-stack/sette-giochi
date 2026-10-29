# Analisi Approfondita REA — GeoSlice (geoslice.net)

**Data analisi:** 2026-10-27  
**URL originale:** https://geoslice.net/ / https://geoslice.net/halves  
**Strumenti REA utilizzati:** `capture_browser_scenario`, estrazione DOM & Accessibility Tree, rilevamento componenti GIS (`Leaflet` con 266 occorrenze, `MapLibre` con 15 occorrenze, SVG overlay handles).  
**Evidenze raccolte:** `docs/rea-analysis/evidence/geoslice/` (`halves-scenario.json`, report e DOM completi).

---

## 1. Identità Visiva e Principi di Design

- **Metafora visiva [Verificato]:** Sezionamento geografico della popolazione (_Demographic Population Slice_). Il giocatore deve tracciare linee o posizionare centri geometrici su una mappa demografica reale per dividere la popolazione di una regione o nazione esattamente in porzioni uguali (metà 50/50, terzi 33/33/33, quarti 25/25/25/25).
- **Tipografia [Verificato]:**
  - Sans-serif contemporaneo, compatto, orientato all'infografica e alla leggibilità di dati demografici complessi.
- **Palette colori [Verificato]:**
  - Sfondo base / interfaccia: Toni scuri e grafite (`bg-zinc-900` / `bg-slate-900`).
  - Mappa: Layer cartografico demografico scuro con gradienti di densità abitativa (heatmap da giallo chiaro ad arancio e fucsia/viola per le megalopoli e aree ad alta densità).
  - Linee di taglio e maniglie SVG: Linee fluorescenti ad alto contrasto (bianco brillante o ciano neon) con nodi di controllo circolari interattivi.
- **Composizione e layout [Verificato]:**
  - La mappa interattiva occupa l'intero schermo (full-screen immersion).
  - In alto: barra con le modalità (`Halves`, `Thirds`, `Quarters`), il round (`Round 1 of 3`), il tasto "How to play".
  - In basso o fluttuanti sui lati: indicatore di scostamento demografico in tempo reale e pulsante di conferma taglio.

---

## 2. Struttura Completa delle Schermate

### 2.1 Homepage & Menu Modalità

- **Header [Verificato]:** Logo `GeoSlice`, link alle sezioni `Unlimited`, `Leaderboard`, `Stats`, `Account`.
- **Griglia modalità giornaliere gratuite [Verificato]:**
  1. `Halves` — "Drag one line to split the population as close to 50/50 as you can." (1 linea retta, 2 porzioni).
  2. `Thirds` — "A centre point and three spokes. Split the population three ways." (1 punto centrale con 3 raggi rotanti a 120°).
  3. `Quarters` — "Two crossed lines through a centre point. Split it four ways." (Croce di 2 linee ortogonali attraverso un centro).
  4. `Inner Circle` — "Draw a circle around exactly this many people. Closest wins." (Cerchio a raggio regolabile).
  5. `Census` — "Guess how many people live in this shape." (Stima della popolazione racchiusa in un poligono).
- **Modalità Premium / tematiche [Verificato]:**
  - `Country Mode`, `US States Mode`, `UK Counties Mode`, `Australian States Mode`, `Canadian Provinces Mode`, `Indian States Mode`, `World Regions Mode`.

### 2.2 Schermata di Gioco (The Halves / Slicing Round)

- **La mappa di gioco [Verificato]:**
  - Renderizzata tramite libreria **Leaflet** integrata con layer vettoriali (`leaflet: 266`, `maplibre: 15`).
  - Mostra i confini della regione del round (es. una nazione europea, uno stato americano, un'isola popolosa).
  - I centri urbani sono evidenziati da etichette contestuali (es. `Moscow`, `London`, `Tehran`).
- **La linea di taglio (Slicing Line) [Verificato]:**
  - Generata tramite un layer SVG vettoriale sovrapposto alla mappa (`svg: 821` nodi nel DOM).
  - Presenta 2 maniglie di trascinamento agli estremi o una maniglia centrale per spostare l'intera linea perpendicolarmente.
  - Il giocatore trascina le maniglie per ruotare e traslare la linea retta di divisione.
- **Struttura dei round [Verificato]:**
  - La sfida quotidiana si articola in **3 round** (`Round 1 of 3`).

### 2.3 Schermata di Feedback e Risoluzione

- **Calcolo della popolazione [Inferito]:**
  - Al momento della conferma, il motore calcola la somma della popolazione raster/grigliata presente da ciascun lato della linea.
  - Viene visualizzata la percentuale effettiva ottenuta (es. `48.2% / 51.8%`).
  - Visualizzazione colorata delle due aree (es. mezza mappa colorata di verde/blu e l'altra di arancio/viola).
- **Punteggio [Inferito]:**
  - Il punteggio si basa sulla vicinanza alla parità perfetta ($50.0\% / 50.0\%$).
  - Più ci si allontana dal 50%, più punti si perdono, fino a un errore limite.

---

## 3. Complessità Tecnica e Dipendenza dai Dati

- **Il problema della raster demografica [Verificato/Critico]:**
  - GeoSlice richiede una mappa raster ad alta risoluzione della densità abitativa (es. dataset GHS-POP del Joint Research Centre europeo o WorldPop a griglia di 1 km² o 100 m²).
  - Sul client, calcolare la somma dei pixel di una raster tagliata da una linea richiede o un'API backend specializzata che interroga un GeoTIFF/PostGIS raster, oppure una raster demografica compressa caricata in memoria in WebAssembly/Canvas.
- **Valutazione di fattibilità per il nostro progetto locale:**
  - Tra i 7 giochi, questo è il più oneroso dal punto di vista infrastrutturale e di dati demografici.
  - Per la nostra implementazione autonoma, un'alternativa pulita e realistica consiste nell'utilizzare un set vettoriale di municipalità/province con coordinate e popolazione puntuale/poligonale (es. dati ISTAT o open data mondiali GeoJSON con attributo `population`), calcolando la suddivisione tramite poligoni di Voronoi o appartenenza punto-in-semipiano, senza richiedere pesanti server raster.

---

## 4. Elementi Distintivi da Preservare nel Nostro Progetto

1. **La maniglia di trascinamento e rotazione della linea di taglio:** L'interazione deve essere immediata, fluida ed elastica.
2. **Il calcolo visivo delle due metà:** L'evidenziazione cromatica immediata dei due territori risultanti dopo il taglio.
3. **Le 3 varianti di partizione:** Offrire non solo il taglio a metà (`Halves`), ma anche a tre (`Thirds`) e a quattro (`Quarters`).

---

## 5. Limiti dell'Analisi e Questioni Aperte

- **Pipeline di calcolo popolazione:** Nel frontend pubblico, il calcolo della popolazione totale dei due settori viene effettuato interrogando un endpoint o una maschera raster pre-renderizzata. La formula esatta di conversione errore demografico -> punteggio andrà parametrizzata su scostamento percentuale assoluto $|P_1 - P_2| / P_{\text{tot}}$.
