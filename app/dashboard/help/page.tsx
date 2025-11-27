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
            Help
          </h1>

          {/* FAQ Section */}
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>
                Common questions about syncing shared expenses
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

          {/* Contact Support */}
          <Card className="mt-6">
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
