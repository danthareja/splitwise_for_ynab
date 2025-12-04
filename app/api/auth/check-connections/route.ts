import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/db";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: { provider: true },
    });

    const hasYnab = accounts.some((a) => a.provider === "ynab");
    const hasSplitwise = accounts.some((a) => a.provider === "splitwise");

    return NextResponse.json({
      ynab: hasYnab,
      splitwise: hasSplitwise,
    });
  } catch (error) {
    console.error("Error checking connections:", error);
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Failed to check connections" },
      { status: 500 },
    );
  }
}
