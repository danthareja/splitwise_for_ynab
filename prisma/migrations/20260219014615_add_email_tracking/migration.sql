-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingStepReachedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailSend" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "emailKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailUnsubscribe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailUnsubscribe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSend_userId_category_idx" ON "EmailSend"("userId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "EmailUnsubscribe_userId_category_key" ON "EmailUnsubscribe"("userId", "category");

-- AddForeignKey
ALTER TABLE "EmailSend" ADD CONSTRAINT "EmailSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailUnsubscribe" ADD CONSTRAINT "EmailUnsubscribe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: set onboardingStepReachedAt to NOW() for existing stalled users
-- so they start the drip campaign on the normal 1/3/7 day cadence
UPDATE "User"
SET "onboardingStepReachedAt" = NOW()
WHERE "onboardingComplete" = false
  AND "email" IS NOT NULL
  AND "onboardingStepReachedAt" IS NULL;
