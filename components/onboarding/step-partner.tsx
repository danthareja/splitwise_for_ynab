"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepContainer, useOnboardingStep } from "./wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { checkPartnerConnection } from "@/app/actions/splitwise";
import { completeOnboarding } from "@/app/actions/user";
import {
  ArrowRight,
  ArrowLeft,
  Users,
  Check,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";

export function StepPartner() {
  const router = useRouter();
  const { previousStep, isNavigating } = useOnboardingStep();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [partnerConnected, setPartnerConnected] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  useEffect(() => {
    checkPartner();
  }, []);

  async function checkPartner() {
    setIsLoading(true);
    try {
      const status = await checkPartnerConnection();
      if (status?.partnerConnected) {
        setPartnerConnected(true);
        setPartnerName(status.partnerName || null);
      }
    } catch (err) {
      console.error("Error checking partner status:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleComplete() {
    setIsSaving(true);
    try {
      await completeOnboarding();
      router.push("/dashboard");
    } catch (err) {
      console.error("Error completing onboarding:", err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkip() {
    // Still complete onboarding, partner can connect later
    await handleComplete();
  }

  if (isLoading) {
    return (
      <StepContainer
        title="Partner Setup"
        description="Checking if your partner has connected..."
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">
            Checking partner status...
          </span>
        </div>
      </StepContainer>
    );
  }

  return (
    <StepContainer
      title="Partner Setup"
      description="For dual mode, your partner also needs to connect to Splitwise for YNAB"
    >
      <div className="space-y-6">
        {/* Requirements explanation */}
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent>
            <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Dual Mode Requirements
            </h3>
            <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-2 list-disc list-inside">
              <li>Each partner needs their own Splitwise for YNAB account</li>
              <li>Both accounts must connect to the same Splitwise group</li>
              <li>Each partner should use a different sync marker emoji</li>
            </ul>
            <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-700">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Need an extra YNAB subscription?</strong>{" "}
                <a
                  href="https://www.ynab.com/together"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center underline hover:no-underline"
                >
                  YNAB Together
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>{" "}
                lets households share one subscription across multiple budgets.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Partner status */}
        {partnerConnected ? (
          <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Partner Connected!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {partnerName
                      ? `${partnerName} is connected to the same Splitwise group`
                      : "Your partner is connected to the same Splitwise group"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Waiting for Partner
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your partner hasn&apos;t connected yet. Share this link with
                    them:
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <code className="text-sm text-gray-700 dark:text-gray-300 break-all">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/auth/signin`
                    : "https://splitwiseforynab.com/auth/signin"}
                </code>
              </div>
            </CardContent>
          </Card>
        )}

        <Alert>
          <AlertDescription>
            You can skip this step and your partner can connect later. Your
            syncs will work independently until then.
          </AlertDescription>
        </Alert>
      </div>

      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          onClick={previousStep}
          disabled={isNavigating || isSaving}
          className="rounded-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-3">
          {!partnerConnected && (
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isNavigating || isSaving}
              className="rounded-full"
            >
              Skip for Now
            </Button>
          )}
          <Button
            onClick={handleComplete}
            disabled={isNavigating || isSaving}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6"
          >
            {isSaving ? "Completing..." : "Complete Setup"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </StepContainer>
  );
}
