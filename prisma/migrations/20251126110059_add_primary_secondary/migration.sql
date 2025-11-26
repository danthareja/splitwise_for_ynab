-- AlterTable
ALTER TABLE "User" ADD COLUMN "primaryUserId" TEXT,
ADD COLUMN "splitwiseUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_primaryUserId_key" ON "User"("primaryUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
