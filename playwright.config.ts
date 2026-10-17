import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * The suite builds and serves a production Next.js server on port 3210 using a
 * dedicated build directory (`.next-e2e`) so it:
 *   - never collides with a `npm run dev` you already have on 3000, and
 *   - never clobbers the `.next` used by your dev server or a Vercel build.
 *
 * It runs the real production artifact, which is both faster and more
 * deterministic than first-request dev compilation.
 *
 * Set PLAYWRIGHT_BASE_URL to test an already-running deployment instead.
 */
const PORT = Number(process.env.E2E_PORT || 3210);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx next build && npx next start -p ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 300_000,
        env: {
          NEXT_DIST_DIR: ".next-e2e",
          // Point Better Auth at the test origin so cookies/origin checks match.
          BETTER_AUTH_URL: BASE_URL,
          NEXT_PUBLIC_APP_URL: BASE_URL,
        },
      },
});
