"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignInButtonProps {
  variant?: "default" | "white";
}

export function SignInButton({ variant = "default" }: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setIsLoading(true);
    router.push("/auth/signin");
  };

  const className =
    variant === "white"
      ? "text-base px-6 py-4 h-auto bg-white hover:bg-gray-50 text-blue-600 font-medium border-2 border-white hover:border-gray-200 transition-all"
      : "text-base px-6 py-4 h-auto bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium";

  return (
    <Button
      size="lg"
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading...
        </>
      ) : (
        <>
          Sign in with YNAB
          <ArrowRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
