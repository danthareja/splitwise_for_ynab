import { prisma } from "../setup";
import type {
  User,
  Account,
  SplitwiseSettings,
  YnabSettings,
  SyncHistory,
  SyncState,
} from "@/prisma/generated/client";
import { nanoid } from "nanoid";

// Test data creation functions that actually insert into the database
export async function createTestUser(
  overrides: Partial<User> = {},
): Promise<User> {
  const id = overrides.id || `test-user-${nanoid(10)}`;
  const email = overrides.email || `test-${nanoid(10)}@example.com`;
  const apiKey = overrides.apiKey || `test-api-key-${nanoid(10)}`;

  return await prisma.user.create({
    data: {
      id,
      name: "Test User",
      email,
      apiKey,
      ...overrides,
    },
  });
}

export async function createTestAccount(
  type: "ynab" | "splitwise",
  overrides: Partial<Account> & { userId: string },
): Promise<Account> {
  const providerAccountId =
    overrides.providerAccountId || `${type}-account-${nanoid(10)}`;
  const access_token =
    overrides.access_token || `${type}-access-token-${nanoid(10)}`;

  const baseData = {
    type: type === "ynab" ? "oauth" : "oauth",
    provider: type === "ynab" ? "ynab" : "splitwise",
    providerAccountId,
    access_token,
    ...overrides,
  };

  return await prisma.account.create({
    data: baseData,
  });
}

export async function createTestSplitwiseSettings(
  overrides: Partial<SplitwiseSettings> & { userId: string },
): Promise<SplitwiseSettings> {
  const groupId = overrides.groupId || `test-group-${nanoid(10)}`;

  return await prisma.splitwiseSettings.create({
    data: {
      groupId,
      groupName: "Test Splitwise Group",
      currencyCode: "USD",
      emoji: "✅",
      defaultSplitRatio: "1:1",
      useDescriptionAsPayee: true,
      ...overrides,
    },
  });
}

export async function createTestYnabSettings(
  overrides: Partial<YnabSettings> & { userId: string },
): Promise<YnabSettings> {
  const budgetId = overrides.budgetId || `test-budget-${nanoid(10)}`;
  const splitwiseAccountId =
    overrides.splitwiseAccountId || `test-account-${nanoid(10)}`;

  return await prisma.ynabSettings.create({
    data: {
      budgetId,
      budgetName: "Test YNAB Budget",
      splitwiseAccountId,
      splitwiseAccountName: "Test Splitwise Account",
      manualFlagColor: "blue",
      syncedFlagColor: "green",
      ...overrides,
    },
  });
}

export async function createTestSyncHistory(
  overrides: Partial<SyncHistory> & { userId: string },
): Promise<SyncHistory> {
  return await prisma.syncHistory.create({
    data: {
      status: "success",
      startedAt: new Date(),
      completedAt: new Date(),
      ...overrides,
    },
  });
}

export async function createTestSyncState(
  overrides: Partial<SyncState> & { userId: string },
): Promise<SyncState> {
  return await prisma.syncState.create({
    data: {
      ynabServerKnowledge: null,
      splitwiseLastSynced: new Date("2025-05-23T08:49:26.012Z"),
      ...overrides,
    },
  });
}

// Helper function to create a fully configured user for testing
export async function createFullyConfiguredUser(
  overrides: {
    user?: Partial<User>;
    splitwiseSettings?: Partial<SplitwiseSettings>;
    ynabSettings?: Partial<YnabSettings>;
  } = {},
) {
  const user = await createTestUser(overrides.user);

  const [ynabAccount, splitwiseAccount] = await Promise.all([
    createTestAccount("ynab", { userId: user.id }),
    createTestAccount("splitwise", { userId: user.id }),
  ]);

  const [ynabSettings, splitwiseSettings] = await Promise.all([
    createTestYnabSettings({ userId: user.id, ...overrides.ynabSettings }),
    createTestSplitwiseSettings({
      userId: user.id,
      ...overrides.splitwiseSettings,
    }),
  ]);

  const syncState = await createTestSyncState({ userId: user.id });

  return {
    user,
    ynabAccount,
    splitwiseAccount,
    ynabSettings,
    splitwiseSettings,
    syncState,
  };
}

// Helper function to create paired group users
export async function createPairedGroupUsers() {
  const groupId = `paired-group-${nanoid(10)}`;

  const user1Data = await createFullyConfiguredUser({
    user: {
      id: `user-1-${nanoid(10)}`,
      email: `user1-${nanoid(10)}@example.com`,
    },
    splitwiseSettings: { groupId },
  });

  const user2Data = await createFullyConfiguredUser({
    user: {
      id: `user-2-${nanoid(10)}`,
      email: `user2-${nanoid(10)}@example.com`,
    },
    splitwiseSettings: { groupId },
  });

  return {
    user1: user1Data,
    user2: user2Data,
    groupId,
  };
}
