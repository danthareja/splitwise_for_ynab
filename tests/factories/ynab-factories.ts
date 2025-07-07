import type { YNABTransaction } from "@/types/ynab";

// Mock data generators for YNAB (for HTTP responses)
export function createMockYNABTransaction(overrides = {}) {
  return {
    id: `ynab-txn-${Math.random().toString(36).substring(7)}`,
    date: "2024-01-15",
    amount: -25500, // YNAB uses milliunits
    memo: "Test transaction",
    cleared: "uncleared",
    approved: false,
    flag_color: "blue",
    account_id: "test-account-123",
    payee_name: "Test Payee",
    category_id: "test-category-123",
    transfer_account_id: null,
    transfer_transaction_id: null,
    matched_transaction_id: null,
    import_id: null,
    import_payee_name: null,
    import_payee_name_original: null,
    debt_transaction_type: null,
    deleted: false,
    account_name: "Test Account",
    category_name: "Test Category",
    payee: {
      id: "test-payee-123",
      name: "Test Payee",
      transfer_account_id: null,
      deleted: false,
    },
    subtransactions: [],
    ...overrides,
  };
}

// Mock API responses for YNAB
export const mockYnabTransactions: YNABTransaction[] = [
  {
    id: "ynab-txn-1",
    account_id: "test-account-456",
    account_name: "🤝 Splitwise",
    payee_name: "Test Payee",
    category_id: "category-123",
    category_name: "Groceries",
    memo: "Test transaction memo",
    amount: -25500, // -$25.50 in milliunits
    date: "2024-01-15",
    cleared: "cleared",
    approved: true,
    flag_color: "blue",
    flag_name: "Manual",
    transfer_account_id: null,
    transfer_transaction_id: null,
    matched_transaction_id: null,
    import_id: null,
    import_payee_name: null,
    import_payee_name_original: null,
    debt_transaction_type: null,
    deleted: false,
    subtransactions: [],
  },
];

export const mockYnabTransactionResponse = {
  data: {
    transaction: {
      id: "new-ynab-transaction-id",
      account_id: "test-account-456",
      payee_name: "Test Expense 1",
      amount: -12750, // -$12.75 in milliunits
      memo: "Test expense details",
      date: "2024-01-15",
      cleared: "uncleared",
      approved: false,
      flag_color: null,
      flag_name: null,
    },
  },
};
