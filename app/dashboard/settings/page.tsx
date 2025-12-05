import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getUserOnboardingData,
  getPartnershipStatus,
  getUserWithAccounts,
} from "@/app/actions/db";
import { getSplitwiseSettings } from "@/app/actions/splitwise";
import { getYNABSettings } from "@/app/actions/ynab";
import { getSubscriptionInfo } from "@/app/actions/subscription";
import { AppHeader } from "@/components/header";
import { Footer } from "@/components/footer";
import { SettingsContent } from "@/components/settings-content";
import { AccountSettingsCard } from "@/components/account-settings-card";
import {
  BillingSettings,
  NoSubscriptionCard,
  GrandfatheredCard,
} from "@/components/billing-settings";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { getYnabAuthStatus } from "@/lib/utils";

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

  const user = await getUserWithAccounts();
  const ynabSettings = await getYNABSettings();
  const splitwiseSettings = await getSplitwiseSettings();
  const partnershipStatus = await getPartnershipStatus();
  const subscriptionInfo = await getSubscriptionInfo();
  const params = await searchParams;
  const reconfigure = params.reconfigure === "true";

  // Check YNAB auth status (needs reconnection or just reconnected)
  const { isYnabAuthIssue } = getYnabAuthStatus(user);

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

          {/* Account section */}
          <section className="mb-10">
            <h2 className="text-xl font-serif text-gray-900 dark:text-white mb-4">
              Account
            </h2>
            <AccountSettingsCard
              userProfile={{
                name: onboardingData.userProfile.name,
                firstName: onboardingData.userProfile.firstName,
                lastName: onboardingData.userProfile.lastName,
                email: onboardingData.userProfile.email,
                image: onboardingData.userProfile.image,
              }}
            />
          </section>

          {/* Configuration section */}
          <section className="mb-10">
            <h2 className="text-xl font-serif text-gray-900 dark:text-white mb-4">
              Configuration
            </h2>
            <SettingsContent
              persona={onboardingData.persona}
              ynabSettings={ynabSettings}
              splitwiseSettings={splitwiseSettings}
              partnershipStatus={partnershipStatus}
              reconfigure={reconfigure}
              isYnabAuthIssue={isYnabAuthIssue ?? false}
            />
          </section>

          {/* Subscription section */}
          <section>
            <h2 className="text-xl font-serif text-gray-900 dark:text-white mb-4">
              Subscription
            </h2>
            {subscriptionInfo?.hasSubscription ? (
              // Active subscription takes priority - show billing management
              <BillingSettings subscription={subscriptionInfo} />
            ) : subscriptionInfo?.isGrandfathered ? (
              // Grandfathered users without active subscription
              <GrandfatheredCard
                currencyCode={splitwiseSettings?.currencyCode ?? undefined}
              />
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
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
