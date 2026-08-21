-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "splitGroupId" TEXT;

-- CreateIndex
CREATE INDEX "FinanceTransaction_splitGroupId_idx" ON "FinanceTransaction"("splitGroupId");
