import type {
  Difficulty,
  GameId,
  GameLevel,
  GameModule,
  ValidationResult,
} from "@/types/game";
import { GAME_IDS } from "@/types/game";
import { GAME_MODULES } from "@/games/modules";
import { addDays } from "@/features/stats/stats";
import type {
  GameQualityReport,
  LevelReview,
  QualityReport,
  RejectionReason,
} from "./types";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "expert"];
const REASONS: RejectionReason[] = [
  "generation-error",
  "structure",
  "verification",
  "duplicate",
];
const CONFIDENCES: ValidationResult["confidence"][] = [
  "verified",
  "heuristic",
  "unverified",
];

type AnyModule = GameModule<never, never, never>;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Run ONE seed through the full pipeline described in
 * docs/level-generation-strategy.md:
 *
 *   generate → structural validation → independent verification →
 *   difficulty → deduplication → publish | quarantine | reject
 *
 * A level is only ever `published` when both passes succeed AND its content
 * hash has not been seen before. Nothing is published on a validator's word
 * alone, and nothing fails silently: every failure carries its reasons.
 */
export function reviewSeed(
  gameId: GameId,
  seed: string,
  seen: Map<string, string>,
  module: AnyModule = GAME_MODULES[gameId],
): LevelReview {
  const started = now();
  const base = {
    gameId,
    seed,
    generatorVersion: module.generator?.version ?? "n/a",
  };
  const fail = (
    reason: RejectionReason,
    reasons: string[],
    extra: Partial<LevelReview> = {},
  ): LevelReview => ({
    ...base,
    levelId: null,
    status: reason === "generation-error" ? "rejected" : "quarantined",
    difficulty: null,
    difficultyScore: null,
    contentHash: null,
    reasons,
    reason,
    confidence: null,
    duplicateOf: null,
    elapsedMs: now() - started,
    ...extra,
  });

  if (!module.generator || !module.validator)
    return fail("generation-error", [
      "il gioco non espone generatore o validatore",
    ]);

  let level: GameLevel<never>;
  try {
    level = module.generator.generate(seed) as GameLevel<never>;
  } catch (err) {
    return fail("generation-error", [
      err instanceof Error ? err.message : String(err),
    ]);
  }

  const common = {
    ...base,
    levelId: level.id,
    difficulty: level.difficulty,
    difficultyScore: level.difficultyScore ?? null,
    contentHash: level.contentHash,
  };

  const structure = module.validator.validateStructure(level);
  if (!structure.ok)
    return {
      ...common,
      status: "quarantined",
      reasons: structure.reasons,
      reason: "structure",
      confidence: structure.confidence,
      duplicateOf: null,
      elapsedMs: now() - started,
    };

  // Second pass: an INDEPENDENT check (see each game's validator.ts — it must
  // not simply re-run the generator's own logic).
  const verified = module.validator.verifySolution(level);
  if (!verified.ok)
    return {
      ...common,
      status: "quarantined",
      reasons: verified.reasons,
      reason: "verification",
      confidence: verified.confidence,
      duplicateOf: null,
      elapsedMs: now() - started,
    };

  // Deduplication is on CONTENT, never on the id: two seeds that produce the
  // same puzzle are one level, however differently they are named.
  const hash = module.validator.contentHash(level);
  const owner = seen.get(hash);
  if (owner !== undefined && owner !== seed)
    return {
      ...common,
      contentHash: hash,
      status: "quarantined",
      reasons: [`contenuto identico al seed ${owner}`],
      reason: "duplicate",
      confidence: verified.confidence,
      duplicateOf: owner,
      elapsedMs: now() - started,
    };
  seen.set(hash, seed);

  return {
    ...common,
    contentHash: hash,
    status: "published",
    reasons: [],
    reason: null,
    confidence: verified.confidence,
    duplicateOf: null,
    elapsedMs: now() - started,
  };
}

function emptyCounts<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

/** Run a whole seed list through the pipeline and aggregate real metrics. */
export function reviewGame(
  gameId: GameId,
  seeds: readonly string[],
  module: AnyModule = GAME_MODULES[gameId],
): GameQualityReport {
  const seen = new Map<string, string>();
  const reviews = seeds.map((s) => reviewSeed(gameId, s, seen, module));

  const difficultyDistribution = emptyCounts(DIFFICULTIES);
  const reasonCounts = emptyCounts(REASONS);
  const confidenceCounts = emptyCounts(CONFIDENCES);
  let published = 0;
  let rejected = 0;
  let quarantined = 0;
  let duplicates = 0;
  let validated = 0;
  let totalMs = 0;

  for (const r of reviews) {
    totalMs += r.elapsedMs;
    if (r.reason) reasonCounts[r.reason]++;
    // "validated" = passed both validation passes, dedup aside.
    if (r.reason === null || r.reason === "duplicate") validated++;
    if (r.status === "published") {
      published++;
      if (r.difficulty) difficultyDistribution[r.difficulty]++;
      if (r.confidence) confidenceCounts[r.confidence]++;
    } else if (r.status === "rejected") {
      rejected++;
    } else {
      quarantined++;
      if (r.reason === "duplicate") duplicates++;
    }
  }

  return {
    gameId,
    generatorVersion: module.generator?.version ?? "n/a",
    generated: seeds.length,
    validated,
    published,
    rejected,
    quarantined,
    duplicates,
    validityRate: seeds.length ? published / seeds.length : null,
    difficultyDistribution,
    reasonCounts,
    confidenceCounts,
    totalMs,
    avgMs: seeds.length ? totalMs / seeds.length : null,
    failures: reviews.filter((r) => r.status !== "published"),
    distinctLevels: seen.size,
  };
}

/**
 * The seed window: daily challenges are seeded with their own date, so the
 * honest way to measure the live catalogue is to replay the real seeds.
 * Oldest first, ending on `endDate`.
 */
export function dateSeeds(endDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    addDays(endDate, -(count - 1 - i)),
  );
}

export function reviewAll(endDate: string, count: number): QualityReport {
  const seeds = dateSeeds(endDate, count);
  const games = GAME_IDS.map((id) => reviewGame(id, seeds));
  return {
    runAt: new Date().toISOString(),
    seeds: { kind: "dates", from: seeds[0], to: seeds.at(-1)!, count },
    games,
    totals: {
      generated: games.reduce((s, g) => s + g.generated, 0),
      published: games.reduce((s, g) => s + g.published, 0),
      quarantined: games.reduce((s, g) => s + g.quarantined, 0),
      rejected: games.reduce((s, g) => s + g.rejected, 0),
      duplicates: games.reduce((s, g) => s + g.duplicates, 0),
      totalMs: games.reduce((s, g) => s + g.totalMs, 0),
    },
  };
}

/**
 * Re-review one quarantined seed. Because generation is deterministic, a seed
 * can be re-run at any time: this is the "riesame" procedure — fix the data or
 * the generator, re-run the seed, and the level leaves quarantine by itself.
 */
export function rereview(gameId: GameId, seed: string): LevelReview {
  return reviewSeed(gameId, seed, new Map());
}
