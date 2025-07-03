"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SplitwiseSettingsForm } from "@/components/splitwise-settings-form";
import { SplitwiseConnectForm } from "@/components/splitwise-connect-form";
import { GroupMembersDisplay } from "@/components/group-members-display";
import {
  getSplitwiseGroupsForUser,
  testSplitwiseConnection,
  disconnectSplitwiseAccount,
} from "@/app/actions/splitwise";
import type { SplitwiseGroup } from "@/types/splitwise";
import {
  Trash2,
  Settings,
  AlertCircle,
  Check,
  X,
  AlertTriangle,
  LogIn,
  RefreshCw,
  Loader2,
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
import { SplitwiseDisconnectModal } from "./splitwise-disconnect-modal";
import { signIn } from "next-auth/react";

interface SplitwiseConnectionCardProps {
  isConnected: boolean;
  settings?: {
    groupId?: string | null;
    groupName?: string | null;
    currencyCode?: string | null;
    emoji?: string | null;
    defaultSplitRatio?: string | null;
    useDescriptionAsPayee?: boolean | null;
    customPayeeName?: string | null;
  } | null;
}

export function SplitwiseConnectionCard({
  isConnected,
  settings,
}: SplitwiseConnectionCardProps) {
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SplitwiseGroup | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(!!settings?.groupId);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasConnectionError, setHasConnectionError] = useState(false);

  const isConfigured = settings?.groupId && settings?.currencyCode;
  const needsConfiguration =
    isConnected && !isConfigured && !hasConnectionError;

  useEffect(() => {
    // Load the selected group details if we have settings
    async function loadSelectedGroup() {
      if (!settings?.groupId) {
        setIsLoadingGroup(false);
        return;
      }

      setIsLoadingGroup(true);
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
      } finally {
        setIsLoadingGroup(false);
      }
    }

    // Test connection if user is connected
    async function testConnection() {
      if (!isConnected) {
        setHasConnectionError(false);
        setConnectionError(null);
        return;
      }

      setIsTestingConnection(true);
      try {
        const result = await testSplitwiseConnection();
        if (!result.success && result.isConnectionError) {
          setHasConnectionError(true);
          setConnectionError(result.error || "Connection failed");
        } else {
          setHasConnectionError(false);
          setConnectionError(null);
        }
      } catch (error) {
        console.error("Error testing connection:", error);
        setHasConnectionError(true);
        setConnectionError("Failed to test connection");
      } finally {
        setIsTestingConnection(false);
      }
    }

    loadSelectedGroup();
    testConnection();
  }, [settings?.groupId, isConnected]);

  const handleSettingsSaveSuccess = () => {
    setShowSettings(false);
    // Refresh will happen automatically due to server components revalidation
    // No need for router.refresh() which causes janky behavior
  };

  const handleConnectSplitwise = async () => {
    setIsLoading(true);
    try {
      await signIn("splitwise", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Error connecting to Splitwise:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectAndReconnect = async () => {
    setIsLoading(true);
    try {
      const result = await disconnectSplitwiseAccount();
      if (result.success) {
        setHasConnectionError(false);
        setConnectionError(null);
        setShowReconnect(true);
      } else {
        console.error("Error disconnecting:", result.error);
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await testSplitwiseConnection();
      if (!result.success && result.isConnectionError) {
        setHasConnectionError(true);
        setConnectionError(result.error || "Connection failed");
      } else {
        setHasConnectionError(false);
        setConnectionError(null);
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setHasConnectionError(true);
      setConnectionError("Failed to test connection");
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Helper function to get status text
  const getStatusText = () => {
    if (!isConnected) {
      return "Your Splitwise account is not connected. Connect your account to get started.";
    }
    if (hasConnectionError) {
      return `Connection Error: ${connectionError}`;
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
                : hasConnectionError
                  ? "destructive"
                  : needsConfiguration
                    ? "warning"
                    : "success"
            }
            className="flex items-center gap-1"
          >
            {!isConnected ? (
              <X className="h-3 w-3" />
            ) : hasConnectionError ? (
              <AlertCircle className="h-3 w-3" />
            ) : needsConfiguration ? (
              <AlertTriangle className="h-3 w-3" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            {!isConnected
              ? "Not Connected"
              : hasConnectionError
                ? "Connection Error"
                : needsConfiguration
                  ? "Needs Configuration"
                  : "Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <>
            {hasConnectionError ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-medium">Connection Error</p>
                      <p className="text-sm">
                        Your Splitwise connection has failed. Please reconnect
                        to continue syncing.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                {showReconnect ? (
                  <div className="space-y-4">
                    <h4 className="font-medium">Reconnect to Splitwise</h4>
                    <SplitwiseConnectForm isUpdate={true} />
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={handleRetryConnection}
                      disabled={isTestingConnection}
                      variant="outline"
                      size="sm"
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3" />
                          Retry Connection
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleDisconnectAndReconnect}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Disconnecting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-3 w-3" />
                          Disconnect & Reconnect
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : needsConfiguration ? (
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
                    initialSplitRatio={settings?.defaultSplitRatio}
                    initialUseDescriptionAsPayee={
                      settings?.useDescriptionAsPayee
                    }
                    initialCustomPayeeName={settings?.customPayeeName}
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
                initialSplitRatio={settings?.defaultSplitRatio}
                initialUseDescriptionAsPayee={settings?.useDescriptionAsPayee}
                initialCustomPayeeName={settings?.customPayeeName}
                onSaveSuccess={handleSettingsSaveSuccess}
              />
            ) : (
              <div className="space-y-4">
                {settings?.groupName && (
                  <div className="space-y-2 border rounded-md p-3 bg-gray-50 dark:bg-gray-900">
                    <div>
                      <span className="text-sm font-medium">Group: </span>
                      <span className="text-sm">{settings.groupName}</span>
                    </div>
                    {selectedGroup ? (
                      <GroupMembersDisplay
                        members={selectedGroup.members}
                        size="sm"
                      />
                    ) : settings?.groupId ? (
                      <GroupMembersDisplay
                        members={[]}
                        size="sm"
                        isLoading={isLoadingGroup}
                      />
                    ) : null}
                    <div>
                      <span className="text-sm font-medium">Currency: </span>
                      <span className="text-sm">{settings.currencyCode}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Sync Marker: </span>
                      <span className="text-md">{settings.emoji || "✅"}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Split Ratio: </span>
                      <span className="text-sm">
                        {settings.defaultSplitRatio || "1:1"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">YNAB Payee: </span>
                      <span className="text-sm">
                        {(settings.useDescriptionAsPayee ?? true)
                          ? "Use Splitwise description"
                          : `${settings.customPayeeName || `Splitwise: ${settings.groupName}` || "Splitwise for YNAB"}`}
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
                    Update Splitwise Settings
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
          <Button
            onClick={handleConnectSplitwise}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {isLoading ? "Connecting..." : "Sign in with Splitwise"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
