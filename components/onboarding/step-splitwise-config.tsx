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
} from "@/app/actions/splitwise";
import { getYNABBudgetsForUser } from "@/app/actions/ynab";
import type { SplitwiseGroup } from "@/types/splitwise";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  ChevronDown,
  AlertCircle,
  Info,
} from "lucide-react";
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
}

export function StepSplitwiseConfig({
  initialSettings,
  budgetId,
}: StepSplitwiseConfigProps) {
  const { nextStep, previousStep, persona, isNavigating } = useOnboardingStep();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [validGroups, setValidGroups] = useState<SplitwiseGroup[]>([]);
  const [invalidGroups, setInvalidGroups] = useState<SplitwiseGroup[]>([]);
  const [budgetCurrency, setBudgetCurrency] = useState<string | null>(null);

  const [selectedGroupId, setSelectedGroupId] = useState(
    initialSettings?.groupId || "",
  );
  const [selectedGroupName, setSelectedGroupName] = useState(
    initialSettings?.groupName || "",
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    initialSettings?.currencyCode || "",
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    initialSettings?.emoji || "✅",
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

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, []);

  // Check partner emoji when group changes
  useEffect(() => {
    if (selectedGroupId) {
      checkPartnerEmoji(selectedGroupId);
    }
  }, [selectedGroupId]);

  // Check emoji conflict
  useEffect(() => {
    if (partnerInfo && selectedEmoji === partnerInfo.emoji) {
      setIsEmojiConflict(true);
    } else {
      setIsEmojiConflict(false);
    }
  }, [selectedEmoji, partnerInfo]);

  async function loadGroups() {
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

      // Auto-default currency from YNAB budget
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function checkPartnerEmoji(groupId: string) {
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
    } catch (err) {
      console.error("Error checking partner emoji:", err);
    }
  }

  function suggestDifferentEmoji(partnerEmoji: string) {
    const available = SUGGESTED_EMOJIS.filter((e) => e !== partnerEmoji);
    if (available.length > 0) {
      const random = available[Math.floor(Math.random() * available.length)];
      if (random) setSelectedEmoji(random);
    }
  }

  function handleGroupChange(groupId: string) {
    const group = validGroups.find((g) => g.id.toString() === groupId);
    setSelectedGroupId(groupId);
    setSelectedGroupName(group?.name || "");
  }

  async function handleContinue() {
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
        await nextStep();
      } else {
        setError(result.error || "Failed to save settings");
        if (result.isEmojiConflict && partnerInfo?.emoji) {
          setIsEmojiConflict(true);
          suggestDifferentEmoji(partnerInfo.emoji);
        }
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

        {/* Currency selector */}
        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency</Label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
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
              ✓ Matches your YNAB budget currency
            </p>
          )}
          {partnerInfo?.currencyCode && (
            <p className="text-sm text-gray-500">
              Currency will sync with {partnerInfo.partnerName}
            </p>
          )}
        </div>

        {/* Sync marker emoji */}
        <div className="space-y-3">
          <div>
            <Label>Your Sync Marker</Label>
            <p className="text-sm text-gray-500 mt-1">
              We add this emoji to Splitwise expenses to track which ones are
              synced. Pick something unique so it doesn&apos;t conflict with
              your partner.
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
                  <RadioGroupItem value="description" id="payee-description" />
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
                    placeholder="e.g., Splitwise Settlement"
                    className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                  />
                  <p className="text-sm text-muted-foreground">
                    This will be{" "}
                    <strong>
                      the payee name for every Splitwise transaction
                    </strong>{" "}
                    we send to YNAB. The original Splitwise description will be
                    added to the memo field.
                  </p>
                </>
              )}
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
            !selectedGroupId ||
            !selectedCurrency ||
            isEmojiConflict ||
            isNavigating ||
            isSaving
          }
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6"
        >
          {isSaving ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </StepContainer>
  );
}
