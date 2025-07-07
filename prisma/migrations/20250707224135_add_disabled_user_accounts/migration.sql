-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "disabledReason" TEXT,
ADD COLUMN     "suggestedFix" TEXT;
