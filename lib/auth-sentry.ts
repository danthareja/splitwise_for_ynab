import * as Sentry from "@sentry/nextjs";
import { getAuthErrorCause } from "@/lib/auth-errors";

const IGNORED_AUTH_ERROR_TYPES = new Set(["UnknownAction"]);

export function reportAuthError(error: Error, provider?: string) {
  const authErrorType = (error as Error & { type?: string }).type;

  if (authErrorType && IGNORED_AUTH_ERROR_TYPES.has(authErrorType)) {
    return;
  }

  const cause = error.cause;
  const causeProvider =
    cause && typeof cause === "object" && "provider" in cause
      ? cause.provider
      : undefined;
  const authProvider = provider ?? causeProvider;

  // Auth.js wraps exceptions in { err, provider }, which Sentry's standard
  // Error.cause traversal cannot follow. Capture the underlying Error itself.
  const exception =
    cause && !(cause instanceof Error)
      ? (getAuthErrorCause(error) ?? error)
      : error;

  Sentry.captureException(exception, {
    tags: {
      component: "auth",
      ...(authErrorType ? { auth_error_type: authErrorType } : {}),
      ...(typeof authProvider === "string" ? { provider: authProvider } : {}),
    },
  });
}
