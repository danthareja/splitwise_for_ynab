"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, User, Edit2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPartnerFromGroup } from "@/app/actions/splitwise";

interface PartnerInviteSetupProps {
  groupId: string;
  groupName?: string;
  /** Called when partner email changes (including initial detection) */
  onPartnerInfoChange?: (
    info: {
      email: string;
      name: string;
      isCustomEmail: boolean;
    } | null,
  ) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Component shown during onboarding (Splitwise config step) for dual users.
 * Auto-detects partner from Splitwise group and allows email editing.
 */
export function PartnerInviteSetup({
  groupId,
  onPartnerInfoChange,
  className,
}: PartnerInviteSetupProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [detectedPartner, setDetectedPartner] = useState<{
    firstName: string;
    lastName: string;
    email: string | null;
    image: string | null;
  } | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Fetch partner info when group changes
  useEffect(() => {
    async function fetchPartner() {
      if (!groupId) {
        setDetectedPartner(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = await getPartnerFromGroup(groupId);
        if (result.success && result.partner) {
          setDetectedPartner(result.partner);
          // Initialize custom email with detected email
          if (result.partner.email) {
            setCustomEmail(result.partner.email);
          }
        } else {
          setDetectedPartner(null);
        }
      } catch (error) {
        console.error("Error fetching partner:", error);
        setDetectedPartner(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPartner();
  }, [groupId]);

  // Notify parent of partner info changes
  useEffect(() => {
    if (!detectedPartner) {
      onPartnerInfoChange?.(null);
      return;
    }

    const effectiveEmail = customEmail || detectedPartner.email || "";
    const isCustom = customEmail !== detectedPartner.email;

    if (effectiveEmail && isValidEmail(effectiveEmail)) {
      onPartnerInfoChange?.({
        email: effectiveEmail,
        name: `${detectedPartner.firstName} ${detectedPartner.lastName}`.trim(),
        isCustomEmail: isCustom,
      });
    } else {
      onPartnerInfoChange?.(null);
    }
  }, [detectedPartner, customEmail, onPartnerInfoChange]);

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleEmailChange(value: string) {
    setCustomEmail(value);
    if (value && !isValidEmail(value)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError(null);
    }
  }

  function handleEmailBlur() {
    if (!customEmail && detectedPartner?.email) {
      // Reset to detected email if cleared
      setCustomEmail(detectedPartner.email);
      setIsEditingEmail(false);
    } else if (customEmail && isValidEmail(customEmail)) {
      setIsEditingEmail(false);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-5 animate-pulse",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-violet-200 dark:bg-violet-800" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-violet-200 dark:bg-violet-800 rounded mb-2" />
            <div className="h-3 w-48 bg-violet-200 dark:bg-violet-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // No partner found
  if (!detectedPartner) {
    return (
      <div
        className={cn(
          "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">
              Partner not detected
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              We couldn&apos;t find your partner&apos;s info from this Splitwise
              group. You can invite them manually from your dashboard after
              setup.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const partnerName =
    `${detectedPartner.firstName} ${detectedPartner.lastName}`.trim() ||
    "Your partner";
  const hasEmail = !!customEmail && isValidEmail(customEmail);

  return (
    <div
      className={cn(
        "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-xl p-5",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {/* Partner avatar */}
        {detectedPartner.image ? (
          <img
            src={detectedPartner.image}
            alt={partnerName}
            className="h-12 w-12 rounded-full flex-shrink-0"
          />
        ) : (
          <div className="h-12 w-12 rounded-full bg-violet-200 dark:bg-violet-800 flex items-center justify-center flex-shrink-0">
            <User className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium text-violet-900 dark:text-violet-100">
            Invite {partnerName} to join your Duo account
          </p>
          <p className="text-sm text-violet-700 dark:text-violet-300 mt-1 mb-3">
            We&apos;ll email them an invite when you start your trial.
            They&apos;ll connect their own YNAB plan and expenses will sync for
            both of you.
          </p>

          {/* Email field */}
          <div className="space-y-1.5">
            <Label
              htmlFor="partner-email"
              className="text-sm text-violet-700 dark:text-violet-300"
            >
              Partner&apos;s email
            </Label>

            {isEditingEmail || !customEmail ? (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
                <Input
                  id="partner-email"
                  type="email"
                  value={customEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="partner@example.com"
                  className={cn(
                    "pl-9 bg-white dark:bg-gray-900 border-violet-200 dark:border-violet-700",
                    emailError && "border-red-500 focus-visible:ring-red-500",
                  )}
                  autoFocus={isEditingEmail}
                />
                {emailError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {emailError}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingEmail(true)}
                className="flex items-center gap-2 text-sm text-violet-800 dark:text-violet-200 bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-700 rounded-lg px-3 py-2 w-full text-left hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors group"
              >
                <Mail className="h-4 w-4 text-violet-400 flex-shrink-0" />
                <span className="flex-1 truncate">{customEmail}</span>
                <Edit2 className="h-3.5 w-3.5 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            )}

            {customEmail !== detectedPartner.email && customEmail && (
              <p className="text-xs text-violet-600 dark:text-violet-400 flex items-center gap-1">
                <Check className="h-3 w-3" />
                Using custom email (detected: {detectedPartner.email || "none"})
              </p>
            )}
          </div>

          {/* No email warning */}
          {!hasEmail && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Enter your partner&apos;s email to send them an invite
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
