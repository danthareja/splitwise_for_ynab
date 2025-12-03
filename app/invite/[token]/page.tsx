import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInviteByToken } from "@/app/actions/splitwise";
import { InviteFlow } from "./invite-flow";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Duo Account - Splitwise for YNAB",
  description: "Accept your partner's invite to sync expenses together.",
  robots: {
    index: false,
    follow: false,
  },
};

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const session = await auth();

  // Validate the invite token
  const inviteResult = await getInviteByToken(token);

  if (!inviteResult.success || !inviteResult.invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] dark:bg-[#0f0f0f]">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">😕</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Invalid Invite
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {inviteResult.error ||
                "This invite link is invalid or has expired."}
            </p>
            <Link
              href="/"
              className="text-amber-600 dark:text-amber-500 hover:underline"
            >
              Go to homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If user is already authenticated and has completed onboarding, redirect to dashboard
  // if (session?.user) {
  //   // Check if this user is already set up
  //   const { getUserOnboardingData } = await import("@/app/actions/db");
  //   const userData = await getUserOnboardingData();

  //   if (userData?.onboardingComplete) {
  //     redirect("/dashboard");
  //   }
  // }

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0f0f0f]">
      <InviteFlow
        token={token}
        invite={inviteResult.invite}
        isAuthenticated={!!session?.user}
      />
    </div>
  );
}
