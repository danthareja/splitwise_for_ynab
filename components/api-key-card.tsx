"use client";

import { useState, useTransition } from "react";
import { regenerateApiKeyAction } from "@/app/actions/api-key";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Check, Crown, Lock } from "lucide-react";
import { toast } from "sonner";
import { UpgradeModal } from "@/components/upgrade-modal";

interface ApiKeyCardProps {
  initialApiKey: string | null;
  maxRequests: number;
  windowSeconds: number;
  baseUrl?: string;
  isPremium: boolean;
}

export function ApiKeyCard({
  initialApiKey,
  maxRequests,
  windowSeconds,
  baseUrl = "http://localhost:3000",
  isPremium,
}: ApiKeyCardProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [isPending, startTransition] = useTransition();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const copy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const regenerate = () => {
    startTransition(async () => {
      const result = await regenerateApiKeyAction();
      if (result.success) {
        setApiKey(result.apiKey);
        toast.success("A new API key has been generated");
      } else {
        toast.error(result.error || "Failed to regenerate API key");
      }
    });
  };

  const curlPreview = `curl -H "Authorization: Bearer ${apiKey ?? "<YOUR_KEY>"}" \\\n  ${baseUrl}/api/sync`;
  const curlOneLine = `curl -H "Authorization: Bearer ${apiKey ?? "<YOUR_KEY>"}" ${baseUrl}/api/sync`;

  // Free tier - show upgrade prompt
  if (!isPremium) {
    return (
      <>
        <div className="border rounded-lg p-6 mt-8 relative overflow-hidden">
          {/* Blur overlay */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="text-center space-y-4 p-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Premium Feature
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  API access is available on the Premium plan. Upgrade to unlock
                  programmatic syncing with API keys.
                </p>
              </div>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                size="lg"
                className="mt-2"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
            </div>
          </div>

          {/* Blurred content behind */}
          <div className="pointer-events-none select-none">
            <h2 className="text-xl font-semibold mb-4">API Access</h2>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              A programmable manual sync for nerds who are into that sort of
              thing 🤓
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="bg-gray-100 rounded px-2 py-1 text-sm">
                sk_••••••••••••••••••••••••••
              </code>
              <Button variant="secondary" size="icon" disabled>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button disabled className="mb-6">
              <RefreshCw className="h-4 w-4 mr-2" />
              Generate Key
            </Button>
            <h3 className="font-medium mb-2">Usage</h3>
            <pre className="bg-gray-50 p-3 rounded text-sm">
              curl -H &quot;Authorization: Bearer YOUR_KEY&quot; \{"\n"}
              {`  ${baseUrl}/api/sync`}
            </pre>
          </div>
        </div>

        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          feature="API Access"
          message="Unlock API access to sync programmatically with your own scripts and automations."
        />
      </>
    );
  }

  // Premium tier - show full API access
  return (
    <div className="border rounded-lg p-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">API Access</h2>
        <Crown className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground mt-2 mb-4">
        A programmable manual sync for nerds who are into that sort of thing 🤓
      </p>
      {apiKey ? (
        <>
          <div className="flex items-center gap-2 mb-4 overflow-auto">
            <code className="bg-gray-100 rounded px-2 py-1 text-sm break-all">
              {apiKey}
            </code>
            <Button
              variant="secondary"
              size="icon"
              onClick={copy}
              aria-label="Copy API key"
            >
              {copiedKey ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground mb-4">
          You don&apos;t have an API key yet.
        </p>
      )}

      <Button onClick={regenerate} disabled={isPending} className="mb-6">
        <RefreshCw className="h-4 w-4 mr-2" />
        {apiKey ? "Regenerate Key" : "Generate Key"}
      </Button>

      <h3 className="font-medium mb-2">Usage</h3>
      <div className="relative">
        <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
          {curlPreview}
        </pre>
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2"
          onClick={() => {
            navigator.clipboard.writeText(curlOneLine);
            setCopiedCurl(true);
            setTimeout(() => setCopiedCurl(false), 2000);
          }}
          aria-label="Copy cURL command"
        >
          {copiedCurl ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mt-4">
        Rate limit: <strong>{maxRequests}</strong> sync requests every
        <strong> {windowSeconds / 60}</strong> minutes. Shared with the
        &quot;Sync Now&quot; button.
      </p>
    </div>
  );
}
