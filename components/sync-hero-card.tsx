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
          // Reset to ready state and refresh rate limit status
          setState("ready");
          refreshRateLimitStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
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
        setState("ready");
        toast.success("Account re-enabled", {
          description: "You can now sync your expenses again.",
        });
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

  // DISABLED STATE
  if (state === "disabled") {
    return (
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Sync Disabled - Action Required
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    What happened:
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {disabledReason || "An error occurred during sync."}
                  </p>
                </div>

                {suggestedFix && (
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      Required action:
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {suggestedFix}
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={isReenabling}
                        className="bg-gray-900 hover:bg-gray-800 text-white rounded-full"
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
                        <AlertDialogDescription className="space-y-4">
                          <p>
                            Before proceeding, make sure you&apos;ve completed
                            the required action:
                          </p>
                          {suggestedFix && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                {suggestedFix}
                              </p>
                            </div>
                          )}
                          <p>
                            <strong className="text-gray-900 dark:text-white">
                              Warning:
                            </strong>{" "}
                            If the underlying issue isn&apos;t resolved, your
                            account will be disabled again the next time a sync
                            is attempted.
                          </p>
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
                          Yes, I&apos;ve Fixed It
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // EMPTY STATE
  if (state === "empty") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Ready to Sync
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Flag a transaction in YNAB with{" "}
              <YNABFlag
                colorId={manualFlagColor}
                size="sm"
                className="inline mx-1"
              />
              and press <span className="font-semibold">Sync Now</span> to send
              it to Splitwise.
            </p>
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-8 h-12 text-base"
            >
              <RefreshCw
                className={`mr-2 h-5 w-5 ${isSyncing ? "animate-spin" : ""}`}
              />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              {rateLimitRemaining} of {maxRequests} syncs remaining this hour
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // RATE LIMITED STATE
  if (state === "rate_limited") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 mx-auto mb-4 flex items-center justify-center">
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Rate Limit Reached
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You&apos;ve used all {maxRequests} syncs for this hour.
            </p>
            <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 mb-4">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Next sync available in {formatCountdown(rateLimitResetSeconds)}
              </span>
            </div>
            <div>
              <Button
                disabled
                className="rounded-full px-8 h-12 text-base opacity-50"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Sync Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // SYNCING STATE
  if (state === "syncing" || isSyncing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mx-auto mb-4 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-amber-600 dark:text-amber-500 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Syncing...
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Transferring your expenses between YNAB and Splitwise
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // READY STATE (default)
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manual Sync
              </h2>
              {lastSyncTime && (
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Last sync {formatTimeAgo(lastSyncTime)}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {rateLimitRemaining} of {maxRequests} syncs remaining • Resets
              every {windowMinutes} minutes
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing || rateLimitRemaining === 0}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-8 h-12 text-base"
          >
            <RefreshCw
              className={`mr-2 h-5 w-5 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
