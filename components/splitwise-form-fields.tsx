"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SPLIT_RATIO_PRESETS } from "@/hooks/use-splitwise-form";
import { CURRENCY_OPTIONS, COMMON_CURRENCIES } from "@/lib/currencies";
import type { SplitwiseGroup } from "@/types/splitwise";
import {
  ChevronDown,
  Info,
  AlertCircle,
  Lock,
  Users,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  cn,
  SUGGESTED_EMOJIS,
  isValidEmoji,
  getEmojiKeyboardHint,
} from "@/lib/utils";
import Image from "next/image";

// =============================================================================
// SHARED COMPONENTS
// =============================================================================

/** Reusable group selector dropdown */
function GroupSelector({
  validGroups,
  invalidGroups,
  selectedGroupId,
  isLoading,
  onGroupChange,
  variant = "default",
}: {
  validGroups: SplitwiseGroup[];
  invalidGroups: SplitwiseGroup[];
  selectedGroupId: string;
  isLoading: boolean;
  onGroupChange: (groupId: string) => void;
  variant?: "default" | "shared";
}) {
  const triggerClass =
    variant === "shared"
      ? "bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700"
      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700";

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="groupId">Splitwise Group</Label>
        <Select value={selectedGroupId} onValueChange={onGroupChange}>
          <SelectTrigger className={triggerClass}>
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
    </>
  );
}

