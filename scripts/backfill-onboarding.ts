import "dotenv/config";
import { prisma } from "../db";

/**
 * Data migration script for new onboarding fields and partner relationships.
 *
 * This script:
 * 1. Identifies duo relationships (2 users sharing the same Splitwise groupId)
 * 2. Establishes primary/secondary relationships (first created = primary)
 * 3. Sets persona ("solo" or "dual") based on group membership
 * 4. Calculates onboardingStep for incomplete users
 *
 * Onboarding steps:
 * - Step 0: No Splitwise account connected
 * - Step 1: Splitwise connected, needs persona selection (solo/primary only)
 * - Step 2: Persona set, needs YNAB configuration
 * - Step 3: YNAB configured, needs Splitwise group/currency configuration
 * - Step 4: Payment/trial step (solo/primary only - secondary users skip)
 * - Complete: All configuration done
 *
 * Secondary users: Skip steps 1 and 4 (persona and payment)
 */

interface UserWithRelations {
  id: string;
  email: string | null;
  createdAt: Date;
  persona: string | null;
  onboardingStep: number;
  onboardingComplete: boolean;
  primaryUserId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  isGrandfathered: boolean;
  accounts: { provider: string }[];
  ynabSettings: { budgetId: string; splitwiseAccountId: string | null } | null;
  splitwiseSettings: {
    groupId: string | null;
    currencyCode: string | null;
  } | null;
}

interface MigrationResult {
  userId: string;
  email: string | null;
  changes: {
    persona?: { from: string | null; to: string | null };
    onboardingStep?: { from: number; to: number };
    onboardingComplete?: { from: boolean; to: boolean };
    primaryUserId?: { from: string | null; to: string | null };
    isGrandfathered?: { from: boolean; to: boolean };
  };
}

interface MigrationSummary {
  totalUsers: number;
  duoGroups: number;
  usersUpdated: number;
  soloUsers: number;
  dualPrimaryUsers: number;
  dualSecondaryUsers: number;
  incompleteOnboarding: number;
  grandfatheredUsers: number;
  results: MigrationResult[];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Onboarding & Partner Relationship Migration        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  if (dryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  } else {
    console.log("⚠️  LIVE MODE - Changes will be applied to the database\n");
  }

