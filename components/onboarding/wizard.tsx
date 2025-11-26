"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateOnboardingStep, completeOnboarding } from "@/app/actions/user";
import type { Persona } from "@/app/actions/user";

// Step definitions
export const ONBOARDING_STEPS = [
  {
    id: 0,
    title: "Connect Splitwise",
    description: "Link your Splitwise account",
  },
  { id: 1, title: "Choose Setup", description: "Solo or dual mode" },
  {
    id: 2,
    title: "Configure YNAB",
    description: "Select your budget and account",
  },
  {
    id: 3,
    title: "Configure Splitwise",
    description: "Select your group and currency",
  },
  {
    id: 4,
    title: "Partner Setup",
    description: "Verify your partner (dual only)",
  },
] as const;

interface OnboardingWizardProps {
  initialStep: number;
  persona: Persona | null;
  hasSplitwiseConnection: boolean;
  hasYnabSettings: boolean;
  hasSplitwiseSettings: boolean;
  children: React.ReactNode;
}

export function OnboardingWizard({
  initialStep,
  persona,
  hasSplitwiseConnection,
  hasYnabSettings,
  hasSplitwiseSettings,
  children,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isNavigating, setIsNavigating] = useState(false);

  // Determine which steps to show based on persona
  const visibleSteps =
    persona === "dual"
      ? ONBOARDING_STEPS
      : ONBOARDING_STEPS.filter((step) => step.id !== 4);

  // Calculate completion status for each step
  const getStepStatus = (
    stepId: number,
  ): "completed" | "current" | "upcoming" => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "current";
    return "upcoming";
  };

  // During onboarding, steps are not clickable - users must progress linearly
  // They can edit settings later in /dashboard/settings after completing onboarding

  const goToStep = async (step: number) => {
    if (isNavigating) return;

    setIsNavigating(true);
    setCurrentStep(step);

    // Persist step to database
    await updateOnboardingStep(step);

    setIsNavigating(false);
  };

  const nextStep = async () => {
    const nextStepIndex = currentStep + 1;

    // Skip partner step for solo users
    if (persona === "solo" && nextStepIndex === 4) {
      // Complete onboarding for solo users after step 3
      await completeOnboarding();
      router.push("/dashboard");
      return;
    }

    // Check if we're done
    if (nextStepIndex > 4 || (persona === "dual" && nextStepIndex === 5)) {
      await completeOnboarding();
      router.push("/dashboard");
      return;
    }

    await goToStep(nextStepIndex);
    router.refresh();
  };

  const previousStep = async () => {
    if (currentStep > 0) {
      await goToStep(currentStep - 1);
      router.refresh();
    }
  };

  // Get current step info for mobile display
  const currentStepInfo = visibleSteps.find((_, idx) => {
    const step = visibleSteps[idx];
    return step && getStepStatus(step.id) === "current";
  });
  const currentStepIndex = visibleSteps.findIndex((_, idx) => {
    const step = visibleSteps[idx];
    return step && getStepStatus(step.id) === "current";
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#0f0f0f]">
      {/* Progress indicator - compact */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Mobile: Show current step info + progress dots */}
          <div className="flex items-center justify-between sm:hidden">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Step {currentStepIndex + 1} of {visibleSteps.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {visibleSteps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    getStepStatus(step.id) === "current"
                      ? "w-6 bg-amber-500"
                      : getStepStatus(step.id) === "completed"
                        ? "w-2 bg-green-500"
                        : "w-2 bg-gray-300 dark:bg-gray-600",
                  )}
                  aria-label={`Step ${step.id + 1}: ${step.title}`}
                />
              ))}
            </div>
          </div>

          {/* Desktop: Compact horizontal stepper (non-interactive during onboarding) */}
          <nav aria-label="Progress" className="hidden sm:block">
            <ol className="flex items-center gap-2">
              {visibleSteps.map((step, stepIdx) => (
                <li key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",
                      getStepStatus(step.id) === "completed"
                        ? "text-green-600 dark:text-green-500"
                        : getStepStatus(step.id) === "current"
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium"
                          : "text-gray-400 dark:text-gray-500",
                    )}
                  >
                    {getStepStatus(step.id) === "completed" ? (
                      <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                    ) : (
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                          getStepStatus(step.id) === "current"
                            ? "bg-amber-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400",
                        )}
                      >
                        {stepIdx + 1}
                      </span>
                    )}
                    <span>{step.title}</span>
                  </div>
                  {stepIdx !== visibleSteps.length - 1 && (
                    <div className="mx-1 text-gray-300 dark:text-gray-600">
                      ›
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <OnboardingStepContext.Provider
          value={{
            currentStep,
            persona,
            nextStep,
            previousStep,
            goToStep,
            isNavigating,
            hasSplitwiseConnection,
            hasYnabSettings,
            hasSplitwiseSettings,
          }}
        >
          {children}
        </OnboardingStepContext.Provider>
      </div>
    </div>
  );
}

// Context for step components to access wizard state
import { createContext, useContext } from "react";

interface OnboardingStepContextValue {
  currentStep: number;
  persona: Persona | null;
  nextStep: () => Promise<void>;
  previousStep: () => Promise<void>;
  goToStep: (step: number) => Promise<void>;
  isNavigating: boolean;
  hasSplitwiseConnection: boolean;
  hasYnabSettings: boolean;
  hasSplitwiseSettings: boolean;
}

const OnboardingStepContext = createContext<OnboardingStepContextValue | null>(
  null,
);

export function useOnboardingStep() {
  const context = useContext(OnboardingStepContext);
  if (!context) {
    throw new Error("useOnboardingStep must be used within OnboardingWizard");
  }
  return context;
}

// Reusable step wrapper component
interface StepContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function StepContainer({
  title,
  description,
  children,
}: StepContainerProps) {
  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-serif font-medium text-gray-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
