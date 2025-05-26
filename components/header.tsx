import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { signOut } from "@/auth";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="/images/ynab-logo.png"
              alt="YNAB Logo"
              width={32}
              height={32}
              className="mr-2"
            />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Splitwise For YNAB
            </span>
            <Image
              src="/images/splitwise-logo.png"
              alt="Splitwise Logo"
              width={32}
              height={32}
              className="ml-2"
            />
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/auth/signin">
              <Button className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-medium">
                Sign In <ArrowRight className="ml-2" />
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
          <div className="flex items-center">
            <Image
              src="/images/ynab-logo.png"
              alt="YNAB Logo"
              width={32}
              height={32}
              className="mr-2"
            />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Splitwise For YNAB
            </span>
            <Image
              src="/images/splitwise-logo.png"
              alt="Splitwise Logo"
              width={32}
              height={32}
              className="ml-2"
            />
          </div>
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
