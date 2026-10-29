# Sette giochi, sette identità

_28 ottobre 2026._ Direzione artistica di ciascun gioco, decisa **a partire
dalla meccanica** e verificata contro i dossier in `docs/rea-analysis/`.

La regola che governa tutto il documento: se si scambiano nome e colori di due
giochi, le due pagine devono restare riconoscibili. Per questo ogni identità è
definita prima dalla **composizione** (dove sta l'elemento dominante, dove
stanno i controlli, come si legge il risultato) e solo dopo da palette e
tipografia.

## Cosa è condiviso e cosa no

**Condiviso (infrastruttura, nessuna estetica):** routing, layout immersivo
delle pagine di gioco (`handle.immersive` sulle rotte), persistenza dei
risultati e blocco della sfida giornaliera (`src/games/shared/session.ts`),
selezione modalità Oggi/Allenamento (`useGameMode`), audio, la primitiva
accessibile per le regole (`RulesDialog`, su `<dialog>` nativo) e la primitiva
accessibile per le schede di modalità (`ModeTabs`, senza stile proprio).

**Specifico di ogni gioco:** tutto ciò che si vede. Ogni gioco ha il proprio
file di token CSS (`src/games/<gioco>/<gioco>.css`, caricato solo con il suo
chunk), la propria intestazione, i propri controlli, il proprio indicatore di
avanzamento e la propria schermata dei risultati. Nessun componente visivo è
condiviso fra due giochi.

## Tema chiaro e scuro

_Aggiunto il 29 ottobre 2026._ Ogni gioco segue il tema scelto nella barra in
alto. Il tema nativo resta quello descritto sotto; l'altro è una versione
della stessa identità, con lo stesso carattere e lo stesso tipo di controlli.

| Gioco      | Versione nativa       | Versione aggiunta                                                                   |
| ---------- | --------------------- | ----------------------------------------------------------------------------------- |
| Krillion   | scura, abisso         | «di giorno»: acqua chiara in superficie, blu più profondo in basso, inchiostro navy |
| Plain      | scura, volo notturno  | «diurno»: cielo bianco, testo nero, lime scurito in oliva                           |
| GeoSlice   | scura, console GIS    | «in luce»: foglio bianco, reticolo sottile, ciano e arancio più scuri               |
| Gazillion  | scura, notte stellata | «all'alba»: dal viola chiaro al pesca, maniglie ambra scurite                       |
| Estimania  | chiara, quaderno      | «di notte»: carta scura calda, inchiostro crema, verde acqua acceso                 |
| Fact Map   | chiara, atlante       | «notturno»: mare scuro, terre oliva, coste bronzo                                   |
| Size It Up | chiara, tavola        | «in negativo»: carta umbra, blu pervinca e rosso corallo                            |

Come è fatto: i colori di ogni gioco sono variabili CSS nel suo file; la
versione alternativa le ridefinisce sotto `.dark .<gioco>` (giochi chiari) o
`:root:not(.dark) .<gioco>` (giochi scuri), con `color-scheme` coerente per
campi e barre native. Nessun colore resta scritto a mano nei componenti:
anche la tavola SVG di Size It Up e le rarità di Krillion usano variabili.
Contrasto misurato su tutte le coppie principali (testo, testo secondario,
accento, testo sui pulsanti): almeno 4,5:1. Un test e2e verifica per ogni
gioco che sfondo, testo e `color-scheme` cambino davvero con il tema.

## Le sette direzioni

