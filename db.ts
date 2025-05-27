import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const extendedPrismaClient = new PrismaClient().$extends(withAccelerate());

export type ExtendedPrismaClientType = typeof extendedPrismaClient;

const globalForPrisma = global as unknown as {
  prisma: ExtendedPrismaClientType | undefined;
};

export const prisma = globalForPrisma.prisma ?? extendedPrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
