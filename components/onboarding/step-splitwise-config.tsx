"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getSplitwiseGroupsForUser,
  saveSplitwiseSettings,
  getPartnerEmoji,
  detectPotentialPrimary,
  joinHousehold,
} from "@/app/actions/splitwise";
import { getYNABBudgetsForUser } from "@/app/actions/ynab";
import { completeOnboarding } from "@/app/actions/user";
import type { SplitwiseGroup } from "@/types/splitwise";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  ChevronDown,
  AlertCircle,
  Info,
  Users,
  Check,
} from "lucide-react";
import { PartnerInviteCard } from "@/components/partner-invite-card";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CHF", label: "CHF - Swiss Franc" },
];

const SUGGESTED_EMOJIS = ["🤴", "👸", "🤑", "😸", "💰", "💸", "🌚", "🌞"];

const SPLIT_RATIO_PRESETS = [
  { value: "1:1", label: "Equal Split (1:1)" },
  { value: "2:1", label: "You Pay More (2:1)" },
  { value: "1:2", label: "Partner Pays More (1:2)" },
  { value: "custom", label: "Custom Split..." },
];

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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [validGroups, setValidGroups] = useState<SplitwiseGroup[]>([]);
  const [invalidGroups, setInvalidGroups] = useState<SplitwiseGroup[]>([]);
  const [budgetCurrency, setBudgetCurrency] = useState<string | null>(null);

  // Potential primary for "Join household" flow
  const [potentialPrimary, setPotentialPrimary] = useState<{
    primaryId: string;
    primaryName: string;
    primaryEmail: string | null;
    primaryImage: string | null;
    settings: {
      currencyCode: string | null;
      emoji: string | null;
      defaultSplitRatio: string | null;
    } | null;
  } | null>(null);

  const [selectedGroupId, setSelectedGroupId] = useState(
    initialSettings?.groupId || "",
  );
  const [selectedGroupName, setSelectedGroupName] = useState(
    initialSettings?.groupName || "",
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    initialSettings?.currencyCode || "",
  );
  // For dual users, require explicit emoji selection (no default)
  // For solo users, default to ✅
  const [selectedEmoji, setSelectedEmoji] = useState(
    initialSettings?.emoji || (persona === "solo" ? "✅" : ""),
  );
  const [selectedSplitRatio, setSelectedSplitRatio] = useState(() => {
    const initial = initialSettings?.defaultSplitRatio || "1:1";
    // Check if it's a preset or custom
    if (SPLIT_RATIO_PRESETS.find((p) => p.value === initial)) {
      return initial;
    }
    return "custom";
  });
  const [customSplitRatio, setCustomSplitRatio] = useState(() => {
    const initial = initialSettings?.defaultSplitRatio || "1:1";
    // If not a preset, it's a custom value
    if (!SPLIT_RATIO_PRESETS.find((p) => p.value === initial)) {
      return initial;
    }
    return "";
  });
  const [payeeMode, setPayeeMode] = useState<"description" | "custom">(
    initialSettings?.useDescriptionAsPayee === false ? "custom" : "description",
  );
  const [customPayeeName, setCustomPayeeName] = useState(
    initialSettings?.customPayeeName || "",
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [partnerInfo, setPartnerInfo] = useState<{
    emoji: string | null;
    currencyCode: string | null;
    partnerName: string;
  } | null>(null);
  const [isEmojiConflict, setIsEmojiConflict] = useState(false);

  // Check emoji conflict
  useEffect(() => {
    if (partnerInfo && selectedEmoji === partnerInfo.emoji) {
      setIsEmojiConflict(true);
    } else {
      setIsEmojiConflict(false);
    }
  }, [selectedEmoji, partnerInfo]);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch groups and budget currency in parallel
      const [groupsResult, budgetsResult] = await Promise.all([
        getSplitwiseGroupsForUser(),
        budgetId
          ? getYNABBudgetsForUser()
          : Promise.resolve({ success: false, budgets: [] }),
      ]);

      if (groupsResult.success) {
        setValidGroups(groupsResult.validGroups || []);
        setInvalidGroups(groupsResult.invalidGroups || []);
      } else {
        setError(groupsResult.error || "Failed to load groups");
      }

      // Auto-default currency from YNAB plan
      if (budgetsResult.success && budgetId) {
        const budget = budgetsResult.budgets.find((b) => b.id === budgetId);
        if (budget?.currency_format?.iso_code) {
          setBudgetCurrency(budget.currency_format.iso_code);
          // Only auto-set if no currency is currently selected and no initial setting
          if (!selectedCurrency && !initialSettings?.currencyCode) {
            setSelectedCurrency(budget.currency_format.iso_code);
          }
        }
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  }, [budgetId, initialSettings?.currencyCode, selectedCurrency]);

  const checkPartnerEmoji = useCallback(
    async (groupId: string) => {
      try {
        const data = await getPartnerEmoji(groupId);
        if (data) {
          setPartnerInfo(data);
          // Auto-set currency from partner if not set
          if (data.currencyCode && !selectedCurrency) {
            setSelectedCurrency(data.currencyCode);
          }
          // Check for emoji conflict
          if (selectedEmoji === data.emoji) {
            setIsEmojiConflict(true);
            suggestDifferentEmoji(data.emoji);
          }
        } else {
          setPartnerInfo(null);
        }
      } catch (error) {
        console.error("Error checking partner emoji:", error);
      }
    },
    [selectedCurrency, selectedEmoji],
  );

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Check partner emoji when group changes
  useEffect(() => {
    if (selectedGroupId) {
      checkPartnerEmoji(selectedGroupId);
    }
  }, [selectedGroupId, checkPartnerEmoji]);

  function suggestDifferentEmoji(partnerEmoji: string) {
    const available = SUGGESTED_EMOJIS.filter((e) => e !== partnerEmoji);
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      if (random) setSelectedEmoji(random);
    }
  }

  async function handleGroupChange(groupId: string) {
    const group = validGroups.find((g) => g.id.toString() === groupId);
    setSelectedGroupId(groupId);
    setSelectedGroupName(group?.name || "");

    // Reset potential primary when changing group
    setPotentialPrimary(null);

    // For dual users, check if there's a potential primary to join
    if (persona === "dual" && groupId) {
      const primary = await detectPotentialPrimary(groupId);
      if (primary) {
        setPotentialPrimary(primary);
      }
    }
  }

  // Handle joining an existing household
  async function handleJoinHousehold() {
    if (!potentialPrimary) return;

    setIsJoining(true);
    setError(null);

    try {
      const result = await joinHousehold(potentialPrimary.primaryId);

      if (result.success) {
        // Complete onboarding and redirect to dashboard
        await completeOnboarding();
        router.push("/dashboard");
      } else {
        setError(result.error || "Failed to join household");
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsJoining(false);
    }
  }

  async function handleContinue() {
    // Secondary users inherit from primary + set their own emoji and payee settings
    if (isSecondary) {
      if (!selectedEmoji || !primarySettings?.groupId) return;

      setIsSaving(true);
      setError(null);

      try {
        const formData = new FormData();
        // Inherited settings from primary
        formData.set("groupId", primarySettings.groupId);
        formData.set("groupName", primarySettings.groupName || "");
        formData.set("currencyCode", primarySettings.currencyCode || "USD");
        formData.set("splitRatio", primarySettings.defaultSplitRatio || "1:1");
        // User's own settings
        formData.set("emoji", selectedEmoji);
        formData.set(
          "useDescriptionAsPayee",
          payeeMode === "description" ? "true" : "false",
        );
        formData.set(
          "customPayeeName",
          payeeMode === "custom" ? customPayeeName : "",
        );

        const result = await saveSplitwiseSettings(formData);

        if (result.success) {
          await completeOnboarding();
          router.push("/dashboard");
        } else {
          setError(result.error || "Failed to save settings");
        }
      } catch (error) {
        setError(
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
    if (!selectedGroupId || !selectedCurrency) return;

    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("groupId", selectedGroupId);
      formData.set("groupName", selectedGroupName);
      formData.set("currencyCode", selectedCurrency);
      formData.set("emoji", selectedEmoji);
      const finalSplitRatio =
        selectedSplitRatio === "custom" ? customSplitRatio : selectedSplitRatio;
      formData.set("splitRatio", finalSplitRatio || "1:1");
      formData.set(
        "useDescriptionAsPayee",
        payeeMode === "description" ? "true" : "false",
      );
      formData.set(
        "customPayeeName",
        payeeMode === "custom" ? customPayeeName : "",
      );

      const result = await saveSplitwiseSettings(formData);

      if (result.success) {
        // This is the last step - complete onboarding
        await completeOnboarding();
        router.push("/dashboard");
      } else {
        setError(result.error || "Failed to save settings");
        if (result.isEmojiConflict && partnerInfo?.emoji) {
          setIsEmojiConflict(true);
          suggestDifferentEmoji(partnerInfo.emoji);
        }
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && !isSecondary) {
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

  // Secondary user view - simplified with inherited settings
  if (isSecondary) {
    // Check if secondary user has access to primary's group
    const primaryGroupId = primarySettings?.groupId;
    const hasGroupAccess = validGroups.some(
      (g) => g.id.toString() === primaryGroupId,
    );
    const isCheckingAccess = isLoading;

    return (
      <StepContainer
        title="Your Splitwise Settings"
        description="Pick your sync marker and payee preferences"
      >
        <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
          {/* Loading state */}
          {isCheckingAccess && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">
                Verifying group access...
              </span>
            </div>
          )}

          {/* Group access error */}
          {!isCheckingAccess && primaryGroupId && !hasGroupAccess && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your Splitwise account doesn&apos;t have access to {primaryName}
                &apos;s group ({primarySettings?.groupName || "Shared group"}).
                Please disconnect and reconnect with the correct Splitwise
                account.
              </AlertDescription>
            </Alert>
          )}

          {/* Inherited settings (read-only) */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
              Shared with {primaryName || "your household"}
            </p>
            <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <div className="flex justify-between">
                <span>Splitwise group:</span>
                <span className="font-medium">
                  {primarySettings?.groupName || "Shared group"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Currency:</span>
                <span className="font-medium">
                  {primarySettings?.currencyCode || "USD"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Split ratio:</span>
                <span className="font-medium">
                  {primarySettings?.defaultSplitRatio || "1:1"}
                </span>
              </div>
            </div>
          </div>

          {/* Emoji picker */}
          <div className="space-y-3">
            <div>
              <Label className="text-base">Your sync marker</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                We add this emoji to expenses after syncing. Pick something
                different from your partner&apos;s marker.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={cn(
                    "h-12 w-12 rounded-lg text-2xl flex items-center justify-center transition-all",
                    selectedEmoji === emoji
                      ? "bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {!selectedEmoji && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Please select a sync marker
              </p>
            )}
          </div>

          {/* Payee settings */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <Label className="text-base">YNAB Payee Name</Label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                How should expenses appear in YNAB?
              </p>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payeeMode"
                  checked={payeeMode === "description"}
                  onChange={() => setPayeeMode("description")}
                  className="h-4 w-4 text-amber-600"
                />
                <div>
                  <span className="font-medium">Use Splitwise description</span>
                  <span className="text-sm text-gray-500 ml-1">
                    (recommended)
                  </span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payeeMode"
                  checked={payeeMode === "custom"}
                  onChange={() => setPayeeMode("custom")}
                  className="h-4 w-4 text-amber-600"
                />
                <span className="font-medium">Use a custom payee name</span>
              </label>
              {payeeMode === "custom" && (
                <Input
                  value={customPayeeName}
                  onChange={(e) => setCustomPayeeName(e.target.value)}
                  placeholder="e.g., Splitwise"
                  className="ml-7 max-w-xs bg-gray-50 dark:bg-gray-900"
                />
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={isNavigating || isSaving}
            className="rounded-full"
          >
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={
              isNavigating ||
              isSaving ||
              !selectedEmoji ||
              isCheckingAccess ||
              !hasGroupAccess
            }
            className="rounded-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Complete setup"
            )}
          </Button>
        </div>
      </StepContainer>
    );
  }

  return (
    <StepContainer
      title="Configure Splitwise"
      description="Select your group and currency"
    >
      {/* Form card */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
        {/* Group selector */}
        <div className="space-y-2">
          <Label htmlFor="groupId">Splitwise Group</Label>
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              {validGroups.map((group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {group.members.slice(0, 2).map((member) => (
                        <div
                          key={member.id}
                          className="relative h-6 w-6 overflow-hidden rounded-full border border-white dark:border-gray-800"
                        >
                          <Image
                            src={
                              member.picture?.medium ||
                              "https://placecats.com/50/50"
                            }
                            alt={`${member.first_name}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{group.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {group.members.map((m) => m.first_name).join(" & ")}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {validGroups.length === 0 && !isLoading && (
            <p className="text-sm text-gray-500">
              No valid groups found. You need a group with exactly 2 members.
            </p>
          )}
        </div>

        {/* Invalid groups warning */}
        {invalidGroups.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">
                Groups with 3+ members can&apos;t be used:
              </span>
              <ul className="mt-1 text-sm list-disc list-inside">
                {invalidGroups.slice(0, 3).map((g) => (
                  <li key={g.id}>
                    {g.name} ({g.members.length} members)
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Join existing household prompt - for dual users who select a group with an existing primary */}
        {potentialPrimary && persona === "dual" && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Join {potentialPrimary.primaryName}&apos;s household?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {potentialPrimary.primaryName} has already set up this group.
                  You can join their household and share their settings.
                </p>

                {/* Show inherited settings preview */}
                {potentialPrimary.settings && (
                  <div className="bg-white dark:bg-gray-900/50 rounded-lg p-3 mb-4 text-sm">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      You&apos;ll inherit:
                    </p>
                    <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                      <li>
                        • Currency:{" "}
                        {potentialPrimary.settings.currencyCode || "Not set"}
                      </li>
                      <li>
                        • Split ratio:{" "}
                        {potentialPrimary.settings.defaultSplitRatio || "1:1"}
                      </li>
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleJoinHousehold}
                    disabled={isJoining}
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
                        Join household
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPotentialPrimary(null)}
                    disabled={isJoining}
                    className="rounded-full"
                  >
                    Set up my own
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rest of configuration - only show if not joining an existing household */}
        {!potentialPrimary && (
          <>
            {/* Currency selector */}
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={setSelectedCurrency}
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                      {currency.value === budgetCurrency && " (from YNAB)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {budgetCurrency && selectedCurrency === budgetCurrency && (
                <p className="text-sm text-gray-500">
                  ✓ Matches your YNAB plan currency
                </p>
              )}
              {partnerInfo?.currencyCode && (
                <p className="text-sm text-gray-500">
                  Currency will sync with {partnerInfo.partnerName}
                </p>
              )}
            </div>

            {/* Sync marker emoji - only show for dual users (important for partner conflict detection) */}
            {persona === "dual" && (
              <div className="space-y-3">
                <div>
                  <Label className="flex items-center gap-1">
                    Your Sync Marker
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    We add this emoji to Splitwise expenses to track which ones
                    are synced. Pick something unique so it doesn&apos;t
                    conflict with your partner.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_EMOJIS.filter((e) => e !== partnerInfo?.emoji).map(
                    (emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedEmoji(emoji)}
                        className={cn(
                          "h-10 w-10 rounded-lg text-xl flex items-center justify-center transition-all",
                          selectedEmoji === emoji
                            ? "bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500"
                            : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                        )}
                      >
                        {emoji}
                      </button>
                    ),
                  )}
                </div>

                {/* Show message if no emoji selected */}
                {!selectedEmoji && !partnerInfo && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    👆 Please select your sync marker
                  </p>
                )}

                {partnerInfo && (
                  <Alert variant={isEmojiConflict ? "destructive" : "default"}>
                    {isEmojiConflict ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Info className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {isEmojiConflict
                        ? `Choose a different emoji—${partnerInfo.partnerName} is using "${partnerInfo.emoji}".`
                        : `${partnerInfo.partnerName} uses "${partnerInfo.emoji}" as their marker.`}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Advanced settings */}
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
                {/* Split ratio */}
                <div className="space-y-2">
                  <Label>Split Ratio</Label>
                  <Select
                    value={selectedSplitRatio}
                    onValueChange={(value) => {
                      setSelectedSplitRatio(value);
                      if (value !== "custom") {
                        setCustomSplitRatio("");
                      }
                    }}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SPLIT_RATIO_PRESETS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSplitRatio === "custom" && (
                    <Input
                      value={customSplitRatio}
                      onChange={(e) => setCustomSplitRatio(e.target.value)}
                      placeholder="Enter ratio like 3:2 or 5:3"
                      pattern="^\d+:\d+$"
                      className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                    />
                  )}
                  <p className="text-sm text-gray-500">
                    How expenses are split between you and your partner
                  </p>
                </div>

                {/* Payee mapping */}
                <div className="space-y-3">
                  <Label>YNAB Payee Name</Label>
                  <RadioGroup
                    value={payeeMode}
                    onValueChange={(v) =>
                      setPayeeMode(v as "description" | "custom")
                    }
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="description"
                        id="payee-description"
                      />
                      <Label
                        htmlFor="payee-description"
                        className="font-normal cursor-pointer"
                      >
                        Use Splitwise description as payee name (recommended)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="custom" id="payee-custom" />
                      <Label
                        htmlFor="payee-custom"
                        className="font-normal cursor-pointer"
                      >
                        Use custom payee name, put description in memo
                      </Label>
                    </div>
                  </RadioGroup>
                  {payeeMode === "custom" && (
                    <>
                      <Input
                        value={customPayeeName}
                        onChange={(e) => setCustomPayeeName(e.target.value)}
                        placeholder={`Splitwise: ${selectedGroupName}`}
                        className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      />
                      <p className="text-sm text-muted-foreground">
                        This will be{" "}
                        <strong>
                          the payee name for every Splitwise transaction
                        </strong>{" "}
                        we send to YNAB. The original Splitwise description will
                        be added to the memo field.
                      </p>
                    </>
                  )}
                </div>

                {/* Sync marker emoji - for solo users, shown in Advanced */}
                {persona === "solo" && (
                  <div className="space-y-2">
                    <Label>Sync Marker Emoji</Label>
                    <p className="text-sm text-gray-500 -mt-1">
                      We add this emoji to Splitwise expenses to track synced
                      items
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTED_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setSelectedEmoji(emoji)}
                          className={cn(
                            "h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all",
                            selectedEmoji === emoji
                              ? "bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500"
                              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
                          )}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Partner invite for dual primaries - show after completing settings */}
      {!potentialPrimary &&
        persona === "dual" &&
        selectedGroupId &&
        selectedEmoji && (
          <PartnerInviteCard
            variant="inline"
            className="mt-6"
            pendingSettings={{
              groupId: selectedGroupId,
              groupName: selectedGroupName,
              currencyCode: selectedCurrency,
              emoji: selectedEmoji,
              defaultSplitRatio:
                selectedSplitRatio === "custom"
                  ? customSplitRatio
                  : selectedSplitRatio,
            }}
          />
        )}

      {/* Only show navigation when not in "join household" mode */}
      {!potentialPrimary && (
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
              !selectedGroupId ||
              !selectedCurrency ||
              !selectedEmoji || // Emoji required for all users now
              isEmojiConflict ||
              isNavigating ||
              isSaving
            }
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6"
          >
            {isSaving ? "Completing..." : "Complete Setup"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Simplified navigation when joining household - just a back button */}
      {potentialPrimary && (
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
      )}
    </StepContainer>
  );
}
