"use client";

import { StepContainer, useOnboardingStep } from "./wizard";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ExternalLink,
  Shield,
  ArrowRight,
  Check,
  AlertCircle,
  LogOut,
  Loader2,
  Pencil,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  disconnectSplitwiseAccount,
  checkSplitwiseGroupAccess,
} from "@/app/actions/splitwise";
import { updateUserProfile } from "@/app/actions/user";
import Image from "next/image";

interface StepSplitwiseProps {
  authError?: string;
  userProfile?: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  };
  // For secondary users - to check group access
  primarySettings?: {
    groupId?: string | null;
    groupName?: string | null;
    currencyCode?: string | null;
    defaultSplitRatio?: string | null;
    emoji?: string | null;
  } | null;
  primaryName?: string | null;
}

// Helper to parse a full name into first and last names
function parseFullName(fullName: string | null): {
  firstName: string;
  lastName: string;
} {
  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0] ?? "";
  if (parts.length === 1) {
    return { firstName: first, lastName: "" };
  }
  return {
    firstName: first,
    lastName: parts.slice(1).join(" "),
  };
}

export function StepSplitwise({
  authError,
  userProfile,
  primarySettings,
  primaryName,
}: StepSplitwiseProps) {
  const router = useRouter();
  const { nextStep, hasSplitwiseConnection, isNavigating, isSecondary } =
    useOnboardingStep();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [hasGroupAccess, setHasGroupAccess] = useState<boolean | null>(null);

  // Editable profile fields
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize form values from userProfile
  // If firstName/lastName aren't set, parse from name
  const parsedName = parseFullName(userProfile?.name ?? null);
  const initialFirstName: string =
    userProfile?.firstName || parsedName.firstName || "";
  const initialLastName: string =
    userProfile?.lastName || parsedName.lastName || "";
  const initialEmail: string = userProfile?.email || "";

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(initialEmail);

  // Check if there are unsaved changes
  const hasChanges =
    firstName !== initialFirstName ||
    lastName !== initialLastName ||
    email !== initialEmail;

  // Handle saving the profile
  const handleSaveProfile = useCallback(async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await updateUserProfile({
        firstName,
        lastName,
        email,
      });

      if (result.success) {
        setSaveSuccess(true);
        setIsEditing(false);
        router.refresh();
        // Clear success message after a delay
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveError("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  }, [firstName, lastName, email, hasChanges, router]);

  // For secondary users, check if they have access to the primary's group
  useEffect(() => {
    async function checkGroupAccess() {
      if (!isSecondary || !hasSplitwiseConnection || !primarySettings?.groupId)
        return;

      setIsCheckingAccess(true);
      try {
        const result = await checkSplitwiseGroupAccess(primarySettings.groupId);
        // User needs both access to the group AND the group must be valid (2 members)
        setHasGroupAccess(result.hasAccess && result.isValid);
      } catch (error) {
        console.error("Error checking group access:", error);
        setHasGroupAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    }

    checkGroupAccess();
  }, [isSecondary, hasSplitwiseConnection, primarySettings?.groupId]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await signIn("splitwise", { callbackUrl: "/dashboard/setup" });
    } catch (error) {
      console.error("Error connecting to Splitwise:", error);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectSplitwiseAccount();
      router.refresh();
    } catch (error) {
      console.error("Error disconnecting Splitwise:", error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Get error message based on error type
  const getErrorMessage = () => {
    switch (authError) {
      case "cancelled":
        return "Connection cancelled. Click below to try again.";
      case "error":
      case "missing_code":
        return "Something went wrong connecting to Splitwise. Please try again.";
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage();

  // Determine if secondary user has a group access error
  const showGroupAccessError =
    isSecondary &&
    primarySettings?.groupId &&
    !isCheckingAccess &&
    hasGroupAccess === false;

  // If connected, show profile confirmation
  if (hasSplitwiseConnection) {
    return (
      <StepContainer
        title="Splitwise Connected!"
        description="Confirm this is the right account before continuing."
      >
        {/* Add padding at bottom on mobile to account for sticky footer */}
        <div className="pb-28 sm:pb-0">
          {/* Secondary user - group access error */}
          {showGroupAccessError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-3">
                <span>
                  Your Splitwise account doesn&apos;t have access to{" "}
                  {primaryName}
                  &apos;s group ({primarySettings?.groupName || "Shared group"}
                  ).
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="w-fit bg-white dark:bg-gray-900 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="mr-2 h-3.5 w-3.5" />
                  {isDisconnecting
                    ? "Disconnecting..."
                    : "Disconnect & try again"}
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Secondary user - checking access */}
          {isSecondary && isCheckingAccess && (
            <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                Checking access to {primaryName}&apos;s Splitwise group...
              </AlertDescription>
            </Alert>
          )}

          {/* Secondary user - has access (confirmed) */}
          {isSecondary &&
            !isCheckingAccess &&
            hasGroupAccess === true &&
            primarySettings?.groupId && (
              <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  This account has access to {primaryName}&apos;s group (
                  {primarySettings?.groupName}).
                </AlertDescription>
              </Alert>
            )}

          {/* Profile card with editable fields */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6">
            {/* Header with avatar and status */}
            <div className="flex items-center gap-4 mb-4">
              {userProfile?.image ? (
                <Image
                  src={userProfile.image}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {firstName && lastName
                    ? `${firstName} ${lastName}`
                    : userProfile?.name || "Splitwise User"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {email || userProfile?.email}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-4 w-4" />
                  Connected
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 dark:border-gray-800 my-4" />

            {/* Edit toggle / form */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit your name or email
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please confirm your contact details. We&apos;ll use this to
                  reach you about your account.
                </p>

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="h-10"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="h-10"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {/* Email field */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-10"
                    disabled={isSaving}
                  />
                </div>

                {/* Error message */}
                {saveError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {saveError}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFirstName(initialFirstName);
                      setLastName(initialLastName);
                      setEmail(initialEmail);
                      setIsEditing(false);
                      setSaveError(null);
                    }}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={
                      isSaving ||
                      !firstName.trim() ||
                      !lastName.trim() ||
                      !email.trim()
                    }
                    className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Success message */}
            {saveSuccess && !isEditing && (
              <p className="mt-3 text-sm text-green-600 dark:text-green-400 text-center">
                Profile updated successfully!
              </p>
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:block space-y-3">
            <Button
              onClick={nextStep}
              disabled={
                isNavigating ||
                isDisconnecting ||
                isCheckingAccess ||
                !!showGroupAccessError
              }
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full h-12 text-base"
            >
              {isCheckingAccess ? "Checking access..." : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting || isNavigating}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-2 py-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isDisconnecting
                ? "Disconnecting..."
                : "Wrong account? Disconnect"}
            </button>
          </div>

          {/* Mobile: disconnect link only (CTA in sticky footer) */}
          <div className="sm:hidden">
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting || isNavigating}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-2 py-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isDisconnecting
                ? "Disconnecting..."
                : "Wrong account? Disconnect"}
            </button>
          </div>
        </div>

        {/* Mobile sticky footer */}
        <div className="fixed bottom-0 left-0 right-0 sm:hidden bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 p-4 z-50 shadow-lg">
          <Button
            onClick={nextStep}
            disabled={
              isNavigating ||
              isDisconnecting ||
              isCheckingAccess ||
              !!showGroupAccessError
            }
            size="lg"
            className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          >
            {isCheckingAccess ? "Checking access..." : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </StepContainer>
    );
  }

  return (
    <StepContainer
      title="Connect Splitwise"
      description="Link your Splitwise account to start syncing shared expenses."
    >
      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Main CTA - above the fold on mobile */}
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full h-12 text-base mb-6"
      >
        {isConnecting ? (
          "Connecting..."
        ) : (
          <>
            Connect with Splitwise
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {/* Trust indicators - compact */}
      <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400 mb-8">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          <span>Secure OAuth</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5" />
          <span>Limited access</span>
        </div>
      </div>

      {/* Secondary info - for users who need it */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <a
          href="https://www.splitwise.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-amber-600 dark:text-amber-500 hover:underline"
        >
          Don&apos;t have Splitwise? Sign up free
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </div>
    </StepContainer>
  );
}