| Gioco          | Archetipo di composizione                            | Elemento dominante              | Controlli                                                | Risultati                                          |
| -------------- | ---------------------------------------------------- | ------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
| **Fact Map**   | Mappa a pieno schermo, pannelli fluttuanti           | La mappa del mondo              | Pannello d'azione flottante in basso, zoom sulla mappa   | Mappa con tutte le tappe + diario di viaggio       |
| **GeoSlice**   | Mappa scura + console ancorata a destra              | La regione e la linea di taglio | Console laterale (desktop) / pannello inferiore (mobile) | Tre tavole affiancate con i tagli e le percentuali |
| **Gazillion**  | Fasce orizzontali, linea del tempo a tutta larghezza | La linea del tempo              | Maniglie trascinabili sulla linea + campi anno           | Un'unica linea del tempo con i cinque eventi       |
| **Estimania**  | Impaginato editoriale a due colonne + righello       | Il numero da stimare            | Grande campo numerico                                    | Registro tabellare con barre logaritmiche          |
| **Plain**      | Tipografia gigante + barra d'altitudine a destra     | La domanda                      | Un solo campo sottolineato                               | Profilo di volo (grafico d'altitudine)             |
| **Krillion**   | Colonna di profondità a sinistra + terminale         | La discesa nell'abisso          | Riga di comando del terminale                            | Registro d'immersione stampato                     |
| **Size It Up** | Palcoscenico a tutta pagina + dock in basso          | Le due sagome                   | Dock inferiore (cursore, ±) + maniglia                   | Galleria di tavole con stima e misura reale        |

### Fact Map — «L'atlante»

- **Concetto:** un atlante aperto. La mappa riempie tutta la pagina, come
  nell'originale (verificato: «la mappa interattiva copre l'intero viewport»).
- **Palette:** oceano carta `#d9e2e8`, terre pergamena `#ebe2cf`, inchiostro
  grafite `#2b2722`, accento terracotta `#c2410c`, verità smeraldo `#047857`.
