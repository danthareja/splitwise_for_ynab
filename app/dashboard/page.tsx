import { auth } from "@/auth";
import { getUserWithAccounts } from "@/app/actions/db";
import type { Account } from "@prisma/client";
import { AppHeader } from "@/components/header";
import { Footer } from "@/components/footer";
import { SplitwiseConnectionCard } from "@/components/splitwise-connection-card";
import { YNABConnectionCard } from "@/components/ynab-connection-card";
import { getSplitwiseSettings } from "@/app/actions/splitwise";
import { getYNABSettings } from "@/app/actions/ynab";
import { getSyncHistory } from "@/app/actions/sync";
import { SyncHistory } from "@/components/sync-history";
import { ManualSyncButton } from "@/components/manual-sync-button";
import { RefreshCw, HelpCircle, Mail } from "lucide-react";
import { YNABFlag } from "@/components/ynab-flag";
import { Button } from "@/components/ui/button";
import { ScheduledSyncInfo } from "@/components/scheduled-sync-info";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Manage Your YNAB & Splitwise Integration",
  description:
    "Manage your YNAB and Splitwise connections, view sync history, and control your automated expense sharing workflow.",
  robots: {
    index: false,
    follow: false,
  },
};

const MAX_SYNC_HISTORY_ITEMS = 7; // A week of automatic syncs

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Authentication required");
  }

  // Call the server action to get user data
  const user = await getUserWithAccounts();

  if (!user) {
    // Handle the case where user data could not be fetched (e.g., show an error message)
    return <p>Error loading user data.</p>;
  }

  // Check if the user has a Splitwise account connected
  const hasSplitwiseConnected = user.accounts.some(
    (account: Account) => account.provider === "splitwise",
  );
  const hasYNABConnected = user.accounts.some(
    (account: Account) => account.provider === "ynab",
  );

  const splitwiseSettings = await getSplitwiseSettings();
  const ynabSettings = await getYNABSettings();

  // Get sync history
  const syncHistoryResult = await getSyncHistory(MAX_SYNC_HISTORY_ITEMS);
  const syncHistory = syncHistoryResult.success
    ? syncHistoryResult.syncHistory || []
    : [];

  // Check if user is fully configured
  const isFullyConfigured =
    hasSplitwiseConnected &&
    hasYNABConnected &&
    splitwiseSettings &&
    ynabSettings;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">
            {user.name
              ? `Welcome back, ${user.name.split(" ")[0]}!`
              : "Welcome!"}
          </h1>

          {/* Need Help Banner */}
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <HelpCircle className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    Having trouble?
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    We&apos;re here to help! Email us at{" "}
                    <a
                      href="mailto:support@splitwiseforynab.com?subject=Help!"
                      className="text-gray-900 underline hover:text-gray-700"
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
                className="sm:flex-shrink-0"
              >
                <a href="mailto:support@splitwiseforynab.com?subject=Help!">
                  <Mail className="h-4 w-4" />
                  Contact Support
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <YNABConnectionCard
              isConnected={!!hasYNABConnected}
              settings={ynabSettings}
            />

            <SplitwiseConnectionCard
              isConnected={!!hasSplitwiseConnected}
              settings={splitwiseSettings}
            />
          </div>

          <div className="mt-8 border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              {isFullyConfigured && <ManualSyncButton />}
            </div>

            {/* Scheduled Sync Info for fully configured users */}
            {isFullyConfigured && <ScheduledSyncInfo />}

            {syncHistory && syncHistory.length > 0 ? (
              <SyncHistory
                syncHistory={syncHistory}
                currencyCode={splitwiseSettings?.currencyCode || undefined}
              />
            ) : (
              <div className="text-center py-8">
                <RefreshCw className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  No sync history yet
                </p>
                {isFullyConfigured ? (
                  <div className="text-md">
                    To start, flag a transaction in your{" "}
                    <span className="font-semibold">
                      {ynabSettings.budgetName}
                    </span>{" "}
                    plan with{" "}
                    <YNABFlag
                      colorId={ynabSettings.manualFlagColor}
                      size="sm"
                    />{" "}
                    and press <span className="font-semibold">Sync Now</span>
                  </div>
                ) : (
                  <p className="text-md">
                    Complete your configuration to start syncing
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
