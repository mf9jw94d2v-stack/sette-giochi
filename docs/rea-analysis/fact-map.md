# Analisi Approfondita REA — Fact Map (factmap.world)

**Data analisi:** 2026-10-27  
**URL originale:** https://www.factmap.world/  
**Strumenti REA utilizzati:** `capture_browser_scenario`, gestione modale cookie consent, estrazione DOM & Accessibility Tree, analisi canvas e librerie vettoriali (`MapLibre GL`).  
**Evidenze raccolte:** `docs/rea-analysis/evidence/fact-map/` (`01-landing-clean.png`, `landing-full.png`, `gameplay-scenario.json`, report e screenshot).

---

## 1. Identità Visiva e Principi di Design

- **Metafora visiva [Verificato]:** Esplorazione cartografica e spillo nel globo (_Pin on Map / Geo-fact_). Un fatto storico, scientifico o culturale viene abbinato a una posizione geografica reale da individuare sulla mappa.
- **Tipografia [Verificato]:**
  - Font primario: `Outfit` (sans-serif geometrico elegante e contemporaneo).
  - Dimensioni: H1 display `41.6px` (font-medium), H1 sezioni `26px`, H2 etichette `13px font-semibold uppercase tracking-[0.12em]`, body `16px`.
- **Palette colori [Verificato]:**
  - Sfondo base (stile carta naturale): `rgb(239, 239, 239)` (`#efefef`, grigio chiaro caldo / pergamena moderna).
  - Testo primario: `rgb(58, 47, 28)` (marrone grafite caldo molto scuro) e `rgb(20, 20, 20)` (`#141414`).
  - Bordi e linee di griglia: `border-graphite` (linee fini da mappa topografica).
  - Pannelli fluttuanti: `bg-panel/85` con backdrop blur, ombre delicate e bordi geometrici netti.
  - Colore pin e focus: Smeraldo / grafite con accenti terracotta.
- **Composizione e layout [Verificato]:**
  - Layout **full-page a mappa immersiva**: la mappa interattiva copre l'intero viewport senza barre di scorrimento durante la partita.
  - Gli elementi dell'interfaccia (domanda, punteggio, controlli) sono pannelli HUD sospesi e semi-trasparenti sopra la mappa.

---

## 2. Struttura Completa delle Schermate

### 2.1 Homepage & Landing

- **HUD superiore [Verificato]:**
  - Indicatore turno: `ROUND 01 / 01` (o `01 / 05`).
  - Punteggio corrente: `SCORE 0`.
  - Menu hamburger e pulsante di inizio.
- **Card di benvenuto fluttuante [Verificato]:**
  - Titolo poetico e conciso: "A fact. A map. Your guess."
  - Descrizione: "Five new questions every day. Pin your guesses, get your score, share the damage."
  - Bottone principale di avvio: div interattivo `Start guessing` / `PLACE YOUR PIN`.
- **Sezione istruzioni ("How to play FactMap") [Verificato]:**
  - 4 passaggi illustrati:
    1. _Read the question:_ Ogni round riguarda un luogo reale; la barra sottostante indica il livello di precisione richiesto (città, sito archeologico/naturale, regione o nazione).
    2. _Stuck? Take the hint:_ 1 indizio per round, che riduce il punteggio massimo da 1.000 a 750 punti.
    3. _Drop your pin:_ Tocca la mappa, zooma per essere preciso, poi conferma.
    4. _See how close you were:_ La posizione corretta, la distanza in km, il punteggio e la storia dietro il fatto.

### 2.2 Schermata di Gioco (The Map Round)

- **HUD della domanda [Verificato]:**
  - Posizionato al centro in alto, in un riquadro pulito con bordo grafite.
  - Testo della domanda (es. _"Where did Julius Caesar die?"_).
  - Barra di precisione / target: es. `Aim for a city` (o `Aim for a country`, `Aim for a site`).
  - Punteggio massimo in palio: `/1,000`.
  - Tasto indizio: `HINT ?` con chiara indicazione del costo (`-250 pts`).
- **Mappa interattiva [Verificato]:**
  - Renderizzata tramite libreria **MapLibre GL** su canvas WebGL (`maplibre: 11` nel DOM).
  - Supporto per pan fluido, pinch-to-zoom / rotella del mouse, zoom controls dedicati.
  - Stile cartografico personalizzato: pulito, minimale, senza toponimi rivelatori o spoiler nelle aree di interesse.
- **Controlli di conferma [Verificato]:**
  - Posizionamento dello spillo con click/tap.
  - Tasto inferiore: `Place your pin` / `Confirm guess`.

### 2.3 Schermata di Risoluzione e Risultato del Round

- **Animazione di reveal [Verificato]:**
  - Viene mostrato lo spillo del giocatore e, con un'animazione a molla, il pin della posizione reale esatta.
  - Tracciamento di una linea geodesica tra i due punti con la misurazione della distanza in km (es. _"42 km away"_).
  - Assegnazione punti: da 0 a 1.000 punti in base alla vicinanza.
- **La storia dietro il fatto [Verificato]:**
  - Scheda informativa contestuale che racconta il contesto storico/scientifico del luogo prima di passare al round successivo.

---

## 3. Regole e Meccaniche Osservate

- **Struttura partita [Verificato]:** 5 domande al giorno, rinnovate a mezzanotte ora di Parigi.
- **Punteggio per round [Verificato]:**
  - Massimo: 1.000 punti a round (5.000 punti totali giornalieri).
  - Meccanismo _Bullseye_: entro un raggio di tolleranza stretto attorno al bersaglio si ottengono 1.000 punti pieni.
  - Decadimento continuo: oltre il raggio perfetto, il punteggio decresce con una curva morbida in base ai km di distanza.
  - Modalità Paese (_Country Guess_): quando il bersaglio è un'intera nazione, il gioco adotta regole dedicate (1.000 pt se dentro il confine, punti parziali per gli stati confinanti, oppure top ten).
- **Meccanica Indizio (_Hint_) [Verificato]:**
  - 1 indizio disponibile per round.
  - Attivarlo taglia il massimale del round a 750 punti (penalità di 250 pt), offrendo un testo di orientamento o restringendo l'area geografica.

---

## 4. Tecnologia e Librerie Utilizzate

- **Motore cartografico [Verificato]:** `MapLibre GL` (vettore WebGL su HTML5 Canvas).
- **Stile mappa:** Tiles vettoriali custom prive di etichette per gli indovinelli specifici.
- **Framework:** Next.js / React con Tailwind CSS.

---

## 5. Elementi Distintivi da Preservare nel Nostro Progetto

1. **Layout a mappa a tutto schermo:** Fact Map non è una card stretta; la mappa deve respirare ed estendersi a tutto il viewport disponibile.
2. **L'indicatore del livello di scala (`Aim for a...`):** Fondamentale avvisare il giocatore se deve cercare una città (`Aim for a city`), un monumento specifico o un'intera nazione.
3. **Il sistema dell'indizio a costo fisso (-250 pt):** Aggiunge una decisione strategica interessante quando non si è sicuri della risposta.
4. **Stile grafico cartografico da diario di viaggio:** Colori caldi, carta pergamena moderna (`#efefef`), font `Outfit`, estetica raffinata da National Geographic contemporaneo.

---

## 6. Limiti dell'Analisi e Questioni Aperte

- **Calcolo esatto del decadimento in km per livello di scala:** La formula di conversione distanza -> punti varia a seconda che l'obiettivo sia un sito locale (scala 10-100 km) o una regione continentale (scala 500-2000 km). Nel nostro progetto andrà implementata una funzione di scala per categoria di bersaglio.
