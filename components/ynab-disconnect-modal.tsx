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
import { disconnectYNABAccount } from "@/app/actions/ynab";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

interface YNABDisconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function YNABDisconnectModal({
  isOpen,
  onClose,
}: YNABDisconnectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleDisconnectAndReconnect() {
    setIsLoading(true);
    try {
      await disconnectYNABAccount();
      // Ensure UI reflects disconnected state briefly before redirecting
      router.refresh();
      await signIn("ynab", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Error disconnecting YNAB account:", error);
    } finally {
      setIsLoading(false);
      onClose();
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reconnect YNAB Account?</AlertDialogTitle>
          <AlertDialogDescription>
            We&apos;ll reconnect your YNAB account and preserve your YNAB
            settings (budget, account, and flag colors).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDisconnectAndReconnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reconnecting...
              </>
            ) : (
              "Reconnect"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
