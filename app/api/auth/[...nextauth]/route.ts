import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authConfig, handlers } from "@/auth";
import { isOAuthStateError } from "@/lib/auth-errors";
import { reportAuthError } from "@/lib/auth-sentry";

export async function GET(request: NextRequest) {
  if (request.nextUrl.pathname !== "/api/auth/callback/ynab") {
    return handlers.GET(request);
  }

  // Keep error classification local to this request; concurrent callbacks
  // must never change each other's recovery redirects.
  let stateError = false;
  const callbackAuth = NextAuth({
    ...authConfig,
    logger: {
      ...authConfig.logger,
      error(error) {
        stateError ||= isOAuthStateError(error);
        reportAuthError(error, "ynab");
      },
    },
  });
  const response = await callbackAuth.handlers.GET(request);
  const location = response.headers.get("location");
  if (!stateError || !location) return response;

  const redirect = new URL(location, request.url);
  if (
    redirect.pathname !== authConfig.pages.error ||
    redirect.searchParams.get("error") !== "Configuration"
  ) {
    return response;
  }

  redirect.searchParams.set("error", "OAuthStateExpired");
  const headers = new Headers(response.headers);
  headers.set("location", redirect.href);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const POST = handlers.POST;
