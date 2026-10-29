# Analisi Approfondita REA — Size It Up (magnitudle.com)

**Data analisi:** 2026-10-27  
**URL originale:** https://magnitudle.com/ / https://magnitudle.com/size-it-up  
**Strumenti REA utilizzati:** `capture_browser_scenario`, estrazione DOM & Canvas inspection, interazione live (pressione pulsante `Lock In`, osservazione animazione di reveal, punteggio `50/100`, calcolo errore `Off by 36%`, transizione a `Next Round`).  
**Evidenze raccolte:** `docs/rea-analysis/evidence/size-it-up/` (`reveal-scenario.json`, DOM and screen snapshots).

---

## 1. Identità Visiva e Principi di Design

- **Metafora visiva [Verificato]:** Confronto visivo di scala e proporzione su telaio grafico (_Visual Silhouette Resizing_). Il giocatore deve ridimensionare visivamente una sagoma sagomata di colore rosso accanto a un oggetto di riferimento di colore blu, finché la proporzione relativa non appare realistica e veritiera.
- **Tipografia [Verificato]:**
  - Font display: Sans-serif caldo e moderno con numeri tabulari bold per il punteggio (`font-black tabular-nums`).
  - Etichette tecniche: `font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground`.
- **Palette colori [Verificato]:**
  - Sfondo base: Crema/sabbia caldo naturale `rgb(255, 250, 244)` (`#fffaf4`), con bordi sabbia `border-[#cfb49c]`.
  - Sagoma di Riferimento (fissa): **Blu scuro / indaco profondo** `rgb(30, 58, 138)` (`#1e3a8a`).
  - Sagoma Target (ridimensionabile dall'utente): **Rosso terracotta / vermiglio** `rgb(171, 52, 40)` (`#ab341f`).
  - Pulsanti di zoom e controlli: Sfondo beige chiaro `bg-[#fff8ef]`, testo marrone scuro `text-[#6f3b25]`, hover `bg-[#f3e4d2]`.
  - Pulsante Lock In: Rosso vermiglio con ombra calda `shadow-[0_10px_22px_rgba(171,52,40,0.24)]`.
- **Composizione e layout [Verificato]:**
  - Al centro domina un **Canvas HTML5 dedicato** con risoluzione nativa `840x510 px`, racchiuso in una cornice elegante (`border-2 border-[#cfb49c] rounded-xl`).
  - Gli indici di round (`Round 1 / 5`) e punteggio parziale (`Score 0`) sono posizionati subito sopra il canvas.
  - Sotto il canvas si trovano le didascalie dei due soggetti a confronto e il pulsante d'azione principale.

---

## 2. Struttura Completa delle Schermate

### 2.1 Homepage di Magnitudle

- **Header [Verificato]:** Logo `Magnitudle`, sottotitolo "The official home of Size It Up", badge statistiche personali (`Overall streak`, `Personal best`).
- **Griglia delle modalità [Verificato]:**
  1. `Size It Up Daily` — "Match real-world scale." (La modalità classica originale).
  2. `Pop Culture Daily` — "Match fictional scale." (Confronti tra personaggi/oggetti della cultura pop e finzione).
  3. `Geography Daily` — "Match geographic scale." (Confronti tra isole, laghi, territori).
  4. `The Weekly 1K` — 10 round a tema settimanale.
  5. `Weigh It Up` — Bilanciare il peso di oggetti reali.
  6. `Daily Question` — Una stima numerica secca al giorno.
  7. `Survival Mode` — Sfida a eliminazione a tempo.

### 2.2 Schermata di Gioco (Size It Up Board)

- **Canvas Interattivo [Verificato]:**
  - `<canvas width="840" height="510" class="block h-auto w-full rounded-xl border-2 border-[#cfb49c]" aria-label="Size It Up game board" style="cursor: default; touch-action: none;"></canvas>`.
  - Supporta touch e mouse drag per ingrandire/rimpicciolire la sagoma rossa.
- **Controlli su Canvas [Verificato]:**
  - In alto a destra: pulsanti fluttuanti `Zoom in (restore scale)` e `Zoom out for more resizing space`.
  - In alto a sinistra: badge punteggio semi-trasparente che compare durante e dopo la mossa.
- **Area Didascalie e Oggetti [Verificato]:**
  - Sinistra:
    - `Reference: Concert Grand Piano (Steinway Model D) (Length to scale)` (in colore blu `#1e3a8a`).
    - `Target: Humpback Whale Calf (Newborn) (Adjust the length)` (in colore rosso `#ab341f`).
  - Destra:
    - Pulsante d'azione `<button data-slot="button" class="... bg-primary text-primary-foreground ...">Lock In</button>`.

### 2.3 Schermata di Feedback e Rivelazione

- **Animazione di reveal [Verificato]:**
  - All'invio con `Lock In`, la vera sagoma in scala reale si sovrappone o si allinea alla stima del giocatore.
  - Compare l'etichetta con le misure reali:
    - `Your Answer: 2.74 m`
    - `Actual: 4.3 m (length)`
    - `Off by 36%`
  - Il punteggio del round viene animato: es. `50 / 100`.
  - Compare il pulsante ausiliario `Fit both` (per inquadrare automaticamente entrambi gli oggetti a figura intera nel canvas).
  - Il pulsante d'azione diventa `Next Round →`.

---

## 3. Regole e Meccaniche Osservate

- **Obiettivo [Verificato]:** Scalare la silhouette dell'oggetto bersaglio finché la sua dimensione relativa rispetto all'oggetto di riferimento non corrisponde alla realtà.
- **Struttura partita [Verificato]:** 5 confronti per partita quotidiana.
- **Punteggio [Verificato]:**
  - Massimo 100 punti per round (500 punti totali a partita).
  - **Regola del 6% di tolleranza [Verificato dal testo ufficiale]:** _"Earn up to 100 points. An estimate within 6% of the target earns the full 100."_
  - Al di fuori del 6%, il punteggio decresce progressivamente con l'aumentare della percentuale di errore (es. nel nostro test un errore del 36% ha attribuito esattamente 50 punti su 100).

---

## 4. CONFRONTO CRITICO con l'Implementazione Attuale nel Nostro Progetto Locale

> [!WARNING]
> **Discrepanza fondamentale di gameplay riscontrata nel progetto locale:**
> Nel nostro repository locale in `src/games/size-it-up/SizeItUpGame.tsx` e `types.ts`, il gioco era stato erroneamente modellato come un quiz a scelta multipla tra due opzioni testuali:
>
> ```ts
> interface Reveal {
>   prompt: string;
>   a: SizeOption;
>   b: SizeOption;
>   pick: "a" | "b" | null;
>   correct: boolean;
>   points: number;
> }
> ```
>
> con una domanda tipo "Quale oggetto è più pesante o più grande tra A e B?".
>
> **Il gioco autentico originale Magnitudle / Size It Up è completamente diverso e visivo:** è un **manipolatore 2D a silhouette su canvas** dove l'utente trascina per ridimensionare la sagoma rossa accanto a quella blu, regolando l'ampiezza/lunghezza relativa in pixel!
>
> La nostra implementazione deve evolvere verso un canvas interattivo con sagome vettoriali/SVG ridimensionabili per rispecchiare l'esperienza vera del gioco originale.

---

## 5. Elementi Distintivi da Preservare nel Nostro Progetto

1. **Il canvas visuale con le due sagome blu e rossa:** È l'anima di Size It Up; non deve assolutamente essere ridotto a un form testuale o a un quiz A/B.
2. **La palette sabbia/terracotta/indaco (`#fffaf4`, `#cfb49c`, `#1e3a8a`, `#ab341f`):** Dà al gioco una personalità calda, quasi da museo di scienze naturali o enciclopedia illustrata.
3. **La regola del 6% di tolleranza:** Fornisce al giocatore un obiettivo di precisione tangibile e gratificante (_Perfect!_ entro il 6%).
4. **Il pulsante "Fit both":** Permette di visualizzare le due entità a pieno schermo quando le differenze di scala sono estreme (es. un pianoforte vs un cucciolo di balena o la Torre Eiffel).

---

## 6. Limiti dell'Analisi e Questioni Aperte

- **Dati e asset sagome:** Magnitudle utilizza un archivio curato di sagome vettoriali 2D. Nel nostro progetto dovremo dotarci di un set di sagome vettoriali SVG aperte/licenziabili o generarne di geometriche e pulite per i confronti dimensionali.

---

## 7. Verifica dal vivo del 28 ottobre 2026

Rianalisi diretta di `https://magnitudle.com/size-it-up` con il browser
integrato (cookie non essenziali rifiutati). Il sito nel frattempo usa un tema
scuro: la palette sabbia descritta sopra non è più quella attuale.

**Confermato osservando il gioco:**

- Sottotitolo: _"Match the silhouette to its real-world scale."_ Indicatori
  `ROUND 1 / 5` e `SCORE 0` sopra il canvas.
- Le due sagome poggiano su una **linea di terra comune**. Il riferimento
  (blu) ha accanto una **guida tratteggiata** che ne segna la misura.
- Il bersaglio (rosso) ha una **maniglia di ridimensionamento sull'angolo in
  alto a destra**; due pulsanti circolari di zoom stanno sul canvas.
- Le didascalie dichiarano l'asse di ciascun oggetto: _Reference: Tennis
  Racket (Height to scale)_ / _Rubik's Cube (Classic 3×3) (Adjust the
  height)_. Nel round osservato i due oggetti erano confrontati **sullo stesso
  asse**.
- Alla conferma (`Lock In`) la **sagoma reale compare dentro la stima**, nello
  stesso sistema di coordinate, e appare il pulsante `Fit both`.

**Terzo punto di calibrazione del punteggio (nuovo):** con stima `68.5 cm` su
un valore reale di `5.7 cm`, il gioco ha mostrato `Off by 1102%` e assegnato
`0 / 100`.

Questo conferma che l'errore mostrato è l'errore relativo ordinario
`|stima − vero| / vero` (68,5 / 5,7 − 1 = 1102 %) e che può superare il 100 %.
Insieme ai due punti già noti (6 % → 100, 36 % → 50) è la base su cui è
calibrata la nostra curva, documentata in `src/games/size-it-up/engine.ts`.

**Limite dichiarato:** tre punti non determinano una curva. La forma fra l'uno
e l'altro, e oltre, è una nostra scelta — simmetrica nel logaritmo del
rapporto — non una ricostruzione della loro.
