"use server";

import { auth } from "@/auth";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";

export type Persona = "solo" | "dual";

export async function updateOnboardingStep(step: number) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingStep: step },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/setup");

  return { success: true };
}

export async function updatePersona(persona: Persona) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { persona },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/setup");

  return { success: true };
}

export async function completeOnboarding() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingComplete: true,
      onboardingStep: 5,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/setup");

  return { success: true };
}

export async function getOnboardingState() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      persona: true,
      onboardingStep: true,
      onboardingComplete: true,
    },
  });

  return user;
}

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
