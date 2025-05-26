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
              href="#"
              className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-sm text-gray-500 hover:underline dark:text-gray-400"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
