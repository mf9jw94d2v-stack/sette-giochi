/**
 * Tiny optional sound-effects helper (WebAudio). No assets, just short tones.
 * Always safe to call: if WebAudio is unavailable it does nothing. Callers
 * decide whether the user has muted sound (persist that themselves).
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, startOffset: number, duration: number): void {
  const ac = getCtx();
  if (!ac) return;
  try {
    const t0 = ac.currentTime + startOffset;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  } catch {
    /* ignore */
  }
}

/** A bright two-note chime for success. */
export function playSuccess(): void {
  tone(660, 0, 0.12);
  tone(990, 0.09, 0.16);
}

/** A soft low note for a miss. */
export function playMiss(): void {
  tone(200, 0, 0.22);
}

/** A short celebratory arpeggio for a clean run. */
export function playFanfare(): void {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.18));
}
