"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getYNABBudgetForUser } from "@/app/actions/ynab";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { YNABSettingsForm } from "@/components/ynab-settings-form";
import { SplitwiseSettingsForm } from "@/components/splitwise-settings-form";
import { Badge } from "@/components/ui/badge";
import { YNABFlag } from "@/components/ynab-flag";
import { updatePersonaWithPartnerHandling } from "@/app/actions/user";
import type { Persona } from "@/app/actions/user";
import type { PartnershipStatus } from "@/app/actions/db";
import { PartnerInviteCard } from "@/components/partner-invite-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, AlertTriangle, Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsContentProps {
  persona: string | null;
  ynabSettings: {
    budgetId?: string;
    budgetName?: string;
    splitwiseAccountId?: string | null;
    splitwiseAccountName?: string | null;
    manualFlagColor?: string;
    syncedFlagColor?: string;
  } | null;
  splitwiseSettings: {
    groupId?: string | null;
    groupName?: string | null;
    currencyCode?: string | null;
    emoji?: string | null;
    defaultSplitRatio?: string | null;
    useDescriptionAsPayee?: boolean | null;
    customPayeeName?: string | null;
  } | null;
  partnershipStatus: PartnershipStatus | null;
  /** If true, auto-expand Splitwise settings for reconfiguration (e.g., after orphan recovery) */
  reconfigure?: boolean;
}

interface ConfirmationState {
  isOpen: boolean;
  type: "primary_has_partner" | "secondary_leaving" | null;
  partnerName: string | null;
  groupName: string | null;
  targetPersona: Persona | null;
}

