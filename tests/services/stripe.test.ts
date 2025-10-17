import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createCheckoutSession,
  createPortalSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  getCustomer,
  STRIPE_PRICE_ID_MONTHLY,
  STRIPE_PRICE_ID_YEARLY,
} from "@/services/stripe";

// Mock the Stripe module
vi.mock("stripe", () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    customers: {
      retrieve: vi.fn(),
    },
  };

  return {
    default: vi.fn(() => mockStripe),
  };
});

describe("Stripe Service", () => {
  describe("Price IDs", () => {
    it("should export monthly and yearly price IDs", () => {
      // These will be empty strings in test environment, but should be defined
      expect(typeof STRIPE_PRICE_ID_MONTHLY).toBe("string");
      expect(typeof STRIPE_PRICE_ID_YEARLY).toBe("string");
    });
  });

  describe("createCheckoutSession", () => {
    it("should create a checkout session with correct parameters", async () => {
      const mockSession = {
        id: "cs_test_123",
        url: "https://checkout.stripe.com/test",
      };

      // We need to get the mocked stripe instance
      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const createMock = stripeInstance.checkout.sessions.create as ReturnType<
        typeof vi.fn
      >;
      createMock.mockResolvedValue(mockSession as any);

      const params = {
        userId: "user_123",
        userEmail: "test@example.com",
        priceId: "price_123",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };

      const result = await createCheckoutSession(params);

      expect(createMock).toHaveBeenCalledWith({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.userEmail,
        metadata: {
          userId: params.userId,
        },
        subscription_data: {
          metadata: {
            userId: params.userId,
          },
        },
        allow_promotion_codes: true,
      });

      expect(result).toEqual(mockSession);
    });
  });

  describe("createPortalSession", () => {
    it("should create a billing portal session", async () => {
      const mockSession = {
        id: "bps_test_123",
        url: "https://billing.stripe.com/test",
      };

      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const createMock = stripeInstance.billingPortal.sessions
        .create as ReturnType<typeof vi.fn>;
      createMock.mockResolvedValue(mockSession as any);

      const params = {
        customerId: "cus_123",
        returnUrl: "https://example.com/dashboard",
      };

      const result = await createPortalSession(params);

      expect(createMock).toHaveBeenCalledWith({
        customer: params.customerId,
        return_url: params.returnUrl,
      });

      expect(result).toEqual(mockSession);
    });
  });

  describe("getSubscription", () => {
    it("should retrieve a subscription by ID", async () => {
      const mockSubscription = {
        id: "sub_123",
        status: "active",
        current_period_end: 1234567890,
      };

      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const retrieveMock = stripeInstance.subscriptions.retrieve as ReturnType<
        typeof vi.fn
      >;
      retrieveMock.mockResolvedValue(mockSubscription as any);

      const result = await getSubscription("sub_123");

      expect(retrieveMock).toHaveBeenCalledWith("sub_123");
      expect(result).toEqual(mockSubscription);
    });

    it("should return null on error", async () => {
      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const retrieveMock = stripeInstance.subscriptions.retrieve as ReturnType<
        typeof vi.fn
      >;
      retrieveMock.mockRejectedValue(new Error("Subscription not found"));

      const result = await getSubscription("sub_nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel a subscription at period end", async () => {
      const mockSubscription = {
        id: "sub_123",
        status: "active",
        cancel_at_period_end: true,
      };

      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const updateMock = stripeInstance.subscriptions.update as ReturnType<
        typeof vi.fn
      >;
      updateMock.mockResolvedValue(mockSubscription as any);

      const result = await cancelSubscription("sub_123");

      expect(updateMock).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: true,
      });
      expect(result.cancel_at_period_end).toBe(true);
    });
  });

  describe("reactivateSubscription", () => {
    it("should reactivate a subscription", async () => {
      const mockSubscription = {
        id: "sub_123",
        status: "active",
        cancel_at_period_end: false,
      };

      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const updateMock = stripeInstance.subscriptions.update as ReturnType<
        typeof vi.fn
      >;
      updateMock.mockResolvedValue(mockSubscription as any);

      const result = await reactivateSubscription("sub_123");

      expect(updateMock).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: false,
      });
      expect(result.cancel_at_period_end).toBe(false);
    });
  });

  describe("getCustomer", () => {
    it("should retrieve a customer by ID", async () => {
      const mockCustomer = {
        id: "cus_123",
        email: "test@example.com",
        deleted: false,
      };

      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const retrieveMock = stripeInstance.customers.retrieve as ReturnType<
        typeof vi.fn
      >;
      retrieveMock.mockResolvedValue(mockCustomer as any);

      const result = await getCustomer("cus_123");

      expect(retrieveMock).toHaveBeenCalledWith("cus_123");
      expect(result).toEqual(mockCustomer);
    });

    it("should return null for deleted customer", async () => {
      const mockCustomer = {
        id: "cus_123",
        deleted: true,
      };

      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const retrieveMock = stripeInstance.customers.retrieve as ReturnType<
        typeof vi.fn
      >;
      retrieveMock.mockResolvedValue(mockCustomer as any);

      const result = await getCustomer("cus_123");

      expect(result).toBeNull();
    });

    it("should return null on error", async () => {
      const Stripe = await import("stripe");
      const stripeInstance = new Stripe.default("test_key", {
        apiVersion: "2024-11-20.acacia",
      });
      const retrieveMock = stripeInstance.customers.retrieve as ReturnType<
        typeof vi.fn
      >;
      retrieveMock.mockRejectedValue(new Error("Customer not found"));

      const result = await getCustomer("cus_nonexistent");

      expect(result).toBeNull();
    });
  });
});
