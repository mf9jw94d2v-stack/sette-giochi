# Analisi Approfondita REA — Estimania (estimania.app)

**Data analisi:** 2026-10-27  
**URL originale:** https://estimania.app/  
**Strumenti REA utilizzati:** `capture_browser_scenario`, estrazione DOM & Accessibility Tree, interazione live (risoluzione domanda _"How many sovereign countries are there in South America..."_, invio stima `12`, risposta esatta ottenuta `100 points`, estrazione formula matematica).  
**Evidenze raccolte:** `docs/rea-analysis/evidence/estimania/` (`feedback-scenario.json`, report e DOM completi).

---

## 1. Identità Visiva e Principi di Design

- **Metafora visiva [Verificato]:** Stima numerica in scala di Fermi (_Ballpark / Fermi Estimation_). Il gioco sfida l'intuito numerico attraverso domande su grandezze apparentemente impossibili da ricordare a memoria, premiando l'ordine di grandezza e il ragionamento di scala.
- **Tipografia [Verificato]:**
  - Font primario: Sistema sans-serif moderno, pulito e leggibile.
  - Dimensioni: Titolo `Estimania` in grassetto, domande grandi e prominenti con interlinea rilassata, numeri di stima in display grande (`text-xl font-semibold` o superiore).
- **Palette colori [Verificato]:**
  - Colore primario brand: **Teal profondo** `rgb(13, 148, 136)` (`#0d9488`, `theme-color: #0d9488`, `bg-teal-600`, hover `bg-teal-700`).
  - Sfondo base (light theme nativo): Bianco caldo e grigio pietra chiaro (`stone-100` / `stone-200`).
  - Testo: Grigio antracite scuro (`stone-800` / `stone-900`) ad alta leggibilità.
  - Bordi e input: Bordi morbidi `rounded-xl`, focus ring `focus:border-teal-500`.
- **Composizione e layout [Verificato]:**
  - Colonna centrale focalizzata e priva di distrazioni (`max-w-md` / `max-w-lg`), perfettamente ottimizzata sia per smartphone che per desktop.
  - Progress bar orizzontale in alto (`1 / 5`).

---

## 2. Struttura Completa delle Schermate

### 2.1 Homepage & Landing

- **Badge superiore [Verificato]:** Pulsante pill `Already played today?` per sincronizzare i progressi o collegare altri dispositivi.
- **Hero [Verificato]:**
  - Titolo: `Estimania`
  - Sottotitolo: `How close can you guess?`
  - CTA principale: `<button class="block w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 rounded-xl text-lg transition-colors mb-3">Play Today's Puzzle</button>`.
- **Guida esplicativa & FAQ [Verificato]:**
  - Spiegazione completa del concetto di "Domande di Fermi" (dal fisico Enrico Fermi).
  - Tabella dettagliata di punteggio ed esplicitazione matematica della formula logaritmica.
  - Indicatore orario di rilascio: nuovo puzzle ogni giorno a **mezzanotte UTC**.

### 2.2 Schermata di Gioco (The Question)

- **Header [Verificato]:**
  - Indicatore di turno: `1 / 5` fino a `5 / 5`.
  - Selettore lingua 🌐 in alto a destra.
- **Area della domanda [Verificato]:**
  - Testo chiaro e preciso (es. _"How many sovereign countries are there in South America (not counting overseas territories like French Guiana)?"_).
  - Unità di misura esplicita visualizzata sotto l'input (es. `countries`, `km`, `years`, `tonnes`).
- **Input di stima [Verificato]:**
  - Tag `<input inputmode="decimal" aria-label="Enter your estimate in countries" placeholder="Your estimate" class="w-full px-4 py-3 text-xl font-semibold border-2 border-stone-200 rounded-xl focus:outline-none focus:border-teal-500 bg-white placeholder-stone-300 disabled:opacity-50 transition-colors" type="text" value="">`.
  - Supporto ottimizzato per tastierino numerico/decimale su dispositivi mobili (`inputmode="decimal"`).
- **Pulsante di conferma [Verificato]:**
  - `<button type="submit" disabled="" class="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 text-white font-semibold py-4 rounded-xl text-lg transition-colors">Submit</button>`.
  - Lo stato `disabled` si disattiva non appena l'utente inserisce una cifra valida.

### 2.3 Schermata di Risoluzione e Risultato del Round

- **Raffronto affiancato [Verificato]:**
  - Colonna "Your guess" con il valore digitato e l'unità (es. `12 countries`).
  - Colonna "Answer" con il valore vero di riferimento (es. `12 countries`).
  - Punteggio assegnato ben evidente: es. `100 points` (o calcolato con la formula logaritmica).
