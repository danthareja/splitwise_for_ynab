"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Crown, Clock, Zap, Key, History } from "lucide-react";

interface SubscriptionCardProps {
  subscriptionStatus: string;
  subscriptionTier: string;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
}

export function SubscriptionCard({
  subscriptionStatus,
  subscriptionTier,
  currentPeriodEnd,
  stripeCustomerId,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const isPremium =
    subscriptionTier === "premium" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trialing");

  const handleUpgrade = async (priceType: "monthly" | "yearly") => {
    try {
      setLoading(priceType);

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.url;
      } else {
        alert(`Error: ${data.error}`);
        setLoading(null);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to create checkout session");
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading("portal");

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = data.url;
      } else {
        alert(`Error: ${data.error}`);
        setLoading(null);
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to create portal session");
      setLoading(null);
    }
  };

  // Free tier view
  if (!isPremium) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Subscription</CardTitle>
            <Badge variant="secondary">Free</Badge>
          </div>
          <CardDescription>
            Upgrade to Premium for unlimited syncs and advanced features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Free tier features */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/50">
            <p className="text-sm font-medium mb-3">
              Your current plan includes:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Manual sync (2 per hour, 6 per day)</span>
              </li>
              <li className="flex items-start gap-2">
                <History className="h-4 w-4 mt-0.5 shrink-0" />
                <span>7 days of sync history</span>
              </li>
            </ul>
          </div>

          {/* Premium features */}
          <div className="space-y-2 rounded-lg border-2 border-primary/20 p-4 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold">Upgrade to Premium</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Zap className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong>Unlimited syncs</strong> - sync as often as you need
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong>Automatic hourly sync</strong> - set it and forget it
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Key className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong>API access</strong> - programmatic syncing
                </span>
              </li>
              <li className="flex items-start gap-2">
                <History className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong>Unlimited history</strong> - never lose a sync record
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Crown className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong>Custom split ratios</strong> - any ratio you need
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Crown className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong>Custom payee names</strong> - full control
                </span>
              </li>
            </ul>
          </div>

          {/* Pricing buttons */}
          <div className="grid gap-3 pt-2">
            <Button
              onClick={() => handleUpgrade("monthly")}
              disabled={loading !== null}
              size="lg"
              className="w-full"
            >
              {loading === "monthly" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade - $4.99/month
                </>
              )}
            </Button>
            <Button
              onClick={() => handleUpgrade("yearly")}
              disabled={loading !== null}
              variant="outline"
              size="lg"
              className="w-full relative"
            >
              {loading === "yearly" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Crown className="mr-2 h-4 w-4" />
                  <span>
                    Upgrade - $49/year{" "}
                    <span className="text-xs text-muted-foreground">
                      (save 18%)
                    </span>
                  </span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Premium tier view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Subscription
          </CardTitle>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
            Premium
          </Badge>
        </div>
        <CardDescription>
          You have access to all premium features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current status */}
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">{subscriptionStatus}</span>
          </div>
          {currentPeriodEnd && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {subscriptionStatus === "active" ? "Renews:" : "Ends:"}
              </span>
              <span className="font-medium">
                {new Date(currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Premium features reminder */}
        <div className="space-y-2 rounded-lg border border-primary/20 p-4 bg-primary/5">
          <p className="text-sm font-medium mb-2">Your premium benefits:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>Unlimited manual syncs</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span>Automatic hourly sync</span>
            </li>
            <li className="flex items-center gap-2">
              <Key className="h-3.5 w-3.5 text-primary" />
              <span>API key access</span>
            </li>
            <li className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-primary" />
              <span>Unlimited sync history</span>
            </li>
            <li className="flex items-center gap-2">
              <Crown className="h-3.5 w-3.5 text-primary" />
              <span>Custom split ratios & payee names</span>
            </li>
          </ul>
        </div>

        {/* Manage billing button */}
        {stripeCustomerId && (
          <Button
            onClick={handleManageBilling}
            disabled={loading !== null}
            variant="outline"
            className="w-full"
          >
            {loading === "portal" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Manage Billing"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
