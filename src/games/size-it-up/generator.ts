import type { GameLevel, LevelGenerator } from "@/types/game";
import { createRng, shuffle } from "@/lib/rng";
import { mean, round3, tierOf } from "@/games/difficulty";
import { SIZE_OBJECTS } from "./data/objects";
import { roundDifficulty } from "./difficulty";
import { trueRatio } from "./geometry";
import type { SizeLevelData, SizeObject } from "./types";
import { ROUNDS_PER_SESSION, type SizeSessionData } from "./engine";
import { sessionContentHash } from "./validator";

export const SIZE_GENERATOR_VERSION = "size-it-up-3.0.0";

/**
 * A round is only worth playing if the two objects are within reach of each
 * other: comparing a pencil with the Burj Khalifa (4 400×) is not an estimate,
 * it is a shrug. These bounds keep every pair inside a range a player can
 * actually judge and the handle can actually reach.
 */
export const MIN_PAIR_RATIO = 1 / 60;
export const MAX_PAIR_RATIO = 60;

/**
 * Where the target silhouette STARTS, as a multiple of the reference.
 *
 * Deliberately INDEPENDENT of the right answer — it is picked from this fixed
 * ladder by the seed alone, so it can never hint at the solution. If a draw
 * happens to land inside the full-marks band of the true ratio, the generator
 * moves it one rung along rather than opening the round on the answer.
 */
export const START_LADDER = [0.3, 0.55, 0.9, 1.6, 2.6] as const;

function startBiasFor(
  rngPick: number,
  reference: SizeObject,
  target: SizeObject,
): number {
  const truth = trueRatio(reference, target);
  for (let i = 0; i < START_LADDER.length; i++) {
    const candidate = START_LADDER[(rngPick + i) % START_LADDER.length];
    const relErr = Math.abs(candidate - truth) / truth;
    if (relErr > 0.25) return candidate;
  }
  return START_LADDER[0];
}

/** Pairs are drawn so the two objects are comparable, same axis when possible. */
export function buildRounds(
  seed: string,
  count: number = ROUNDS_PER_SESSION,
  pool: readonly SizeObject[] = SIZE_OBJECTS,
): SizeLevelData[] {
  const rng = createRng(seed);
  const order = shuffle(pool, rng);
  const used = new Set<string>();
  const rounds: SizeLevelData[] = [];

  for (const reference of order) {
    if (rounds.length >= count) break;
    if (used.has(reference.id)) continue;

    const candidates = shuffle(
      pool.filter((o) => {
        if (o.id === reference.id || used.has(o.id)) return false;
        const r = trueRatio(reference, o);
        return r >= MIN_PAIR_RATIO && r <= MAX_PAIR_RATIO;
      }),
      rng,
    );
    // Same axis reads much more clearly ("altezza" against "altezza"), so it
    // wins when one is available; a cross-axis pair is still legitimate and
    // the UI always names both axes.
    const target =
      candidates.find((o) => o.axis === reference.axis) ?? candidates[0];
    if (!target) continue;

    used.add(reference.id);
    used.add(target.id);
    rounds.push({
      reference,
      target,
      startBias: startBiasFor(
        rng.int(0, START_LADDER.length - 1),
        reference,
        target,
      ),
    });
  }
  return rounds;
}

export function buildLevel(seed: string): GameLevel<SizeSessionData> {
  const rounds = buildRounds(seed);
  const score = mean(rounds.map(roundDifficulty));
  return {
    id: `size-it-up-${seed}`,
    gameId: "size-it-up",
    generatorVersion: SIZE_GENERATOR_VERSION,
    seed,
    difficulty: tierOf(score),
    difficultyScore: round3(score),
    data: { rounds },
    contentHash: sessionContentHash(rounds),
    createdAt: new Date().toISOString(),
  };
}

export const sizeGenerator: LevelGenerator<SizeSessionData> = {
  version: SIZE_GENERATOR_VERSION,
  generate: (seed) => buildLevel(seed),
};
