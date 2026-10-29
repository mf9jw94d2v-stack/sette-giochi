import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  getPersistence,
  onPersistenceChange,
  persistenceVersion,
} from "@/services/persistence";
import {
  emitSaveEvent,
  SaveRejectedError,
} from "@/services/persistence/saveEvents";
import type { GameId, GameResult } from "@/types/game";

/**
 * Session plumbing every game needs and none of them should style: the daily
 * lock, saving the result once, the mute preference, the daily number.
 *
 * It holds BEHAVIOUR only. Nothing here renders, so sharing it cannot make two
 * games look alike — that is the rule for everything in `src/games/shared`.
 */

export type PlayMode = "daily" | "practice";

/**
 * How a board is being presented, so each game can show the right controls
 * in its OWN visual language: the Oggi/Allenamento switch on the game page,
 * or a back link and an archive notice when replaying a past day.
 */
export type PlayContext =
  | { kind: "modes"; mode: PlayMode; onModeChange: (mode: PlayMode) => void }
  | { kind: "archive"; date: string; backTo: string };

/** Days since a game's own launch day, 1-based — "Sfida di oggi #12". */
export function dailyNumber(date: string, epoch: string): number {
  const d = Date.parse(`${date}T00:00:00Z`);
  const e = Date.parse(`${epoch}T00:00:00Z`);
  if (!Number.isFinite(d) || !Number.isFinite(e)) return 1;
  return Math.floor((d - e) / 86_400_000) + 1;
}

export interface DailyLock {
  /** An official result already exists for this game and day. */
  alreadyPlayed: boolean;
  /** Its score — shown instead of the empty session. */
  storedScore: number | null;
}

/**
 * Looks up whether today's official challenge was already played. The game
 * then jumps to its results screen showing the STORED score: the challenge
 * counts once, and refreshing the page must not hand out a second attempt.
 */
export function useDailyLock(
  gameId: GameId,
  mode: PlayMode,
  dailyDate?: string,
): DailyLock {
  const [lock, setLock] = useState<DailyLock>({
    alreadyPlayed: false,
    storedScore: null,
  });
  // Re-check when results move between device and account (sign-in/out).
  const store = useSyncExternalStore(onPersistenceChange, persistenceVersion);
  useEffect(() => {
    if (mode !== "daily" || !dailyDate) return;
    let active = true;
    void getPersistence()
      .getDailyResult(gameId, dailyDate)
      .then((existing) => {
        if (active && existing)
          setLock({ alreadyPlayed: true, storedScore: existing.score });
      })
      .catch(() => {
        /* the account could not be read: the server still refuses a second
           official result, so playing on is safe */
      });
    return () => {
      active = false;
    };
  }, [gameId, mode, dailyDate, store]);
  return lock;
}

/**
 * Saves the finished session exactly once: as the official daily result, or
 * as a free-play result for practice and archive replays. Never both, never
 * twice — the persistence layer also refuses a second daily save.
 *
 * `answers` are the player's answers round by round, built by the game's own
 * `answers.ts` (src/games/replay.ts explains why): an account sends those,
 * not the score, and the server recomputes the score itself. Each game builds
 * its own, so opening one game never loads the other six.
 */
export function usePersistResult({
  gameId,
  mode,
  dailyDate,
  levelId,
  finished,
  skip,
  result,
  answers,
  generatorVersion,
}: {
  gameId: GameId;
  mode: PlayMode;
  dailyDate?: string;
  levelId: string;
  finished: boolean;
  /** True when the day was already played: there is nothing to save. */
  skip: boolean;
  result: GameResult;
  answers: unknown[];
  generatorVersion: string;
}): void {
  const saved = useRef(false);
  useEffect(() => {
    if (!finished || skip || saved.current) return;
    saved.current = true;
    const p = getPersistence();
    const remote = p.name !== "local";
    if (mode === "daily" && dailyDate) {
      if (remote) emitSaveEvent({ kind: "saving", gameId });
      p.saveDailyResult({
        gameId,
        challengeDate: dailyDate,
        score: result.score,
        won: result.won,
        completed: result.completed,
        detail: result.detail,
        answers,
        generatorVersion,
      })
        .then((out) => {
          if (!remote) return;
          if (out.queued) emitSaveEvent({ kind: "queued", gameId });
          else if (!out.created) emitSaveEvent({ kind: "already", gameId });
          else
            emitSaveEvent({
              kind: "saved",
              gameId,
              adjustedScore: out.scoreAdjusted ? out.record.score : undefined,
            });
        })
        .catch((e: unknown) => {
          emitSaveEvent({
            kind: "rejected",
            gameId,
            reason: e instanceof SaveRejectedError ? e.reason : "server_error",
          });
        });
    } else {
      p.saveArchiveResult({
        gameId,
        levelId,
        mode: "practice",
        score: result.score,
        won: result.won,
        completed: result.completed,
        detail: result.detail,
      }).catch((e: unknown) => {
        emitSaveEvent({
          kind: "rejected",
          gameId,
          reason: e instanceof SaveRejectedError ? e.reason : "server_error",
        });
      });
    }
  }, [
    finished,
    skip,
    mode,
    dailyDate,
    gameId,
    levelId,
    result,
    answers,
    generatorVersion,
  ]);
}

/** The sound preference, remembered across games. */
export function useMute(key = "sgp:muted"): [boolean, () => void] {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    try {
      setMuted(localStorage.getItem(key) === "1");
    } catch {
      /* storage unavailable: keep sound on */
    }
  }, [key]);
  const toggle = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [key]);
  return [muted, toggle];
}

/** Honours the OS "reduce motion" setting, live. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}
