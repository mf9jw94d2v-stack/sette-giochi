import type { GameId, GameMetadata } from "@/types/game";
import { gameIdFromParam } from "./slugs";

/**
 * Display metadata for the seven games.
 *
 * Each description says what OUR implementation asks of the player, in the
 * same words as the game's own instructions screen; the rules themselves live
 * in each game's engine. Verified notes on the originals are in
 * docs/game-analysis.md.
 */
export const GAME_METADATA: Record<GameId, GameMetadata> = {
  krillion: {
    id: "krillion",
    name: "Abissi",
    tagline: "Trova la risposta che nessuno dà.",
    description:
      "Quiz a risposta rara: più la tua risposta è insolita (ma giusta), più scendi in profondità.",
    originalUrl: "https://krillion.cc/",
    category: "Quiz",
    accent: "from-sky-500 to-indigo-500",
    glyph: "◆",
    status: "playable",
  },
  plain: {
    id: "plain",
    name: "Quota",
    tagline: "Avvicinati il più possibile.",
    description:
      "Domande che hanno per risposta una misura: più ti avvicini al valore vero, più il tuo aereo sale di quota.",
    originalUrl: "https://playplain.app/",
    category: "Stima",
    accent: "from-neutral-900 to-neutral-800",
    glyph: "▦",
    status: "playable",
  },
  "fact-map": {
    id: "fact-map",
    name: "Atlante",
    tagline: "Dove nel mondo?",
    description:
      "Metti uno spillo sulla mappa: il punteggio dipende da quanto sei vicino al posto giusto.",
    originalUrl: "https://www.factmap.world/",
    category: "Geografia",
    accent: "from-emerald-500 to-teal-600",
    glyph: "🗺",
    status: "playable",
  },
  estimania: {
    id: "estimania",
    name: "Stima",
    tagline: "Quanto sai avvicinarti?",
    description:
      "Gioco di stima: rispondi con un numero e avvicinati il più possibile al valore reale.",
    originalUrl: "https://estimania.app/",
    category: "Stima",
    accent: "from-teal-500 to-teal-700",
    glyph: "≈",
    status: "playable",
  },
  "size-it-up": {
    id: "size-it-up",
    name: "In Scala",
    tagline: "Indovina le grandezze.",
    description:
      "Ridimensiona la sagoma di un oggetto accanto a un riferimento di misura nota, finché non ha la sua vera scala.",
    originalUrl: "https://magnitudle.com/",
    category: "Grandezze",
    accent: "from-fuchsia-500 to-purple-600",
    glyph: "⇅",
    status: "playable",
  },
  geoslice: {
    id: "geoslice",
    name: "Taglio",
    tagline: "Taglia la mappa in due metà uguali.",
    description:
      "Una linea retta su una regione: metà degli abitanti da una parte, metà dall'altra, con dati di popolazione reali.",
    originalUrl: "https://geoslice.net/",
    category: "Geografia",
    accent: "from-lime-500 to-green-600",
    glyph: "◑",
    status: "playable",
  },
  gazillion: {
    id: "gazillion",
    name: "Epoche",
    tagline: "Il viaggio nel tempo quotidiano.",
    description:
      "Per ogni evento, intrappola tra due valori l'anno in cui è successo. Più stretto è l'intervallo, più punti; anche gli errori vicini danno punti parziali.",
    originalUrl: "https://gazillion.world/",
    category: "Storia",
    accent: "from-rose-500 to-pink-600",
    glyph: "∞",
    status: "playable",
  },
};

/** Ordered list for display. */
export const GAMES: GameMetadata[] = [
  GAME_METADATA.krillion,
  GAME_METADATA.plain,
  GAME_METADATA["fact-map"],
  GAME_METADATA.estimania,
  GAME_METADATA["size-it-up"],
  GAME_METADATA.geoslice,
  GAME_METADATA.gazillion,
];

/** Look a game up by its internal id or by its public slug. */
export function getGameMeta(idOrSlug: string): GameMetadata | undefined {
  const id = gameIdFromParam(idOrSlug);
  return id ? GAME_METADATA[id] : undefined;
}
