import "dotenv/config";
import { prisma } from "../db";
import { sendGrandfatherAnnouncementEmail } from "../services/email";

/**
 * Script to send grandfather announcement emails to all grandfathered users.
 *
 * Usage:
 *   npx tsx scripts/send-grandfather-emails.ts --dry-run   # Preview recipients
 *   npx tsx scripts/send-grandfather-emails.ts             # Send emails
 *
 * Features:
 * - Queries all users where isGrandfathered === true AND email IS NOT NULL
 * - Supports --dry-run flag to preview recipients without sending
 * - Rate-limited sending (100ms delay between emails to avoid Resend limits)
 * - Logs success/failure for each email
 */

interface GrandfatheredUser {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Grandfather Announcement Email Sender              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No emails will be sent\n");
  } else {
    console.log("📧 SEND MODE - Emails will be sent to grandfathered users\n");
  }

  // Fetch all grandfathered users with email addresses
  const users = await prisma.user.findMany({
    where: {
      isGrandfathered: true,
      email: { not: null },
    },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
    },
  });

  // Filter out users without email (TypeScript narrowing)
  const usersWithEmail = users.filter(
    (u): u is GrandfatheredUser => u.email !== null,
  );

  console.log(`📊 Found ${usersWithEmail.length} grandfathered users to email`);
  console.log();

  if (usersWithEmail.length === 0) {
    console.log("✅ No users to email. Run the backfill script first.");
    return;
  }

  // In dry run mode, just list the recipients
  if (dryRun) {
    console.log("─".repeat(64));
    console.log("📋 Recipients:");
    console.log();

    for (const user of usersWithEmail) {
      const displayName = user.firstName || user.name || "User";
      console.log(`  • ${user.email} (${displayName})`);
    }

    console.log();
    console.log("─".repeat(64));
    console.log(
      `🔍 DRY RUN COMPLETE - ${usersWithEmail.length} emails would be sent`,
    );
    console.log("   Run without --dry-run to send emails");
    return;
  }

  // Send emails with rate limiting
  console.log("─".repeat(64));
  console.log("📧 Sending emails...");
  console.log();

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < usersWithEmail.length; i++) {
    const user = usersWithEmail[i];
    if (!user) continue;

    const displayName = user.firstName || user.name || "there";
    const progress = `[${i + 1}/${usersWithEmail.length}]`;

    try {
      const result = await sendGrandfatherAnnouncementEmail({
        to: user.email,
        userName: displayName,
      });

      if (result.success) {
        console.log(`  ✅ ${progress} ${user.email}`);
        successCount++;
      } else {
        console.log(`  ❌ ${progress} ${user.email} - Failed to send`);
        errorCount++;
      }
    } catch (error) {
      console.log(
        `  ❌ ${progress} ${user.email} - ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      errorCount++;
    }

    // Rate limit: 100ms delay between emails
    if (i < usersWithEmail.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Summary
  console.log();
  console.log("─".repeat(64));
  console.log("📊 Summary:");
  console.log(`   Sent successfully: ${successCount}`);
  console.log(`   Failed:            ${errorCount}`);
  console.log(`   Total:             ${usersWithEmail.length}`);
  console.log();

  if (errorCount === 0) {
    console.log("✅ All emails sent successfully!");
  } else {
    console.log(`⚠️  ${errorCount} email(s) failed to send.`);
  }
}

main()
  .catch((e) => {
    console.error("Script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
