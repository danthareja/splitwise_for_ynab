import { PrismaClient } from "@/prisma/generated/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = `${process.env.DATABASE_URL}`;

// Use Neon adapter for Neon URLs, PG adapter for local PostgreSQL
const isNeonUrl = connectionString.includes("neon.tech");

const adapter = isNeonUrl
  ? new PrismaNeon({ connectionString })
  : new PrismaPg({ connectionString });

const prismaClient = new PrismaClient({ adapter });

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
