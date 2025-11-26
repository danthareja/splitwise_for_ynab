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
import { Badge } from "@/components/ui/badge";
import {
  getSplitwiseGroupsForUser,
  saveSplitwiseSettings,
  getPartnerEmoji,
} from "@/app/actions/splitwise";
import { EmojiPicker } from "@/components/emoji-picker";
import type { SplitwiseGroup } from "@/types/splitwise";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  ChevronDown,
  AlertCircle,
  Info,
  Crown,
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
}

// Premium badge component
function PremiumBadge() {
  return (
    <Badge
      variant="secondary"
      className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
    >
      <Crown className="h-3 w-3 mr-1" />
      Premium
    </Badge>
  );
}

export function StepSplitwiseConfig({
  initialSettings,
}: StepSplitwiseConfigProps) {
  const { nextStep, previousStep, persona, isNavigating } = useOnboardingStep();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [validGroups, setValidGroups] = useState<SplitwiseGroup[]>([]);
  const [invalidGroups, setInvalidGroups] = useState<SplitwiseGroup[]>([]);

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
      const result = await getSplitwiseGroupsForUser();
      if (result.success) {
        setValidGroups(result.validGroups || []);
        setInvalidGroups(result.invalidGroups || []);
      } else {
        setError(result.error || "Failed to load groups");
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
      // Use defaults for premium features (free tier)
      formData.set("splitRatio", "1:1");
      formData.set("useDescriptionAsPayee", "true");
      formData.set("customPayeeName", "");

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
      <div className="space-y-6">
        {/* Group selector */}
        <div className="space-y-2">
          <Label htmlFor="groupId">Splitwise Group</Label>
          <Select value={selectedGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger>
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
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((currency) => (
                <SelectItem key={currency.value} value={currency.value}>
                  {currency.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {partnerInfo?.currencyCode && (
            <p className="text-sm text-gray-500">
              Currency will sync with {partnerInfo.partnerName}
            </p>
          )}
        </div>

        {/* Emoji picker */}
        <div className="space-y-2">
          <EmojiPicker
            label="Sync Marker Emoji"
            value={selectedEmoji}
            onChange={setSelectedEmoji}
            description="We use an emoji to mark synced expenses in Splitwise"
          />

          {partnerInfo && (
            <Alert variant={isEmojiConflict ? "destructive" : "default"}>
              {isEmojiConflict ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertDescription>
                {isEmojiConflict
                  ? `Emoji conflict! ${partnerInfo.partnerName} is using "${partnerInfo.emoji}". Please choose a different emoji.`
                  : `${partnerInfo.partnerName} is using "${partnerInfo.emoji}" as their sync marker.`}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            <p className="text-sm text-gray-500 w-full">Suggested:</p>
            {SUGGESTED_EMOJIS.filter((e) => e !== partnerInfo?.emoji).map(
              (emoji) => (
                <Button
                  key={emoji}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 text-lg"
                  onClick={() => setSelectedEmoji(emoji)}
                >
                  {emoji}
                </Button>
              ),
            )}
          </div>
        </div>

        {/* Advanced settings (premium features - disabled for free tier) */}
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
            {/* Split ratio - Premium */}
            <div className="space-y-2 opacity-60">
              <div className="flex items-center">
                <Label>Split Ratio</Label>
                <PremiumBadge />
              </div>
              <Select disabled defaultValue="1:1">
                <SelectTrigger>
                  <SelectValue>Equal Split (1:1)</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">Equal Split (1:1)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                Custom split ratios are available with a premium subscription
              </p>
            </div>

            {/* Payee mapping - Premium */}
            <div className="space-y-2 opacity-60">
              <div className="flex items-center">
                <Label>YNAB Payee Mapping</Label>
                <PremiumBadge />
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-sm text-gray-600 dark:text-gray-400">
                Using Splitwise description as YNAB payee name (default)
              </div>
              <p className="text-sm text-gray-500">
                Custom payee mapping is available with a premium subscription
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

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
