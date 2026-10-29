import { GAME_IDS, type GameId } from "@/types/game";

/**
 * Public addresses of the games. The internal ids (`krillion`, `plain`, …)
 * stay as they are — they key stored results, the database and the level
 * generators — but the names players see, and the URLs, are our own.
 * Old URLs with the internal id still work: they redirect here.
 */
export const GAME_SLUG: Record<GameId, string> = {
  krillion: "abissi",
  plain: "quota",
  "fact-map": "atlante",
  estimania: "stima",
  "size-it-up": "in-scala",
  geoslice: "taglio",
  gazillion: "epoche",
};

const BY_SLUG = new Map<string, GameId>(
  GAME_IDS.map((id) => [GAME_SLUG[id], id]),
);
const IDS: ReadonlySet<string> = new Set(GAME_IDS);

/** Resolve a URL segment: a slug, or (for old links) an internal id. */
export function gameIdFromParam(
  param: string | undefined | null,
): GameId | null {
  if (!param) return null;
  const bySlug = BY_SLUG.get(param);
  if (bySlug) return bySlug;
  return IDS.has(param) ? (param as GameId) : null;
}

/** True when the segment is an old internal id rather than the public slug. */
export function isLegacyParam(param: string | undefined): boolean {
  return !!param && IDS.has(param) && GAME_SLUG[param as GameId] !== param;
}

export const gamePath = (id: GameId): string => `/games/${GAME_SLUG[id]}`;

export const archivePath = (id: GameId, date?: string): string =>
  date ? `/archive/${GAME_SLUG[id]}/${date}` : `/archive/${GAME_SLUG[id]}`;
