import dotenv from "dotenv";
import path from "path";

/**
 * Global setup for E2E tests.
 * Runs once before all tests to ensure database is ready.
 */
async function globalSetup() {
  // Load environment variables first
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  // Dynamic import after env vars are loaded
  const { prisma } = await import("../db");

  try {
    // Verify database connection
    await prisma.$connect();
    console.log("✓ Database connected for E2E tests");

    // Clean up any stale E2E test data from previous runs
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: { contains: "@test.local" },
      },
    });

    if (deletedUsers.count > 0) {
      console.log(`✓ Cleaned up ${deletedUsers.count} stale E2E test user(s)`);
    }
  } catch (error) {
    console.error("E2E global setup failed:", error);
    throw error;
  }
}

export default globalSetup;
