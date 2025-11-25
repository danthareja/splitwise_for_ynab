"use client";

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
import { disconnectSplitwiseAccount } from "@/app/actions/splitwise";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface SplitwiseDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SplitwiseDisconnectModal({
  isOpen,
  onClose,
}: SplitwiseDisconnectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    setIsLoading(true);
    try {
      await disconnectSplitwiseAccount();
      // Force a page refresh to show updated user data
      router.refresh();
    } catch (error) {
      console.error("Error disconnecting account:", error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-serif text-gray-900 dark:text-white">
            Disconnect Splitwise Account?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
            This will remove your Splitwise connection and stop syncing between
            YNAB and Splitwise. You can reconnect at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} className="rounded-full">
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={isLoading}
            className="rounded-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
