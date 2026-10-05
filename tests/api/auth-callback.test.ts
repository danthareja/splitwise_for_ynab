import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { encode } from "@auth/core/jwt";
import * as Sentry from "@sentry/nextjs";
import { http, HttpResponse } from "msw";
import { server } from "../setup";
import { GET } from "@/app/api/auth/[...nextauth]/route";

// Exercise the real Auth.js callback. The thin NextAuth wrapper is replaced
// because its extensionless Next.js imports require Next's module resolver.
vi.mock("next-auth", async () => {
  const { Auth } = await import("@auth/core");
  return {
    default: (config: import("next-auth").NextAuthConfig) => ({
      handlers: {
        GET: (request: Request) =>
          Auth(request, { ...config, basePath: "/api/auth" }),
      },
    }),
  };
});
vi.mock("@/auth", async () => {
  const { default: NextAuth } = await import("next-auth");
  const authConfig = {
    secret: "auth-callback-test-secret",
    trustHost: true,
    pages: { error: "/auth/error" },
    providers: [
      {
        id: "ynab",
        name: "YNAB",
        type: "oauth" as const,
        checks: ["state" as const],
        clientId: "test-client",
        clientSecret: "test-secret",
        authorization: "https://app.ynab.com/oauth/authorize",
        token: "https://app.ynab.com/oauth/token",
        userinfo: "https://api.ynab.com/v1/user",
        profile: () => ({ id: "test-user", email: "user@example.com" }),
      },
    ],
  };
  return { authConfig, handlers: NextAuth(authConfig).handlers };
});

const origin = "https://www.splitwiseforynab.com";
const tokenRequest = vi.fn();

async function stateCookie(value = "current-state", maxAge = 900) {
  return encode({
    secret: "auth-callback-test-secret",
    salt: "__Secure-authjs.state",
    token: { value },
    maxAge,
  });
}

function callback(cookie?: string, state: string | null = "current-state") {
  const url = new URL("/api/auth/callback/ynab?code=test-code", origin);
  if (state !== null) url.searchParams.set("state", state);
  return GET(
    new NextRequest(url, {
      headers: cookie ? { cookie: `__Secure-authjs.state=${cookie}` } : {},
    }),
  );
}

describe("YNAB callback state recovery", () => {
  beforeEach(() => {
    tokenRequest.mockClear();
    vi.mocked(Sentry.captureException).mockClear();
    server.use(
      http.post("https://app.ynab.com/oauth/token", () => {
        tokenRequest();
        return HttpResponse.json({
          access_token: "test-access-token",
          token_type: "bearer",
        });
      }),
      http.get("https://api.ynab.com/v1/user", () => HttpResponse.json({})),
    );
  });

  it.each(["missing", "malformed", "expired", "mismatched"])(
    "offers recovery for a %s state cookie without exchanging the code",
    async (scenario) => {
      const cookie =
        scenario === "missing"
          ? undefined
          : scenario === "malformed"
            ? "invalid-cookie"
            : await stateCookie(
                scenario === "mismatched"
                  ? "newer-login-state"
                  : "current-state",
                scenario === "expired" ? -120 : 900,
              );

      const response = await callback(cookie);

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        `${origin}/auth/error?error=OAuthStateExpired`,
      );
      expect(tokenRequest).not.toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledTimes(1);
      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            provider: "ynab",
            component: "auth",
          }),
        }),
      );
    },
  );

  it("offers recovery when the callback's state parameter is missing", async () => {
    const response = await callback(await stateCookie(), null);

    expect(response.headers.get("location")).toBe(
      `${origin}/auth/error?error=OAuthStateExpired`,
    );
    expect(tokenRequest).not.toHaveBeenCalled();
  });

  it("keeps unexpected token endpoint failures distinct and reports their cause", async () => {
    server.use(
      http.post("https://app.ynab.com/oauth/token", () =>
        HttpResponse.json({ error: "server_error" }, { status: 503 }),
      ),
    );

    const response = await callback(await stateCookie());

    expect(response.headers.get("location")).toBe(
      `${origin}/auth/error?error=Configuration`,
    );
    expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        name: "OperationProcessingError",
        code: "OAUTH_RESPONSE_IS_NOT_CONFORM",
      }),
      {
        tags: {
          component: "auth",
          auth_error_type: "CallbackRouteError",
          provider: "ynab",
        },
      },
    );
  });

  it("completes a valid callback and preserves session cookies", async () => {
    const response = await callback(await stateCookie());

    expect(response.headers.get("location")).toBe(origin);
    expect(response.headers.get("set-cookie")).toContain(
      "__Secure-authjs.session-token=",
    );
    expect(tokenRequest).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("isolates recovery classification between concurrent callbacks", async () => {
    const [expired, successful] = await Promise.all([
      callback(),
      callback(await stateCookie()),
    ]);

    expect(expired.headers.get("location")).toBe(
      `${origin}/auth/error?error=OAuthStateExpired`,
    );
    expect(successful.headers.get("location")).toBe(origin);
    expect(tokenRequest).toHaveBeenCalledTimes(1);
  });
});
