"use client";

import { useState } from "react";
import { StepContainer, useOnboardingStep } from "./wizard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveYNABSettings } from "@/app/actions/ynab";
import { useYNABForm } from "@/hooks/use-ynab-form";
import { YNABFormFields } from "@/components/ynab-form-fields";
import { YNABCreateAccountDialog } from "@/components/ynab-create-account-dialog";
import { ArrowRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

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
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useYNABForm({
    initialBudgetId: initialSettings?.budgetId,
    initialBudgetName: initialSettings?.budgetName,
    initialAccountId: initialSettings?.splitwiseAccountId,
    initialAccountName: initialSettings?.splitwiseAccountName,
    initialManualFlagColor: initialSettings?.manualFlagColor,
    initialSyncedFlagColor: initialSettings?.syncedFlagColor,
  });

  async function handleContinue() {
    if (!form.isValid) return;

    setIsSaving(true);
    form.setError(null);

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
        await nextStep();
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
      {/* Add padding at bottom on mobile to account for sticky footer */}
      <div className="pb-28 sm:pb-0">
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

        {/* Desktop buttons */}
        <div className="mt-8 hidden sm:flex justify-between">
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
            disabled={!form.isValid || isNavigating || isSaving}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6"
          >
            {isSaving ? "Saving..." : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 p-4 z-50 shadow-lg">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={isNavigating || isSaving}
            size="lg"
            className="px-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!form.isValid || isNavigating || isSaving}
            size="lg"
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
          >
            {isSaving ? "Saving..." : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <YNABCreateAccountDialog
        open={form.showCreateAccountDialog}
        onOpenChange={form.setShowCreateAccountDialog}
        onCreateAccount={form.handleCreateAccount}
        isCreating={form.isCreatingAccount}
      />
    </StepContainer>
  );
}
