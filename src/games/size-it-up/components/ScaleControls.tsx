import { Minus, Plus } from "lucide-react";
import {
  clampRatio,
  ratioToSlider,
  sliderToRatio,
  stepRatio,
} from "../geometry";

/**
 * Every way to change the estimate that is not the drag handle.
 *
 * The handle must never be the only route: the slider and the buttons do the
 * same job with a pointer, a finger or a keyboard, and the slider carries the
 * accessible value for screen readers.
 */
export function ScaleControls({
  ratio,
  onChange,
  disabled,
  targetLabel,
  valuePrefix,
}: {
  ratio: number;
  onChange: (next: number) => void;
  disabled: boolean;
  targetLabel: string;
  /** Spoken before the ratio, e.g. the estimate in metres. */
  valuePrefix?: string;
}) {
  const t = ratioToSlider(ratio);

  return (
    <div className="flex items-center gap-3">
      <StepButton
        label="Rimpicciolisci"
        disabled={disabled}
        onClick={() => onChange(stepRatio(ratio, -1))}
      >
        <Minus className="h-5 w-5" aria-hidden="true" />
      </StepButton>

      <div className="min-w-0 flex-1">
        <label htmlFor="siu-scale" className="sr-only">
          Scala di {targetLabel} rispetto al riferimento
        </label>
        <input
          id="siu-scale"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={t}
          disabled={disabled}
          onChange={(e) => onChange(sliderToRatio(Number(e.target.value)))}
          aria-valuetext={`${valuePrefix ? `${valuePrefix}, ` : ""}${ratio.toLocaleString(
            "it-IT",
            { maximumFractionDigits: ratio < 10 ? 2 : 0 },
          )} volte il riferimento`}
          className="siu-range"
        />
        <div
          className="siu-label -mt-1 flex justify-between"
          style={{ letterSpacing: "0.06em" }}
        >
          <span>molto più piccolo</span>
          <span>molto più grande</span>
        </div>
      </div>

      <StepButton
        label="Ingrandisci"
        disabled={disabled}
        onClick={() => onChange(stepRatio(ratio, 1))}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </StepButton>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      // 52px: well above the 44px minimum for a finger.
      className="siu-tool siu-tool-lg"
    >
      {children}
    </button>
  );
}

const GROW = new Set(["+", "=", "ArrowUp"]);
const SHRINK = new Set(["-", "_", "ArrowDown"]);

/** Whether this key resizes the silhouette at all. */
export function isScaleKey(key: string): boolean {
  return GROW.has(key) || SHRINK.has(key);
}

/**
 * Keyboard shortcuts, wired by the game and listed in the instructions.
 *
 * Takes the ratio as an argument and returns the next one, so the caller can
 * apply it with a functional state update. That matters: three quick presses
 * of "+" land in the same tick, and reading the ratio from a closure would
 * make all three compute the same result — two presses silently lost.
 */
export function applyShortcut(
  key: string,
  shiftKey: boolean,
  ratio: number,
): number | null {
  if (GROW.has(key)) return clampRatio(stepRatio(ratio, 1, shiftKey));
  if (SHRINK.has(key)) return clampRatio(stepRatio(ratio, -1, shiftKey));
  return null;
}