export function SettingsContent({
  persona: initialPersona,
  ynabSettings,
  splitwiseSettings,
  partnershipStatus,
  reconfigure = false,
}: SettingsContentProps) {
  const router = useRouter();
  // Auto-expand splitwise section if reconfigure mode (e.g., orphan recovery)
  const [editingSection, setEditingSection] = useState<string | null>(
    reconfigure ? "splitwise" : null,
  );
  const [persona, setPersona] = useState<Persona | null>(
    initialPersona as Persona | null,
  );
  const [pendingPersona, setPendingPersona] = useState<Persona | null>(null);
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    type: null,
    partnerName: null,
    groupName: null,
    targetPersona: null,
  });
  const [budgetCurrency, setBudgetCurrency] = useState<string | null>(null);

  // Load budget currency on mount
  useEffect(() => {
    async function loadBudgetCurrency() {
      if (!ynabSettings?.budgetId) return;
      try {
        const result = await getYNABBudgetForUser(ynabSettings.budgetId);
        if (result.success && result.budget.currency_format?.iso_code) {
          setBudgetCurrency(result.budget.currency_format.iso_code);
        }
      } catch (error) {
        console.error("Error loading budget currency:", error);
      }
    }
    loadBudgetCurrency();
  }, [ynabSettings?.budgetId]);

  // Start editing persona
  function startEditingPersona() {
    setPendingPersona(persona);
    setEditingSection("persona");
  }

  // Cancel editing persona
  function cancelEditingPersona() {
    setPendingPersona(null);
    setEditingSection(null);
  }

  // Save persona change
  async function savePersonaChange(confirmed = false) {
    if (!pendingPersona || pendingPersona === persona) {
      cancelEditingPersona();
      return;
    }

    setIsSavingPersona(true);
    try {
      const result = await updatePersonaWithPartnerHandling(
        pendingPersona,
        confirmed,
      );

      // Check if confirmation is required
      if (
        !result.success &&
        "requiresConfirmation" in result &&
        result.requiresConfirmation
      ) {
        setConfirmation({
          isOpen: true,
          type: result.confirmationType,
          partnerName: result.partnerName,
          groupName: result.groupName,
          targetPersona: pendingPersona,
        });
        setIsSavingPersona(false);
        return;
      }

      if (result.success) {
        setPersona(pendingPersona);
        setPendingPersona(null);
        setEditingSection(null);
        router.refresh();
      } else if ("error" in result) {
        console.error("Error updating persona:", result.error);
      }
    } catch (error) {
      console.error("Error updating persona:", error);
    } finally {
      setIsSavingPersona(false);
    }
  }

  async function handleConfirmPersonaChange() {
    if (!confirmation.targetPersona) return;

    setConfirmation((prev) => ({ ...prev, isOpen: false }));

    // Set pending and save with confirmed=true
    setPendingPersona(confirmation.targetPersona);
    setIsSavingPersona(true);
    try {
      const result = await updatePersonaWithPartnerHandling(
        confirmation.targetPersona,
        true,
      );

      if (result.success) {
        setPersona(confirmation.targetPersona);
        setPendingPersona(null);
        setEditingSection(null);
        router.refresh();
      } else if ("error" in result) {
        console.error("Error updating persona:", result.error);
      }
    } catch (error) {
      console.error("Error updating persona:", error);
    } finally {
      setIsSavingPersona(false);
    }
  }

  function handleCancelConfirmation() {
    setConfirmation({
      isOpen: false,
      type: null,
      partnerName: null,
      groupName: null,
      targetPersona: null,
    });
  }

  function handleSettingsSaved() {
    setEditingSection(null);
    router.refresh();
  }

  // Get partner info from partnership status
  const partnerName =
    partnershipStatus?.type === "primary"
      ? partnershipStatus.secondaryName
      : partnershipStatus?.type === "secondary"
        ? partnershipStatus.primaryName
        : null;

  // Determine if user is secondary (can't edit shared settings)
  const isSecondary = partnershipStatus?.type === "secondary";
  const isPrimary = partnershipStatus?.type === "primary";
  const isInHousehold = isSecondary || isPrimary;
  const isOrphaned = partnershipStatus?.type === "orphaned";

  return (
    <>
      {/* Orphaned state alert */}
      {isOrphaned && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Your partner&apos;s account is no longer active. Select a new
            Splitwise group below to continue syncing independently.
          </AlertDescription>
        </Alert>
      )}

      {/* Confirmation Modal for Primary disconnecting Partner */}
      <AlertDialog
        open={
          confirmation.isOpen && confirmation.type === "primary_has_partner"
        }
        onOpenChange={(open) => !open && handleCancelConfirmation()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Disconnect your partner?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Switching to Solo mode will disconnect{" "}
                <strong>{confirmation.partnerName || "your partner"}</strong>{" "}
                from your Duo account.
              </p>
              <p>
                They&apos;ll need to reconfigure their own Splitwise settings to
                continue syncing independently.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPersonaChange}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Disconnect &amp; switch to Solo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Modal for Secondary leaving */}
      <AlertDialog
        open={confirmation.isOpen && confirmation.type === "secondary_leaving"}
        onOpenChange={(open) => !open && handleCancelConfirmation()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Leave Duo account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You&apos;ll be disconnected from{" "}
                <strong>
                  {confirmation.partnerName || "your partner"}&apos;s
                </strong>{" "}
                Duo account.
              </p>
              <p>
                You&apos;ll need to select a{" "}
                <strong>different Splitwise group</strong> for solo syncing,
                since{" "}
                <strong>
                  &ldquo;{confirmation.groupName || "the shared group"}&rdquo;
                </strong>{" "}
                is being used by {confirmation.partnerName || "your partner"}.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmPersonaChange}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Leave &amp; switch to Solo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Setup Mode */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Setup Mode</CardTitle>
                <CardDescription>How do you use YNAB?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {editingSection === "persona" ? (
              <div className="space-y-4">
                <div className="grid gap-3">
                  <button
                    onClick={() => setPendingPersona("solo")}
                    disabled={isSavingPersona}
                    className={cn(
                      "relative text-left p-4 rounded-xl border-2 transition-all",
                      pendingPersona === "solo"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                      isSavingPersona && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {pendingPersona === "solo" && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 pr-6">
                      <span className="text-xl">👤</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Solo
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Only I use YNAB
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPendingPersona("dual")}
                    disabled={isSavingPersona}
                    className={cn(
                      "relative text-left p-4 rounded-xl border-2 transition-all",
                      pendingPersona === "dual"
                        ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                      isSavingPersona && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {pendingPersona === "dual" && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 pr-6">
                      <span className="text-xl">👥</span>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Duo
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          We both use YNAB
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditingPersona}
                    disabled={isSavingPersona}
                    className="rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => savePersonaChange()}
                    disabled={isSavingPersona || pendingPersona === persona}
                    className="rounded-full bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {isSavingPersona ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Mode
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{persona === "dual" ? "👥" : "👤"}</span>
                      {persona === "dual" ? "Duo" : "Solo"}
                    </span>
                  </div>
                  {isInHousehold && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Role
                        </span>
                        <Badge
                          variant={isPrimary ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {isPrimary ? "Primary" : "Secondary"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Partner
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {partnerName || "Connected"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditingPersona}
                  className="rounded-full"
                >
                  Change Mode
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partner invite card - for dual users waiting for partner */}
        {partnershipStatus?.type === "primary_waiting" && <PartnerInviteCard />}

        {/* YNAB Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>YNAB Configuration</CardTitle>
                <CardDescription>
                  Your YNAB plan and account settings
                </CardDescription>
              </div>
              <Badge variant="success" className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {editingSection === "ynab" ? (
              <YNABSettingsForm
                initialBudgetId={ynabSettings?.budgetId}
                initialBudgetName={ynabSettings?.budgetName}
                initialSplitAccountId={ynabSettings?.splitwiseAccountId}
                initialSplitAccountName={ynabSettings?.splitwiseAccountName}
                initialManualFlagColor={ynabSettings?.manualFlagColor}
                initialSyncedFlagColor={ynabSettings?.syncedFlagColor}
                onSaveSuccess={handleSettingsSaved}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <div className="space-y-4">
                {ynabSettings && (
                  <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Plan
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {ynabSettings.budgetName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        &quot;Phantom&quot; Account
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {ynabSettings.splitwiseAccountName}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Sync Flag
                      </span>
                      <div className="flex items-center gap-2">
                        <YNABFlag
                          colorId={ynabSettings.manualFlagColor || "blue"}
                          size="sm"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          →
                        </span>
                        <YNABFlag
                          colorId={ynabSettings.syncedFlagColor || "green"}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSection("ynab")}
                  className="rounded-full"
                >
                  Edit YNAB Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Splitwise Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Splitwise Configuration</CardTitle>
                <CardDescription>
                  {isSecondary
                    ? `Shared settings from ${partnerName || "your partner"}`
                    : "Your Splitwise group and sync settings"}
                </CardDescription>
              </div>
              <Badge variant="success" className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Connected
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {editingSection === "splitwise" ? (
              <SplitwiseSettingsForm
                initialGroupId={splitwiseSettings?.groupId}
                initialGroupName={splitwiseSettings?.groupName}
                initialCurrencyCode={splitwiseSettings?.currencyCode}
                initialEmoji={splitwiseSettings?.emoji}
                initialSplitRatio={splitwiseSettings?.defaultSplitRatio}
                initialUseDescriptionAsPayee={
                  splitwiseSettings?.useDescriptionAsPayee
                }
                initialCustomPayeeName={splitwiseSettings?.customPayeeName}
                onSaveSuccess={handleSettingsSaved}
                onCancel={() => setEditingSection(null)}
                isSecondary={isSecondary}
                isPrimary={isPrimary}
                hasPendingInvite={partnershipStatus?.type === "primary_waiting"}
                partnerName={partnerName}
                partnerEmoji={
                  partnershipStatus?.type === "secondary"
                    ? partnershipStatus.primaryEmoji
                    : null
                }
                budgetCurrency={budgetCurrency}
              />
            ) : (
              <div className="space-y-4">
                {splitwiseSettings && (
                  <>
                    {/* Shared settings section */}
                    <div
                      className={cn(
                        "rounded-xl p-4",
                        isInHousehold
                          ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                          : "bg-gray-50 dark:bg-gray-900/50",
                      )}
                    >
                      {isInHousehold && (
                        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200 mb-3">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">
                            Shared with {partnerName || "your partner"}
                          </span>
                        </div>
                      )}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            {isSecondary && <Lock className="h-3 w-3" />}
                            Group
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {splitwiseSettings.groupName}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            {isSecondary && <Lock className="h-3 w-3" />}
                            Currency
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {splitwiseSettings.currencyCode}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            {isSecondary && <Lock className="h-3 w-3" />}
                            Split Ratio
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {splitwiseSettings.defaultSplitRatio || "1:1"}
                          </span>
                        </div>
                      </div>
                      {isSecondary && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                          These settings are managed by{" "}
                          {partnerName || "your partner"}.
                        </p>
                      )}
                      {isPrimary && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
                          {partnerName || "Your partner"} uses these same
                          settings.
                        </p>
                      )}
                    </div>

                    {/* Individual settings section */}
                    {isInHousehold && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-3">
                          Your Settings
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">
                              Sync Marker
                            </span>
                            <span className="text-lg">
                              {splitwiseSettings.emoji || "✅"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">
                              Payee Name
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {splitwiseSettings.useDescriptionAsPayee !== false
                                ? "From description"
                                : splitwiseSettings.customPayeeName || "Custom"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Solo user: show personal settings inline */}
                    {!isInHousehold && (
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">
                              Sync Marker
                            </span>
                            <span className="text-lg">
                              {splitwiseSettings.emoji || "✅"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 dark:text-gray-400">
                              Payee Name
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {splitwiseSettings.useDescriptionAsPayee !== false
                                ? "From description"
                                : splitwiseSettings.customPayeeName || "Custom"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSection("splitwise")}
                  className="rounded-full"
                >
                  {isSecondary
                    ? "Edit Your Settings"
                    : "Edit Splitwise Settings"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
