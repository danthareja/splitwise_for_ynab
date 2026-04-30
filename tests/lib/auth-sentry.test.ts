import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { UnknownAction } from "@auth/core/errors";
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
});
