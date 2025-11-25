"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface YnabSignInFormProps {
  signInAction: () => Promise<void>;
}

export function YnabSignInForm({ signInAction }: YnabSignInFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <form
      action={async () => {
        setIsLoading(true);
        await signInAction();
      }}
    >
      <Button
        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium cursor-pointer rounded-full"
        size="lg"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting to YNAB...
          </>
        ) : (
          "Sign in with YNAB"
        )}
      </Button>
    </form>
  );
}
