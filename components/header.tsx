import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Menu, Settings, LogOut, HelpCircle } from "lucide-react";
import { signOut, auth } from "@/auth";
import { prisma } from "@/db";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const navLinks: { href: string; label: string }[] = [
  { href: "/blog", label: "Blog" },
  // Future pages - uncomment when ready:
  // { href: "/about", label: "About" },
  // { href: "/reviews", label: "Reviews" },
  // { href: "/pricing", label: "Pricing" },
];

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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Button
              asChild
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-full px-5"
            >
              <Link href={"/auth/signin"}>
                Sign In <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </nav>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center space-x-3">
            <Button
              asChild
              size="sm"
              className="bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-full px-4"
            >
              <Link href={"/auth/signin"}>
                Sign In <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
            {navLinks.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {navLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export async function AppHeader() {
  // Fetch user data for the avatar
  const session = await auth();
  let userProfile: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    image: string | null;
  } | null = null;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        image: true,
      },
    });
    userProfile = user;
  }

  const displayName =
    userProfile?.firstName && userProfile?.lastName
      ? `${userProfile.firstName} ${userProfile.lastName}`
      : userProfile?.name || "User";
  const initials = userProfile?.firstName
    ? userProfile.firstName.charAt(0).toUpperCase()
    : displayName.charAt(0).toUpperCase();

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                  {userProfile?.image ? (
                    <Image
                      src={userProfile.image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        {initials}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {displayName}
                    </p>
                    {userProfile?.email && (
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {userProfile.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/help"
                    className="flex items-center cursor-pointer"
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <DropdownMenuItem asChild>
                    <button
                      type="submit"
                      className="w-full flex items-center cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
