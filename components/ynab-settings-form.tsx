"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getYnabBudgetsForUser,
  getYnabAccountsForBudget,
  createYnabAccountForUser,
  saveYnabSettings,
} from "@/app/actions/ynab";
import { FLAG_COLORS } from "@/services/ynab-api";
import { type YNABBudget, type YNABAccount } from "@/services/ynab-types";
import { AlertCircle, Loader2, Plus, Check } from "lucide-react";

interface YNABSettingsFormProps {
  initialBudgetId?: string | null;
  initialBudgetName?: string | null;
  initialSplitAccountId?: string | null;
  initialSplitAccountName?: string | null;
  initialManualFlagColor?: string | null;
  initialSyncedFlagColor?: string | null;
  onSaveSuccess?: () => void;
}

export function YNABSettingsForm({
  initialBudgetId,
  initialBudgetName,
  initialSplitAccountId,
  initialSplitAccountName,
  initialManualFlagColor,
  initialSyncedFlagColor,
  onSaveSuccess,
}: YNABSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [budgets, setBudgets] = useState<YNABBudget[]>([]);
  const [accounts, setAccounts] = useState<YNABAccount[]>([]);

  const [selectedBudgetId, setSelectedBudgetId] = useState(
    initialBudgetId || "",
  );
  const [selectedBudgetName, setSelectedBudgetName] = useState(
    initialBudgetName || "",
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialSplitAccountId || "",
  );
  const [selectedAccountName, setSelectedAccountName] = useState(
    initialSplitAccountName || "",
  );
  const [manualFlagColor, setManualFlagColor] = useState(
    initialManualFlagColor || "blue",
  );
  const [syncedFlagColor, setSyncedFlagColor] = useState(
    initialSyncedFlagColor || "green",
  );

  const [showCreateAccountDialog, setShowCreateAccountDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState("🤝 Splitwise");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isFlagColorConflict, setIsFlagColorConflict] = useState(false);

  useEffect(() => {
    loadBudgets();
  }, []);

  useEffect(() => {
    if (selectedBudgetId) {
      loadAccounts(selectedBudgetId);
    }
  }, [selectedBudgetId]);

  // Check for flag color conflicts
  useEffect(() => {
    setIsFlagColorConflict(manualFlagColor === syncedFlagColor);
  }, [manualFlagColor, syncedFlagColor]);

  async function loadBudgets() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getYnabBudgetsForUser();

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
  }

  async function loadAccounts(budgetId: string) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getYnabAccountsForBudget(budgetId);

      if (result.success) {
        setAccounts(result.accounts);
      } else {
        setError(result.error || "Failed to load accounts");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateAccount() {
    setIsCreatingAccount(true);
    setError(null);

    try {
      const result = await createYnabAccountForUser(
        selectedBudgetId,
        newAccountName,
      );

      if (result.success) {
        // Add the new account to the accounts list
        setAccounts((prevAccounts) => [...prevAccounts, result.account]);

        // Select the new account
        setSelectedAccountId(result.account.id);
        setSelectedAccountName(result.account.name);

        // Close the dialog
        setShowCreateAccountDialog(false);

        // Show success message
        setSuccessMessage(`Created new account: ${result.account.name}`);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError(result.error || "Failed to create account");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsCreatingAccount(false);
    }
  }

  function handleBudgetChange(budgetId: string) {
    const budget = budgets.find((b) => b.id === budgetId);
    setSelectedBudgetId(budgetId);
    setSelectedBudgetName(budget?.name || "");

    // Reset account selection when budget changes
    setSelectedAccountId("");
    setSelectedAccountName("");
  }

  function handleAccountChange(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    setSelectedAccountId(accountId);
    setSelectedAccountName(account?.name || "");
  }

  function handleManualFlagColorChange(color: string) {
    setManualFlagColor(color);
    // If synced flag is the same, change it to a different color
    if (color === syncedFlagColor) {
      // Find a different color
      const availableColors = FLAG_COLORS.filter((c) => c.id !== color);
      if (availableColors.length > 0 && availableColors[0]) {
        setSyncedFlagColor(availableColors[0].id);
      }
    }
  }

  function handleSyncedFlagColorChange(color: string) {
    setSyncedFlagColor(color);
    // If manual flag is the same, change it to a different color
    if (color === manualFlagColor) {
      // Find a different color
      const availableColors = FLAG_COLORS.filter((c) => c.id !== color);
      if (availableColors.length > 0 && availableColors[0]) {
        setManualFlagColor(availableColors[0].id);
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData(event.currentTarget);

      // Add budget name and account name to form data
      formData.set("budgetName", selectedBudgetName);
      formData.set("splitwiseAccountName", selectedAccountName);

      const result = await saveYnabSettings(formData);

      if (result.success) {
        setSuccessMessage("YNAB settings saved successfully!");

        // Wait a moment before closing the form
        setTimeout(() => {
          onSaveSuccess?.();
        }, 2000);
      } else {
        setError(result.error || "Failed to save settings");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && budgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>YNAB Settings</CardTitle>
          <CardDescription>
            Configure your YNAB budget and account preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading budgets...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>YNAB Settings</CardTitle>
        <CardDescription>
          Configure your YNAB budget and account preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="budgetId">YNAB Budget</Label>
            <Select
              name="budgetId"
              value={selectedBudgetId}
              onValueChange={handleBudgetChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a budget" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((budget) => (
                  <SelectItem key={budget.id} value={budget.id}>
                    {budget.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {budgets.length === 0 && (
              <p className="text-sm text-gray-500">
                No budgets found. Please create a budget in YNAB first.
              </p>
            )}
          </div>

          {selectedBudgetId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="splitwiseAccountId">Splitwise Account</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateAccountDialog(true)}
                  className="flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create New
                </Button>
              </div>
              <Select
                name="splitwiseAccountId"
                value={selectedAccountId}
                onValueChange={handleAccountChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a Splitwise account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Select an existing account or create a new one to track your
                Splitwise balance.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="manualFlagColor">Manual Flag Color</Label>
            <p className="text-sm text-gray-500 -mt-2">
              This is the color you&apos;ll use to flag transactions in YNAB
              that should be synced to Splitwise.
            </p>
            <Select
              name="manualFlagColor"
              value={manualFlagColor}
              onValueChange={handleManualFlagColorChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a color">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        backgroundColor:
                          FLAG_COLORS.find((c) => c.id === manualFlagColor)
                            ?.color || "#cccccc",
                      }}
                    />
                    <span>
                      {FLAG_COLORS.find((c) => c.id === manualFlagColor)
                        ?.name || "Select a color"}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FLAG_COLORS.map((flag) => (
                  <SelectItem key={flag.id} value={flag.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: flag.color }}
                      />
                      <span>{flag.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label htmlFor="syncedFlagColor">Synced Flag Color</Label>
            <p className="text-sm text-gray-500 -mt-2">
              After a transaction is synced, we&apos;ll change its flag to this
              color to indicate it&apos;s been processed.
            </p>
            <Select
              name="syncedFlagColor"
              value={syncedFlagColor}
              onValueChange={handleSyncedFlagColorChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a color">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        backgroundColor:
                          FLAG_COLORS.find((c) => c.id === syncedFlagColor)
                            ?.color || "#cccccc",
                      }}
                    />
                    <span>
                      {FLAG_COLORS.find((c) => c.id === syncedFlagColor)
                        ?.name || "Select a color"}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FLAG_COLORS.map((flag) => (
                  <SelectItem
                    key={flag.id}
                    value={flag.id}
                    disabled={flag.id === manualFlagColor}
                    className={flag.id === manualFlagColor ? "opacity-50" : ""}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: flag.color }}
                      />
                      <span>{flag.name}</span>
                      {flag.id === manualFlagColor && (
                        <span className="text-xs">(Used for manual flag)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isFlagColorConflict && (
              <p className="text-sm text-red-500">
                Manual flag color and synced flag color must be different.
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success">
              <Check className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={
              isSaving ||
              !selectedBudgetId ||
              !selectedAccountId ||
              isFlagColorConflict
            }
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </form>

        {/* Create Account Dialog */}
        <Dialog
          open={showCreateAccountDialog}
          onOpenChange={setShowCreateAccountDialog}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Splitwise Account</DialogTitle>
              <DialogDescription>
                Create a new account in your YNAB budget to track your Splitwise
                balance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="🤝 Splitwise"
                />
                <p className="text-sm text-gray-500">
                  This account will be used to track your Splitwise balance in
                  YNAB.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateAccountDialog(false)}
                disabled={isCreatingAccount}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateAccount}
                disabled={isCreatingAccount || !newAccountName.trim()}
              >
                {isCreatingAccount ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
