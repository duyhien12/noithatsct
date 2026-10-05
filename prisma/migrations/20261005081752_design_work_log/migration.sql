-- CreateTable
CREATE TABLE "DesignWorkLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'Sáng',
    "category" TEXT NOT NULL,
    "projectName" TEXT NOT NULL DEFAULT '',
    "workers" TEXT NOT NULL DEFAULT '[]',
    "note" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignWorkLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignWorkLog_date_idx" ON "DesignWorkLog"("date");
