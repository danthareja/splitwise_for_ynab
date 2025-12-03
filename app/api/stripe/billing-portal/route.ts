import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBillingPortalSession } from "@/services/stripe";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { returnUrl } = body;

  if (!returnUrl) {
    return NextResponse.json(
      { error: "returnUrl is required" },
      { status: 400 },
    );
  }

  const portalSession = await createBillingPortalSession({
    userId: session.user.id,
    returnUrl,
  });

  return NextResponse.json({ url: portalSession.url });
}
