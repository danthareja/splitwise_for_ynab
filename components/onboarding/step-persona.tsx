"use client";

import { useState } from "react";
import { StepContainer, useOnboardingStep } from "./wizard";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { updatePersona } from "@/app/actions/user";
import type { Persona } from "@/app/actions/user";
import { cn } from "@/lib/utils";

export function StepPersona() {
  const {
    nextStep,
    previousStep,
    persona: initialPersona,
    isNavigating,
  } = useOnboardingStep();
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(
    initialPersona,
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!selectedPersona) return;

    setIsSaving(true);
    try {
      await updatePersona(selectedPersona);
      await nextStep();
    } catch (error) {
      console.error("Error saving persona:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const personas = [
    {
      id: "solo" as const,
      emoji: "👤",
      title: "I use YNAB, my partner doesn't",
      details:
        "I want to track shared expenses that my partner adds to Splitwise",
    },
    {
      id: "dual" as const,
      emoji: "👥",
      title: "We both use YNAB",
      details:
        "My partner and I each have our own YNAB budget and want two-way sync",
    },
  ];

  return (
    <StepContainer
      title="Who uses YNAB?"
      description="This helps us set up the right sync for your situation."
    >
      <div className="grid gap-4">
        {personas.map((p) => {
          const isSelected = selectedPersona === p.id;

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPersona(p.id)}
              className={cn(
                "relative text-left p-5 rounded-xl border-2 transition-all cursor-pointer bg-white/50 hover:bg-white/80",
                isSelected
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
              )}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}

              <div className="flex items-start gap-4">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 pr-8">
                  <h3
                    className={cn(
                      "text-base font-medium mb-1",
                      isSelected
                        ? "text-amber-900 dark:text-amber-100"
                        : "text-gray-900 dark:text-white",
                    )}
                  >
                    {p.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {p.details}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
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
        <Button
          onClick={handleContinue}
          disabled={!selectedPersona || isNavigating || isSaving}
          className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6"
        >
          {isSaving ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </StepContainer>
  );
}
