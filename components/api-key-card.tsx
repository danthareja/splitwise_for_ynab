"use client";

import { useState, useTransition } from "react";
import { regenerateApiKeyAction } from "@/app/actions/api-key";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyCardProps {
  initialApiKey: string | null;
  maxRequests: number;
  windowSeconds: number;
  baseUrl?: string;
}

export function ApiKeyCard({
  initialApiKey,
  maxRequests,
  windowSeconds,
  baseUrl = "http://localhost:3000",
}: ApiKeyCardProps) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [isPending, startTransition] = useTransition();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

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

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-6 mt-8 bg-white dark:bg-[#141414]">
      <h2 className="text-xl font-serif font-semibold mb-4 text-gray-900 dark:text-white">
        API Access
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-4">
        A programmable manual sync for nerds who are into that sort of thing 🤓
      </p>
      {apiKey ? (
        <>
          <div className="flex items-center gap-2 mb-4 overflow-auto">
            <code className="bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1 text-sm break-all text-gray-900 dark:text-gray-100">
              {apiKey}
            </code>
            <Button
              variant="secondary"
              size="icon"
              onClick={copy}
              aria-label="Copy API key"
              className="rounded-full"
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
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          You don&apos;t have an API key yet.
        </p>
      )}

      <Button
        onClick={regenerate}
        disabled={isPending}
        className="mb-6 bg-gray-900 hover:bg-gray-800 text-white rounded-full"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        {apiKey ? "Regenerate Key" : "Generate Key"}
      </Button>

      <h3 className="font-medium mb-2 text-gray-900 dark:text-white">Usage</h3>
      <div className="relative">
        <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-sm overflow-auto text-gray-900 dark:text-gray-100">
          {curlPreview}
        </pre>
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 rounded-full"
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

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
        Rate limit:{" "}
        <strong className="text-gray-900 dark:text-white">{maxRequests}</strong>{" "}
        sync requests every
        <strong className="text-gray-900 dark:text-white">
          {" "}
          {windowSeconds / 60}
        </strong>{" "}
        minutes. Shared with the &quot;Sync Now&quot; button.
      </p>
    </div>
  );
}
