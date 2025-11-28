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

  // Check if the user already has a Splitwise account
  const existingAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "splitwise",
    },
  });

  if (existingAccount) {
    // Update existing account
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || "Bearer",
        providerAccountId: userData.user.id.toString(),
      },
    });
  } else {
    // Create new account following Next.js Auth pattern
    await prisma.account.create({
      data: {
        userId: session.user.id,
        type: "oauth",
        provider: "splitwise",
        providerAccountId: userData.user.id.toString(),
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || "Bearer",
        // Note: Splitwise OAuth 2.0 doesn't provide refresh tokens
      },
    });
  }

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
    },
    select: {
      onboardingComplete: true,
    },
  });

  // Send welcome email only for truly new Splitwise connections (never connected before)
  // if (!existingAccount && !existingSettings && userData.user.email) {
  //   await sendWelcomeEmail({
  //     to: userData.user.email,
  //     userName: userData.user.first_name,
  //   });
  // }

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
