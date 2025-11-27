"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createPartnerInvite,
  getExistingInvite,
} from "@/app/actions/splitwise";
import { Loader2, Link2, Copy, Check, Mail, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PartnerInviteCardProps {
  /** For onboarding (settings not yet saved) */
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

export function PartnerInviteCard({
  pendingSettings,
  variant = "card",
  className,
}: PartnerInviteCardProps) {
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inviteUrl = inviteToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteToken}`
    : null;

  // Check for existing invite on mount
  useEffect(() => {
    async function checkExistingInvite() {
      const existing = await getExistingInvite();
      if (existing?.token) {
        setInviteToken(existing.token);
      }
      setIsLoading(false);
    }
    checkExistingInvite();
  }, []);

  async function handleGenerateInvite() {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await createPartnerInvite(pendingSettings);
      if (result.success && result.token) {
        setInviteToken(result.token);
      } else {
        setError(result.error || "Failed to generate invite");
      }
    } catch (error) {
      console.error("Failed to generate invite:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyLink() {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // Loading state - inline variant returns null to avoid layout shift
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

  const content = (
    <div className="flex items-start gap-3">
      <UserPlus className="h-5 w-5 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-violet-900 dark:text-violet-100 mb-1">
          Invite your partner to join
        </p>
        <p className="text-sm text-violet-700 dark:text-violet-300 mb-3">
          Right now, you can sync your shared expenses to Splitwise, but they
          won't make it into your partner's plan yet.
        </p>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
        )}

        {!inviteToken ? (
          <Button
            onClick={handleGenerateInvite}
            disabled={isGenerating}
            variant="outline"
            size="sm"
            className="rounded-full bg-white dark:bg-gray-900"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Generate invite link
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-violet-200 dark:border-violet-700 px-3 py-2 text-sm font-mono break-all">
                {inviteUrl}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-white dark:bg-gray-900 flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-white dark:bg-gray-900 flex-shrink-0"
                >
                  <a
                    href={`mailto:?subject=Join me on Splitwise for YNAB&body=Hey!%0A%0AI've set up Splitwise for YNAB to sync our shared expenses. Click here to get set up:%0A%0A${inviteUrl}`}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-xs text-violet-600 dark:text-violet-400">
              Expires in 7 days
            </p>
          </div>
        )}
      </div>
    </div>
  );

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
