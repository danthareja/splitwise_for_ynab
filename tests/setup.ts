import { beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

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
