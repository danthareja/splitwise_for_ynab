-- AlterTable
ALTER TABLE "SplitwiseSettings" ADD COLUMN     "defaultSplitRatio" TEXT DEFAULT '1:1',
ADD COLUMN     "partnerSplitName" TEXT,
ADD COLUMN     "splitwiseUserId" TEXT;
