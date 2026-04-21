import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processLatestExpenses,
  processLatestTransactions,
} from "@/services/glue";
import {
  createMockYNABService,
  createMockSplitwiseService,
} from "../helpers/service-mocks";
import type { YNABTransaction } from "@/types/ynab";
import type { SplitwiseExpense } from "@/types/splitwise";
import { YNABBadRequestError, YNABConflictError } from "@/services/ynab-axios";
import { SplitwiseBadRequestError } from "@/services/splitwise-axios";

describe("services/glue", () => {
  describe("processLatestExpenses", () => {
    it("should process Splitwise expenses and create YNAB transactions", async () => {
      const mockExpenses: SplitwiseExpense[] = [
        {
          id: 1,
          description: "Test Expense 1",
          cost: "25.50",
          date: "2024-01-15",
        } as SplitwiseExpense,
        {
          id: 2,
          description: "Test Expense 2",
          cost: "30.00",
          date: "2024-01-16",
        } as SplitwiseExpense,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(splitwiseService.getLastProcessedDate).mockResolvedValue(
        "2024-01-01T00:00:00Z",
      );
      vi.mocked(splitwiseService.getUnprocessedExpenses).mockResolvedValue(
        mockExpenses,
      );
      vi.mocked(splitwiseService.toYNABTransaction).mockImplementation(
        (expense) =>
          ({
            amount: -12750,
            payee_name: expense.description,
            date: expense.date,
          }) as Partial<YNABTransaction>,
      );
      vi.mocked(ynabService.createTransaction).mockResolvedValue({});
      vi.mocked(splitwiseService.markExpenseProcessed).mockResolvedValue();
      vi.mocked(splitwiseService.setLastProcessedDate).mockResolvedValue();

      const result = await processLatestExpenses(ynabService, splitwiseService);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(ynabService.createTransaction).toHaveBeenCalledTimes(2);
      expect(splitwiseService.markExpenseProcessed).toHaveBeenCalledTimes(2);
      expect(splitwiseService.setLastProcessedDate).toHaveBeenCalledTimes(1);
    });

    it("should handle YNAB bad request errors gracefully", async () => {
      const mockExpenses: SplitwiseExpense[] = [
        {
          id: 1,
          description: "Valid Expense",
          cost: "25.50",
          date: "2024-01-15",
        } as SplitwiseExpense,
        {
          id: 2,
          description: "Invalid Expense",
          cost: "30.00",
          date: "2024-01-16",
        } as SplitwiseExpense,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(splitwiseService.getLastProcessedDate).mockResolvedValue(
        "2024-01-01T00:00:00Z",
      );
      vi.mocked(splitwiseService.getUnprocessedExpenses).mockResolvedValue(
        mockExpenses,
      );
      vi.mocked(splitwiseService.toYNABTransaction).mockImplementation(
        (expense) =>
          ({
            amount: -12750,
            payee_name: expense.description,
            date: expense.date,
          }) as Partial<YNABTransaction>,
      );

      // First expense succeeds, second fails
      vi.mocked(ynabService.createTransaction)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(
          new YNABBadRequestError("Invalid payee name", {}, false),
        );

      vi.mocked(splitwiseService.markExpenseProcessed).mockResolvedValue();
      vi.mocked(splitwiseService.setLastProcessedDate).mockResolvedValue();

      const result = await processLatestExpenses(ynabService, splitwiseService);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]!.expense.id).toBe(2);
      expect(result.failed[0]!.error).toBeInstanceOf(YNABBadRequestError);
      // Should still set last processed date even with failures
      expect(splitwiseService.setLastProcessedDate).toHaveBeenCalledTimes(1);
    });

    it("should throw non-YNABBadRequestError errors", async () => {
      const mockExpenses: SplitwiseExpense[] = [
        {
          id: 1,
          description: "Test Expense",
          cost: "25.50",
          date: "2024-01-15",
        } as SplitwiseExpense,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(splitwiseService.getLastProcessedDate).mockResolvedValue(
        "2024-01-01T00:00:00Z",
      );
      vi.mocked(splitwiseService.getUnprocessedExpenses).mockResolvedValue(
        mockExpenses,
      );
      vi.mocked(splitwiseService.toYNABTransaction).mockImplementation(
        (expense) =>
          ({
            amount: -12750,
            payee_name: expense.description,
            date: expense.date,
          }) as Partial<YNABTransaction>,
      );

      // Throw a network error
      vi.mocked(ynabService.createTransaction).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(
        processLatestExpenses(ynabService, splitwiseService),
      ).rejects.toThrow("Network error");
    });

    it("should skip a YNAB 409 on create and still mark the expense processed", async () => {
      // Regression: createTransaction returning 409 (import_id conflict) used
      // to abort the loop, leaving setLastProcessedDate uncalled and re-pulling
      // the same expense forever.
      const mockExpenses: SplitwiseExpense[] = [
        {
          id: 1,
          description: "Already in YNAB",
          cost: "25.50",
          date: "2024-01-15",
        } as SplitwiseExpense,
        {
          id: 2,
          description: "Fresh",
          cost: "30.00",
          date: "2024-01-16",
        } as SplitwiseExpense,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(splitwiseService.getLastProcessedDate).mockResolvedValue(
        "2024-01-01T00:00:00Z",
      );
      vi.mocked(splitwiseService.getUnprocessedExpenses).mockResolvedValue(
        mockExpenses,
      );
      vi.mocked(splitwiseService.toYNABTransaction).mockImplementation(
        (expense) =>
          ({
            amount: -12750,
            payee_name: expense.description,
            date: expense.date,
          }) as Partial<YNABTransaction>,
      );

      // First expense -> 409 conflict; second expense -> fresh create
      vi.mocked(ynabService.createTransaction)
        .mockRejectedValueOnce(
          new YNABConflictError(
            { response: { status: 409 } } as never,
            "create transaction",
          ),
        )
        .mockResolvedValueOnce({});

      vi.mocked(splitwiseService.markExpenseProcessed).mockResolvedValue();
      vi.mocked(splitwiseService.setLastProcessedDate).mockResolvedValue();

      const result = await processLatestExpenses(ynabService, splitwiseService);

      // Both expenses treated as successful (409 is idempotent).
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      // markExpenseProcessed runs for both (including the 409'd one).
      expect(splitwiseService.markExpenseProcessed).toHaveBeenCalledTimes(2);
      // Forward progress happens.
      expect(splitwiseService.setLastProcessedDate).toHaveBeenCalledTimes(1);
    });

    it("should treat a Splitwise mark-as-processed failure as a partial error and keep going", async () => {
      // Regression: a locked Splitwise expense (e.g. a participant left the
      // group) used to rethrow out of markExpenseProcessed and abort the loop,
      // blocking every subsequent expense and preventing setLastProcessedDate
      // from ever advancing.
      const mockExpenses: SplitwiseExpense[] = [
        {
          id: 1,
          description: "Locked by departed user",
          cost: "50.00",
          date: "2024-01-15",
        } as SplitwiseExpense,
        {
          id: 2,
          description: "Next expense",
          cost: "20.00",
          date: "2024-01-16",
        } as SplitwiseExpense,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(splitwiseService.getLastProcessedDate).mockResolvedValue(
        "2024-01-01T00:00:00Z",
      );
      vi.mocked(splitwiseService.getUnprocessedExpenses).mockResolvedValue(
        mockExpenses,
      );
      vi.mocked(splitwiseService.toYNABTransaction).mockImplementation(
        (expense) =>
          ({
            amount: -12750,
            payee_name: expense.description,
            date: expense.date,
          }) as Partial<YNABTransaction>,
      );
      vi.mocked(ynabService.createTransaction).mockResolvedValue({});

      // First expense fails on mark; second marks successfully.
      vi.mocked(splitwiseService.markExpenseProcessed)
        .mockRejectedValueOnce(
          new SplitwiseBadRequestError(
            { response: { status: 400 } } as never,
            "mark expense as processed",
          ),
        )
        .mockResolvedValueOnce();
      vi.mocked(splitwiseService.setLastProcessedDate).mockResolvedValue();

      const result = await processLatestExpenses(ynabService, splitwiseService);

      expect(result.successful).toHaveLength(1);
      expect(result.successful[0]!.id).toBe(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]!.expense.id).toBe(1);
      expect(result.failed[0]!.error).toBeInstanceOf(SplitwiseBadRequestError);
      // Both createTransaction calls still happened.
      expect(ynabService.createTransaction).toHaveBeenCalledTimes(2);
      // setLastProcessedDate still advances even with a partial failure.
      expect(splitwiseService.setLastProcessedDate).toHaveBeenCalledTimes(1);
    });

    it("should still throw on non-bad-request, non-conflict errors", async () => {
      // Auth/5xx/network errors must still abort so the outer layer can
      // disable or alert - they're not per-item issues.
      const mockExpenses: SplitwiseExpense[] = [
        {
          id: 1,
          description: "Test Expense",
          cost: "25.50",
          date: "2024-01-15",
        } as SplitwiseExpense,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(splitwiseService.getLastProcessedDate).mockResolvedValue(
        "2024-01-01T00:00:00Z",
      );
      vi.mocked(splitwiseService.getUnprocessedExpenses).mockResolvedValue(
        mockExpenses,
      );
      vi.mocked(splitwiseService.toYNABTransaction).mockImplementation(
        (expense) =>
          ({
            amount: -12750,
            payee_name: expense.description,
            date: expense.date,
          }) as Partial<YNABTransaction>,
      );
      vi.mocked(ynabService.createTransaction).mockRejectedValue(
        new Error("connection reset"),
      );
      vi.mocked(splitwiseService.setLastProcessedDate).mockResolvedValue();

      await expect(
        processLatestExpenses(ynabService, splitwiseService),
      ).rejects.toThrow("connection reset");

      // Never got far enough to mark progress.
      expect(splitwiseService.setLastProcessedDate).not.toHaveBeenCalled();
    });

    it("should use getLastProcessedDate for filtering", async () => {
      const lastProcessedDate = "2024-01-10T00:00:00Z";
      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(splitwiseService.getLastProcessedDate).mockResolvedValue(
        lastProcessedDate,
      );
      vi.mocked(splitwiseService.getUnprocessedExpenses).mockResolvedValue([]);
      vi.mocked(splitwiseService.setLastProcessedDate).mockResolvedValue();

      await processLatestExpenses(ynabService, splitwiseService);

      expect(splitwiseService.getUnprocessedExpenses).toHaveBeenCalledWith({
        updated_after: lastProcessedDate,
      });
    });
  });

  describe("processLatestTransactions", () => {
    it("should process YNAB transactions and create Splitwise expenses", async () => {
      const mockTransactions: YNABTransaction[] = [
        {
          id: "txn-1",
          amount: -25500,
          payee_name: "Test Transaction 1",
          date: "2024-01-15",
        } as YNABTransaction,
        {
          id: "txn-2",
          amount: -30000,
          payee_name: "Test Transaction 2",
          date: "2024-01-16",
        } as YNABTransaction,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(ynabService.getServerKnowledge).mockResolvedValue(100);
      vi.mocked(ynabService.getUnprocessedTransactions).mockResolvedValue({
        transactions: mockTransactions,
        serverKnowledge: 150,
      });
      vi.mocked(ynabService.toSplitwiseExpense).mockImplementation(
        (transaction) =>
          ({
            cost: "25.50",
            description: transaction.payee_name,
            date: transaction.date,
          }) as Partial<SplitwiseExpense>,
      );
      vi.mocked(splitwiseService.createExpense).mockResolvedValue({
        id: 1,
      } as SplitwiseExpense);
      vi.mocked(ynabService.markTransactionProcessed).mockResolvedValue({});
      vi.mocked(ynabService.setServerKnowledge).mockResolvedValue();

      const result = await processLatestTransactions(
        ynabService,
        splitwiseService,
      );

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(splitwiseService.createExpense).toHaveBeenCalledTimes(2);
      expect(ynabService.markTransactionProcessed).toHaveBeenCalledTimes(2);
      expect(ynabService.setServerKnowledge).toHaveBeenCalledWith(150);
    });

    it("should handle Splitwise bad request errors gracefully", async () => {
      const mockTransactions: YNABTransaction[] = [
        {
          id: "txn-1",
          amount: -25500,
          payee_name: "Valid Transaction",
          date: "2024-01-15",
        } as YNABTransaction,
        {
          id: "txn-2",
          amount: -30000,
          payee_name: "Invalid Transaction",
          date: "2024-01-16",
        } as YNABTransaction,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(ynabService.getServerKnowledge).mockResolvedValue(100);
      vi.mocked(ynabService.getUnprocessedTransactions).mockResolvedValue({
        transactions: mockTransactions,
        serverKnowledge: 150,
      });
      vi.mocked(ynabService.toSplitwiseExpense).mockImplementation(
        (transaction) =>
          ({
            cost: "25.50",
            description: transaction.payee_name,
            date: transaction.date,
          }) as Partial<SplitwiseExpense>,
      );

      // First transaction succeeds, second fails
      vi.mocked(splitwiseService.createExpense)
        .mockResolvedValueOnce({ id: 1 } as SplitwiseExpense)
        .mockRejectedValueOnce(
          new SplitwiseBadRequestError("Invalid expense data", {}, false),
        );

      vi.mocked(ynabService.markTransactionProcessed).mockResolvedValue({});
      vi.mocked(ynabService.setServerKnowledge).mockResolvedValue();

      const result = await processLatestTransactions(
        ynabService,
        splitwiseService,
      );

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]!.transaction.id).toBe("txn-2");
      expect(result.failed[0]!.error).toBeInstanceOf(SplitwiseBadRequestError);
      // Should still set server knowledge even with failures
      expect(ynabService.setServerKnowledge).toHaveBeenCalledWith(150);
    });

    it("should throw non-SplitwiseBadRequestError errors", async () => {
      const mockTransactions: YNABTransaction[] = [
        {
          id: "txn-1",
          amount: -25500,
          payee_name: "Test Transaction",
          date: "2024-01-15",
        } as YNABTransaction,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(ynabService.getServerKnowledge).mockResolvedValue(100);
      vi.mocked(ynabService.getUnprocessedTransactions).mockResolvedValue({
        transactions: mockTransactions,
        serverKnowledge: 150,
      });
      vi.mocked(ynabService.toSplitwiseExpense).mockImplementation(
        (transaction) =>
          ({
            cost: "25.50",
            description: transaction.payee_name,
            date: transaction.date,
          }) as Partial<SplitwiseExpense>,
      );

      // Throw a network error
      vi.mocked(splitwiseService.createExpense).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(
        processLatestTransactions(ynabService, splitwiseService),
      ).rejects.toThrow("Network error");
    });

    it("should use server knowledge for filtering", async () => {
      const serverKnowledge = 100;
      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(ynabService.getServerKnowledge).mockResolvedValue(
        serverKnowledge,
      );
      vi.mocked(ynabService.getUnprocessedTransactions).mockResolvedValue({
        transactions: [],
        serverKnowledge: 150,
      });
      vi.mocked(ynabService.setServerKnowledge).mockResolvedValue();

      await processLatestTransactions(ynabService, splitwiseService);

      expect(ynabService.getUnprocessedTransactions).toHaveBeenCalledWith(
        serverKnowledge,
      );
    });

    it("should pass isInflow to createExpense for inflow transactions", async () => {
      const mockTransactions: YNABTransaction[] = [
        {
          id: "txn-inflow",
          amount: 25000, // +$25.00 inflow
          payee_name: "Venmo - Friend",
          date: "2024-01-15",
        } as YNABTransaction,
      ];

      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(ynabService.getServerKnowledge).mockResolvedValue(100);
      vi.mocked(ynabService.getUnprocessedTransactions).mockResolvedValue({
        transactions: mockTransactions,
        serverKnowledge: 150,
      });
      vi.mocked(ynabService.toSplitwiseExpense).mockImplementation(
        (transaction) =>
          ({
            cost: "25",
            description: transaction.payee_name,
            date: transaction.date,
            isInflow: true,
          }) as Partial<SplitwiseExpense> & { isInflow: boolean },
      );
      vi.mocked(splitwiseService.createExpense).mockResolvedValue({
        id: 1,
      } as SplitwiseExpense);
      vi.mocked(ynabService.markTransactionProcessed).mockResolvedValue({});
      vi.mocked(ynabService.setServerKnowledge).mockResolvedValue();

      await processLatestTransactions(ynabService, splitwiseService);

      expect(splitwiseService.createExpense).toHaveBeenCalledWith(
        expect.objectContaining({ isInflow: true }),
      );
    });

    it("should update server knowledge after processing", async () => {
      const ynabService = createMockYNABService();
      const splitwiseService = createMockSplitwiseService();

      vi.mocked(ynabService.getServerKnowledge).mockResolvedValue(100);
      vi.mocked(ynabService.getUnprocessedTransactions).mockResolvedValue({
        transactions: [],
        serverKnowledge: 200,
      });
      vi.mocked(ynabService.setServerKnowledge).mockResolvedValue();

      await processLatestTransactions(ynabService, splitwiseService);

      expect(ynabService.setServerKnowledge).toHaveBeenCalledWith(200);
    });
  });
});
