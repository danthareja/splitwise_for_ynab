import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Get return URL from query params (for redirecting after OAuth)
  const returnUrl =
    request.nextUrl.searchParams.get("returnUrl") || "/dashboard";

  // Generate state to prevent CSRF
  const state = nanoid(16);

  // Build the Splitwise authorization URL
  const params = new URLSearchParams({
    client_id: process.env.AUTH_SPLITWISE_ID!,
    redirect_uri: `${request.nextUrl.origin}/api/auth/callback/splitwise`,
    response_type: "code",
    state: state,
  });

  const authUrl = `https://secure.splitwise.com/oauth/authorize?${params.toString()}`;

  // Store return URL in a cookie so callback can redirect there
  const response = NextResponse.redirect(authUrl);

  // Store the return URL for after OAuth completes
  if (returnUrl !== "/dashboard") {
    response.cookies.set("oauth_return_url", returnUrl, {
      path: "/",
      maxAge: 3600,
      sameSite: "lax",
    });
  }

  return response;
}
