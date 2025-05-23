"use client"

import type React from "react"

import { useState } from "react"
import { validateApiKey, saveSplitwiseUser } from "@/app/actions/splitwise"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SplitwiseConfirmModal } from "@/components/splitwise-confirm-modal"
import type { SplitwiseUser } from "@/services/splitwise-auth"
import { AlertCircle, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SplitwiseConnectFormProps {
  isUpdate?: boolean
  currentApiKey?: string
}

export function SplitwiseConnectForm({ isUpdate = false, currentApiKey = "" }: SplitwiseConnectFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [apiKey, setApiKey] = useState(currentApiKey)
  const [showApiKey, setShowApiKey] = useState(false)
  const [user, setUser] = useState<SplitwiseUser | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await validateApiKey(formData)

      if (result.success && result.user) {
        setUser(result.user)
        setApiKey(result.apiKey)
        setShowModal(true)
      } else {
        setError(result.error || "Failed to validate API key")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirm() {
    if (!user || !apiKey) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await saveSplitwiseUser(apiKey, user)

      if (result.success) {
        setShowModal(false)
        // Force a page refresh to show updated user data
        window.location.href = "/dashboard"
      } else {
        setError(result.error || "Failed to save your Splitwise information")
        setShowModal(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setShowModal(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isUpdate && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Updating your API key will reset your Splitwise settings. You will need to reconfigure your group and
              currency preferences.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="apiKey">Splitwise API Key</Label>
          <div className="relative">
            <Input
              id="apiKey"
              name="apiKey"
              type={showApiKey ? "text" : "password"}
              placeholder="Enter your Splitwise API key"
              required
              defaultValue={currentApiKey}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="sr-only">{showApiKey ? "Hide" : "Show"} API key</span>
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            You can find your API key in the{" "}
            <a
              href="https://secure.splitwise.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Splitwise Developer Portal
            </a>
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : isUpdate ? (
            "Update Connection"
          ) : (
            "Connect Splitwise"
          )}
        </Button>
      </form>

      {showModal && user && (
        <SplitwiseConfirmModal
          user={user}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
          isLoading={isLoading}
          isUpdate={isUpdate}
          showResetWarning={isUpdate}
        />
      )}
    </>
  )
}
