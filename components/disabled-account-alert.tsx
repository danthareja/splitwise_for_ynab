"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { reenableAccount } from "@/app/actions/user";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface DisabledAccountAlertProps {
  disabledReason: string;
  suggestedFix?: string | null;
}

export function DisabledAccountAlert({
  disabledReason,
  suggestedFix,
}: DisabledAccountAlertProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleReenableAccount = async () => {
    setIsLoading(true);
    try {
      const result = await reenableAccount();
      if (result.success) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to re-enable account:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Sync Disabled</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{disabledReason}</p>
        {suggestedFix && (
          <p className="font-medium">{suggestedFix}</p>
        )}
        <div className="pt-2">
          <Button
            onClick={handleReenableAccount}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? "Re-enabling..." : "Re-enable Sync"}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}