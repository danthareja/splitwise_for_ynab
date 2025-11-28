"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getYNABBudgetsForUser,
  getYNABAccountsForBudget,
  createYNABAccountForUser,
} from "@/app/actions/ynab";
import type { YNABBudget, YNABAccount } from "@/types/ynab";

interface UseYNABFormOptions {
  initialBudgetId?: string | null;
  initialBudgetName?: string | null;
  initialAccountId?: string | null;
  initialAccountName?: string | null;
  initialManualFlagColor?: string | null;
  initialSyncedFlagColor?: string | null;
}

export function useYNABForm({
  initialBudgetId,
  initialBudgetName,
  initialAccountId,
  initialAccountName,
  initialManualFlagColor,
  initialSyncedFlagColor,
}: UseYNABFormOptions = {}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [budgets, setBudgets] = useState<YNABBudget[]>([]);
  const [accounts, setAccounts] = useState<YNABAccount[]>([]);

  const [selectedBudgetId, setSelectedBudgetId] = useState(
    initialBudgetId || "",
  );
  const [selectedBudgetName, setSelectedBudgetName] = useState(
    initialBudgetName || "",
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialAccountId || "",
  );
  const [selectedAccountName, setSelectedAccountName] = useState(
    initialAccountName || "",
  );
  const [manualFlagColor, setManualFlagColor] = useState(
    initialManualFlagColor || "blue",
  );
  const [syncedFlagColor, setSyncedFlagColor] = useState(
    initialSyncedFlagColor || "green",
  );

  const [showCreateAccountDialog, setShowCreateAccountDialog] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  const loadBudgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getYNABBudgetsForUser();
      if (result.success) {
        setBudgets(result.budgets);
      } else {
        setError(result.error || "Failed to load budgets");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async (budgetId: string) => {
    setError(null);
    try {
      const result = await getYNABAccountsForBudget(budgetId);
      if (result.success) {
        setAccounts(result.accounts);
      } else {
        setError(result.error || "Failed to load accounts");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    }
  }, []);

  // Load budgets on mount
  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Load accounts when budget changes
  useEffect(() => {
    if (selectedBudgetId) {
      loadAccounts(selectedBudgetId);
    }
  }, [selectedBudgetId, loadAccounts]);

  function handleBudgetChange(budgetId: string) {
    const budget = budgets.find((b) => b.id === budgetId);
    setSelectedBudgetId(budgetId);
    setSelectedBudgetName(budget?.name || "");
    setSelectedAccountId("");
    setSelectedAccountName("");
  }

  function handleAccountChange(accountId: string) {
    if (accountId === "__create_new__") {
      setShowCreateAccountDialog(true);
    } else {
      const account = accounts.find((a) => a.id === accountId);
      setSelectedAccountId(accountId);
      setSelectedAccountName(account?.name || "");
    }
  }

  async function handleCreateAccount(accountName: string) {
    setIsCreatingAccount(true);
    setError(null);
    try {
      const result = await createYNABAccountForUser(
        selectedBudgetId,
        accountName,
      );
      if (result.success) {
        setAccounts((prev) => [...prev, result.account]);
        setSelectedAccountId(result.account.id);
        setSelectedAccountName(result.account.name);
        setShowCreateAccountDialog(false);
        return { success: true as const, account: result.account };
      } else {
        setError(result.error || "Failed to create account");
        return { success: false as const, error: result.error };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      return { success: false as const, error: errorMessage };
    } finally {
      setIsCreatingAccount(false);
    }
  }

  function handleSyncedFlagColorChange(color: string) {
    if (color !== manualFlagColor) {
      setSyncedFlagColor(color);
    }
  }

  const isValid = Boolean(selectedBudgetId && selectedAccountId);

  return {
    // State
    isLoading,
    error,
    setError,
    budgets,
    accounts,
    selectedBudgetId,
    selectedBudgetName,
    selectedAccountId,
    selectedAccountName,
    manualFlagColor,
    syncedFlagColor,
    showCreateAccountDialog,
    setShowCreateAccountDialog,
    isCreatingAccount,
    isValid,

    // Actions
    handleBudgetChange,
    handleAccountChange,
    handleCreateAccount,
    setManualFlagColor,
    setSyncedFlagColor,
    handleSyncedFlagColorChange,
  };
}
