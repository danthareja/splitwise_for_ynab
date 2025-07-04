"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, CheckCircle } from "lucide-react";
import { signOut } from "@/auth";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    // Show success state briefly before redirect
    setTimeout(() => {
      setShowSuccess(true);
    }, 500);

    try {
      // Add a small delay to ensure user sees the feedback
      await new Promise((resolve) => setTimeout(resolve, 800));
      await signOut({ redirectTo: "/" });
    } catch (error) {
      // In case of error, reset the loading state
      console.error("Sign out error:", error);
      setIsSigningOut(false);
      setShowSuccess(false);
    }
  };

  return (
    <form action={handleSignOut}>
      <Button
        variant="outline"
        type="submit"
        disabled={isSigningOut}
        className="relative transition-all duration-200 min-w-[120px] group"
      >
        {showSuccess ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600 animate-in fade-in duration-200" />
            <span className="animate-in fade-in duration-200">Success!</span>
          </>
        ) : isSigningOut ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="animate-in fade-in duration-200">
              Signing out...
            </span>
          </>
        ) : (
          <>
            <LogOut className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            <span>Sign out</span>
          </>
        )}
      </Button>
    </form>
  );
}
