-- AlterTable
ALTER TABLE "PayableEntry" ADD COLUMN     "attachments" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "ReceivableEntry" ADD COLUMN     "attachments" JSONB DEFAULT '[]';
