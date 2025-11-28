"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { linkAsSecondary } from "@/app/actions/splitwise";
import { ArrowRight, Loader2, Check, AlertCircle, Users } from "lucide-react";

interface InviteFlowProps {
  token: string;
  invite: {
    primaryUserId: string;
    primaryName: string;
    primaryEmail?: string | null;
    groupId: string;
    groupName: string | null;
    currencyCode: string;
    defaultSplitRatio: string;
    primaryEmoji: string;
  };
  isAuthenticated: boolean;
}

export function InviteFlow({
  token,
  invite,
  isAuthenticated,
}: InviteFlowProps) {
  const router = useRouter();
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If authenticated, automatically link and redirect to onboarding
  const handleContinueToOnboarding = async () => {
    setIsLinking(true);
    setError(null);

    try {
      const result = await linkAsSecondary(token);

      if (result.success) {
        // Redirect to onboarding - they'll start at step 0 (Connect Splitwise)
        router.push("/dashboard/setup");
      } else {
        setError(result.error || "Failed to join duo account");
      }
    } catch (error) {
      console.error("Failed to join duo account:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsLinking(false);
    }
  };

  const handleSignIn = () => {
    // Redirect to sign in with callback to this invite page
    const callbackUrl = `/invite/${token}`;
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-4">
          <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Join {invite.primaryName}&apos;s duo account
        </h1>
        <p className="text-gray-500">
          {invite.primaryName} invited you to sync expenses together
        </p>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-[#141414] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        {!isAuthenticated ? (
          <>
            <div className="space-y-4 mb-6">
              <p className="text-gray-600 dark:text-gray-300">
                Sign in with YNAB to get started. After signing in, you&apos;ll:
              </p>
              <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium">
                    1
                  </span>
                  <span>Connect your Splitwise account</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium">
                    2
                  </span>
                  <span>Choose your YNAB plan and account</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-medium">
                    3
                  </span>
                  <span>Pick your sync marker and preferences</span>
                </li>
              </ol>
            </div>

            <Button
              onClick={handleSignIn}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full"
            >
              Sign in with YNAB
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Signed in with YNAB
                </p>
                <p className="text-sm text-gray-500">
                  Ready to join {invite.primaryName}&apos;s duo account
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleContinueToOnboarding}
              disabled={isLinking}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full"
            >
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Continue setup
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        )}
      </div>

      {/* Settings preview */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-sm">
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          You&apos;ll share these settings with {invite.primaryName}:
        </p>
        <ul className="space-y-1 text-gray-600 dark:text-gray-300">
          <li>• Splitwise group: {invite.groupName || "Shared group"}</li>
          <li>• Currency: {invite.currencyCode}</li>
          <li>• Split ratio: {invite.defaultSplitRatio || "1:1"}</li>
        </ul>
      </div>
    </div>
  );
}
