"use client";

import { useState, useEffect } from "react";
import {
  YNABTransaction,
  type FlagColor,
} from "@/components/persona-walkthrough";

export function FlagDemo() {
  const [selectedFlag, setSelectedFlag] = useState<FlagColor | null>(null);
  const [step, setStep] = useState<"idle" | "syncing" | "complete">("idle");

  useEffect(() => {
    if (!selectedFlag) {
      setStep("idle");
      return;
    }

    // Start syncing
    setStep("syncing");

    // Complete after 2 seconds
    const timer = setTimeout(() => {
      setStep("complete");
    }, 2000);

    return () => clearTimeout(timer);
  }, [selectedFlag]);

  const handleFlagSelect = (flag: FlagColor) => {
    setSelectedFlag(flag);
  };

  const handleReset = () => {
    setSelectedFlag(null);
    setStep("idle");
  };

  // Flag turns green when complete
  const displayFlag = step === "complete" ? "green" : selectedFlag;

  return (
    <div className="space-y-4">
      {/* Original transaction */}
      <div className="relative">
        <YNABTransaction
          flag={displayFlag}
          account="💰 Checking"
          date={new Date()}
          payee="Whole Foods"
          category="🛒 Groceries"
          outflow="$150.00"
          highlightFlag={!selectedFlag}
          interactive={!selectedFlag}
          onFlagSelect={handleFlagSelect}
        />

        {/* Syncing overlay */}
        {step === "syncing" && (
          <div className="absolute inset-0 bg-[#1e2b3a]/80 rounded-lg flex items-center justify-center animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-sm font-medium">Syncing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Prompt or status */}
      {step === "idle" && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          👆 Click the flag to try it
        </p>
      )}

      {/* Adjustment transaction - slides in when complete */}
      {step === "complete" && (
        <div className="animate-in slide-in-from-bottom-4 fade-in duration-500">
          <YNABTransaction
            flag="none"
            account="🤝 Splitwise"
            date={new Date()}
            payee="Whole Foods"
            category="🛒 Groceries"
            inflow="$75.00"
            interactive={false}
          />
        </div>
      )}

      {/* Success message - the hero */}
      {step === "complete" && (
        <div className="animate-in fade-in duration-500 delay-300">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 text-center">
            <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-lg">
              ✓ Your Groceries category now shows $75 spent
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-1">
              Your half. Not the $150 you fronted.
            </p>
          </div>

          <div className="text-center mt-4">
            <button
              onClick={handleReset}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
