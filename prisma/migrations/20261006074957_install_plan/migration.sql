-- CreateTable
CREATE TABLE "InstallPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Lắp đặt tại công trình',
    "workerCount" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Chưa bắt đầu',
    "notes" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallPlan_projectId_idx" ON "InstallPlan"("projectId");

-- CreateIndex
CREATE INDEX "InstallPlan_startDate_idx" ON "InstallPlan"("startDate");

-- AddForeignKey
ALTER TABLE "InstallPlan" ADD CONSTRAINT "InstallPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
