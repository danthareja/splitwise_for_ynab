import { describe, expect, it } from "vitest";
import { CallbackRouteError, InvalidCheck } from "@auth/core/errors";
import { isOAuthStateError } from "@/lib/auth-errors";

describe("OAuth state error classification", () => {
  it("recognizes mismatched state even with production-minified error names", () => {
    const cause = Object.assign(
      new Error('unexpected "state" response parameter value'),
      { name: "a", code: "OAUTH_INVALID_RESPONSE" },
    );
    const error = Object.assign(new CallbackRouteError(), {
      name: "y",
      cause: { err: cause, provider: "ynab" },
    });

    expect(isOAuthStateError(error)).toBe(true);
  });

  it("does not treat other failed OAuth checks as state failures", () => {
    expect(
      isOAuthStateError(
        new InvalidCheck("pkceCodeVerifier value could not be parsed"),
      ),
    ).toBe(false);
  });

  it("does not treat unrelated invalid OAuth responses as state failures", () => {
    const cause = Object.assign(
      new Error('unexpected "iss" (issuer) response parameter value'),
      { code: "OAUTH_INVALID_RESPONSE" },
    );
    const error = Object.assign(new CallbackRouteError(), {
      cause: { err: cause, provider: "ynab" },
    });

    expect(isOAuthStateError(error)).toBe(false);
  });
});
