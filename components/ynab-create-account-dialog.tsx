"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface YNABCreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAccount: (accountName: string) => Promise<{ success: boolean }>;
  isCreating: boolean;
}

export function YNABCreateAccountDialog({
  open,
  onOpenChange,
  onCreateAccount,
  isCreating,
}: YNABCreateAccountDialogProps) {
  const [newAccountName, setNewAccountName] = useState("🤝 Splitwise");

  async function handleCreate() {
    const result = await onCreateAccount(newAccountName);
    if (result.success) {
      setNewAccountName("🤝 Splitwise");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#141414]">
        <DialogHeader>
          <DialogTitle className="font-serif">
            Create Splitwise Account
          </DialogTitle>
          <DialogDescription>
            Create a new account in your YNAB plan to track your Splitwise
            balance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="🤝 Splitwise"
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="rounded-full"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !newAccountName.trim()}
            className="rounded-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