  // Fetch all users with their related data
  const users = (await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      createdAt: true,
      persona: true,
      onboardingStep: true,
      onboardingComplete: true,
      primaryUserId: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      isGrandfathered: true,
      accounts: { select: { provider: true } },
      ynabSettings: { select: { budgetId: true, splitwiseAccountId: true } },
      splitwiseSettings: { select: { groupId: true, currencyCode: true } },
    },
    orderBy: { createdAt: "asc" },
  })) as UserWithRelations[];

  console.log(`📊 Found ${users.length} users to analyze\n`);

  // Group users by their Splitwise groupId
  const usersByGroupId = new Map<string, UserWithRelations[]>();
  for (const user of users) {
    const groupId = user.splitwiseSettings?.groupId;
    if (groupId) {
      const existing = usersByGroupId.get(groupId) || [];
      existing.push(user);
      usersByGroupId.set(groupId, existing);
    }
  }

  // Identify duo groups (2+ users sharing same group)
  const duoGroups = new Map<string, UserWithRelations[]>();
  for (const [groupId, groupUsers] of usersByGroupId) {
    if (groupUsers.length >= 2) {
      // Sort by createdAt to determine primary (first) vs secondary (second)
      groupUsers.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      duoGroups.set(groupId, groupUsers);
    }
  }

  console.log(
    `👥 Found ${duoGroups.size} duo groups (2+ users sharing same Splitwise group)\n`,
  );

  // Track all changes for summary
  const summary: MigrationSummary = {
    totalUsers: users.length,
    duoGroups: duoGroups.size,
    usersUpdated: 0,
    soloUsers: 0,
    dualPrimaryUsers: 0,
    dualSecondaryUsers: 0,
    incompleteOnboarding: 0,
    grandfatheredUsers: 0,
    results: [],
  };

  // Track duo group details for reporting
  const duoGroupDetails: Array<{
    groupId: string;
    primary: UserWithRelations;
    secondaries: UserWithRelations[];
  }> = [];
  for (const [groupId, groupUsers] of duoGroups) {
    // groupUsers is guaranteed to have at least 2 elements (filtered above)
    const [primary, ...secondaries] = groupUsers as [
      UserWithRelations,
      ...UserWithRelations[],
    ];
    duoGroupDetails.push({ groupId, primary, secondaries });
  }

  // Build a set of duo user IDs and their roles
  const duoUserRoles = new Map<
    string,
    { role: "primary" | "secondary"; primaryId: string | null }
  >();
  for (const [, groupUsers] of duoGroups) {
    // groupUsers is guaranteed to have at least 2 elements (filtered above)
    const [primary, ...rest] = groupUsers as [
      UserWithRelations,
      ...UserWithRelations[],
    ];
    duoUserRoles.set(primary.id, { role: "primary", primaryId: null });
    // All other users become secondary to the primary
    for (const secondary of rest) {
      duoUserRoles.set(secondary.id, {
        role: "secondary",
        primaryId: primary.id,
      });
    }
  }

  console.log("─".repeat(64));
  console.log("Processing users...\n");

  // Process each user
  for (const user of users) {
    const result: MigrationResult = {
      userId: user.id,
      email: user.email,
      changes: {},
    };

    // Determine configuration status
    const hasSplitwiseAccount = user.accounts.some(
      (a) => a.provider === "splitwise",
    );
    const hasYnabConfig = !!(
      user.ynabSettings?.budgetId && user.ynabSettings?.splitwiseAccountId
    );
    const hasSplitwiseConfig = !!(
      user.splitwiseSettings?.groupId && user.splitwiseSettings?.currencyCode
    );
    const hasSubscription = !!(
      user.stripeSubscriptionId &&
      (user.subscriptionStatus === "active" ||
        user.subscriptionStatus === "trialing")
    );
    const isFullyConfigured =
      hasSplitwiseAccount && hasYnabConfig && hasSplitwiseConfig;

    // Determine persona and partner relationship
    const duoRole = duoUserRoles.get(user.id);
    let newPersona: string | null = null;
    let newPrimaryUserId: string | null = null;

    if (duoRole) {
      // User is in a duo
      newPersona = "dual";
      if (duoRole.role === "secondary") {
        newPrimaryUserId = duoRole.primaryId;
        summary.dualSecondaryUsers++;
      } else {
        summary.dualPrimaryUsers++;
      }
    } else if (hasSplitwiseConfig) {
      // User has Splitwise group configured but is not in a duo = solo
      // This covers both fully configured users and partially configured users
      // who have already selected a group (legacy users)
      newPersona = "solo";
      summary.soloUsers++;
    }
    // Users without Splitwise config and not in a duo get null persona (need to choose)

    // Determine onboarding step
    // For fully configured users, preserve their current step if already complete
    let newOnboardingStep = 0;
    let newOnboardingComplete = false;

    // Is this user a secondary? (based on what we calculated above)
    const isSecondary = duoRole?.role === "secondary";

    // Grandfathering: Fully configured users are being grandfathered, so they
    // don't need a subscription and should skip the payment step (step 4)
    const willBeGrandfathered = isFullyConfigured;

    if (!hasSplitwiseAccount) {
      // Step 0: Need to connect Splitwise
      newOnboardingStep = 0;
    } else if (!newPersona && !hasSplitwiseConfig && !isSecondary) {
      // Step 1: Splitwise connected, but no group selected yet - needs persona
      // (Secondary users skip this step)
      newOnboardingStep = 1;
    } else if (!hasYnabConfig) {
      // Step 2: Needs YNAB configuration
      newOnboardingStep = 2;
    } else if (!hasSplitwiseConfig) {
      // Step 3: Needs Splitwise group/currency configuration
      newOnboardingStep = 3;
    } else if (!isSecondary && !hasSubscription && !willBeGrandfathered) {
      // Step 4: Solo/primary users need subscription (secondary users and grandfathered users skip)
      newOnboardingStep = 4;
    } else {
      // Fully configured - mark complete and preserve existing step if it was already complete
      newOnboardingComplete = true;
      // Keep their existing step if they were already onboarded, otherwise set to a "done" state
      newOnboardingStep = user.onboardingComplete ? user.onboardingStep : 5;
    }

    if (!newOnboardingComplete) {
      summary.incompleteOnboarding++;
    }

    // Check what needs to be updated
    const needsPersonaUpdate = user.persona !== newPersona;
    const needsStepUpdate = user.onboardingStep !== newOnboardingStep;
    const needsCompleteUpdate =
      user.onboardingComplete !== newOnboardingComplete;
    const needsPrimaryUpdate = user.primaryUserId !== newPrimaryUserId;

    if (needsPersonaUpdate) {
      result.changes.persona = { from: user.persona, to: newPersona };
    }
    if (needsStepUpdate) {
      result.changes.onboardingStep = {
        from: user.onboardingStep,
        to: newOnboardingStep,
      };
    }
    if (needsCompleteUpdate) {
      result.changes.onboardingComplete = {
        from: user.onboardingComplete,
        to: newOnboardingComplete,
      };
    }
    if (needsPrimaryUpdate) {
      result.changes.primaryUserId = {
        from: user.primaryUserId,
        to: newPrimaryUserId,
      };
    }

    // Grandfathering: Mark fully onboarded users as grandfathered (early adopters)
    // This gives them lifetime free access as a thank-you for signing up early
    const shouldBeGrandfathered = newOnboardingComplete;
    const needsGrandfatherUpdate =
      !user.isGrandfathered && shouldBeGrandfathered;

    if (needsGrandfatherUpdate) {
      result.changes.isGrandfathered = { from: false, to: true };
      summary.grandfatheredUsers++;
    }

    const hasChanges = Object.keys(result.changes).length > 0;

    if (hasChanges) {
      summary.usersUpdated++;
      summary.results.push(result);

      // Apply changes if not dry run
      if (!dryRun) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            persona: newPersona,
            onboardingStep: newOnboardingStep,
            onboardingComplete: newOnboardingComplete,
            primaryUserId: newPrimaryUserId,
            ...(needsGrandfatherUpdate && {
              isGrandfathered: true,
              grandfatheredAt: new Date(),
            }),
          },
        });
      }
    }
  }

  // Print detailed results
  printResults(summary, duoGroupDetails, dryRun);
}

