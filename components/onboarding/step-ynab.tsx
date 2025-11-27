"use client";

import { useState, useEffect } from "react";
import { StepContainer, useOnboardingStep } from "./wizard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getYNABBudgetsForUser,
  getYNABAccountsForBudget,
  createYNABAccountForUser,
  saveYNABSettings,
} from "@/app/actions/ynab";
import { YNABFlag, FLAG_COLORS } from "@/components/ynab-flag";
import type { YNABBudget, YNABAccount } from "@/types/ynab";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Plus,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepYnabProps {
  initialSettings?: {
    budgetId?: string;
    budgetName?: string;
    splitwiseAccountId?: string | null;
    splitwiseAccountName?: string | null;
    manualFlagColor?: string;
    syncedFlagColor?: string;
  } | null;
}

export function StepYnab({ initialSettings }: StepYnabProps) {
  const { nextStep, previousStep, isNavigating } = useOnboardingStep();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [budgets, setBudgets] = useState<YNABBudget[]>([]);
  const [accounts, setAccounts] = useState<YNABAccount[]>([]);

  const [selectedBudgetId, setSelectedBudgetId] = useState(
    initialSettings?.budgetId || "",
  );
  const [selectedBudgetName, setSelectedBudgetName] = useState(
    initialSettings?.budgetName || "",
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialSettings?.splitwiseAccountId || "",
  );
  const [selectedAccountName, setSelectedAccountName] = useState(
    initialSettings?.splitwiseAccountName || "",
  );
  const [manualFlagColor, setManualFlagColor] = useState(
    initialSettings?.manualFlagColor || "blue",
  );
  const [syncedFlagColor, setSyncedFlagColor] = useState(
    initialSettings?.syncedFlagColor || "green",
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCreateAccountDialog, setShowCreateAccountDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState("🤝 Splitwise");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Load budgets on mount
  useEffect(() => {
    loadBudgets();
  }, []);

  // Load accounts when budget changes
  useEffect(() => {
    if (selectedBudgetId) {
      loadAccounts(selectedBudgetId);
    }
  }, [selectedBudgetId]);

  async function loadBudgets() {
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
  }

  async function loadAccounts(budgetId: string) {
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
  }

  function handleBudgetChange(budgetId: string) {
    const budget = budgets.find((b) => b.id === budgetId);
    setSelectedBudgetId(budgetId);
    setSelectedBudgetName(budget?.name || "");
    setSelectedAccountId("");
    setSelectedAccountName("");
  }

  function handleAccountChange(accountId: string) {
    const account = accounts.find((a) => a.id === accountId);
    setSelectedAccountId(accountId);
    setSelectedAccountName(account?.name || "");
  }

  async function handleCreateAccount() {
    setIsCreatingAccount(true);
    setError(null);
    try {
      const result = await createYNABAccountForUser(
        selectedBudgetId,
        newAccountName,
      );
      if (result.success) {
        setAccounts((prev) => [...prev, result.account]);
        setSelectedAccountId(result.account.id);
        setSelectedAccountName(result.account.name);
        setShowCreateAccountDialog(false);
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

  async function handleContinue() {
    if (!selectedBudgetId || !selectedAccountId) return;

    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("budgetId", selectedBudgetId);
      formData.set("budgetName", selectedBudgetName);
      formData.set("splitwiseAccountId", selectedAccountId);
      formData.set("splitwiseAccountName", selectedAccountName);
      formData.set("manualFlagColor", manualFlagColor);
      formData.set("syncedFlagColor", syncedFlagColor);

      const result = await saveYNABSettings(formData);

      if (result.success) {
        await nextStep();
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

  if (isLoading) {
    return (
      <StepContainer
        title="Configure YNAB"
        description='Select your plan and "phantom" account'
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Loading budgets...
          </span>
        </div>
      </StepContainer>
    );
  }

  return (
    <StepContainer
      title="Configure YNAB"
      description='Select your plan and "phantom" account'
    >
      {/* Form card */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
        {/* Budget selector */}
        <div className="space-y-2">
          <Label htmlFor="budgetId">YNAB Plan</Label>
          <Select value={selectedBudgetId} onValueChange={handleBudgetChange}>
            <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
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
          {budgets.length === 0 && !isLoading && (
            <p className="text-sm text-gray-500">
              No plans found. Please create a plan in YNAB first.
            </p>
          )}
          {!isLoading && (
            <p className="text-sm text-gray-500">
              In this plan, flag a transaction with{" "}
              <YNABFlag colorId={manualFlagColor} size="sm" /> to sync it to
              Splitwise
            </p>
          )}
        </div>

        {/* Account selector */}
        {selectedBudgetId && (
          <div className="space-y-2">
            <Label htmlFor="splitwiseAccountId">
              Your &quot;phantom&quot; account
            </Label>
            <Select
              value={selectedAccountId}
              onValueChange={(value) => {
                if (value === "__create_new__") {
                  setShowCreateAccountDialog(true);
                } else {
                  handleAccountChange(value);
                }
              }}
            >
              <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
                <SelectItem
                  value="__create_new__"
                  className="text-amber-600 dark:text-amber-500"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5" />
                    Create new account
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              <strong>Our secret sauce:</strong> This isn&apos;t tracking a real
              bank account—it&apos;s an IOU ledger that reconciles with your
              Splitwise app balance.
            </p>
          </div>
        )}

        {/* Advanced settings (collapsed) */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 p-0 h-auto hover:bg-transparent"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  showAdvanced && "rotate-180",
                )}
              />
              Advanced settings
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Manual flag color */}
            <div className="space-y-2">
              <Label>Manual Flag Color</Label>
              <p className="text-sm text-gray-500 -mt-1">
                Flag transactions with this color to sync them to Splitwise
              </p>
              <Select
                value={manualFlagColor}
                onValueChange={setManualFlagColor}
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <YNABFlag colorId={manualFlagColor} size="sm" />
                      <span>
                        {
                          FLAG_COLORS.find((c) => c.id === manualFlagColor)
                            ?.name
                        }
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FLAG_COLORS.map((flag) => (
                    <SelectItem key={flag.id} value={flag.id}>
                      <div className="flex items-center gap-2">
                        <YNABFlag colorId={flag.id} size="sm" />
                        <span>{flag.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Synced flag color */}
            <div className="space-y-2">
              <Label>Synced Flag Color</Label>
              <p className="text-sm text-gray-500 -mt-1">
                After syncing, we&apos;ll change the flag to this color
              </p>
              <Select
                value={syncedFlagColor}
                onValueChange={(v) => {
                  if (v !== manualFlagColor) setSyncedFlagColor(v);
                }}
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <YNABFlag colorId={syncedFlagColor} size="sm" />
                      <span>
                        {
                          FLAG_COLORS.find((c) => c.id === syncedFlagColor)
                            ?.name
                        }
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
                    >
                      <div className="flex items-center gap-2">
                        <YNABFlag colorId={flag.id} size="sm" />
                        <span>{flag.name}</span>
                        {flag.id === manualFlagColor && (
                          <span className="text-xs text-gray-400">
                            (manual flag)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={isNavigating || isSaving}
          className="rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={
            !selectedBudgetId || !selectedAccountId || isNavigating || isSaving
          }
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6"
        >
          {isSaving ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Create Account Dialog */}
      <Dialog
        open={showCreateAccountDialog}
        onOpenChange={setShowCreateAccountDialog}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#141414]">
          <DialogHeader>
            <DialogTitle className="font-serif">
              Create Splitwise Account
            </DialogTitle>
            <DialogDescription>
              Create a new account in your YNAB plan to track your Splitwise
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
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateAccountDialog(false)}
              disabled={isCreatingAccount}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={isCreatingAccount || !newAccountName.trim()}
              className="rounded-full bg-gray-900 hover:bg-gray-800 text-white"
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
    </StepContainer>
  );
}
