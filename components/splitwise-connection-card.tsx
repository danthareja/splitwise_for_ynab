"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SplitwiseConnectForm } from "@/components/splitwise-connect-form"
import { SplitwiseDisconnectModal } from "@/components/splitwise-disconnect-modal"
import { SplitwiseSettingsForm } from "@/components/splitwise-settings-form"
import { GroupMembersDisplay } from "@/components/group-members-display"
import { getSplitwiseGroupsForUser } from "@/app/actions/settings"
import type { SplitwiseGroup } from "@/services/splitwise-auth"
import { Pencil, Trash2, Settings, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SplitwiseConnectionCardProps {
  isConnected: boolean
  apiKey?: string | null
  settings?: {
    splitwiseGroupId?: string | null
    splitwiseGroupName?: string | null
    splitwiseCurrencyCode?: string | null
    splitwiseEmoji?: string | null
  } | null
}

export function SplitwiseConnectionCard({ isConnected, apiKey, settings }: SplitwiseConnectionCardProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<SplitwiseGroup | null>(null)

  const isConfigured = settings?.splitwiseGroupId && settings?.splitwiseCurrencyCode
  const needsConfiguration = isConnected && !isConfigured

  useEffect(() => {
    // Load the selected group details if we have settings
    if (settings?.splitwiseGroupId && apiKey) {
      loadSelectedGroup()
    }
  }, [settings?.splitwiseGroupId, apiKey])

  async function loadSelectedGroup() {
    if (!settings?.splitwiseGroupId) return

    try {
      const result = await getSplitwiseGroupsForUser()
      if (result.success) {
        const group = result.validGroups?.find((g) => g.id.toString() === settings.splitwiseGroupId)
        if (group) {
          setSelectedGroup(group)
        }
      }
    } catch (error) {
      console.error("Error loading selected group:", error)
    }
  }

  const handleSettingsSaveSuccess = () => {
    setShowSettings(false)
    // Trigger a page reload to refresh the data
    window.location.reload()
  }

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Splitwise Connection</h2>

      {isConnected ? (
        <>
          <p className="text-green-600 mb-4">✓ Connected</p>

          {needsConfiguration ? (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium">Configuration Required</p>
                  <p className="text-sm">
                    Please configure your Splitwise group and currency to start syncing expenses.
                  </p>
                  <Button onClick={() => setShowSettings(true)} className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure Settings Now
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-500">Your Splitwise account is connected and configured.</p>
              {settings?.splitwiseGroupName && (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Group: </span>
                    <span className="text-sm">{settings.splitwiseGroupName}</span>
                  </div>
                  {selectedGroup && <GroupMembersDisplay members={selectedGroup.members} size="sm" />}
                  <div>
                    <span className="text-sm font-medium">Currency: </span>
                    <span className="text-sm">{settings.splitwiseCurrencyCode}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Sync Marker: </span>
                    <span className="text-sm text-xl">{settings.splitwiseEmoji || "✅"}</span>
                    <span className="text-xs text-gray-500 ml-2">(Added to Splitwise expenses when synced)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!showUpdateForm && !showSettings ? (
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
              {!needsConfiguration && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Configure Settings
                </Button>
              )}
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
          ) : showUpdateForm ? (
            <div className="space-y-4">
              <SplitwiseConnectForm isUpdate={true} currentApiKey={apiKey || ""} />
              <Button variant="ghost" size="sm" onClick={() => setShowUpdateForm(false)}>
                Cancel
              </Button>
            </div>
          ) : showSettings ? (
            <div className="space-y-4">
              <SplitwiseSettingsForm
                initialGroupId={settings?.splitwiseGroupId}
                initialGroupName={settings?.splitwiseGroupName}
                initialCurrencyCode={settings?.splitwiseCurrencyCode}
                initialEmoji={settings?.splitwiseEmoji}
                onSaveSuccess={handleSettingsSaveSuccess}
              />
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
            </div>
          ) : null}

          {showDisconnectModal && (
            <SplitwiseDisconnectModal isOpen={showDisconnectModal} onClose={() => setShowDisconnectModal(false)} />
          )}
        </>
      ) : (
        <>
          <p className="text-red-600 mb-4">✗ Not Connected</p>
          <p className="text-sm text-gray-500 mb-4">
            Connect your Splitwise account to sync shared expenses between YNAB and Splitwise.
          </p>
          <SplitwiseConnectForm />
        </>
      )}
    </div>
  )
}
