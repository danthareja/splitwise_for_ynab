import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserOnboardingData } from "@/app/actions/db";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { StepSplitwise } from "@/components/onboarding/step-splitwise";
import { StepPersona } from "@/components/onboarding/step-persona";
import { StepYnab } from "@/components/onboarding/step-ynab";
import { StepSplitwiseConfig } from "@/components/onboarding/step-splitwise-config";
import { StepPartner } from "@/components/onboarding/step-partner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setup - Splitwise for YNAB",
  description:
    "Complete your setup to start syncing expenses between YNAB and Splitwise.",
  robots: {
    index: false,
    follow: false,
  },
};

interface SetupPageProps {
  searchParams: Promise<{ auth_error?: string }>;
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const { auth_error } = await searchParams;
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const onboardingData = await getUserOnboardingData();

  if (!onboardingData) {
    redirect("/auth/signin");
  }

  // If already complete, redirect to dashboard
  if (onboardingData.onboardingComplete) {
    redirect("/dashboard");
  }

  // Determine the current step based on actual state
  // This helps recover from edge cases where step doesn't match reality
  let effectiveStep = onboardingData.onboardingStep;

  // If no Splitwise connection, must be at step 0
  if (!onboardingData.hasSplitwiseConnection && effectiveStep > 0) {
    effectiveStep = 0;
  }
  // If has connection but no persona, should be at step 1
  else if (
    onboardingData.hasSplitwiseConnection &&
    !onboardingData.persona &&
    effectiveStep > 1
  ) {
    effectiveStep = 1;
  }
  // If has persona but no YNAB settings, should be at step 2
  else if (
    onboardingData.persona &&
    !onboardingData.hasYnabSettings &&
    effectiveStep > 2
  ) {
    effectiveStep = 2;
  }
  // If has YNAB settings but no Splitwise settings, should be at step 3
  else if (
    onboardingData.hasYnabSettings &&
    !onboardingData.hasSplitwiseSettings &&
    effectiveStep > 3
  ) {
    effectiveStep = 3;
  }

  // Render the current step content
  const renderStepContent = () => {
    switch (effectiveStep) {
      case 0:
        return (
          <StepSplitwise
            authError={auth_error}
            userProfile={onboardingData.userProfile}
          />
        );
      case 1:
        return <StepPersona />;
      case 2:
        return <StepYnab initialSettings={onboardingData.ynabSettings} />;
      case 3:
        return (
          <StepSplitwiseConfig
            initialSettings={onboardingData.splitwiseSettings}
          />
        );
      case 4:
        return <StepPartner />;
      default:
        return <StepSplitwise />;
    }
  };

  return (
    <OnboardingWizard
      initialStep={effectiveStep}
      persona={onboardingData.persona}
      hasSplitwiseConnection={onboardingData.hasSplitwiseConnection}
      hasYnabSettings={onboardingData.hasYnabSettings}
      hasSplitwiseSettings={onboardingData.hasSplitwiseSettings}
    >
      {renderStepContent()}
    </OnboardingWizard>
  );
}
