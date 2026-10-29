import { describe, expect, it } from "vitest";
import { challengeDate, isChallengeDate } from "./dailyDate";

describe("challengeDate", () => {
  it("formats as YYYY-MM-DD", () => {
    const d = new Date("2026-10-27T12:00:00Z");
    expect(challengeDate(d, "UTC")).toBe("2026-10-27");
  });

  it("respects the timezone at the day boundary", () => {
    // 23:30 UTC on the 27th is already the 28th in Tokyo (UTC+9).
    const d = new Date("2026-10-27T23:30:00Z");
    expect(challengeDate(d, "UTC")).toBe("2026-10-27");
    expect(challengeDate(d, "Asia/Tokyo")).toBe("2026-10-28");
    // ...and still the 27th (early evening) in New York (UTC-4/-5).
    expect(challengeDate(d, "America/New_York")).toBe("2026-10-27");
  });
});

describe("isChallengeDate", () => {
  it("accepts valid dates and rejects malformed/invalid ones", () => {
    expect(isChallengeDate("2026-10-27")).toBe(true);
    expect(isChallengeDate("2026-02-29")).toBe(false); // not a leap year
    expect(isChallengeDate("2026-13-01")).toBe(false);
    expect(isChallengeDate("2026-1-1")).toBe(false);
    expect(isChallengeDate("nope")).toBe(false);
  });
});
