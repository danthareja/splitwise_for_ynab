import * as Sentry from "@sentry/nextjs";

const IGNORED_AUTH_ERROR_TYPES = new Set(["UnknownAction"]);

export function reportAuthError(error: Error) {
  const authErrorType = (error as Error & { type?: string }).type;

  if (authErrorType && IGNORED_AUTH_ERROR_TYPES.has(authErrorType)) {
    return;
  }

  Sentry.captureException(error, {
    tags: { component: "auth" },
  });
}
