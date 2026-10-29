import type { GameLevel, LevelValidator, ValidationResult } from "@/types/game";
import { getSilhouette } from "./silhouettes";
import { trueRatio } from "./geometry";
import { MAX_PAIR_RATIO, MIN_PAIR_RATIO } from "./generator";
import type { SizeLevelData, SizeObject } from "./types";
import type { SizeSessionData } from "./engine";

const AXES = new Set(["altezza", "lunghezza", "apertura alare"]);

function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** First pass: the object is well formed and could be drawn and measured. */
export function validateObject(o: SizeObject): ValidationResult {
  const reasons: string[] = [];
  if (!o.id.trim()) reasons.push("id mancante");
  if (!o.label.trim()) reasons.push(`${o.id}: etichetta mancante`);
  if (!(o.sizeM > 0) || !Number.isFinite(o.sizeM))
    reasons.push(`${o.id}: misura non valida (${o.sizeM})`);
  if (!AXES.has(o.axis)) reasons.push(`${o.id}: asse sconosciuto "${o.axis}"`);
  if (!o.source.trim())
    reasons.push(`${o.id}: nessuna fonte dichiarata per la misura`);
  if (o.sourceUrl !== undefined && !/^https?:\/\//.test(o.sourceUrl))
    reasons.push(`${o.id}: sourceUrl non è un indirizzo valido`);
  const s = getSilhouette(o.silhouette);
  if (!s) reasons.push(`${o.id}: sagoma "${o.silhouette}" inesistente`);
  else {
    if (!(s.box.w > 0) || !(s.box.h > 0))
      reasons.push(`${o.id}: la sagoma ha un riquadro degenere`);
    if (!s.d.trim()) reasons.push(`${o.id}: la sagoma non ha tracciato`);
    const aspect = s.box.w / s.box.h;
    // A silhouette thinner than 1:40 either way is almost certainly a mistake
    // in the drawing rather than a real object.
    if (aspect > 40 || aspect < 1 / 40)
      reasons.push(
        `${o.id}: proporzioni della sagoma implausibili (${aspect.toFixed(2)})`,
      );
  }
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

export function validateRound(r: SizeLevelData): ValidationResult {
  const reasons: string[] = [];
  for (const side of [r.reference, r.target]) {
    const res = validateObject(side);
    if (!res.ok) reasons.push(...res.reasons);
  }
  if (r.reference.id === r.target.id)
    reasons.push(`${r.reference.id}: confrontato con sé stesso`);
  if (!(r.startBias > 0) || !Number.isFinite(r.startBias))
    reasons.push("scala iniziale non valida");
  return { ok: reasons.length === 0, reasons, confidence: "verified" };
}

/**
 * Second, INDEPENDENT pass: can this round actually be PLAYED and WON?
 *
 * It does not re-run the generator's own pairing logic. It recomputes the true
 * ratio from the catalogue figures, checks the pair is inside the playable
 * band, and — the part that matters — checks the round does not open on its
 * own answer, which would hand the player 100 points for doing nothing.
 */
export function verifyRound(r: SizeLevelData): ValidationResult {
  const reasons: string[] = [];
  const truth = trueRatio(r.reference, r.target);

  if (!Number.isFinite(truth) || truth <= 0) {
    reasons.push("rapporto reale non calcolabile");
  } else {
    if (truth < MIN_PAIR_RATIO || truth > MAX_PAIR_RATIO)
      reasons.push(
        `rapporto ${truth.toFixed(3)}× fuori dalla banda giocabile [${MIN_PAIR_RATIO.toFixed(3)}, ${MAX_PAIR_RATIO}]`,
      );
    const startErr = Math.abs(r.startBias - truth) / truth;
    if (startErr <= 0.06)
      reasons.push(
        `la sagoma parte già dalla risposta (scarto ${(startErr * 100).toFixed(1)}%)`,
      );
  }
  return {
    ok: reasons.length === 0,
    reasons,
    // The ratio is arithmetic on two stated figures, so this really is proven —
    // what it cannot prove is that the catalogue figures are themselves right.
    confidence: "verified",
  };
}

export function sessionContentHash(rounds: readonly SizeLevelData[]): string {
  return hash(
    rounds
      .map((r) => `${r.reference.id}>${r.target.id}@${r.startBias}`)
      .join("|"),
  );
}

export const sizeValidator: LevelValidator<SizeSessionData> = {
  validateStructure(level: GameLevel<SizeSessionData>): ValidationResult {
    const reasons: string[] = [];
    const rounds = level.data.rounds;
    if (rounds.length === 0) reasons.push("la sessione non ha round");
    rounds.forEach((r, i) => {
      const res = validateRound(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    const pairs = rounds.map((r) => `${r.reference.id}>${r.target.id}`);
    if (new Set(pairs).size !== pairs.length)
      reasons.push("confronto ripetuto nella stessa sessione");
    return { ok: reasons.length === 0, reasons, confidence: "verified" };
  },

  verifySolution(level: GameLevel<SizeSessionData>): ValidationResult {
    const reasons: string[] = [];
    level.data.rounds.forEach((r, i) => {
      const res = verifyRound(r);
      if (!res.ok) reasons.push(`round ${i}: ${res.reasons.join("; ")}`);
    });
    return { ok: reasons.length === 0, reasons, confidence: "verified" };
  },

  contentHash: (level) => sessionContentHash(level.data.rounds),
};
