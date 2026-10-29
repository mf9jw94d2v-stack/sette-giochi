import { useCallback, useState } from "react";
import { challengeDate } from "@/lib/dailyDate";
import type { PlayContext, PlayMode } from "./session";

const freshSeed = () => `practice-${Date.now()}`;

/**
 * Oggi / Allenamento for a game page: which board to mount and with what seed.
 *
 * Today's challenge is seeded with the date, so every player gets the same
 * one. Practice gets a new seed each time — including on "Rigioca", which
 * remounts the board instead of reloading the whole page.
 */
export function useGameMode() {
  const today = challengeDate();
  const [mode, setMode] = useState<PlayMode>("daily");
  const [practiceSeed, setPracticeSeed] = useState(freshSeed);

  const onModeChange = useCallback((next: PlayMode) => {
    if (next === "practice") setPracticeSeed(freshSeed());
    setMode(next);
  }, []);

  const restart = useCallback(() => setPracticeSeed(freshSeed()), []);

  const context: PlayContext = { kind: "modes", mode, onModeChange };
  const board =
    mode === "daily"
      ? { key: `daily-${today}`, mode, seed: today, dailyDate: today }
      : { key: practiceSeed, mode, seed: practiceSeed, dailyDate: undefined };

  return { mode, today, context, board, restart };
}
