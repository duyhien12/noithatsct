-- AlterTable
ALTER TABLE "DesignOrder" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "acceptedBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "handedOverAt" TIMESTAMP(3),
ADD COLUMN     "handedOverBy" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "handoverFiles" JSONB DEFAULT '[]',
ADD COLUMN     "handoverNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "revenueAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "revenueMonth" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "DesignOrderDesigner" (
    "id" TEXT NOT NULL,
    "designOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT '',
    "sharePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "DesignOrderDesigner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignOrderLog" (
    "id" TEXT NOT NULL,
    "designOrderId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "userName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DesignOrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignOrderDesigner_userId_idx" ON "DesignOrderDesigner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignOrderDesigner_designOrderId_userId_key" ON "DesignOrderDesigner"("designOrderId", "userId");

-- CreateIndex
CREATE INDEX "DesignOrderLog_designOrderId_idx" ON "DesignOrderLog"("designOrderId");

-- CreateIndex
CREATE INDEX "DesignOrder_revenueMonth_idx" ON "DesignOrder"("revenueMonth");

-- AddForeignKey
ALTER TABLE "DesignOrderDesigner" ADD CONSTRAINT "DesignOrderDesigner_designOrderId_fkey" FOREIGN KEY ("designOrderId") REFERENCES "DesignOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrderLog" ADD CONSTRAINT "DesignOrderLog_designOrderId_fkey" FOREIGN KEY ("designOrderId") REFERENCES "DesignOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

