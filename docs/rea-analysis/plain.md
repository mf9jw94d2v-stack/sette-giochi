# Analisi Approfondita REA — Plain (playplain.app)

**Data analisi:** 2026-10-27  
**URL originale:** https://playplain.app/  
**Strumenti REA utilizzati:** `capture_browser_scenario`, estrazione DOM & Accessibility Tree, interazione live (input digitato `40 m`, submit, cattura feedback `+180 m` / `Miss` / `57% under`).  
**Evidenze raccolte:** `docs/rea-analysis/evidence/plain/` (`01-landing-clean.png`, `02-game-start.png`, `run/01-answer-typed.png`, `run/02-feedback.png`, report JSON completi).

---

## 1. Identità Visiva e Principi di Design

- **Metafora visiva [Verificato]:** Volo aereo e quota altimetrica (_Flight Altitude_). Ogni risposta ben stimata fa salire di quota un aeroplano verso un obiettivo di missione giornaliero (es. _Reach 5,000 m_).
- **Tipografia [Verificato]:**
  - Font primario: `Geist` (sans-serif geometrico e pulitissimo di Vercel).
  - Dimensioni: H1 display hero `83.5px` (con clamp CSS), body `16px`, input text `17px`, pulsanti `20px` bold.
- **Palette colori [Verificato]:**
  - Sfondo base (dark mode nativa): `rgb(11, 13, 18)` (`#0b0d12`, nero-blu notte asfalto).
  - Superfici card / pannelli: `rgb(25, 29, 38)` (`surface-2`) e `rgb(35, 40, 53)`.
  - Testo primario: `rgb(243, 245, 249)` (`#f3f5f9`, bianco ghiaccio puro).
  - Testo secondario / muted: `rgb(155, 163, 180)` (`#9ba3b4`).
  - Colore accento primario: `rgb(210, 250, 75)` (`#d2fa4b`, **lime/chartreuse neon ad alto contrasto**).
- **Composizione e spaziatura [Verificato]:**
  - Griglia minimalista e ariosa, proporzioni widescreen 16:9 native.
  - Nessun elemento superfluo: massima leggibilità, angoli arrotondati morbidi (`rounded-md`, `rounded-xl`).

---

## 2. Struttura Completa delle Schermate

### 2.1 Homepage & Landing

- **Header [Verificato]:** Logo stilizzato `Plaı n.` (con punto finale e accento minimalista), selettore modalità `Daily` / `Competitive`.
- **Hero Section [Verificato]:**
  - Data e numero sfida: `PLAIN #10 · TUESDAY, OCTOBER 27`.
  - Titolo gigante: "Get as close as you can."
  - Descrizione sintetica: "7 targets a day. Name the closest thing you know, and every good answer climbs your plane."
- **Card della Missione del Giorno [Verificato]:**
  - `TODAY'S FLIGHT`: indicazione "Play: 7 rounds · about 3 min".
  - Barra di progresso obiettivo: `Today's mission · Reach 5,000 m` (stato iniziale: `0 / 5,000 m`).
  - Pulsante CTA primario: `Play: 7 rounds · about 3 min` in colore lime neon (`rgb(210, 250, 75)`).
- **Footer [Verificato]:** Link How to play, About, FAQ, Archive, Creators, Sources.

### 2.2 Schermata di Gioco (The Flight)

- **Barra di stato superiore [Verificato]:**
  - Logo `Plain`, numero puzzle `#10`.
  - Quota altimetrica attuale in tempo reale (es. `0 m` che sale a `180 m`, `1,250 m`...).
  - Pulsante mute per gli effetti audio (icona altoparlante `rgb(155, 163, 180)`).
- **Area del Round [Verificato]:**
  - Icona categoria ed etichetta: es. `🗼 LANDMARKS BY NUMBERS, ROUND 1 OF 7`.
  - La domanda di stima: es. _"How tall is the Statue of Liberty, ground to torch tip?"_
  - Unità di misura richiesta: _"Answer in metres"_.
