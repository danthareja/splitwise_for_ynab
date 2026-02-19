import { describe, it, expect } from "vitest";
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/unsubscribe";

describe("Unsubscribe Token", () => {
  it("generates valid token for userId + category", () => {
    const token = generateUnsubscribeToken("user-123", "onboarding");
    expect(token).toBeTruthy();
    expect(token).toContain(".");
  });

  it("verifies valid token returns correct userId and category", () => {
    const token = generateUnsubscribeToken("user-123", "onboarding");
    const result = verifyUnsubscribeToken(token);

    expect(result).toEqual({ userId: "user-123", category: "onboarding" });
  });

  it("rejects tampered tokens", () => {
    const token = generateUnsubscribeToken("user-123", "onboarding");
    const tampered = token.slice(0, -3) + "abc";

    const result = verifyUnsubscribeToken(tampered);
    expect(result).toBeNull();
  });

  it("rejects tokens with missing parts", () => {
    expect(verifyUnsubscribeToken("")).toBeNull();
    expect(verifyUnsubscribeToken("onlyonepart")).toBeNull();
    expect(verifyUnsubscribeToken("too.many.parts")).toBeNull();
  });

  it("works with different categories", () => {
    const token = generateUnsubscribeToken("user-456", "marketing");
    const result = verifyUnsubscribeToken(token);

    expect(result).toEqual({ userId: "user-456", category: "marketing" });
  });
});
