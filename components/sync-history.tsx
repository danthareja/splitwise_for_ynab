"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SyncDetailsDialog } from "@/components/sync-details-dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

export type SyncHistoryItem = {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  status: string;
  errorMessage?: string | null;
  syncedItems: {
    id: string;
    type: string;
    externalId: string;
    amount: number;
    description: string | null;
    date: string;
    direction: string;
    status: string;
    errorMessage: string | null;
  }[];
};

interface SyncHistoryProps {
  syncHistory: SyncHistoryItem[];
  currencyCode?: string;
}

export function SyncHistory({ syncHistory, currencyCode }: SyncHistoryProps) {
  const [selectedSync, setSelectedSync] = useState<SyncHistoryItem | null>(
    null,
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-800" />

        {syncHistory.map((sync) => (
          <div key={sync.id} className="relative pl-10 pb-8">
            <div className="absolute left-0 top-1 flex items-center justify-center w-8 h-8 rounded-full border bg-white dark:bg-gray-950">
              {sync.status === "success" ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : sync.status === "error" ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : sync.status === "partial" ? (
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              ) : (
                <Clock className="h-6 w-6 text-blue-500 animate-pulse" />
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">
                    Sync {format(new Date(sync.startedAt), "MMM d, yyyy")}
                  </h3>
                  <Badge
                    variant={
                      sync.status === "success"
                        ? "success"
                        : sync.status === "error"
                          ? "destructive"
                          : sync.status === "partial"
                            ? "secondary"
                            : "default"
                    }
                  >
                    {sync.status === "success"
                      ? "Success"
                      : sync.status === "error"
                        ? "Failed"
                        : sync.status === "partial"
                          ? "Partial"
                          : "In Progress"}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {format(new Date(sync.startedAt), "h:mm a")} ·{" "}
                  {formatDistanceToNow(new Date(sync.startedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <RefreshCw className="h-3 w-3" />
                  <span>{sync.syncedItems.length} items synced</span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedSync(sync)}
                >
                  Details
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                <p className="text-xs font-medium mb-1">YNAB → Splitwise</p>
                <p className="text-lg font-semibold">
                  {
                    sync.syncedItems.filter(
                      (item) => item.type === "ynab_transaction",
                    ).length
                  }
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  transactions
                </p>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                <p className="text-xs font-medium mb-1">Splitwise → YNAB</p>
                <p className="text-lg font-semibold">
                  {
                    sync.syncedItems.filter(
                      (item) => item.type === "splitwise_expense",
                    ).length
                  }
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  expenses
                </p>
              </div>
            </div>

            {sync.status === "error" && sync.errorMessage && (
              <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs">
                <p className="font-medium">Error:</p>
                <p>{sync.errorMessage}</p>
              </div>
            )}

            {sync.status === "partial" && (
              <div className="mt-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-xs">
                <p className="font-medium">Partial sync - Some items failed:</p>
                <div className="mt-1 space-y-1">
                  {sync.syncedItems
                    .filter((item) => item.status === "error")
                    .map((item) => (
                      <div
                        key={item.id}
                        className="pl-2 border-l-2 border-yellow-200 dark:border-yellow-800"
                      >
                        <p className="font-medium">
                          {item.description ||
                            `${item.type} ${item.externalId}`}
                        </p>
                        <p className="text-xs opacity-75">
                          {item.errorMessage}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedSync && (
        <SyncDetailsDialog
          sync={selectedSync}
          open={!!selectedSync}
          onOpenChange={(open) => !open && setSelectedSync(null)}
          currencyCode={currencyCode}
        />
      )}
    </div>
  );
}
