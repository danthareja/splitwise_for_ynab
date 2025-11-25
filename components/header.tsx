import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { signOut } from "@/auth";

export async function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-[#FDFBF7]/95 dark:bg-[#0f0f0f]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FDFBF7]/80 dark:supports-[backdrop-filter]:bg-[#0f0f0f]/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <span className="text-lg font-serif font-medium text-gray-900 dark:text-white">
              Splitwise for YNAB
            </span>
          </Link>
          <div className="flex items-center space-x-3">
            <Button
              asChild
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-full px-5"
            >
              <Link href={"/auth/signin"}>
                Sign In <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-800 bg-[#FDFBF7]/95 dark:bg-[#0f0f0f]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FDFBF7]/80 dark:supports-[backdrop-filter]:bg-[#0f0f0f]/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <span className="text-base sm:text-lg font-serif font-medium text-gray-900 dark:text-white">
              Splitwise for YNAB
            </span>
          </Link>
          <div className="flex items-center space-x-3">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button
                variant="outline"
                type="submit"
                className="rounded-full px-5"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
