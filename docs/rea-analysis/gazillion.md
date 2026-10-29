# Analisi Approfondita REA — Gazillion (gazillion.world)

**Data analisi:** 2026-10-27  
**URL originale:** https://gazillion.world/  
**Strumenti REA utilizzati:** `capture_browser_scenario`, estrazione DOM & Accessibility Tree, analisi sessione Practice, reverse engineering del bundle client JavaScript (Next.js/React).  
**Evidenze raccolte:** `docs/rea-analysis/evidence/gazillion/` (`practice-scenario.json`, report e DOM completi, formule verificate da bundle).

---

## 1. Identità Visiva e Principi di Design

- **Metafora visiva [Verificato]:** Viaggio nel tempo paleontologico (_Time-Travelling Dinosaur_). Il punteggio accumulato spinge un dinosauro viaggiatore indietro nel tempo, attraverso tutte le ere cosmiche e geologiche (dall'era contemporanea, al medioevo, all'antico Egitto, all'età della pietra, all'era glaciale, all'era dei dinosauri, alla terra primordiale fino al Big Bang).
- **Tipografia [Verificato]:**
  - Display e titoli: Font bold geometrico a tutto tondo per l'impatto visivo (`GAZILLION`, `THE DAILY TIME TRIP`).
  - Etichette asse cronologico: `MODERN ERA 🏙️`, `MIDDLE AGES 🏰`, `ANCIENT EGYPT 🐪`, `STONE AGE 🔥`, `ICE AGE 🦣`, `DINOSAURS 🦖`, `YOUNG EARTH 🌋`, `BIG BANG 💥`.
- **Palette colori [Verificato]:**
  - Sfondo base (dark mode cinematografica): Nero profondo e blu notte galattico.
  - Maniglie di cattura (_Trap Handles_): **Giallo ocra / ambra brillante** ad altissima visibilità.
  - Linea temporale: Gradiente temporale che vira dai toni caldi della terra ai toni freddi e stellari del Big Bang.
- **Composizione e layout [Verificato]:**
  - Layout widescreen a tutta pagina con la timeline orizzontale/curva come elemento scultoreo centrale.
  - Lo slider temporale è unico nel suo genere: non è un normale slider a punto singolo, ma un **doppio cursore di cattura (intervallo `[FROM, TO]`) con regolazione indipendente o traslazione di blocco**.

---

## 2. Struttura Completa delle Schermate

### 2.1 Homepage & Menu Principale

- **Header [Verificato]:** Logo `GAZILLION`, payoff `THE DAILY TIME TRIP`, selettore lingua `EN` / `ES`, timer conto alla rovescia al prossimo puzzle (`--:--:--`).
- **Regole chiave in 3 pillole [Verificato]:**
  1. _Moment:_ Ricevi un fatto storico (es. "The first iPhone goes on sale").
  2. _Trap the year:_ Intrappoli l'anno tra due maniglie gialle. Più la trappola è stretta, più punti guadagni.
  3. _Dinosaur Time Trip:_ I punti mandano il tuo dinosauro indietro nel tempo: castelli, piramidi, mammut... fino al Big Bang.
- **Pulsanti di lancio [Verificato]:**
  - `HOW TO PLAY · 30 SEC` (mini-tutorial animato).
  - `🎮 PRACTICE ROUND` (sessione di prova non a tempo con 2 momenti).
  - `DAILY #5 · TUESDAY 27 OCTOBER` (la sfida del giorno da 5 momenti).
  - Selettore modalità: `Daily 5 (one try a day)` vs `∞ Infinite (3 lives)`.

### 2.2 Schermata di Gioco (The Time Slider)

- **HUD superiore [Verificato]:**
  - Categoria/Era dell'evento: es. `ERA: 🏙️ Modern Era`.
  - Indicatore turno: `PRACTICE 1 OF 2` o `ROUND 1 OF 5`.
  - Punteggio corrente o modalità (es. `SCORE: 0` o `Practice`).
  - Timer: 40 secondi a round (nella modalità Daily/Infinite).
- **L'evento storico [Verificato]:**
  - Testo chiaro dell'evento (es. _"The first iPhone goes on sale"_, _"The storming of the Bastille"_, _"First evidence of cooked food"_).
- **Il controller a doppia maniglia (The Range Trap) [Verificato]:**
  - Cursore sinistro: `FROM (earliest)` con unità contestuali (`AD`, `BC`, `K yrs ago`, `M yrs ago`, `B yrs ago`).
  - Cursore destro: `TO (latest)` con le medesime unità.
  - Maniglia centrale: `◀ MOVE ▶` per traslare l'intero intervallo senza modificarne la larghezza.
  - Comandi zoom: `ZOOM OUT`, `FULL`.
  - Indicatore ampiezza: `Range: [X] years` (mostra l'ampiezza in anni della finestra selezionata).
  - Tasto di blocco: `Lock it in` per confermare la stima.

### 2.3 Schermata di Feedback e Rivelazione

- **Animazione di reveal [Verificato]:**
  - L'anno esatto viene mostrato sulla linea temporale con un indicatore a bandiera/marcatore.
  - Esito:
    - Se l'anno cade all'interno dell'intervallo `[FROM, TO]`: **TRAPPED!** Suono trionfale, dinosauro che scatta indietro nel tempo, punteggio calcolato in base alla strettezza della trappola.
    - Se l'anno cade fuori: **MISSED!** Calcolo del mancamento (_Missed by X years_), attribuzione di punti parziali se l'errore è contenuto (non è mai zero per scostamenti di pochi anni).
- **Pulsante di avanzamento:** `Next Round →`.

---

## 3. Formula Matematica del Punteggio (Verificata al 100% dal Client REA)

- **Costanti di gioco [Verificato]:**
  - `ROUNDS = 5`
  - `SECONDS = 40` (per round)
  - `LIVES = 3` (nella modalità Infinite)
  - `MIN_HANDLE_SPAN = 8` anni (ampiezza minima impostabile)
  - `MAX_POINTS_PER_ROUND = 1000` pt (5.000 punti massimi per partita)
- **Asse temporale [Verificato]:** Numerazione astronomica espressa in "anni fa" (_years ago_).
- **Tolleranza scalare per antichità dell'evento:**
  Gli eventi vecchi di milioni o miliardi di anni hanno una tolleranza più elastica rispetto a eventi dell'era moderna:
  $$\text{sm} = \operatorname{smoothstep}\left(\operatorname{clamp}\left(\frac{\log_{10}(\text{age}) - 3}{2}, 0, 1\right)\right)$$
  $$\text{tolerance}(\text{age}) = (3 + \text{age} \cdot (0.08 + 0.22 \cdot \text{sm})) \cdot \left(1 - \frac{\text{age}}{1.3 \times 13.8 \times 10^9}\right)$$
- **Funzione di strettezza (Narrowness):**
  $$\operatorname{narrowOf}(w, T) = \frac{1}{1 + \left(\frac{w}{10 \cdot T}\right)^{1.3}}$$
- **Punteggio se intrappolato (Trapped):**
  $$\text{score} = \max\left(1, \operatorname{round}\left(1000 \cdot \operatorname{narrowOf}(\text{width}, T)\right)\right)$$
- **Punteggio se mancato (Miss):**
  $$\text{score} = \operatorname{round}\left(1000 \cdot 0.5 \cdot \operatorname{narrowOf}(\text{width} + \text{missBy}, T) \cdot e^{-\frac{\text{missBy}}{3 \cdot T}}\right)$$

---

## 4. Confronto con l'Implementazione Attuale nel Nostro Progetto Locale

- **Stato locale in `src/games/gazillion/` [Verificato]:**
  - Il nostro motore `engine.ts` e i test `engine.test.ts` e `validator.test.ts` contengono **già esattamente questa formula matematica autentica**, implementata con successo a seguito della prima esplorazione REA.
  - Il componente `Timeline.tsx` e `GazillionGame.tsx` contengono le doppie maniglie e la logica di calcolo.
  - **Elementi da perfezionare:**
    - Arricchire l'estetica della timeline con le illustrazioni/emoji delle ere geologiche (`MODERN ERA 🏙️` ... `BIG BANG 💥`).
    - Implementare l'animazione visiva del dinosauro viaggiatore nel tempo come feedback emotivo al reveal.
    - Aggiungere la modalità `Practice` (attualmente abbiamo solo Daily).

---

## 5. Elementi Distintivi da Preservare nel Nostro Progetto

1. **La doppia maniglia con drag combinato centrale (`◀ MOVE ▶`):** L'ergonomia dello slider temporale deve consentire sia di stringere le maniglie, sia di spostare l'intero blocco di anni lungo la storia.
2. **La formula con credito parziale sul mancamento:** Un giocatore che manca il lancio dell'iPhone di 1 solo anno non deve sentirsi frustrato da uno 0 secco; riceve un punteggio proporzionato alla vicinanza.
3. **La progressione cosmica dell'asse temporale:** Dalla storia contemporanea fino a miliardi di anni fa, gestita con scala logaritmica fluida.
