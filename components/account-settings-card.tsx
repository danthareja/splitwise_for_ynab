"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Loader2, Check, Mail } from "lucide-react";
import { updateUserProfile } from "@/app/actions/user";
import Image from "next/image";

interface AccountSettingsCardProps {
  userProfile: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  };
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

export function AccountSettingsCard({ userProfile }: AccountSettingsCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize form values from userProfile
  const parsedName = parseFullName(userProfile?.name ?? null);
  const initialFirstName: string =
    userProfile?.firstName || parsedName.firstName || "";
  const initialLastName: string =
    userProfile?.lastName || parsedName.lastName || "";
  const email: string = userProfile?.email || "";

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);

  // Get display name
  const displayName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : userProfile?.name || "User";
  const initials = firstName
    ? firstName.charAt(0).toUpperCase()
    : displayName.charAt(0).toUpperCase();

  // Check if there are changes
  const hasChanges =
    firstName.trim() !== initialFirstName ||
    lastName.trim() !== initialLastName;

  // Handle saving the profile
  async function handleSaveProfile() {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await updateUserProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email, // Keep email unchanged
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
  }

  return (
    <Card>
      <CardContent>
        {isEditing ? (
          <div className="space-y-5">
            {/* Avatar row */}
            <div className="flex items-start gap-4">
              {userProfile?.image ? (
                <Image
                  src={userProfile.image}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                  unoptimized
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-medium text-amber-700 dark:text-amber-300">
                    {initials}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Photo synced from Splitwise
                </p>
              </div>
            </div>

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
                  autoFocus
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

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-gray-500 dark:text-gray-400">Email</Label>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {email || "No email set"}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Need to change your email?{" "}
                <a
                  href="mailto:support@splitwiseforynab.com?subject=Email%20change%20request"
                  className="text-amber-600 dark:text-amber-500 hover:underline"
                >
                  Contact support
                </a>
              </p>
            </div>

            {/* Error message */}
            {saveError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {saveError}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFirstName(initialFirstName);
                  setLastName(initialLastName);
                  setIsEditing(false);
                  setSaveError(null);
                }}
                disabled={isSaving}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={isSaving || !firstName.trim() || !lastName.trim()}
                className="rounded-full bg-gray-900 hover:bg-gray-800 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Profile display */}
            <div className="flex items-center gap-4">
              {userProfile?.image ? (
                <Image
                  src={userProfile.image}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                  <span className="text-xl font-medium text-amber-700 dark:text-amber-300">
                    {initials}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white text-lg">
                  {displayName}
                </p>
                {email && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {email}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit profile</span>
              </Button>
            </div>

            {/* Success message */}
            {saveSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                Profile updated
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
