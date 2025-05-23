"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { syncUserDataAction } from "@/app/actions/sync"
import { RefreshCw } from "lucide-react"

export function ManualSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()

  const handleSync = async () => {
    setIsSyncing(true)

    try {
      const result = await syncUserDataAction()

      if (result.success) {
        toast.success("Sync completed successfully", {
          description: `Synced ${result.syncedTransactions?.length || 0} YNAB transactions and ${result.syncedExpenses?.length || 0} Splitwise expenses.`
        })
      } else {
        toast.error("Sync failed", {
          description: result.error || "An unknown error occurred"
        })
      }
    } catch (error) {
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "An unknown error occurred",
      })
    } finally {
      setIsSyncing(false)
      router.refresh()
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="flex items-center gap-1">
      <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing..." : "Sync Now"}
    </Button>
  )
}