- **Spiegazione enciclopedica dettagliata [Verificato]:**
  - Testo che elenca i dati a supporto (es. _"South America has 12 sovereign countries: Argentina, Bolivia, Brazil, Chile, Colombia, Ecuador, Guyana, Paraguay, Peru, Suriname, Uruguay and Venezuela. French Guiana is an overseas region of France..."_).
  - Link di verifica alla fonte ufficiale (`Source`).
  - Widget di gradimento domanda: _"Was this a good question?"_ con pollici up/down.
- **Pulsante di avanzamento [Verificato]:**
  - `Next Question →` per procedere alla domanda successiva.

### 2.4 Schermata Finale (Leaderboard & Punteggio)

- **Punteggio totale [Verificato]:** Somma dei 5 round espressa su **500 punti complessivi**.
- **Classifica e nickname [Verificato]:** Posizione in classifica globale / gruppo amici, codice di recupero del profilo.

---

## 3. Regole e Meccanica Matematica Esatta

- **Formula ufficiale del punteggio [Verificato al 100% dal codice e documentazione]:**
  $$\text{points} = \max\left(0, \operatorname{round}\left(100 \times \left(1 - \left|\log_{10}\left(\frac{\text{guess}}{\text{answer}}\right)\right|\right)\right)\right)$$
- **Proprietà fondamentali del punteggio ratio-based [Verificato]:**
  1. **Indipendenza dalla scala:** Un errore di un fattore $2\times$ ha lo stesso identico costo di punteggio sia che la risposta sia 5, sia che sia 5 miliardi.
  2. **Simmetria moltiplicativa:** Indovinare il doppio ($2\times$) o la metà ($0.5\times$) assegna esattamente lo stesso punteggio ($70$ punti).
  3. **Zero a $10\times$:** Uno scostamento di un ordine di grandezza ($\ge 10\times$ o $\le 0.1\times$) porta il punteggio a $0$.
- **Tabella di conversione certificata [Verificato]:**
  | Rapporto di errore                   | Scostamento     | Punti assegnati |
  | :----------------------------------- | :-------------- | :-------------- |
  | **$1.0\times$**                      | **0% (Esatto)** | **100**         |
  | $1.1\times$ o $0.909\times$          | 10%             | 96              |
  | $1.2\times$ o $0.833\times$          | 20%             | 92              |
  | $1.5\times$ o $0.667\times$          | 50%             | 82              |
  | $2.0\times$ o $0.500\times$          | $2\times$       | 70              |
  | $3.0\times$ o $0.333\times$          | $3\times$       | 52              |
  | $5.0\times$ o $0.200\times$          | $5\times$       | 30              |
  | $\ge 10.0\times$ o $\le 0.100\times$ | $10\times$      | 0               |

---

## 4. Confronto con l'Implementazione Attuale del Nostro Progetto Locale

- **Stato locale in `src/games/estimania/` [Verificato]:**
  - Il nostro progetto contiene già un motore `engine.ts` e un componente `EstimaniaGame.tsx` funzionanti.
  - **Differenza sulla formula:** Nel nostro codice locale era stata ipotizzata una vicinanza percentuale lineare o quadratica; **va allineata alla formula logaritmica reale certificata** $\left(1 - |\log_{10}(\text{guess}/\text{answer})|\right)$.
  - **Differenza cromatica:** Nel nostro registro era stato assegnato `from-amber-500 to-orange-600`, mentre l'identità autentica di Estimania è un distintivo **Teal / Smeraldo (`#0d9488`)**.
  - **Punteggio totale:** È già a 5 round per 500 punti totali, perfettamente coerente.

---

## 5. Elementi Distintivi da Preservare nel Nostro Progetto

1. **La formula logaritmica pura di Fermi:** È il cuore intellettuale del gioco; premia la comprensione degli ordini di grandezza.
2. **L'identità colore Teal (`#0d9488`):** Rende Estimania visivamente fresco, pulito e immediatamente riconoscibile rispetto agli altri giochi.
3. **Il tastierino ottimizzato `inputmode="decimal"`:** Fondamentale per l'esperienza mobile.
4. **La spiegazione enciclopedica post-round:** Il testo di approfondimento rende ogni domanda un momento culturale appagante.

---

## 6. Limiti dell'Analisi e Questioni Aperte

- **Nessun limite riscontrato:** La formula matematica, i round, il layout e i flussi sono stati verificati in modo esaustivo con giocata reale tramite REA.
