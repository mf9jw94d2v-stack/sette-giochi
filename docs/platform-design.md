# Le pagine della piattaforma — «La vetrina»

_28 ottobre 2026._ Direzione delle pagine che non sono un gioco: Home, Giochi,
Sfide, Archivio, Statistiche, Cronologia, Profilo, Impostazioni, 404.

## Idea

La piattaforma è una stanza tranquilla; i sette giochi sono gli oggetti
esposti. Ogni gioco compare con la sua **copertina vera**: i colori, il
carattere e una miniatura della composizione del suo gioco (la colonna di
profondità di Krillion, la trappola sulla linea del tempo di Gazillion, le due
sagome di Size It Up…). Tutta l'audacia è lì; il resto resta sobrio.

- **Colori:** i token esistenti (grafite calda e ottone, chiaro e scuro). Le
  copertine portano il colore. Le tinte di ogni gioco sono in
  `src/games/theme.ts`, copiate dai CSS dei giochi.
- **Caratteri:** Bricolage Grotesque per i titoli della piattaforma, Inter
  per il testo; sulle copertine il carattere del gioco (VT323, Geist, Outfit,
  Fraunces, Archivo, Chakra Petch, Unbounded).
- **Struttura:** righe e filetti invece di schede tutte uguali; niente
  sopratitoli in maiuscolo, niente frecce nei pulsanti.

## Una forma per ogni pagina

| Pagina       | Forma                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------- |
| Home         | Banner con data, barra delle sette sfide e «Continua con…»; scaffale delle sette copertine      |
| Giochi       | Catalogo a righe larghe: copertina, nome, descrizione, «Gioca la sfida di oggi», giorni passati |
| Sfide        | Tabellone: sette righe, ognuna un link, con stato e punteggio                                   |
| Archivio     | Per ogni gioco una striscia degli ultimi 14 giorni (giocato, rigiocato, da recuperare)          |
| Archivio/…   | Giorni come tessere con data, stato e «Rigioca»                                                 |
| Statistiche  | Cifre come tipografia, calendario grande, tabella per gioco                                     |
| Cronologia   | Linea del tempo: la data a sinistra, le partite di quel giorno a destra                         |
| Profilo      | Nota sull'account, cifre, tabella dei propri giochi, calendario                                 |
| Impostazioni | Sezioni a due colonne su filetti: titolo e spiegazione a sinistra, comandi a destra             |
| 404          | Grande «404», due uscite e le sette copertine                                                   |

## Componenti

`GameCover` (copertina, con `DoneTag`), `TodayMeter` (sette segmenti: pieno =
fatta, tratteggiato = da fare; si legge senza colore), `DayStrip`/`DayLegend`
(quadrato pieno, contornato, tenue: la forma distingue gli stati),
`GameStatsTable` (tabella vera con intestazioni), `Figures` (cifre), `PageHeader`,
`useToday` (sfide di oggi, prossimo gioco, serie).

Rimossi perché non più usati: `GamePlate` e `Motifs` (le vecchie schede
colorate con icone generiche) e il loro CSS.

## Vincoli rispettati

- L'illustrazione del banner e la sua sfumatura (`.hero-illustration`) sono
  invariate: stesso elemento, stessa classe, stesso CSS.
- Nessun dato inventato: ogni numero viene dai risultati salvati; le
  copertine sono disegni, non mappe o dati.
- Le descrizioni dei giochi ora dicono ciò che fa la nostra implementazione
  (corrette quelle di Plain, Size It Up e GeoSlice, che descrivevano altro).
