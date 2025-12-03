"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StepContainer, useOnboardingStep } from "./wizard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CreditCard,
  Shield,
  Check,
  Sparkles,
  Calendar,
  Clock,
  Users,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPricingDisplay,
  calculateAnnualSavings,
  TRIAL_DAYS,
  type PricingInterval,
} from "@/lib/stripe-pricing";
import { completeOnboarding } from "@/app/actions/user";

interface StepPaymentProps {
  currencyCode?: string;
  isDuo?: boolean;
}

export function StepPayment({
  currencyCode = "USD",
  isDuo = false,
}: StepPaymentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { previousStep, isNavigating } = useOnboardingStep();

  const [selectedInterval, setSelectedInterval] =
    useState<PricingInterval>("year");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const pricing = getPricingDisplay(currencyCode);
  const savings = calculateAnnualSavings(currencyCode);

  // Check if returning from Stripe Checkout
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const checkoutCanceled = searchParams.get("checkout") === "canceled";

  // Handle going back - need to clear checkout param first so server doesn't force step 4
  const handleBack = async () => {
    // If there's a checkout param in the URL, clear it first
    if (searchParams.has("checkout")) {
      router.replace("/dashboard/setup");
      // Small delay to ensure URL is updated before navigation
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    await previousStep();
  };

  // If checkout was successful, complete onboarding
  if (checkoutSuccess) {
    return (
      <StepContainer
        title="You're all set! 🎉"
        description="Your free trial has started"
      >
        <SuccessContent isDuo={isDuo} />
      </StepContainer>
    );
  }

  const handleStartTrial = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/dashboard/setup?checkout=success`;
      const cancelUrl = `${baseUrl}/dashboard/setup?checkout=canceled`;

      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval: selectedInterval,
          // Use the normalized currency from pricing (handles fallback to USD for unsupported currencies)
          currencyCode: pricing.currency,
          successUrl,
          cancelUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <StepContainer
      title="Start your free trial"
      description="Choose your plan. Cancel anytime."
    >
      {/* Add padding at bottom on mobile to account for sticky footer */}
      <div className="space-y-4 sm:space-y-6 pb-40 sm:pb-0">
        {/* Checkout canceled message */}
        {checkoutCanceled && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Checkout was canceled. No worries! Choose a plan when you&apos;re
              ready.
            </AlertDescription>
          </Alert>
        )}

        {/* Plan selection - first for mobile visibility */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PlanOption
              interval="year"
              title="Annual"
              price={pricing.annualDisplay}
              perMonth={`${pricing.annualPerMonth}/mo`}
              savings={`Save ${savings.percentage}%`}
              isSelected={selectedInterval === "year"}
              onSelect={() => setSelectedInterval("year")}
              recommended
            />
            <PlanOption
              interval="month"
              title="Monthly"
              price={pricing.monthlyDisplay}
              perMonth="/month"
              isSelected={selectedInterval === "month"}
              onSelect={() => setSelectedInterval("month")}
            />
          </div>
        </div>

        {/* Trial benefits - compact version */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1.5">
                {TRIAL_DAYS}-day free trial
              </h3>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500 flex-shrink-0" />
                  Full access • Unlimited syncs • Cancel anytime
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Duo account benefit */}
        {isDuo && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  Your partner joins for free!
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  One subscription covers both of you.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* What happens next - collapsible on mobile */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
          {/* Mobile: collapsible */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="sm:hidden w-full flex items-center justify-between p-3 text-sm font-medium text-gray-900 dark:text-white"
          >
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              What happens next
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showDetails && "rotate-180",
              )}
            />
          </button>

          {/* Mobile: expandable content */}
          <div
            className={cn(
              "sm:hidden overflow-hidden transition-all",
              showDetails ? "max-h-96 pb-3" : "max-h-0",
            )}
          >
            <div className="px-3 space-y-2 text-sm">
              <TimelineItem
                step={1}
                title="Today: Start your free trial"
                description="Enter your card—you won't be charged yet"
                isFirst
              />
              <TimelineItem
                step={2}
                title={`Day ${TRIAL_DAYS - 3}: Reminder email`}
                description="We'll email you before your trial ends"
              />
              <TimelineItem
                step={3}
                title={`Day ${TRIAL_DAYS}: First charge`}
                description={
                  selectedInterval === "year"
                    ? `${pricing.annualDisplay}/year—or cancel before`
                    : `${pricing.monthlyDisplay}/month—or cancel before`
                }
              />
            </div>
          </div>

          {/* Desktop: always visible */}
          <div className="hidden sm:block p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4 w-4" />
              What happens next
            </h4>
            <div className="space-y-2 text-sm">
              <TimelineItem
                step={1}
                title="Today: Start your free trial"
                description="Enter your card—you won't be charged yet"
                isFirst
              />
              <TimelineItem
                step={2}
                title={`Day ${TRIAL_DAYS - 3}: Reminder email`}
                description="We'll email you 3 days before your trial ends"
              />
              <TimelineItem
                step={3}
                title={`Day ${TRIAL_DAYS}: First charge`}
                description={
                  selectedInterval === "year"
                    ? `${pricing.annualDisplay}/year—or cancel before for free`
                    : `${pricing.monthlyDisplay}/month—or cancel before for free`
                }
              />
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Desktop action buttons */}
        <div className="hidden sm:flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isLoading || isNavigating}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleStartTrial}
            disabled={isLoading || isNavigating}
            className="flex-1 gap-2 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to checkout...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Desktop security note */}
        <div className="hidden sm:flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Shield className="h-4 w-4" />
          <span>Secured by Stripe. Cancel anytime.</span>
        </div>
      </div>

      {/* Mobile sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 p-4 space-y-2 z-50 shadow-lg">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isLoading || isNavigating}
            size="lg"
            className="px-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleStartTrial}
            disabled={isLoading || isNavigating}
            size="lg"
            className="flex-1 gap-2 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Start Free Trial
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Shield className="h-3 w-3" />
          <span>Secured by Stripe. Cancel anytime.</span>
        </div>
      </div>
    </StepContainer>
  );
}

/** Timeline item for "What happens next" section */
function TimelineItem({
  step,
  title,
  description,
  isFirst = false,
}: {
  step: number;
  title: string;
  description: string;
  isFirst?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          isFirst
            ? "bg-amber-100 dark:bg-amber-900/50"
            : "bg-gray-200 dark:bg-gray-700",
        )}
      >
        <span
          className={cn(
            "text-xs font-medium",
            isFirst
              ? "text-amber-700 dark:text-amber-300"
              : "text-gray-600 dark:text-gray-400",
          )}
        >
          {step}
        </span>
      </div>
      <div>
        <p className="text-gray-900 dark:text-white font-medium">{title}</p>
        <p className="text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

interface PlanOptionProps {
  interval: PricingInterval;
  title: string;
  price: string;
  perMonth: string;
  savings?: string;
  isSelected: boolean;
  onSelect: () => void;
  recommended?: boolean;
}

function PlanOption({
  title,
  price,
  perMonth,
  savings,
  isSelected,
  onSelect,
  recommended,
}: PlanOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 transition-all text-left",
        isSelected
          ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
      )}
    >
      {recommended && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-white text-xs font-medium rounded-full whitespace-nowrap">
          Best value
        </span>
      )}
      <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
        {title}
      </span>
      <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
        {price}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {title === "Annual" ? perMonth : "billed monthly"}
      </span>
      {savings && (
        <span className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">
          {savings}
        </span>
      )}
    </button>
  );
}

/**
 * Success content shown after Stripe Checkout completes
 */
function SuccessContent({ isDuo = false }: { isDuo?: boolean }) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await completeOnboarding();
      router.push("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      // Still redirect even if there's an error
      router.push("/dashboard");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Your {TRIAL_DAYS}-day trial has started!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You have full access to all features. We&apos;ll remind you before
          your trial ends.
        </p>
      </div>

      {isDuo && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm text-gray-900 dark:text-white font-medium">
                We&apos;ve invited your partner!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Have them check their email to join your account for free
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div>
            <p className="text-sm text-gray-900 dark:text-white font-medium">
              Trial reminder
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We&apos;ll email you 3 days before your trial ends
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleComplete}
        disabled={isCompleting}
        className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
      >
        {isCompleting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Setting up...
          </>
        ) : (
          <>
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}
