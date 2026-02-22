"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/db";

export async function GET(request: NextRequest) {
  // Extract the authorization code from the query parameters
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Check for invite token in cookie
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get("invite_token")?.value;

  // Handle OAuth errors (e.g., user cancelled)
  if (error) {
    const errorMessage = error === "access_denied" ? "cancelled" : "error";
    const redirectPath = inviteToken
      ? `/invite/${inviteToken}?auth_error=${errorMessage}`
      : `/dashboard/setup?auth_error=${errorMessage}`;
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  if (!code) {
    const redirectPath = inviteToken
      ? `/invite/${inviteToken}?auth_error=missing_code`
      : "/dashboard/setup?auth_error=missing_code";
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // Get the current session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 },
    );
  }

  // Extract the redirect URI from the request
  const url = new URL(request.url);
  const redirectUri = `${url.protocol}//${url.host}${url.pathname}`;

  // Prepare the token exchange request
  const tokenUrl = "https://secure.splitwise.com/oauth/token";
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.AUTH_SPLITWISE_ID!,
    client_secret: process.env.AUTH_SPLITWISE_SECRET!,
    redirect_uri: redirectUri,
    code: code,
  });

  // Make the POST request to exchange the code for tokens
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();

    // OAuth codes are single-use. If the user hits the callback twice
    // (e.g., double-tap, refresh), the second request gets invalid_grant.
    // Redirect gracefully instead of throwing.
    if (errorText.includes("invalid_grant")) {
      const redirectPath = inviteToken
        ? `/invite/${inviteToken}`
        : "/dashboard/setup";
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    throw new Error(`Token exchange failed: ${errorText}`);
  }

  const tokenData = await response.json();

  // Fetch user information from Splitwise
  const userResponse = await fetch(
    "https://secure.splitwise.com/api/v3.0/get_current_user",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    },
  );

  if (!userResponse.ok) {
    const errorText = await userResponse.text();
    throw new Error(`Failed to fetch user info: ${errorText}`);
  }

  const userData = await userResponse.json();

  // Check if this Splitwise account is already connected to a different user.
  const providerAccountId = userData.user.id.toString();
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "splitwise",
        providerAccountId,
      },
    },
  });

  if (existingAccount && existingAccount.userId !== session.user.id) {
    // Another user already connected this Splitwise account — reject.
    // Always redirect to /dashboard/setup where the error UI is rendered.
    return NextResponse.redirect(
      new URL(
        "/dashboard/setup?auth_error=splitwise_already_linked",
        request.url,
      ),
    );
  }

  // Upsert the account using the unique constraint to handle race conditions
  // when the callback URL is hit multiple times concurrently (e.g., double-tap).
  const account = await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: "splitwise",
        providerAccountId,
      },
    },
    update: {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || "Bearer",
    },
    create: {
      userId: session.user.id,
      type: "oauth",
      provider: "splitwise",
      providerAccountId,
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || "Bearer",
    },
  });

  // Update user information with Splitwise data
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      firstName: userData.user.first_name,
      lastName: userData.user.last_name,
      name: userData.user.last_name
        ? `${userData.user.first_name} ${userData.user.last_name}`
        : userData.user.first_name,
      email: userData.user.email,
      image: userData.user.picture?.medium,
      // Store Splitwise user ID for partner detection
      splitwiseUserId: userData.user.id.toString(),
      // Only set drip timer on first Splitwise connect, not re-auth.
      // Detect first connect: upsert created a new row if createdAt ~= updatedAt.
      ...(account.createdAt.getTime() === account.updatedAt.getTime() && {
        onboardingStepReachedAt: new Date(),
      }),
    },
    select: {
      onboardingComplete: true,
    },
  });

  // Note: Welcome email is now sent after checkout completes (in webhook)
  // to avoid emailing users who don't complete onboarding

  // Determine redirect path
  // Priority: invite_token cookie > oauth_return_url cookie > default
  const oauthReturnUrl = cookieStore.get("oauth_return_url")?.value;

  let redirectPath: string;
  if (inviteToken) {
    redirectPath = `/invite/${inviteToken}`;
  } else if (oauthReturnUrl) {
    redirectPath = oauthReturnUrl;
  } else if (user.onboardingComplete) {
    redirectPath = "/dashboard";
  } else {
    redirectPath = "/dashboard/setup";
  }

  const redirectResponse = NextResponse.redirect(
    new URL(redirectPath, request.url),
  );

  // Clear cookies that were used
  if (inviteToken) {
    redirectResponse.cookies.delete("invite_token");
  }
  if (oauthReturnUrl) {
    redirectResponse.cookies.delete("oauth_return_url");
  }

  return redirectResponse;
}
