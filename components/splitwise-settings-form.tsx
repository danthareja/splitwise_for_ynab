"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSplitwiseGroupsForUser,
  saveSplitwiseSettings,
  getPartnerEmoji,
  checkPartnerSyncStatus,
} from "@/app/actions/splitwise";
import type { SplitwiseGroup } from "@/types/splitwise";
import { AlertCircle, Loader2, AlertTriangle, Info, Check } from "lucide-react";
import { EmojiPicker } from "@/components/emoji-picker";
import Image from "next/image";

interface SplitwiseSettingsFormProps {
  initialGroupId?: string | null;
  initialGroupName?: string | null;
  initialCurrencyCode?: string | null;
  initialEmoji?: string | null;
  initialSplitRatio?: string | null;
  initialUseDescriptionAsPayee?: boolean | null;
  initialCustomPayeeName?: string | null;
  onSaveSuccess?: () => void;
}

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CHF", label: "CHF - Swiss Franc" },
];

// Suggested emojis that are visually distinct
const SUGGESTED_EMOJIS = ["🤴", "👸", "🤑", "😸", "💰", "💸", "🌚", "🌞"];

// Common split ratios for easy selection
const SPLIT_RATIO_PRESETS = [
  { value: "1:1", label: "Equal Split (1:1)" },
  { value: "2:1", label: "You Pay More (2:1)" },
  { value: "1:2", label: "Partner Pays More (1:2)" },
  { value: "custom", label: "Custom Split..." },
];

