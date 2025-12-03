"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSplitwiseGroupsForUser,
  getPartnerEmoji,
  checkSecondaryInGroup,
  checkInviteInGroup,
  detectExistingGroupUser,
} from "@/app/actions/splitwise";
import type { SplitwiseGroup } from "@/types/splitwise";
import { SUGGESTED_EMOJIS } from "@/lib/utils";

// Re-export for backwards compatibility
export { SUGGESTED_EMOJIS };

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

// Common split ratios for easy selection
export const SPLIT_RATIO_PRESETS = [
  { value: "1:1", label: "Equal Split (1:1)" },
  { value: "2:1", label: "I Pay More (2:1)" },
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
  /** If true, user is primary with a secondary partner */
  isPrimary?: boolean;
  /** If true, user has a pending invite (waiting for partner) */
  hasPendingInvite?: boolean;
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

interface SecondaryOrphanWarning {
  /** Whether the secondary will be orphaned if this group is saved */
  willBeOrphaned: boolean;
  /** Name of the secondary who will be orphaned */
  secondaryName: string;
  /** Whether we're currently checking secondary membership */
  isChecking: boolean;
}

interface InviteExpireWarning {
  /** Whether the pending invite will be expired if this group is saved */
  willBeExpired: boolean;
  /** Name/email of the invitee whose invite will be expired */
  inviteeName: string;
  /** Whether we're currently checking invite validity */
  isChecking: boolean;
}

interface GroupConflictWarning {
  /** Whether the group is in use by another user */
  hasConflict: boolean;
  /** Name of the user who owns the group */
  ownerName: string;
  /** Persona of the owner (solo or dual) */
  ownerPersona: "solo" | "dual" | null;
  /** Whether they already have a partner */
  ownerHasPartner: boolean;
  /** Whether we're currently checking */
  isChecking: boolean;
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
  isPrimary = false,
  hasPendingInvite = false,
  persona = null,
  skipGroupLoad = false,
}: UseSplitwiseFormOptions = {}) {
  const [isLoading, setIsLoading] = useState(!skipGroupLoad);
  const [error, setError] = useState<string | null>(null);

  const [validGroups, setValidGroups] = useState<SplitwiseGroup[]>([]);
  const [invalidGroups, setInvalidGroups] = useState<SplitwiseGroup[]>([]);

  // Secondary orphan warning state (for primary users changing groups)
  const [secondaryOrphanWarning, setSecondaryOrphanWarning] =
    useState<SecondaryOrphanWarning>({
      willBeOrphaned: false,
      secondaryName: "",
      isChecking: false,
    });

  // Invite expire warning state (for primary users with pending invites changing groups)
  const [inviteExpireWarning, setInviteExpireWarning] =
    useState<InviteExpireWarning>({
      willBeExpired: false,
      inviteeName: "",
      isChecking: false,
    });

  // Group conflict warning state (for users selecting a group already in use)
  const [groupConflictWarning, setGroupConflictWarning] =
    useState<GroupConflictWarning>({
      hasConflict: false,
      ownerName: "",
      ownerPersona: null,
      ownerHasPartner: false,
      isChecking: false,
    });

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

  // Load groups on mount (only once, skip for secondary)
  useEffect(() => {
    if (!groupsLoadedRef.current && !isSecondary && !skipGroupLoad) {
      loadGroups();
      groupsLoadedRef.current = true;
    }
  }, [loadGroups, isSecondary, skipGroupLoad]);

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

    // If returning to original group, clear all warnings
    if (groupId === initialGroupId) {
      setSecondaryOrphanWarning({
        willBeOrphaned: false,
        secondaryName: "",
        isChecking: false,
      });
      setInviteExpireWarning({
        willBeExpired: false,
        inviteeName: "",
        isChecking: false,
      });
      setGroupConflictWarning({
        hasConflict: false,
        ownerName: "",
        ownerPersona: null,
        ownerHasPartner: false,
        isChecking: false,
      });
      return;
    }

    // Check if this group is already in use by another user (not a partner)
    // This prevents ex-secondaries from selecting their old shared group
    if (groupId && groupId !== initialGroupId) {
      setGroupConflictWarning((prev) => ({
        ...prev,
        isChecking: true,
        hasConflict: false,
      }));

      try {
        const result = await detectExistingGroupUser(groupId);

        if (result) {
          // Group is in use by someone we're not partnered with
          setGroupConflictWarning({
            hasConflict: true,
            ownerName: result.name || "Another user",
            ownerPersona: result.persona,
            ownerHasPartner: result.hasPartner || false,
            isChecking: false,
          });
        } else {
          setGroupConflictWarning({
            hasConflict: false,
            ownerName: "",
            ownerPersona: null,
            ownerHasPartner: false,
            isChecking: false,
          });
        }
      } catch (err) {
        console.error("Error checking group conflict:", err);
        setGroupConflictWarning({
          hasConflict: false,
          ownerName: "",
          ownerPersona: null,
          ownerHasPartner: false,
          isChecking: false,
        });
      }
    }

    // If this is a primary user and they're changing to a different group,
    // check if their secondary partner is in the new group
    if (isPrimary && groupId !== initialGroupId && groupId) {
      setSecondaryOrphanWarning((prev) => ({
        ...prev,
        isChecking: true,
        willBeOrphaned: false,
      }));

      try {
        const result = await checkSecondaryInGroup(groupId);

        if (result.success && result.hasSecondary) {
          setSecondaryOrphanWarning({
            willBeOrphaned: !result.secondaryInGroup,
            secondaryName: result.secondaryName || "Partner",
            isChecking: false,
          });
        } else {
          setSecondaryOrphanWarning({
            willBeOrphaned: false,
            secondaryName: "",
            isChecking: false,
          });
        }
      } catch (err) {
        console.error("Error checking secondary in group:", err);
        setSecondaryOrphanWarning({
          willBeOrphaned: false,
          secondaryName: "",
          isChecking: false,
        });
      }
    }

    // If user has a pending invite and they're changing to a different group,
    // check if the invitee is in the new group
    if (hasPendingInvite && groupId !== initialGroupId && groupId) {
      setInviteExpireWarning((prev) => ({
        ...prev,
        isChecking: true,
        willBeExpired: false,
      }));

      try {
        const result = await checkInviteInGroup(groupId);

        if (result.success && result.hasInvite) {
          setInviteExpireWarning({
            willBeExpired: !result.inviteeInGroup,
            inviteeName: result.inviteeName || "Partner",
            isChecking: false,
          });
        } else {
          setInviteExpireWarning({
            willBeExpired: false,
            inviteeName: "",
            isChecking: false,
          });
        }
      } catch (err) {
        console.error("Error checking invite in group:", err);
        setInviteExpireWarning({
          willBeExpired: false,
          inviteeName: "",
          isChecking: false,
        });
      }
    }
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

  // Validation - also check for group conflicts
  const isValid = isSecondary
    ? Boolean(selectedEmoji && !isEmojiConflict)
    : Boolean(
        selectedGroupId &&
          selectedCurrency &&
          selectedEmoji &&
          !isEmojiConflict &&
          !groupConflictWarning.hasConflict,
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
    finalSplitRatio,
    isValid,
    secondaryOrphanWarning,
    inviteExpireWarning,
    groupConflictWarning,

    // Actions
    loadGroups,
    handleGroupChange,
    handleEmojiChange,
    handleSplitRatioChange,
    handlePayeeModeChange,
    suggestDifferentEmoji,
  };
}
