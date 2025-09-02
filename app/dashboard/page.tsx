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
import { ApiKeyCard } from "@/components/api-key-card";
import type { Metadata } from "next";
import { MAX_REQUESTS, WINDOW_SECONDS } from "@/lib/rate-limit";
import { redirect } from "next/navigation";
import { DisabledAccountAlert } from "@/components/disabled-account-alert";
import { getUserFirstName } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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

const MAX_SYNC_HISTORY_ITEMS = 7; // A week of automatic syncs

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
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
            {getUserFirstName(user)
              ? `Welcome back, ${getUserFirstName(user)}!`
              : "Welcome!"}
          </h1>

          {/* Disabled Account Alert */}
          {user.disabled && user.disabledReason && (
            <DisabledAccountAlert
              disabledReason={user.disabledReason}
              suggestedFix={user.suggestedFix}
            />
          )}

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
                    We&apos;re here to help! Check the {""}
                    <a
                      href="#faq"
                      className="text-gray-900 underline hover:text-gray-700"
                    >
                      FAQ
                    </a>{" "}
                    below or email us at{" "}
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
                <div className="flex items-center gap-2">
                  <a href="#faq" className="underline">
                    View FAQ
                  </a>
                  <span className="text-gray-300">|</span>
                  <a
                    href="mailto:support@splitwiseforynab.com?subject=Help!"
                    className="flex items-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Support
                  </a>
                </div>
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

          {/* API Key Section */}
          {isFullyConfigured && !user.disabled && (
            <ApiKeyCard
              initialApiKey={user.apiKey ?? null}
              maxRequests={MAX_REQUESTS}
              windowSeconds={WINDOW_SECONDS}
              baseUrl={process.env.NEXT_PUBLIC_BASE_URL}
            />
          )}

          {/* FAQ Section */}
          <div id="faq" className="mt-8">
            <h2 className="text-xl font-semibold mb-3">FAQ</h2>
            <Card>
              <CardContent className="p-2 sm:p-6">
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
                        For one‑off special ratios, enter the expense directly
                        in Splitwise with custom splits. When you front a full
                        purchase for your partner, add an expense in Splitwise
                        where you&apos;re owed the full amount; the synchronized
                        flows will net out cleanly in YNAB (works well with a
                        reimbursements category).
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q-partner-uses-ynab">
                    <AccordionTrigger>
                      What if my partner also uses YNAB?
                    </AccordionTrigger>
                    <AccordionContent>
                      You and your partner can both create a Splitwise for YNAB
                      acccount and connect to the same Splitwise group.
                      We&apos;ll sync each person&apos;s flagged transactions
                      automatically.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q-inflows">
                    <AccordionTrigger>
                      What happens if I flag an inflow in YNAB?
                    </AccordionTrigger>
                    <AccordionContent>
                      Splitwise only supports expenses (outflows), so inflows do
                      not sync. Flagged inflows will fail with an error like:
                      “Splitwise can&apos;t create expense (equal split) for
                      amount -500: Cost must be greater than or equal to 0”.
                      <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                        Tip: For proceeds you receive (e.g., selling an item you
                        and your partner owned), split the inflow inside YNAB.
                        Allocate your share to your normal category and your
                        partner’s share to a reimbursements category, then
                        settle outside of Splitwise.
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

                  <AccordionItem value="q-remove-flag">
                    <AccordionTrigger>
                      What happens if I remove the success flag in YNAB?
                    </AccordionTrigger>
                    <AccordionContent>
                      Nothing happens immediately. If you later re‑apply your
                      sync flag to that same transaction, it will be treated as
                      new and synced again, creating a duplicate in Splitwise.
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
                      <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          Example: You front the full cost ($200)
                        </h4>
                        <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                          Assume a $200 purchase that your partner will fully
                          reimburse.
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium mb-1">In YNAB:</p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>$-200 → Reimbursements (original outflow)</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium mb-1">
                              In Splitwise (manual expense):
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>
                                Partner owes you $200 (100% of the purchase)
                              </li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-3 grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium mb-1">
                              When the inflow syncs back to YNAB:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>
                                $+200 → Reimbursements (Splitwise account
                                inflow)
                              </li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-medium mb-1">
                              Result after sync:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                              <li>Reimbursements nets to $0</li>
                              <li>Your spending categories remain unchanged</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q-settle-up">
                    <AccordionTrigger>
                      How does Splitwise “Settle Up” show up in YNAB?
                    </AccordionTrigger>
                    <AccordionContent>
                      Settling up adds a transaction in your Splitwise cash
                      account in the appropriate direction. You can then match
                      it to the imported e‑transfer from your bank as a transfer
                      to/from your real account to keep everything reconciled.
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q-split-transactions">
                    <AccordionTrigger>
                      How can I handle complex “Costco‑style” split
                      transactions?
                    </AccordionTrigger>
                    <AccordionContent>
                      There are two approaches:
                      <ol className="list-decimal pl-5 mt-2 space-y-2">
                        <li>
                          Calculate what your partner owes for their items plus
                          their share of shared items, and create a manual
                          expense in Splitwise for that amount. In YNAB, split
                          the original outflow into separate lines for
                          reimbursements, your personal items, and shared items.
                          The synced Splitwise inflow can be categorized back to
                          reimbursements and the shared category to keep
                          everything accurate.
                          <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                              Example: $600 Costco trip
                            </h4>
                            <p className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                              Assume $600 total: $200 partner&apos;s clothes,
                              $100 your items, $300 shared groceries.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium mb-1">
                                  In YNAB (split the original outflow):
                                </p>
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>
                                    $-200 → Reimbursements (partner&apos;s
                                    clothes)
                                  </li>
                                  <li>$-100 → Your stuff</li>
                                  <li>$-300 → Groceries</li>
                                </ul>
                              </div>
                              <div>
                                <p className="font-medium mb-1">
                                  In Splitwise (manual expense):
                                </p>
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>
                                    Partner owes you $350 ($200 + half of $300
                                    groceries = $150)
                                  </li>
                                </ul>
                              </div>
                            </div>
                            <div className="mt-3 grid sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium mb-1">
                                  YNAB categorization of the synced inflow:
                                </p>
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>$+200 → Reimbursements</li>
                                  <li>$+150 → Groceries</li>
                                </ul>
                              </div>
                              <div>
                                <p className="font-medium mb-1">
                                  Result after sync:
                                </p>
                                <ul className="list-disc pl-5 space-y-1">
                                  <li>Reimbursements nets to $0</li>
                                  <li>Groceries shows $-150 (your half)</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </li>
                        <li>
                          Record separate transactions in YNAB (e.g., from
                          multiple swipes or manual entries): one for your
                          partner’s items, one for yours, and one for the shared
                          portion. This can make categorization and syncing
                          clearer.
                        </li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="q-api-limits">
                    <AccordionTrigger>
                      How many expenses can I sync at once?
                    </AccordionTrigger>
                    <AccordionContent>
                      Because of YNAB API limits, large backfills may create
                      only ~25 expenses per run today. For big catch‑up jobs,
                      batch your flagged transactions (for example 20–30 at a
                      time) and space runs a few minutes apart to avoid rate
                      limits.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
