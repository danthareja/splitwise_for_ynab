-- AlterTable
ALTER TABLE "SyncedItem" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'success';
