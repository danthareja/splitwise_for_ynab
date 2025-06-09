import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { signOut } from "@/auth";

export async function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Splitwise For YNAB
            </span>
          </Link>
          <div className="flex items-center space-x-3">
            <Button
              asChild
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium"
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Splitwise For YNAB
            </span>
          </Link>
          <div className="flex items-center space-x-3">
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
