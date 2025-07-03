export const MAX_REQUESTS = Number(process.env.USER_SYNC_MAX_REQUESTS ?? 2);
export const WINDOW_SECONDS = Number(
  process.env.USER_SYNC_WINDOW_SECONDS ?? 3600,
);

export function getRateLimitOptions() {
  return {
    maxRequests: MAX_REQUESTS,
    windowSeconds: WINDOW_SECONDS,
    key: "sync" as const,
  };
}
