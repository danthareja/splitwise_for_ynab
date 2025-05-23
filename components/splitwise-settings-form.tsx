"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSplitwiseGroupsForUser, saveUserSettings } from "@/app/actions/settings"
import type { SplitwiseGroup } from "@/services/splitwise-auth"
import { AlertCircle, Loader2, AlertTriangle } from "lucide-react"
import { EmojiPicker } from "@/components/emoji-picker"
import Image from "next/image"

interface SplitwiseSettingsFormProps {
  initialGroupId?: string | null
  initialGroupName?: string | null
  initialCurrencyCode?: string | null
  initialEmoji?: string | null
  onSaveSuccess?: () => void
}

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "SEK", label: "SEK - Swedish Krona" },
  { value: "NOK", label: "NOK - Norwegian Krone" },
  { value: "DKK", label: "DKK - Danish Krone" },
]

export function SplitwiseSettingsForm({
  initialGroupId,
  initialGroupName,
  initialCurrencyCode,
  initialEmoji = "✅",
  onSaveSuccess,
}: SplitwiseSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validGroups, setValidGroups] = useState<SplitwiseGroup[]>([])
  const [invalidGroups, setInvalidGroups] = useState<SplitwiseGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId || "")
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrencyCode || "")
  const [selectedEmoji, setSelectedEmoji] = useState(initialEmoji || "✅")

  useEffect(() => {
    loadGroups()
  }, [])

  async function loadGroups() {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getSplitwiseGroupsForUser()

      if (result.success) {
        setValidGroups(result.validGroups || [])
        setInvalidGroups(result.invalidGroups || [])
      } else {
        setError(result.error || "Failed to load groups")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      const formData = new FormData(event.currentTarget)
      const selectedGroup = validGroups.find((group) => group.id.toString() === selectedGroupId)

      if (selectedGroup) {
        formData.set("splitwiseGroupName", selectedGroup.name)
      }

      const result = await saveUserSettings(formData)

      if (result.success) {
        // Call the success callback to close the form (no page reload here)
        onSaveSuccess?.()
      } else {
        setError(result.error || "Failed to save settings")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Splitwise Settings</CardTitle>
          <CardDescription>Configure your Splitwise group and currency preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading groups...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Splitwise Settings</CardTitle>
        <CardDescription>Configure your Splitwise group and currency preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="splitwiseGroupId">Splitwise Group</Label>
            <Select name="splitwiseGroupId" value={selectedGroupId} onValueChange={setSelectedGroupId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {validGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 2).map((member, index) => (
                          <div
                            key={member.user_id}
                            className="relative h-6 w-6 overflow-hidden rounded-full border-2 border-white"
                          >
                            <Image
                              src={member.picture?.medium || "/placeholder.svg"}
                              alt={`${member.first_name} ${member.last_name}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{group.name}</span>
                        <span className="text-sm text-gray-500">
                          {group.members.map((m) => m.first_name).join(" & ")}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validGroups.length === 0 && (
              <p className="text-sm text-gray-500">No valid groups found. You need a group with exactly 2 members.</p>
            )}
          </div>

          {invalidGroups.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Groups with more than 2 members cannot be used:</p>
                  <ul className="list-disc list-inside text-sm">
                    {invalidGroups.map((group) => (
                      <li key={group.id}>
                        {group.name} ({group.members.length} members)
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    This app only supports groups with exactly 2 members for shared expenses between partners.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="splitwiseCurrencyCode">Currency</Label>
            <Select name="splitwiseCurrencyCode" value={selectedCurrency} onValueChange={setSelectedCurrency} required>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <EmojiPicker
            label="Sync Marker Emoji"
            value={selectedEmoji}
            onChange={setSelectedEmoji}
            description="Press CTRL + CMD + Space (mac) or Windows Key + . (period) to open the emoji picker."
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isSaving || validGroups.length === 0}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
