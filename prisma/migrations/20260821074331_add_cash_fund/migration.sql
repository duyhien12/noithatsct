-- AlterTable
ALTER TABLE "CashReconciliation" ADD COLUMN     "cashFundId" TEXT;

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "cashFundId" TEXT;

-- CreateTable
CREATE TABLE "CashFund" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashReconciliation_cashFundId_idx" ON "CashReconciliation"("cashFundId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_cashFundId_idx" ON "FinanceTransaction"("cashFundId");

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_cashFundId_fkey" FOREIGN KEY ("cashFundId") REFERENCES "CashFund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_cashFundId_fkey" FOREIGN KEY ("cashFundId") REFERENCES "CashFund"("id") ON DELETE SET NULL ON UPDATE CASCADE;
