import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "../setup";
import {
  createTestSyncState,
  createTestUser,
  createTestYnabSettings,
} from "../factories/db-factories";

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { saveYNABSettings } from "@/app/actions/ynab";

function ynabSettingsFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("budgetId", "budget-1");
  formData.set("budgetName", "Budget 1");
  formData.set("splitwiseAccountId", "splitwise-account-1");
  formData.set("splitwiseAccountName", "Splitwise");
  formData.set("manualFlagColor", "orange");
  formData.set("syncedFlagColor", "green");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

describe("actions/ynab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveYNABSettings", () => {
    it("resets YNAB server knowledge when the manual flag changes", async () => {
      const user = await createTestUser();
      await createTestYnabSettings({
        userId: user.id,
        budgetId: "budget-1",
        splitwiseAccountId: "splitwise-account-1",
        manualFlagColor: "blue",
      });
      await createTestSyncState({
        userId: user.id,
        ynabServerKnowledge: "323",
      });
      mockAuth.mockResolvedValue({ user: { id: user.id } });

      const result = await saveYNABSettings(ynabSettingsFormData());

      const syncState = await prisma.syncState.findUniqueOrThrow({
        where: { userId: user.id },
      });
      expect(result.success).toBe(true);
      expect(syncState.ynabServerKnowledge).toBeNull();
    });

    it("preserves YNAB server knowledge when cursor-affecting settings do not change", async () => {
      const user = await createTestUser();
      await createTestYnabSettings({
        userId: user.id,
        budgetId: "budget-1",
        splitwiseAccountId: "splitwise-account-1",
        manualFlagColor: "orange",
        syncedFlagColor: "green",
      });
      await createTestSyncState({
        userId: user.id,
        ynabServerKnowledge: "323",
      });
      mockAuth.mockResolvedValue({ user: { id: user.id } });

      const result = await saveYNABSettings(
        ynabSettingsFormData({ budgetName: "Renamed Budget" }),
      );

      const syncState = await prisma.syncState.findUniqueOrThrow({
        where: { userId: user.id },
      });
      expect(result.success).toBe(true);
      expect(syncState.ynabServerKnowledge).toBe("323");
    });
  });
});
