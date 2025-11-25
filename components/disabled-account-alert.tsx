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
    <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-amber-900 dark:text-amber-100 font-medium mb-3">
            🚨 Sync Disabled - Action Required
          </h3>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                What happened:
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                {disabledReason}
              </p>
            </div>

            {suggestedFix && (
              <div>
                <p className="font-medium text-gray-900 dark:text-white mb-1">
                  Required action:
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  {suggestedFix}
                </p>
              </div>
            )}

            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">
                Next steps:
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                Once you&apos;ve completed the required action above, click the
                button below to resume syncing. Your account will remain
                disabled until you manually re-enable it.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={isLoading}
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                  >
                    {isLoading ? "Re-enabling..." : "Re-enable Sync"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-serif text-gray-900 dark:text-white">
                      Ready to re-enable sync?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4 text-gray-600 dark:text-gray-400">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Before proceeding, make sure you&apos;ve completed
                          this required action:
                        </p>
                        {suggestedFix && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                              {suggestedFix}
                            </p>
                          </div>
                        )}
                      </div>

                      <p>
                        <strong className="text-gray-900 dark:text-white">
                          Warning:
                        </strong>{" "}
                        If the underlying issue isn&apos;t resolved, your
                        account will be disabled again the next time a sync is
                        attempted.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel className="rounded-full">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReenableAccount}
                      className="rounded-full bg-gray-900 hover:bg-gray-800 text-white"
                    >
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
