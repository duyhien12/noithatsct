-- AlterTable
ALTER TABLE "FinanceCategory" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "FinanceCategory_parentId_idx" ON "FinanceCategory"("parentId");

-- AddForeignKey
ALTER TABLE "FinanceCategory" ADD CONSTRAINT "FinanceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
