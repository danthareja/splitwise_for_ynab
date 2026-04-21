import { describe, it, expect, beforeEach } from "vitest";
import { SplitwiseService, FIRST_KNOWN_DATE } from "@/services/splitwise";
import { MockSyncState } from "../helpers/service-mocks";
import { server } from "../setup";
import { http, HttpResponse } from "msw";
import type { SplitwiseExpense } from "@/types/splitwise";

const SPLITWISE_BASE_URL = "https://secure.splitwise.com/api/v3.0";

describe("SplitwiseService", () => {
  let splitwiseService: SplitwiseService;
  let mockSyncState: MockSyncState;
  const userId = "test-user-id";
  const splitwiseUserId = 111;
  const groupId = "test-group-123";

  beforeEach(() => {
    mockSyncState = new MockSyncState();
    splitwiseService = new SplitwiseService({
      userId,
      knownEmoji: "✅",
      splitwiseUserId,
      groupId,
      currencyCode: "USD",
      apiKey: "test-api-key",
      syncState: mockSyncState,
      defaultSplitRatio: "1:1",
      useDescriptionAsPayee: true,
      customPayeeName: "Splitwise for YNAB",
    });
  });

  describe("toYNABTransaction", () => {
    it("should convert Splitwise expense to YNAB transaction (outflow)", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "Test Expense",
        details: "Test details",
        cost: "25.50",
        date: "2024-01-15T10:30:00Z",
        currency_code: "USD",
        repayments: [
          {
            from: splitwiseUserId,
            to: 222,
            amount: "12.75",
          },
        ],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABTransaction(expense);

      expect(result.amount).toBe(-12750); // Outflow in milliunits
      expect(result.payee_name).toBe("Test Expense");
      expect(result.memo).toBe("Test details");
      expect(result.date).toBe("2024-01-15");
    });

    it("should convert Splitwise expense to YNAB transaction (inflow)", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "Reimbursement",
        details: "Got paid back",
        cost: "25.50",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [
          {
            from: 222,
            to: splitwiseUserId, // User is receiving
            amount: "12.75",
          },
        ],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABTransaction(expense);

      expect(result.amount).toBe(12750); // Inflow in milliunits
    });

    it("should strip emojis from description", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "✅ Already Processed",
        cost: "10.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [
          {
            from: splitwiseUserId,
            to: 222,
            amount: "5.00",
          },
        ],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABTransaction(expense);

      expect(result.payee_name).toBe(" Already Processed");
    });

    it("should strip timestamp from date", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "Test",
        cost: "10.00",
        date: "2024-01-15T14:30:00.000Z",
        currency_code: "USD",
        repayments: [
          {
            from: splitwiseUserId,
            to: 222,
            amount: "5.00",
          },
        ],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABTransaction(expense);

      expect(result.date).toBe("2024-01-15");
    });

    it("should handle expense with no repayments", () => {
      const expense = {
        id: 1,
        description: "Zero cost",
        cost: "0.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [],
      } as unknown as SplitwiseExpense;

      const result = splitwiseService.toYNABTransaction(expense);

      expect(result.amount).toBe(0);
    });

    it("should use custom payee when useDescriptionAsPayee is false", () => {
      const customService = new SplitwiseService({
        userId,
        knownEmoji: "✅",
        splitwiseUserId,
        groupId,
        currencyCode: "USD",
        apiKey: "test-api-key",
        syncState: mockSyncState,
        useDescriptionAsPayee: false,
        customPayeeName: "My Custom Payee",
      });

      const expense: SplitwiseExpense = {
        id: 1,
        description: "Groceries",
        details: "Whole Foods",
        cost: "50.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [
          {
            from: splitwiseUserId,
            to: 222,
            amount: "25.00",
          },
        ],
      } as SplitwiseExpense;

      const result = customService.toYNABTransaction(expense);

      expect(result.payee_name).toBe("My Custom Payee");
      expect(result.memo).toBe("Groceries: Whole Foods");
    });

    it("should handle invalid YNAB payee names", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "Transfer : Checking",
        details: "Test",
        cost: "100.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [
          {
            from: splitwiseUserId,
            to: 222,
            amount: "50.00",
          },
        ],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABTransaction(expense);

      expect(result.payee_name).toBe("Splitwise for YNAB");
      expect(result.memo).toBe("Transfer : Checking: Test");
    });

    it("should include import_id for YNAB deduplication", () => {
      const expense: SplitwiseExpense = {
        id: 42,
        description: "Groceries",
        cost: "50.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "25.00" }],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABTransaction(expense);

      expect(result.import_id).toBeDefined();
      expect(result.import_id).toMatch(/^sw:42:[a-f0-9]{8}$/);
    });

    it("should produce same import_id for identical expense (deduplication)", () => {
      const expense: SplitwiseExpense = {
        id: 42,
        description: "Groceries",
        cost: "50.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "25.00" }],
      } as SplitwiseExpense;

      const result1 = splitwiseService.toYNABTransaction(expense);
      const result2 = splitwiseService.toYNABTransaction(expense);

      expect(result1.import_id).toBe(result2.import_id);
    });

    it("should produce different import_id when description changes", () => {
      const expense1: SplitwiseExpense = {
        id: 42,
        description: "Groceries",
        cost: "50.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "25.00" }],
      } as SplitwiseExpense;

      const expense2: SplitwiseExpense = {
        ...expense1,
        description: "Updated Groceries",
      };

      const result1 = splitwiseService.toYNABTransaction(expense1);
      const result2 = splitwiseService.toYNABTransaction(expense2);

      expect(result1.import_id).not.toBe(result2.import_id);
    });

    it("should produce different import_id when amount changes", () => {
      const expense1: SplitwiseExpense = {
        id: 42,
        description: "Groceries",
        cost: "50.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "25.00" }],
      } as SplitwiseExpense;

      const expense2: SplitwiseExpense = {
        ...expense1,
        repayments: [{ from: splitwiseUserId, to: 222, amount: "30.00" }],
      };

      const result1 = splitwiseService.toYNABTransaction(expense1);
      const result2 = splitwiseService.toYNABTransaction(expense2);

      expect(result1.import_id).not.toBe(result2.import_id);
    });

    it("should include import_id for custom payee transactions", () => {
      const customService = new SplitwiseService({
        userId,
        knownEmoji: "✅",
        splitwiseUserId,
        groupId,
        currencyCode: "USD",
        apiKey: "test-api-key",
        syncState: mockSyncState,
        useDescriptionAsPayee: false,
        customPayeeName: "My Custom Payee",
      });

      const expense: SplitwiseExpense = {
        id: 99,
        description: "Groceries",
        cost: "50.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "25.00" }],
      } as SplitwiseExpense;

      const result = customService.toYNABTransaction(expense);
      expect(result.import_id).toMatch(/^sw:99:[a-f0-9]{8}$/);
    });

    it("should include import_id for invalid payee transactions", () => {
      const expense: SplitwiseExpense = {
        id: 77,
        description: "Transfer : Checking",
        details: "Test",
        cost: "100.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "50.00" }],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABTransaction(expense);
      expect(result.import_id).toMatch(/^sw:77:[a-f0-9]{8}$/);
    });

    it("should produce same import_id before and after the known emoji is prepended", () => {
      // Regression: generateImportId used to hash the raw description, so
      // once markExpenseProcessed prepended "✅" the import_id changed and
      // YNAB would accept a duplicate transaction on re-processing.
      const base: SplitwiseExpense = {
        id: 42,
        description: "Slicer billtong",
        cost: "187.55",
        date: "2026-04-13",
        currency_code: "EUR",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "93.77" }],
      } as SplitwiseExpense;

      const withoutEmoji = splitwiseService.toYNABTransaction(base);
      const withEmoji = splitwiseService.toYNABTransaction({
        ...base,
        description: "✅Slicer billtong",
      });

      expect(withEmoji.import_id).toBe(withoutEmoji.import_id);
    });

    it("should produce same import_id regardless of other emojis in the description", () => {
      const base: SplitwiseExpense = {
        id: 42,
        description: "🎂 Birthday cake",
        cost: "50.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "25.00" }],
      } as SplitwiseExpense;

      const plain = splitwiseService.toYNABTransaction(base);
      const marked = splitwiseService.toYNABTransaction({
        ...base,
        description: "✅🎂 Birthday cake",
      });

      expect(marked.import_id).toBe(plain.import_id);
    });

    it("should produce same import_id ignoring leading/trailing whitespace", () => {
      const base: SplitwiseExpense = {
        id: 42,
        description: "Groceries",
        cost: "50.00",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [{ from: splitwiseUserId, to: 222, amount: "25.00" }],
      } as SplitwiseExpense;

      const tight = splitwiseService.toYNABTransaction(base);
      const loose = splitwiseService.toYNABTransaction({
        ...base,
        description: "  Groceries  ",
      });

      expect(loose.import_id).toBe(tight.import_id);
    });
  });

  describe("toYNABAmount", () => {
    it("should convert outflow to negative milliunits", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "Test",
        cost: "25.50",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [
          {
            from: splitwiseUserId,
            to: 222,
            amount: "12.75",
          },
        ],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABAmount(expense);
      expect(result).toBe(-12750);
    });

    it("should convert inflow to positive milliunits", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "Test",
        cost: "25.50",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [
          {
            from: 222,
            to: splitwiseUserId,
            amount: "12.75",
          },
        ],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABAmount(expense);
      expect(result).toBe(12750);
    });

    it("should handle floating point precision", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "Test",
        cost: "10.33",
        date: "2024-01-15",
        currency_code: "USD",
        repayments: [
          {
            from: splitwiseUserId,
            to: 222,
            amount: "5.17",
          },
        ],
      } as SplitwiseExpense;

      const result = splitwiseService.toYNABAmount(expense);
      expect(result).toBe(-5170);
    });
  });

  describe("isExpenseUnprocessed", () => {
    it("should return true for unprocessed expense", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "New Expense",
        deleted_at: null,
      } as SplitwiseExpense;

      expect(splitwiseService.isExpenseUnprocessed(expense)).toBe(true);
    });

    it("should return false for expense with known emoji", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "✅ Already Processed",
        deleted_at: null,
      } as SplitwiseExpense;

      expect(splitwiseService.isExpenseUnprocessed(expense)).toBe(false);
    });

    it("should return false for deleted expense", () => {
      const expense: SplitwiseExpense = {
        id: 1,
        description: "Deleted Expense",
        deleted_at: "2024-01-15T10:00:00Z",
      } as SplitwiseExpense;

      expect(splitwiseService.isExpenseUnprocessed(expense)).toBe(false);
    });

    it("should return true for recurring expense instance that inherited emoji but was created after last sync", () => {
      // This handles the case where a recurring expense template was processed,
      // and Splitwise created a new instance that inherited the emoji'd description
      const expense: SplitwiseExpense = {
        id: 2,
        description: "✅ Monthly Rent", // Has emoji from parent
        deleted_at: null,
        created_at: "2024-02-01T10:00:00Z", // Created in February
      } as SplitwiseExpense;

      const lastSyncDate = "2024-01-15T10:00:00Z"; // Last synced in January

      // Should be processed because it was created AFTER the last sync date
      expect(splitwiseService.isExpenseUnprocessed(expense, lastSyncDate)).toBe(
        true,
      );
    });

    it("should return false for expense with emoji that was created before last sync", () => {
      // This is a genuinely already-processed expense
      const expense: SplitwiseExpense = {
        id: 1,
        description: "✅ Old Processed Expense",
        deleted_at: null,
        created_at: "2024-01-10T10:00:00Z", // Created before last sync
      } as SplitwiseExpense;

      const lastSyncDate = "2024-01-15T10:00:00Z"; // Last synced after creation

      // Should NOT be processed because it was created BEFORE the last sync
      expect(splitwiseService.isExpenseUnprocessed(expense, lastSyncDate)).toBe(
        false,
      );
    });

    it("should handle recurring expense at exact sync boundary", () => {
      // Edge case: expense created at exactly the same time as last sync
      const expense: SplitwiseExpense = {
        id: 3,
        description: "✅ Boundary Expense",
        deleted_at: null,
        created_at: "2024-01-15T10:00:00Z",
      } as SplitwiseExpense;

      const lastSyncDate = "2024-01-15T10:00:00Z";

      // Should NOT be processed because created_at is not greater than lastSyncDate
      expect(splitwiseService.isExpenseUnprocessed(expense, lastSyncDate)).toBe(
        false,
      );
    });
  });

  describe("createExpense", () => {
    it("should create expense with equal split (1:1)", async () => {
      server.use(
        http.post(
          `${SPLITWISE_BASE_URL}/create_expense`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toMatchObject({
              currency_code: "USD",
              group_id: groupId,
              split_equally: true,
              cost: "25.50",
              description: "Test Expense",
            });
            return HttpResponse.json({
              expenses: [{ id: 1, cost: "25.50" }],
            });
          },
        ),
      );

      await splitwiseService.createExpense({
        cost: "25.50",
        description: "Test Expense",
        date: "2024-01-15",
      });
    });

    it("should create expense with custom split (2:1)", async () => {
      // Mock getting group members first
      server.use(
        http.get(`${SPLITWISE_BASE_URL}/get_group/${groupId}`, () => {
          return HttpResponse.json({
            group: {
              id: groupId,
              members: [
                { id: splitwiseUserId, first_name: "User", last_name: "One" },
                { id: 222, first_name: "User", last_name: "Two" },
              ],
            },
          });
        }),
        http.post(
          `${SPLITWISE_BASE_URL}/create_expense`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toMatchObject({
              currency_code: "USD",
              group_id: groupId,
              split_equally: false,
              cost: "30.00",
              users__0__user_id: splitwiseUserId,
              users__0__paid_share: "30.00",
              users__0__owed_share: "20.00", // 2/3 of 30
              users__1__user_id: 222,
              users__1__paid_share: "0",
              users__1__owed_share: "10.00", // 1/3 of 30
            });
            return HttpResponse.json({
              expenses: [{ id: 1, cost: "30.00" }],
            });
          },
        ),
      );

      await splitwiseService.createExpense(
        {
          cost: "30.00",
          description: "Custom Split",
          date: "2024-01-15",
        },
        "2:1",
      );
    });

    it("should flip payer for inflows with equal split (1:1)", async () => {
      server.use(
        http.get(`${SPLITWISE_BASE_URL}/get_group/${groupId}`, () => {
          return HttpResponse.json({
            group: {
              id: groupId,
              members: [
                { id: splitwiseUserId, first_name: "User", last_name: "One" },
                { id: 222, first_name: "User", last_name: "Two" },
              ],
            },
          });
        }),
        http.post(
          `${SPLITWISE_BASE_URL}/create_expense`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toMatchObject({
              currency_code: "USD",
              group_id: groupId,
              split_equally: false, // Inflows always use custom split
              cost: "25.00",
              users__0__user_id: splitwiseUserId,
              users__0__paid_share: "0", // User did NOT pay (it's an inflow)
              users__0__owed_share: "12.50",
              users__1__user_id: 222,
              users__1__paid_share: "25.00", // Partner "paid"
              users__1__owed_share: "12.50",
            });
            // isInflow should be stripped from the payload
            expect(body).not.toHaveProperty("isInflow");
            return HttpResponse.json({
              expenses: [{ id: 1, cost: "25.00" }],
            });
          },
        ),
      );

      await splitwiseService.createExpense({
        cost: "25.00",
        description: "Venmo - Friend",
        date: "2024-01-15",
        isInflow: true,
      });
    });

    it("should flip payer and invert ratio for inflows with custom split (2:1)", async () => {
      server.use(
        http.get(`${SPLITWISE_BASE_URL}/get_group/${groupId}`, () => {
          return HttpResponse.json({
            group: {
              id: groupId,
              members: [
                { id: splitwiseUserId, first_name: "User", last_name: "One" },
                { id: 222, first_name: "User", last_name: "Two" },
              ],
            },
          });
        }),
        http.post(
          `${SPLITWISE_BASE_URL}/create_expense`,
          async ({ request }) => {
            const body = await request.json();
            // With 2:1 ratio inverted for inflow: user owes 1/3, partner owes 2/3
            expect(body).toMatchObject({
              split_equally: false,
              cost: "30.00",
              users__0__user_id: splitwiseUserId,
              users__0__paid_share: "0",
              users__0__owed_share: "10.00", // 1/3 of 30 (inverted from 2/3)
              users__1__user_id: 222,
              users__1__paid_share: "30.00",
              users__1__owed_share: "20.00", // 2/3 of 30 (inverted from 1/3)
            });
            return HttpResponse.json({
              expenses: [{ id: 1, cost: "30.00" }],
            });
          },
        ),
      );

      await splitwiseService.createExpense(
        {
          cost: "30.00",
          description: "Venmo - Friend",
          date: "2024-01-15",
          isInflow: true,
        },
        "2:1",
      );
    });
  });

  describe("getUnprocessedExpenses", () => {
    it("should fetch and filter unprocessed expenses", async () => {
      const mockExpenses: SplitwiseExpense[] = [
        {
          id: 1,
          description: "New Expense",
          deleted_at: null,
        } as SplitwiseExpense,
        {
          id: 2,
          description: "✅ Already Processed",
          deleted_at: null,
        } as SplitwiseExpense,
      ];

      server.use(
        http.get(`${SPLITWISE_BASE_URL}/get_expenses`, () => {
          return HttpResponse.json({
            expenses: mockExpenses,
          });
        }),
      );

      const result = await splitwiseService.getUnprocessedExpenses();

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe(1);
    });

    it("should use FIRST_KNOWN_DATE by default", async () => {
      server.use(
        http.get(`${SPLITWISE_BASE_URL}/get_expenses`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get("updated_after")).toBe(FIRST_KNOWN_DATE);
          return HttpResponse.json({ expenses: [] });
        }),
      );

      await splitwiseService.getUnprocessedExpenses();
    });
  });

  describe("markExpenseProcessed", () => {
    it("should add known emoji to expense description", async () => {
      const expense: SplitwiseExpense = {
        id: 123,
        description: "Test Expense",
      } as SplitwiseExpense;

      server.use(
        http.post(
          `${SPLITWISE_BASE_URL}/update_expense/123`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({
              description: "✅Test Expense",
            });
            return HttpResponse.json({ expense: { id: 123 } });
          },
        ),
      );

      await splitwiseService.markExpenseProcessed(expense);
    });

    it("should strip stacked emojis before prepending (✅✅✅ → ✅)", async () => {
      const expense: SplitwiseExpense = {
        id: 456,
        description: "✅✅✅Google Play",
      } as SplitwiseExpense;

      server.use(
        http.post(
          `${SPLITWISE_BASE_URL}/update_expense/456`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({
              description: "✅Google Play",
            });
            return HttpResponse.json({ expense: { id: 456 } });
          },
        ),
      );

      await splitwiseService.markExpenseProcessed(expense);
    });

    it("should handle single existing emoji without duplication", async () => {
      const expense: SplitwiseExpense = {
        id: 789,
        description: "✅Already Processed",
      } as SplitwiseExpense;

      server.use(
        http.post(
          `${SPLITWISE_BASE_URL}/update_expense/789`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({
              description: "✅Already Processed",
            });
            return HttpResponse.json({ expense: { id: 789 } });
          },
        ),
      );

      await splitwiseService.markExpenseProcessed(expense);
    });

    it("should work with custom emoji", async () => {
      const customService = new SplitwiseService({
        userId,
        knownEmoji: "🔄",
        splitwiseUserId,
        groupId,
        currencyCode: "USD",
        apiKey: "test-api-key",
        syncState: mockSyncState,
      });

      const expense: SplitwiseExpense = {
        id: 101,
        description: "🔄🔄🔄Rent",
      } as SplitwiseExpense;

      server.use(
        http.post(
          `${SPLITWISE_BASE_URL}/update_expense/101`,
          async ({ request }) => {
            const body = await request.json();
            expect(body).toEqual({
              description: "🔄Rent",
            });
            return HttpResponse.json({ expense: { id: 101 } });
          },
        ),
      );

      await customService.markExpenseProcessed(expense);
    });
  });

  describe("hasInvalidPayee", () => {
    it("should detect YNAB internal payee names", () => {
      expect(
        splitwiseService.hasInvalidPayee({
          description: "Transfer : Checking",
        } as SplitwiseExpense),
      ).toBe(true);

      expect(
        splitwiseService.hasInvalidPayee({
          description: "Starting Balance",
        } as SplitwiseExpense),
      ).toBe(true);

      expect(
        splitwiseService.hasInvalidPayee({
          description: "Manual Balance Adjustment",
        } as SplitwiseExpense),
      ).toBe(true);

      expect(
        splitwiseService.hasInvalidPayee({
          description: "Reconciliation Balance Adjustment",
        } as SplitwiseExpense),
      ).toBe(true);
    });

    it("should return false for valid payee names", () => {
      expect(
        splitwiseService.hasInvalidPayee({
          description: "Grocery Store",
        } as SplitwiseExpense),
      ).toBe(false);
    });
  });

  describe("sync state integration", () => {
    it("should get and set last processed date", async () => {
      const testDate = new Date().toISOString(); // Use a recent date
      await splitwiseService.setLastProcessedDate(testDate);
      const date = await splitwiseService.getLastProcessedDate();
      expect(date).toBe(testDate);
    });

    it("should default to FIRST_KNOWN_DATE for stale dates", async () => {
      await mockSyncState.setSplitwiseLastProcessed(
        userId,
        "2020-01-01T00:00:00Z",
      );
      const date = await splitwiseService.getLastProcessedDate();
      expect(date).toBe(FIRST_KNOWN_DATE);
    });

    it("should default to FIRST_KNOWN_DATE when no date stored", async () => {
      const date = await splitwiseService.getLastProcessedDate();
      expect(date).toBe(FIRST_KNOWN_DATE);
    });
  });
});
