import type { NextRequest } from "next/server";
import { prisma } from "@/db";
import { syncAllUsers, syncUserData } from "@/services/sync";
import { enforcePerUserRateLimit } from "@/services/rate-limit";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (token === process.env.CRON_SECRET) {
    const result = await syncAllUsers();
    return Response.json(result);
  }

  const user = await prisma.user.findFirst({ where: { apiKey: token } });

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const maxRequests = Number(process.env.USER_SYNC_MAX_REQUESTS ?? 2);
  const windowSeconds = Number(process.env.USER_SYNC_WINDOW_SECONDS ?? 3600);

  const { allowed, retryAfterSeconds } = await enforcePerUserRateLimit(
    user.id,
    {
      key: "sync",
      maxRequests,
      windowSeconds,
    },
  );

  if (!allowed) {
    return new Response(
      `You can send a maximum of ${maxRequests} sync requests in ${windowSeconds} seconds. Try again in ${retryAfterSeconds} seconds`,
      {
        status: 429,
        headers: {
          "Retry-After": retryAfterSeconds.toString(),
        },
      },
    );
  }

  const result = await syncUserData(user.id);

  return Response.json(result);
}
