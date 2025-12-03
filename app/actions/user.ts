"use server";

import { auth } from "@/auth";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import {
  sendPartnerJoinedEmail,
  sendPartnerDisconnectedEmail,
} from "@/services/email";
import { getUserFirstName } from "@/lib/utils";

export type Persona = "solo" | "dual";

export type PersonaChangeResult =
  | { success: true }
  | { success: false; error: string }
  | {
      success: false;
      requiresConfirmation: true;
      confirmationType: "primary_has_partner" | "secondary_leaving";
      partnerName: string | null;
      groupName: string | null;
    };

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

// Simple persona update (used during onboarding, no partner checks)
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

// Smart persona update with partner relationship handling
export async function updatePersonaWithPartnerHandling(
  newPersona: Persona,
  confirmed: boolean = false,
): Promise<PersonaChangeResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      primaryUser: {
        select: {
          id: true,
          name: true,
          firstName: true,
          splitwiseSettings: {
            select: { groupName: true },
          },
        },
      },
      secondaryUser: {
        select: {
          id: true,
          name: true,
          firstName: true,
          email: true,
        },
      },
      splitwiseSettings: {
        select: { groupName: true },
      },
    },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const currentPersona = user.persona as Persona | null;

  // Scenario 1: Solo → Dual (safe, no confirmation needed)
  if (currentPersona === "solo" && newPersona === "dual") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { persona: "dual" },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true };
  }

  // Scenario 2: Dual (Primary with partner) → Solo
  if (
    currentPersona === "dual" &&
    newPersona === "solo" &&
    !user.primaryUserId &&
    user.secondaryUser
  ) {
    if (!confirmed) {
      // Require confirmation before proceeding
      return {
        success: false,
        requiresConfirmation: true,
        confirmationType: "primary_has_partner",
        partnerName:
          user.secondaryUser.firstName || user.secondaryUser.name || null,
        groupName: user.splitwiseSettings?.groupName || null,
      };
    }

    // Confirmed: Disconnect the secondary user and switch to solo
    // The secondary is converted to solo mode with cleared group settings
    // (same as when they voluntarily leave)
    await prisma.$transaction([
      // Unlink and convert secondary to solo
      prisma.user.update({
        where: { id: user.secondaryUser.id },
        data: {
          primaryUserId: null,
          persona: "solo",
          // Reset onboarding so they can reconfigure Splitwise
          onboardingStep: 3, // Configure Splitwise step
          onboardingComplete: false,
        },
      }),
      // Clear the secondary's group settings (they need to pick a new group)
      // Keep personal preferences: emoji, useDescriptionAsPayee, customPayeeName
      prisma.splitwiseSettings.updateMany({
        where: { userId: user.secondaryUser.id },
        data: {
          groupId: null,
          groupName: null,
          currencyCode: null,
          defaultSplitRatio: null,
          lastPartnerSyncAt: null,
        },
      }),
      // Update current user to solo
      prisma.user.update({
        where: { id: session.user.id },
        data: { persona: "solo" },
      }),
      // Expire any pending invites from this user
      prisma.partnerInvite.updateMany({
        where: {
          primaryUserId: session.user.id,
          status: "pending",
        },
        data: {
          status: "expired",
        },
      }),
    ]);

    // Send email notification to the disconnected secondary
    const secondaryEmail = user.secondaryUser.email;
    if (secondaryEmail) {
      const primaryName = getUserFirstName(user) || "Your partner";
      const groupName = user.splitwiseSettings?.groupName || undefined;

      // Send email in the background - don't block the response
      sendPartnerDisconnectedEmail({
        to: secondaryEmail,
        userName: getUserFirstName(user.secondaryUser) || undefined,
        primaryName,
        oldGroupName: groupName,
      }).catch((error) => {
        console.error("Failed to send partner disconnected email:", error);
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true };
  }

  // Scenario 2b: Dual (Primary waiting for partner) → Solo
  if (
    currentPersona === "dual" &&
    newPersona === "solo" &&
    !user.primaryUserId &&
    !user.secondaryUser
  ) {
    // No partner connected yet, safe to switch
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { persona: "solo" },
      }),
      // Expire any pending invites
      prisma.partnerInvite.updateMany({
        where: {
          primaryUserId: session.user.id,
          status: "pending",
        },
        data: {
          status: "expired",
        },
      }),
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true };
  }

  // Scenario 3: Dual (Secondary) → Solo
  if (
    currentPersona === "dual" &&
    newPersona === "solo" &&
    user.primaryUserId
  ) {
    if (!confirmed) {
      // Require confirmation before proceeding
      const primaryName = user.primaryUser?.firstName || user.primaryUser?.name;
      const groupName =
        user.splitwiseSettings?.groupName ||
        user.primaryUser?.splitwiseSettings?.groupName;

      return {
        success: false,
        requiresConfirmation: true,
        confirmationType: "secondary_leaving",
        partnerName: primaryName || null,
        groupName: groupName || null,
      };
    }

    // Confirmed: Unlink from primary, switch to solo, and clear shared group settings
    // Under duo-only architecture, ex-secondary can't use the same group as the primary
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          primaryUserId: null,
          persona: "solo",
        },
      }),
      // Clear group-specific settings (they'll need to pick a new group)
      // Keep personal preferences: emoji, useDescriptionAsPayee, customPayeeName
      prisma.splitwiseSettings.updateMany({
        where: { userId: session.user.id },
        data: {
          groupId: null,
          groupName: null,
          currencyCode: null,
          defaultSplitRatio: null,
          lastPartnerSyncAt: null,
        },
      }),
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");

    return { success: true };
  }

  // Default: Simple persona update (shouldn't reach here in normal flow)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { persona: newPersona },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  return { success: true };
}

export async function completeOnboarding() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Get user info to check if they're a secondary user
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      firstName: true,
      primaryUserId: true,
      primaryUser: {
        select: {
          email: true,
          name: true,
          firstName: true,
        },
      },
    },
  });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingComplete: true,
      onboardingStep: 5,
    },
  });

  // If this is a secondary user completing onboarding, notify the primary
  if (user?.primaryUserId && user.primaryUser?.email) {
    const partnerName = user.firstName || user.name || "Your partner";
    const primaryName = user.primaryUser.firstName || user.primaryUser.name;

    // Send email in the background - don't block onboarding completion
    sendPartnerJoinedEmail({
      to: user.primaryUser.email,
      userName: primaryName || undefined,
      partnerName,
    }).catch((error) => {
      console.error("Failed to send partner joined email:", error);
    });
  }

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
