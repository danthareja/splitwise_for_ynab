"use server";

import { auth } from "@/auth";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

export async function reenableAccount() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.disabled) {
    return { success: true, message: "Account is already enabled" };
  }

  // Re-enable the account
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      disabled: false,
      disabledAt: null,
      disabledReason: null,
      suggestedFix: null,
    },
  });

  revalidatePath("/dashboard");

  return { success: true, message: "Account has been re-enabled" };
}