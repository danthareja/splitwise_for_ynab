/**
 * Session User Update Script for Debugging
 *
 * This script allows you to update a session to point to any user for debugging purposes.
 * It validates that both the session and target user exist before making any changes.
 *
 * Usage:
 *   npm run script:impersonate <session_token> <target_email>
 *
 * Examples:
 *   # Switch to debug user
 *   npm run script:impersonate 1f9c3b18-7eef-4c04-abe5-5179fafddcab pdt1820@gmail.com
 *
 *   # Switch back to original user
 *   npm run script:impersonate 1f9c3b18-7eef-4c04-abe5-5179fafddcab original@example.com
 */

import "dotenv/config";
import { prisma } from "../db";

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error(
      "Usage: npm run script:impersonate <session_token> <target_email>",
    );
    console.error(
      "Example: npm run script:impersonate 1f9c3b18-7eef-4c04-abe5-5179fafddcab pdt1820@gmail.com",
    );
    process.exit(1);
  }

  const [sessionToken, targetEmail] = args;

  console.log(`Updating session to point to user: ${targetEmail}`);
  console.log(`Using session token: ${sessionToken}\n`);

  try {
    // Verify the session exists
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!session) {
      console.error(`❌ Session with token "${sessionToken}" not found`);
      process.exit(1);
    }

    console.log(
      `✅ Found session for current user: ${session.user.email} (${session.user.name || "No name"})`,
    );

    // Find the target user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: {
        id: true,
        email: true,
        name: true,
        disabled: true,
      },
    });

    if (!targetUser) {
      console.error(`❌ Target user with email "${targetEmail}" not found`);
      process.exit(1);
    }

    console.log(
      `✅ Found target user: ${targetUser.email} (${targetUser.name || "No name"})`,
    );

    if (targetUser.disabled) {
      console.warn(`⚠️  Warning: Target user account is disabled`);
    }

    // Check if we're trying to impersonate the same user
    if (session.userId === targetUser.id) {
      console.log(
        `ℹ️  Session is already associated with the target user. No changes needed.`,
      );
      process.exit(0);
    }

    // Update the session to point to the target user
    await prisma.session.update({
      where: { sessionToken },
      data: { userId: targetUser.id },
    });

    console.log(`\n✅ Successfully updated session:`);
    console.log(`   From: ${session.user.email} (ID: ${session.userId})`);
    console.log(`   To:   ${targetUser.email} (ID: ${targetUser.id})`);
  } catch (error) {
    console.error("❌ Error during impersonation:", error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("❌ Unexpected error:", e);
  process.exit(1);
});
