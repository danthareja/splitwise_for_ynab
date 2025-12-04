-- AlterTable
ALTER TABLE "User" ADD COLUMN     "grandfatheredAt" TIMESTAMP(3),
ADD COLUMN     "isGrandfathered" BOOLEAN NOT NULL DEFAULT false;
