"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Edit2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PartnerEmailPreviewProps {
  /** Partner info auto-detected from Splitwise */
  detectedPartner?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    image?: string;
  } | null;
  /** Loading state while fetching partner info */
  isLoading?: boolean;
  /** Current email value (may differ from detected) */
  email: string;
  /** Called when email changes */
  onEmailChange: (email: string) => void;
  /** Whether the user has confirmed they want to send the invite */
  willSendInvite: boolean;
  /** Called when user toggles invite sending */
  onWillSendInviteChange: (value: boolean) => void;
  /** Group name for context */
  groupName?: string;
  /** Compact mode for inline display */
  compact?: boolean;
}

export function PartnerEmailPreview({
  detectedPartner,
  isLoading,
  email,
  onEmailChange,
  willSendInvite,
  onWillSendInviteChange,
  groupName,
  compact = false,
}: PartnerEmailPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmail, setEditedEmail] = useState(email);

  // Update edited email when prop changes
  useEffect(() => {
    setEditedEmail(email);
  }, [email]);

  const handleSaveEmail = () => {
    onEmailChange(editedEmail);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedEmail(email);
    setIsEditing(false);
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-lg border border-gray-200 dark:border-gray-700 p-4",
          compact
            ? "bg-white/50 dark:bg-gray-900/50"
            : "bg-gray-50 dark:bg-gray-900/50",
        )}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">
            Detecting your partner...
          </span>
        </div>
      </div>
    );
  }

  const partnerName = detectedPartner?.firstName
    ? `${detectedPartner.firstName}${detectedPartner.lastName ? ` ${detectedPartner.lastName}` : ""}`
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        willSendInvite
          ? "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30"
          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
            willSendInvite
              ? "bg-violet-100 dark:bg-violet-900/50"
              : "bg-gray-100 dark:bg-gray-800",
          )}
        >
          <Mail
            className={cn(
              "h-5 w-5",
              willSendInvite
                ? "text-violet-600 dark:text-violet-400"
                : "text-gray-500 dark:text-gray-400",
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4
                className={cn(
                  "font-medium",
                  willSendInvite
                    ? "text-violet-900 dark:text-violet-100"
                    : "text-gray-900 dark:text-white",
                )}
              >
                Invite your partner
              </h4>
              {!compact && (
                <p
                  className={cn(
                    "text-sm mt-0.5",
                    willSendInvite
                      ? "text-violet-700 dark:text-violet-300"
                      : "text-gray-500 dark:text-gray-400",
                  )}
                >
                  We&apos;ll send them an email to join your Duo account
                </p>
              )}
            </div>

            {/* Toggle */}
            <button
              type="button"
              onClick={() => onWillSendInviteChange(!willSendInvite)}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                willSendInvite
                  ? "bg-violet-600"
                  : "bg-gray-200 dark:bg-gray-700",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
                  willSendInvite ? "translate-x-5" : "translate-x-0",
                )}
              />
            </button>
          </div>

          {willSendInvite && (
            <div className="mt-3 space-y-2">
              {/* Partner info */}
              {partnerName && !isEditing && (
                <div className="flex items-center gap-2 text-sm">
                  {detectedPartner?.image && (
                    <img
                      src={detectedPartner.image}
                      alt={partnerName}
                      className="h-6 w-6 rounded-full"
                    />
                  )}
                  <span className="text-gray-700 dark:text-gray-300">
                    {partnerName}
                  </span>
                  {groupName && (
                    <span className="text-gray-400 dark:text-gray-500">
                      from {groupName}
                    </span>
                  )}
                </div>
              )}

              {/* Email display/edit */}
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    placeholder="partner@email.com"
                    className="flex-1 h-9 text-sm"
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveEmail}
                    disabled={!isValidEmail(editedEmail)}
                    className="h-9 px-3"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-9 px-3"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex-1 px-3 py-2 rounded-md text-sm font-mono",
                      "bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-700",
                    )}
                  >
                    {email || (
                      <span className="text-gray-400 italic">
                        No email detected
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="h-9 px-3 text-violet-600 hover:text-violet-700 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/50"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
              )}

              {/* Validation warning */}
              {email && !isValidEmail(email) && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>Please enter a valid email address</span>
                </div>
              )}

              {/* Explainer text */}
              {!compact && email && isValidEmail(email) && (
                <p className="text-xs text-violet-600 dark:text-violet-400">
                  We&apos;ll email {partnerName || "your partner"} when you
                  complete setup. They can sign up and join your Duo account.
                </p>
              )}
            </div>
          )}

          {!willSendInvite && !compact && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              You can invite your partner later from the dashboard.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
