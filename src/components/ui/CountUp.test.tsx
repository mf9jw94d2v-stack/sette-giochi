import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { CountUp } from "./CountUp";

describe("CountUp", () => {
  it("never shows a value outside the range it animates across", () => {
    // Simulate the real browser quirk: the first animation frame's timestamp
    // is earlier than the moment the animation started.
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });

    const { container, rerender } = render(<CountUp value={0} />);
    rerender(<CountUp value={27} />);

    const seen: number[] = [];
    act(() => {
      frames.shift()?.(990); // 10 ms "before" the start
    });
    seen.push(Number(container.textContent));
    now = 2000;
    act(() => {
      frames.shift()?.(2000);
    });
    seen.push(Number(container.textContent));

    for (const v of seen) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(27);
    }
    expect(seen.at(-1)).toBe(27);
    vi.restoreAllMocks();
  });
});