function printResults(
  summary: MigrationSummary,
  duoGroupDetails: Array<{
    groupId: string;
    primary: UserWithRelations;
    secondaries: UserWithRelations[];
  }>,
  dryRun: boolean,
) {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log(
    "║                     Migration Summary                       ║",
  );
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  // Overview stats
  console.log("📈 Overview:");
  console.log(`   Total users:              ${summary.totalUsers}`);
  console.log(
    `   Users ${dryRun ? "to be updated" : "updated"}:      ${summary.usersUpdated}`,
  );
  console.log(`   Duo groups found:         ${summary.duoGroups}`);
  console.log();

  // User breakdown
  console.log("👤 User Breakdown:");
  console.log(`   Solo users:               ${summary.soloUsers}`);
  console.log(`   Dual (primary):           ${summary.dualPrimaryUsers}`);
  console.log(`   Dual (secondary):         ${summary.dualSecondaryUsers}`);
  console.log(`   Incomplete onboarding:    ${summary.incompleteOnboarding}`);
  console.log();

  // Grandfathering stats
  if (summary.grandfatheredUsers > 0) {
    console.log("🎁 Grandfathering:");
    console.log(
      `   Users ${dryRun ? "to be grandfathered" : "grandfathered"}: ${summary.grandfatheredUsers}`,
    );
    console.log("   (Fully onboarded users get lifetime free access)");
    console.log();
  }

  // Duo group details (always show if there are duo groups)
  if (duoGroupDetails.length > 0) {
    console.log("─".repeat(64));
    console.log("👥 Duo Relationships:");
    console.log();

    for (const { groupId, primary, secondaries } of duoGroupDetails) {
      console.log(`  Group: ${groupId}`);
      console.log(
        `    Primary:   ${primary.email || primary.id} (created: ${primary.createdAt.toISOString()})`,
      );
      for (const secondary of secondaries) {
        console.log(
          `    Secondary: ${secondary.email || secondary.id} (created: ${secondary.createdAt.toISOString()})`,
        );
      }
      console.log();
    }
  }

  // Detailed changes
  if (summary.results.length > 0) {
    console.log("─".repeat(64));
    console.log("📝 Changes " + (dryRun ? "to be applied:" : "applied:"));
    console.log();

    for (const result of summary.results) {
      const email = result.email || "no email";
      console.log(`  User: ${result.userId}`);
      console.log(`  Email: ${email}`);

      for (const [field, change] of Object.entries(result.changes)) {
        const { from, to } = change as { from: unknown; to: unknown };
        console.log(
          `    ${field}: ${JSON.stringify(from)} → ${JSON.stringify(to)}`,
        );
      }
      console.log();
    }
  } else {
    console.log("✅ No changes needed - all users are already up to date\n");
  }

  // Final status
  console.log("─".repeat(64));
  if (dryRun) {
    console.log("🔍 DRY RUN COMPLETE - Run without --dry-run to apply changes");
  } else {
    console.log("✅ MIGRATION COMPLETE - All changes have been applied");
  }
  console.log();
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
