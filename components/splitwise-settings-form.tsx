"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveSplitwiseSettings } from "@/app/actions/splitwise";
import { useSplitwiseForm } from "@/hooks/use-splitwise-form";
import {
  SplitwiseFormFields,
  SplitwiseSecondaryFormFields,
  SplitwisePrimaryRoleCard,
} from "@/components/splitwise-form-fields";
import { AlertCircle, Loader2, Check } from "lucide-react";

interface SplitwiseSettingsFormProps {
  initialGroupId?: string | null;
  initialGroupName?: string | null;
  initialCurrencyCode?: string | null;
  initialEmoji?: string | null;
  initialSplitRatio?: string | null;
  initialUseDescriptionAsPayee?: boolean | null;
  initialCustomPayeeName?: string | null;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
  /** If true, user is secondary and can only edit their own settings (emoji, payee) */
  isSecondary?: boolean;
  /** If true, user is primary (has a partner) */
  isPrimary?: boolean;
  /** Name of partner (for display) */
  partnerName?: string | null;
  /** Partner's emoji (for conflict detection in secondary mode) */
  partnerEmoji?: string | null;
  /** YNAB budget currency for display/comparison */
  budgetCurrency?: string | null;
}

export function SplitwiseSettingsForm({
  initialGroupId,
  initialGroupName,
  initialCurrencyCode,
  initialEmoji = "✅",
  initialSplitRatio = "1:1",
  initialUseDescriptionAsPayee = true,
  initialCustomPayeeName,
  onSaveSuccess,
  onCancel,
  isSecondary = false,
  isPrimary = false,
  partnerName,
  partnerEmoji,
  budgetCurrency,
}: SplitwiseSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useSplitwiseForm({
    initialGroupId,
    initialGroupName,
    initialCurrencyCode,
    initialEmoji,
    initialSplitRatio,
    initialUseDescriptionAsPayee,
    initialCustomPayeeName,
    isSecondary,
    skipGroupLoad: isSecondary,
  });

  // Check emoji conflict with partner for secondary users
  const isEmojiConflictWithPartner =
    isSecondary && partnerEmoji === form.selectedEmoji;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    form.setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();

      if (isSecondary) {
        // Secondary users only submit their own settings
        formData.set("groupId", initialGroupId || "");
        formData.set("groupName", initialGroupName || "");
        formData.set("currencyCode", initialCurrencyCode || "USD");
        formData.set("splitRatio", initialSplitRatio || "1:1");
      } else {
        // Primary/solo users submit all settings
        formData.set("groupId", form.selectedGroupId);
        formData.set("groupName", form.selectedGroupName);
        formData.set("currencyCode", form.selectedCurrency);
        formData.set("splitRatio", form.finalSplitRatio || "1:1");
      }

      // Both submit emoji and payee settings
      formData.set("emoji", form.selectedEmoji);
      formData.set(
        "useDescriptionAsPayee",
        form.useDescriptionAsPayee.toString(),
      );
      formData.set("customPayeeName", form.customPayeeName);

      const result = await saveSplitwiseSettings(formData);

      if (result.success) {
        // Build success message
        const syncMessages = [];
        if (result.currencySynced && result.updatedPartners?.length > 0) {
          syncMessages.push("Currency synchronized");
        }
        if (result.splitRatioSynced && result.updatedPartners?.length > 0) {
          syncMessages.push("Split ratio synchronized");
        }

        let displayMessage = "Settings saved!";
        const hasPartnerSync = !!result.partnerSyncMessage;
        const hasRegularSync =
          syncMessages.length > 0 &&
          result.updatedPartners &&
          result.updatedPartners.length > 0;

        if (hasPartnerSync) {
          displayMessage = `Settings saved! ${result.partnerSyncMessage}.`;
        } else if (hasRegularSync) {
          displayMessage = `Settings saved! ${syncMessages.join(" and ")} with ${result.updatedPartners.join(", ")}.`;
        }

        if (hasPartnerSync || hasRegularSync) {
          setSuccessMessage(displayMessage);
          setTimeout(() => {
            setSuccessMessage(null);
            form.setError(null);
            onSaveSuccess?.();
          }, 2000);
        } else {
          setSuccessMessage("Settings saved!");
          setTimeout(() => {
            onSaveSuccess?.();
          }, 1000);
        }
      } else {
        form.setError(result.error || "Failed to save settings");

        if (result.isEmojiConflict && form.partnerInfo?.emoji) {
          form.suggestDifferentEmoji(form.partnerInfo.emoji);
        }
      }
    } catch (err) {
      form.setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state for non-secondary users
  if (form.isLoading && !isSecondary) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading groups...
        </span>
      </div>
    );
  }

  // Secondary user form
  if (isSecondary) {
    return (
      <form onSubmit={handleSubmit}>
        <SplitwiseSecondaryFormFields
          groupName={initialGroupName || ""}
          currencyCode={initialCurrencyCode || "USD"}
          splitRatio={initialSplitRatio || "1:1"}
          partnerName={partnerName || "your partner"}
          selectedEmoji={form.selectedEmoji}
          useDescriptionAsPayee={form.useDescriptionAsPayee}
          customPayeeName={form.customPayeeName}
          partnerEmoji={partnerEmoji}
          isEmojiConflict={isEmojiConflictWithPartner}
          onEmojiChange={form.handleEmojiChange}
          onPayeeModeChange={form.handlePayeeModeChange}
          onCustomPayeeNameChange={(name) => form.setCustomPayeeName(name)}
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
            disabled={
              isSaving || isEmojiConflictWithPartner || !form.selectedEmoji
            }
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
      </form>
    );
  }

  // Primary/Solo user form
  return (
    <form onSubmit={handleSubmit}>
      {/* Role explanation for primary users */}
      {isPrimary && (
        <SplitwisePrimaryRoleCard partnerName={partnerName ?? null} />
      )}

      {/* Duo account sync notification */}
      {form.partnerSynced && (
        <Alert className="mb-4" variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>
            Settings were recently updated by your partner.
          </AlertDescription>
        </Alert>
      )}

      <SplitwiseFormFields
        validGroups={form.validGroups}
        invalidGroups={form.invalidGroups}
        isLoading={form.isLoading}
        selectedGroupId={form.selectedGroupId}
        selectedGroupName={form.selectedGroupName}
        selectedCurrency={form.selectedCurrency}
        selectedEmoji={form.selectedEmoji}
        selectedSplitRatio={form.selectedSplitRatio}
        customSplitRatio={form.customSplitRatio}
        useDescriptionAsPayee={form.useDescriptionAsPayee}
        customPayeeName={form.customPayeeName}
        partnerInfo={form.partnerInfo}
        isEmojiConflict={form.isEmojiConflict}
        showAdvanced={showAdvanced}
        onShowAdvancedChange={setShowAdvanced}
        onGroupChange={form.handleGroupChange}
        onCurrencyChange={form.setSelectedCurrency}
        onEmojiChange={form.handleEmojiChange}
        onSplitRatioChange={form.handleSplitRatioChange}
        onCustomSplitRatioChange={(ratio) => form.setCustomSplitRatio(ratio)}
        onPayeeModeChange={form.handlePayeeModeChange}
        onCustomPayeeNameChange={(name) => form.setCustomPayeeName(name)}
        isSolo={!isPrimary}
        isDual={isPrimary}
        budgetCurrency={budgetCurrency}
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
          disabled={isSaving || !form.isValid || form.validGroups.length === 0}
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
    </form>
  );
}
