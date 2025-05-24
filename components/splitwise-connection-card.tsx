"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SplitwiseConnectForm } from "@/components/splitwise-connect-form";
import { SplitwiseDisconnectModal } from "@/components/splitwise-disconnect-modal";
import { SplitwiseSettingsForm } from "@/components/splitwise-settings-form";
import { GroupMembersDisplay } from "@/components/group-members-display";
import { getSplitwiseGroupsForUser } from "@/app/actions/settings";
import type { SplitwiseGroup } from "@/services/splitwise-types";
import {
  Pencil,
  Trash2,
  Settings,
  AlertCircle,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SplitwiseConnectionCardProps {
  isConnected: boolean;
  apiKey?: string | null;
  settings?: {
    groupId?: string | null;
    groupName?: string | null;
    currencyCode?: string | null;
    emoji?: string | null;
  } | null;
}

export function SplitwiseConnectionCard({
  isConnected,
  apiKey,
  settings,
}: SplitwiseConnectionCardProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SplitwiseGroup | null>(
    null,
  );

  const isConfigured = settings?.groupId && settings?.currencyCode;
  const needsConfiguration = isConnected && !isConfigured;

  useEffect(() => {
    // Load the selected group details if we have settings
    async function loadSelectedGroup() {
      if (!settings?.groupId) return;

      try {
        const result = await getSplitwiseGroupsForUser();
        if (result.success && "validGroups" in result && result.validGroups) {
          const group = result.validGroups.find(
            (g: SplitwiseGroup) => g.id.toString() === settings.groupId,
          );
          if (group) {
            setSelectedGroup(group);
          }
        }
      } catch (error) {
        console.error("Error loading selected group:", error);
      }
    }

    if (settings?.groupId && apiKey) {
      loadSelectedGroup();
    }
  }, [settings?.groupId, apiKey]);

  const handleSettingsSaveSuccess = () => {
    setShowSettings(false);
    // Trigger a page reload to refresh the data
    window.location.reload();
  };

  // Helper function to get status text
  const getStatusText = () => {
    if (!isConnected) {
      return "Your Splitwise account is not connected. Connect your account to get started.";
    }
    if (needsConfiguration) {
      return "Your Splitwise account is connected but needs configuration.";
    }
    return "Your Splitwise account is connected and configured.";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Splitwise Connection</CardTitle>
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
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-medium">Configuration Required</p>
                      <p className="text-sm">
                        Please configure your Splitwise group and currency to
                        start syncing expenses.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                {showSettings ? (
                  <SplitwiseSettingsForm
                    initialGroupId={settings?.groupId}
                    initialGroupName={settings?.groupName}
                    initialCurrencyCode={settings?.currencyCode}
                    initialEmoji={settings?.emoji}
                    onSaveSuccess={handleSettingsSaveSuccess}
                  />
                ) : (
                  <Button
                    onClick={() => setShowSettings(true)}
                    className="w-full"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Splitwise Settings
                  </Button>
                )}
              </div>
            ) : showSettings ? (
              <SplitwiseSettingsForm
                initialGroupId={settings?.groupId}
                initialGroupName={settings?.groupName}
                initialCurrencyCode={settings?.currencyCode}
                initialEmoji={settings?.emoji}
                onSaveSuccess={handleSettingsSaveSuccess}
              />
            ) : showUpdateForm ? (
              <div className="space-y-4">
                <SplitwiseConnectForm
                  isUpdate={true}
                  currentApiKey={apiKey || ""}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpdateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {settings?.groupName && (
                  <div className="space-y-2 border rounded-md p-3 bg-gray-50 dark:bg-gray-900">
                    <div>
                      <span className="text-sm font-medium">Group: </span>
                      <span className="text-sm">{settings.groupName}</span>
                    </div>
                    {selectedGroup && (
                      <GroupMembersDisplay
                        members={selectedGroup.members}
                        size="sm"
                      />
                    )}
                    <div>
                      <span className="text-sm font-medium">Currency: </span>
                      <span className="text-sm">{settings.currencyCode}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Sync Marker: </span>
                      <span className="text-sm text-xl">
                        {settings.emoji || "✅"}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        (Added to Splitwise expenses when synced)
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpdateForm(true)}
                    className="flex items-center gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Update API Key
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-1"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Configure Splitwise Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisconnectModal(true)}
                    className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Disconnect
                  </Button>
                </div>
              </div>
            )}

            {showDisconnectModal && (
              <SplitwiseDisconnectModal
                isOpen={showDisconnectModal}
                onClose={() => setShowDisconnectModal(false)}
              />
            )}
          </>
        ) : (
          <div className="space-y-4">
            <SplitwiseConnectForm />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
