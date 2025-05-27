"use server";

import { prisma } from "@/db"; // Assuming your prisma client is exported from lib/db.ts
import { auth } from "@/auth"; // Assuming you have auth configured

export async function getUserWithAccounts() {
  const session = await auth();
  if (!session?.user?.id) {
    // Handle unauthorized access or return null/error
    // Depending on your error handling strategy
    console.error("User not authenticated");
    return null;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Failed to fetch user with accounts:", error);
    // Optionally, rethrow the error or return a specific error object
    return null;
  }
}
