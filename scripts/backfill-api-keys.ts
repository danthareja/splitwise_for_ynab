import "dotenv/config";
import { prisma } from "../db";
import { generateApiKey } from "../services/api-key";

async function main() {
  const resetAll = process.argv.includes("--reset");

  if (resetAll) {
    console.log("Reset flag detected – regenerating API keys for ALL users\n");
  }

  const usersWithoutKey = await prisma.user.findMany({
    where: resetAll ? {} : { apiKey: { equals: null } },
    select: { id: true },
  });

  console.log(
    `Found ${usersWithoutKey.length} users ${resetAll ? "to reset" : "without apiKey"}`,
  );

  for (const { id } of usersWithoutKey) {
    const key = generateApiKey();
    await prisma.user.update({
      where: { id },
      data: { apiKey: key },
    });
    console.log(`${resetAll ? "Reset" : "Set"} apiKey for user ${id}`);
  }

  console.log("Backfill complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
