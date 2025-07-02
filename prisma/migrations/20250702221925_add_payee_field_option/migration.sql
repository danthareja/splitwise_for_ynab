-- AlterTable
ALTER TABLE "SplitwiseSettings" ADD COLUMN     "customPayeeName" TEXT,
ADD COLUMN     "useDescriptionAsPayee" BOOLEAN DEFAULT true;
