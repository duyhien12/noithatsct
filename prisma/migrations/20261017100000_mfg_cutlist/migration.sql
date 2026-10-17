-- CreateTable
CREATE TABLE "MfgCutlist" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "drawingRef" TEXT NOT NULL DEFAULT '',
    "drawingRevision" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "wastePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purGramPerMeter" DOUBLE PRECISION,
    "note" TEXT NOT NULL DEFAULT '',
    "previousId" TEXT,
    "checkedById" TEXT NOT NULL DEFAULT '',
    "checkedByName" TEXT NOT NULL DEFAULT '',
    "checkedAt" TIMESTAMP(3),
    "approvedById" TEXT NOT NULL DEFAULT '',
    "approvedByName" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfgCutlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgCutlistLine" (
    "id" TEXT NOT NULL,
    "cutlistId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "lineType" TEXT NOT NULL DEFAULT 'PANEL',
    "mfgItemId" TEXT,
    "productName" TEXT NOT NULL DEFAULT '',
    "partName" TEXT NOT NULL DEFAULT '',
    "materialId" TEXT,
    "materialText" TEXT NOT NULL DEFAULT '',
    "length" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thickness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '',
    "grainLocked" BOOLEAN NOT NULL DEFAULT false,
    "edgeMaterialId" TEXT,
    "edgeL1" BOOLEAN NOT NULL DEFAULT false,
    "edgeL2" BOOLEAN NOT NULL DEFAULT false,
    "edgeW1" BOOLEAN NOT NULL DEFAULT false,
    "edgeW2" BOOLEAN NOT NULL DEFAULT false,
    "drawingPage" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "MfgCutlistLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MfgCutlist_code_key" ON "MfgCutlist"("code");

-- CreateIndex
CREATE INDEX "MfgCutlist_mfgOrderId_idx" ON "MfgCutlist"("mfgOrderId");

-- CreateIndex
CREATE INDEX "MfgCutlist_projectId_idx" ON "MfgCutlist"("projectId");

-- CreateIndex
CREATE INDEX "MfgCutlist_status_idx" ON "MfgCutlist"("status");

-- CreateIndex
CREATE INDEX "MfgCutlistLine_cutlistId_idx" ON "MfgCutlistLine"("cutlistId");

-- CreateIndex
CREATE INDEX "MfgCutlistLine_materialId_idx" ON "MfgCutlistLine"("materialId");

-- AddForeignKey
ALTER TABLE "MfgCutlist" ADD CONSTRAINT "MfgCutlist_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgCutlist" ADD CONSTRAINT "MfgCutlist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgCutlistLine" ADD CONSTRAINT "MfgCutlistLine_cutlistId_fkey" FOREIGN KEY ("cutlistId") REFERENCES "MfgCutlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgCutlistLine" ADD CONSTRAINT "MfgCutlistLine_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgCutlistLine" ADD CONSTRAINT "MfgCutlistLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InvMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgCutlistLine" ADD CONSTRAINT "MfgCutlistLine_edgeMaterialId_fkey" FOREIGN KEY ("edgeMaterialId") REFERENCES "InvMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

