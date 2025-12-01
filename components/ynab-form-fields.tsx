"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { YNABFlag, FLAG_COLORS } from "@/components/ynab-flag";
import type { YNABBudget, YNABAccount } from "@/types/ynab";
import { Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface YNABFormFieldsProps {
  // Data
  budgets: YNABBudget[];
  accounts: YNABAccount[];
  isLoading: boolean;

  // Selected values
  selectedBudgetId: string;
  selectedAccountId: string;
  manualFlagColor: string;
  syncedFlagColor: string;

  // Advanced settings
  showAdvanced: boolean;
  onShowAdvancedChange: (show: boolean) => void;

  // Handlers
  onBudgetChange: (budgetId: string) => void;
  onAccountChange: (accountId: string) => void;
  onManualFlagColorChange: (color: string) => void;
  onSyncedFlagColorChange: (color: string) => void;
}

export function YNABFormFields({
  budgets,
  accounts,
  isLoading,
  selectedBudgetId,
  selectedAccountId,
  manualFlagColor,
  syncedFlagColor,
  showAdvanced,
  onShowAdvancedChange,
  onBudgetChange,
  onAccountChange,
  onManualFlagColorChange,
  onSyncedFlagColorChange,
}: YNABFormFieldsProps) {
  return (
    <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
      {/* Budget selector */}
      <div className="space-y-2">
        <Label htmlFor="budgetId">YNAB Plan</Label>
        <Select value={selectedBudgetId} onValueChange={onBudgetChange}>
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
        {budgets.length > 0 && !isLoading && selectedBudgetId && (
          <p className="text-sm text-gray-500">
            In this plan, flag a transaction with{" "}
            <YNABFlag colorId={manualFlagColor} size="sm" /> to sync it to
            Splitwise
          </p>
        )}
      </div>

      {/* Account selector */}
      {budgets.length > 0 && !isLoading && selectedBudgetId && (
        <div className="space-y-2">
          <Label htmlFor="splitwiseAccountId">
            Your &quot;phantom&quot; account
          </Label>
          <Select value={selectedAccountId} onValueChange={onAccountChange}>
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
      <Collapsible open={showAdvanced} onOpenChange={onShowAdvancedChange}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
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
            <Label>Your Flag</Label>
            <p className="text-sm text-gray-500 -mt-1">
              Flag transactions with this color to sync them to Splitwise
            </p>
            <Select
              value={manualFlagColor}
              onValueChange={onManualFlagColorChange}
            >
              <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <YNABFlag colorId={manualFlagColor} size="sm" />
                    <span>
                      {FLAG_COLORS.find((c) => c.id === manualFlagColor)?.name}
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
            <Label>Our Flag</Label>
            <p className="text-sm text-gray-500 -mt-1">
              After syncing, we&apos;ll change the flag to this color
            </p>
            <Select
              value={syncedFlagColor}
              onValueChange={onSyncedFlagColorChange}
            >
              <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <YNABFlag colorId={syncedFlagColor} size="sm" />
                    <span>
                      {FLAG_COLORS.find((c) => c.id === syncedFlagColor)?.name}
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
  );
}
