"use client";

import { useState, useEffect } from "react";
import { StepContainer, useOnboardingStep } from "./wizard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  saveSplitwiseSettings,
  detectExistingGroupUser,
  joinHousehold,
  checkSplitwiseGroupAccess,
} from "@/app/actions/splitwise";
import { getYNABBudgetsForUser } from "@/app/actions/ynab";
import { completeOnboarding } from "@/app/actions/user";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  Check,
} from "lucide-react";
import { PartnerInviteSetup } from "@/components/partner-invite-setup";
import { createPartnerInvite } from "@/app/actions/splitwise";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSplitwiseForm, SUGGESTED_EMOJIS } from "@/hooks/use-splitwise-form";
import { reverseSplitRatio } from "@/lib/utils";
import {
  SplitwiseFormFields,
  SplitwiseSecondaryFormFields,
} from "@/components/splitwise-form-fields";

interface StepSplitwiseConfigProps {
  initialSettings?: {
    groupId?: string | null;
    groupName?: string | null;
    currencyCode?: string | null;
    emoji?: string | null;
    defaultSplitRatio?: string | null;
    useDescriptionAsPayee?: boolean | null;
    customPayeeName?: string | null;
  } | null;
  budgetId?: string | null;
  isSecondary?: boolean;
  // For secondary users - inherited from primary
  primarySettings?: {
    groupId?: string | null;
    groupName?: string | null;
    currencyCode?: string | null;
    defaultSplitRatio?: string | null;
    emoji?: string | null;
  } | null;
  primaryName?: string | null;
}

