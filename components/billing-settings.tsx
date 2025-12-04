"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Clock,
  Users,
  Sparkles,
  Heart,
} from "lucide-react";
import { type SubscriptionInfo } from "@/app/actions/subscription";
import { cn } from "@/lib/utils";
import { getPricingDisplay, TRIAL_DAYS } from "@/lib/stripe-pricing";

interface BillingSettingsProps {
  subscription: SubscriptionInfo;
}

export function BillingSettings({ subscription }: BillingSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManageBilling = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/billing-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create billing portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing");
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatPrice = (amount: number | null, currency: string | null) => {
    if (amount === null || !currency) return null;
    // Amount is in smallest currency unit (cents), convert to decimal
    const decimalAmount = amount / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: decimalAmount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(decimalAmount);
  };

  const renewalPrice = formatPrice(
    subscription.renewalAmount,
    subscription.renewalCurrency,
  );
  const intervalLabel = subscription.interval === "year" ? "/year" : "/month";

  const getStatusBadge = () => {
    if (subscription.cancelAtPeriodEnd) {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
        >
          <Clock className="h-3 w-3 mr-1" />
          Canceling
        </Badge>
      );
    }

    switch (subscription.status) {
      case "trialing":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
          >
            <Clock className="h-3 w-3 mr-1" />
            Free Trial
          </Badge>
        );
      case "active":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case "past_due":
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Past Due
          </Badge>
        );
      case "canceled":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
          >
            Canceled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing
        </CardTitle>
        {getStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Trial status banner */}
        {subscription.isTrialing &&
          subscription.daysUntilTrialEnd !== null &&
          !subscription.cancelAtPeriodEnd && (
            <div
              className={cn(
                "rounded-lg p-4",
                subscription.daysUntilTrialEnd <= 7
                  ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                  : "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800",
              )}
            >
              <div className="flex items-start gap-3">
                <Clock
                  className={cn(
                    "h-5 w-5 mt-0.5",
                    subscription.daysUntilTrialEnd <= 7
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-blue-600 dark:text-blue-400",
                  )}
                />
                <div>
                  <p
                    className={cn(
                      "font-medium",
                      subscription.daysUntilTrialEnd <= 7
                        ? "text-amber-900 dark:text-amber-100"
                        : "text-blue-900 dark:text-blue-100",
                    )}
                  >
                    {subscription.daysUntilTrialEnd} day
                    {subscription.daysUntilTrialEnd !== 1 ? "s" : ""} left in
                    your free trial
                  </p>
                  <p
                    className={cn(
                      "text-sm mt-0.5",
                      subscription.daysUntilTrialEnd <= 7
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-blue-700 dark:text-blue-300",
                    )}
                  >
                    {subscription.isSharedFromPrimary
                      ? `Your partner's trial ends on ${formatDate(subscription.trialEndsAt)}`
                      : renewalPrice
                        ? `You'll be charged ${renewalPrice}${intervalLabel} on ${formatDate(subscription.trialEndsAt)}`
                        : `Your card will be charged on ${formatDate(subscription.trialEndsAt)}`}
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Cancellation notice */}
        {subscription.cancelAtPeriodEnd && (
          <div className="rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {subscription.isSharedFromPrimary
                    ? "Your partner's subscription will end"
                    : "Your subscription will end"}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  Access ends on {formatDate(subscription.currentPeriodEnd)}.
                  {subscription.isSharedFromPrimary
                    ? " Ask your partner to reactivate to continue using Splitwise for YNAB."
                    : " Reactivate via Manage Billing to continue."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Past due notice */}
        {subscription.status === "past_due" && (
          <div className="rounded-lg p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">
                  Payment failed
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-0.5">
                  {subscription.isSharedFromPrimary
                    ? "Your partner's payment method needs to be updated."
                    : "Please update your payment method to continue syncing."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription details */}
        <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              {subscription.cancelAtPeriodEnd
                ? "Access until"
                : subscription.isTrialing
                  ? "Trial ends"
                  : "Renews on"}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {subscription.isTrialing
                ? formatDate(subscription.trialEndsAt)
                : formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
          {/* Show renewal price for active, non-canceling subscriptions */}
          {renewalPrice && !subscription.cancelAtPeriodEnd && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                {subscription.isTrialing ? "First charge" : "Renewal amount"}
              </span>
              <span className="font-medium text-gray-900 dark:text-white">
                {renewalPrice}
                {intervalLabel}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons - only show for primary user (not shared subscription) */}
        {subscription.isSharedFromPrimary ? (
          <div className="flex items-center gap-2 pt-2 text-sm text-gray-500 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span>Billing is managed by your partner.</span>
          </div>
        ) : (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Billing
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface NoSubscriptionCardProps {
  /** True if user has had a subscription before (show re-subscribe vs start trial) */
  hadPreviousSubscription: boolean;
  /** When the subscription expired (if available) */
  expiredAt?: Date | null;
  /** Currency code for pricing display (e.g., "USD", "GBP") */
  currencyCode?: string;
  /** True if this is a secondary user on a duo plan (billing managed by partner) */
  isSecondary?: boolean;
}

/**
 * Component for users without a subscription
 */
export function NoSubscriptionCard({
  hadPreviousSubscription,
  expiredAt,
  currencyCode = "USD",
  isSecondary = false,
}: NoSubscriptionCardProps) {
  const [isLoading, setIsLoading] = useState<"month" | "year" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pricing = getPricingDisplay(currencyCode);

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return null;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const handleCheckout = async (interval: "month" | "year") => {
    setIsLoading(interval);
    setError(null);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval,
          currencyCode: pricing.currency,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(null);
    }
  };

  const expiredDate = formatDate(expiredAt);

  // Secondary users see a different message - they can't subscribe themselves
  if (isSecondary) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing
          </CardTitle>
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
          >
            Expired
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="py-6">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {expiredDate
                ? `Your partner's subscription expired on ${expiredDate}.`
                : "Your partner's subscription has expired."}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Users className="h-4 w-4" />
              <span>Ask your partner to re-subscribe to continue syncing.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing
        </CardTitle>
        <Badge
          variant="outline"
          className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
        >
          {hadPreviousSubscription ? "Expired" : "No Subscription"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {hadPreviousSubscription
              ? expiredDate
                ? `Your subscription expired on ${expiredDate}. Re-subscribe to continue syncing.`
                : "Your subscription has expired. Re-subscribe to continue syncing."
              : "You don't have an active subscription."}
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4 text-left">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => handleCheckout("year")}
              disabled={isLoading !== null}
              className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
            >
              {isLoading === "year" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {hadPreviousSubscription
                ? `Annual — ${pricing.annualDisplay}/year`
                : `Start Trial — ${pricing.annualDisplay}/year`}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCheckout("month")}
              disabled={isLoading !== null}
              className="gap-2"
            >
              {isLoading === "month" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {hadPreviousSubscription
                ? `Monthly — ${pricing.monthlyDisplay}/mo`
                : `Start Trial — ${pricing.monthlyDisplay}/mo`}
            </Button>
          </div>

          {!hadPreviousSubscription && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              {TRIAL_DAYS}-day free trial, cancel anytime
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface GrandfatheredCardProps {
  /** Currency code for pricing display if they want to upgrade */
  currencyCode?: string;
}

/**
 * Special billing card for grandfathered early adopters
 */
export function GrandfatheredCard({
  currencyCode = "USD",
}: GrandfatheredCardProps) {
  const [isLoading, setIsLoading] = useState<"month" | "year" | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const pricing = getPricingDisplay(currencyCode);

  const handleCheckout = async (interval: "month" | "year") => {
    setIsLoading(interval);

    try {
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval,
          currencyCode: pricing.currency,
          successUrl: `${window.location.origin}/dashboard?success=true`,
          cancelUrl: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch {
      setIsLoading(null);
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          Billing
        </CardTitle>
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          Early Supporter
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Thank you message */}
        <div className="rounded-lg p-4 bg-white/60 dark:bg-gray-900/40 border border-amber-200/50 dark:border-amber-800/50">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Heart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Thank you for being an early supporter!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                You signed up before we introduced paid plans, so you have{" "}
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  lifetime free access
                </span>{" "}
                to Splitwise for YNAB.
              </p>
            </div>
          </div>
        </div>

        {/* Status details */}
        <div className="space-y-3 bg-white/40 dark:bg-gray-900/30 rounded-lg p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Status</span>
            <span className="font-medium text-amber-700 dark:text-amber-400">
              Grandfathered
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 dark:text-gray-400">Cost</span>
            <span className="font-medium text-gray-900 dark:text-white">
              Free forever
            </span>
          </div>
        </div>

        {/* Optional upgrade section */}
        <div className="pt-2">
          {!showUpgrade ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowUpgrade(true)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Heart className="h-4 w-4 mr-2" />
              Want to support the project?
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your support helps cover server costs and fund new features.
                Totally optional!
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => handleCheckout("year")}
                  disabled={isLoading !== null}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isLoading === "year" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Annual — {pricing.annualDisplay}/year
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCheckout("month")}
                  disabled={isLoading !== null}
                  size="sm"
                >
                  {isLoading === "month" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Monthly — {pricing.monthlyDisplay}/mo
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
