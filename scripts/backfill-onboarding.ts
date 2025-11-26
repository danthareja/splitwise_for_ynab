import "dotenv/config";
import { prisma } from "../db";

/**
 * Backfill script to infer persona and onboardingStep from existing user data.
 *
 * Persona inference:
 * - Query SplitwiseSettings grouped by groupId
 * - If groupId has 2+ users → persona = "dual"
 * - Otherwise → persona = "solo"
 *
 * Step inference (0-5):
 * - Step 0: No Account entry for provider "splitwise" (need Splitwise connection)
 * - Step 1: Has Splitwise account but needs persona selection
 * - Step 2: Persona set but no YnabSettings.budgetId or .splitwiseAccountId (need YNAB config)
 * - Step 3: YNAB complete but no SplitwiseSettings.groupId or .currencyCode (need Splitwise config)
 * - Step 4: Dual persona needs partner verification
 * - Step 5 / onboardingComplete: Everything complete
 */

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) {
    console.log("Dry run mode - no changes will be made\n");
  }

  // Step 1: Find all users with their related data
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      ynabSettings: true,
      splitwiseSettings: true,
    },
  });

  console.log(`Found ${users.length} users to process\n`);

  // Step 2: Identify dual personas by grouping SplitwiseSettings by groupId
  const groupIdUserCount = new Map<string, number>();

  for (const user of users) {
    const groupId = user.splitwiseSettings?.groupId;
    if (groupId) {
      groupIdUserCount.set(groupId, (groupIdUserCount.get(groupId) || 0) + 1);
    }
  }

  // Groups with 2+ users are "dual"
  const dualGroupIds = new Set<string>();
  for (const [groupId, count] of groupIdUserCount) {
    if (count >= 2) {
      dualGroupIds.add(groupId);
    }
  }

  console.log(
    `Found ${dualGroupIds.size} dual groups (2+ users sharing same group)\n`,
  );

  // Step 3: Process each user
  let updatedCount = 0;

  for (const user of users) {
    const hasSplitwiseAccount = user.accounts.some(
      (account) => account.provider === "splitwise",
    );
    const hasYnabAccount = user.accounts.some(
      (account) => account.provider === "ynab",
    );

    // Infer persona
    const groupId = user.splitwiseSettings?.groupId;
    let persona: string | null = null;

    if (groupId) {
      persona = dualGroupIds.has(groupId) ? "dual" : "solo";
    }

    // Infer onboarding step
    let onboardingStep = 0;
    let onboardingComplete = false;

    if (!hasSplitwiseAccount) {
      // Step 0: Need to connect Splitwise
      onboardingStep = 0;
    } else if (!persona) {
      // Step 1: Connected but needs persona (we'll default to "solo" and set step 2)
      // Since we're backfilling, we'll infer solo if they have a group but aren't dual
      if (groupId) {
        persona = "solo";
        onboardingStep = 2;
      } else {
        // Has Splitwise account but no settings yet - they need persona selection
        onboardingStep = 1;
      }
    }

    // Now check YNAB config
    if (onboardingStep < 2 && persona) {
      onboardingStep = 2;
    }

    const hasYnabConfig =
      user.ynabSettings?.budgetId && user.ynabSettings?.splitwiseAccountId;
    if (onboardingStep === 2 && !hasYnabConfig) {
      // Stay at step 2 - needs YNAB config
      onboardingStep = 2;
    } else if (hasYnabConfig) {
      onboardingStep = 3;
    }

    // Check Splitwise config
    const hasSplitwiseConfig =
      user.splitwiseSettings?.groupId && user.splitwiseSettings?.currencyCode;
    if (onboardingStep === 3 && !hasSplitwiseConfig) {
      // Stay at step 3 - needs Splitwise config
      onboardingStep = 3;
    } else if (hasSplitwiseConfig && onboardingStep >= 3) {
      onboardingStep = 4;
    }

    // Check partner verification for dual
    if (onboardingStep === 4) {
      if (persona === "dual") {
        // For dual, check if partner is also connected
        // For now, if they're dual and have all config, we'll mark them complete
        // Partner verification will be a UI step going forward
        onboardingComplete = true;
        onboardingStep = 5;
      } else {
        // Solo users are complete after Splitwise config
        onboardingComplete = true;
        onboardingStep = 5;
      }
    }

    // Final check: if they have all settings, they're complete
    if (hasSplitwiseAccount && hasYnabConfig && hasSplitwiseConfig) {
      onboardingComplete = true;
      onboardingStep = 5;
      // Default to solo if persona not set
      if (!persona) {
        persona = dualGroupIds.has(groupId!) ? "dual" : "solo";
      }
    }

    // Only update if values changed
    const needsUpdate =
      user.persona !== persona ||
      user.onboardingStep !== onboardingStep ||
      user.onboardingComplete !== onboardingComplete;

    if (needsUpdate) {
      console.log(`User ${user.id} (${user.email || "no email"}):`);
      console.log(`  persona: ${user.persona} → ${persona}`);
      console.log(
        `  onboardingStep: ${user.onboardingStep} → ${onboardingStep}`,
      );
      console.log(
        `  onboardingComplete: ${user.onboardingComplete} → ${onboardingComplete}`,
      );
      console.log(
        `  hasSplitwiseAccount: ${hasSplitwiseAccount}, hasYnabConfig: ${hasYnabConfig}, hasSplitwiseConfig: ${hasSplitwiseConfig}`,
      );
      console.log();

      if (!dryRun) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            persona,
            onboardingStep,
            onboardingComplete,
          },
        });
      }
      updatedCount++;
    }
  }

  console.log(`\n${dryRun ? "Would update" : "Updated"} ${updatedCount} users`);
  console.log("Backfill complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
