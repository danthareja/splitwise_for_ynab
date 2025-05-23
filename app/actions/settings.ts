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

// Check for emoji conflicts
async function checkEmojiConflict(userId: string, groupId: string, emoji: string) {
  // Get all users who have this group configured
  const usersWithSameGroup = await prisma.settings.findMany({
    where: {
      splitwiseGroupId: groupId,
      userId: {
        not: userId, // Exclude the current user
      },
    },
    include: {
      user: true,
    },
  })

  // Check if any other user in this group is using the same emoji
  const conflictingUser = usersWithSameGroup.find((settings) => settings.splitwiseEmoji === emoji)

  if (conflictingUser) {
    return {
      hasConflict: true,
      conflictingUser: conflictingUser.user.name || "Another user",
      conflictingEmoji: emoji,
    }
  }

  return { hasConflict: false }
}

// Synchronize currency code with all partners in the same group
async function syncCurrencyWithPartners(userId: string, groupId: string, currencyCode: string) {
  try {
    // Find all other users with the same group
    const partnersWithSameGroup = await prisma.settings.findMany({
      where: {
        splitwiseGroupId: groupId,
        userId: {
          not: userId, // Exclude the current user
        },
      },
      include: {
        user: true,
      },
    })

    // Update currency code for all partners
    if (partnersWithSameGroup.length > 0) {
      const updatePromises = partnersWithSameGroup.map((partnerSettings) => {
        return prisma.settings.update({
          where: { userId: partnerSettings.userId },
          data: {
            splitwiseCurrencyCode: currencyCode,
            // Add a flag to indicate the currency was synchronized
            currencySyncedAt: new Date(),
          },
        })
      })

      await Promise.all(updatePromises)
      return {
        success: true,
        updatedPartners: partnersWithSameGroup.map((p) => p.user.name || `User ${p.userId}`),
      }
    }

    return { success: true, updatedPartners: [] }
  } catch (error) {
    console.error("Error syncing currency with partners:", error)
    return { success: false, error: "Failed to sync currency with partners" }
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
  const splitwiseEmoji = formData.get("splitwiseEmoji") as string

  if (!splitwiseGroupId || !splitwiseCurrencyCode) {
    return {
      success: false,
      error: "Group and currency code are required",
    }
  }

  // Check for emoji conflicts
  const emojiConflict = await checkEmojiConflict(session.user.id, splitwiseGroupId, splitwiseEmoji || "✅")

  if (emojiConflict.hasConflict) {
    return {
      success: false,
      error: `Emoji conflict: ${emojiConflict.conflictingUser} is already using the emoji "${emojiConflict.conflictingEmoji}". Please choose a different emoji.`,
      isEmojiConflict: true,
    }
  }

  try {
    // Get current settings to check if currency has changed
    const currentSettings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
    })

    const isCurrencyChanged = currentSettings?.splitwiseCurrencyCode !== splitwiseCurrencyCode
    const isGroupChanged = currentSettings?.splitwiseGroupId !== splitwiseGroupId

    // Update or create the user's settings
    await prisma.settings.upsert({
      where: { userId: session.user.id },
      update: {
        splitwiseGroupId,
        splitwiseGroupName,
        splitwiseCurrencyCode,
        splitwiseEmoji: splitwiseEmoji || "✅",
      },
      create: {
        userId: session.user.id,
        splitwiseGroupId,
        splitwiseGroupName,
        splitwiseCurrencyCode,
        splitwiseEmoji: splitwiseEmoji || "✅",
      },
    })

    // If currency code changed or group changed, sync with partners
    let syncResult = { success: true, updatedPartners: [] }
    if ((isCurrencyChanged || isGroupChanged) && splitwiseCurrencyCode) {
      syncResult = await syncCurrencyWithPartners(session.user.id, splitwiseGroupId, splitwiseCurrencyCode)
    }

    revalidatePath("/dashboard")

    return {
      success: true,
      currencySynced: syncResult.updatedPartners.length > 0,
      updatedPartners: syncResult.updatedPartners,
    }
  } catch (error) {
    console.error("Error saving settings:", error)
    return {
      success: false,
      error: "Failed to save settings",
    }
  }
}

// Get partner's emoji and currency
export async function getPartnerEmoji(groupId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  try {
    // Find settings for other users with the same group
    const partnerSettings = await prisma.settings.findFirst({
      where: {
        splitwiseGroupId: groupId,
        userId: {
          not: session.user.id,
        },
      },
      select: {
        splitwiseEmoji: true,
        splitwiseCurrencyCode: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    })

    if (partnerSettings) {
      return {
        emoji: partnerSettings.splitwiseEmoji,
        currencyCode: partnerSettings.splitwiseCurrencyCode,
        partnerName: partnerSettings.user.name || "Your partner",
      }
    }

    return null
  } catch (error) {
    console.error("Error getting partner emoji:", error)
    return null
  }
}

// Check if currency was recently synced by partner
export async function checkCurrencySyncStatus() {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { userId: session.user.id },
      select: {
        currencySyncedAt: true,
      },
    })

    if (settings?.currencySyncedAt) {
      // Check if the sync happened in the last 24 hours
      const syncTime = new Date(settings.currencySyncedAt)
      const now = new Date()
      const hoursSinceSync = (now.getTime() - syncTime.getTime()) / (1000 * 60 * 60)

      if (hoursSinceSync < 24) {
        return {
          recentlyUpdated: true,
          syncTime: settings.currencySyncedAt,
        }
      }
    }

    return { recentlyUpdated: false }
  } catch (error) {
    console.error("Error checking currency sync status:", error)
    return null
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
