import { auth } from "@/auth";
import {
  getUserWithAccounts,
  getUserOnboardingData,
  getPartnershipStatus,
} from "@/app/actions/db";
import { AppHeader } from "@/components/header";
import { Footer } from "@/components/footer";
import { getSplitwiseSettings } from "@/app/actions/splitwise";
import { getYNABSettings } from "@/app/actions/ynab";
import { getSyncHistory, getSyncRateLimitStatus } from "@/app/actions/sync";
import { getSubscriptionInfo } from "@/app/actions/subscription";
import { SyncHistory } from "@/components/sync-history";
import { SyncHeroCard, type SyncHeroState } from "@/components/sync-hero-card";
import { PartnerInviteCard } from "@/components/partner-invite-card";
import { HelpCircle, Settings, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { MAX_REQUESTS, WINDOW_SECONDS } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { getUserFirstName } from "@/lib/utils";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard - Manage Your YNAB & Splitwise Integration",
  description:
    "Manage your YNAB and Splitwise connections, view sync history, and control your automated expense sharing workflow.",
  robots: {
    index: false,
    follow: false,
  },
};

const MAX_SYNC_HISTORY_ITEMS = 7;

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // Get onboarding state
  const onboardingData = await getUserOnboardingData();

  // Redirect to setup if onboarding is not complete
  if (!onboardingData?.onboardingComplete) {
    redirect("/dashboard/setup");
  }

  // Get user data
  const user = await getUserWithAccounts();

  if (!user) {
    return <p>Error loading user data.</p>;
  }

  const splitwiseSettings = await getSplitwiseSettings();
  const ynabSettings = await getYNABSettings();

  // Get partnership status
  const partnershipStatus = await getPartnershipStatus();

  // Get sync history
  const syncHistoryResult = await getSyncHistory(MAX_SYNC_HISTORY_ITEMS);
  const syncHistory = syncHistoryResult.success
    ? syncHistoryResult.syncHistory || []
    : [];

  // Get rate limit status
  const rateLimitStatus = await getSyncRateLimitStatus();

  // Get subscription status
  const subscriptionInfo = await getSubscriptionInfo();

  // Determine SyncHeroCard state
  let syncHeroState: SyncHeroState = "ready";
  let disabledReason = user.disabledReason;
  let suggestedFix = user.suggestedFix;
  let isSubscriptionIssue = false;

  // Check for orphan state - secondary with missing primary
  const isOrphaned = partnershipStatus?.type === "orphaned";

  // Check subscription status - syncing requires active subscription
  const hasActiveSubscription = subscriptionInfo?.isActive ?? false;

  if (user.disabled) {
    syncHeroState = "disabled";
  } else if (isOrphaned) {
    syncHeroState = "disabled";
    disabledReason = "You've been removed from your partner's plan";
    suggestedFix = "Set up your own account with your own subscription";
  } else if (!hasActiveSubscription) {
    syncHeroState = "disabled";
    isSubscriptionIssue = true;
    if (subscriptionInfo?.isSharedFromPrimary) {
      disabledReason = "Your partner's subscription is not active";
      suggestedFix = "Ask your partner to update their billing settings";
    } else {
      disabledReason = "Your subscription is not active";
      suggestedFix = "Update your billing settings to continue syncing";
    }
  } else if (syncHistory.length === 0) {
    syncHeroState = "empty";
  } else if (rateLimitStatus && rateLimitStatus.remaining === 0) {
    syncHeroState = "rate_limited";
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] dark:bg-[#0f0f0f]">
      <AppHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header with welcome and settings */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h1 className="text-3xl font-serif text-gray-900 dark:text-white">
              {getUserFirstName(user)
                ? `Hey there, ${getUserFirstName(user)}!`
                : "Hey there!"}
            </h1>
            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <Link href="/dashboard/help">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <Link href="/dashboard/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>

          {/* Partner invite CTA - for dual users waiting for their partner */}
          {partnershipStatus?.type === "primary_waiting" && (
            <PartnerInviteCard />
          )}

          {/* Sync Hero Card - Main CTA */}
          <div className="mt-6">
            <SyncHeroCard
              initialState={syncHeroState}
              manualFlagColor={ynabSettings?.manualFlagColor || "blue"}
              budgetName={ynabSettings?.budgetName || undefined}
              disabledReason={disabledReason}
              suggestedFix={suggestedFix}
              isSubscriptionIssue={isSubscriptionIssue}
              initialRateLimitRemaining={
                rateLimitStatus?.remaining ?? MAX_REQUESTS
              }
              initialRateLimitResetSeconds={
                rateLimitStatus?.resetInSeconds ?? WINDOW_SECONDS
              }
              maxRequests={MAX_REQUESTS}
              windowMinutes={WINDOW_SECONDS / 60}
              partnerName={
                partnershipStatus?.type === "primary"
                  ? partnershipStatus.secondaryName
                  : partnershipStatus?.type === "secondary"
                    ? partnershipStatus.primaryName
                    : null
              }
            />
          </div>

          {/* Orphaned state alert - Secondary with missing primary */}
          {partnershipStatus?.type === "orphaned" && (
            <Card className="mt-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                      You&apos;ve been removed from your partner&apos;s plan
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      To continue syncing, you&apos;ll need to set up your own
                      account with your own subscription. A free trial is
                      available if you haven&apos;t used one.
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link href="/dashboard/setup">Set up my account</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sync History */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              {syncHistory && syncHistory.length > 0 ? (
                <SyncHistory
                  syncHistory={syncHistory}
                  currencyCode={splitwiseSettings?.currencyCode || undefined}
                />
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No sync history yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
