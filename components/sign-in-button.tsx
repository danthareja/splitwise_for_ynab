"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignInButtonProps {
  variant?: "default" | "dark" | "outline";
}

export function SignInButton({ variant = "default" }: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setIsLoading(true);
    router.push("/auth/signin");
  };

  const classNames = {
    default:
      "text-base px-8 py-6 h-auto bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-full transition-all shadow-sm hover:shadow-md",
    dark: "text-base px-8 py-6 h-auto bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-full transition-all shadow-sm hover:shadow-md",
    outline:
      "text-base px-8 py-6 h-auto bg-transparent hover:bg-gray-100 text-gray-900 font-medium rounded-full border-2 border-gray-900 transition-all",
  };

  return (
    <Button
      size="lg"
      className={classNames[variant]}
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
          Get started
          <ArrowRight className="ml-2 h-5 w-5" />
        </>
      )}
    </Button>
  );
}
