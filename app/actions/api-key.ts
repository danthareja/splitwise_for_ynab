"use server";

import { auth } from "@/auth";
import { prisma } from "@/db";
import { generateApiKey } from "@/services/api-key";

export async function regenerateApiKeyAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" } as const;
  }

  try {
    const newKey = generateApiKey();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { apiKey: newKey },
    });
    return { success: true, apiKey: newKey } as const;
  } catch (error) {
    console.error("Failed to regenerate apiKey", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    } as const;
  }
}
