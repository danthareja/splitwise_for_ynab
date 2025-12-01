import {
  test,
  expect,
  prisma as getPrisma,
  cleanupTestUser,
} from "./fixtures/auth";
import { nanoid } from "nanoid";

/**
 * E2E tests for the settings page.
 * Maps to QA.md Section 3: Settings
 */

test.describe("Settings - Solo User", () => {
  let userId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    userId = `e2e-solo-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Solo Settings User",
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
        budgetName: "My Budget",
        splitwiseAccountId: `account-${nanoid(10)}`,
        splitwiseAccountName: "Splitwise Account",
        manualFlagColor: "blue",
        syncedFlagColor: "green",
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId,
        groupId: `group-${nanoid(10)}`,
        groupName: "My Group",
        currencyCode: "USD",
        emoji: "✅",
        defaultSplitRatio: "1:1",
      },
    });

    await prisma.syncState.create({
      data: { userId },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(userId);
  });

  test("displays solo persona correctly", async ({ page }) => {
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

    await page.goto("/dashboard/settings");

    // Should show solo mode
    await expect(page.getByText(/solo/i)).toBeVisible();
  });

  test("displays YNAB settings", async ({ page }) => {
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

    await page.goto("/dashboard/settings");

    // Should show budget name
    await expect(page.getByText(/my budget/i)).toBeVisible();

    // Should show connected badge for YNAB
    await expect(page.getByText(/connected/i).first()).toBeVisible();
  });

  test("displays Splitwise settings", async ({ page }) => {
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

    await page.goto("/dashboard/settings");

    // Should show group name
    await expect(page.getByText(/my group/i)).toBeVisible();

    // Should show currency
    await expect(page.getByText(/USD/i)).toBeVisible();
  });
});

test.describe("Settings - Duo Primary User", () => {
  let primaryUserId: string;
  let secondaryUserId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    primaryUserId = `e2e-primary-${nanoid(10)}`;
    secondaryUserId = `e2e-secondary-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    // Create primary user
    await prisma.user.create({
      data: {
        id: primaryUserId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Primary User",
        persona: "dual",
        onboardingComplete: true,
        onboardingStep: 4,
      },
    });

    // Create linked secondary user
    await prisma.user.create({
      data: {
        id: secondaryUserId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Partner Name",
        persona: "dual",
        primaryUserId,
        onboardingComplete: true,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId: primaryUserId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await prisma.account.create({
      data: {
        userId: primaryUserId,
        type: "oauth",
        provider: "ynab",
        providerAccountId: `ynab-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await prisma.account.create({
      data: {
        userId: primaryUserId,
        type: "oauth",
        provider: "splitwise",
        providerAccountId: `splitwise-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await prisma.ynabSettings.create({
      data: {
        userId: primaryUserId,
        budgetId: `budget-${nanoid(10)}`,
        budgetName: "Shared Budget",
        splitwiseAccountId: `account-${nanoid(10)}`,
        splitwiseAccountName: "Splitwise",
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Couple Group",
        currencyCode: "USD",
        emoji: "✅",
        defaultSplitRatio: "1:1",
      },
    });

    await prisma.syncState.create({
      data: { userId: primaryUserId },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(secondaryUserId);
    await cleanupTestUser(primaryUserId);
  });

  test("displays duo mode with partner name", async ({ page }) => {
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

    await page.goto("/dashboard/settings");

    // Should show duo mode
    await expect(page.getByText(/duo/i)).toBeVisible();

    // Should show partner name (use exact match to avoid multiple)
    await expect(page.getByText("Partner Name", { exact: true })).toBeVisible();
  });
});

test.describe("Settings - Duo Secondary User", () => {
  let primaryUserId: string;
  let secondaryUserId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    primaryUserId = `e2e-primary-${nanoid(10)}`;
    secondaryUserId = `e2e-secondary-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    // Create primary user
    await prisma.user.create({
      data: {
        id: primaryUserId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Primary Partner",
        persona: "dual",
        onboardingComplete: true,
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: primaryUserId,
        groupId: `group-shared-${nanoid(10)}`,
        groupName: "Shared Group",
        currencyCode: "EUR",
        emoji: "✅",
        defaultSplitRatio: "2:1",
      },
    });

    // Create secondary user (logged in user)
    await prisma.user.create({
      data: {
        id: secondaryUserId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Secondary User",
        persona: "dual",
        primaryUserId,
        onboardingComplete: true,
        onboardingStep: 4,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId: secondaryUserId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await prisma.account.create({
      data: {
        userId: secondaryUserId,
        type: "oauth",
        provider: "ynab",
        providerAccountId: `ynab-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await prisma.account.create({
      data: {
        userId: secondaryUserId,
        type: "oauth",
        provider: "splitwise",
        providerAccountId: `splitwise-${nanoid(10)}`,
        access_token: "mock-token",
      },
    });

    await prisma.ynabSettings.create({
      data: {
        userId: secondaryUserId,
        budgetId: `budget-${nanoid(10)}`,
        budgetName: "My Budget",
        splitwiseAccountId: `account-${nanoid(10)}`,
        splitwiseAccountName: "Splitwise",
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: secondaryUserId,
        groupId: `group-shared-${nanoid(10)}`,
        groupName: "Shared Group",
        currencyCode: "EUR",
        emoji: "🔄",
        defaultSplitRatio: "1:2", // Reversed from primary
      },
    });

    await prisma.syncState.create({
      data: { userId: secondaryUserId },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(secondaryUserId);
    await cleanupTestUser(primaryUserId);
  });

  test("shows managed by partner indicator for shared settings", async ({
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

    await page.goto("/dashboard/settings");

    // Should show duo mode
    await expect(page.getByText(/duo/i)).toBeVisible();

    // Should show primary partner name (use exact match to avoid multiple)
    await expect(
      page.getByText("Primary Partner", { exact: true }),
    ).toBeVisible();
  });
});

test.describe("Settings - Navigation", () => {
  let userId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    userId = `e2e-nav-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Nav User",
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

  test("can navigate back to dashboard", async ({ page }) => {
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

    await page.goto("/dashboard/settings");

    // Click back/dashboard link
    await page
      .getByRole("link", { name: /dashboard|back/i })
      .first()
      .click();

    await expect(page).toHaveURL("/dashboard");
  });
});
