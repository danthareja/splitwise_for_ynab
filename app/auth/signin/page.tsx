import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signIn } from "@/auth";
import { auth } from "@/auth";
import { YnabSignInForm } from "@/components/ynab-sign-in-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Connect Your YNAB Account",
  description:
    "Sign in to Splitwise for YNAB by connecting your YNAB account to start automating your shared expense tracking.",
  robots: {
    index: false,
    follow: false,
  },
};

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  const resolvedSearchParams = await searchParams;
  const callbackUrl = resolvedSearchParams.callbackUrl || "/dashboard";

  // If the user is already signed in, redirect to the callback URL or dashboard
  if (session) {
    redirect(callbackUrl);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Button
          asChild
          variant="ghost"
          className="absolute left-4 top-4 md:left-8 md:top-8 gap-1"
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Connect Your Accounts</CardTitle>
            <CardDescription>
              Connect your YNAB and Splitwise accounts to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <YnabSignInForm
              signInAction={async () => {
                "use server";
                await signIn("ynab", { redirectTo: callbackUrl });
              }}
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Then
                </span>
              </div>
            </div>
            <Button className="w-full" variant="outline" size="lg" disabled>
              Connect Splitwise (After YNAB)
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center gap-2">
            <p className="text-center text-sm text-gray-500">
              By connecting your accounts, you agree to our{" "}
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
