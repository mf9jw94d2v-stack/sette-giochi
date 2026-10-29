import type { GameLevel, LevelGenerator } from "@/types/game";
import type { Difficulty } from "@/types/game";
import { createRng, shuffle } from "@/lib/rng";
import { GAZILLION_EVENTS } from "./data/events";
import type { GazillionEvent, GazillionLevelData } from "./types";
import { ROUNDS_PER_SESSION, type GazillionSessionData } from "./engine";
import { sessionContentHash } from "./validator";

export const GAZILLION_GENERATOR_VERSION = "gazillion-1.0.0";

const DIFF_SCORE: Record<GazillionEvent["difficulty"], number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

function toRound(ev: GazillionEvent): GazillionLevelData {
  return {
    prompt: ev.prompt,
    year: ev.year,
    category: ev.category,
    era: ev.era,
  };
}

/** Map an average difficulty score to a platform Difficulty tier. */
function tierOf(avg: number): Difficulty {
  if (avg < 1.5) return "easy";
  if (avg < 2.2) return "medium";
  if (avg < 2.7) return "hard";
  return "expert";
}

/** Deterministically pick `count` distinct events for a seed. */
export function pickEvents(
  seed: string,
  count: number = ROUNDS_PER_SESSION,
  pool: readonly GazillionEvent[] = GAZILLION_EVENTS,
): GazillionEvent[] {
  if (count > pool.length)
    throw new Error(`cannot pick ${count} distinct events from ${pool.length}`);
  return shuffle(pool, createRng(seed)).slice(0, count);
}

export function buildLevel(
  seed: string,
  events: GazillionEvent[],
): GameLevel<GazillionSessionData> {
  const rounds = events.map(toRound);
  const avg =
    events.reduce((s, e) => s + DIFF_SCORE[e.difficulty], 0) / events.length;
  return {
    id: `gazillion-${seed}`,
    gameId: "gazillion",
    generatorVersion: GAZILLION_GENERATOR_VERSION,
    seed,
    difficulty: tierOf(avg),
    difficultyScore: Math.round(avg * 100) / 100,
    data: { rounds },
    contentHash: sessionContentHash(rounds),
    createdAt: new Date().toISOString(),
  };
}

export const gazillionGenerator: LevelGenerator<GazillionSessionData> = {
  version: GAZILLION_GENERATOR_VERSION,
  generate(seed: string): GameLevel<GazillionSessionData> {
    return buildLevel(seed, pickEvents(seed));
  },
};