/** Reusable currency selector with grouped options */
function CurrencySelector({
  selectedCurrency,
  budgetCurrency,
  onCurrencyChange,
  variant = "default",
  showDescription = true,
}: {
  selectedCurrency: string;
  budgetCurrency?: string | null;
  onCurrencyChange: (currency: string) => void;
  variant?: "default" | "shared";
  showDescription?: boolean;
}) {
  const triggerClass =
    variant === "shared"
      ? "bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-700"
      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700";

  // Separate common and all currencies
  const commonCurrencies = CURRENCY_OPTIONS.filter((c) => c.group === "common");
  const allCurrencies = CURRENCY_OPTIONS.filter((c) => c.group === "all");

  return (
    <div className="space-y-2">
      <Label htmlFor="currencyCode">Currency</Label>
      {showDescription && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Used when creating Splitwise transactions. Should usually match your
          YNAB plan
        </p>
      )}
      <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
        <SelectTrigger className={triggerClass}>
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {/* Common Currencies Group */}
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 -mx-1 mb-1">
            ⭐ Common Currencies
          </div>
          {commonCurrencies.map((currency) => (
            <SelectItem key={currency.value} value={currency.value}>
              <span className="font-medium">{currency.value}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                {currency.label}
              </span>
              {currency.value === budgetCurrency && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  (YNAB)
                </span>
              )}
            </SelectItem>
          ))}

          {/* All Currencies Group */}
          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 -mx-1 mt-2 mb-1">
            All Currencies
          </div>
          {allCurrencies.map((currency) => (
            <SelectItem key={currency.value} value={currency.value}>
              <span className="font-medium">{currency.value}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                {currency.label}
              </span>
              {currency.value === budgetCurrency && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  (YNAB)
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Reusable split ratio selector */
function SplitRatioSelector({
  selectedSplitRatio,
  customSplitRatio,
  onSplitRatioChange,
  onCustomSplitRatioChange,
  partnerName,
}: {
  selectedSplitRatio: string;
  customSplitRatio: string;
  onSplitRatioChange: (ratio: string) => void;
  onCustomSplitRatioChange: (ratio: string) => void;
  partnerName?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>Split Ratio</Label>
      <p className="text-sm text-gray-500">
        How expenses are split between you and {partnerName || "your partner"}
      </p>
      <Select value={selectedSplitRatio} onValueChange={onSplitRatioChange}>
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
          onChange={(e) => onCustomSplitRatioChange(e.target.value)}
          placeholder="Enter ratio like 3:2 or 5:3"
          pattern="^\d+:\d+$"
          className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        />
      )}
    </div>
  );
}

/** Reusable emoji picker */
function EmojiPicker({
  selectedEmoji,
  excludeEmoji,
  onEmojiChange,
  partnerName,
  partnerEmoji,
  isEmojiConflict,
  required = false,
  size = "medium",
}: {
  selectedEmoji: string;
  excludeEmoji?: string | null;
  onEmojiChange: (emoji: string) => void;
  partnerName?: string;
  partnerEmoji?: string | null;
  isEmojiConflict?: boolean;
  required?: boolean;
  size?: "small" | "medium" | "large";
}) {
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const sizeClasses = {
    small: "h-9 w-9 text-lg",
    medium: "h-10 w-10 text-xl",
    large: "h-12 w-12 text-2xl",
  };

  const availableEmojis = excludeEmoji
    ? SUGGESTED_EMOJIS.filter((e) => e !== excludeEmoji)
    : SUGGESTED_EMOJIS;

  const isCustomSelected =
    selectedEmoji && !SUGGESTED_EMOJIS.includes(selectedEmoji);

  // Initialize custom input if selectedEmoji is custom
  useState(() => {
    if (isCustomSelected) {
      setCustomInput(selectedEmoji);
      setShowCustomInput(true);
    }
  });

  const handleCustomInputChange = (value: string) => {
    setCustomInput(value);
    // Only update the emoji if it's a valid emoji
    if (value.trim() && isValidEmoji(value.trim())) {
      onEmojiChange(value.trim());
    }
  };

  const isInputValid = !customInput || isValidEmoji(customInput.trim());

  return (
    <div className="space-y-3">
      <div>
        <Label className="flex items-center gap-1">
          Your Sync Marker
          {required && <span className="text-red-500">*</span>}
        </Label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          We add this emoji to your synced expenses in Splitwise.
          {partnerEmoji && partnerName && (
            <span className="ml-1">
              ({partnerName} uses {partnerEmoji})
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableEmojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onEmojiChange(emoji);
              setShowCustomInput(false);
              setCustomInput("");
            }}
            className={cn(
              "rounded-lg flex items-center justify-center transition-all",
              sizeClasses[size],
              selectedEmoji === emoji
                ? "bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700",
            )}
          >
            {emoji}
          </button>
        ))}
        {/* Custom emoji button */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className={cn(
            "rounded-lg flex items-center justify-center transition-all text-sm font-medium",
            sizeClasses[size],
            showCustomInput || isCustomSelected
              ? "bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500"
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400",
          )}
          title="Use a different emoji"
        >
          {isCustomSelected ? selectedEmoji : "..."}
        </button>
      </div>

      {/* Custom input field */}
      {showCustomInput && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Input
              value={customInput}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              placeholder={getEmojiKeyboardHint()}
              className={cn(
                "max-w-[200px] bg-gray-50 dark:bg-gray-900",
                !isInputValid
                  ? "border-red-300 dark:border-red-700"
                  : "border-gray-200 dark:border-gray-700",
              )}
              maxLength={10}
            />
            <span className="text-xs text-gray-500">e.g. 🏠 🎯 💰</span>
          </div>
          {!isInputValid && (
            <p className="text-xs text-red-500">Please enter a valid emoji</p>
          )}
        </div>
      )}

      {required && !selectedEmoji && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          👆 Please select your sync marker
        </p>
      )}

      {isEmojiConflict && partnerName && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please choose a different emoji—{partnerName} is using &quot;
            {partnerEmoji}&quot;.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/** Solo emoji picker with custom input support */
function SoloEmojiPicker({
  selectedEmoji,
  onEmojiChange,
}: {
  selectedEmoji: string;
  onEmojiChange: (emoji: string) => void;
}) {
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const isCustomSelected =
    selectedEmoji && !SUGGESTED_EMOJIS.includes(selectedEmoji);

  // Initialize custom input if selectedEmoji is custom
  useState(() => {
    if (isCustomSelected) {
      setCustomInput(selectedEmoji);
      setShowCustomInput(true);
    }
  });

  const handleCustomInputChange = (value: string) => {
    setCustomInput(value);
    // Only update the emoji if it's a valid emoji
    if (value.trim() && isValidEmoji(value.trim())) {
      onEmojiChange(value.trim());
    }
  };

  const isInputValid = !customInput || isValidEmoji(customInput.trim());

  return (
    <div className="space-y-2">
      <Label>Sync Marker Emoji</Label>
      <p className="text-sm text-gray-500 -mt-1">
        We add this emoji to Splitwise expenses to track synced items
      </p>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onEmojiChange(emoji);
              setShowCustomInput(false);
              setCustomInput("");
            }}
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
        {/* Custom emoji button */}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className={cn(
            "h-9 w-9 rounded-lg text-lg flex items-center justify-center transition-all font-medium",
            showCustomInput || isCustomSelected
              ? "bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-500"
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400",
          )}
          title="Use a different emoji"
        >
          {isCustomSelected ? selectedEmoji : "..."}
        </button>
      </div>

      {/* Custom input field */}
      {showCustomInput && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Input
              value={customInput}
              onChange={(e) => handleCustomInputChange(e.target.value)}
              placeholder={getEmojiKeyboardHint()}
              className={cn(
                "max-w-[200px] bg-gray-50 dark:bg-gray-900",
                !isInputValid
                  ? "border-red-300 dark:border-red-700"
                  : "border-gray-200 dark:border-gray-700",
              )}
              maxLength={10}
            />
            <span className="text-xs text-gray-500">e.g. 🏠 🎯 💰</span>
          </div>
          {!isInputValid && (
            <p className="text-xs text-red-500">Please enter a valid emoji</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Reusable payee settings */
function PayeeSettings({
  useDescriptionAsPayee,
  customPayeeName,
  onPayeeModeChange,
  onCustomPayeeNameChange,
  idPrefix,
}: {
  useDescriptionAsPayee: boolean;
  customPayeeName: string;
  onPayeeModeChange: (useDescription: boolean) => void;
  onCustomPayeeNameChange: (name: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-3">
      <Label>YNAB Payee Name</Label>
      <RadioGroup
        value={useDescriptionAsPayee ? "description" : "custom"}
        onValueChange={(v) => onPayeeModeChange(v === "description")}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="description" id={`${idPrefix}-payee-desc`} />
          <Label
            htmlFor={`${idPrefix}-payee-desc`}
            className="font-normal cursor-pointer"
          >
            Use Splitwise description as payee name (recommended)
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="custom" id={`${idPrefix}-payee-custom`} />
          <Label
            htmlFor={`${idPrefix}-payee-custom`}
            className="font-normal cursor-pointer"
          >
            Use custom payee name, put description in memo
          </Label>
        </div>
      </RadioGroup>
      {!useDescriptionAsPayee && (
        <>
          <Input
            value={customPayeeName}
            onChange={(e) => onCustomPayeeNameChange(e.target.value)}
            placeholder="e.g., Splitwise Expenses"
            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          />
          <p className="text-sm text-muted-foreground">
            This will be{" "}
            <strong>the payee name for every Splitwise transaction</strong> we
            send to YNAB.
          </p>
        </>
      )}
    </div>
  );
}

// =============================================================================
// SOLO FORM FIELDS
// =============================================================================

interface SplitwiseSoloFormFieldsProps {
  // Data
  validGroups: SplitwiseGroup[];
  invalidGroups: SplitwiseGroup[];
  isLoading: boolean;

  // Selected values
  selectedGroupId: string;
  selectedCurrency: string;
  selectedEmoji: string;
  selectedSplitRatio: string;
  customSplitRatio: string;
  useDescriptionAsPayee: boolean;
  customPayeeName: string;

  // Advanced settings
  showAdvanced: boolean;
  onShowAdvancedChange: (show: boolean) => void;

  // Handlers
  onGroupChange: (groupId: string) => void;
  onCurrencyChange: (currency: string) => void;
  onEmojiChange: (emoji: string) => void;
  onSplitRatioChange: (ratio: string) => void;
  onCustomSplitRatioChange: (ratio: string) => void;
  onPayeeModeChange: (useDescription: boolean) => void;
  onCustomPayeeNameChange: (name: string) => void;

  // Optional
  budgetCurrency?: string | null;

  // Group conflict warning (when selecting a group already in use)
  groupConflictWarning?: {
    hasConflict: boolean;
    ownerName: string;
    ownerPersona: "solo" | "dual" | null;
    ownerHasPartner: boolean;
    isChecking: boolean;
  };
}

/**
 * Form fields for solo users (no partner sharing)
 */
export function SplitwiseSoloFormFields({
  validGroups,
  invalidGroups,
  isLoading,
  selectedGroupId,
  selectedCurrency,
  selectedEmoji,
  selectedSplitRatio,
  customSplitRatio,
  useDescriptionAsPayee,
  customPayeeName,
  showAdvanced,
  onShowAdvancedChange,
  onGroupChange,
  onCurrencyChange,
  onEmojiChange,
  onSplitRatioChange,
  onCustomSplitRatioChange,
  onPayeeModeChange,
  onCustomPayeeNameChange,
  budgetCurrency,
  groupConflictWarning,
}: SplitwiseSoloFormFieldsProps) {
  return (
    <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
      <GroupSelector
        validGroups={validGroups}
        invalidGroups={invalidGroups}
        selectedGroupId={selectedGroupId}
        isLoading={isLoading}
        onGroupChange={onGroupChange}
      />

      {/* Group conflict warning */}
      {groupConflictWarning?.isChecking && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking group availability...</span>
        </div>
      )}

      {groupConflictWarning?.hasConflict && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            {groupConflictWarning.ownerPersona === "dual" ? (
              <>
                This group is already used by{" "}
                <strong>{groupConflictWarning.ownerName}</strong>.
                {groupConflictWarning.ownerHasPartner ? (
                  <>
                    {" "}
                    Their Duo account is full. Please select a different group.
                  </>
                ) : (
                  <> Ask them to invite you to their Duo account.</>
                )}
              </>
            ) : (
              <>
                This group is already used by{" "}
                <strong>{groupConflictWarning.ownerName}</strong> (Solo mode).
                To share this group, ask them to switch to Duo mode and invite
                you.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Advanced settings */}
      <Collapsible open={showAdvanced} onOpenChange={onShowAdvancedChange}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
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
        <CollapsibleContent className="mt-4 space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <CurrencySelector
            selectedCurrency={selectedCurrency}
            budgetCurrency={budgetCurrency}
            onCurrencyChange={onCurrencyChange}
          />

          <SplitRatioSelector
            selectedSplitRatio={selectedSplitRatio}
            customSplitRatio={customSplitRatio}
            onSplitRatioChange={onSplitRatioChange}
            onCustomSplitRatioChange={onCustomSplitRatioChange}
          />

          <PayeeSettings
            useDescriptionAsPayee={useDescriptionAsPayee}
            customPayeeName={customPayeeName}
            onPayeeModeChange={onPayeeModeChange}
            onCustomPayeeNameChange={onCustomPayeeNameChange}
            idPrefix="solo"
          />

          <SoloEmojiPicker
            selectedEmoji={selectedEmoji}
            onEmojiChange={onEmojiChange}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// =============================================================================
// PRIMARY FORM FIELDS (Dual mode - manages shared settings)
// =============================================================================

interface SplitwisePrimaryFormFieldsProps {
  // Data
  validGroups: SplitwiseGroup[];
  invalidGroups: SplitwiseGroup[];
  isLoading: boolean;

  // Partner info
  partnerName: string;
  partnerEmoji?: string | null;
  isEmojiConflict: boolean;

  // Selected values
  selectedGroupId: string;
  selectedCurrency: string;
  selectedEmoji: string;
  selectedSplitRatio: string;
  customSplitRatio: string;
  useDescriptionAsPayee: boolean;
  customPayeeName: string;

  // Handlers
  onGroupChange: (groupId: string) => void;
  onCurrencyChange: (currency: string) => void;
  onEmojiChange: (emoji: string) => void;
  onSplitRatioChange: (ratio: string) => void;
  onCustomSplitRatioChange: (ratio: string) => void;
  onPayeeModeChange: (useDescription: boolean) => void;
  onCustomPayeeNameChange: (name: string) => void;

  // Advanced settings
  showAdvanced?: boolean;
  onShowAdvancedChange?: (show: boolean) => void;

  // Optional
  budgetCurrency?: string | null;
  showRoleExplanation?: boolean;

  // Secondary orphan warning (when primary changes to a group where secondary isn't a member)
  secondaryOrphanWarning?: {
    willBeOrphaned: boolean;
    secondaryName: string;
    isChecking: boolean;
  };

  // Invite expire warning (when primary changes to a group where invitee isn't a member)
  inviteExpireWarning?: {
    willBeExpired: boolean;
    inviteeName: string;
    isChecking: boolean;
  };

  // Group conflict warning (when selecting a group already in use by a non-partner)
  groupConflictWarning?: {
    hasConflict: boolean;
    ownerName: string;
    ownerPersona: "solo" | "dual" | null;
    ownerHasPartner: boolean;
    isChecking: boolean;
  };
}

/**
 * Form fields for primary user in dual mode (manages shared settings)
 */
export function SplitwisePrimaryFormFields({
  validGroups,
  invalidGroups,
  isLoading,
  partnerName,
  partnerEmoji,
  isEmojiConflict,
  selectedGroupId,
  selectedCurrency,
  selectedEmoji,
  selectedSplitRatio,
  customSplitRatio,
  useDescriptionAsPayee,
  customPayeeName,
  onGroupChange,
  onCurrencyChange,
  onEmojiChange,
  onSplitRatioChange,
  onCustomSplitRatioChange,
  onPayeeModeChange,
  onCustomPayeeNameChange,
  showAdvanced = false,
  onShowAdvancedChange,
  budgetCurrency,
  showRoleExplanation = true,
  secondaryOrphanWarning,
  inviteExpireWarning,
  groupConflictWarning,
}: SplitwisePrimaryFormFieldsProps) {
  // Use internal state if no external control provided
  const [internalShowAdvanced, setInternalShowAdvanced] =
    useState(showAdvanced);
  const isAdvancedOpen = onShowAdvancedChange
    ? showAdvanced
    : internalShowAdvanced;
  const handleAdvancedChange = onShowAdvancedChange || setInternalShowAdvanced;

  return (
    <div className="space-y-6">
      {/* Role explanation */}
      {showRoleExplanation && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <p>
            <strong>As Primary:</strong> You manage the shared Splitwise
            settings (group, split ratio). {partnerName} inherits these
            settings.
          </p>
        </div>
      )}

      {/* Shared settings card */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
          <Users className="h-4 w-4" />
          <span className="font-medium">Shared with {partnerName}</span>
        </div>

        <GroupSelector
          validGroups={validGroups}
          invalidGroups={invalidGroups}
          selectedGroupId={selectedGroupId}
          isLoading={isLoading}
          onGroupChange={onGroupChange}
          variant="shared"
        />

        {/* Secondary orphan warning */}
        {secondaryOrphanWarning?.isChecking && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking if {partnerName} is in this group...</span>
          </div>
        )}

        {secondaryOrphanWarning?.willBeOrphaned && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>{secondaryOrphanWarning.secondaryName}</strong> is not a
              member of this Splitwise group. If you save, they&apos;ll be
              disconnected from your Duo account and converted to a Solo
              account. They&apos;ll need to reconfigure their own Splitwise
              settings to continue syncing.
            </AlertDescription>
          </Alert>
        )}

        {/* Invite expire warning */}
        {inviteExpireWarning?.isChecking && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking if your invited partner is in this group...</span>
          </div>
        )}

        {inviteExpireWarning?.willBeExpired && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>{inviteExpireWarning.inviteeName}</strong> is not a member
              of this Splitwise group. If you save, their pending invite will be
              cancelled.
            </AlertDescription>
          </Alert>
        )}

        {/* Group conflict warning */}
        {groupConflictWarning?.isChecking && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Checking group availability...</span>
          </div>
        )}

        {groupConflictWarning?.hasConflict && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {groupConflictWarning.ownerPersona === "dual" ? (
                <>
                  This group is already used by{" "}
                  <strong>{groupConflictWarning.ownerName}</strong>.
                  {groupConflictWarning.ownerHasPartner ? (
                    <>
                      {" "}
                      Their Duo account is full. Please select a different
                      group.
                    </>
                  ) : (
                    <> Ask them to invite you to their Duo account.</>
                  )}
                </>
              ) : (
                <>
                  This group is already used by{" "}
                  <strong>{groupConflictWarning.ownerName}</strong> (Solo mode).
                  To share this group, ask them to switch to Duo mode and invite
                  you.
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <SplitRatioSelector
          selectedSplitRatio={selectedSplitRatio}
          customSplitRatio={customSplitRatio}
          onSplitRatioChange={onSplitRatioChange}
          onCustomSplitRatioChange={onCustomSplitRatioChange}
          partnerName={partnerName}
        />

        {/* Advanced shared settings */}
        <Collapsible open={isAdvancedOpen} onOpenChange={handleAdvancedChange}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 p-0 h-auto hover:bg-transparent"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isAdvancedOpen && "rotate-180",
                )}
              />
              Advanced shared settings
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              budgetCurrency={budgetCurrency}
              onCurrencyChange={onCurrencyChange}
              variant="shared"
            />
          </CollapsibleContent>
        </Collapsible>

        <p className="text-xs text-blue-600 dark:text-blue-400">
          {partnerName} will use these same settings.
        </p>
      </div>

      {/* Your settings card */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
        <EmojiPicker
          selectedEmoji={selectedEmoji}
          excludeEmoji={partnerEmoji}
          onEmojiChange={onEmojiChange}
          partnerName={partnerName}
          partnerEmoji={partnerEmoji}
          isEmojiConflict={isEmojiConflict}
          required
          size="large"
        />

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <PayeeSettings
            useDescriptionAsPayee={useDescriptionAsPayee}
            customPayeeName={customPayeeName}
            onPayeeModeChange={onPayeeModeChange}
            onCustomPayeeNameChange={onCustomPayeeNameChange}
            idPrefix="primary"
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SECONDARY FORM FIELDS (Dual mode - read-only shared settings)
// =============================================================================

interface SplitwiseSecondaryFormFieldsProps {
  // Inherited shared settings (read-only)
  groupName: string;
  currencyCode: string;
  splitRatio: string;
  partnerName: string;

  // Editable settings
  selectedEmoji: string;
  useDescriptionAsPayee: boolean;
  customPayeeName: string;

  // Partner info for emoji conflict
  partnerEmoji?: string | null;
  isEmojiConflict: boolean;

  // Handlers
  onEmojiChange: (emoji: string) => void;
  onPayeeModeChange: (useDescription: boolean) => void;
  onCustomPayeeNameChange: (name: string) => void;

  // Role explanation
  showRoleExplanation?: boolean;
}

/**
 * Form fields for secondary user in dual mode (read-only shared settings)
 */
export function SplitwiseSecondaryFormFields({
  groupName,
  currencyCode,
  splitRatio,
  partnerName,
  selectedEmoji,
  useDescriptionAsPayee,
  customPayeeName,
  partnerEmoji,
  isEmojiConflict,
  onEmojiChange,
  onPayeeModeChange,
  onCustomPayeeNameChange,
  showRoleExplanation = true,
}: SplitwiseSecondaryFormFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Role explanation */}
      {showRoleExplanation && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
          <p>
            <strong>As Secondary:</strong> You share {partnerName}&apos;s
            Splitwise group settings. You can customize your own sync marker and
            payee preferences.
          </p>
        </div>
      )}

      {/* Shared settings (read-only) */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200 mb-3">
          <Users className="h-4 w-4" />
          <span className="font-medium">Shared with {partnerName}</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Group
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {groupName || "Shared group"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Currency
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {currencyCode || "USD"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Split Ratio
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {splitRatio || "1:1"}
            </span>
          </div>
        </div>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
          These settings are managed by {partnerName || "your partner"}.
        </p>
      </div>

      {/* Your settings card */}
      <div className="bg-white dark:bg-[#141414] border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-6">
        <EmojiPicker
          selectedEmoji={selectedEmoji}
          excludeEmoji={partnerEmoji}
          onEmojiChange={onEmojiChange}
          partnerName={partnerName}
          partnerEmoji={partnerEmoji}
          isEmojiConflict={isEmojiConflict}
          required
          size="large"
        />

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <PayeeSettings
            useDescriptionAsPayee={useDescriptionAsPayee}
            customPayeeName={customPayeeName}
            onPayeeModeChange={onPayeeModeChange}
            onCustomPayeeNameChange={onCustomPayeeNameChange}
            idPrefix="secondary"
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// PRIMARY ROLE CARD (for settings page)
// =============================================================================

interface SplitwisePrimaryRoleCardProps {
  partnerName: string | null;
}

export function SplitwisePrimaryRoleCard({
  partnerName,
}: SplitwisePrimaryRoleCardProps) {
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
      <p>
        <strong>As Primary:</strong> You manage the shared Splitwise settings
        (group, currency, split ratio).
        {partnerName
          ? ` ${partnerName} inherits these settings.`
          : " Your partner will inherit these settings."}
      </p>
    </div>
  );
}

// =============================================================================
// LEGACY EXPORT (for backwards compatibility during migration)
// =============================================================================

interface SplitwiseFormFieldsProps {
  validGroups: SplitwiseGroup[];
  invalidGroups: SplitwiseGroup[];
  isLoading: boolean;
  selectedGroupId: string;
  selectedGroupName: string;
  selectedCurrency: string;
  selectedEmoji: string;
  selectedSplitRatio: string;
  customSplitRatio: string;
  useDescriptionAsPayee: boolean;
  customPayeeName: string;
  partnerInfo: {
    emoji: string | null;
    currencyCode: string | null;
    partnerName: string;
  } | null;
  isEmojiConflict: boolean;
  showAdvanced: boolean;
  onShowAdvancedChange: (show: boolean) => void;
  onGroupChange: (groupId: string) => void;
  onCurrencyChange: (currency: string) => void;
  onEmojiChange: (emoji: string) => void;
  onSplitRatioChange: (ratio: string) => void;
  onCustomSplitRatioChange: (ratio: string) => void;
  onPayeeModeChange: (useDescription: boolean) => void;
  onCustomPayeeNameChange: (name: string) => void;
  isSolo?: boolean;
  isDual?: boolean;
  budgetCurrency?: string | null;
}

/**
 * @deprecated Use SplitwiseSoloFormFields, SplitwisePrimaryFormFields, or SplitwiseSecondaryFormFields instead
 */
export function SplitwiseFormFields({
  validGroups,
  invalidGroups,
  isLoading,
  selectedGroupId,
  selectedCurrency,
  selectedEmoji,
  selectedSplitRatio,
  customSplitRatio,
  useDescriptionAsPayee,
  customPayeeName,
  partnerInfo,
  isEmojiConflict,
  showAdvanced,
  onShowAdvancedChange,
  onGroupChange,
  onCurrencyChange,
  onEmojiChange,
  onSplitRatioChange,
  onCustomSplitRatioChange,
  onPayeeModeChange,
  onCustomPayeeNameChange,
  isSolo = false,
  isDual = false,
  budgetCurrency,
}: SplitwiseFormFieldsProps) {
  if (isSolo) {
    return (
      <SplitwiseSoloFormFields
        validGroups={validGroups}
        invalidGroups={invalidGroups}
        isLoading={isLoading}
        selectedGroupId={selectedGroupId}
        selectedCurrency={selectedCurrency}
        selectedEmoji={selectedEmoji}
        selectedSplitRatio={selectedSplitRatio}
        customSplitRatio={customSplitRatio}
        useDescriptionAsPayee={useDescriptionAsPayee}
        customPayeeName={customPayeeName}
        showAdvanced={showAdvanced}
        onShowAdvancedChange={onShowAdvancedChange}
        onGroupChange={onGroupChange}
        onCurrencyChange={onCurrencyChange}
        onEmojiChange={onEmojiChange}
        onSplitRatioChange={onSplitRatioChange}
        onCustomSplitRatioChange={onCustomSplitRatioChange}
        onPayeeModeChange={onPayeeModeChange}
        onCustomPayeeNameChange={onCustomPayeeNameChange}
        budgetCurrency={budgetCurrency}
      />
    );
  }

  if (isDual && partnerInfo) {
    return (
      <SplitwisePrimaryFormFields
        validGroups={validGroups}
        invalidGroups={invalidGroups}
        isLoading={isLoading}
        partnerName={partnerInfo.partnerName}
        partnerEmoji={partnerInfo.emoji}
        isEmojiConflict={isEmojiConflict}
        selectedGroupId={selectedGroupId}
        selectedCurrency={selectedCurrency}
        selectedEmoji={selectedEmoji}
        selectedSplitRatio={selectedSplitRatio}
        customSplitRatio={customSplitRatio}
        useDescriptionAsPayee={useDescriptionAsPayee}
        customPayeeName={customPayeeName}
        onGroupChange={onGroupChange}
        onCurrencyChange={onCurrencyChange}
        onEmojiChange={onEmojiChange}
        onSplitRatioChange={onSplitRatioChange}
        onCustomSplitRatioChange={onCustomSplitRatioChange}
        onPayeeModeChange={onPayeeModeChange}
        onCustomPayeeNameChange={onCustomPayeeNameChange}
        showAdvanced={showAdvanced}
        onShowAdvancedChange={onShowAdvancedChange}
        budgetCurrency={budgetCurrency}
        showRoleExplanation={false}
      />
    );
  }

  // Fallback to solo if no mode specified
  return (
    <SplitwiseSoloFormFields
      validGroups={validGroups}
      invalidGroups={invalidGroups}
      isLoading={isLoading}
      selectedGroupId={selectedGroupId}
      selectedCurrency={selectedCurrency}
      selectedEmoji={selectedEmoji}
      selectedSplitRatio={selectedSplitRatio}
      customSplitRatio={customSplitRatio}
      useDescriptionAsPayee={useDescriptionAsPayee}
      customPayeeName={customPayeeName}
      showAdvanced={showAdvanced}
      onShowAdvancedChange={onShowAdvancedChange}
      onGroupChange={onGroupChange}
      onCurrencyChange={onCurrencyChange}
      onEmojiChange={onEmojiChange}
      onSplitRatioChange={onSplitRatioChange}
      onCustomSplitRatioChange={onCustomSplitRatioChange}
      onPayeeModeChange={onPayeeModeChange}
      onCustomPayeeNameChange={onCustomPayeeNameChange}
      budgetCurrency={budgetCurrency}
    />
  );
}