export function SplitwiseSettingsForm({
  initialGroupId,
  initialCurrencyCode,
  initialEmoji = "✅",
  initialSplitRatio = "1:1",
  initialUseDescriptionAsPayee = true,
  initialCustomPayeeName,
  onSaveSuccess,
}: SplitwiseSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validGroups, setValidGroups] = useState<SplitwiseGroup[]>([]);
  const [invalidGroups, setInvalidGroups] = useState<SplitwiseGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || "");
  const [selectedCurrency, setSelectedCurrency] = useState(
    initialCurrencyCode || "",
  );
  const [selectedEmoji, setSelectedEmoji] = useState(initialEmoji || "✅");
  const [selectedSplitRatio, setSelectedSplitRatio] = useState(
    initialSplitRatio || "1:1",
  );
  const [customSplitRatio, setCustomSplitRatio] = useState("");
  const [showCustomSplit, setShowCustomSplit] = useState(false);
  const [useDescriptionAsPayee, setUseDescriptionAsPayee] = useState(
    initialUseDescriptionAsPayee ?? true,
  );
  const [customPayeeName, setCustomPayeeName] = useState(
    initialCustomPayeeName || "Splitwise for YNAB",
  );

  const [partnerInfo, setPartnerInfo] = useState<{
    emoji: string | null;
    currencyCode: string | null;
    partnerName: string;
  } | null>(null);
  const [isEmojiConflict, setIsEmojiConflict] = useState(false);
  const [partnerSynced, setPartnerSynced] = useState(false);

  // Track if groups have been loaded to avoid unnecessary reloading
  const groupsLoadedRef = useRef(false);

  useEffect(() => {
    // Only load groups once when component first mounts
    if (!groupsLoadedRef.current) {
      loadGroups();
      groupsLoadedRef.current = true;
    }

    checkPartnerSync();
    // Check if current split ratio is custom
    if (
      initialSplitRatio &&
      !SPLIT_RATIO_PRESETS.find((p) => p.value === initialSplitRatio)
    ) {
      setShowCustomSplit(true);
      setCustomSplitRatio(initialSplitRatio);
      setSelectedSplitRatio("custom");
    }
  }, [initialSplitRatio]);

  useEffect(() => {
    async function checkPartnerEmoji(groupId: string) {
      try {
        const partnerData = await getPartnerEmoji(groupId);
        if (partnerData) {
          setPartnerInfo(partnerData);

          // Check if current emoji conflicts with partner's
          if (selectedEmoji === partnerData.emoji) {
            setIsEmojiConflict(true);
            // Suggest a different emoji
            suggestDifferentEmoji(partnerData.emoji);
          } else {
            setIsEmojiConflict(false);
          }

          // If partner has a currency set and we don't, adopt their currency
          if (partnerData.currencyCode && !selectedCurrency) {
            setSelectedCurrency(partnerData.currencyCode);
          }
        } else {
          setPartnerInfo(null);
          setIsEmojiConflict(false);
        }
      } catch (error) {
        console.error("Error checking partner emoji:", error);
      }
    }

    if (selectedGroupId) {
      checkPartnerEmoji(selectedGroupId);
    }
  }, [selectedGroupId, selectedEmoji, selectedCurrency]);

  // Update custom payee name when group selection changes (if still using default)
  useEffect(() => {
    const selectedGroup = validGroups.find(
      (group) => group.id.toString() === selectedGroupId,
    );

    if (selectedGroup && !initialCustomPayeeName) {
      setCustomPayeeName(`Splitwise: ${selectedGroup.name}`);
    }
  }, [selectedGroupId, validGroups, initialCustomPayeeName]);

  // Check if settings were recently synced by partner
  async function checkPartnerSync() {
    try {
      const syncStatus = await checkPartnerSyncStatus();
      if (syncStatus?.recentlyUpdated) {
        setPartnerSynced(true);
      }
    } catch (error) {
      console.error("Error checking partner sync:", error);
    }
  }

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

  function suggestDifferentEmoji(partnerEmoji: string) {
    // Find an emoji that's not the same as the partner's
    const availableEmojis = SUGGESTED_EMOJIS.filter(
      (emoji) => emoji !== partnerEmoji,
    );
    if (availableEmojis.length > 0) {
      // Pick a random emoji from the available ones
      const randomEmoji =
        availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
      if (randomEmoji) {
        setSelectedEmoji(randomEmoji);
      }
    }
  }

  function handleEmojiChange(emoji: string) {
    setSelectedEmoji(emoji);
    // Check if this new emoji conflicts with partner's
    if (partnerInfo && emoji === partnerInfo.emoji) {
      setIsEmojiConflict(true);
    } else {
      setIsEmojiConflict(false);
    }
  }

  // Handle clicking on a suggested emoji
  function handleSuggestedEmojiClick(emoji: string) {
    setSelectedEmoji(emoji);
    setIsEmojiConflict(false);
  }

  // Handle split ratio changes
  function handleSplitRatioChange(value: string) {
    setSelectedSplitRatio(value);
    if (value === "custom") {
      setShowCustomSplit(true);
    } else {
      setShowCustomSplit(false);
      setCustomSplitRatio("");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      const selectedGroup = validGroups.find(
        (group) => group.id.toString() === selectedGroupId,
      );

      // Ensure the form data has the current emoji and split ratio values
      formData.set("emoji", selectedEmoji);

      // Set the split ratio - use custom value if "custom" is selected
      const finalSplitRatio =
        selectedSplitRatio === "custom" ? customSplitRatio : selectedSplitRatio;
      formData.set("splitRatio", finalSplitRatio);

      // Set the payee field options
      formData.set("useDescriptionAsPayee", useDescriptionAsPayee.toString());
      formData.set("customPayeeName", customPayeeName);

      if (selectedGroup) {
        formData.set("groupName", selectedGroup.name);
      }

      const result = await saveSplitwiseSettings(formData);

      if (result.success) {
        // Check if we need to show sync notifications
        const syncMessages = [];
        if (result.currencySynced && result.updatedPartners?.length > 0) {
          syncMessages.push("Currency synchronized");
        }
        if (result.splitRatioSynced && result.updatedPartners?.length > 0) {
          syncMessages.push("Split ratio synchronized");
        }

        // Check for partner sync message (when connecting to existing group)
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
          // Show success message for sync events
          setSuccessMessage(displayMessage);
          // Clear the message and close form after showing it briefly
          setTimeout(() => {
            setSuccessMessage(null);
            setError(null);
            onSaveSuccess?.();
          }, 2000);
        } else {
          // No sync occurred, close immediately
          setSuccessMessage(null);
          setError(null);
          onSaveSuccess?.();
        }
      } else {
        setError(result.error || "Failed to save settings");

        // If there's an emoji conflict, highlight it
        if (result.isEmojiConflict) {
          setIsEmojiConflict(true);
          // Try to suggest a different emoji
          if (partnerInfo && partnerInfo.emoji) {
            suggestDifferentEmoji(partnerInfo.emoji);
          }
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
      <Card>
        <CardHeader>
          <CardTitle>Splitwise Settings</CardTitle>
          <CardDescription>
            Configure your Splitwise group and currency preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading groups...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Splitwise Settings</CardTitle>
        <CardDescription>
          Configure your Splitwise group and currency preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        {partnerSynced && (
          <Alert className="mb-4" variant="success">
            <Check className="h-4 w-4" />
            <AlertDescription>
              Your settings were recently synchronized with your partner.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="groupId">Splitwise Group</Label>
            <Select
              name="groupId"
              value={selectedGroupId}
              onValueChange={setSelectedGroupId}
              required
            >
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
                            className="relative h-6 w-6 overflow-hidden rounded-full border-1 border-muted-foreground"
                          >
                            <Image
                              src={
                                member.picture?.medium ||
                                "https://placecats.com/50/50"
                              }
                              alt={`${member.first_name} ${member.last_name}`}
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
            {validGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No valid groups found. You need a group with exactly 2 members.
              </p>
            )}
          </div>

          {invalidGroups.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">
                    Groups with more than 2 members cannot be used:
                  </p>
                  <ul className="list-disc list-inside text-sm">
                    {invalidGroups.map((group) => (
                      <li key={group.id}>
                        {group.name} ({group.members.length} members)
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    This app only supports groups with exactly 2 members for
                    shared expenses between partners.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="currencyCode">Currency</Label>
            <Select
              name="currencyCode"
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
              required
            >
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
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Your currency will sync with {partnerInfo.partnerName}.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <EmojiPicker
              label="Sync Marker Emoji"
              value={selectedEmoji}
              onChange={handleEmojiChange}
              description="We use an emoji to mark synced expenses in Splitwise."
            />

            {partnerInfo && (
              <Alert variant={isEmojiConflict ? "destructive" : "default"}>
                {isEmojiConflict ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
                <AlertDescription>
                  {isEmojiConflict ? (
                    <>
                      Emoji conflict! {partnerInfo.partnerName} is already using
                      &quot;{partnerInfo.emoji}&quot;. Please choose a different
                      emoji.
                    </>
                  ) : (
                    <>
                      {partnerInfo.partnerName} is using &quot;
                      {partnerInfo.emoji}&quot; as their sync marker.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              <p className="text-sm w-full">Suggested alternatives:</p>
              {SUGGESTED_EMOJIS.filter((emoji) => emoji !== partnerInfo?.emoji)
                .slice(0, 8)
                .map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-lg"
                    onClick={() => handleSuggestedEmojiClick(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="splitRatio">Split Ratio</Label>
            <Select
              name="splitRatio"
              value={selectedSplitRatio}
              onValueChange={handleSplitRatioChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select split ratio" />
              </SelectTrigger>
              <SelectContent>
                {SPLIT_RATIO_PRESETS.map((ratio) => (
                  <SelectItem key={ratio.value} value={ratio.value}>
                    {ratio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showCustomSplit && (
            <div className="space-y-2">
              <Label htmlFor="customSplitRatio">Custom Split Ratio</Label>
              <input
                type="text"
                name="customSplitRatio"
                value={customSplitRatio}
                onChange={(e) => setCustomSplitRatio(e.target.value)}
                placeholder="Enter ratio like 2:3 or 5:2"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#141414] text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                pattern="^\d+:\d+$"
                title="Please enter a ratio in the format X:Y (e.g., 2:1)"
                required
              />
            </div>
          )}

          {partnerInfo && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your split ratio will sync with {partnerInfo.partnerName}. If
                you set a{" "}
                {selectedSplitRatio !== "custom"
                  ? selectedSplitRatio
                  : customSplitRatio}{" "}
                ratio, {partnerInfo.partnerName}&apos;s ratio will automatically
                get a{" "}
                {(() => {
                  const ratio =
                    selectedSplitRatio !== "custom"
                      ? selectedSplitRatio
                      : customSplitRatio;
                  const [a, b] = ratio.split(":").map(Number) ?? [];
                  if (a && b) {
                    return `${b}:${a}`;
                  }
                  return "X:Y";
                })()}{" "}
                ratio.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>YNAB Transaction Mapping</Label>
            <RadioGroup
              value={useDescriptionAsPayee ? "description" : "custom"}
              onValueChange={(value) =>
                setUseDescriptionAsPayee(value === "description")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="description" id="description" />
                <Label htmlFor="description" className="text-sm font-normal">
                  Use Splitwise description as YNAB payee name (recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="text-sm font-normal">
                  Use custom YNAB payee name, put Splitwise description in memo
                </Label>
              </div>
            </RadioGroup>

            {!useDescriptionAsPayee && (
              <div className="mt-3 space-y-2">
                <Label htmlFor="customPayeeName">Custom Payee Name</Label>
                <Input
                  id="customPayeeName"
                  type="text"
                  value={customPayeeName}
                  onChange={(e) => setCustomPayeeName(e.target.value)}
                  placeholder={
                    validGroups.find((g) => g.id.toString() === selectedGroupId)
                      ?.name
                      ? `Splitwise: ${validGroups.find((g) => g.id.toString() === selectedGroupId)?.name}`
                      : "e.g., Splitwise Expenses"
                  }
                  className="w-full"
                  required={!useDescriptionAsPayee}
                />
                <p className="text-sm text-muted-foreground">
                  This will be{" "}
                  <strong>
                    the payee name for every Splitwise transaction
                  </strong>{" "}
                  we send to YNAB. The original Splitwise description will be
                  added to the memo field.
                </p>
              </div>
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

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSaveSuccess?.()}
              disabled={isSaving}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSaving ||
                validGroups.length === 0 ||
                isEmojiConflict ||
                !selectedGroupId ||
                !selectedCurrency
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

          {isEmojiConflict && (
            <p className="text-sm text-red-500">
              Please choose a different emoji before saving.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