- **Area di Input [Verificato]:**
  - Campo testo stilizzato: `h-14 w-full rounded-md bg-surface-2 pl-4 pr-20 text-body font-medium`.
  - Suggerimento inline: _"Type a number. Any number works. Closer = higher climb."_
  - Pulsante invio integrato a destra nel campo con icona freccia / Enter (`Lock in answer`).
  - Scorciatoia da tastiera: `Enter to lock in`.

### 2.3 Schermata di Feedback e Risultato del Round

- **Raffronto immediato [Verificato]:**
  - `You guessed: 40 m`
  - `The answer: 93 m`
  - Verdetto sintetico: `Miss` (o `Bullseye` / `Close`)
  - Scostamento percentuale: `57% under` (oppure `12% over`, ecc.)
  - Guadagno di quota: `+180 m` con animazione del contatore altimetrico.
- **Nota contestuale e fonte [Verificato]:**
  - Curiosità esplicativa: _"The statue herself is only about 46 m from base to torch, so the pedestal and foundation make up half the height."_
  - Attribuzione della fonte ufficiale: _"Source: Statue Statistics – Statue of Liberty National Monument (NPS)"_.
- **Pulsante di avanzamento [Verificato]:**
  - Pulsante full-width lime neon `Next round` (`rgb(210, 250, 75)`).

---

## 3. Regole e Meccaniche Osservate

- **Obiettivo [Verificato]:** Raggiungere la quota target della missione (es. 5.000 metri) in 7 round.
- **Tipologia di sfide [Verificato]:** Domande quantitative e numeriche del mondo reale ("Landmarks by Numbers", dimensioni, altezze, velocità, distanze).
- **Formula del guadagno altimetrico [Inferito]:**
  - Una risposta esatta o vicinissima (entro una tolleranza minima) attribuisce il massimo guadagno (es. ~1.000 m per round).
  - Più ci si allontana in percentuale dal valore reale, più il guadagno decade, ma non si scende mai a un secco zero a meno di errori mostruosi (es. uno scostamento del 57% under ha comunque fruttato `+180 m`).
- **Durata stimata [Verificato]:** ~3 minuti per l'intera sessione di 7 round.

---

## 4. Animazioni ed Effetti Visivi

- **Altimetro dinamico [Verificato]:** Numero di metri che sale con un effetto CountUp fluido all'assegnazione dei punti.
- **Barra di progressione [Verificato]:** La barra di avanzamento della missione si riempie visivamente man mano che la quota sale verso i 5.000 m.
- **Feedback cromatico [Inferito]:** Elementi verde lime per stime eccellenti, arancio per stime intermedie, tonalità desaturate/rosse per errori marcati.

---

## 5. Elementi Distintivi da Preservare nel Nostro Progetto

1. **Il lime neon (`#d2fa4b`) su sfondo notte profonda (`#0b0d12`):** Crea un'estetica moderna, sofisticata e piacevole, ispirata al design engineering contemporaneo (stile Vercel / Linear).
2. **La metafora dell'altitudine (`m` scalati):** Il punteggio non è un anonimo "punti", ma l'altezza raggiunta dall'aeroplano.
3. **Indicazione chiara dell'errore relativo:** Mostrare sempre `X% under` o `X% over` rende l'errore immediatamente comprensibile al giocatore.
4. **La curiosità educativa post-round con fonte:** L'aneddoto dopo ogni risposta trasforma un semplice quiz in un momento di apprendimento memorabile.

---

## 6. Limiti dell'Analisi e Questioni Aperte

- **Curva esatta di conversione percentuale -> metri:** Dal nostro test, un errore del 57% ha generato 180 m su un ipotetico massimo di ~750-1000 m. La formula esatta di decadimento (lineare vs logaritmica) è inferita ma non esplicitata nel DOM pubblico.
