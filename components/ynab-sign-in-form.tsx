"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface YnabSignInFormProps {
  callbackUrl: string;
}

export function YnabSignInForm({ callbackUrl }: YnabSignInFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium cursor-pointer rounded-full"
      size="lg"
      disabled={isLoading}
      onClick={async () => {
        setIsLoading(true);
        await signIn("ynab", { callbackUrl });
      }}
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
  );
}
