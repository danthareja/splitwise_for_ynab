"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createPartnerInvite,
  getExistingInvite,
} from "@/app/actions/splitwise";
import { Users, Loader2, Link2, Copy, Check, Mail } from "lucide-react";

interface PartnerInviteCardProps {
  // For onboarding (settings not yet saved)
  pendingSettings?: {
    groupId: string;
    groupName: string;
    currencyCode: string;
    emoji: string;
  };
}

export function PartnerInviteCard({ pendingSettings }: PartnerInviteCardProps) {
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Invite your partner
            </h3>

            {!inviteToken ? (
              <>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Generate a special invite link for your partner. They&apos;ll
                  connect their accounts and be set up instantly.
                </p>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                    {error}
                  </p>
                )}
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
              </>
            ) : (
              <>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  Share this link with your partner. They&apos;ll connect their
                  YNAB and Splitwise accounts and be set up instantly.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-700 px-3 py-2 text-sm font-mono break-all">
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
                        href={`mailto:?subject=Join me on Splitwise for YNAB&body=Hey! I've set up Splitwise for YNAB to sync our shared expenses. Click this link to get set up: ${inviteUrl}`}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        Email
                      </a>
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Link expires in 7 days. You can regenerate it anytime.
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
