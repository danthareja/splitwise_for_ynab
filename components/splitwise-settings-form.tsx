"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  checkCurrencySyncStatus,
} from "@/app/actions/splitwise";
import type { SplitwiseGroup } from "@/services/splitwise-types";
import { AlertCircle, Loader2, AlertTriangle, Info, Check } from "lucide-react";
import { EmojiPicker } from "@/components/emoji-picker";
import Image from "next/image";

interface SplitwiseSettingsFormProps {
  initialGroupId?: string | null;
  initialGroupName?: string | null;
  initialCurrencyCode?: string | null;
  initialEmoji?: string | null;
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
  { value: "SEK", label: "SEK - Swedish Krona" },
  { value: "NOK", label: "NOK - Norwegian Krone" },
  { value: "DKK", label: "DKK - Danish Krone" },
];

// Suggested emojis that are visually distinct
const SUGGESTED_EMOJIS = ["🤴", "👸", "👨", "💰", "💸", "📊", "📝", "🔄"];

export function SplitwiseSettingsForm({
  initialGroupId,
  initialCurrencyCode,
  initialEmoji = "✅",
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
  const [partnerInfo, setPartnerInfo] = useState<{
    emoji: string | null;
    currencyCode: string | null;
    partnerName: string;
  } | null>(null);
  const [isEmojiConflict, setIsEmojiConflict] = useState(false);
  const [currencySynced, setCurrencySynced] = useState(false);

  useEffect(() => {
    loadGroups();
    checkCurrencySync();
  }, []);

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

  // Check if currency was recently synced by partner
  async function checkCurrencySync() {
    try {
      const syncStatus = await checkCurrencySyncStatus();
      if (syncStatus?.recentlyUpdated) {
        setCurrencySynced(true);
      }
    } catch (error) {
      console.error("Error checking currency sync:", error);
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

      // Ensure the form data has the current emoji value
      formData.set("emoji", selectedEmoji);

      if (selectedGroup) {
        formData.set("groupName", selectedGroup.name);
      }

      const result = await saveSplitwiseSettings(formData);

      if (result.success) {
        // If currency was synced with partners, show a success message
        if (result.currencySynced && result.updatedPartners?.length > 0) {
          setSuccessMessage(
            `Settings saved! Currency synchronized with ${result.updatedPartners.join(", ")}.`,
          );
          // Wait a moment before closing the form
          setTimeout(() => {
            onSaveSuccess?.();
          }, 3000);
        } else {
          // Call the success callback to close the form
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
        {currencySynced && (
          <Alert className="mb-4" variant="success">
            <Check className="h-4 w-4" />
            <AlertDescription>
              Your currency settings were recently updated to match your
              partner&apos;s settings.
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
                            key={member.user_id}
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
              <p className="text-sm text-muted-foreground">
                Note: Currency will be synchronized with your partner. You both
                need to use the same currency.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <EmojiPicker
              label="Sync Marker Emoji"
              value={selectedEmoji}
              onChange={handleEmojiChange}
              description="This emoji will be added to expense descriptions in Splitwise to mark them as synced."
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

          <Button
            type="submit"
            disabled={isSaving || validGroups.length === 0 || isEmojiConflict}
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