- **Tipografia:** Outfit (verificata sull'originale), etichette maiuscole
  spaziate per le didascalie cartografiche.
- **Composizione:** mappa a tutta superficie; in alto a sinistra la carta
  della tappa (indizio, tipo di luogo); in alto a destra punteggio e cinque
  segnaposto; in basso al centro il pannello d'azione; a destra i comandi
  di zoom.
- **Interazioni:** clic/tocco per lo spillo, trascinamento per spostare la
  mappa, zoom con pulsanti e rotella, linea geodetica alla rivelazione.

### GeoSlice — «La console GIS»

- **Concetto:** uno strumento di analisi demografica. Non è un clone di Fact
  Map: lì si cerca un punto, qui si taglia un'area, e lo strumento conta.
- **Palette:** ardesia `#0b1220`, pannello `#0f172a`, lato A ciano `#22d3ee`,
  lato B arancio `#fb923c`, griglia `#1e293b`.
- **Tipografia:** Chakra Petch (cifre squadrate da strumento) + Inter.
- **Composizione:** mappa scura a sinistra, console fissa a destra con due
  grandi letture A/B e la barra d'equilibrio attorno al 50 %. Su mobile la
  console diventa un pannello in basso.
- **Interazioni:** trascinare sulla mappa sposta la linea, una maniglia la
  ruota; cursori di rotazione e posizione come alternativa accessibile.

### Gazillion — «Il viaggio nel tempo»

- **Concetto:** la linea del tempo è la scultura centrale (verificato
  sull'originale: «timeline orizzontale come elemento scultoreo centrale»,
  maniglie ambra).
- **Palette:** notte cosmica `#0c0a1d` → alba rubino `#4c0519`, maniglie
  ambra `#fbbf24`, evento catturato verde `#4ade80`, mancato rosa `#fb7185`.
- **Tipografia:** Unbounded (display geometrico arrotondato) + JetBrains Mono
  per gli anni.
- **Composizione:** tre fasce: evento in alto, linea del tempo a tutta
  larghezza al centro con le ere, campi e conferma in basso.
- **Interazioni:** due maniglie trascinabili e la fascia centrale per spostare
  l'intervallo intero; campi numerici sincronizzati.

### Estimania — «Il quaderno di stima»

- **Concetto:** una pagina di rivista sui numeri. La domanda è un titolo,
  la stima è un numero enorme.
- **Palette:** carta pietra `#f7f5f0`, inchiostro `#1c1917`, teal `#0d9488`
  (verificato), stima ambra `#b45309`.
- **Tipografia:** Fraunces (serif editoriale) per domande e cifre.
- **Composizione:** colonna sinistra con domanda e campo numerico gigante,
  colonna destra con il taccuino dei cinque round; sotto, a tutta larghezza,
  il righello degli ordini di grandezza.
- **Interazioni:** digitazione con anteprima dell'ordine di grandezza in
  tempo reale; rivelazione sul righello.

### Plain — «Il volo notturno»

- **Concetto:** minimale e preciso (verificato: `#0b0d12`, lime `#d2fa4b`,
  Geist, titolo hero enorme).
- **Palette:** notte `#0b0d12`, superficie `#151922`, testo `#f3f5f9`, lime
  `#d2fa4b`.
- **Tipografia:** Geist per tutto, Geist Mono per quote e contatori.
- **Composizione:** domanda in tipografia gigante a sinistra, un solo campo
  sottolineato; a destra una barra d'altitudine alta quanto la pagina.
- **Interazioni:** Invio per confermare, l'aereo sale lungo la barra.

### Krillion — «La discesa»

- **Concetto:** un terminale da batiscafo (verificato: VT323, nero abisso,
  profondimetro prominente, 0–7000 m).
- **Palette:** superficie `#0b3a5b` → abisso `#020409`, testo ghiaccio
  `#e8f1ff`, sonar ciano `#38bdf8`, ossigeno ambra `#f59e0b`.
- **Tipografia:** VT323 ovunque.
- **Composizione:** colonna di profondità a sinistra alta quanto la pagina,
  con le fasce di rarità; a destra lo schermo del terminale con domanda,
  ossigeno (timer) e riga di comando.
- **Interazioni:** digitare e Invio; la risposta «affonda» nella sua fascia.

### Size It Up — «La tavola naturalistica»

- **Concetto:** una tavola d'enciclopedia: confronto, proporzioni, misura.
- **Palette:** carta sabbia `#fffaf4`, riferimento indaco `#1e3a8a`,
  bersaglio vermiglio `#ab341f`, verità verde `#15803d` (verificata).
- **Tipografia:** Archivo stretto e nero (larghezza 75) per titoli e
  cartellini, come le didascalie di una vetrina.
- **Composizione:** il palcoscenico occupa tutto lo spazio libero; sotto, due
  didascalie «Fig. 1 · misura nota» e «Fig. 2 · da mettere in scala»; dock dei
  comandi lungo il bordo inferiore, che diventa la rivelazione dopo il blocco.
  Barra di scala sotto la linea di terra (dipende solo dalla vista). Su un
  telefono 375×812 l'intera partita sta in una schermata.
- **Interazioni:** maniglia, cursore logaritmico, ±, tastiera.
- **Risultati:** galleria di cinque tavole ridisegnate in piccolo
  (riferimento, misura vera, stima tratteggiata), con un segno quando una
  misura è troppo piccola per essere vista a quella scala.

## Verifica di distinguibilità

Sette archetipi diversi: mappa con pannelli fluttuanti · mappa con console
ancorata · fasce orizzontali · due colonne editoriali · tipografia e barra
verticale · colonna verticale e terminale · palcoscenico e dock. Nessuna coppia
condivide la posizione dell'elemento dominante **e** quella dei controlli.
Anche le schermate dei risultati sono sette forme diverse: mappa, tavole
affiancate, linea unica, tabella, grafico, registro, galleria.

## Note di implementazione

- **Font dei titoli.** Il foglio globale assegna il font display a `h1–h3`;
  ogni gioco lo riporta al proprio con
  `@layer base { .xx :where(h1, h2, h3) { font-family: inherit } }`, che batte
  la regola globale ma perde contro le classi del gioco e le utility.
- **Numeri all'italiana.** Un solo parser (`src/lib/italianNumber.ts`) per
  Estimania, Plain e Gazillion: «1.200» è milleduecento, «2,5» è due e mezzo.
- **Nessuna identità condivisa.** `src/games/shared/` contiene solo
  comportamento; schede e dialogo ricevono le classi da ciascun gioco.
