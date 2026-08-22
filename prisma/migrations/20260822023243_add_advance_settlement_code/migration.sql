-- AlterTable (AdvanceSettlement is brand new/empty, safe to add NOT NULL without default)
ALTER TABLE "AdvanceSettlement" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AdvanceSettlement_code_key" ON "AdvanceSettlement"("code");
