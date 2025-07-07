"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-orange-900 font-medium mb-3">
            🚨 Sync Disabled - Action Required
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-900 mb-1">What happened:</p>
              <p className="text-gray-700">{disabledReason}</p>
            </div>

            {suggestedFix && (
              <div>
                <p className="font-medium text-gray-900 mb-1">
                  Required action:
                </p>
                <p className="text-gray-700">{suggestedFix}</p>
              </div>
            )}

            <div>
              <p className="font-medium text-gray-900 mb-1">Next steps:</p>
              <p className="text-gray-700 mb-3">
                Once you&apos;ve completed the required action above, click the
                button below to resume syncing. Your account will remain
                disabled until you manually re-enable it.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={isLoading} size="sm" variant="outline">
                    {isLoading ? "Re-enabling..." : "Re-enable Sync"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Ready to re-enable sync?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-3">
                          Before proceeding, make sure you&apos;ve completed
                          this required action:
                        </p>
                        {suggestedFix && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <p className="text-sm font-medium text-yellow-800">
                              {suggestedFix}
                            </p>
                          </div>
                        )}
                      </div>

                      <p>
                        <strong>Warning:</strong> If the underlying issue
                        isn&apos;t resolved, your account will be disabled again
                        the next time a sync is attempted.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReenableAccount}>
                      Yes, I&apos;ve Fixed It
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
