-- AlterTable
ALTER TABLE "PurchaseOrder" ADD COLUMN     "paymentDueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "openingPayableBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
