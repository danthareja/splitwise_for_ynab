"use client"

import type { SplitwiseUser } from "@/services/splitwise-auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"

interface SplitwiseConfirmModalProps {
  user: SplitwiseUser
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading: boolean
  isUpdate?: boolean
  showResetWarning?: boolean
}

export function SplitwiseConfirmModal({
  user,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  isUpdate = false,
  showResetWarning = false,
}: SplitwiseConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isUpdate ? "Update Splitwise Connection" : "Confirm Splitwise Connection"}</DialogTitle>
          <DialogDescription>
            {isUpdate
              ? "Update your Splitwise connection with this account?"
              : "Is this your Splitwise account? This will update your profile information."}
          </DialogDescription>
        </DialogHeader>

        {showResetWarning && (
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Updating your API key will reset your Splitwise settings. You will need to reconfigure your group and
              currency preferences.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center gap-4 py-4">
          {user.picture?.medium && (
            <div className="relative h-20 w-20 overflow-hidden rounded-full">
              <Image
                src={user.picture.medium || "/placeholder.svg"}
                alt={`${user.first_name} ${user.last_name}`}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="text-center">
            <h3 className="font-medium">{`${user.first_name} ${user.last_name}`}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUpdate ? "Updating..." : "Connecting..."}
              </>
            ) : isUpdate ? (
              "Yes, Update Connection"
            ) : (
              "Yes, Connect This Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
