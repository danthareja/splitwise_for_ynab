import { describe, it, expect, beforeEach } from "vitest";
import { YNABService } from "@/services/ynab";
import { MockSyncState } from "../helpers/service-mocks";
import { server } from "../setup";
import { http, HttpResponse } from "msw";
import type { YNABTransaction } from "@/types/ynab";

const YNAB_BASE_URL = "https://api.youneedabudget.com/v1";

describe("YNABService", () => {
  let ynabService: YNABService;
  let mockSyncState: MockSyncState;
  const userId = "test-user-id";
  const budgetId = "test-budget-id";
  const splitwiseAccountId = "test-splitwise-account-id";

  beforeEach(() => {
    mockSyncState = new MockSyncState();
    ynabService = new YNABService({
      userId,
      budgetId,
      splitwiseAccountId,
      apiKey: "test-api-key",
      manualFlagColor: "blue",
      syncedFlagColor: "green",
      syncState: mockSyncState,
    });
  });

  describe("getUnprocessedTransactions", () => {
    it("should filter transactions by manual flag color", async () => {
      const mockTransactions: YNABTransaction[] = [
        {
          id: "txn-1",
          account_id: "other-account",
          amount: -25500,
          date: "2024-01-15",
          flag_color: "blue", // Manual flag - should be included
          deleted: false,
        } as YNABTransaction,
        {
          id: "txn-2",
          account_id: "other-account",
          amount: -15000,
          date: "2024-01-16",
          flag_color: "green", // Synced flag - should be excluded
          deleted: false,
        } as YNABTransaction,
        {
          id: "txn-3",
          account_id: "other-account",
          amount: -10000,
          date: "2024-01-17",
          flag_color: "blue",
          deleted: false,
        } as YNABTransaction,
      ];

      server.use(
        http.get(`${YNAB_BASE_URL}/budgets/${budgetId}/transactions`, () => {
          return HttpResponse.json({
            data: {
              transactions: mockTransactions,
              server_knowledge: 100,
            },
          });
        }),
      );

      const result = await ynabService.getUnprocessedTransactions();

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions[0]!.id).toBe("txn-1");
      expect(result.transactions[1]!.id).toBe("txn-3");
      expect(result.serverKnowledge).toBe(100);
    });

    it("should exclude transactions from splitwise account", async () => {
      const mockTransactions: YNABTransaction[] = [
        {
          id: "txn-1",
          account_id: splitwiseAccountId, // From Splitwise account - should be excluded
          amount: -25500,
          date: "2024-01-15",
          flag_color: "blue",
          deleted: false,
        } as YNABTransaction,
        {
          id: "txn-2",
          account_id: "other-account",
          amount: -15000,
          date: "2024-01-16",
          flag_color: "blue",
          deleted: false,
        } as YNABTransaction,
      ];

      server.use(
        http.get(`${YNAB_BASE_URL}/budgets/${budgetId}/transactions`, () => {
          return HttpResponse.json({
            data: {
              transactions: mockTransactions,
              server_knowledge: 100,
            },
          });
        }),
      );

      const result = await ynabService.getUnprocessedTransactions();

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.id).toBe("txn-2");
    });

    it("should exclude deleted transactions", async () => {
      const mockTransactions: YNABTransaction[] = [
        {
          id: "txn-1",
          account_id: "other-account",
          amount: -25500,
          date: "2024-01-15",
          flag_color: "blue",
          deleted: true, // Deleted - should be excluded
        } as YNABTransaction,
        {
          id: "txn-2",
          account_id: "other-account",
          amount: -15000,
          date: "2024-01-16",
          flag_color: "blue",
          deleted: false,
        } as YNABTransaction,
      ];

      server.use(
        http.get(`${YNAB_BASE_URL}/budgets/${budgetId}/transactions`, () => {
          return HttpResponse.json({
            data: {
              transactions: mockTransactions,
              server_knowledge: 100,
            },
          });
        }),
      );

      const result = await ynabService.getUnprocessedTransactions();

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.id).toBe("txn-2");
    });

    it("should use server knowledge from sync state", async () => {
      await mockSyncState.setYNABServerKnowledge(userId, 50);

      server.use(
        http.get(
          `${YNAB_BASE_URL}/budgets/${budgetId}/transactions`,
          ({ request }) => {
            const url = new URL(request.url);
            expect(url.searchParams.get("last_knowledge_of_server")).toBe("50");
            return HttpResponse.json({
              data: {
                transactions: [],
                server_knowledge: 100,
              },
            });
          },
        ),
      );

      await ynabService.getUnprocessedTransactions();
    });
  });

  describe("toSplitwiseExpense", () => {
    it("should convert YNAB transaction to Splitwise expense format", () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: "account-1",
        amount: -25500, // -$25.50
        payee_name: "Test Payee",
        memo: "Test memo",
        date: "2024-01-15T10:30:00Z",
        deleted: false,
      } as YNABTransaction;

      const result = ynabService.toSplitwiseExpense(transaction);

      expect(result.cost).toBe("25.5");
      expect(result.description).toBe("Test Payee");
      expect(result.details).toBe("Test memo");
      expect(result.date).toBe("2024-01-15");
    });

    it("should handle transaction without memo", () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: "account-1",
        amount: -10000,
        payee_name: "Test Payee",
        memo: null,
        date: "2024-01-15",
        deleted: false,
      } as YNABTransaction;

      const result = ynabService.toSplitwiseExpense(transaction);

      expect(result.details).toBeUndefined();
    });

    it("should use 'Unknown expense' for missing payee name", () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: "account-1",
        amount: -10000,
        payee_name: null,
        memo: null,
        date: "2024-01-15",
        deleted: false,
      } as YNABTransaction;

      const result = ynabService.toSplitwiseExpense(transaction);

      expect(result.description).toBe("Unknown expense");
    });

    it("should strip timestamp from date", () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: "account-1",
        amount: -10000,
        payee_name: "Test",
        date: "2024-01-15T14:30:00.000Z",
        deleted: false,
      } as YNABTransaction;

      const result = ynabService.toSplitwiseExpense(transaction);

      expect(result.date).toBe("2024-01-15");
    });
  });

  describe("outflowToSplitwiseCost", () => {
    it("should convert negative milliunits to positive cost string", () => {
      expect(ynabService.outflowToSplitwiseCost(-25500)).toBe("25.5");
      expect(ynabService.outflowToSplitwiseCost(-10000)).toBe("10");
      expect(ynabService.outflowToSplitwiseCost(-1)).toBe("0.001");
    });

    it("should handle zero", () => {
      expect(ynabService.outflowToSplitwiseCost(0)).toBe("0");
    });

    it("should convert positive values correctly (though unusual)", () => {
      expect(ynabService.outflowToSplitwiseCost(25500)).toBe("-25.5");
    });
  });

  describe("markTransactionProcessed", () => {
    it("should update transaction with synced flag color", async () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: "account-1",
        amount: -25500,
        date: "2024-01-15",
        deleted: false,
      } as YNABTransaction;

      server.use(
        http.put(
          `${YNAB_BASE_URL}/budgets/${budgetId}/transactions/txn-1`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({
              transaction: {
                flag_color: "green",
              },
            });
            return HttpResponse.json({
              data: {
                transaction: { ...transaction, flag_color: "green" },
              },
            });
          },
        ),
      );

      await ynabService.markTransactionProcessed(transaction);
    });
  });

  describe("createTransaction", () => {
    it("should create transaction with splitwise account id", async () => {
      server.use(
        http.post(
          `${YNAB_BASE_URL}/budgets/${budgetId}/transactions`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({
              transaction: {
                account_id: splitwiseAccountId,
                amount: -12750,
                payee_name: "Test Expense",
                date: "2024-01-15",
              },
            });
            return HttpResponse.json({
              data: {
                transaction: { id: "new-txn-id" },
              },
            });
          },
        ),
      );

      await ynabService.createTransaction({
        amount: -12750,
        payee_name: "Test Expense",
        date: "2024-01-15",
      });
    });
  });

  describe("isTransactionUnprocessed", () => {
    it("should return true for unprocessed transaction", () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: "other-account",
        amount: -25500,
        date: "2024-01-15",
        flag_color: "blue",
        deleted: false,
      } as YNABTransaction;

      expect(ynabService.isTransactionUnprocessed(transaction)).toBe(true);
    });

    it("should return false for wrong flag color", () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: "other-account",
        amount: -25500,
        date: "2024-01-15",
        flag_color: "red",
        deleted: false,
      } as YNABTransaction;

      expect(ynabService.isTransactionUnprocessed(transaction)).toBe(false);
    });

    it("should return false for splitwise account transaction", () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: splitwiseAccountId,
        amount: -25500,
        date: "2024-01-15",
        flag_color: "blue",
        deleted: false,
      } as YNABTransaction;

      expect(ynabService.isTransactionUnprocessed(transaction)).toBe(false);
    });

    it("should return false for deleted transaction", () => {
      const transaction: YNABTransaction = {
        id: "txn-1",
        account_id: "other-account",
        amount: -25500,
        date: "2024-01-15",
        flag_color: "blue",
        deleted: true,
      } as YNABTransaction;

      expect(ynabService.isTransactionUnprocessed(transaction)).toBe(false);
    });
  });

  describe("sync state integration", () => {
    it("should get and set server knowledge", async () => {
      await ynabService.setServerKnowledge(150);
      const knowledge = await ynabService.getServerKnowledge();
      expect(knowledge).toBe(150);
    });
  });
});
