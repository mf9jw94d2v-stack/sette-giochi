import { describe, expect, it } from "vitest";
import { formatWait, msUntilNextChallenge } from "./NextChallenge";

describe("next challenge countdown", () => {
  it("counts to midnight UTC", () => {
    expect(msUntilNextChallenge(new Date("2026-10-29T22:30:00Z"))).toBe(
      90 * 60_000,
    );
    expect(msUntilNextChallenge(new Date("2026-12-31T23:59:00Z"))).toBe(60_000);
  });
  it("reads naturally", () => {
    expect(formatWait(90 * 60_000)).toBe("1 h 30 min");
    expect(formatWait(2 * 3_600_000)).toBe("2 h");
    expect(formatWait(20_000)).toBe("1 min");
  });
});
