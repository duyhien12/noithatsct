-- AlterTable
ALTER TABLE "PayableEntry" ADD COLUMN     "customerId" TEXT;

-- CreateIndex
CREATE INDEX "PayableEntry_customerId_idx" ON "PayableEntry"("customerId");

-- AddForeignKey
ALTER TABLE "PayableEntry" ADD CONSTRAINT "PayableEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "InvDocument_docNumber_key" RENAME TO "InvDocument_code_key";
