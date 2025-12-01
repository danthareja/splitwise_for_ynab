import { test as base, expect, type Page } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { nanoid } from "nanoid";

// Load environment variables at module init time
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// Lazy-loaded prisma instance
let _prisma: Awaited<typeof import("../../db")>["prisma"] | null = null;

async function getPrisma() {
  if (!_prisma) {
    const { prisma } = await import("../../db");
    _prisma = prisma;
  }
  return _prisma;
}

export interface TestUser {
  id: string;
  email: string;
  sessionToken: string;
}

/**
 * Creates a test user with a valid session in the database.
 * Returns the session token that can be used to authenticate.
 */
export async function createTestUserWithSession(
  overrides: {
    email?: string;
    name?: string;
    persona?: "solo" | "dual";
    onboardingComplete?: boolean;
    onboardingStep?: number;
  } = {},
): Promise<TestUser> {
  const prisma = await getPrisma();
  const id = `e2e-user-${nanoid(10)}`;
  const email = overrides.email || `e2e-${nanoid(10)}@test.local`;
  const sessionToken = `e2e-session-${nanoid(32)}`;

  // Create user
  await prisma.user.create({
    data: {
      id,
      email,
      name: overrides.name || "E2E Test User",
      persona: overrides.persona || null,
      onboardingComplete: overrides.onboardingComplete ?? false,
      onboardingStep: overrides.onboardingStep ?? 0,
    },
  });

  // Create session (expires in 1 hour)
  await prisma.session.create({
    data: {
      sessionToken,
      userId: id,
      expires: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return { id, email, sessionToken };
}

/**
 * Creates a test user that has completed YNAB OAuth (Step 0).
 * Ready to start onboarding at Step 1 (persona selection).
 */
export async function createUserWithYnabAccount(
  ynabAccessToken: string,
  overrides: {
    email?: string;
    name?: string;
  } = {},
): Promise<TestUser> {
  const prisma = await getPrisma();
  const testUser = await createTestUserWithSession(overrides);

  // Create YNAB account with provided token
  await prisma.account.create({
    data: {
      userId: testUser.id,
      type: "oauth",
      provider: "ynab",
      providerAccountId: `ynab-${nanoid(10)}`,
      access_token: ynabAccessToken,
    },
  });

  return testUser;
}

/**
 * Creates a fully configured test user with both YNAB and Splitwise connected.
 * Ready to use the dashboard.
 */
export async function createFullyOnboardedUser(
  tokens: {
    ynabAccessToken: string;
    splitwiseApiKey: string;
  },
  settings: {
    budgetId: string;
    budgetName?: string;
    splitwiseAccountId?: string;
    splitwiseGroupId: string;
    splitwiseGroupName?: string;
    persona?: "solo" | "dual";
  },
): Promise<TestUser> {
  const prisma = await getPrisma();
  const testUser = await createTestUserWithSession({
    persona: settings.persona || "solo",
    onboardingComplete: true,
    onboardingStep: 4,
  });

  // Create YNAB account
  await prisma.account.create({
    data: {
      userId: testUser.id,
      type: "oauth",
      provider: "ynab",
      providerAccountId: `ynab-${nanoid(10)}`,
      access_token: tokens.ynabAccessToken,
    },
  });

  // Create Splitwise account (using API key as access_token)
  await prisma.account.create({
    data: {
      userId: testUser.id,
      type: "oauth",
      provider: "splitwise",
      providerAccountId: `splitwise-${nanoid(10)}`,
      access_token: tokens.splitwiseApiKey,
    },
  });

  // Create YNAB settings
  await prisma.ynabSettings.create({
    data: {
      userId: testUser.id,
      budgetId: settings.budgetId,
      budgetName: settings.budgetName || "Test Budget",
      splitwiseAccountId:
        settings.splitwiseAccountId || `account-${nanoid(10)}`,
      splitwiseAccountName: "Splitwise",
      manualFlagColor: "blue",
      syncedFlagColor: "green",
    },
  });

  // Create Splitwise settings
  await prisma.splitwiseSettings.create({
    data: {
      userId: testUser.id,
      groupId: settings.splitwiseGroupId,
      groupName: settings.splitwiseGroupName || "Test Group",
      currencyCode: "USD",
      emoji: "✅",
      defaultSplitRatio: "1:1",
    },
  });

  // Create sync state
  await prisma.syncState.create({
    data: {
      userId: testUser.id,
    },
  });

  return testUser;
}

/**
 * Cleans up test users created during E2E tests.
 * Call this in afterEach or afterAll.
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  const prisma = await getPrisma();
  try {
    await prisma.user.delete({
      where: { id: userId },
    });
  } catch {
    // User might already be deleted, ignore
  }
}

/**
 * Sets the NextAuth session cookie for a Playwright page.
 */
export async function authenticatePage(
  page: Page,
  sessionToken: string,
): Promise<void> {
  // NextAuth uses this cookie name by default
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
}

// Re-export getPrisma for use in tests
export { getPrisma as prisma };

// Extended test fixture that provides authenticated pages
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: TestUser;
}>({
  testUser: async ({}, use) => {
    // Create user before test
    const user = await createTestUserWithSession();
    await use(user);
    // Cleanup after test
    await cleanupTestUser(user.id);
  },

  authenticatedPage: async ({ page, testUser }, use) => {
    await authenticatePage(page, testUser.sessionToken);
    await use(page);
  },
});

export { expect };
