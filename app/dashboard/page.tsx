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
import { SyncHistory } from "@/components/sync-history";
import { SyncHeroCard, type SyncHeroState } from "@/components/sync-hero-card";
import { PartnerInviteCard } from "@/components/partner-invite-card";
import {
  HelpCircle,
  Mail,
  Settings,
  RefreshCw,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";
import { MAX_REQUESTS, WINDOW_SECONDS } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { getUserFirstName } from "@/lib/utils";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

  // Determine SyncHeroCard state
  let syncHeroState: SyncHeroState = "ready";
  let disabledReason = user.disabledReason;
  let suggestedFix = user.suggestedFix;

  // Check for orphan state - secondary with missing primary
  const isOrphaned = partnershipStatus?.type === "orphaned";

  if (user.disabled) {
    syncHeroState = "disabled";
  } else if (isOrphaned) {
    syncHeroState = "disabled";
    disabledReason = "Your partner's account is no longer active";
    suggestedFix = "Reconfigure your Splitwise settings to continue syncing";
  } else if (syncHistory.length === 0) {
    syncHeroState = "empty";
  } else if (rateLimitStatus && rateLimitStatus.remaining === 0) {
    syncHeroState = "rate_limited";
  }

  // Get last sync time
  const firstSync = syncHistory[0];
  const lastSyncTime = firstSync
    ? new Date(firstSync.completedAt || firstSync.startedAt)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] dark:bg-[#0f0f0f]">
      <AppHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header with welcome and settings */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-serif text-gray-900 dark:text-white">
              {getUserFirstName(user)
                ? `Welcome back, ${getUserFirstName(user)}!`
                : "Welcome!"}
            </h1>
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

          {/* Sync Hero Card - Main CTA */}
          <SyncHeroCard
            initialState={syncHeroState}
            lastSyncTime={lastSyncTime}
            manualFlagColor={ynabSettings?.manualFlagColor || "blue"}
            disabledReason={disabledReason}
            suggestedFix={suggestedFix}
            initialRateLimitRemaining={
              rateLimitStatus?.remaining ?? MAX_REQUESTS
            }
            initialRateLimitResetSeconds={
              rateLimitStatus?.resetInSeconds ?? WINDOW_SECONDS
            }
            maxRequests={MAX_REQUESTS}
            windowMinutes={WINDOW_SECONDS / 60}
          />

          {/* Orphaned state alert - Secondary with missing primary */}
          {partnershipStatus?.type === "orphaned" && (
            <Card className="mt-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                      Partner account unavailable
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      Your partner&apos;s account is no longer active. You can
                      continue syncing independently, but you&apos;ll need to
                      configure your own Splitwise settings.
                    </p>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link href="/dashboard/settings?reconfigure=true">
                        Reconfigure settings
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Partner invite CTA - for dual users waiting for their partner */}
          {partnershipStatus?.type === "primary_waiting" && (
            <div className="mt-6">
              <PartnerInviteCard />
            </div>
          )}

          {/* Partnership status - only show for connected primary/secondary users */}
          {partnershipStatus &&
            (partnershipStatus.type === "primary" ||
              partnershipStatus.type === "secondary") && (
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Household sync active
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {partnershipStatus.type === "primary"
                          ? `Syncing with ${partnershipStatus.secondaryName || "your partner"}`
                          : `Syncing with ${partnershipStatus.primaryName || "your partner"}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Sync History */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
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
                    No sync history yet. Flag a transaction and sync to get
                    started!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Banner */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      Having trouble?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Check the{" "}
                      <a
                        href="#faq"
                        className="text-amber-700 dark:text-amber-500 hover:underline"
                      >
                        FAQ
                      </a>{" "}
                      below or email{" "}
                      <a
                        href="mailto:support@splitwiseforynab.com?subject=Help!"
                        className="text-amber-700 dark:text-amber-500 hover:underline"
                      >
                        support@splitwiseforynab.com
                      </a>
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="sm:flex-shrink-0 rounded-full"
                >
                  <a
                    href="mailto:support@splitwiseforynab.com?subject=Help!"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Support
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <Card id="faq" className="mt-6">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Common questions about syncing expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q-not-even-split">
                  <AccordionTrigger>
                    What if an expense isn&apos;t split evenly?
                  </AccordionTrigger>
                  <AccordionContent>
                    If you often split at a specific ratio (e.g., 60/40), set
                    your default <strong>Split Ratio</strong> in Splitwise
                    settings (for example, 3:2). We&apos;ll apply it
                    automatically to all flagged expenses.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      For one‑off special ratios, enter the expense directly in
                      Splitwise with custom splits.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="q-partner-uses-ynab">
                  <AccordionTrigger>
                    What if my partner also uses YNAB?
                  </AccordionTrigger>
                  <AccordionContent>
                    You and your partner can both create a Splitwise for YNAB
                    account and connect to the same Splitwise group. We&apos;ll
                    sync each person&apos;s flagged transactions automatically.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="q-inflows">
                  <AccordionTrigger>
                    What happens if I flag an inflow in YNAB?
                  </AccordionTrigger>
                  <AccordionContent>
                    Splitwise only supports expenses (outflows), so inflows do
                    not sync. Flagged inflows will fail with an error.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      Tip: For money you receive, split the inflow inside YNAB.
                      Allocate your share to your normal category and your
                      partner&apos;s share to a reimbursements category.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="q-delete-transaction">
                  <AccordionTrigger>
                    What happens if I delete a synced transaction?
                  </AccordionTrigger>
                  <AccordionContent>
                    Deletes do not cascade across systems. If you delete a
                    synced transaction in YNAB, you must manually delete the
                    corresponding expense in Splitwise, and vice versa.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="q-edits-after-sync">
                  <AccordionTrigger>
                    Do updates in Splitwise sync back to YNAB?
                  </AccordionTrigger>
                  <AccordionContent>
                    No—changes made in Splitwise after the initial sync do not
                    sync back to YNAB. For one‑off expenses with a different
                    split ratio, create the expense manually in Splitwise.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="q-settle-up">
                  <AccordionTrigger>
                    How does Splitwise &quot;Settle Up&quot; show up in YNAB?
                  </AccordionTrigger>
                  <AccordionContent>
                    Settling up adds a transaction in your Splitwise account in
                    YNAB. You can match it to the imported e‑transfer from your
                    bank as a transfer to keep everything reconciled.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="q-api-limits">
                  <AccordionTrigger>
                    How many expenses can I sync at once?
                  </AccordionTrigger>
                  <AccordionContent>
                    Due to API limits, large backfills may create only ~25
                    expenses per run. For big catch‑up jobs, batch your flagged
                    transactions (20–30 at a time) and space runs a few minutes
                    apart to avoid rate limits.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
