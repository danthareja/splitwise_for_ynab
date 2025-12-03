import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserOnboardingData, getPartnershipStatus } from "@/app/actions/db";
import { getSplitwiseSettings } from "@/app/actions/splitwise";
import { getYNABSettings } from "@/app/actions/ynab";
import { getSubscriptionInfo } from "@/app/actions/subscription";
import { AppHeader } from "@/components/header";
import { Footer } from "@/components/footer";
import { SettingsContent } from "@/components/settings-content";
import {
  BillingSettings,
  NoSubscriptionCard,
} from "@/components/billing-settings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Splitwise for YNAB",
  description: "Manage your YNAB and Splitwise configuration settings.",
  robots: {
    index: false,
    follow: false,
  },
};

interface SettingsPageProps {
  searchParams: Promise<{ reconfigure?: string }>;
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
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

  const ynabSettings = await getYNABSettings();
  const splitwiseSettings = await getSplitwiseSettings();
  const partnershipStatus = await getPartnershipStatus();
  const subscriptionInfo = await getSubscriptionInfo();
  const params = await searchParams;
  const reconfigure = params.reconfigure === "true";

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
            Settings
          </h1>

          <SettingsContent
            persona={onboardingData.persona}
            ynabSettings={ynabSettings}
            splitwiseSettings={splitwiseSettings}
            partnershipStatus={partnershipStatus}
            reconfigure={reconfigure}
          />

          {/* Billing section */}
          <div className="mt-8">
            <h2 className="text-xl font-serif text-gray-900 dark:text-white mb-4">
              Subscription
            </h2>
            {subscriptionInfo?.hasSubscription ? (
              <BillingSettings subscription={subscriptionInfo} />
            ) : (
              <NoSubscriptionCard
                hadPreviousSubscription={
                  subscriptionInfo?.hadPreviousSubscription ?? false
                }
                expiredAt={subscriptionInfo?.currentPeriodEnd}
                currencyCode={splitwiseSettings?.currencyCode ?? undefined}
                isSecondary={partnershipStatus?.type === "secondary"}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
