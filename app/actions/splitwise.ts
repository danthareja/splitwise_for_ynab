"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/db";
import {
  validateSplitwiseApiKey,
  type SplitwiseUser,
} from "@/services/splitwise-auth";

export async function validateApiKey(formData: FormData) {
  const apiKey = formData.get("apiKey") as string;

  if (!apiKey || apiKey.trim() === "") {
    return {
      success: false,
      error: "API key is required",
    };
  }

  const result = await validateSplitwiseApiKey(apiKey);

  if (!result.success) {
    return {
      ...result,
      apiKey: null,
    };
  }

  return {
    success: true,
    user: result.user,
    apiKey,
  };
}

export async function saveSplitwiseUser(
  apiKey: string,
  splitwiseUser: SplitwiseUser,
) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to save your Splitwise information",
    };
  }

  try {
    // Check if the user already has a Splitwise account
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "splitwise",
      },
    });

    // Delete any existing settings when updating the API key
    // This ensures users reconfigure their settings with the new API key
    await prisma.splitwiseSettings.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    if (existingAccount) {
      // Update existing account
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          access_token: apiKey,
          providerAccountId: splitwiseUser.id.toString(),
        },
      });
    } else {
      // Create new account
      await prisma.account.create({
        data: {
          userId: session.user.id,
          type: "oauth",
          provider: "splitwise",
          providerAccountId: splitwiseUser.id.toString(),
          access_token: apiKey,
        },
      });
    }

    // Update user information with Splitwise data
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: `${splitwiseUser.first_name} ${splitwiseUser.last_name}`,
        email: splitwiseUser.email,
        image: splitwiseUser.picture.medium,
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error saving Splitwise user:", error);
    return {
      success: false,
      error: "Failed to save your Splitwise information",
    };
  }
}

export async function disconnectSplitwiseAccount() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to disconnect your Splitwise account",
    };
  }

  try {
    // Delete the Splitwise account
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: "splitwise",
      },
    });

    // Delete the user's settings as well
    await prisma.splitwiseSettings.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    revalidatePath("/dashboard");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error disconnecting Splitwise account:", error);
    return {
      success: false,
      error: "Failed to disconnect your Splitwise account",
    };
  }
}

export async function getSplitwiseApiKey() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "splitwise",
      },
    });

    return account?.access_token || null;
  } catch (error) {
    console.error("Error getting Splitwise API key:", error);
    return null;
  }
}
