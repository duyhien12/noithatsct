-- CreateTable
CREATE TABLE "DesignJournal" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "projectName" TEXT NOT NULL DEFAULT '',
    "executorName" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignJournal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignJournal_executorName_idx" ON "DesignJournal"("executorName");

-- CreateIndex
CREATE INDEX "DesignJournal_startDate_idx" ON "DesignJournal"("startDate");
