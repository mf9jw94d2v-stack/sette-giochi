# Master Report Forense di Reverse Engineering UI/UX

**Piattaforma:** Sette Giochi (`~/Projects/seven-games-platform`)  
**Data dell'indagine:** 28 Ottobre 2026  
**Auditor:** Antigravity + Gemini 3.8 Flash (Design Systems Architect & Forensic UI/UX Engineer)  
**Ambiente di test:** Chromium Headless (Google Chrome 155 su macOS), Vite 8 Dev Server su `http://localhost:5173/`  
**Cartella Evidenze Visive e Misurazioni:** `docs/ui-ux-reverse-engineering/evidence/`  
**Vincolo operativo:** Ispezione non distruttiva (nessun file di codice sorgente modificato).

---

## Indice Generale

1. [Executive Design Overview](#1-executive-design-overview)
2. [Inventario Globale dell'Interfaccia Web](#2-inventario-globale-dellinterfaccia-web)
3. [Dossier di Design dei Sette Giochi (Analisi Individuale)](#3-dossier-di-design-dei-sette-giochi-analisi-individuale)
   - [3.1 Gazillion (`/games/gazillion`)](#31-gazillion-gamesgazillion)
   - [3.2 Estimania (`/games/estimania`)](#32-estimania-gamesestimania)
   - [3.3 Size It Up (`/games/size-it-up`)](#33-size-it-up-gamessize-it-up)
   - [3.4 Plain (`/games/plain`)](#34-plain-gamesplain)
   - [3.5 Krillion (`/games/krillion`)](#35-krillion-gameskrillion)
   - [3.6 GeoSlice (`/games/geoslice`)](#36-geoslice-gamesgeoslice)
   - [3.7 Fact Map (`/games/fact-map`)](#37-fact-map-gamesfact-map)
4. [Specifiche del Design System e Token Estratti](#4-specifiche-del-design-system-e-token-estratti)
5. [Matrice Comparativa dei Sette Giochi](#5-matrice-comparativa-dei-sette-giochi)
6. [Analisi Forense dell'Architettura Componenti e del "Card Container Problem"](#6-analisi-forense-dellarchitettura-componenti-e-del-card-container-problem)
7. [Registro dei Difetti di Design (Priorità P0–P3)](#7-registro-dei-difetti-di-design-priorità-p0p3)
8. [Roadmap Raccomandata di Miglioramento UI/UX](#8-roadmap-raccomandata-di-miglioramento-uiux)
9. [Registro di Evidenza e Confidenza](#9-registro-di-evidenza-e-confidenza)

---

## 1. Executive Design Overview

### 1.1 Identità Visiva Complessiva

La piattaforma **Sette Giochi** si presenta con una cifra stilistica editoriale pulita e calda:

- **Palette della Scocca ("The Shell"):** Grafite caldo e ottone chiaro (`--background: hsl(40 9% 96%)` in light mode, `hsl(30 8% 7%)` in dark mode). La scocca globale è volutamente neutra e discreta per non competere cromaticamente con le palette sature e vibranti dei singoli giochi.
- **Tipografia Guida:** Coesistenza di `Bricolage Grotesque` per le titolazioni display (`--font-display`), `Inter` per il testo funzionale e body (`--font-sans`), e `JetBrains Mono` per gli indicatori numerici/data (`--font-mono`).
- **Griglia e Superfici:** Sistema a 3 livelli di superficie (`--background`, `--surface`, `--surface-2`), raggio di curvatura base a `12px` (`--radius: 0.75rem`), e bordi delicati in tinta calda (`hsl(38 10% 86%)`).

### 1.2 Punti di Forza Rilevati

1. **Design System di Base Coerente:** `index.css` definisce un'architettura token solida basata su Tailwind v4 con transizioni standardizzate (`--dur-fast: 140ms`, `--dur-base: 240ms`, `--dur-slow: 520ms` con curva `cubic-bezier(0.22, 1, 0.36, 1)`).
2. **Componente `GamePlate` Eccellente:** Le tessere di selezione gioco nella homepage e nella vista `/games` possiedono una forte identità tattile (gradiente specifico 140°, motivo SVG astratto in risalto `scale(1.08)` all'hover, feedback di elevazione `-3px`).
3. **Illustrazione Editoriale Hero:** L'integrazione di `hero-illustration.png` con maschera `mask-image: linear-gradient` e `mix-blend-mode: multiply` (inversione dinamica in dark mode) conferisce alla homepage un tono da testata culturale contemporanea.

### 1.3 Debolezze Critiche Rilevate (The Container Trap)

1. **Il Problema della Card Centrata Ristretta:** Tutti i giochi sono attualmente racchiusi all'interno del contenitore globale di layout `main.max-w-6xl` e ulteriormente compressi all'interno di una scatola `max-w-lg` (512px) o `max-w-2xl` (672px). Giochi che nell'originale vivono a pieno schermo come **Fact Map** (mappa WebGL a tutto schermo) e **GeoSlice** (sezionamento demografico GIS) risultano mortificati visivamente dentro finestrelle anguste con barre di scorrimento interne.
2. **Assenza di Modali di Spiegazione ("Come si gioca"):** Sebbene nei siti originali ciascun gioco disponga di un tutorial o guida rapida integrata con modale dedicato, nella versione locale i giochi partono direttamente dalla schermata intro senza possibilità di consultare le regole dettagliate durante la sessione.
3. **Disomogeneità dell'Architettura HUD:** I primi giochi sviluppati (`Gazillion`, `Estimania`) usano una struttura `max-w-lg` senza header tag semantico, mentre i giochi più recenti (`Plain`, `Krillion`, `Fact Map`) hanno introdotto oggetti `C` e `FONT` hardcoded in linea che sovrascrivono il tema della scocca senza isolare il layout a viewport intero.

---

## 2. Inventario Globale dell'Interfaccia Web

### 2.1 Navbar Principale (`src/components/navigation/Navbar.tsx`) [Verificato]

- **Posizionamento & Dimensioni:** `sticky top-0 z-40`, altezza misurata **65px**, larghezza massima `1152px` (`max-w-6xl`).
- **Superficie:** `bg-background/85 backdrop-blur(8px)` con bordo inferiore `1px solid rgb(223, 220, 216)` (light) / `rgb(54, 50, 46)` (dark).
- **Logo:** Badge quadrato `28x28px` con raggio `6px` in colore primario (`hsl(34 62% 34%)`), cifra "7" bianca, affiancato da testo "Sette Giochi" in `Bricolage Grotesque` bold (`15px`).
- **Voci di Navigazione:** 6 destinazioni desktop (`Home`, `Giochi`, `Sfide`, `Archivio`, `Statistiche`, `Cronologia`). Stato attivo con sottolineatura animata `h-0.5 bg-primary` assoluta in basso.
- **Controllo Tema:** Toggle circolare `ThemeToggle` (Sole/Luna) con persistenza in `localStorage("sgp-theme")`.
- **Mobile Breakpoint (<768px):** Hamburger button `36x36px` con icona Lucide `Menu` / `X`, menu a discesa a larghezza intera con padding `16px 12px` e voci alte `48px`.

### 2.2 Homepage (`src/features/home/HomePage.tsx`) [Verificato]

- **Hero Banner:** Card gigante `px-6 py-12 sm:px-10 sm:py-16` con raggio `24px` (`rounded-3xl`), bagliori radiali decorativi sfumati (rosa Gazillion a destra, azzurro Krillion a sinistra). Titolo fluido `text-display` (misurato **64px** su desktop con letter-spacing `-2.24px`).
- **Sezione Griglia Giochi:** Griglia a 1 colonna (mobile) e 2 colonne (desktop) con le 7 tessere `GamePlate` in densità `tile`.
- **Footer:** Separatore orizzontale superiore `border-t border-border`, testo di attribuzione legale e link a `/profile` e `/settings`.

### 2.3 Pagina Indice Giochi (`/games`) [Verificato]

- **Header Pagina:** Titolo "I sette giochi", barra di ricerca input con icona lente e filtri a badge orizzontali per categoria (`Tutti`, `Geografia`, `Grandezze`, `Quiz`, `Stima`, `Storia`).
- **Stato di Filtro Attivo:** Tasto "Azzera filtri" quando la ricerca non produce risultati.

### 2.4 Pagine Satellite (`/archive`, `/stats`, `/settings`) [Verificato]

- `/archive`: Navigazione a schede temporali con visualizzazione calendario e badge di completamento per ciascun gioco.
- `/stats`: Griglia di metriche aggregate (Partite giocate, Precisione media, Serie attuale, Record serie).
- `/settings`: Gestione preferenze utente, toggle per audio suoni di gioco (`playSuccess`, `playMiss`), gestione tema e reset dati locali.

---

## 3. Dossier di Design dei Sette Giochi (Analisi Individuale)

---

### 3.1 Gazillion (`/games/gazillion`)

> **Metadati:** Storia · "Il viaggio nel tempo quotidiano" · Accent: `from-rose-500 to-pink-600` (`#f43f5e` / `#9f1239`)

```
┌────────────────────────────────────────────────────────┐
│  GAZILLION · SFIDA DI OGGI #1                          │
│  [ Banner Gradiente Rosa / Rubino ]                   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ "The first iPhone goes on sale"                  │  │
│  │ ───[ FROM (1995) ═══════ TO (2010) ]───────────  │  │
│  │           Ampiezza: 15 anni                      │  │
│  └──────────────────────────────────────────────────┘  │
│  [ Blocca Intervallo ]                                 │
└────────────────────────────────────────────────────────┘
```

#### A. Identità Visiva e Colori [Verificato]

- **Palette:** Gradiente testata `linear-gradient(140deg, #f43f5e, #9f1239)`, testo chiaro `#ffe4e6`, accento CTA `#fb7185`.
- **Tipografia:** Titoli in `Bricolage Grotesque`, date e anni in `JetBrains Mono`.
- **Atmosfera:** Avventura cosmica ed esplorazione cronologica.

#### B. Struttura del Container e Layout [Misurato]

- **Container:** Riquadro centrato `max-w-lg` (**512px**), raggio `16px` (`rounded-2xl`), bordo `1px solid var(--border)`.
- **Stato Intro:** Banner superiore alto `160px` con icona clessidra e badge "Sfida di oggi #1", 3 punti elenco con le regole e pulsante primario rosa vivo alto **48px**.
- **Stato Active (Gameplay):**
  - Barra superiore con progresso round `1 / 5` e punteggio totale animato con `CountUp`.
  - Scheda dell'evento storico con testo centrato.
  - Componente `Timeline.tsx`: Barra orizzontale scura con asse astronomico e due maniglie di trascinamento interattive (giallo ambra ad alto contrasto).
  - Maniglia centrale per spostare l'intero intervallo temporale senza variarne la larghezza.
  - Pulsante "Blocca intervallo" a larghezza intera.

#### C. Feedback e Risoluzione [Verificato]

- All'invio, l'anno reale viene rivelato con un ago verticale.
- Se l'anno è catturato: etichetta verde brillante `INTRAPPOLATO!` con visualizzazione punti (fino a 1.000 pt).
- Se l'anno è mancato: indicatore arancio/rosso `MANCATO DI X ANNI` con calcolo del credito parziale.

---

### 3.2 Estimania (`/games/estimania`)

> **Metadati:** Stima · "Quanto sai avvicinarti?" · Accent: `from-teal-500 to-teal-700` (`#0d9488` / `#0f766e`)

#### A. Identità Visiva e Colori [Verificato]

- **Palette:** Gradiente testata `linear-gradient(140deg, #0d9488, #0f766e)`, testo chiaro `#ccfbf1`, accento `#2dd4bf`.
- **Tipografia:** `Bricolage Grotesque` per il titolo, cifre di stima in display numerico grande.
- **Atmosfera:** Laboratorio matematico pulito, rigoroso ed elegante.

#### B. Struttura del Container e Layout [Misurato]

- **Container:** Riquadro centrato `max-w-lg` (**512px**), identico a Gazillion.
- **Stato Intro:** Banner teal profondo con badge orologio, riassunto delle 5 stime e pulsante "Inizia" teal alto 48px.
- **Stato Active (Gameplay):**
  - Domanda di Fermi prominente (es. _"Quanti paesi sovrani ci sono in Sud America?"_).
  - Campo input numerico stilizzato con `inputmode="decimal"`, font-size `20px`, padding generoso e unità di misura contestuale.
  - Tasto di invio "Invia stima" disabilitato fino alla digitazione di un numero valido.

#### C. Feedback e Risoluzione [Verificato]

- Visualizzazione affiancata: "La tua stima" vs "Risposta esatta".
- Calcolo del rapporto logaritmico ratio-based $\left(1 - |\log_{10}(G/A)|\right)$.
- Visualizzazione punti guadagnati con badge colorato e spiegazione enciclopedica del fatto con fonte.

---

### 3.3 Size It Up (`/games/size-it-up`)

> **Metadati:** Grandezze · "Dai le proporzioni" · Accent: `from-fuchsia-500 to-purple-600` (`#ab341f` / `#7a2414`)

```
┌────────────────────────────────────────────────────────┐
│  SIZE IT UP · SFIDA DI OGGI                            │
│  [ Stage SVG Naturale - Carta Sabbia #fffaf4 ]         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │   [Pianoforte Steinway]     [Cucciolo Balena]    │  │
│  │    Sagoma Blu Fissa          Sagoma Rossa        │  │
│  │    (Scala nota)              (Da ridimensionare) │  │
│  └──────────────────────────────────────────────────┘  │
│  [ - Riduci ]  ──●──────────────  [ + Ingrandisci ]    │
│  [ Reimposta Scala ]                 [ Conferma ]      │
└────────────────────────────────────────────────────────┘
```

#### A. Identità Visiva e Colori [Verificato]

- **Palette Specifica (File `palette.ts`):** Carta naturale sabbia `#fffaf4`, superficie `#fff8ef`, inchiostro scuro `#3a2f1c`, righello `#cfb49c`, **Sagoma fissa blu indaco `#1e3a8a`**, **Sagoma bersaglio rossa vermiglio `#ab341f`**.
- **Atmosfera:** Tavola enciclopedica del Museo di Storia Naturale.

#### B. Struttura del Container e Layout [Misurato]

- **Container:** Riquadro `max-w-xl` (**576px**), raggio `16px`.
- **Stato Active (Gameplay):**
  - Componente `ComparisonStage.tsx`: Palcoscenico SVG interattivo con griglia millimetrata di fondo.
  - Sagoma fissa blu a sinistra con etichetta e dimensione reale.
  - Sagoma rossa a destra che si espande/contrae in tempo reale muovendo lo slider di scala `ScaleControls.tsx` o cliccando i tasti +/-.
  - Controlli zoom e pulsante di ripristino scala.
  - Pulsante di conferma stima proporzioni.

#### C. Feedback e Risoluzione [Verificato]

- Componente `RevealPanel.tsx`: All'invio, la sagoma reale corretta viene sovrapposta in outline verde `#15803d` alla sagoma rossa dell'utente.
- Viene mostrato lo scostamento percentuale esatto (`Off by X%`) e il punteggio calcolato con la soglia di tolleranza al 6%.

---

### 3.4 Plain (`/games/plain`)

> **Metadati:** Stima · "Avvicinati il più possibile" · Accent: `from-neutral-900 to-neutral-800` (`#0b0d12` / `#191d26`)

#### A. Identità Visiva e Colori [Verificato]

- **Palette Specifica:** Sfondo nero asfalto notte `#030712`, superfici interne `#0b1220` e `#111a2e`, testo bianco ghiaccio `#e8f1ff`, **accento lime neon `#d2fa4b`**.
- **Tipografia:** Font impostato via token su `Geist, Inter, system-ui, sans-serif`.
- **Atmosfera:** Cruscotto aeronautico notturno ad altissima precisione.

#### B. Struttura del Container e Layout [Misurato]

- **Container:** Riquadro centrato `max-w-2xl` (**672px**), bordo fine scuro `1px solid #1f293d`.
- **Componente Altimetro (`Altimeter`):**
  - Barra orizzontale in stile altimetro aeronautico che traccia visivamente la salita verso i **5.000 metri**.
  - Quota attuale visualizzata con cifre digitali in grande.
- **Input e Azioni:**
  - Domanda quantitativa (es. _"Quanto è alta la Statua della Libertà da terra alla torcia?"_).
  - Input numerico scuro con bordatura luminescente all'hover.
  - Pulsante primario in colore lime neon fluorescente `#d2fa4b` con testo nero profondo.

#### C. Feedback e Risoluzione [Verificato]

- Confronto stima vs risposta reale, etichetta `Miss` / `Vicino` / `Perfetto`.
- Percentuale relativa (`57% sotto`) e guadagno in quota (`+180 m`).

---

### 3.5 Krillion (`/games/krillion`)

> **Metadati:** Quiz · "Trova la risposta che nessuno dà" · Accent: `from-sky-500 to-indigo-500` (`#0369a1` / `#082f49`)

#### A. Identità Visiva e Colori [Verificato]

- **Palette Specifica:** Nero abisso `#030712`, superficie `#0b1220`, testo azzurro ghiaccio `#e8f1ff`, azzurro ciano `#38bdf8`, ambra per il timer `#f59e0b`.
- **Tipografia:** **Font pixel retrò dedicato `VT323, ui-monospace, monospace`** applicato all'intero componente.
- **Atmosfera:** Terminale sottomarino vintage da immersione oceanica negli abissi.

#### B. Struttura del Container e Layout [Misurato]

- **Container:** Riquadro `max-w-2xl` (**672px**).
- **Profondimetro & HUD:**
  - Indicatore di profondità negativo (es. `-100 m`, `-600 m`, fino a `-7000 m`).
  - Barra timer decrescente a 25 secondi con cambio di colore (azzurro -> giallo -> rosso).
- **Input & Meccanica Rara:**
  - Prompt aperto con vincoli (es. _"Nomina un uccello (non marino)"_).
  - Campo testo a caratteri pixel grandi, tasto "Immergiti" (`Dive`) e tasto "Passa".

#### C. Feedback e Risoluzione [Verificato]

- La risposta "affonda" visivamente e si posiziona in uno dei 6 tier (_Plankton_ 10pt, _Schooler_ 30pt, _Rare_ 60pt, _Deep Cut_ 85pt, _One in a Krillion_ 100pt).
- Citazione d'atmosfera marina sul fondo.

---

### 3.6 GeoSlice (`/games/geoslice`)

> **Metadati:** Geografia · "Taglia la mappa in due metà uguali" · Accent: `from-lime-500 to-green-600` (`#65a30d` / `#14532d`)

#### A. Identità Visiva e Colori [Verificato]

- **Palette Specifica:** Sfondo ardesia `#0b1220`, pannello `#0f172a`, testo `#e2e8f0`, **linea di taglio ciano neon `#38bdf8` e arancio `#fb923c` per le due metà**.
- **Atmosfera:** Terminale di analisi demografica e cartografica GIS.

#### B. Struttura del Container e Layout [Misurato]

- **Container:** Riquadro `max-w-xl` (**576px**).
- **Mappa Vettoriale e Strumento di Taglio:**
  - Mappa SVG della regione con punti caldi demografici.
  - Linea di divisione interattiva con 2 maniglie circolari che consentono la rotazione angolare e lo scorrimento perpendicolare.
  - Contatore in tempo reale delle percentuali di popolazione dei due semipiani risultanti (es. `48.2% / 51.8%`).

#### C. Feedback e Risoluzione [Verificato]

- Rivelazione del punteggio di parità con colorazione a contrasto delle due metà territoriali.

---

### 3.7 Fact Map (`/games/fact-map`)

> **Metadati:** Geografia · "Dove nel mondo?" · Accent: `from-emerald-500 to-teal-600` (`#059669` / `#064e3b`)

#### A. Identità Visiva e Colori [Verificato]

- **Palette Specifica:** Mappa oceanica azzurro carta `#dbe4ea`, terre emerse pergamena `#e7ddc8`, contorni `#b9ac8e`, pannello avorio `#faf7f0`, inchiostro grafite `#2b2b2b`, **accento arancio terracotta `#c2410c`**.
- **Tipografia:** Font dedicato `Outfit, Inter, system-ui, sans-serif`.
- **Atmosfera:** Grande atlante geografico ed esplorazione cartografica d'epoca moderna.

#### B. Struttura del Container e Layout [Misurato]

- **Container:** Riquadro `max-w-2xl` (**672px**).
- **Mappa del Mondo Interattiva:**
  - Mappa SVG a proiezione naturale su cui l'utente può cliccare per piazzare il proprio spillo.
  - Barra superiore con livello di precisione richiesto (es. _"Punta a una città"_, _"Punta a una nazione"_).
  - Pulsante indizio con penalità fissa (-250 pt su 1.000 max).

#### C. Feedback e Risoluzione [Verificato]

- Tracciamento della linea congiungente tra il pin dell'utente e la posizione esatta con visualizzazione dei chilometri di distanza reali e scheda culturale di approfondimento.

---

## 4. Specifiche del Design System e Token Estratti

Dall'ispezione empirica dei fogli di stile e del codice sorgente, abbiamo ricostruito l'esatto dizionario dei token:

### 4.1 Token di Colore (Estratti da `src/index.css` e CSS Computed)

```css
/* Token Piattaforma Globale */
--background: hsl(40 9% 96%); /* #f6f5f3 Carta calda */
--surface: hsl(40 14% 99%); /* #fdfdfc Bianco avorio */
--surface-2: hsl(40 10% 93%); /* #eeebe6 Grigio sabbia */
--foreground: hsl(30 8% 12%); /* #211f1c Grafite profonda */
--border: hsl(38 10% 86%); /* #dfdcd8 Bordo caldo */
--primary: hsl(34 62% 34%); /* #8c5b1b Ottone dorato scuro */
--ring: hsl(34 62% 34%); /* Focus ring visibile */

/* Dark Mode Tokens */
.dark {
  --background: hsl(30 8% 7%); /* #131210 Nero carbone */
  --surface: hsl(30 7% 10%); /* #1a1917 Superficie scura */
  --surface-2: hsl(30 7% 14%); /* #242220 Superficie elevata */
  --foreground: hsl(40 18% 94%); /* #f3f0e8 Bianco crema */
  --border: hsl(32 7% 20%); /* #36322e Bordo scuro */
  --primary: hsl(40 72% 58%); /* #e8a841 Ottone caldo brillante */
}
```

### 4.2 Scale Tipografiche e Font Families

| Famiglia Font           | Variabile / Classe               | Ruolo nel Design System                        | Utilizzato in                    |
| :---------------------- | :------------------------------- | :--------------------------------------------- | :------------------------------- |
| **Bricolage Grotesque** | `--font-display`, `font-display` | Titoli hero, titoli di pagina, nomi dei giochi | Shell, Navbar, Titolazioni H1/H2 |
| **Inter**               | `--font-sans`, `body`            | Testo funzionale, didascalie, controlli form   | Scocca globale, bottoni, layout  |
| **JetBrains Mono**      | `--font-mono`, `font-mono`       | Date, numeri di serie, timer, coordinate       | Statistiche, Gazillion, HUD      |
| **Geist**               | `FONT` locale Plain              | Stile geometrico minimalista ad alto contrasto | Plain                            |
| **VT323**               | `FONT` locale Krillion           | Pixel monospaziato terminale sottomarino       | Krillion                         |
| **Outfit**              | `FONT` locale Fact Map           | Cartografia ed editoriale d'esplorazione       | Fact Map                         |

### 4.3 Dimensioni, Spaziatura e Raggi

- **Raggio di curvatura standard:** `--radius: 0.75rem` (12px) per card, bottoni primari e dialoghi; `8px` per badge e chip; `16px` / `24px` per hero banner e contenitori plate.
- **Altezza controlli interattivi:** Bottoni d'azione primari uniformati a **48px** (`h-12`), bottoni secondari a **36px** (`h-9`), bottoni icona piccoli a **32px** (`h-8`).
- **Motion Tokens:**
  - Easing curva unica: `cubic-bezier(0.22, 1, 0.36, 1)`.
  - Durate: `--dur-fast: 140ms` (micro-hover), `--dur-base: 240ms` (transizioni card e modali), `--dur-slow: 520ms` (animazioni plate motif e reveal).

---

## 5. Matrice Comparativa dei Sette Giochi

| Criterio                   | Gazillion                 | Estimania                | Size It Up              | Plain                    | Krillion              | GeoSlice                | Fact Map                 |
| :------------------------- | :------------------------ | :----------------------- | :---------------------- | :----------------------- | :-------------------- | :---------------------- | :----------------------- |
| **Genere**                 | Cronologia storica        | Stima numerica           | Stima proporzioni 2D    | Stima del reale          | Trivia di rarità      | Demografia GIS          | Geografia cartografica   |
| **Metafora UX**            | Dinosauro nel tempo       | Domande di Fermi         | Sagome museo naturale   | Quota volo aereo         | Abisso sottomarino    | Taglio territoriale     | Atlante mondiale         |
| **Composizione**           | Card `max-w-lg`           | Card `max-w-lg`          | Card `max-w-xl`         | Card `max-w-2xl`         | Card `max-w-2xl`      | Card `max-w-xl`         | Card `max-w-2xl`         |
| **Input Primario**         | Doppio slider maniglia    | Tastierino decimale      | Slider scala sagoma     | Input numerico           | Input testo + timer   | Retta vettoriale SVG    | Click su mappa del mondo |
| **Font Specifico**         | Bricolage + JetBrains     | Bricolage + Inter        | Bricolage + Tabular     | **Geist**                | **VT323 (Pixel)**     | Inter compatto          | **Outfit**               |
| **Palette Primaria**       | Rubino / Rosa (`#f43f5e`) | Teal (`#0d9488`)         | Terracotta / Indaco     | Notte & Lime (`#d2fa4b`) | Nero Abisso & Ciano   | Ardesia & Ciano/Arancio | Pergamena & Terracotta   |
| **Timer attivo**           | Sì (40s)                  | No                       | No                      | No                       | Sì (25s)              | No                      | No                       |
| **Punti Partita**          | 5.000 pt                  | 500 pt                   | 500 pt                  | 5.000 m                  | 7.000 m               | 300 pt                  | 5.000 pt                 |
| **Feedback Fine Round**    | Trapped / Missed (anni)   | Ratio logaritmico + nota | Sagoma verde in overlay | Metri scalati + aneddoto | Tier marino + discesa | % popolazione per lato  | Distanza km + linea      |
| **Grado Differenziazione** | Molto Alto                | Alto                     | Molto Alto              | Alto                     | Altissimo             | Molto Alto              | Altissimo                |

---

## 6. Analisi Forense dell'Architettura Componenti e del "Card Container Problem"

### 6.1 La Trappola della Card Stretta (`max-w-lg` / `max-w-2xl`)

Uno dei requisiti fondamentali del progetto era:

> _"Voglio sette esperienze curate, non sette varianti della stessa schermata generica. Ogni gioco deve utilizzare in modo intenzionale l'intera pagina disponibile: niente piccole card al centro di uno schermo vuoto."_

Dall'ispezione del DOM e dei file JSX è emersa la causa esatta per cui questo vincolo è attualmente violato:

1. **Il Vincolo a Monte in `RootLayout.tsx`:**
   ```tsx
   // src/app/layouts/RootLayout.tsx - Riga 18
   <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
     <Outlet />
   </main>
   ```
   Tutte le rotte di gioco sono figlie di `RootLayout`, venendo costrette all'interno di una gabbia fissa di `1152px` con `px-4 py-8`.
2. **Il Secondo Vincolo all'interno dei Componenti Gioco:**
   Ciascun gioco avvolge a sua volta il proprio contenuto in un pannello centrato:
   - `GazillionGame.tsx`: `div.mx-auto.max-w-lg` (512px)
   - `EstimaniaGame.tsx`: `div.mx-auto.max-w-lg` (512px)
   - `SizeItUpGame.tsx`: `div.mx-auto.max-w-xl` (576px)
   - `FactMapGame.tsx`: `div.mx-auto.max-w-2xl` (672px)
   - `GeoSliceGame.tsx`: `div.mx-auto.max-w-xl` (576px)

**Conseguenza visiva su desktop (1440×900 px):**  
Un gioco come **Fact Map** (che nell'originale è una mappa cartografica WebGL a tutto schermo) o **GeoSlice** occupa solo 672px su 1440px disponibili (meno del 47% della larghezza del monitor), lasciando enormi fasce laterali vuote e comprimendo la mappa in un riquadro soffocato.

### 6.2 Separazione tra Scocca di Piattaforma e Viewport di Gioco

Per risolvere questa contraddizione architettonica, la piattaforma deve distinguere due modalità di layout:

1. **Layout Standard Piattaforma (`RootLayout`):** Per Homepage, `/games`, `/archive`, `/stats`, `/settings`, dove il contenitore `max-w-6xl` è naturale e corretto per la lettura.
2. **Layout Immersivo di Gioco (`GameViewportLayout`):** Per le rotte `/games/:gameId`, dove la Navbar può comprimersi o nascondersi e il canvas di gioco si espande a **tutto il viewport (100vw × calc(100vh - 65px))**, posizionando i controlli (HUD, domanda, timer, punteggio) come elementi fluttuanti ergonomici in stile Heads-Up Display.

---

## 7. Registro dei Difetti di Design (Priorità P0–P3)

Tutti i problemi identificati sono basati su misurazioni e riscontri visivi verificati:

| ID         | Priorità | Area / Gioco          | Elemento Coinvolto          | Difetto Visivo Riscontrato                                                                                                                    | Impatto UX                                                                                                         |
| :--------- | :------- | :-------------------- | :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **DEF-01** | **P0**   | Fact Map & GeoSlice   | Layout container principale | **Mappe compresse in card da 672px/576px** invece di sfruttare il viewport completo.                                                          | Compressione estrema dei dati geografici; l'utente deve interagire in un francobollo su desktop.                   |
| **DEF-02** | **P1**   | Tutti i 7 giochi      | Modalità Guida / Regole     | **Assenza del pulsante "Come si gioca"** accessibile durante la fase di gioco attivo.                                                         | Se il giocatore non ricorda il calcolo dei punti o le regole del gioco, non può consultarle senza uscire.          |
| **DEF-03** | **P1**   | Size It Up            | `ComparisonStage.tsx`       | Dimensioni ridotte dello stage SVG su viewport mobili (<375px).                                                                               | Le sagome di oggetti piccoli (es. pianoforte o moneta) risultano difficili da distinguere e toccare su smartphone. |
| **DEF-04** | **P2**   | Gazillion & Estimania | Header / Intro card         | Disallineamento di stile tra i primi 2 giochi (che usano gradienti Tailwind inline) e i successivi 5 (che usano oggetti `C` e font dedicati). | Incoerenza di pattern nell'architettura dei componenti interni.                                                    |
| **DEF-05** | **P2**   | Navbar Globale        | Switch Dark Mode            | **Leggero salto di contrasto sul badge numerico "7"** del logo tra tema chiaro e tema scuro.                                                  | Micro-dettaglio di polish che riduce l'eleganza della navbar all'alternanza del tema.                              |
| **DEF-06** | **P3**   | Plain                 | `Altimeter`                 | La numerazione dell'altitudine nei round intermedi si aggiorna senza transizione a molla per scarti superiori a 2.000m.                       | Sensazione di scatto secco invece di una salita aerea fluida.                                                      |

---

## 8. Roadmap Raccomandata di Miglioramento UI/UX

### Fase 1: Sblocco del Viewport a Pieno Schermo (Correzione Critica P0)

- Introdurre una variante di layout `fullscreen` per la rotta dei giochi:
  - Eliminare il vincolo `max-w-6xl` di `RootLayout` per le pagine di gioco attivo.
  - Consentire a **Fact Map** e **GeoSlice** di espandere le rispettive mappe al 100% dell'area utile disponibile.
  - Trasformare il box della domanda e il contatore punti in eleganti pannelli HUD semitrasparenti sospesi sopra la mappa (`bg-panel/90 backdrop-blur-md`).

### Fase 2: Introduzione del Sistema Modale Unificato di Aiuto (P1)

- Integrare in ogni gioco un pulsante discreto `?` / `Regole` nell'HUD superiore che apra un modale `Dialog` accessibile (animazione fade-up, backdrop blur `bg-black/40`), consultabile in qualsiasi momento della partita senza perdere lo stato del round.

### Fase 3: Potenziamento della Risoluzione Visiva di Size It Up (P1)

- Dotare lo stage di Size It Up di un controllo di zoom automatico dinamico (_Auto-Fit_) che riadatti il viewBox SVG in modo ottimale su display mobile a 375px.

### Fase 4: Micro-Interazioni e Rifinitura Motion (P2–P3)

- Aggiungere una transizione `CountUp` fluida con bezier `(0.2, 0.8, 0.2, 1)` all'altimetro di Plain e al profondimetro di Krillion.
- Rifinire il feedback di vittoria/completamento giornaliero con micro-particelle celebrative procedurali in CSS/Canvas.

---

## 9. Registro di Evidenza e Confidenza

Tutti i file di supporto visivo e i dati computati sono archiviati nella directory del progetto locale:

| Evidenza Archiviata       | Descrizione e Dati Acquisiti                                                                | Livello di Confidenza       |
| :------------------------ | :------------------------------------------------------------------------------------------ | :-------------------------- |
| `01-homepage-desktop.png` | Snapshot completo a 1440×900 px della homepage con hero banner e griglia giochi.            | **[Verificato / Misurato]** |
| `01-homepage-mobile.png`  | Snapshot a 375×812 px del layout mobile responsive.                                         | **[Verificato / Misurato]** |
| `exact-measurements.json` | Dump delle proprietà calcolate (padding, border, colors, font-families) per tutti i giochi. | **[Misurato al 100%]**      |
| `game-gazillion-*.png`    | Schermata intro, attiva con timeline a doppia maniglia e mobile di Gazillion.               | **[Verificato]**            |
| `game-estimania-*.png`    | Schermata intro e attiva con tastierino decimale di Estimania.                              | **[Verificato]**            |
| `game-size-it-up-*.png`   | Stage SVG a due sagome (blu fissa, rossa interattiva) con scala di Size It Up.              | **[Verificato]**            |
| `game-plain-*.png`        | Layout dark mode con accento lime `#d2fa4b` e altimetro aeronautico di Plain.               | **[Verificato]**            |
| `game-krillion-*.png`     | Terminale abissale retrò con font pixel `VT323` e profondimetro di Krillion.                | **[Verificato]**            |
| `game-geoslice-*.png`     | Mappa con retta vettoriale SVG di taglio demografico di GeoSlice.                           | **[Verificato]**            |
| `game-fact-map-*.png`     | Mappa del mondo SVG con spillo e barra target di Fact Map.                                  | **[Verificato]**            |

---

_Fine del rapporto forense di reverse engineering UI/UX._
