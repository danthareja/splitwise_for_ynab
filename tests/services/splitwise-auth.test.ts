import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import * as Sentry from "@sentry/nextjs";
import { getSplitwiseGroup } from "@/services/splitwise-auth";
import { server } from "../setup";

const SPLITWISE_BASE_URL = "https://secure.splitwise.com/api/v3.0";

describe("getSplitwiseGroup", () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureException).mockClear();
  });

  it("returns { success: false, error: 'Group not found' } on 404 without reporting to Sentry", async () => {
    server.use(
      http.get(`${SPLITWISE_BASE_URL}/get_group/:id`, () =>
        HttpResponse.json(
          { errors: { base: ["Invalid API Request: record not found"] } },
          { status: 404 },
        ),
      ),
    );

    const result = await getSplitwiseGroup("token", "999999");

    expect(result).toEqual({
      success: false,
      error: "Group not found",
      group: null,
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("returns { success: false, error: 'No access to group' } on 403 without reporting to Sentry", async () => {
    server.use(
      http.get(`${SPLITWISE_BASE_URL}/get_group/:id`, () =>
        HttpResponse.json(
          { errors: { base: ["You do not have permission"] } },
          { status: 403 },
        ),
      ),
    );

    const result = await getSplitwiseGroup("token", "123");

    expect(result).toEqual({
      success: false,
      error: "No access to group",
      group: null,
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("returns { success: true, group } on 200", async () => {
    server.use(
      http.get(`${SPLITWISE_BASE_URL}/get_group/:id`, () =>
        HttpResponse.json({
          group: { id: 123, name: "Test", members: [] },
        }),
      ),
    );

    const result = await getSplitwiseGroup("token", "123");

    expect(result.success).toBe(true);
    expect(result.group).toEqual({ id: 123, name: "Test", members: [] });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports unexpected errors (5xx) to Sentry and returns failure shape", async () => {
    server.use(
      http.get(`${SPLITWISE_BASE_URL}/get_group/:id`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );

    const result = await getSplitwiseGroup("token", "123");

    expect(result.success).toBe(false);
    expect(result.group).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
