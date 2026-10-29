import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const BACKEND_PORT = 4174;

/**
 * End-to-end tests run against REAL production builds served by `vite
 * preview`, not the dev server: that is the bundle users would get, lazy
 * chunks and all.
 *
 * Two builds:
 *  - :4173, the guest build, with no backend (the Quality Lab flag is on so
 *    its route exists — see src/features/lab/access.ts);
 *  - :4174, the account build, pointed at a Supabase URL that only exists
 *    inside the tests: tests/e2e/backend/fakeSupabase.ts answers it. The key
 *    is a placeholder, not a credential, and nothing leaves the machine.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The service worker (public/sw.js) would answer requests itself, out of
    // reach of the tests' network stand-ins. Its behaviour is tested apart.
    serviceWorkers: "block",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /backend\//,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: /backend\//,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "account-desktop",
      testMatch: /backend\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: `http://localhost:${BACKEND_PORT}`,
      },
    },
    {
      name: "account-mobile",
      testMatch: /backend\/.*\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        baseURL: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
  webServer: [
    {
      // Empty Supabase values beat a developer's .env.local (Vite never
      // overrides variables already set): this build must stay guest-only.
      command: `VITE_SUPABASE_URL= VITE_SUPABASE_PUBLISHABLE_KEY= VITE_SUPABASE_ANON_KEY= VITE_ENABLE_QUALITY_LAB=true npm run build && npx vite preview --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `VITE_SUPABASE_URL=http://supabase.e2e.test VITE_SUPABASE_PUBLISHABLE_KEY=e2e-placeholder-not-a-key npx vite build --outDir dist-e2e-account && npx vite preview --outDir dist-e2e-account --port ${BACKEND_PORT} --strictPort`,
      port: BACKEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
