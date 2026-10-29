/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site under /<repository>/; the deploy workflow
  // sets VITE_BASE_PATH. Locally and in tests the app lives at the root.
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: false,
    // Unit, property-based and generator tests live beside the code they
    // cover. tests/e2e belongs to Playwright (npm run test:e2e) and must not
    // be picked up here — it imports a different test runner.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
