"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { YNABSettingsForm } from "@/components/ynab-settings-form";
import { SplitwiseSettingsForm } from "@/components/splitwise-settings-form";
import { Badge } from "@/components/ui/badge";
import { YNABFlag } from "@/components/ynab-flag";
import { updatePersona } from "@/app/actions/user";
import type { Persona } from "@/app/actions/user";
import { User, Users, Settings, Check } from "lucide-react";
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
}

export function SettingsContent({
  persona: initialPersona,
  ynabSettings,
  splitwiseSettings,
}: SettingsContentProps) {
  const router = useRouter();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [persona, setPersona] = useState<Persona | null>(
    initialPersona as Persona | null,
  );
  const [isSavingPersona, setIsSavingPersona] = useState(false);

  async function handlePersonaChange(newPersona: Persona) {
    setIsSavingPersona(true);
    try {
      await updatePersona(newPersona);
      setPersona(newPersona);
      router.refresh();
    } catch (error) {
      console.error("Error updating persona:", error);
    } finally {
      setIsSavingPersona(false);
    }
  }

  function handleSettingsSaved() {
    setEditingSection(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Setup Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Setup Mode
          </CardTitle>
          <CardDescription>
            Choose how you use Splitwise for YNAB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => handlePersonaChange("solo")}
              disabled={isSavingPersona}
              className={cn(
                "relative text-left p-4 rounded-xl border-2 transition-all",
                persona === "solo"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
              )}
            >
              {persona === "solo" && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    persona === "solo"
                      ? "bg-amber-100 dark:bg-amber-900/40"
                      : "bg-gray-100 dark:bg-gray-800",
                  )}
                >
                  <User
                    className={cn(
                      "h-5 w-5",
                      persona === "solo"
                        ? "text-amber-600 dark:text-amber-500"
                        : "text-gray-500 dark:text-gray-400",
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Solo
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Just me using YNAB
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handlePersonaChange("dual")}
              disabled={isSavingPersona}
              className={cn(
                "relative text-left p-4 rounded-xl border-2 transition-all",
                persona === "dual"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
              )}
            >
              {persona === "dual" && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-lg flex items-center justify-center",
                    persona === "dual"
                      ? "bg-amber-100 dark:bg-amber-900/40"
                      : "bg-gray-100 dark:bg-gray-800",
                  )}
                >
                  <Users
                    className={cn(
                      "h-5 w-5",
                      persona === "dual"
                        ? "text-amber-600 dark:text-amber-500"
                        : "text-gray-500 dark:text-gray-400",
                    )}
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Dual
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Both partners use YNAB
                  </p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* YNAB Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>YNAB Configuration</CardTitle>
              <CardDescription>
                Your YNAB budget and account settings
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
            />
          ) : (
            <div className="space-y-4">
              {ynabSettings && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Budget
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {ynabSettings.budgetName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Splitwise Account
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
                Your Splitwise group and sync settings
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
            />
          ) : (
            <div className="space-y-4">
              {splitwiseSettings && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Group
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {splitwiseSettings.groupName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Currency
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {splitwiseSettings.currencyCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Sync Marker
                    </span>
                    <span className="text-lg">
                      {splitwiseSettings.emoji || "✅"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Split Ratio
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {splitwiseSettings.defaultSplitRatio || "1:1"}
                    </span>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingSection("splitwise")}
                className="rounded-full"
              >
                Edit Splitwise Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
