"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { YNABSettingsForm } from "@/components/ynab-settings-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  Check,
  X,
  AlertTriangle,
  Settings,
  LogIn,
  RefreshCw,
} from "lucide-react";
import { YNABFlag, FLAG_COLORS } from "@/components/ynab-flag";
import {
  Alert,
  AlertDescription as UiAlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { signIn } from "next-auth/react";
import { YNABDisconnectModal } from "@/components/ynab-disconnect-modal";

interface YNABConnectionCardProps {
  isConnected: boolean;
  settings?: {
    budgetId?: string | null;
    budgetName?: string | null;
    splitwiseAccountId?: string | null;
    splitwiseAccountName?: string | null;
    manualFlagColor?: string | null;
    syncedFlagColor?: string | null;
  } | null;
  isUserDisabled?: boolean;
  suggestedFix?: string | null;
}

export function YNABConnectionCard({
  isConnected,
  settings,
  isUserDisabled,
  suggestedFix,
}: YNABConnectionCardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const router = useRouter();

  const isConfigured = settings?.budgetId && settings?.splitwiseAccountId;
  const needsConfiguration = isConnected && !isConfigured;

  const getColorName = (colorId: string) => {
    return FLAG_COLORS.find((c) => c.id === colorId)?.name || colorId;
  };

  const handleSettingsSaveSuccess = () => {
    setShowSettings(false);
    router.refresh();
  };

  const handleDisconnectYNAB = async () => {
    setShowDisconnectModal(true);
  };

  // Helper function to get status text
  const getStatusText = () => {
    if (!isConnected) {
      return "Your YNAB account is not connected. Sign in to get started.";
    }
    if (needsConfiguration) {
      return "Your YNAB account is connected but needs configuration.";
    }
    return "Your YNAB account is connected and configured.";
  };

  const shouldShowReconnect =
    !!isUserDisabled &&
    !!suggestedFix &&
    suggestedFix.toLowerCase().includes("reconnect your ynab account");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>YNAB Connection</CardTitle>
            <CardDescription>{getStatusText()}</CardDescription>
          </div>
          <Badge
            variant={
              !isConnected
                ? "destructive"
                : needsConfiguration
                  ? "warning"
                  : "success"
            }
            className="flex items-center gap-1"
          >
            {!isConnected ? (
              <X className="h-3 w-3" />
            ) : needsConfiguration ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            {!isConnected
              ? "Not Connected"
              : needsConfiguration
                ? "Needs Configuration"
                : "Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <>
            {needsConfiguration ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <UiAlertDescription>
                    <div className="space-y-3">
                      <p className="font-medium">Configuration Required</p>
                      <p className="text-sm">
                        Please configure your YNAB budget and account to start
                        syncing expenses.
                      </p>
                    </div>
                  </UiAlertDescription>
                </Alert>

                {showSettings ? (
                  <YNABSettingsForm
                    initialBudgetId={settings?.budgetId}
                    initialBudgetName={settings?.budgetName}
                    initialSplitAccountId={settings?.splitwiseAccountId}
                    initialSplitAccountName={settings?.splitwiseAccountName}
                    initialManualFlagColor={settings?.manualFlagColor}
                    initialSyncedFlagColor={settings?.syncedFlagColor}
                    onSaveSuccess={handleSettingsSaveSuccess}
                  />
                ) : (
                  <Button
                    onClick={() => setShowSettings(true)}
                    className="w-full"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure YNAB Settings
                  </Button>
                )}
              </div>
            ) : showSettings ? (
              <YNABSettingsForm
                initialBudgetId={settings?.budgetId}
                initialBudgetName={settings?.budgetName}
                initialSplitAccountId={settings?.splitwiseAccountId}
                initialSplitAccountName={settings?.splitwiseAccountName}
                initialManualFlagColor={settings?.manualFlagColor}
                initialSyncedFlagColor={settings?.syncedFlagColor}
                onSaveSuccess={handleSettingsSaveSuccess}
              />
            ) : (
              <div className="space-y-4">
                {settings?.budgetName && (
                  <div className="space-y-2 border rounded-md p-3 bg-gray-50 dark:bg-gray-900">
                    <div>
                      <span className="text-sm font-medium">Budget: </span>
                      <span className="text-sm">{settings.budgetName}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">
                        Splitwise Account:{" "}
                      </span>
                      <span className="text-sm">
                        {settings.splitwiseAccountName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">Manual Flag: </span>
                      <YNABFlag
                        colorId={settings.manualFlagColor || "blue"}
                        size="sm"
                        className="mr-1"
                      />
                      <span className="text-sm">
                        {getColorName(settings.manualFlagColor || "blue")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">Synced Flag: </span>
                      <YNABFlag
                        colorId={settings.syncedFlagColor || "green"}
                        size="sm"
                        className="mr-1"
                      />
                      <span className="text-sm">
                        {getColorName(settings.syncedFlagColor || "green")}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-1"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Update YNAB Settings
                  </Button>
                  {shouldShowReconnect && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDisconnectYNAB}
                      className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reconnect
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={() => signIn("ynab", { callbackUrl: "/dashboard" })}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in with YNAB
            </Button>
          </div>
        )}
      </CardContent>
      {showDisconnectModal && (
        <YNABDisconnectModal
          isOpen={showDisconnectModal}
          onClose={() => setShowDisconnectModal(false)}
        />
      )}
    </Card>
  );
}
