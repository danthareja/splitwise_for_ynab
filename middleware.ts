import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard"];

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Get the session token from cookies
  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  // If it's a protected route and user is not authenticated, redirect to sign in
  if (isProtectedRoute && !sessionToken) {
    const signInUrl = new URL("/auth/signin", req.url);
    // Add the current path as a callback URL so user is redirected back after login
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated and trying to access sign in page, redirect to dashboard
  if (sessionToken && pathname === "/auth/signin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except static files, API routes, and dynamic images
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webmanifest$).*)",
  ],
};
