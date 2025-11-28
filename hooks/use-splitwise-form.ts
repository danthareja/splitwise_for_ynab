"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSplitwiseGroupsForUser,
  getPartnerEmoji,
  checkPartnerSyncStatus,
} from "@/app/actions/splitwise";
import type { SplitwiseGroup } from "@/types/splitwise";

// Currency options
export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CHF", label: "CHF - Swiss Franc" },
];

// Suggested emojis that are visually distinct (✅ is default and shown first)
export const SUGGESTED_EMOJIS = [
  "✅",
  "🤴",
  "👸",
  "🤑",
  "😸",
  "💰",
  "💸",
  "🌚",
  "🌞",
];

// Common split ratios for easy selection
export const SPLIT_RATIO_PRESETS = [
  { value: "1:1", label: "Equal Split (1:1)" },
  { value: "2:1", label: "You Pay More (2:1)" },
  { value: "1:2", label: "Partner Pays More (1:2)" },
  { value: "custom", label: "Custom Split..." },
];

interface UseSplitwiseFormOptions {
  initialGroupId?: string | null;
  initialGroupName?: string | null;
  initialCurrencyCode?: string | null;
  initialEmoji?: string | null;
  initialSplitRatio?: string | null;
  initialUseDescriptionAsPayee?: boolean | null;
  initialCustomPayeeName?: string | null;
  /** If true, user is secondary and can only edit emoji/payee */
  isSecondary?: boolean;
  /** Persona type for detecting potential primary on group change */
  persona?: "solo" | "dual" | null;
  /** Whether to skip loading groups (for secondary users) */
  skipGroupLoad?: boolean;
}

interface PartnerInfo {
  emoji: string | null;
  currencyCode: string | null;
  partnerName: string;
}

export function useSplitwiseForm({
  initialGroupId,
  initialGroupName,
  initialCurrencyCode,
  initialEmoji = "✅",
  initialSplitRatio = "1:1",
  initialUseDescriptionAsPayee = true,
  initialCustomPayeeName,
  isSecondary = false,
  persona = null,
  skipGroupLoad = false,
}: UseSplitwiseFormOptions = {}) {
  const [isLoading, setIsLoading] = useState(!skipGroupLoad);
  const [error, setError] = useState<string | null>(null);

  const [validGroups, setValidGroups] = useState<SplitwiseGroup[]>([]);
  const [invalidGroups, setInvalidGroups] = useState<SplitwiseGroup[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || "");
  const [selectedGroupName, setSelectedGroupName] = useState(
    initialGroupName || "",
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    initialCurrencyCode || "",
  );
  const [selectedEmoji, setSelectedEmoji] = useState(initialEmoji || "✅");
  const [selectedSplitRatio, setSelectedSplitRatio] = useState(() => {
    const initial = initialSplitRatio || "1:1";
    if (SPLIT_RATIO_PRESETS.find((p) => p.value === initial)) {
      return initial;
    }
    return "custom";
  });
  const [customSplitRatio, setCustomSplitRatio] = useState(() => {
    const initial = initialSplitRatio || "1:1";
    if (!SPLIT_RATIO_PRESETS.find((p) => p.value === initial)) {
      return initial;
    }
    return "";
  });
  const [useDescriptionAsPayee, setUseDescriptionAsPayee] = useState(
    initialUseDescriptionAsPayee ?? true,
  );
  const [customPayeeName, setCustomPayeeName] = useState(
    initialCustomPayeeName || "Splitwise for YNAB",
  );

  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [isEmojiConflict, setIsEmojiConflict] = useState(false);
  const [partnerSynced, setPartnerSynced] = useState(false);

  const groupsLoadedRef = useRef(false);

  // Load groups
  const loadGroups = useCallback(async () => {
    if (skipGroupLoad) return;

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
  }, [skipGroupLoad]);

  // Check partner emoji for a group
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
          } else {
            setIsEmojiConflict(false);
          }
        } else {
          setPartnerInfo(null);
          setIsEmojiConflict(false);
        }
      } catch (err) {
        console.error("Error checking partner emoji:", err);
      }
    },
    [selectedCurrency, selectedEmoji],
  );

  // Check partner sync status
  const checkPartnerSync = useCallback(async () => {
    try {
      const syncStatus = await checkPartnerSyncStatus();
      if (syncStatus?.recentlyUpdated) {
        setPartnerSynced(true);
      }
    } catch (err) {
      console.error("Error checking partner sync:", err);
    }
  }, []);

  // Load groups on mount (only once, skip for secondary)
  useEffect(() => {
    if (!groupsLoadedRef.current && !isSecondary && !skipGroupLoad) {
      loadGroups();
      groupsLoadedRef.current = true;
    }
    checkPartnerSync();
  }, [loadGroups, isSecondary, skipGroupLoad, checkPartnerSync]);

  // Check partner emoji when group changes
  useEffect(() => {
    if (selectedGroupId && !isSecondary) {
      checkPartnerEmoji(selectedGroupId);
    }
  }, [selectedGroupId, checkPartnerEmoji, isSecondary]);

  // Check emoji conflict
  useEffect(() => {
    if (partnerInfo && selectedEmoji === partnerInfo.emoji) {
      setIsEmojiConflict(true);
    } else {
      setIsEmojiConflict(false);
    }
  }, [selectedEmoji, partnerInfo]);

  function suggestDifferentEmoji(partnerEmoji: string | null) {
    if (!partnerEmoji) return;
    const available = SUGGESTED_EMOJIS.filter((e) => e !== partnerEmoji);
    if (available.length > 0) {
      // Prefer ✅ if available, otherwise take the first available
      const preferred = available.includes("✅") ? "✅" : available[0];
      if (preferred) setSelectedEmoji(preferred);
    }
  }

  async function handleGroupChange(groupId: string) {
    const group = validGroups.find((g) => g.id.toString() === groupId);
    setSelectedGroupId(groupId);
    setSelectedGroupName(group?.name || "");
  }

  function handleEmojiChange(emoji: string) {
    setSelectedEmoji(emoji);
    if (partnerInfo && emoji === partnerInfo.emoji) {
      setIsEmojiConflict(true);
    } else {
      setIsEmojiConflict(false);
    }
  }

  function handleSplitRatioChange(value: string) {
    setSelectedSplitRatio(value);
    if (value !== "custom") {
      setCustomSplitRatio("");
    }
  }

  function handlePayeeModeChange(useDescription: boolean) {
    setUseDescriptionAsPayee(useDescription);
  }

  // Get the final split ratio value (preset or custom)
  const finalSplitRatio =
    selectedSplitRatio === "custom" ? customSplitRatio : selectedSplitRatio;

  // Validation
  const isValid = isSecondary
    ? Boolean(selectedEmoji && !isEmojiConflict)
    : Boolean(
        selectedGroupId &&
          selectedCurrency &&
          selectedEmoji &&
          !isEmojiConflict,
      );

  return {
    // State
    isLoading,
    error,
    setError,
    validGroups,
    invalidGroups,
    selectedGroupId,
    selectedGroupName,
    selectedCurrency,
    setSelectedCurrency,
    selectedEmoji,
    selectedSplitRatio,
    customSplitRatio,
    setCustomSplitRatio,
    useDescriptionAsPayee,
    customPayeeName,
    setCustomPayeeName,
    partnerInfo,
    isEmojiConflict,
    partnerSynced,
    finalSplitRatio,
    isValid,

    // Actions
    loadGroups,
    handleGroupChange,
    handleEmojiChange,
    handleSplitRatioChange,
    handlePayeeModeChange,
    suggestDifferentEmoji,
  };
}
