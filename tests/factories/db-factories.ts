import { prisma } from "../setup";
import type {
  User,
  Account,
  SplitwiseSettings,
  YnabSettings,
  SyncHistory,
  SyncState,
} from "@/prisma/generated/client";

// Test data creation functions that actually insert into the database
export async function createTestUser(
  overrides: Partial<User> = {},
): Promise<User> {
  return await prisma.user.create({
    data: {
      id: `test-user-${Math.random().toString(36).substring(7)}`,
      name: "Test User",
      email: `test-${Math.random().toString(36).substring(7)}@example.com`,
      apiKey: `test-api-key-${Math.random().toString(36).substring(7)}`,
      ...overrides,
    },
  });
}

export async function createTestAccount(
  type: "ynab" | "splitwise",
  overrides: Partial<Account> & { userId: string },
): Promise<Account> {
  const baseData = {
    type: type === "ynab" ? "oauth" : "oauth",
    provider: type === "ynab" ? "ynab" : "splitwise",
    providerAccountId: `${type}-account-${Math.random().toString(36).substring(7)}`,
    access_token: `${type}-access-token-${Math.random().toString(36).substring(7)}`,
    ...overrides,
  };

  return await prisma.account.create({
    data: baseData,
  });
}

export async function createTestSplitwiseSettings(
  overrides: Partial<SplitwiseSettings> & { userId: string },
): Promise<SplitwiseSettings> {
  return await prisma.splitwiseSettings.create({
    data: {
      groupId: `test-group-${Math.random().toString(36).substring(7)}`,
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
  return await prisma.ynabSettings.create({
    data: {
      budgetId: `test-budget-${Math.random().toString(36).substring(7)}`,
      budgetName: "Test YNAB Budget",
      splitwiseAccountId: `test-account-${Math.random().toString(36).substring(7)}`,
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
  const groupId = `paired-group-${Math.random().toString(36).substring(7)}`;

  const user1Data = await createFullyConfiguredUser({
    user: {
      id: "user-1",
      email: "user1@example.com",
    },
    splitwiseSettings: { groupId },
  });

  const user2Data = await createFullyConfiguredUser({
    user: {
      id: "user-2",
      email: "user2@example.com",
    },
    splitwiseSettings: { groupId },
  });

  return {
    user1: user1Data,
    user2: user2Data,
    groupId,
  };
}
