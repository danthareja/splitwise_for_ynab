import type { NextRequest } from "next/server";
import { syncAllUsers } from "@/services/sync";

// Built for Vercel Cron right now
// (separate from Github Actions cron)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const result = await syncAllUsers();

  return Response.json(result);
}
