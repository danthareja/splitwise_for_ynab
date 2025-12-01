"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createPartnerInvite,
  getExistingInvite,
  resendPartnerInvite,
  getPartnerFromGroup,
  getSplitwiseSettings,
} from "@/app/actions/splitwise";
import {
  Loader2,
  Mail,
  UserPlus,
  Send,
  Clock,
  Check,
  Edit2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Simple relative time formatter
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60)
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
}

interface PartnerInviteCardProps {
  /** For onboarding (settings not yet saved) - use PartnerInviteSetup instead */
  pendingSettings?: {
    groupId: string;
    groupName: string;
    currencyCode: string;
    emoji: string;
    defaultSplitRatio?: string;
  };
  /** "card" wraps in Card component, "inline" uses a simpler div */
  variant?: "card" | "inline";
  /** Additional class name for the container */
  className?: string;
}

interface InviteState {
  token: string;
  partnerEmail: string | null;
  partnerName: string | null;
  emailSentAt: Date | null;
  emailReminderCount: number;
  expiresAt: Date;
  groupName: string | null;
  maxReminders: number;
}

/**
 * Shows partner invite status on dashboard/settings.
 * - If no invite exists: shows option to create one
 * - If invite exists: shows status, allows resend, email change
 */
export function PartnerInviteCard({
  pendingSettings,
  variant = "card",
  className,
}: PartnerInviteCardProps) {
  const [invite, setInvite] = useState<InviteState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email editing
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editEmail, setEditEmail] = useState("");

  // Detected partner (for initial invite)
  const [detectedPartner, setDetectedPartner] = useState<{
    name: string;
    email: string | null;
  } | null>(null);

  // Load existing invite and detect partner on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Check for existing invite
        const existingInvite = await getExistingInvite();
        if (existingInvite?.token) {
          setInvite({
            token: existingInvite.token,
            partnerEmail: existingInvite.partnerEmail,
            partnerName: existingInvite.partnerName,
            emailSentAt: existingInvite.emailSentAt
              ? new Date(existingInvite.emailSentAt)
              : null,
            emailReminderCount: existingInvite.emailReminderCount,
            expiresAt: new Date(existingInvite.expiresAt),
            groupName: existingInvite.groupName,
            maxReminders: existingInvite.maxReminders,
          });
          setEditEmail(existingInvite.partnerEmail || "");
        } else if (!pendingSettings) {
          // No invite exists, try to detect partner from settings
          const settings = await getSplitwiseSettings();
          if (settings?.groupId) {
            const partnerResult = await getPartnerFromGroup(settings.groupId);
            if (partnerResult.success && partnerResult.partner) {
              setDetectedPartner({
                name: `${partnerResult.partner.firstName} ${partnerResult.partner.lastName}`.trim(),
                email: partnerResult.partner.email,
              });
              setEditEmail(partnerResult.partner.email || "");
            }
          }
        }
      } catch (err) {
        console.error("Error loading invite data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [pendingSettings]);

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleCreateAndSendInvite() {
    if (!editEmail || !isValidEmail(editEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const result = await createPartnerInvite({
        settings: pendingSettings,
        partnerEmail: editEmail,
        partnerName: detectedPartner?.name,
        sendEmail: true,
      });

      if (result.success && result.token) {
        setInvite({
          token: result.token,
          partnerEmail: editEmail,
          partnerName: detectedPartner?.name || null,
          emailSentAt: result.emailSent ? new Date() : null,
          emailReminderCount: 0,
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : new Date(),
          groupName: pendingSettings?.groupName || null,
          maxReminders: 3, // Default max reminders for new invites
        });
      } else {
        setError(result.error || "Failed to create invite");
      }
    } catch (err) {
      console.error("Failed to create invite:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsSending(false);
    }
  }

  async function handleResendInvite() {
    const emailToSend = isEditingEmail ? editEmail : invite?.partnerEmail;
    if (!emailToSend || !isValidEmail(emailToSend)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      const result = await resendPartnerInvite(
        isEditingEmail ? editEmail : undefined,
      );

      if (result.success) {
        setInvite((prev) =>
          prev
            ? {
                ...prev,
                partnerEmail: result.email || prev.partnerEmail,
                emailSentAt: new Date(),
                emailReminderCount: prev.emailReminderCount + 1,
              }
            : prev,
        );
        setIsEditingEmail(false);
      } else {
        setError(result.error || "Failed to resend invite");
      }
    } catch (err) {
      console.error("Failed to resend invite:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  }

  // Loading state
  if (isLoading) {
    if (variant === "inline") {
      return null;
    }
    return (
      <Card className={className}>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Content when invite exists - show status
  const inviteExistsContent = invite && (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0">
        <Mail className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">
          Waiting for {invite.partnerName || "your partner"}
        </p>

        {/* Status info */}
        <div className="text-sm text-violet-700 dark:text-violet-300 mb-3 space-y-1">
          {invite.emailSentAt ? (
            <p className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Invite sent to{" "}
              <span className="font-medium">{invite.partnerEmail}</span>
              <span className="text-violet-500">
                {" "}
                &middot; {formatTimeAgo(invite.emailSentAt)}
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Invite created but not yet sent
            </p>
          )}
          {invite.emailReminderCount > 0 && (
            <p className="text-xs text-violet-500">
              {invite.emailReminderCount} of {invite.maxReminders} reminders
              sent
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
        )}

        {/* Max reminders reached - show message instead of buttons */}
        {invite.emailReminderCount >= invite.maxReminders ? (
          <p className="text-sm text-violet-600 dark:text-violet-400">
            Maximum reminders sent. If your partner didn&apos;t receive the
            invite, ask them to check their spam folder or sign up directly at{" "}
            <span className="font-medium">splitwiseforynab.com</span>.
          </p>
        ) : isEditingEmail ? (
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="partner@example.com"
              className="flex-1 bg-white dark:bg-gray-900"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleResendInvite}
                disabled={isResending || !isValidEmail(editEmail)}
                size="sm"
                className="rounded-full bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Send
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setIsEditingEmail(false);
                  setEditEmail(invite.partnerEmail || "");
                }}
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleResendInvite}
              disabled={isResending}
              variant="outline"
              size="sm"
              className="rounded-full bg-white dark:bg-gray-900"
            >
              {isResending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Resend invite
            </Button>
            <Button
              onClick={() => setIsEditingEmail(true)}
              variant="ghost"
              size="sm"
              className="rounded-full text-violet-600 dark:text-violet-400"
            >
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Change email
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Content when no invite - show creation form
  const noInviteContent = !invite && (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center flex-shrink-0">
        <UserPlus className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">
          Invite your partner to join
        </p>
        <p className="text-sm text-violet-700 dark:text-violet-300 mb-3">
          {detectedPartner
            ? `We found ${detectedPartner.name} in your Splitwise group. Send them an invite so expenses sync to their YNAB too.`
            : "Send an invite so your shared expenses sync to their YNAB plan too."}
        </p>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
        )}

        {/* Email input and send button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
            <Input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="partner@example.com"
              className="pl-9 bg-white dark:bg-gray-900 border-violet-200 dark:border-violet-700"
            />
          </div>
          <Button
            onClick={handleCreateAndSendInvite}
            disabled={isSending || !isValidEmail(editEmail)}
            className="rounded-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send invite
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const content = invite ? inviteExistsContent : noInviteContent;

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-4",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30",
        className,
      )}
    >
      <CardContent>{content}</CardContent>
    </Card>
  );
}
