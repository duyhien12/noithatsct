-- CreateTable
CREATE TABLE "LessonLearned" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT,
    "projectName" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT,
    "customerName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Khác',
    "severity" TEXT NOT NULL DEFAULT 'Trung bình',
    "issueContent" TEXT NOT NULL,
    "cause" TEXT NOT NULL DEFAULT '',
    "solution" TEXT NOT NULL DEFAULT '',
    "prevention" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "assignee" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Đang xử lý',
    "attachments" JSONB DEFAULT '[]',
    "history" JSONB DEFAULT '[]',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdByRole" TEXT NOT NULL DEFAULT '',
    "confirmedBy" TEXT NOT NULL DEFAULT '',
    "confirmedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonLearned_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonLearned_code_key" ON "LessonLearned"("code");

-- CreateIndex
CREATE INDEX "LessonLearned_projectId_idx" ON "LessonLearned"("projectId");

-- CreateIndex
CREATE INDEX "LessonLearned_customerId_idx" ON "LessonLearned"("customerId");

-- CreateIndex
CREATE INDEX "LessonLearned_status_idx" ON "LessonLearned"("status");

-- CreateIndex
CREATE INDEX "LessonLearned_category_idx" ON "LessonLearned"("category");

-- CreateIndex
CREATE INDEX "LessonLearned_severity_idx" ON "LessonLearned"("severity");

-- CreateIndex
CREATE INDEX "LessonLearned_occurredAt_idx" ON "LessonLearned"("occurredAt");

-- AddForeignKey
ALTER TABLE "LessonLearned" ADD CONSTRAINT "LessonLearned_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLearned" ADD CONSTRAINT "LessonLearned_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

