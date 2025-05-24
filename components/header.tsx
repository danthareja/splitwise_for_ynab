import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-md md:text-xl font-bold">
                Splitwise for YNAB
              </span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="#how-it-works" className="hidden md:inline-flex">
              <Button variant="ghost">How it works</Button>
            </Link>
            <Link href="#faq" className="hidden md:inline-flex">
              <Button variant="ghost">FAQ</Button>
            </Link>
            <Link href="/auth/signin">
              <Button className="gap-1">
                Sign in <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
