"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { PrismaClient } from "@prisma/client"
import { getSplitwiseGroups } from "@/services/splitwise-auth"
import { getSplitwiseApiKey } from "@/app/actions/splitwise"

const prisma = new PrismaClient()

export async function getSplitwiseGroupsForUser() {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to fetch groups",
    }
  }

  const apiKey = await getSplitwiseApiKey()

  if (!apiKey) {
    return {
      success: false,
      error: "No Splitwise API key found. Please connect your Splitwise account first.",
    }
  }

  const result = await getSplitwiseGroups(apiKey)

  if (!result.success) {
    return result
  }

  // Filter groups to only include those with exactly 2 members
  const validGroups = result.groups.filter((group) => group.members.length === 2)
  const invalidGroups = result.groups.filter((group) => group.members.length !== 2)

  return {
    success: true,
    validGroups,
    invalidGroups,
  }
}

export async function saveUserSettings(formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be logged in to save settings",
    }
  }

  const splitwiseGroupId = formData.get("splitwiseGroupId") as string
  const splitwiseGroupName = formData.get("splitwiseGroupName") as string
  const splitwiseCurrencyCode = formData.get("splitwiseCurrencyCode") as string

  if (!splitwiseGroupId || !splitwiseCurrencyCode) {
    return {
      success: false,
      error: "Group and currency code are required",
    }
  }

  try {
    await prisma.settings.upsert({
      where: { userId: session.user.id },
      update: {
        splitwiseGroupId,
        splitwiseGroupName,
        splitwiseCurrencyCode,
      },
      create: {
        userId: session.user.id,
        splitwiseGroupId,
        splitwiseGroupName,
        splitwiseCurrencyCode,
      },
    })

    revalidatePath("/dashboard")

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error saving settings:", error)
    return {
      success: false,
      error: "Failed to save settings",
    }
  }
}

export async function getUserSettings() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    })

    return settings
  } catch (error) {
    console.error("Error getting user settings:", error)
    return null
  }
}
