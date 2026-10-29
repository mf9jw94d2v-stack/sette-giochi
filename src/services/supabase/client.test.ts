import { describe, expect, it, vi } from "vitest";
import { isPrivilegedKey, readBackendConfig } from "./client";

const jwt = (payload: object) =>
  `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.sig`;

describe("backend configuration", () => {
  it("is off without URL or key", () => {
    expect(readBackendConfig({})).toBeNull();
    expect(
      readBackendConfig({ VITE_SUPABASE_URL: "https://x.supabase.co" }),
    ).toBeNull();
  });

  it("accepts the publishable key, and the older anon name", () => {
    expect(
      readBackendConfig({
        VITE_SUPABASE_URL: "https://x.supabase.co/",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
      }),
    ).toEqual({ url: "https://x.supabase.co", key: "sb_publishable_abc" });
    expect(
      readBackendConfig({
        VITE_SUPABASE_URL: "https://x.supabase.co",
        VITE_SUPABASE_ANON_KEY: jwt({ role: "anon" }),
      })?.key,
    ).toContain(".");
  });

  it("refuses keys that bypass Row Level Security", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(isPrivilegedKey("sb_secret_abc")).toBe(true);
    expect(isPrivilegedKey(jwt({ role: "service_role" }))).toBe(true);
    expect(isPrivilegedKey(jwt({ role: "anon" }))).toBe(false);
    expect(isPrivilegedKey("sb_publishable_abc")).toBe(false);
    expect(
      readBackendConfig({
        VITE_SUPABASE_URL: "https://x.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc",
      }),
    ).toBeNull();
    expect(spy).toHaveBeenCalled();
    // The message never repeats the key.
    expect(String(spy.mock.calls[0][0])).not.toContain("sb_secret_abc");
    spy.mockRestore();
  });
});
