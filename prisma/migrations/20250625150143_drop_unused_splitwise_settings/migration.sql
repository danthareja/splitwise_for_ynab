/*
  Warnings:

  - You are about to drop the column `partnerSplitName` on the `SplitwiseSettings` table. All the data in the column will be lost.
  - You are about to drop the column `splitwiseUserId` on the `SplitwiseSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SplitwiseSettings" DROP COLUMN "partnerSplitName",
DROP COLUMN "splitwiseUserId";
