"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Crown, Loader2, X } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  message?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  feature,
  message,
}: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

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

  const defaultMessage = feature
    ? `${feature} is a Premium feature. Upgrade to access this and all other premium benefits.`
    : "Upgrade to Premium to unlock all features and unlimited syncs.";

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-between">
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Upgrade to Premium
            </AlertDialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            {message || defaultMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Premium benefits list */}
        <div className="space-y-2 rounded-lg border border-primary/20 p-4 bg-primary/5">
          <p className="text-sm font-semibold mb-2">Premium includes:</p>
          <ul className="space-y-1.5 text-sm">
            <li>✅ Unlimited manual syncs</li>
            <li>✅ Automatic hourly sync</li>
            <li>✅ API key access</li>
            <li>✅ Unlimited sync history</li>
            <li>✅ Custom split ratios</li>
            <li>✅ Custom payee names</li>
          </ul>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
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
            className="w-full"
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
          <AlertDialogCancel
            className="w-full mt-2"
            disabled={loading !== null}
          >
            Maybe Later
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
