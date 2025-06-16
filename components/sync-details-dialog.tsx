"use client";

import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { SyncHistoryItem } from "@/components/sync-history";

interface SyncDetailsDialogProps {
  sync: SyncHistoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncDetailsDialog({
  sync,
  open,
  onOpenChange,
}: SyncDetailsDialogProps) {
  const ynabTransactions =
    sync.syncedItems.filter((item) => item.type === "ynab_transaction") || [];
  const splitwiseExpenses =
    sync.syncedItems.filter((item) => item.type === "splitwise_expense") || [];

  const completedAt = sync.completedAt || sync.startedAt;
  const duration =
    new Date(completedAt).getTime() - new Date(sync.startedAt).getTime();
  const durationInSeconds = Math.round(duration / 1000);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Sync Details
            <Badge
              variant={
                sync.status === "success"
                  ? "success"
                  : sync.status === "error"
                    ? "destructive"
                    : "default"
              }
            >
              {sync.status === "success"
                ? "Success"
                : sync.status === "error"
                  ? "Failed"
                  : "In Progress"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {format(new Date(sync.startedAt), "MMMM d, yyyy 'at' h:mm a")}
            {sync.status !== "in_progress" && (
              <span> · Completed in {durationInSeconds} seconds</span>
            )}
          </DialogDescription>
        </DialogHeader>

        {sync.status === "error" && sync.errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            <p className="font-medium">Error:</p>
            <p>{sync.errorMessage}</p>
          </div>
        )}

        <Tabs defaultValue="ynab" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ynab" className="flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" />
              YNAB to Splitwise
              <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                {ynabTransactions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="splitwise" className="flex items-center gap-1">
              <ArrowDownLeft className="h-4 w-4" />
              Splitwise to YNAB
              <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                {splitwiseExpenses.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ynab" className="mt-4">
            {ynabTransactions.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <th className="px-4 py-2 text-left font-medium">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left font-medium w-32">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ynabTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      >
                        <td className="px-4 py-3 truncate max-w-[200px]">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`font-medium ${transaction.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            ${transaction.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 h-4">
                            {transaction.amount < 0 ? "you paid" : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {format(parseISO(transaction.date), "MMM d, yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No YNAB transactions were synced to Splitwise
              </div>
            )}
          </TabsContent>

          <TabsContent value="splitwise" className="mt-4">
            {splitwiseExpenses.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900">
                      <th className="px-4 py-2 text-left font-medium">
                        Description
                      </th>
                      <th className="px-4 py-2 text-left font-medium w-32">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {splitwiseExpenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      >
                        <td className="px-4 py-3 truncate max-w-[200px]">
                          {expense.description}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={`font-medium ${expense.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            ${expense.amount.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 h-4">
                            {expense.amount < 0 ? "you owe" : "you get back"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {format(parseISO(expense.date), "MMM d, yyyy")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No Splitwise expenses were synced to YNAB
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
