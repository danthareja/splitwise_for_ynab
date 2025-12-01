import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserOnboardingData } from "@/app/actions/db";
import { AppHeader } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
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
  title: "Help - Splitwise for YNAB",
  description: "Get help with syncing expenses between YNAB and Splitwise.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HelpPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const onboardingData = await getUserOnboardingData();

  if (!onboardingData) {
    redirect("/auth/signin");
  }

  // Redirect to setup if onboarding is not complete
  if (!onboardingData.onboardingComplete) {
    redirect("/dashboard/setup");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] dark:bg-[#0f0f0f]">
      <AppHeader />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back to dashboard */}
          <div className="mb-6">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full -ml-2"
            >
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <h1 className="text-3xl font-serif text-gray-900 dark:text-white mb-8">
            Help &amp; FAQs
          </h1>

          {/* General Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📖</span> General
              </CardTitle>
              <CardDescription>How Splitwise for YNAB works</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="general-what-is">
                  <AccordionTrigger>
                    What is Splitwise for YNAB?
                  </AccordionTrigger>
                  <AccordionContent>
                    Splitwise for YNAB automatically syncs shared expenses
                    between{" "}
                    <a
                      href="https://ynab.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 dark:text-amber-500 hover:underline"
                    >
                      YNAB
                    </a>{" "}
                    and{" "}
                    <a
                      href="https://splitwise.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 dark:text-amber-500 hover:underline"
                    >
                      Splitwise
                    </a>
                    . Instead of manually creating split transactions or losing
                    category insight, you simply flag a shared expense in
                    YNAB—we create the Splitwise entry and an adjustment
                    transaction that keeps your category spending accurate.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="general-phantom-account">
                  <AccordionTrigger>
                    What&apos;s a &ldquo;phantom&rdquo; Splitwise account?
                  </AccordionTrigger>
                  <AccordionContent>
                    It&apos;s a cash account in YNAB that represents your
                    Splitwise balance—not a real bank account, just an IOU
                    ledger. When you pay for something shared, we add an inflow
                    to this account (your partner owes you). When your partner
                    pays, we add an outflow (you owe them). The balance should
                    match your Splitwise app balance.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      <strong>Positive balance:</strong> You&apos;re owed money
                      <br />
                      <strong>Negative balance:</strong> You owe money
                      <br />
                      <strong>Zero balance:</strong> You&apos;re settled up
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="general-how-it-works">
                  <AccordionTrigger>How does syncing work?</AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>
                        <strong>Flag a shared expense</strong> in YNAB with your
                        chosen flag color
                      </li>
                      <li>
                        <strong>Click &ldquo;Sync Now&rdquo;</strong> on your
                        dashboard (or wait for automatic sync)
                      </li>
                      <li>
                        <strong>We create the expense</strong> in Splitwise with
                        your configured split ratio
                      </li>
                      <li>
                        <strong>We add an adjustment</strong> in YNAB—an inflow
                        to your Splitwise account in the same category, for your
                        partner&apos;s share
                      </li>
                      <li>
                        <strong>Your category balance</strong> now reflects only
                        what you actually spent
                      </li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="general-auto-sync">
                  <AccordionTrigger>
                    Does syncing happen automatically?
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes! We automatically sync your expenses once a day. You can
                    also trigger a manual sync anytime from your dashboard.
                    Manual syncs are rate-limited to respect API abuse policies.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="general-cost">
                  <AccordionTrigger>
                    Is Splitwise for YNAB free?
                  </AccordionTrigger>
                  <AccordionContent>
                    Yes, Splitwise for YNAB is completely free to use. Both
                    Splitwise and YNAB have their own pricing—we just connect
                    them together at no additional cost.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="general-security">
                  <AccordionTrigger>Is my data secure?</AccordionTrigger>
                  <AccordionContent>
                    Yes. We use OAuth to connect to YNAB—we never see or store
                    your YNAB password. We only request the minimum permissions
                    needed.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Solo Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>👤</span> Solo Mode
              </CardTitle>
              <CardDescription>For when only you use YNAB</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="solo-what-is">
                  <AccordionTrigger>What is Solo mode?</AccordionTrigger>
                  <AccordionContent>
                    Solo mode is for couples where only one person uses YNAB.
                    You can flag shared expenses in YNAB and sync them to
                    Splitwise. Your partner uses Splitwise to track what they
                    owe or are owed—no YNAB account needed.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      Your partner can still add expenses directly to your
                      shared Splitwise group. Those expenses will appear as
                      outflows in your YNAB Splitwise account when you settle
                      up.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="solo-walkthrough">
                  <AccordionTrigger>
                    How does a typical sync flow work?
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div>
                        <strong className="text-amber-700 dark:text-amber-400">
                          1. You pay $150 for groceries
                        </strong>
                        <p className="mt-1">
                          Flag the transaction in YNAB with your chosen flag
                          color. We create the expense in Splitwise and add a
                          $75 inflow to your Splitwise account in the same
                          category (Groceries). Your category now shows only $75
                          spent—your actual share.
                        </p>
                      </div>
                      <div>
                        <strong className="text-amber-700 dark:text-amber-400">
                          2. Your partner pays $50 for electricity
                        </strong>
                        <p className="mt-1">
                          They add it directly to your shared Splitwise group
                          (no YNAB needed). We add a $25 outflow to your YNAB
                          Splitwise account in your Utilities category. Your net
                          balance: +$50 (they still owe you).
                        </p>
                      </div>
                      <div>
                        <strong className="text-amber-700 dark:text-amber-400">
                          3. Settle up
                        </strong>
                        <p className="mt-1">
                          When your partner pays you (Venmo, cash, etc.), record
                          it as a transfer in YNAB from Splitwise → Checking.
                          Your Splitwise account goes to zero. Because it&apos;s
                          a transfer, your category totals don&apos;t
                          change—they still reflect your actual share.
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <a
                          href="/#walkthrough-solo"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-amber-700 dark:text-amber-500 hover:underline inline-flex items-center gap-1"
                        >
                          See the interactive walkthrough →
                        </a>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="solo-partner-expense">
                  <AccordionTrigger>
                    What if my partner pays for something?
                  </AccordionTrigger>
                  <AccordionContent>
                    Your partner can add the expense directly to your shared
                    Splitwise group. It won&apos;t sync to YNAB automatically,
                    but you&apos;ll see the balance update in Splitwise. When
                    you settle up (transfer money to your partner), record that
                    as a transfer from your bank account to your Splitwise
                    account in YNAB to keep things reconciled.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="solo-group-exclusive">
                  <AccordionTrigger>
                    Can I share a Splitwise group with another app user?
                  </AccordionTrigger>
                  <AccordionContent>
                    In Solo mode, your Splitwise group is exclusive to you—no
                    other Splitwise for YNAB user can use the same group. This
                    prevents conflicts and confusion about who synced what.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      If your partner also wants to use Splitwise for YNAB,
                      switch to Duo mode in Settings and invite them to your duo
                      account.
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Duo Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>👥</span> Duo Mode
              </CardTitle>
              <CardDescription>For when you both use YNAB</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="duo-what-is">
                  <AccordionTrigger>What is Duo mode?</AccordionTrigger>
                  <AccordionContent>
                    Duo mode is for couples where both partners have their own
                    YNAB budgets. You share the same Splitwise group, and
                    expenses flagged by either partner sync to both YNAB budgets
                    with the correct split amounts.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      This is perfect for partners who budget independently but
                      share household expenses.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duo-walkthrough">
                  <AccordionTrigger>
                    How does a typical sync flow work?
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div>
                        <strong className="text-blue-700 dark:text-blue-400">
                          1. You pay $150 for groceries
                        </strong>
                        <p className="mt-1">
                          Flag the transaction in YNAB. Both budgets update
                          automatically:
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                          <li>
                            <strong>Your YNAB:</strong> $75 inflow to your
                            Splitwise account (they owe you)
                          </li>
                          <li>
                            <strong>Partner&apos;s YNAB:</strong> $75 outflow
                            from their Splitwise account (their share)
                          </li>
                        </ul>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          Both budgets show $75 spent—each person&apos;s actual
                          share. Different category names in each budget? No
                          problem.
                        </p>
                      </div>
                      <div>
                        <strong className="text-blue-700 dark:text-blue-400">
                          2. Your partner pays $50 for electricity
                        </strong>
                        <p className="mt-1">
                          They flag it in their YNAB—same process, reversed:
                        </p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                          <li>
                            <strong>Your YNAB:</strong> $25 outflow added,
                            Splitwise balance now +$50
                          </li>
                          <li>
                            <strong>Partner&apos;s YNAB:</strong> $25 inflow
                            added, Splitwise balance now -$50
                          </li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-blue-700 dark:text-blue-400">
                          3. Settle up
                        </strong>
                        <p className="mt-1">
                          When they pay you $50 (Venmo, cash, etc.), both of you
                          record it as a transfer: Splitwise → Checking. Both
                          Splitwise accounts go to zero. Because it&apos;s a
                          transfer, category totals stay the same—reflecting
                          each person&apos;s actual share.
                        </p>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <a
                          href="/#walkthrough-dual"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-700 dark:text-blue-500 hover:underline inline-flex items-center gap-1"
                        >
                          See the interactive walkthrough →
                        </a>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duo-primary-secondary">
                  <AccordionTrigger>
                    What&apos;s the difference between Primary and Secondary?
                  </AccordionTrigger>
                  <AccordionContent>
                    <strong>Primary</strong> is the first person to set up the
                    Duo account. They control the shared settings:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Which Splitwise group to use</li>
                      <li>The currency for expenses</li>
                      <li>The default split ratio</li>
                    </ul>
                    <div className="mt-3">
                      <strong>Secondary</strong> joins the primary&apos;s duo
                      account and inherits these shared settings. They can only
                      customize their own:
                    </div>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>
                        Sync marker emoji (to distinguish who synced each
                        expense)
                      </li>
                      <li>Payee name preferences in YNAB</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duo-invite-partner">
                  <AccordionTrigger>
                    How do I invite my partner?
                  </AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>
                        Complete your setup in Duo mode (you&apos;ll be the
                        Primary)
                      </li>
                      <li>On your dashboard, you&apos;ll see an invite card</li>
                      <li>
                        Generate an invite link and share it with your partner
                      </li>
                      <li>
                        They sign in with YNAB, connect Splitwise, and complete
                        their setup
                      </li>
                    </ol>
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      Invite links expire after 7 days. You can generate a new
                      one anytime.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duo-join-existing">
                  <AccordionTrigger>
                    What if I select a group someone else is using?
                  </AccordionTrigger>
                  <AccordionContent>
                    If you select a Splitwise group that another Duo user is
                    already using, you&apos;ll see a prompt to join their duo
                    account. This is an alternative to the invite link—you can
                    join directly during setup if you both select the same
                    group.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      If a Solo user is using the group, you&apos;ll need to ask
                      them to switch to Duo mode and invite you.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duo-sync-marker">
                  <AccordionTrigger>
                    What&apos;s a sync marker emoji?
                  </AccordionTrigger>
                  <AccordionContent>
                    In Duo mode, each partner has a unique emoji that gets added
                    to synced expenses in Splitwise. This helps you quickly see
                    who synced each expense (e.g., 🤴 for one partner, 👸 for
                    the other).
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      You and your partner must choose different emojis to avoid
                      confusion.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duo-both-sync-same">
                  <AccordionTrigger>
                    What if we both flag the same expense?
                  </AccordionTrigger>
                  <AccordionContent>
                    Only flag an expense from the account that paid for it. If
                    you both flag the same expense, it will create duplicate
                    entries in Splitwise.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      <strong>Rule of thumb:</strong> Whoever&apos;s card was
                      charged flags the expense in their YNAB.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duo-change-role">
                  <AccordionTrigger>
                    Can I switch from Secondary to Primary?
                  </AccordionTrigger>
                  <AccordionContent>
                    Not directly. If you need to swap roles, the Primary should
                    switch to Solo mode (which disconnects the Duo account),
                    then you can set up fresh with you as the new Primary and
                    invite your partner as Secondary.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="duo-leave">
                  <AccordionTrigger>
                    What happens if I leave a Duo account?
                  </AccordionTrigger>
                  <AccordionContent>
                    <strong>If you&apos;re Secondary:</strong> You&apos;ll be
                    disconnected and your Splitwise group settings will be
                    cleared. You&apos;ll need to set up a new Splitwise group
                    since the old one is still used by your former Primary.
                    <div className="mt-3">
                      <strong>If you&apos;re Primary:</strong> Your partner
                      (Secondary) will be disconnected. They&apos;ll need to
                      reconfigure their Splitwise settings to continue syncing
                      independently.
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Advanced Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>⚙️</span> Advanced
              </CardTitle>
              <CardDescription>
                Edge cases and technical details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="adv-not-even-split">
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
                      Splitwise with custom splits instead of flagging in YNAB.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="adv-inflows">
                  <AccordionTrigger>
                    What happens if I flag an inflow in YNAB?
                  </AccordionTrigger>
                  <AccordionContent>
                    Splitwise only supports expenses (outflows), so inflows
                    cannot sync. Flagged inflows will fail with an error.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      <strong>Tip:</strong> For shared income you receive, split
                      the inflow inside YNAB manually. Allocate your share to
                      your normal category and your partner&apos;s share to a
                      reimbursements category.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="adv-delete-transaction">
                  <AccordionTrigger>
                    What if I delete a synced transaction?
                  </AccordionTrigger>
                  <AccordionContent>
                    Deletes do not cascade across systems. If you delete a
                    synced transaction in YNAB, you must manually delete the
                    corresponding expense in Splitwise, and vice versa.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      We recommend editing amounts rather than deleting if you
                      need to make corrections after syncing.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="adv-edits-after-sync">
                  <AccordionTrigger>
                    Do updates in Splitwise sync back to YNAB?
                  </AccordionTrigger>
                  <AccordionContent>
                    No—changes made in Splitwise after the initial sync do not
                    sync back to YNAB. For one‑off expenses with a different
                    split ratio, create the expense manually in Splitwise rather
                    than flagging in YNAB.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="adv-settle-up">
                  <AccordionTrigger>
                    How does Splitwise &quot;Settle Up&quot; show up in YNAB?
                  </AccordionTrigger>
                  <AccordionContent>
                    When you settle up in Splitwise (transfer money to your
                    partner), record it as a transfer in YNAB from your bank
                    account to your Splitwise account. This keeps your Splitwise
                    account balance accurate.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      If you&apos;re using e-transfer, you can match the YNAB
                      transfer to the imported bank transaction.
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="adv-api-limits">
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

                <AccordionItem value="adv-multiple-groups">
                  <AccordionTrigger>
                    Can I use multiple Splitwise groups?
                  </AccordionTrigger>
                  <AccordionContent>
                    Currently, Splitwise for YNAB supports one Splitwise group
                    per account. This should work for most couples sharing
                    household expenses. If you need multiple groups (e.g.,
                    different expense sharing with roommates), you&apos;d need
                    separate accounts.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="adv-currency-mismatch">
                  <AccordionTrigger>
                    What if my YNAB currency differs from Splitwise?
                  </AccordionTrigger>
                  <AccordionContent>
                    We recommend using the same currency in both YNAB and
                    Splitwise to avoid confusion. Set your currency in Splitwise
                    settings to match your YNAB budget currency. Multi-currency
                    support is not currently available.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="adv-sync-disabled">
                  <AccordionTrigger>Why was my sync paused?</AccordionTrigger>
                  <AccordionContent>
                    Sync can be paused if we encounter repeated errors—like
                    expired API tokens, deleted accounts, or network issues.
                    Check the error message on your dashboard and resolve the
                    issue, then click &ldquo;Re-enable Sync&rdquo; to resume.
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      Common fixes: Reconnect your Splitwise account in
                      Settings, or check that your YNAB budget and Splitwise
                      group still exist.
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Still have questions?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    We&apos;re here to help. Email us at{" "}
                    <a
                      href="mailto:support@splitwiseforynab.com?subject=Help!"
                      className="text-amber-700 dark:text-amber-500 hover:underline"
                    >
                      support@splitwiseforynab.com
                    </a>{" "}
                    and we&apos;ll get back to you as soon as possible.
                  </p>
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
