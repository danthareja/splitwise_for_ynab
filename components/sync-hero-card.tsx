"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { syncUserDataAction, getSyncRateLimitStatus } from "@/app/actions/sync";
import { reenableAccount } from "@/app/actions/user";
import { YNABFlag } from "@/components/ynab-flag";
import { YNABTransaction } from "@/components/persona-walkthrough";
import {
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export type SyncHeroState =
  | "empty"
  | "ready"
  | "syncing"
  | "rate_limited"
  | "disabled";

interface SyncHeroCardProps {
  initialState: SyncHeroState;
  lastSyncTime?: Date | null;
  manualFlagColor?: string;
  budgetName?: string;
  // Disabled state props
  disabledReason?: string | null;
  suggestedFix?: string | null;
  // Rate limit info
  initialRateLimitRemaining?: number;
  initialRateLimitResetSeconds?: number;
  maxRequests?: number;
  windowMinutes?: number;
}

export function SyncHeroCard({
  initialState,
  lastSyncTime,
  manualFlagColor = "blue",
  budgetName,
  disabledReason,
  suggestedFix,
  initialRateLimitRemaining = 2,
  initialRateLimitResetSeconds = 3600,
  maxRequests = 2,
  windowMinutes = 60,
}: SyncHeroCardProps) {
  const router = useRouter();
  const [state, setState] = useState<SyncHeroState>(initialState);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReenabling, setIsReenabling] = useState(false);
  const [rateLimitRemaining, setRateLimitRemaining] = useState(
    initialRateLimitRemaining,
  );
  const [rateLimitResetSeconds, setRateLimitResetSeconds] = useState(
    initialRateLimitResetSeconds,
  );

  const refreshRateLimitStatus = useCallback(async () => {
    const status = await getSyncRateLimitStatus();
    if (status) {
      setRateLimitRemaining(status.remaining);
      setRateLimitResetSeconds(status.resetInSeconds);
      if (status.remaining === 0 && state === "ready") {
        setState("rate_limited");
      }
    }
  }, [state]);

  // Countdown timer for rate-limited state
  useEffect(() => {
    if (state !== "rate_limited" || rateLimitResetSeconds <= 0) return;

    const timer = setInterval(() => {
      setRateLimitResetSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, rateLimitResetSeconds]);

  // Handle rate limit expiry - separate effect to avoid setState during render
  useEffect(() => {
    if (state === "rate_limited" && rateLimitResetSeconds === 0) {
      setState("ready");
      refreshRateLimitStatus();
    }
  }, [state, rateLimitResetSeconds, refreshRateLimitStatus]);

  async function handleSync() {
    if (isSyncing || state === "disabled" || state === "rate_limited") return;

    setIsSyncing(true);
    setState("syncing");

    try {
      const result = await syncUserDataAction();

      if (result.success) {
        toast.success("Sync completed successfully", {
          description: `Synced ${result.syncedTransactions?.length || 0} YNAB transactions and ${result.syncedExpenses?.length || 0} Splitwise expenses.`,
        });
        setState("ready");
      } else {
        // Check if rate limited
        if (result.error?.includes("manual syncs every")) {
          setState("rate_limited");
          await refreshRateLimitStatus();
        } else {
          toast.error("Sync failed", {
            description: result.error || "An unknown error occurred",
          });
          setState("ready");
        }
      }
    } catch (error) {
      toast.error("Sync failed", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
      setState("ready");
    } finally {
      setIsSyncing(false);
      router.refresh();
      await refreshRateLimitStatus();
    }
  }

  async function handleReenableAccount() {
    setIsReenabling(true);
    try {
      const result = await reenableAccount();
      if (result.success) {
        // Check rate limit status before setting state
        const status = await getSyncRateLimitStatus();
        if (status) {
          setRateLimitRemaining(status.remaining);
          setRateLimitResetSeconds(status.resetInSeconds);
          if (status.remaining === 0) {
            setState("rate_limited");
            toast.success("Account re-enabled", {
              description:
                "You're currently rate limited. Try syncing again soon.",
            });
          } else {
            setState("ready");
            toast.success("Account re-enabled", {
              description: "You can now sync your expenses again.",
            });
          }
        } else {
          setState("ready");
          toast.success("Account re-enabled", {
            description: "You can now sync your expenses again.",
          });
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to re-enable account:", error);
      toast.error("Failed to re-enable account");
    } finally {
      setIsReenabling(false);
    }
  }

  function formatCountdown(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  function formatWindowTime(minutes: number): string {
    if (minutes === 60) return "hour";
    if (minutes === 30) return "half hour";
    return `${minutes} minutes`;
  }

  // DISABLED STATE
  if (state === "disabled") {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Sync Paused
                </h2>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {disabledReason || "An error occurred during sync."}
                  {suggestedFix && (
                    <>
                      {" "}
                      <span className="font-medium">{suggestedFix}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isReenabling}
                  variant="outline"
                  className="rounded-full border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 flex-shrink-0"
                >
                  {isReenabling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Re-enabling...
                    </>
                  ) : (
                    "Re-enable Sync"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md bg-white dark:bg-[#141414]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif">
                    Ready to re-enable sync?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>
                        Make sure you&apos;ve resolved the issue before
                        re-enabling:
                      </p>
                      {suggestedFix && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            {suggestedFix}
                          </p>
                        </div>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        If the issue isn&apos;t fixed, sync will be paused again
                        on the next attempt.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReenableAccount}
                    className="rounded-full bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Re-enable Sync
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Shared layout for empty, ready, syncing, and rate_limited states
  // This prevents layout shifts when state changes
  const isRateLimited = state === "rate_limited";
  const isSyncingState = state === "syncing" || isSyncing;

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-5">
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Sync Shared Expenses
              </h2>
              {lastSyncTime && !isRateLimited && (
                <div className="flex items-center justify-center sm:justify-start gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Last sync {formatTimeAgo(lastSyncTime)}
                </div>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isRateLimited ? (
                  <>
                    You&apos;ve used all {maxRequests} syncs in the last{" "}
                    {formatWindowTime(windowMinutes)}. Try again soon.
                  </>
                ) : isSyncingState ? (
                  <>Syncing your expenses between YNAB and Splitwise...</>
                ) : (
                  <>
                    In YNAB, flag a shared expense with{" "}
                    <YNABFlag
                      colorId={manualFlagColor}
                      size="sm"
                      className="inline mx-0.5"
                    />{" "}
                    in{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {budgetName || "YNAB"}
                    </span>{" "}
                    and press &quot;Sync Now&quot; here.
                  </>
                )}
              </p>
            </div>

            {/* Sync button - hidden on mobile, shown on desktop */}
            <div className="hidden sm:block flex-shrink-0">
              {isRateLimited ? (
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5 h-11">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Available in {formatCountdown(rateLimitResetSeconds)}
                  </span>
                </div>
              ) : (
                <Button
                  onClick={handleSync}
                  disabled={isSyncingState || rateLimitRemaining === 0}
                  className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 h-11 text-base"
                >
                  {isSyncingState ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* YNAB-style transaction example - always visible */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="px-4 sm:px-0">
              <YNABTransaction
                flag={
                  manualFlagColor as
                    | "red"
                    | "orange"
                    | "yellow"
                    | "green"
                    | "blue"
                    | "purple"
                }
                account="💳 Credit Card"
                date={new Date()}
                payee="Whole Foods"
                category="🛒 Groceries"
                outflow="$150.00"
                highlightFlag={!isRateLimited && !isSyncingState}
                interactive={false}
              />
            </div>
          </div>

          {/* Sync button - mobile only, centered */}
          <div className="sm:hidden">
            {isRateLimited ? (
              <div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5 h-11">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Available in {formatCountdown(rateLimitResetSeconds)}
                </span>
              </div>
            ) : (
              <Button
                onClick={handleSync}
                disabled={isSyncingState || rateLimitRemaining === 0}
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 h-11 text-base w-full"
              >
                {isSyncingState ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Rate limit info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {rateLimitRemaining} of {maxRequests} syncs remaining • Resets every{" "}
            {formatWindowTime(windowMinutes)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
