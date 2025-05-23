"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { PrismaClient } from "@prisma/client"
import { validateSplitwiseApiKey, type SplitwiseUser } from "@/services/splitwise-auth"

const prisma = new PrismaClient()

export async function validateApiKey(formData: FormData) {
  const apiKey = formData.get("apiKey") as string

  if (!apiKey || apiKey.trim() === "") {
    return {
      success: false,
      error: "API key is required",
    }
  }

  const result = await validateSplitwiseApiKey(apiKey)

  if (!result.success) {
    return result
  }

  return {
    success: true,
    user: result.user,
    apiKey,
  }
}

export async function saveSplitwiseUser(apiKey: string, splitwiseUser: SplitwiseUser) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to save your Splitwise information",
    }
  }

  try {
    // Store the API key securely (in a real app, you'd encrypt this)
    // Update user information with Splitwise data
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: `${splitwiseUser.first_name} ${splitwiseUser.last_name}`,
        email: splitwiseUser.email,
        image: splitwiseUser.picture.medium,
        // In a real app, you'd store the API key in a more secure way
        // This is just for demonstration
        accounts: {
          create: {
            type: "manual",
            provider: "splitwise",
            providerAccountId: splitwiseUser.id.toString(),
            access_token: apiKey,
          },
        },
      },
    })

    revalidatePath("/dashboard")

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error saving Splitwise user:", error)
    return {
      success: false,
      error: "Failed to save your Splitwise information",
    }
  }
}
