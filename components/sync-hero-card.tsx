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
import { syncUserDataAction, getSyncRateLimitStatus } from "@/app/actions/sync";
import { reenableAccount } from "@/app/actions/user";
import { YNABFlag } from "@/components/ynab-flag";
import { RefreshCw, AlertCircle, Clock, Loader2 } from "lucide-react";

export type SyncHeroState =
  | "empty"
  | "ready"
  | "syncing"
  | "rate_limited"
  | "disabled";

interface SyncHeroCardProps {
  initialState: SyncHeroState;
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
  // Duo mode info
  partnerName?: string | null;
}

export function SyncHeroCard({
  initialState,
  manualFlagColor = "blue",
  budgetName,
  disabledReason,
  suggestedFix,
  initialRateLimitRemaining = 2,
  initialRateLimitResetSeconds = 3600,
  maxRequests = 2,
  windowMinutes = 60,
  partnerName,
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
  const [scheduledSyncTime, setScheduledSyncTime] = useState<string>("");

  // Calculate scheduled sync time in user's timezone
  useEffect(() => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (globalThis as any).Temporal !== "undefined") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Temporal = (globalThis as any).Temporal;
        const userTimeZone = Temporal.TimeZone.from(userTimezone);
        const startTimeUTC = Temporal.PlainTime.from("17:00");
        const endTimeUTC = Temporal.PlainTime.from("17:59");
        const today = Temporal.Now.plainDateISO();
        const startDateTimeUTC = today.toPlainDateTime(startTimeUTC);
        const endDateTimeUTC = today.toPlainDateTime(endTimeUTC);
        const startZoned = startDateTimeUTC
          .toZonedDateTime("UTC")
          .withTimeZone(userTimeZone);
        const endZoned = endDateTimeUTC
          .toZonedDateTime("UTC")
          .withTimeZone(userTimeZone);

        const startTime = startZoned.toLocaleString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: userTimezone,
        });
        const endTime = endZoned.toLocaleString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: userTimezone,
        });
        setScheduledSyncTime(`${startTime} – ${endTime}`);
      } catch {
        fallbackToDateAPI();
      }
    } else {
      fallbackToDateAPI();
    }

    function fallbackToDateAPI() {
      const utcDate = new Date();
      utcDate.setUTCHours(17, 0, 0, 0);
      const utcDateEnd = new Date();
      utcDateEnd.setUTCHours(17, 59, 59, 999);

      const startTime = utcDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const endTime = utcDateEnd.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setScheduledSyncTime(`${startTime} – ${endTime}`);
    }
  }, []);

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
        setState("ready");
      } else {
        // Check if rate limited
        if (result.error?.includes("manual syncs every")) {
          setState("rate_limited");
          await refreshRateLimitStatus();
        } else {
          setState("ready");
        }
      }
    } catch (error) {
      console.error("Failed to sync user data:", error);
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
          } else {
            setState("ready");
          }
        } else {
          setState("ready");
        }
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to re-enable account:", error);
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

          {/* Footer info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-0 text-xs text-gray-500 dark:text-gray-400 text-center">
            <span>
              Auto-sync daily{" "}
              {scheduledSyncTime
                ? ` between ${scheduledSyncTime}`
                : " between 11:00 AM – 11:59 AM"}
            </span>
            {partnerName && (
              <>
                <span className="hidden sm:inline mx-1.5">•</span>
                <span>Duo with {partnerName}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