export function StepSplitwiseConfig({
  initialSettings,
  budgetId,
  isSecondary = false,
  primarySettings,
  primaryName,
}: StepSplitwiseConfigProps) {
  const router = useRouter();
  const { previousStep, persona, isNavigating } = useOnboardingStep();

  const [isSaving, setIsSaving] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [budgetCurrency, setBudgetCurrency] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Existing user for group conflict / "Join household" flow
  const [existingGroupUser, setExistingGroupUser] = useState<{
    id: string;
    name: string;
    email: string | null;
    image: string | null;
    persona: "solo" | "dual" | null;
    hasPartner: boolean;
    settings: {
      currencyCode: string | null;
      emoji: string | null;
      defaultSplitRatio: string | null;
    } | null;
  } | null>(null);
  // Emoji selection for joining household
  const [joinEmoji, setJoinEmoji] = useState<string>("");

  // Partner invite info (for dual primary users)
  const [partnerInviteInfo, setPartnerInviteInfo] = useState<{
    email: string;
    name: string;
    isCustomEmail: boolean;
  } | null>(null);

  // For secondary users: track group access check
  const [secondaryGroupAccess, setSecondaryGroupAccess] = useState<{
    isChecking: boolean;
    hasAccess: boolean | null;
  }>({ isChecking: false, hasAccess: null });

  // Use shared form hook
  const form = useSplitwiseForm({
    initialGroupId: initialSettings?.groupId,
    initialGroupName: initialSettings?.groupName,
    initialCurrencyCode: initialSettings?.currencyCode,
    initialEmoji: initialSettings?.emoji || (persona === "solo" ? "✅" : ""),
    initialSplitRatio: initialSettings?.defaultSplitRatio,
    initialUseDescriptionAsPayee: initialSettings?.useDescriptionAsPayee,
    initialCustomPayeeName: initialSettings?.customPayeeName,
    isSecondary,
    persona,
    skipGroupLoad: isSecondary,
  });

  // Load budget currency on mount
  useEffect(() => {
    async function loadBudgetCurrency() {
      if (!budgetId) return;
      try {
        const result = await getYNABBudgetsForUser();
        if (result.success) {
          const budget = result.budgets.find((b) => b.id === budgetId);
          if (budget?.currency_format?.iso_code) {
            setBudgetCurrency(budget.currency_format.iso_code);
            // Auto-set if no currency selected
            if (!form.selectedCurrency && !initialSettings?.currencyCode) {
              form.setSelectedCurrency(budget.currency_format.iso_code);
            }
          }
        }
      } catch (error) {
        console.error("Error loading budget currency:", error);
      }
    }
    loadBudgetCurrency();
  }, [budgetId, form.selectedCurrency, initialSettings?.currencyCode, form]);

  // Check for existing user when group changes (for any persona)
  useEffect(() => {
    async function checkExistingGroupUser() {
      if (form.selectedGroupId) {
        const existing = await detectExistingGroupUser(form.selectedGroupId);
        setExistingGroupUser(existing);
      } else {
        setExistingGroupUser(null);
      }
    }
    checkExistingGroupUser();
  }, [form.selectedGroupId]);

  // For secondary users: check if they have access to the primary's group
  useEffect(() => {
    async function checkGroupAccess() {
      if (!isSecondary || !primarySettings?.groupId) return;

      setSecondaryGroupAccess({ isChecking: true, hasAccess: null });
      try {
        const result = await checkSplitwiseGroupAccess(primarySettings.groupId);
        // User needs both access to the group AND the group must be valid (2 members)
        const hasAccess = result.hasAccess && result.isValid;
        setSecondaryGroupAccess({ isChecking: false, hasAccess });
      } catch (error) {
        console.error("Error checking group access:", error);
        setSecondaryGroupAccess({ isChecking: false, hasAccess: false });
      }
    }
    checkGroupAccess();
  }, [isSecondary, primarySettings?.groupId]);

  // Handle joining an existing household (only for dual primaries)
  async function handleJoinHousehold() {
    if (
      !existingGroupUser ||
      existingGroupUser.persona !== "dual" ||
      !joinEmoji
    )
      return;

    setIsJoining(true);
    form.setError(null);

    try {
      const result = await joinHousehold(existingGroupUser.id, joinEmoji);

      if (result.success) {
        await completeOnboarding();
        router.push("/dashboard");
      } else {
        form.setError(result.error || "Failed to join Duo account");
        if ("isEmojiConflict" in result && result.isEmojiConflict) {
          const partnerEmoji = existingGroupUser.settings?.emoji;
          if (partnerEmoji) {
            form.suggestDifferentEmoji(partnerEmoji);
          }
        }
      }
    } catch (error) {
      form.setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsJoining(false);
    }
  }

  // Determine what kind of prompt to show for existing group user
  const canJoinHousehold =
    existingGroupUser?.persona === "dual" && !existingGroupUser.hasPartner;
  const isGroupBlockedBySolo = existingGroupUser?.persona === "solo";
  const isGroupBlockedByFullHousehold =
    existingGroupUser?.persona === "dual" && existingGroupUser.hasPartner;

  async function handleContinue() {
    // Secondary users inherit from primary + set their own emoji and payee settings
    if (isSecondary) {
      if (!form.selectedEmoji || !primarySettings?.groupId) return;

      setIsSaving(true);
      form.setError(null);

      try {
        const formData = new FormData();
        formData.set("groupId", primarySettings.groupId);
        formData.set("groupName", primarySettings.groupName || "");
        formData.set("currencyCode", primarySettings.currencyCode || "USD");
        // Secondary gets the REVERSED split ratio (if primary has 2:1, secondary gets 1:2)
        formData.set(
          "splitRatio",
          reverseSplitRatio(primarySettings.defaultSplitRatio),
        );
        formData.set("emoji", form.selectedEmoji);
        formData.set(
          "useDescriptionAsPayee",
          form.useDescriptionAsPayee.toString(),
        );
        formData.set("customPayeeName", form.customPayeeName);

        const result = await saveSplitwiseSettings(formData);

        if (result.success) {
          await completeOnboarding();
          router.push("/dashboard");
        } else {
          form.setError(result.error || "Failed to save settings");
        }
      } catch (error) {
        form.setError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        );
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Primary/solo users - full settings
    if (!form.selectedGroupId || !form.selectedCurrency) return;

    setIsSaving(true);
    form.setError(null);

    try {
      const formData = new FormData();
      formData.set("groupId", form.selectedGroupId);
      formData.set("groupName", form.selectedGroupName);
      formData.set("currencyCode", form.selectedCurrency);
      formData.set("emoji", form.selectedEmoji);
      formData.set("splitRatio", form.finalSplitRatio || "1:1");
      formData.set(
        "useDescriptionAsPayee",
        form.useDescriptionAsPayee.toString(),
      );
      formData.set("customPayeeName", form.customPayeeName);

      const result = await saveSplitwiseSettings(formData);

      if (result.success) {
        // For dual users with partner info, create and send invite automatically
        if (
          persona === "dual" &&
          partnerInviteInfo?.email &&
          !existingGroupUser
        ) {
          try {
            await createPartnerInvite({
              settings: {
                groupId: form.selectedGroupId,
                groupName: form.selectedGroupName,
                currencyCode: form.selectedCurrency,
                emoji: form.selectedEmoji,
                defaultSplitRatio: form.finalSplitRatio,
              },
              partnerEmail: partnerInviteInfo.email,
              partnerName: partnerInviteInfo.name,
              sendEmail: true,
            });
          } catch (inviteError) {
            // Don't block onboarding if invite fails - they can resend from dashboard
            console.error("Failed to send partner invite:", inviteError);
          }
        }

        await completeOnboarding();
        router.push("/dashboard");
      } else {
        form.setError(result.error || "Failed to save settings");
        if (result.isEmojiConflict && form.partnerInfo?.emoji) {
          form.suggestDifferentEmoji(form.partnerInfo.emoji);
        }
      }
    } catch (error) {
      form.setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // Loading state
  if (form.isLoading && !isSecondary) {
    return (
      <StepContainer
        title="Configure Splitwise"
        description="Select your group and currency"
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Loading groups...
          </span>
        </div>
      </StepContainer>
    );
  }

  // Secondary user view
  if (isSecondary) {
    const primaryGroupId = primarySettings?.groupId;
    const hasGroupAccess = secondaryGroupAccess.hasAccess === true;
    const isCheckingAccess = secondaryGroupAccess.isChecking;

    return (
      <StepContainer
        title="Your Splitwise Settings"
        description="Pick your sync marker and payee preferences"
      >
        {/* Group access error */}
        {!isCheckingAccess &&
          primaryGroupId &&
          secondaryGroupAccess.hasAccess === false && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your Splitwise account doesn&apos;t have access to {primaryName}
                &apos;s group ({primarySettings?.groupName || "Shared group"}).
                Please disconnect and reconnect with the correct Splitwise
                account.
              </AlertDescription>
            </Alert>
          )}

        <SplitwiseSecondaryFormFields
          groupName={primarySettings?.groupName || ""}
          currencyCode={primarySettings?.currencyCode || "USD"}
          splitRatio={reverseSplitRatio(primarySettings?.defaultSplitRatio)}
          partnerName={primaryName || "your partner"}
          selectedEmoji={form.selectedEmoji}
          useDescriptionAsPayee={form.useDescriptionAsPayee}
          customPayeeName={form.customPayeeName}
          partnerEmoji={primarySettings?.emoji}
          isEmojiConflict={form.selectedEmoji === primarySettings?.emoji}
          onEmojiChange={form.handleEmojiChange}
          onPayeeModeChange={form.handlePayeeModeChange}
          onCustomPayeeNameChange={(name) => form.setCustomPayeeName(name)}
          showRoleExplanation={false}
        />

        {form.error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{form.error}</AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
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
              isNavigating ||
              isSaving ||
              !form.selectedEmoji ||
              isCheckingAccess ||
              !hasGroupAccess ||
              form.selectedEmoji === primarySettings?.emoji
            }
            className="rounded-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Complete setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </StepContainer>
    );
  }

  // Primary/Solo view
  return (
    <StepContainer
      title="Configure Splitwise"
      description="Select your group and currency"
    >
      {/* Group blocked by solo user */}
      {isGroupBlockedBySolo && existingGroupUser && (
        <>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">Group in Use</AlertTitle>
            <AlertDescription>
              {existingGroupUser.name} is already syncing to this group in Solo
              mode. To share this group, ask them to switch to Duo mode and
              invite you.
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Group blocked by full household */}
      {isGroupBlockedByFullHousehold && existingGroupUser && (
        <>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-bold">Duo Account Full</AlertTitle>
            <AlertDescription>
              {existingGroupUser.name}&apos;s Duo account already has a partner.
              This group cannot be used.
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Join existing household prompt - for dual primaries without a partner */}
      {canJoinHousehold && existingGroupUser ? (
        <>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Join {existingGroupUser.name}&apos;s Duo account?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {existingGroupUser.name} has already set up this group. You
                  can join their Duo account and share their settings.
                </p>

                {/* Show inherited settings preview */}
                {existingGroupUser.settings && (
                  <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 mb-4 text-sm">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      You&apos;ll share:
                    </p>
                    <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                      <li>
                        • Currency:{" "}
                        {existingGroupUser.settings.currencyCode || "Not set"}
                      </li>
                      <li>
                        • Split ratio:{" "}
                        {reverseSplitRatio(
                          existingGroupUser.settings.defaultSplitRatio,
                        )}
                      </li>
                    </ul>
                  </div>
                )}

                {/* Emoji picker for joining */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pick your sync marker
                    {existingGroupUser.settings?.emoji && (
                      <span className="font-normal text-gray-500">
                        {" "}
                        ({existingGroupUser.name} uses{" "}
                        {existingGroupUser.settings.emoji})
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_EMOJIS.filter(
                      (e) => e !== existingGroupUser.settings?.emoji,
                    ).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setJoinEmoji(emoji)}
                        className={cn(
                          "h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all",
                          joinEmoji === emoji
                            ? "bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-500"
                            : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700",
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {!joinEmoji && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      👆 Select your sync marker to continue
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleJoinHousehold}
                    disabled={isJoining || !joinEmoji}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Join Duo account
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Reset group selection so user can pick a different one
                      form.handleGroupChange("");
                      setExistingGroupUser(null);
                      setJoinEmoji("");
                    }}
                    disabled={isJoining}
                    className="rounded-full"
                  >
                    Choose a different group
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {form.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{form.error}</AlertDescription>
            </Alert>
          )}

          {/* Back button only when in join mode */}
          <div className="mt-8">
            <Button
              variant="outline"
              onClick={previousStep}
              disabled={isNavigating || isJoining}
              className="rounded-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Regular form using shared component */}
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
            onCustomSplitRatioChange={(ratio) =>
              form.setCustomSplitRatio(ratio)
            }
            onPayeeModeChange={form.handlePayeeModeChange}
            onCustomPayeeNameChange={(name) => form.setCustomPayeeName(name)}
            isSolo={persona === "solo"}
            isDual={persona === "dual"}
            budgetCurrency={budgetCurrency}
          />

          {form.error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{form.error}</AlertDescription>
            </Alert>
          )}

          {/* Partner invite setup for new dual primaries (no existing user in this group) */}
          {persona === "dual" &&
            form.selectedGroupId &&
            form.selectedEmoji &&
            !existingGroupUser && (
              <PartnerInviteSetup
                groupId={form.selectedGroupId}
                groupName={form.selectedGroupName}
                onPartnerInfoChange={setPartnerInviteInfo}
                className="mt-6"
              />
            )}

          {/* Navigation */}
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
                !form.isValid ||
                form.isEmojiConflict ||
                isNavigating ||
                isSaving ||
                isGroupBlockedBySolo ||
                isGroupBlockedByFullHousehold
              }
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6"
            >
              {isSaving ? "Completing..." : "Complete Setup"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </StepContainer>
  );
}
