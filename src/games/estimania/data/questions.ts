import type { EstimaniaItem } from "../types";

/**
 * ORIGINAL dataset of numeric-answer questions (open, common-knowledge facts).
 * `category` is cross-checked against the answer's order of magnitude by the
 * validator (independent check). Authored content, not copied from any source
 * game. Each item is one playable "level".
 */
export const ESTIMANIA_ITEMS: readonly EstimaniaItem[] = [
  // --- Corpo umano ---
  {
    id: "ossa-adulto",
    question: "Quante ossa ha il corpo di un adulto?",
    answer: 206,
    category: "Corpo umano",
  },
  {
    id: "denti-adulto",
    question: "Quanti denti ha un adulto, compresi i denti del giudizio?",
    answer: 32,
    category: "Corpo umano",
  },
  {
    id: "vertebre",
    question: "Quante vertebre ha la colonna vertebrale umana?",
    answer: 33,
    category: "Corpo umano",
  },
  {
    id: "ossa-mano",
    question: "Quante ossa ci sono in una mano umana?",
    answer: 27,
    category: "Corpo umano",
  },
  {
    id: "battiti",
    question: "Quanti battiti al minuto ha circa un cuore a riposo?",
    answer: 70,
    category: "Corpo umano",
  },
  {
    id: "muscoli",
    question: "Quanti muscoli ha circa il corpo umano?",
    answer: 600,
    category: "Corpo umano",
  },
  {
    id: "litri-sangue",
    question: "Quanti litri di sangue ha circa un adulto?",
    answer: 5,
    unit: "litri",
    category: "Corpo umano",
  },
  {
    id: "gestazione",
    question: "Quanti giorni dura circa una gravidanza umana?",
    answer: 280,
    unit: "giorni",
    category: "Corpo umano",
  },
  // --- Geografia ---
  {
    id: "everest",
    question: "Quanto è alto il Monte Everest?",
    answer: 8849,
    unit: "m",
    category: "Geografia",
  },
  {
    id: "eiffel",
    question: "Quanto è alta la Torre Eiffel?",
    answer: 330,
    unit: "m",
    category: "Geografia",
  },
  {
    id: "paesi-onu",
    question: "Quanti Stati membri ha l'ONU?",
    answer: 193,
    category: "Geografia",
  },
  {
    id: "paesi-africa",
    question: "Quanti Stati ci sono in Africa?",
    answer: 54,
    category: "Geografia",
  },
  {
    id: "stati-usa",
    question: "Quanti Stati compongono gli USA?",
    answer: 50,
    category: "Geografia",
  },
  {
    id: "continenti",
    question: "Quanti continenti ci sono?",
    answer: 7,
    category: "Geografia",
  },
  {
    id: "oceani",
    question: "Quanti oceani ci sono sulla Terra?",
    answer: 5,
    category: "Geografia",
  },
  {
    id: "marianne",
    question: "Quanto è profonda la Fossa delle Marianne?",
    answer: 10984,
    unit: "m",
    category: "Geografia",
  },
  {
    id: "fusi",
    question: "Quanti fusi orari ci sono nel mondo?",
    answer: 24,
    category: "Geografia",
  },
  {
    id: "regioni-italia",
    question: "Quante regioni ha l'Italia?",
    answer: 20,
    category: "Geografia",
  },
  // --- Scienza ---
  {
    id: "pianeti",
    question: "Quanti pianeti ci sono nel Sistema Solare?",
    answer: 8,
    category: "Scienza",
  },
  {
    id: "elementi",
    question: "Quanti elementi ci sono nella tavola periodica?",
    answer: 118,
    category: "Scienza",
  },
  {
    id: "cromosomi",
    question: "Quanti cromosomi ha una cellula umana?",
    answer: 46,
    category: "Scienza",
  },
  {
    id: "luce",
    question: "Qual è la velocità della luce in km/s (circa)?",
    answer: 299792,
    unit: "km/s",
    category: "Scienza",
  },
  {
    id: "terra-sole",
    question: "Qual è la distanza media Terra-Sole in milioni di km?",
    answer: 150,
    unit: "mln km",
    category: "Scienza",
  },
  {
    id: "ebollizione",
    question: "A quanti °C bolle l'acqua a livello del mare?",
    answer: 100,
    unit: "°C",
    category: "Scienza",
  },
  {
    id: "lune-marte",
    question: "Quante lune ha Marte?",
    answer: 2,
    category: "Scienza",
  },
  {
    id: "zampe-ragno",
    question: "Quante zampe ha un ragno?",
    answer: 8,
    category: "Scienza",
  },
  // --- Sport ---
  {
    id: "maratona",
    question: "Quanti km è lunga circa una maratona?",
    answer: 42,
    unit: "km",
    category: "Sport",
  },
  {
    id: "golf-buche",
    question: "Quante buche ha un campo da golf regolamentare?",
    answer: 18,
    category: "Sport",
  },
  {
    id: "calcio-giocatori",
    question: "Quanti giocatori per squadra sono in campo nel calcio?",
    answer: 11,
    category: "Sport",
  },
  {
    id: "volley",
    question: "Quanti giocatori per squadra sono in campo nella pallavolo?",
    answer: 6,
    category: "Sport",
  },
  {
    id: "scacchi-caselle",
    question: "Quante caselle ha una scacchiera?",
    answer: 64,
    category: "Sport",
  },
  {
    id: "cerchi-olimpici",
    question: "Quanti cerchi ha il simbolo olimpico?",
    answer: 5,
    category: "Sport",
  },
  {
    id: "basket-giocatori",
    question: "Quanti giocatori per squadra sono in campo nel basket?",
    answer: 5,
    category: "Sport",
  },
  // --- Cultura ---
  {
    id: "piano-tasti",
    question: "Quanti tasti ha un pianoforte standard?",
    answer: 88,
    category: "Cultura",
  },
  {
    id: "carte-francesi",
    question: "Quante carte ha un mazzo di carte francesi?",
    answer: 52,
    category: "Cultura",
  },
  {
    id: "alfabeto-ita",
    question: "Quante lettere ha l'alfabeto italiano?",
    answer: 21,
    category: "Cultura",
  },
  {
    id: "sinfonie-beethoven",
    question: "Quante sinfonie ha composto Beethoven?",
    answer: 9,
    category: "Cultura",
  },
  {
    id: "chitarra-corde",
    question: "Quante corde ha una chitarra classica?",
    answer: 6,
    category: "Cultura",
  },
  {
    id: "arcobaleno",
    question: "Quanti colori ha l'arcobaleno?",
    answer: 7,
    category: "Cultura",
  },
  {
    id: "note-musicali",
    question: "Quante note musicali ci sono (do, re, mi...)?",
    answer: 7,
    category: "Cultura",
  },
  // --- Numeri ---
  {
    id: "minuti-giorno",
    question: "Quanti minuti ci sono in un giorno?",
    answer: 1440,
    category: "Numeri",
  },
  {
    id: "secondi-ora",
    question: "Quanti secondi ci sono in un'ora?",
    answer: 3600,
    category: "Numeri",
  },
  {
    id: "anni-secolo",
    question: "Quanti anni ha un secolo?",
    answer: 100,
    category: "Numeri",
  },
  {
    id: "giorni-anno",
    question: "Quanti giorni ha un anno non bisestile?",
    answer: 365,
    category: "Numeri",
  },
  {
    id: "stelle-usa",
    question: "Quante stelle ha la bandiera degli USA?",
    answer: 50,
    category: "Numeri",
  },
  {
    id: "strisce-usa",
    question: "Quante strisce ha la bandiera degli USA?",
    answer: 13,
    category: "Numeri",
  },
];
