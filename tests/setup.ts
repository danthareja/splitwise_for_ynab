import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { PrismaClient } from "@/prisma/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Use the PostgreSQL adapter for local PostgreSQL database
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {
      GET: vi.fn(),
      POST: vi.fn(),
    },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("@/auth", () => ({
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/db", () => ({
  prisma,
}));

// Mock Resend to prevent real API calls during tests
vi.mock("resend", () => {
  return {
    Resend: class MockResend {
      emails = {
        send: vi
          .fn()
          .mockResolvedValue({ data: { id: "test-email-id" }, error: null }),
      };
    },
  };
});

// Mock Stripe to prevent real API calls during tests
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
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
    invoices: {
      createPreview: vi.fn(),
    },
  },
}));

export const server = setupServer();

beforeAll(async () => {
  await prisma.$connect();
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(async () => {
  await prisma.$disconnect();
  server.close();
});

beforeEach(async () => {
  await cleanDatabase();
});

afterEach(() => {
  server.resetHandlers();
});

async function cleanDatabase() {
  await prisma.emailSend.deleteMany();
  await prisma.emailUnsubscribe.deleteMany();
  await prisma.syncedItem.deleteMany();
  await prisma.syncHistory.deleteMany();
  await prisma.syncState.deleteMany();
  await prisma.rateLimit.deleteMany();
  await prisma.splitwiseSettings.deleteMany();
  await prisma.ynabSettings.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.authenticator.deleteMany();
  await prisma.user.deleteMany();
}
