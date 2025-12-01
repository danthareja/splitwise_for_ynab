import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders hero section with value proposition", async ({ page }) => {
    await page.goto("/");

    // Check main headline
    await expect(
      page.getByRole("heading", { name: /your categories are lying to you/i }),
    ).toBeVisible();

    // Check subheadline
    await expect(
      page.getByText(/that \$150 grocery run\? only \$75 was yours/i),
    ).toBeVisible();

    // Check CTA button exists (first one in hero section)
    await expect(
      page.getByRole("button", { name: /get started/i }).first(),
    ).toBeVisible();
  });

  test("shows before/after category comparison", async ({ page }) => {
    await page.goto("/");

    // Without section shows inflated spending
    await expect(page.getByText(/without splitwise for ynab/i)).toBeVisible();
    await expect(page.getByText("-$150.00")).toBeVisible();

    // With section shows accurate spending
    await expect(page.getByText(/with splitwise for ynab/i)).toBeVisible();
    await expect(page.getByText("-$75.00")).toBeVisible();
  });

  test("displays phantom account explanation", async ({ page }) => {
    await page.goto("/");

    // Look for the section heading (uses smart quotes in HTML)
    await expect(
      page.getByRole("heading", { name: /phantom.*splitwise account/i }),
    ).toBeVisible();

    // Shows the account example with Splitwise balance
    await expect(page.getByText("🤝 Splitwise")).toBeVisible();
    await expect(page.getByText("+$75.00")).toBeVisible();
  });

  test("shows persona options (solo vs duo)", async ({ page }) => {
    await page.goto("/");

    // Solo persona link
    await expect(
      page.getByRole("link", { name: /i use ynab, my partner doesn't/i }),
    ).toBeVisible();

    // Duo persona link
    await expect(
      page.getByRole("link", { name: /we both use ynab/i }),
    ).toBeVisible();
  });

  test("renders workarounds section", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /the workarounds don't work/i }),
    ).toBeVisible();

    // Check the three options are shown (uses smart quotes, use partial matches)
    await expect(
      page.getByRole("heading", { name: /reimbursement.*category/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /manual split transactions/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /splitwise phantom account/i }),
    ).toBeVisible();
  });

  test("has working navigation", async ({ page }) => {
    await page.goto("/");

    // Header should exist
    await expect(page.locator("header")).toBeVisible();

    // Footer should exist
    await expect(page.locator("footer")).toBeVisible();
  });

  test("final CTA section is visible", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /finally, accurate category spending/i,
      }),
    ).toBeVisible();
  });
});

test.describe("Landing Page - Mobile", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("renders correctly on mobile", async ({ page }) => {
    await page.goto("/");

    // Main content should be visible
    await expect(
      page.getByRole("heading", { name: /your categories are lying to you/i }),
    ).toBeVisible();

    // CTA should be visible (first one)
    await expect(
      page.getByRole("button", { name: /get started/i }).first(),
    ).toBeVisible();
  });
});
