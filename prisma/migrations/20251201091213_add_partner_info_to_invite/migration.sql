-- AlterTable
ALTER TABLE "PartnerInvite" ADD COLUMN     "emailReminderCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "partnerEmail" TEXT,
ADD COLUMN     "partnerName" TEXT;
