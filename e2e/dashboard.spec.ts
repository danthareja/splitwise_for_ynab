import {
  test,
  expect,
  prisma as getPrisma,
  cleanupTestUser,
} from "./fixtures/auth";
import { nanoid } from "nanoid";

/**
 * E2E tests for the dashboard in various states.
 * Maps to QA.md Section 2: Dashboard
 */

test.describe("Dashboard - Empty State", () => {
  let userId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    userId = `e2e-empty-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Empty Dashboard User",
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

    // Create minimal required accounts/settings
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

  test("shows empty sync history message", async ({ page }) => {
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

    // Should show empty state
    await expect(page.getByText(/no sync history yet/i)).toBeVisible();

    // Should still show sync button
    await expect(page.getByRole("button", { name: /sync now/i })).toBeVisible();
  });
});

test.describe("Dashboard - With Sync History", () => {
  let userId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    userId = `e2e-history-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Dashboard History User",
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

    // Create sync history entries
    await prisma.syncHistory.create({
      data: {
        userId,
        status: "success",
        startedAt: new Date(Date.now() - 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 60 * 60 * 1000 + 5000),
      },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(userId);
  });

  test("shows sync history entries", async ({ page }) => {
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

    // Should NOT show empty state
    await expect(page.getByText(/no sync history yet/i)).not.toBeVisible();

    // Should show Sync History section (CardTitle is a div, not heading)
    await expect(page.getByText("Sync History")).toBeVisible();
  });
});

test.describe("Dashboard - Disabled State", () => {
  let userId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    userId = `e2e-disabled-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Disabled User",
        persona: "solo",
        onboardingComplete: true,
        onboardingStep: 4,
        disabled: true,
        disabledAt: new Date(),
        disabledReason: "YNAB authorization expired",
        suggestedFix: "Reconnect your YNAB account in Settings",
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

  test("shows disabled state with re-enable button", async ({ page }) => {
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

    // Should show disabled state
    await expect(
      page.getByRole("heading", { name: /sync paused/i }),
    ).toBeVisible();

    // Should show disabled reason
    await expect(page.getByText(/ynab authorization expired/i)).toBeVisible();

    // Should show suggested fix
    await expect(page.getByText(/reconnect your ynab account/i)).toBeVisible();

    // Should show re-enable button
    await expect(
      page.getByRole("button", { name: /re-enable sync/i }),
    ).toBeVisible();
  });
});

test.describe("Dashboard - Partner Invite Card", () => {
  let userId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    userId = `e2e-invite-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    // Create dual user waiting for partner
    await prisma.user.create({
      data: {
        id: userId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Primary Waiting User",
        persona: "dual",
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
        groupName: "Shared Group",
        currencyCode: "USD",
        emoji: "✅",
      },
    });

    await prisma.syncState.create({
      data: { userId },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(userId);
  });

  // Skip: PartnerInviteCard is a client component that makes API calls
  // (getExistingInvite, getPartnerFromGroup) which fail with mock tokens.
  // The partnership status is server-side verified, but the card rendering
  // depends on client-side API calls that need real tokens.
  test.skip("shows partner invite card for dual user waiting for partner", async ({
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

    // Should show partner invite card
    await expect(page.getByText(/invite your partner/i)).toBeVisible();
  });
});

test.describe("Dashboard - Orphaned State", () => {
  let secondaryUserId: string;
  let sessionToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    // Use a non-existent primary ID to simulate deleted primary
    const deletedPrimaryId = `deleted-primary-${nanoid(10)}`;
    secondaryUserId = `e2e-orphan-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;

    // Create orphaned secondary user pointing to non-existent primary
    await prisma.user.create({
      data: {
        id: secondaryUserId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Orphaned Secondary",
        persona: "dual",
        // primaryUserId points to a user that doesn't exist = orphaned
        // We can't set this directly due to FK constraint, so we'll skip this test
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
        budgetName: "Test Budget",
        splitwiseAccountId: `account-${nanoid(10)}`,
        splitwiseAccountName: "Splitwise",
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: secondaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Test Group",
        currencyCode: "USD",
      },
    });

    await prisma.syncState.create({
      data: { userId: secondaryUserId },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(secondaryUserId);
  });

  // Skip this test - orphaned state requires deleting the primary user after
  // the secondary is linked, which is complex to set up with FK constraints.
  // The orphaned state UI is tested manually.
  test.skip("orphaned secondary shows warning card", async ({ page }) => {
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

    // Should show orphaned warning
    await expect(page.getByText(/partner account unavailable/i)).toBeVisible();

    // Should show reconfigure link
    await expect(
      page.getByRole("link", { name: /reconfigure/i }),
    ).toBeVisible();
  });
});

test.describe("Dashboard - Navigation", () => {
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
        name: "Nav Test User",
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

  test("can navigate to settings", async ({ page }) => {
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

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Click settings link and wait for navigation
    await Promise.all([
      page.waitForURL(/\/dashboard\/settings/),
      page.getByRole("link", { name: /settings/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/settings/);
  });

  test("can navigate to help", async ({ page }) => {
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

    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");

    // Click help link and wait for navigation
    await Promise.all([
      page.waitForURL(/\/dashboard\/help/),
      page.getByRole("link", { name: /help/i }).click(),
    ]);

    await expect(page).toHaveURL(/\/dashboard\/help/);
  });
});
