import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Home } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found - Splitwise for YNAB",
  description:
    "The page you're looking for doesn't exist. Return to Splitwise for YNAB to continue managing your shared expenses.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-8">
            404
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
            Page Not Found
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It
            might have been moved, deleted, or you may have mistyped the URL.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="min-w-[200px]">
              <Link href="/">
                <Home className="mr-2 h-5 w-5" />
                Back to Home
              </Link>
            </Button>
          </div>

          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Popular Pages
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
              <Link
                href="/"
                className="p-4 rounded-lg border hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  Home
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Learn about our service
                </div>
              </Link>

              <Link
                href="/privacy"
                className="p-4 rounded-lg border hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  Privacy
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  How we protect your data
                </div>
              </Link>

              <Link
                href="/terms"
                className="p-4 rounded-lg border hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  Terms
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Terms of service
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
