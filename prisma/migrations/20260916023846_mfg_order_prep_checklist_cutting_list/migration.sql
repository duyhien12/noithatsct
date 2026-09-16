-- AlterTable
ALTER TABLE "MfgOrder" ADD COLUMN     "cuttingList" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "prepChecklist" TEXT NOT NULL DEFAULT '[]';
