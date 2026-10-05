type AuthErrorDetails = Error & { type?: string };

export function getAuthErrorCause(error: Error): Error | undefined {
  const cause = error.cause;
  if (cause instanceof Error) return cause;
  if (cause && typeof cause === "object" && "err" in cause) {
    return cause.err instanceof Error ? cause.err : undefined;
  }
  return undefined;
}

export function isOAuthStateError(error: AuthErrorDetails): boolean {
  if (error.type === "InvalidCheck") {
    return (
      error.message.startsWith("state cookie was missing.") ||
      error.message.startsWith("state value could not be parsed.") ||
      error.message.startsWith("State could not be decoded.")
    );
  }

  const cause = getAuthErrorCause(error);
  // oauth4webapi has no state-specific error code. Match its exact messages
  // as well as its code so unrelated callback failures keep their handling.
  // Error names are not reliable because production builds minify class names.
  return (
    error.type === "CallbackRouteError" &&
    cause !== undefined &&
    "code" in cause &&
    cause.code === "OAUTH_INVALID_RESPONSE" &&
    (cause.message === 'unexpected "state" response parameter value' ||
      cause.message === 'response parameter "state" missing')
  );
}
