import dotenv from "dotenv";
import path from "path";

/**
 * Global teardown for E2E tests.
 * Runs once after all tests to clean up any remaining test data.
 */
async function globalTeardown() {
  // Load environment variables first
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  // Dynamic import after env vars are loaded
  const { prisma } = await import("../db");

  try {
    // Clean up all E2E test users
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: { contains: "@test.local" },
      },
    });

    if (deletedUsers.count > 0) {
      console.log(`✓ Cleaned up ${deletedUsers.count} E2E test user(s)`);
    }
  } catch (error) {
    console.error("E2E global teardown failed:", error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

export default globalTeardown;
