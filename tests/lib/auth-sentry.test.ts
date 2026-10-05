import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import {
  CallbackRouteError,
  InvalidCheck,
  UnknownAction,
} from "@auth/core/errors";
import { reportAuthError } from "@/lib/auth-sentry";

const captureException = vi.mocked(Sentry.captureException);

describe("reportAuthError", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it("does not report unknown auth actions to Sentry", () => {
    const error = new UnknownAction("Cannot parse action at /api/auth/login");

    reportAuthError(error);

    expect(captureException).not.toHaveBeenCalled();
  });

  it("reports other auth errors to Sentry", () => {
    const error = new Error("Adapter unavailable");

    reportAuthError(error);

    expect(captureException).toHaveBeenCalledWith(error, {
      tags: { component: "auth" },
    });
  });

  it("captures the underlying callback exception with its original stack and auth tags", () => {
    const cause = new Error("Token endpoint unavailable");
    const error = Object.assign(new CallbackRouteError(), {
      cause: { err: cause, provider: "ynab" },
    });

    reportAuthError(error);

    expect(captureException).toHaveBeenCalledExactlyOnceWith(cause, {
      tags: {
        component: "auth",
        auth_error_type: "CallbackRouteError",
        provider: "ynab",
      },
    });
    expect(error.cause?.err).toBe(cause);
  });

  it("preserves standard Error.cause chains and accepts the request's provider", () => {
    const cause = new InvalidCheck("state cookie was missing");
    const error = new InvalidCheck("state value could not be parsed", {
      cause,
    });

    reportAuthError(error, "ynab");

    expect(captureException).toHaveBeenCalledExactlyOnceWith(error, {
      tags: {
        component: "auth",
        auth_error_type: "InvalidCheck",
        provider: "ynab",
      },
    });
  });

  it("keeps wrapper errors when no underlying Error is available", () => {
    const error = Object.assign(new CallbackRouteError(), {
      cause: { provider: "ynab", err: "not an Error", access_token: "private" },
    });

    reportAuthError(error);

    expect(captureException).toHaveBeenCalledExactlyOnceWith(error, {
      tags: {
        component: "auth",
        auth_error_type: "CallbackRouteError",
        provider: "ynab",
      },
    });
  });
});
