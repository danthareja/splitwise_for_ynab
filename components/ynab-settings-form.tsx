"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveYNABSettings } from "@/app/actions/ynab";
import { useYNABForm } from "@/hooks/use-ynab-form";
import { YNABFormFields } from "@/components/ynab-form-fields";
import { YNABCreateAccountDialog } from "@/components/ynab-create-account-dialog";
import { AlertCircle, Loader2, Check } from "lucide-react";

interface YNABSettingsFormProps {
  initialBudgetId?: string | null;
  initialBudgetName?: string | null;
  initialSplitAccountId?: string | null;
  initialSplitAccountName?: string | null;
  initialManualFlagColor?: string | null;
  initialSyncedFlagColor?: string | null;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

export function YNABSettingsForm({
  initialBudgetId,
  initialBudgetName,
  initialSplitAccountId,
  initialSplitAccountName,
  initialManualFlagColor,
  initialSyncedFlagColor,
  onSaveSuccess,
  onCancel,
}: YNABSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useYNABForm({
    initialBudgetId,
    initialBudgetName,
    initialAccountId: initialSplitAccountId,
    initialAccountName: initialSplitAccountName,
    initialManualFlagColor,
    initialSyncedFlagColor,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    form.setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.set("budgetId", form.selectedBudgetId);
      formData.set("budgetName", form.selectedBudgetName);
      formData.set("splitwiseAccountId", form.selectedAccountId);
      formData.set("splitwiseAccountName", form.selectedAccountName);
      formData.set("manualFlagColor", form.manualFlagColor);
      formData.set("syncedFlagColor", form.syncedFlagColor);

      const result = await saveYNABSettings(formData);

      if (result.success) {
        setSuccessMessage("Settings saved!");
        setTimeout(() => {
          onSaveSuccess?.();
        }, 1000);
      } else {
        form.setError(result.error || "Failed to save settings");
      }
    } catch (err) {
      form.setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (form.isLoading && form.budgets.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading budgets...
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <YNABFormFields
        budgets={form.budgets}
        accounts={form.accounts}
        isLoading={form.isLoading}
        selectedBudgetId={form.selectedBudgetId}
        selectedAccountId={form.selectedAccountId}
        manualFlagColor={form.manualFlagColor}
        syncedFlagColor={form.syncedFlagColor}
        showAdvanced={showAdvanced}
        onShowAdvancedChange={setShowAdvanced}
        onBudgetChange={form.handleBudgetChange}
        onAccountChange={form.handleAccountChange}
        onManualFlagColorChange={form.setManualFlagColor}
        onSyncedFlagColorChange={form.handleSyncedFlagColorChange}
      />

      {form.error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{form.error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" className="mt-4">
          <Check className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => onCancel?.() || onSaveSuccess?.()}
          disabled={isSaving}
          className="rounded-full"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSaving || !form.isValid}
          className="rounded-full bg-gray-900 hover:bg-gray-800 text-white"
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
      </div>

      <YNABCreateAccountDialog
        open={form.showCreateAccountDialog}
        onOpenChange={form.setShowCreateAccountDialog}
        onCreateAccount={form.handleCreateAccount}
        isCreating={form.isCreatingAccount}
      />
    </form>
  );
}
