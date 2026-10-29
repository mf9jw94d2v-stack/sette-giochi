import { describe, expect, it } from "vitest";
import { authErrorCode, authErrorMessage } from "./errors";
import { safeNextPath } from "./authService";

describe("auth error messages", () => {
  it("maps Supabase codes to one Italian sentence each", () => {
    expect(authErrorCode({ code: "invalid_credentials" })).toBe(
      "invalid_credentials",
    );
    expect(authErrorCode({ code: "email_not_confirmed" })).toBe(
      "email_not_confirmed",
    );
    expect(authErrorCode({ code: "over_email_send_rate_limit" })).toBe(
      "rate_limited",
    );
    expect(authErrorCode({ code: "otp_expired" })).toBe("session_missing");
    expect(authErrorCode({ name: "AuthRetryableFetchError", status: 0 })).toBe(
      "network",
    );
    expect(authErrorCode({ status: 429 })).toBe("rate_limited");
    expect(authErrorCode(new Error("boom"))).toBe("unknown");
    expect(authErrorMessage({ code: "invalid_credentials" })).toBe(
      "Email o password non corretti.",
    );
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths only", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/leaderboard?game=plain")).toBe(
      "/leaderboard?game=plain",
    );
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
