import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/unsubscribe/route";
import { prisma } from "../setup";
import { createTestUser } from "../factories/test-data";
import { generateUnsubscribeToken } from "@/lib/unsubscribe";

describe("/api/unsubscribe", () => {
  it("creates EmailUnsubscribe record with correct category", async () => {
    const user = await createTestUser();
    const token = generateUnsubscribeToken(user.id, "onboarding");

    const request = new Request(
      `http://localhost/api/unsubscribe?token=${token}`,
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html");

    const record = await prisma.emailUnsubscribe.findUnique({
      where: { userId_category: { userId: user.id, category: "onboarding" } },
    });

    expect(record).toBeTruthy();
    expect(record!.userId).toBe(user.id);
    expect(record!.category).toBe("onboarding");
  });

  it("returns HTML confirmation page", async () => {
    const user = await createTestUser();
    const token = generateUnsubscribeToken(user.id, "onboarding");

    const request = new Request(
      `http://localhost/api/unsubscribe?token=${token}`,
    );
    const response = await GET(request);
    const html = await response.text();

    expect(html).toContain("Unsubscribed");
    expect(html).toContain("onboarding");
  });

  it("handles duplicate unsubscribe (idempotent)", async () => {
    const user = await createTestUser();
    const token = generateUnsubscribeToken(user.id, "onboarding");

    // First request
    const request1 = new Request(
      `http://localhost/api/unsubscribe?token=${token}`,
    );
    await GET(request1);

    // Second request — should not throw
    const request2 = new Request(
      `http://localhost/api/unsubscribe?token=${token}`,
    );
    const response = await GET(request2);

    expect(response.status).toBe(200);

    const count = await prisma.emailUnsubscribe.count({
      where: { userId: user.id, category: "onboarding" },
    });
    expect(count).toBe(1);
  });

  it("returns error for invalid token", async () => {
    const request = new Request(
      `http://localhost/api/unsubscribe?token=invalid-token`,
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    const html = await response.text();
    expect(html).toContain("Invalid Link");
  });

  it("returns error for missing token", async () => {
    const request = new Request(`http://localhost/api/unsubscribe`);
    const response = await GET(request);

    expect(response.status).toBe(400);
  });
});
