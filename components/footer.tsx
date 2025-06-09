import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t py-6 md:py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-4 md:flex-row md:justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Splitwise for YNAB. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              target="_blank"
              rel="noopener"
              href="https://www.github.com/danthareja/splitwise_for_ynab"
              className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            >
              <Github className="h-5 w-5" />
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            >
              Privacy
            </Link>
          </div>
        </div>

        {/* YNAB Disclaimer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed max-w-4xl mx-auto">
            We are not affiliated, associated, or in any way officially
            connected with YNAB or any of its subsidiaries or affiliates. The
            official YNAB website can be found at{" "}
            <Link
              href="https://www.ynab.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              https://www.ynab.com
            </Link>
            . The names YNAB and You Need A Budget, as well as related names,
            tradenames, marks, trademarks, emblems, and images are registered
            trademarks of YNAB.
          </p>
        </div>
      </div>
    </footer>
  );
}
