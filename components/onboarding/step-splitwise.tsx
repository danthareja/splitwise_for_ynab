"use client";

import { StepContainer, useOnboardingStep } from "./wizard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExternalLink,
  Shield,
  ArrowRight,
  Check,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { disconnectSplitwiseAccount } from "@/app/actions/splitwise";
import Image from "next/image";

interface StepSplitwiseProps {
  authError?: string;
  userProfile?: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function StepSplitwise({ authError, userProfile }: StepSplitwiseProps) {
  const router = useRouter();
  const { nextStep, hasSplitwiseConnection, isNavigating, isSecondary } =
    useOnboardingStep();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await signIn("splitwise", { callbackUrl: "/dashboard/setup" });
    } catch (error) {
      console.error("Error connecting to Splitwise:", error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectSplitwiseAccount();
      router.refresh();
    } catch (error) {
      console.error("Error disconnecting Splitwise:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Get error message based on error type
  const getErrorMessage = () => {
    switch (authError) {
      case "cancelled":
        return "Connection cancelled. Click below to try again.";
      case "error":
      case "missing_code":
        return "Something went wrong connecting to Splitwise. Please try again.";
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage();

  // If connected, show profile confirmation
  if (hasSplitwiseConnection) {
    return (
      <StepContainer
        title="Splitwise Connected!"
        description="Confirm this is the right account before continuing."
      >
        {/* Secondary user context */}
        {isSecondary && (
          <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Make sure this Splitwise account has access to your duo
              account&apos;s shared group.
            </AlertDescription>
          </Alert>
        )}

        {/* Profile card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            {userProfile?.image ? (
              <Image
                src={userProfile.image}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {userProfile?.name || "Splitwise User"}
              </p>
              {userProfile?.email && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {userProfile.email}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Connected
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={nextStep}
            disabled={isNavigating || isDisconnecting}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full h-12 text-base"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting || isNavigating}
            className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-2 py-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isDisconnecting ? "Disconnecting..." : "Wrong account? Disconnect"}
          </button>
        </div>
      </StepContainer>
    );
  }

  return (
    <StepContainer
      title="Connect Splitwise"
      description="Link your Splitwise account to start syncing shared expenses."
    >
      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main CTA - above the fold on mobile */}
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full h-12 text-base mb-6"
      >
        {isConnecting ? (
          "Connecting..."
        ) : (
          <>
            Connect with Splitwise
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {/* Trust indicators - compact */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400 mb-8">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          <span>Secure OAuth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          <span>Limited access</span>
        </div>
      </div>

      {/* Secondary info - for users who need it */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <a
          href="https://www.splitwise.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-amber-600 dark:text-amber-500 hover:underline"
        >
          Don&apos;t have Splitwise? Sign up free
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </div>
    </StepContainer>
  );
}
