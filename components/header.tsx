import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { signOut, auth } from "@/auth";

export async function Header() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/splitwise-logo.png"
              alt="Splitwise Logo"
              width={32}
              height={32}
              className="mr-1 sm:mr-2 w-5 h-5 sm:w-8 sm:h-8"
            />
            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Splitwise For YNAB
            </span>
            <Image
              src="/images/ynab-logo.png"
              alt="YNAB Logo"
              width={32}
              height={32}
              className="ml-1 sm:ml-2 w-5 h-5 sm:w-8 sm:h-8"
            />
          </Link>
          <div className="flex items-center space-x-3">
            <Link href={session ? "/dashboard" : "/auth/signin"}>
              <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-blue-700 hover:to-green-700 text-white font-medium">
                {session ? "Dashboard" : "Sign In"}{" "}
                <ArrowRight className="ml-2" />
              </Button>
            </Link>
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
            <Image
              src="/images/splitwise-logo.png"
              alt="Splitwise Logo"
              width={32}
              height={32}
              className="mr-1 sm:mr-2 w-5 h-5 sm:w-8 sm:h-8"
            />
            <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Splitwise For YNAB
            </span>
            <Image
              src="/images/ynab-logo.png"
              alt="YNAB Logo"
              width={32}
              height={32}
              className="ml-1 sm:ml-2 w-5 h-5 sm:w-8 sm:h-8"
            />
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
