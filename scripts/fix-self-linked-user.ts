import "dotenv/config";
import { prisma } from "../db";

async function main() {
  const dryRun = !process.argv.includes("--apply");

  if (dryRun) {
    console.log("DRY RUN - pass --apply to make changes\n");
  }

  // Find users who are linked to themselves (primaryUserId === id)
  const selfLinkedUsers = await prisma.user.findMany({
    where: {
      primaryUserId: { not: null },
    },
    select: {
      id: true,
      email: true,
      primaryUserId: true,
      persona: true,
      onboardingStep: true,
      onboardingComplete: true,
      splitwiseSettings: true,
    },
  });

  const affected = selfLinkedUsers.filter((u) => u.primaryUserId === u.id);

  if (affected.length === 0) {
    console.log("No self-linked users found.");
    return;
  }

  console.log(`Found ${affected.length} self-linked user(s):\n`);

  for (const user of affected) {
    console.log(`  User: ${user.email} (${user.id})`);
    console.log(`    primaryUserId: ${user.primaryUserId} (self-linked!)`);
    console.log(`    persona: ${user.persona}`);
    console.log(`    onboardingStep: ${user.onboardingStep}`);
    console.log(`    onboardingComplete: ${user.onboardingComplete}`);
    console.log();

    if (!dryRun) {
      // Restore user to primary/solo state:
      // - Clear the self-link
      // - Set persona back to dual (they were a primary who had an invite)
      // - Re-complete onboarding (they were fully set up before the accident)
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            primaryUserId: null,
            persona: "dual",
            onboardingComplete: true,
            onboardingStep: 4,
          },
        }),
        // Restore their splitwise settings to their original group settings
        // (the self-link may have reversed their split ratio)
        ...(user.splitwiseSettings?.defaultSplitRatio
          ? [
              prisma.splitwiseSettings.update({
                where: { userId: user.id },
                data: {
                  // If ratio got reversed, reverse it back
                  defaultSplitRatio: reverseSplitRatio(
                    user.splitwiseSettings.defaultSplitRatio,
                  ),
                },
              }),
            ]
          : []),
        // Expire the self-accepted invite
        prisma.partnerInvite.updateMany({
          where: {
            primaryUserId: user.id,
            acceptedByUserId: user.id,
            status: "accepted",
          },
          data: {
            status: "expired",
            acceptedByUserId: null,
          },
        }),
      ]);

      console.log(`  ✓ Fixed user ${user.email}`);
    }
  }

  if (dryRun) {
    console.log("Run with --apply to fix these users.");
  } else {
    console.log(`\nDone. Fixed ${affected.length} user(s).`);
  }
}

function reverseSplitRatio(ratio: string | null): string {
  if (!ratio) return "1:1";
  const parts = ratio.split(":");
  if (parts.length !== 2) return "1:1";
  return `${parts[1]}:${parts[0]}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
