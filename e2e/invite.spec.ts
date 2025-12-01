import {
  test,
  expect,
  prisma as getPrisma,
  cleanupTestUser,
} from "./fixtures/auth";
import { nanoid } from "nanoid";

/**
 * E2E tests for partner invite flow.
 * Maps to QA.md Section 1.3 (Duo Flow - Secondary) and Section 5 (Partner Management)
 */

test.describe("Invite - Invalid Token States", () => {
  test("invalid token shows error page", async ({ page }) => {
    await page.goto("/invite/invalid-token-xyz");

    await expect(page.getByText("😕")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /invalid invite/i }),
    ).toBeVisible();
  });

  test("can navigate home from error page", async ({ page }) => {
    await page.goto("/invite/bad-token");

    await page.getByRole("link", { name: /go to homepage/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("malformed tokens show error gracefully", async ({ page }) => {
    const malformedTokens = ["x", "../etc", "<script>"];

    for (const token of malformedTokens) {
      await page.goto(`/invite/${encodeURIComponent(token)}`);
      await expect(
        page.getByRole("heading", { name: /invalid invite/i }),
      ).toBeVisible();
    }
  });
});

test.describe("Invite - Expired Token", () => {
  let primaryUserId: string;
  let inviteToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    primaryUserId = `e2e-primary-${nanoid(10)}`;
    inviteToken = nanoid(12);

    // Create primary user with Splitwise settings
    await prisma.user.create({
      data: {
        id: primaryUserId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Primary User",
        persona: "dual",
        onboardingComplete: true,
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Test Group",
        currencyCode: "USD",
        emoji: "✅",
      },
    });

    // Create expired invite
    await prisma.partnerInvite.create({
      data: {
        token: inviteToken,
        primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Test Group",
        currencyCode: "USD",
        primaryEmoji: "✅",
        status: "pending",
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(primaryUserId);
  });

  test("expired invite shows error page", async ({ page }) => {
    await page.goto(`/invite/${inviteToken}`);

    await expect(
      page.getByRole("heading", { name: /invalid invite/i }),
    ).toBeVisible();
  });
});

test.describe("Invite - Already Accepted", () => {
  let primaryUserId: string;
  let secondaryUserId: string;
  let inviteToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    primaryUserId = `e2e-primary-${nanoid(10)}`;
    secondaryUserId = `e2e-secondary-${nanoid(10)}`;
    inviteToken = nanoid(12);

    // Create primary user
    await prisma.user.create({
      data: {
        id: primaryUserId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Primary User",
        persona: "dual",
        onboardingComplete: true,
      },
    });

    // Create secondary user linked to primary
    await prisma.user.create({
      data: {
        id: secondaryUserId,
        email: `e2e-${nanoid(10)}@test.local`,
        name: "Secondary User",
        persona: "dual",
        primaryUserId,
        onboardingComplete: true,
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Test Group",
        currencyCode: "USD",
        emoji: "✅",
      },
    });

    // Create already-accepted invite
    await prisma.partnerInvite.create({
      data: {
        token: inviteToken,
        primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Test Group",
        currencyCode: "USD",
        primaryEmoji: "✅",
        status: "accepted",
        acceptedByUserId: secondaryUserId,
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  test.afterEach(async () => {
    const prisma = await getPrisma();
    // Delete secondary first (has foreign key to primary)
    await cleanupTestUser(secondaryUserId);
    await cleanupTestUser(primaryUserId);
  });

  test("already accepted invite shows error", async ({ page }) => {
    await page.goto(`/invite/${inviteToken}`);

    await expect(
      page.getByRole("heading", { name: /invalid invite/i }),
    ).toBeVisible();
  });
});

test.describe("Invite - Valid Token (Unauthenticated)", () => {
  let primaryUserId: string;
  let inviteToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    primaryUserId = `e2e-primary-${nanoid(10)}`;
    inviteToken = nanoid(12);

    // Create primary user with full setup
    await prisma.user.create({
      data: {
        id: primaryUserId,
        email: `e2e-primary-${nanoid(10)}@test.local`,
        name: "Primary User",
        persona: "dual",
        onboardingComplete: true,
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Shared Expenses",
        currencyCode: "USD",
        emoji: "✅",
        defaultSplitRatio: "1:1",
      },
    });

    // Create valid invite
    await prisma.partnerInvite.create({
      data: {
        token: inviteToken,
        primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Shared Expenses",
        currencyCode: "USD",
        defaultSplitRatio: "1:1",
        primaryEmoji: "✅",
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(primaryUserId);
  });

  test("shows invite page with sign-in CTA", async ({ page }) => {
    await page.goto(`/invite/${inviteToken}`);

    // Should show the invite page (partner name appears in the heading)
    await expect(page.getByRole("heading", { name: /join/i })).toBeVisible();

    // Should show sign-in button
    await expect(
      page.getByRole("button", { name: /sign in with ynab/i }),
    ).toBeVisible();

    // Should show shared settings preview (group name)
    await expect(page.getByText(/shared expenses/i)).toBeVisible();
  });
});

test.describe("Invite - Valid Token (Authenticated)", () => {
  let primaryUserId: string;
  let secondaryUserId: string;
  let sessionToken: string;
  let inviteToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    primaryUserId = `e2e-primary-${nanoid(10)}`;
    secondaryUserId = `e2e-secondary-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;
    inviteToken = nanoid(12);

    // Create primary user
    await prisma.user.create({
      data: {
        id: primaryUserId,
        email: `e2e-primary-${nanoid(10)}@test.local`,
        name: "Primary User",
        persona: "dual",
        onboardingComplete: true,
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Shared Expenses",
        currencyCode: "USD",
        emoji: "✅",
        defaultSplitRatio: "1:1",
      },
    });

    // Create secondary user (not yet onboarded)
    await prisma.user.create({
      data: {
        id: secondaryUserId,
        email: `e2e-secondary-${nanoid(10)}@test.local`,
        name: "Secondary User",
        onboardingComplete: false,
        onboardingStep: 0,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId: secondaryUserId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Create valid invite
    await prisma.partnerInvite.create({
      data: {
        token: inviteToken,
        primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Shared Expenses",
        currencyCode: "USD",
        defaultSplitRatio: "1:1",
        primaryEmoji: "✅",
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(secondaryUserId);
    await cleanupTestUser(primaryUserId);
  });

  test("shows continue setup button for authenticated user", async ({
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

    await page.goto(`/invite/${inviteToken}`);

    // Should show "Signed in" state
    await expect(page.getByText(/signed in with ynab/i)).toBeVisible();

    // Should show continue button
    await expect(
      page.getByRole("button", { name: /continue setup/i }),
    ).toBeVisible();
  });
});

test.describe("Invite - Already Onboarded User", () => {
  let primaryUserId: string;
  let onboardedUserId: string;
  let sessionToken: string;
  let inviteToken: string;

  test.beforeEach(async () => {
    const prisma = await getPrisma();
    primaryUserId = `e2e-primary-${nanoid(10)}`;
    onboardedUserId = `e2e-onboarded-${nanoid(10)}`;
    sessionToken = `e2e-session-${nanoid(32)}`;
    inviteToken = nanoid(12);

    // Create primary user
    await prisma.user.create({
      data: {
        id: primaryUserId,
        email: `e2e-primary-${nanoid(10)}@test.local`,
        name: "Primary User",
        persona: "dual",
        onboardingComplete: true,
      },
    });

    await prisma.splitwiseSettings.create({
      data: {
        userId: primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Shared Expenses",
        currencyCode: "USD",
        emoji: "✅",
      },
    });

    // Create already-onboarded user
    await prisma.user.create({
      data: {
        id: onboardedUserId,
        email: `e2e-onboarded-${nanoid(10)}@test.local`,
        name: "Onboarded User",
        persona: "solo",
        onboardingComplete: true,
        onboardingStep: 4,
      },
    });

    await prisma.session.create({
      data: {
        sessionToken,
        userId: onboardedUserId,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Create valid invite
    await prisma.partnerInvite.create({
      data: {
        token: inviteToken,
        primaryUserId,
        groupId: `group-${nanoid(10)}`,
        groupName: "Shared Expenses",
        currencyCode: "USD",
        primaryEmoji: "✅",
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  });

  test.afterEach(async () => {
    await cleanupTestUser(onboardedUserId);
    await cleanupTestUser(primaryUserId);
  });

  test("already onboarded user visiting invite redirects to dashboard", async ({
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

    await page.goto(`/invite/${inviteToken}`);

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
  });
});
