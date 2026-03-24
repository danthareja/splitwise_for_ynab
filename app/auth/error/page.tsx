import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In Error - Splitwise for YNAB",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  OAuthProfileParseError: {
    title: "YNAB Account Issue",
    message:
      "We couldn't read your YNAB account details. This usually means your YNAB trial has expired or your subscription is inactive. Please check your YNAB account status and try again.",
  },
  OAuthCallback: {
    title: "Sign In Failed",
    message:
      "Something went wrong during the sign-in process. Please try again. If this keeps happening, try clearing your cookies and signing in again.",
  },
  OAuthSignin: {
    title: "Sign In Failed",
    message: "We couldn't start the sign-in process. Please try again.",
  },
  Configuration: {
    title: "Configuration Error",
    message:
      "There's a problem with the sign-in configuration. Please try again later or contact support if this persists.",
  },
  AccessDenied: {
    title: "Access Denied",
    message:
      "You denied access to your account. To use Splitwise for YNAB, you'll need to grant access when prompted.",
  },
};

const DEFAULT_ERROR = {
  title: "Something Went Wrong",
  message: "An unexpected error occurred during sign-in. Please try again.",
};

const YNAB_ERROR_MESSAGES: Record<string, { title: string; message: string }> =
  {
    trial_expired: {
      title: "YNAB Trial Expired",
      message:
        "Your YNAB trial has expired. Splitwise for YNAB requires an active YNAB subscription to connect your account. Please renew your subscription at app.ynab.com and try again.",
    },
    subscription_lapsed: {
      title: "YNAB Subscription Inactive",
      message:
        "Your YNAB subscription is no longer active. Please renew your subscription at app.ynab.com and try again.",
    },
  };

interface ErrorPageProps {
  searchParams: Promise<{ error?: string; name?: string; detail?: string }>;
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const { error, name, detail } = await searchParams;

  let title: string;
  let message: string;

  if (error === "YnabApiError" && name) {
    const ynabError = YNAB_ERROR_MESSAGES[name];
    title = ynabError?.title ?? "YNAB Account Error";
    message =
      ynabError?.message ??
      detail ??
      "There was a problem connecting to your YNAB account. Please check your YNAB subscription status and try again.";
  } else {
    ({ title, message } = ERROR_MESSAGES[error ?? ""] ?? DEFAULT_ERROR);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] dark:bg-[#0f0f0f]">
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Button
          asChild
          variant="ghost"
          className="absolute left-4 top-4 md:left-8 md:top-8 gap-1 rounded-full"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <Card className="w-full max-w-md bg-white dark:bg-[#141414] border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-2">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-serif text-gray-900 dark:text-white">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 dark:text-gray-400">
              {message}
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              asChild
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-full"
              size="lg"
            >
              <Link href="/auth/signin">Try Again</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="w-full rounded-full"
              size="lg"
            >
              <Link href="/">Go Home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
