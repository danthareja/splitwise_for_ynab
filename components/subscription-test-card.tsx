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
import { Loader2 } from "lucide-react";

interface SubscriptionTestCardProps {
  subscriptionStatus: string;
  subscriptionTier: string;
  currentPeriodEnd: Date | null;
}

export function SubscriptionTestCard({
  subscriptionStatus,
  subscriptionTier,
  currentPeriodEnd,
}: SubscriptionTestCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceType: "monthly" | "yearly") => {
    try {
      setLoading(priceType);

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceType }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe checkout
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

  const handlePortal = async () => {
    try {
      setLoading("portal");

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Stripe billing portal
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

  const isPremium =
    subscriptionTier === "premium" &&
    (subscriptionStatus === "active" || subscriptionStatus === "trialing");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subscription (Test)</CardTitle>
          <Badge variant={isPremium ? "default" : "secondary"}>
            {subscriptionTier === "premium" ? "Premium" : "Free"}
          </Badge>
        </div>
        <CardDescription>
          Test the Stripe checkout and billing portal integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className="font-medium capitalize">{subscriptionStatus}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tier:</span>
            <span className="font-medium capitalize">{subscriptionTier}</span>
          </div>
          {currentPeriodEnd && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Renews:</span>
              <span className="font-medium">
                {new Date(currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Test Checkout:</p>
          <div className="grid gap-2">
            <Button
              onClick={() => handleCheckout("monthly")}
              disabled={loading !== null}
              variant="outline"
              className="w-full"
            >
              {loading === "monthly" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>Subscribe Monthly ($4.99/mo)</>
              )}
            </Button>
            <Button
              onClick={() => handleCheckout("yearly")}
              disabled={loading !== null}
              variant="outline"
              className="w-full"
            >
              {loading === "yearly" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>Subscribe Yearly ($49/yr)</>
              )}
            </Button>
          </div>
        </div>

        {/* Billing Portal */}
        {isPremium && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Manage Subscription:</p>
            <Button
              onClick={handlePortal}
              disabled={loading !== null}
              variant="secondary"
              className="w-full"
            >
              {loading === "portal" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>Open Billing Portal</>
              )}
            </Button>
          </div>
        )}

        <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <strong>Test Mode:</strong> Use card 4242 4242 4242 4242 with any
          future date and CVC
        </div>
      </CardContent>
    </Card>
  );
}
