-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "customerIssueId" TEXT;

-- CreateTable
CREATE TABLE "CustomerIssue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT '',
    "reporterName" TEXT NOT NULL DEFAULT '',
    "reporterPhone" TEXT NOT NULL DEFAULT '',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "assigneeId" TEXT,
    "assigneeName" TEXT NOT NULL DEFAULT '',
    "resolution" TEXT NOT NULL DEFAULT '',
    "statusReason" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT NOT NULL DEFAULT '',
    "confirmedByName" TEXT NOT NULL DEFAULT '',
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdByName" TEXT NOT NULL DEFAULT '',
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerIssueCollaborator" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT '',
    "addedById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerIssueCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerIssueAttachment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "uploadedById" TEXT NOT NULL DEFAULT '',
    "uploadedByName" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerIssueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerIssueLog" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "meta" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerIssueLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerIssue_code_key" ON "CustomerIssue"("code");

-- CreateIndex
CREATE INDEX "CustomerIssue_customerId_idx" ON "CustomerIssue"("customerId");

-- CreateIndex
CREATE INDEX "CustomerIssue_projectId_idx" ON "CustomerIssue"("projectId");

-- CreateIndex
CREATE INDEX "CustomerIssue_status_idx" ON "CustomerIssue"("status");

-- CreateIndex
CREATE INDEX "CustomerIssue_assigneeId_idx" ON "CustomerIssue"("assigneeId");

-- CreateIndex
CREATE INDEX "CustomerIssue_dueDate_idx" ON "CustomerIssue"("dueDate");

-- CreateIndex
CREATE INDEX "CustomerIssue_lastActivityAt_idx" ON "CustomerIssue"("lastActivityAt");

-- CreateIndex
CREATE INDEX "CustomerIssueCollaborator_userId_idx" ON "CustomerIssueCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerIssueCollaborator_issueId_userId_key" ON "CustomerIssueCollaborator"("issueId", "userId");

-- CreateIndex
CREATE INDEX "CustomerIssueAttachment_issueId_category_idx" ON "CustomerIssueAttachment"("issueId", "category");

-- CreateIndex
CREATE INDEX "CustomerIssueLog_issueId_createdAt_idx" ON "CustomerIssueLog"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkOrder_customerIssueId_idx" ON "WorkOrder"("customerIssueId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerIssueId_fkey" FOREIGN KEY ("customerIssueId") REFERENCES "CustomerIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIssue" ADD CONSTRAINT "CustomerIssue_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIssue" ADD CONSTRAINT "CustomerIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIssueCollaborator" ADD CONSTRAINT "CustomerIssueCollaborator_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "CustomerIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIssueAttachment" ADD CONSTRAINT "CustomerIssueAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "CustomerIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerIssueLog" ADD CONSTRAINT "CustomerIssueLog_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "CustomerIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
