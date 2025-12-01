import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration optimized for CI speed.
 *
 * Speed optimizations:
 * - Single browser (Chromium) in CI
 * - Parallel execution with multiple workers
 * - Short timeouts for faster failures
 * - No retries in CI (fail fast)
 * - Traces only on failure
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 1,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI ? "github" : "html",

  // Global setup/teardown for database
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",

  // Global timeout - 30s per test is plenty for most E2E tests
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  use: {
    // Base URL for the dev server
    baseURL: "http://localhost:3000",

    // Collect trace only on failure for debugging
    trace: "on-first-retry",

    // Speed: disable slow animations
    video: "off",
    screenshot: "only-on-failure",

    // Faster navigation
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Only run additional browsers locally for thorough testing
    ...(process.env.CI
      ? []
      : [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
          },
        ]),
  ],

  // Run local dev server before tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true, // Always reuse if running locally
    timeout: 120_000, // 2 minutes to start
  },
});
