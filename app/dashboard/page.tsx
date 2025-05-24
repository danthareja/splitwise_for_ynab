import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { SplitwiseConnectionCard } from "@/components/splitwise-connection-card";
import { YnabConnectionCard } from "@/components/ynab-connection-card";
import { prisma } from "@/db";
import { getSplitwiseApiKey } from "@/app/actions/splitwise";
import { getUserSettings } from "@/app/actions/settings";
import { getYnabSettings } from "@/app/actions/ynab";
import { getSyncHistory } from "@/app/actions/sync";
import { SyncHistory } from "@/components/sync-history";
import { ManualSyncButton } from "@/components/manual-sync-button";
import { RefreshCw } from "lucide-react";

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
    (account) => account.provider === "splitwise",
  );
  const hasYnabConnected = user?.accounts.some(
    (account) => account.provider === "ynab",
  );

  const splitwiseApiKey = await getSplitwiseApiKey();
  const userSettings = await getUserSettings();
  const ynabSettings = await getYnabSettings();

  // Get sync history
  const syncHistoryResult = await getSyncHistory(5);
  const syncHistory = syncHistoryResult.success
    ? syncHistoryResult.syncHistory || []
    : [];

  // Check if user is fully configured
  const isFullyConfigured =
    hasSplitwiseConnected && hasYnabConnected && userSettings && ynabSettings;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Splitwise for YNAB</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              Signed in as {session.user?.name || "YNAB User"}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid gap-6 md:grid-cols-2">
          <YnabConnectionCard
            isConnected={!!hasYnabConnected}
            settings={ynabSettings}
          />

          <SplitwiseConnectionCard
            isConnected={!!hasSplitwiseConnected}
            apiKey={splitwiseApiKey}
            settings={userSettings}
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
              <p className="text-sm text-gray-500 mb-2">No sync history yet</p>
              {isFullyConfigured ? (
                <p className="text-sm text-gray-400">
                  Flag a transaction in YNAB or click the sync button to get
                  started
                </p>
              ) : (
                <p className="text-sm text-gray-400">
                  Complete your configuration to start syncing
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
