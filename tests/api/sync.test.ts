// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";

// --- Mock setup ---
const mockSyncAllUsers = vi.fn();
const mockSyncUserData = vi.fn();
vi.mock("@/services/sync", () => ({
  syncAllUsers: mockSyncAllUsers,
  syncUserData: mockSyncUserData,
}));

const mockIsUserFullyConfigured = vi.fn();
vi.mock("@/app/actions/db", () => ({
  isUserFullyConfigured: mockIsUserFullyConfigured,
}));

const mockEnforceRateLimit = vi.fn();
vi.mock("@/services/rate-limit", () => ({
  enforcePerUserRateLimit: mockEnforceRateLimit,
}));

const mockGetRateLimitOptions = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  getRateLimitOptions: mockGetRateLimitOptions,
}));

// Prisma client mock (only what the route touches)
const mockPrismaUserFindFirst = vi.fn();
vi.mock("@/db", () => ({
  prisma: {
    user: {
      findFirst: mockPrismaUserFindFirst,
    },
  },
}));

// Mock external service classes so they are never instantiated during tests
vi.mock("@/services/splitwise", () => ({}));
vi.mock("@/services/ynab", () => ({}));

// Helper to build a NextRequest-like object with just headers support
function buildRequest(token?: string): NextRequest {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  // `NextRequest` extends the standard `Request` so this cast is safe for our usage here
  return new Request("http://localhost/api/sync", { headers }) as unknown as NextRequest;
}

// Import the route handler AFTER mocks are in place so it receives the mocked modules
import { GET as syncRouteHandler } from "@/app/api/sync/route";

describe("/api/sync integration", () => {
  const CRON_SECRET = "cron-secret-token";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it("performs a full sync when called with the CRON_SECRET", async () => {
    const fakeResponse = { totalUsers: 3, successCount: 3, errorCount: 0, results: {} };
    mockSyncAllUsers.mockResolvedValue(fakeResponse);

    const res = await syncRouteHandler(buildRequest(CRON_SECRET));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(fakeResponse);
    expect(mockSyncAllUsers).toHaveBeenCalledTimes(1);
  });

  it("syncs a fully-configured single user (no pair group)", async () => {
    const userToken = "user-token-a";
    const userId = "user-a";

    mockPrismaUserFindFirst.mockResolvedValue({ id: userId });
    mockIsUserFullyConfigured.mockResolvedValue(true);
    mockGetRateLimitOptions.mockReturnValue({ windowSeconds: 600, maxRequests: 5 });
    mockEnforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });

    const fakeSyncResult = { success: true };
    mockSyncUserData.mockResolvedValue(fakeSyncResult);

    const res = await syncRouteHandler(buildRequest(userToken));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(fakeSyncResult);

    expect(mockPrismaUserFindFirst).toHaveBeenCalledWith({ where: { apiKey: userToken } });
    expect(mockSyncUserData).toHaveBeenCalledWith(userId);
  });

  it("syncs a fully-configured user that belongs to a pair group", async () => {
    const userToken = "user-token-b";
    const userId = "user-b";

    mockPrismaUserFindFirst.mockResolvedValue({ id: userId });
    mockIsUserFullyConfigured.mockResolvedValue(true);
    mockGetRateLimitOptions.mockReturnValue({ windowSeconds: 600, maxRequests: 5 });
    mockEnforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });

    const fakeSyncResult = { success: true, paired: true };
    mockSyncUserData.mockResolvedValue(fakeSyncResult);

    const res = await syncRouteHandler(buildRequest(userToken));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(fakeSyncResult);
    expect(mockSyncUserData).toHaveBeenCalledWith(userId);
  });

  it("returns 403 if the user is not fully configured", async () => {
    const userToken = "user-token-c";
    const userId = "user-c";

    mockPrismaUserFindFirst.mockResolvedValue({ id: userId });
    mockIsUserFullyConfigured.mockResolvedValue(false);

    const res = await syncRouteHandler(buildRequest(userToken));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/complete your Splitwise and YNAB configuration/i);
  });

  it("applies per-user rate limiting", async () => {
    const userToken = "rate-limited-token";
    const userId = "user-d";

    mockPrismaUserFindFirst.mockResolvedValue({ id: userId });
    mockIsUserFullyConfigured.mockResolvedValue(true);
    mockGetRateLimitOptions.mockReturnValue({ windowSeconds: 600, maxRequests: 2 });
    mockEnforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 180 });

    const res = await syncRouteHandler(buildRequest(userToken));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("180");
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/at most 2 manual syncs/i);
  });
});