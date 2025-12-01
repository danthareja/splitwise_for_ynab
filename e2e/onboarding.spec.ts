import {
  test,
  expect,
  prisma as getPrisma,
  cleanupTestUser,
} from "./fixtures/auth";
import { nanoid } from "nanoid";

/**
 * E2E tests for the onboarding flow.
 *
 * These tests use real database state but require API mocking or real tokens
 * to interact with YNAB and Splitwise APIs.
 *
 * For CI, set these environment variables:
 * - E2E_YNAB_ACCESS_TOKEN: A YNAB personal access token
 * - E2E_SPLITWISE_API_KEY: A Splitwise API key
 * - E2E_YNAB_BUDGET_ID: A test budget ID in YNAB
 * - E2E_SPLITWISE_GROUP_ID: A test group ID in Splitwise
 */

test.describe("Onboarding Flow - New User", () => {
  test("new authenticated user is redirected to setup", async ({
    authenticatedPage: page,
    testUser,
  }) => {
    // Visit dashboard - should redirect to setup
    await page.goto("/dashboard");

    // Should be on setup page
    await expect(page).toHaveURL(/\/dashboard\/setup/);
  });

  test("unauthenticated user visiting setup is redirected to sign in", async ({
    page,
  }) => {
    await page.goto("/dashboard/setup");

    // Should redirect to sign in
    await expect(page).toHaveURL(/\/(auth\/signin)?$/);
  });
});

test.describe("Onboarding Flow - Step 1: Persona Selection", () => {
  let userId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    userId = `e2e-persona-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    // Create user at step 1 (has Splitwise connected)
    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Persona Test User",
        onboardingStep: 1,
        onboardingComplete: false,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // User needs Splitwise account to be at step 1
    await prisma.account.create({
      data: {
        userId,
        type: "oauth",
        provider: "splitwise",
        providerAccountId: `splitwise-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(userId);
  });

  test("user can select solo persona", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard/setup");

    // Should see persona selection
    await expect(
      page.getByRole("heading", { name: /who uses ynab/i }),
    ).toBeVisible();

    // Click solo option
    await page
      .getByRole("button", { name: /i use ynab, my partner doesn't/i })
      .click();

    // Should show selected state (amber border)
    await expect(
      page.getByRole("button", { name: /i use ynab, my partner doesn't/i }),
    ).toHaveClass(/border-amber-500/);
  });

  test("user can select duo persona", async ({ page }) => {
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard/setup");

    // Click duo option
    await page.getByRole("button", { name: /we both use ynab/i }).click();

    // Should show selected state
    await expect(
      page.getByRole("button", { name: /we both use ynab/i }),
    ).toHaveClass(/border-amber-500/);
  });
});

test.describe("Onboarding Flow - Step Resumption", () => {
  // Tests for QA.md Section 1.4: Browser refresh/return resumes at correct step

  test("user at step 0 sees Splitwise connection prompt", async ({ page }) => {
    const prisma = await getPrisma();
    const userId = `e2e-step0-${nanoid(10)}`;
    const sessionToken = `e2e-session-${nanoid(32)}`;

    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Step 0 User",
        onboardingStep: 0,
        onboardingComplete: false,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard/setup");

    // Should see Splitwise connection step (use heading to avoid multiple matches)
    await expect(
      page.getByRole("heading", { name: /connect splitwise/i }),
    ).toBeVisible();

    await cleanupTestUser(userId);
  });

  test("user at step 2 sees YNAB configuration", async ({ page }) => {
    const prisma = await getPrisma();
    const userId = `e2e-step2-${nanoid(10)}`;
    const sessionToken = `e2e-session-${nanoid(32)}`;

    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Step 2 User",
        persona: "solo",
        onboardingStep: 2,
        onboardingComplete: false,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // User needs Splitwise account to be past step 0
    await prisma.account.create({
      data: {
        userId,
        type: "oauth",
        provider: "splitwise",
        providerAccountId: `splitwise-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard/setup");

    // Should see YNAB configuration step (use heading to avoid multiple matches)
    await expect(
      page.getByRole("heading", { name: /configure ynab/i }),
    ).toBeVisible();

    await cleanupTestUser(userId);
  });

  test("user at step 3 sees Splitwise configuration", async ({ page }) => {
    const prisma = await getPrisma();
    const userId = `e2e-step3-${nanoid(10)}`;
    const sessionToken = `e2e-session-${nanoid(32)}`;

    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Step 3 User",
        persona: "solo",
        onboardingStep: 3,
        onboardingComplete: false,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // User needs both accounts to be at step 3
    await prisma.account.create({
      data: {
        userId,
        type: "oauth",
        provider: "splitwise",
        providerAccountId: `splitwise-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await prisma.account.create({
      data: {
        userId,
        type: "oauth",
        provider: "ynab",
        providerAccountId: `ynab-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await prisma.ynabSettings.create({
      data: {
        userId,
        budgetId: `budget-${nanoid(10)}`,
        budgetName: "Test Budget",
        splitwiseAccountId: `account-${nanoid(10)}`,
        splitwiseAccountName: "Splitwise",
      },
    });

    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard/setup");

    // Should see Splitwise configuration step (use heading to avoid multiple matches)
    await expect(
      page.getByRole("heading", { name: /configure splitwise/i }),
    ).toBeVisible();

    await cleanupTestUser(userId);
  });
});

test.describe("Onboarding Flow - Completed User", () => {
  let userId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    userId = `e2e-complete-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    // Create fully onboarded user
    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Completed User",
        persona: "solo",
        onboardingComplete: true,
        onboardingStep: 4,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await prisma.account.create({
      data: {
        userId,
        type: "oauth",
        provider: "ynab",
        providerAccountId: `ynab-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await prisma.account.create({
      data: {
        userId,
        type: "oauth",
        provider: "splitwise",
        providerAccountId: `splitwise-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await prisma.ynabSettings.create({
      data: {
        userId,
        budgetId: `budget-${nanoid(10)}`,
        budgetName: "Test Budget",
        splitwiseAccountId: `account-${nanoid(10)}`,
        splitwiseAccountName: "Splitwise",
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Test Group",
        currencyCode: "USD",
      },
    });

    await prisma.syncState.create({
      data: { userId },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(userId);
  });

  test("onboarded user visiting setup is redirected to dashboard", async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard/setup");

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
  });

  test("dashboard shows sync hero card for onboarded user", async ({
    page,
  }) => {
    await page.context().addCookies([
      {
        name: "authjs.session-token",
        value: sessionToken,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/dashboard");

    // Should see sync card
    await expect(
      page.getByRole("heading", { name: /sync shared expenses/i }),
    ).toBeVisible();

    // Should see sync button
    await expect(page.getByRole("button", { name: /sync now/i })).toBeVisible();
  });
});
