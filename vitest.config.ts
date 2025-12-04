import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", ".next"],
    // Run tests serially to avoid database conflicts
    maxWorkers: 1,
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:6969/test",
      RESEND_API_KEY: "test-resend-api-key",
      CRON_SECRET: "test-cron-secret",
      USER_SYNC_MAX_REQUESTS: "1",
      USER_SYNC_WINDOW_SECONDS: "60",
      STRIPE_SECRET_KEY: "sk_test_fake_key_for_testing",
      STRIPE_PRICE_MONTHLY: "price_test_monthly",
      STRIPE_PRICE_ANNUAL: "price_test_annual",
    },
  },
  plugins: [tsconfigPaths()],
});
