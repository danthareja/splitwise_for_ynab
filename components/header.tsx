import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">Splitwise for YNAB</span>
          </Link>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="#how-it-works">
            <Button variant="ghost">How it works</Button>
          </Link>
          <Link href="#faq">
            <Button variant="ghost">FAQ</Button>
          </Link>
          <Link href="/auth/signin">
            <Button className="gap-1">
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
