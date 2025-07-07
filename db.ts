import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Use Prisma Accelerate only when DATABASE_URL starts with 'prisma://'
const isPrismaAccelerateUrl =
  process.env.DATABASE_URL?.startsWith("prisma://") ||
  process.env.DATABASE_URL?.startsWith("prisma+postgres://");

const extendedPrismaClient = isPrismaAccelerateUrl
  ? new PrismaClient().$extends(withAccelerate())
  : new PrismaClient();

export type ExtendedPrismaClientType = typeof extendedPrismaClient;

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClientType | undefined;
};

export const prisma = globalForPrisma.prisma ?? extendedPrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
