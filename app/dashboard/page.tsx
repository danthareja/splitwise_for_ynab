import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SplitwiseConnectionCard } from "@/components/splitwise-connection-card";
import { YNABConnectionCard } from "@/components/ynab-connection-card";
import { prisma } from "@/db";
import { getSplitwiseSettings } from "@/app/actions/splitwise";
import { getYNABSettings } from "@/app/actions/ynab";
import { getSyncHistory } from "@/app/actions/sync";
import { SyncHistory } from "@/components/sync-history";
import { ManualSyncButton } from "@/components/manual-sync-button";
import { RefreshCw } from "lucide-react";
import { YNABFlag } from "@/components/ynab-flag";
import type { Account } from "@prisma/client";
import { AppHeader } from "@/components/header";

export default async function DashboardPage() {
  const session = await auth();

  // If the user is not signed in, redirect to the sign-in page
  if (!session) {
    redirect("/auth/signin");
  }

  // Check if the user has a Splitwise account connected
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      accounts: true,
    },
  });

  const hasSplitwiseConnected = user?.accounts.some(
    (account: Account) => account.provider === "splitwise",
  );
  const hasYNABConnected = user?.accounts.some(
    (account: Account) => account.provider === "ynab",
  );

  const splitwiseSettings = await getSplitwiseSettings();
  const ynabSettings = await getYNABSettings();

  // Get sync history
  const syncHistoryResult = await getSyncHistory(5);
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">
            Welcome back, {session.user?.name?.split(" ")[0] || "You"}!
          </h1>

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

            {syncHistory && syncHistory.length > 0 ? (
              <SyncHistory syncHistory={syncHistory} />
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
    </div>
  );
}
