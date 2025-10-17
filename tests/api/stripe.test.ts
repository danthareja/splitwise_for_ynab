import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as createCheckoutSessionPOST } from "@/app/api/stripe/create-checkout-session/route";
import { POST as createPortalSessionPOST } from "@/app/api/stripe/create-portal-session/route";
import { POST as webhookPOST } from "@/app/api/stripe/webhooks/route";
import { prisma } from "../setup";
import { createTestUser } from "../factories/db-factories";

// Mock the auth module
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Stripe service
vi.mock("@/services/stripe", () => ({
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  STRIPE_PRICE_ID_MONTHLY: "price_monthly_test",
  STRIPE_PRICE_ID_YEARLY: "price_yearly_test",
}));

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("Stripe API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set base URL for tests
    process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
  });

  describe("POST /api/stripe/create-checkout-session", () => {
    it("should create a checkout session for monthly subscription", async () => {
      const user = await createTestUser({
        email: "test@example.com",
      });

      const { auth } = await import("@/auth");
      const { createCheckoutSession } = await import("@/services/stripe");

      vi.mocked(auth).mockResolvedValue({
        user: { id: user.id, email: user.email },
      } as any);

      vi.mocked(createCheckoutSession).mockResolvedValue({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/test",
      } as any);

      const request = new Request(
        "http://localhost:3000/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceType: "monthly" }),
        },
      );

      const response = await createCheckoutSessionPOST(request as any);
      const data = await response.json();

      if (response.status !== 200) {
        console.error("Error response:", data);
      }

      expect(response.status).toBe(200);
      expect(data.sessionId).toBe("cs_test_123");
      expect(data.url).toBe("https://checkout.stripe.com/test");
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          userEmail: user.email,
          priceId: "price_monthly_test",
        }),
      );
    });

    it("should create a checkout session for yearly subscription", async () => {
      const user = await createTestUser({
        email: "test@example.com",
      });

      const { auth } = await import("@/auth");
      const { createCheckoutSession } = await import("@/services/stripe");

      vi.mocked(auth).mockResolvedValue({
        user: { id: user.id, email: user.email },
      } as any);

      vi.mocked(createCheckoutSession).mockResolvedValue({
        id: "cs_test_456",
        url: "https://checkout.stripe.com/test",
      } as any);

      const request = new Request(
        "http://localhost:3000/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceType: "yearly" }),
        },
      );

      const response = await createCheckoutSessionPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          priceId: "price_yearly_test",
        }),
      );
    });

    it("should return 401 if not authenticated", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceType: "monthly" }),
        },
      );

      const response = await createCheckoutSessionPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if email is missing", async () => {
      const user = await createTestUser();

      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: user.id },
      } as any);

      const request = new Request(
        "http://localhost:3000/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceType: "monthly" }),
        },
      );

      const response = await createCheckoutSessionPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Email is required for checkout");
    });

    it("should return 400 for invalid price type", async () => {
      const user = await createTestUser({
        email: "test@example.com",
      });

      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: user.id, email: user.email },
      } as any);

      const request = new Request(
        "http://localhost:3000/api/stripe/create-checkout-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceType: "invalid" }),
        },
      );

      const response = await createCheckoutSessionPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid price type");
    });
  });

  describe("POST /api/stripe/create-portal-session", () => {
    it("should create a portal session for user with Stripe customer", async () => {
      const user = await createTestUser({
        stripeCustomerId: "cus_test123",
      });

      const { auth } = await import("@/auth");
      const { createPortalSession } = await import("@/services/stripe");

      vi.mocked(auth).mockResolvedValue({
        user: { id: user.id },
      } as any);

      vi.mocked(createPortalSession).mockResolvedValue({
        url: "https://billing.stripe.com/test",
      } as any);

      const request = new Request(
        "http://localhost:3000/api/stripe/create-portal-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await createPortalSessionPOST(request as any);
      const data = await response.json();

      if (response.status !== 200) {
        console.error("Error response:", data);
      }

      expect(response.status).toBe(200);
      expect(data.url).toBe("https://billing.stripe.com/test");
      expect(createPortalSession).toHaveBeenCalledWith({
        customerId: "cus_test123",
        returnUrl: expect.stringContaining("/dashboard"),
      });
    });

    it("should return 401 if not authenticated", async () => {
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request(
        "http://localhost:3000/api/stripe/create-portal-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await createPortalSessionPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 if user has no Stripe customer", async () => {
      const user = await createTestUser();

      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: user.id },
      } as any);

      const request = new Request(
        "http://localhost:3000/api/stripe/create-portal-session",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await createPortalSessionPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No Stripe customer found");
    });
  });

  describe("POST /api/stripe/webhooks", () => {
    beforeEach(() => {
      // Set webhook secret for tests
      process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    });

    it("should handle checkout.session.completed event", async () => {
      const user = await createTestUser();

      const { stripe } = await import("@/services/stripe");
      const { headers } = await import("next/headers");

      const eventId = `evt_test_${Date.now()}`;
      const mockEvent = {
        id: eventId,
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            customer: "cus_test123",
            subscription: "sub_test123",
            metadata: {
              userId: user.id,
            },
          },
        },
      };

      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("test_signature"),
      } as any);

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
        mockEvent as any,
      );

      vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
        id: "sub_test123",
        status: "active",
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        metadata: { userId: user.id },
      } as any);

      const request = new Request("http://localhost:3000/api/stripe/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockEvent),
      });

      const response = await webhookPOST(request as any);
      const data = await response.json();

      if (response.status !== 200) {
        console.error("Error response:", data);
      }

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify user was updated
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      expect(updatedUser?.stripeCustomerId).toBe("cus_test123");
      expect(updatedUser?.stripeSubscriptionId).toBe("sub_test123");
      expect(updatedUser?.subscriptionTier).toBe("premium");
      expect(updatedUser?.subscriptionStatus).toBe("active");
    });

    it("should handle duplicate events (idempotency)", async () => {
      const { stripe } = await import("@/services/stripe");
      const { headers } = await import("next/headers");

      const eventId = `evt_duplicate_${Date.now()}`;
      const mockEvent = {
        id: eventId,
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
          },
        },
      };

      // Create event as already processed
      await prisma.stripeEvent.create({
        data: {
          eventId,
          type: "checkout.session.completed",
          data: JSON.stringify(mockEvent.data),
          processed: true,
          processedAt: new Date(),
        },
      });

      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("test_signature"),
      } as any);

      vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(
        mockEvent as any,
      );

      const request = new Request("http://localhost:3000/api/stripe/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockEvent),
      });

      const response = await webhookPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.duplicate).toBe(true);
    });

    it("should return 400 if signature is missing", async () => {
      const { headers } = await import("next/headers");

      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any);

      const request = new Request("http://localhost:3000/api/stripe/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await webhookPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing stripe-signature header");
    });

    it("should return 400 if signature verification fails", async () => {
      const { stripe } = await import("@/services/stripe");
      const { headers } = await import("next/headers");

      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue("invalid_signature"),
      } as any);

      vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const request = new Request("http://localhost:3000/api/stripe/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await webhookPOST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid signature");
    });
  });
});
