"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { YnabSettingsForm } from "@/components/ynab-settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, AlertCircle } from "lucide-react"
import { FLAG_COLORS } from "@/services/ynab-api"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface YnabConnectionCardProps {
  isConnected: boolean
  settings?: {
    budgetId?: string | null
    budgetName?: string | null
    splitwiseAccountId?: string | null
    splitwiseAccountName?: string | null
    manualFlagColor?: string
    syncedFlagColor?: string
  } | null
}

export function YnabConnectionCard({ isConnected, settings }: YnabConnectionCardProps) {
  const [showSettings, setShowSettings] = useState(false)

  const isConfigured = settings?.budgetId && settings?.splitwiseAccountId
  const needsConfiguration = isConnected && !isConfigured

  const getColorName = (colorId: string) => {
    return FLAG_COLORS.find((c) => c.id === colorId)?.name || colorId
  }

  const getColorStyle = (colorId: string) => {
    return {
      backgroundColor: FLAG_COLORS.find((c) => c.id === colorId)?.color || "#cccccc",
    }
  }

  const handleSettingsSaveSuccess = () => {
    setShowSettings(false)
    // Trigger a page reload to refresh the data
    window.location.reload()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>YNAB Connection</CardTitle>
        <CardDescription>Configure your YNAB budget and account preferences</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <>
            <p className="text-green-600 mb-4 flex items-center">
              <span className="text-green-600 mr-2">✓</span> Connected
            </p>

            {needsConfiguration ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-medium">Configuration Required</p>
                      <p className="text-sm">
                        Please configure your YNAB budget and account to start syncing expenses.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>

                {showSettings ? (
                  <YnabSettingsForm initialSettings={settings} onSaveSuccess={handleSettingsSaveSuccess} />
                ) : (
                  <Button onClick={() => setShowSettings(true)} className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure YNAB Settings
                  </Button>
                )}
              </div>
            ) : showSettings ? (
              <YnabSettingsForm initialSettings={settings} onSaveSuccess={handleSettingsSaveSuccess} />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Your YNAB account is connected and configured.</p>
                  {settings?.budgetName && (
                    <div className="space-y-1">
                      <div>
                        <span className="text-sm font-medium">Budget: </span>
                        <span className="text-sm">{settings.budgetName}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Splitwise Account: </span>
                        <span className="text-sm">{settings.splitwiseAccountName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">Manual Flag: </span>
                        <div
                          className="h-3 w-3 rounded-full inline-block mr-1"
                          style={getColorStyle(settings.manualFlagColor || "blue")}
                        />
                        <span className="text-sm">{getColorName(settings.manualFlagColor || "blue")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">Synced Flag: </span>
                        <div
                          className="h-3 w-3 rounded-full inline-block mr-1"
                          style={getColorStyle(settings.syncedFlagColor || "green")}
                        />
                        <span className="text-sm">{getColorName(settings.syncedFlagColor || "green")}</span>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-1"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Update YNAB Settings
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-red-600 mb-4 flex items-center">
              <span className="text-red-600 mr-2">✗</span> Not Connected
            </p>
            <p className="text-sm text-gray-500">
              Connect your YNAB account to sync shared expenses between YNAB and Splitwise.
            </p>
            <Button asChild>
              <a href="/auth/signin">Sign in with YNAB</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
