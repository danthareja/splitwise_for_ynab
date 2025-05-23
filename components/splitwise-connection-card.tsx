"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SplitwiseConnectForm } from "@/components/splitwise-connect-form"
import { SplitwiseDisconnectModal } from "@/components/splitwise-disconnect-modal"
import { Pencil, Trash2 } from "lucide-react"

interface SplitwiseConnectionCardProps {
  isConnected: boolean
  apiKey?: string | null
}

export function SplitwiseConnectionCard({ isConnected, apiKey }: SplitwiseConnectionCardProps) {
  const [showUpdateForm, setShowUpdateForm] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)

  return (
    <div className="border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Splitwise Connection</h2>

      {isConnected ? (
        <>
          <p className="text-green-600 mb-4">✓ Connected</p>
          <p className="text-sm text-gray-500 mb-4">
            Your Splitwise account is connected. Shared expenses will be synced between YNAB and Splitwise.
          </p>

          {!showUpdateForm ? (
            <div className="flex gap-2">
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
                onClick={() => setShowDisconnectModal(true)}
                className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <SplitwiseConnectForm isUpdate={true} currentApiKey={apiKey || ""} />
              <Button variant="ghost" size="sm" onClick={() => setShowUpdateForm(false)}>
                Cancel
              </Button>
            </div>
          )}

          <SplitwiseDisconnectModal isOpen={showDisconnectModal} onClose={() => setShowDisconnectModal(false)} />
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
