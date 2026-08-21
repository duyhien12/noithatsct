-- AlterTable
ALTER TABLE "CashFund" ADD COLUMN     "accountingAccountId" TEXT;

-- AlterTable
ALTER TABLE "FinanceTransaction" ADD COLUMN     "transferGroupId" TEXT;

-- CreateIndex
CREATE INDEX "CashFund_accountingAccountId_idx" ON "CashFund"("accountingAccountId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_transferGroupId_idx" ON "FinanceTransaction"("transferGroupId");

-- AddForeignKey
ALTER TABLE "CashFund" ADD CONSTRAINT "CashFund_accountingAccountId_fkey" FOREIGN KEY ("accountingAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
