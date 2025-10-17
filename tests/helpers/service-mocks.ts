import { vi } from "vitest";
import type { YNABService } from "@/services/ynab";
import type { SplitwiseService } from "@/services/splitwise";
import type { SyncState } from "@/services/sync-state";

// Mock SyncState implementation for testing
export class MockSyncState implements SyncState {
  private ynabKnowledge: Record<string, number> = {};
  private splitwiseLastProcessed: Record<string, string> = {};

  async getYNABServerKnowledge(userId: string): Promise<number | undefined> {
    return this.ynabKnowledge[userId];
  }

  async setYNABServerKnowledge(userId: string, value: number): Promise<void> {
    this.ynabKnowledge[userId] = value;
  }

  async getSplitwiseLastProcessed(userId: string): Promise<string | undefined> {
    return this.splitwiseLastProcessed[userId];
  }

  async setSplitwiseLastProcessed(
    userId: string,
    value: string,
  ): Promise<void> {
    this.splitwiseLastProcessed[userId] = value;
  }

  reset() {
    this.ynabKnowledge = {};
    this.splitwiseLastProcessed = {};
  }
}

// Mock YNABService for testing glue logic
export function createMockYNABService(
  overrides?: Partial<YNABService>,
): YNABService {
  return {
    getUnprocessedTransactions: vi.fn(),
    markTransactionProcessed: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    getTransactions: vi.fn(),
    getServerKnowledge: vi.fn(),
    setServerKnowledge: vi.fn(),
    isTransactionUnprocessed: vi.fn(),
    toSplitwiseExpense: vi.fn(),
    outflowToSplitwiseCost: vi.fn(),
    ...overrides,
  } as unknown as YNABService;
}

// Mock SplitwiseService for testing glue logic
export function createMockSplitwiseService(
  overrides?: Partial<SplitwiseService>,
): SplitwiseService {
  return {
    createExpense: vi.fn(),
    getUnprocessedExpenses: vi.fn(),
    markExpenseProcessed: vi.fn(),
    isExpenseUnprocessed: vi.fn(),
    getLastProcessedDate: vi.fn(),
    setLastProcessedDate: vi.fn(),
    toYNABTransaction: vi.fn(),
    toYNABAmount: vi.fn(),
    hasInvalidPayee: vi.fn(),
    stripEmojis: vi.fn(),
    stripTimestamp: vi.fn(),
    costToYNABInflow: vi.fn(),
    costToYNABOutflow: vi.fn(),
    ...overrides,
  } as unknown as SplitwiseService;
}
