import { RateLimit } from "./rate-limit";
import { prisma } from "@/db";

export class PrismaRateLimit implements RateLimit {
  async hit(
    userId: string,
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
    const now = new Date();
    const windowStartThreshold = new Date(now.getTime() - windowSeconds * 1000);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimit.findUnique({
        where: {
          userId_key: {
            userId,
            key,
          },
        },
      });

      if (!existing) {
        await tx.rateLimit.create({
          data: {
            userId,
            key,
            count: 1,
            windowStart: now,
          },
        });
        return { allowed: true, retryAfterSeconds: windowSeconds };
      }

      // If window expired, reset to 1 and allow
      if (existing.windowStart < windowStartThreshold) {
        await tx.rateLimit.update({
          where: { id: existing.id },
          data: {
            count: 1,
            windowStart: now,
          },
        });
        return { allowed: true, retryAfterSeconds: windowSeconds };
      }

      // Atomic increment first, then evaluate count
      const updated = await tx.rateLimit.update({
        where: { id: existing.id },
        data: {
          count: { increment: 1 },
        },
        select: {
          count: true,
        },
      });

      const allowed = updated.count <= maxRequests;
      const retryAfterSeconds = allowed
        ? windowSeconds
        : Math.ceil(
            windowSeconds -
              (now.getTime() - existing.windowStart.getTime()) / 1000,
          );
      return { allowed, retryAfterSeconds };
    });
  }
}
