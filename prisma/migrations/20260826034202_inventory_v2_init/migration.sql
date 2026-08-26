-- CreateTable
CREATE TABLE "InvUnit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvMaterialCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skuPrefix" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvMaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvWarehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'Kho chính',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvLocation" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'SHELF',
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvMaterial" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "colorCode" TEXT NOT NULL DEFAULT '',
    "specNote" TEXT NOT NULL DEFAULT '',
    "length" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thickness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimensionUnit" TEXT NOT NULL DEFAULT 'mm',
    "purchaseUnitId" TEXT NOT NULL,
    "stockUnitId" TEXT NOT NULL,
    "issueUnitId" TEXT NOT NULL,
    "purchaseToStockRatio" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "issueToStockRatio" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "defaultSupplierId" TEXT,
    "defaultWarehouseId" TEXT,
    "defaultLocationId" TEXT,
    "minStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastImportPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "image" TEXT NOT NULL DEFAULT '',
    "qrCodeValue" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Đang sử dụng',
    "notes" TEXT NOT NULL DEFAULT '',
    "legacyProductId" TEXT,
    "createdById" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvDocument" (
    "id" TEXT NOT NULL,
    "docNumber" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "docDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warehouseId" TEXT NOT NULL,
    "targetWarehouseId" TEXT,
    "supplierId" TEXT,
    "projectId" TEXT,
    "mfgOrderId" TEXT,
    "scheduleTaskId" TEXT,
    "delivererName" TEXT NOT NULL DEFAULT '',
    "receiverName" TEXT NOT NULL DEFAULT '',
    "departmentReceiving" TEXT NOT NULL DEFAULT '',
    "employeeReceivingId" TEXT NOT NULL DEFAULT '',
    "sourceDocumentId" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL DEFAULT '',
    "submittedById" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "cancelledById" TEXT NOT NULL DEFAULT '',
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvDocumentLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL DEFAULT 0,
    "materialId" TEXT NOT NULL,
    "locationId" TEXT,
    "targetLocationId" TEXT,
    "enteredQuantity" DOUBLE PRECISION NOT NULL,
    "enteredUnitId" TEXT NOT NULL,
    "ratioToStockUsed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCostAtPosting" DOUBLE PRECISION,
    "remnantId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvStockLedger" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "documentId" TEXT NOT NULL,
    "documentLineId" TEXT,
    "direction" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCostAtPosting" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceQtyAfter" DOUBLE PRECISION NOT NULL,
    "balanceAvgCostAfter" DOUBLE PRECISION NOT NULL,
    "postedById" TEXT NOT NULL DEFAULT '',
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversalOfLedgerId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvStockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvStockBalance" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "onHandQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastInDate" TIMESTAMP(3),
    "lastOutDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvStockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvStockReservation" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "projectId" TEXT,
    "mfgOrderId" TEXT,
    "scheduleTaskId" TEXT,
    "documentId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reservedById" TEXT NOT NULL DEFAULT '',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedById" TEXT NOT NULL DEFAULT '',
    "releasedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "InvStockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvMaterialRemnant" (
    "id" TEXT NOT NULL,
    "remnantCode" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "parentMaterialId" TEXT NOT NULL,
    "sourceProjectId" TEXT,
    "sourceDocumentId" TEXT,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "thickness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usableAreaM2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warehouseId" TEXT NOT NULL,
    "locationId" TEXT,
    "photo" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'USABLE',
    "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvMaterialRemnant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvStocktake" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "scopeCategoryId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "countDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedById" TEXT NOT NULL DEFAULT '',
    "approvedById" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvStocktake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvStocktakeLine" (
    "id" TEXT NOT NULL,
    "stocktakeId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "locationId" TEXT,
    "systemQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "countedQty" DOUBLE PRECISION,
    "varianceQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "varianceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolutionNote" TEXT NOT NULL DEFAULT '',
    "countedById" TEXT NOT NULL DEFAULT '',
    "countedAt" TIMESTAMP(3),

    CONSTRAINT "InvStocktakeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvAuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL DEFAULT '',
    "toStatus" TEXT NOT NULL DEFAULT '',
    "byUserId" TEXT NOT NULL DEFAULT '',
    "byUserName" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvAttachment" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentId" TEXT,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "uploadedById" TEXT NOT NULL DEFAULT '',
    "uploadedByName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvMigrationMapping" (
    "id" TEXT NOT NULL,
    "legacyProductId" TEXT NOT NULL,
    "legacyWarehouseId" TEXT,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "targetMaterialId" TEXT,
    "targetWarehouseId" TEXT,
    "duplicateOfMaterialId" TEXT,
    "reconciledOpeningQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reconciledOpeningValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "confirmedById" TEXT NOT NULL DEFAULT '',
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvMigrationMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvUnit_code_key" ON "InvUnit"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InvMaterialCategory_code_key" ON "InvMaterialCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InvMaterialCategory_skuPrefix_key" ON "InvMaterialCategory"("skuPrefix");

-- CreateIndex
CREATE INDEX "InvMaterialCategory_parentId_idx" ON "InvMaterialCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "InvWarehouse_code_key" ON "InvWarehouse"("code");

-- CreateIndex
CREATE INDEX "InvWarehouse_active_idx" ON "InvWarehouse"("active");

-- CreateIndex
CREATE INDEX "InvLocation_parentId_idx" ON "InvLocation"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "InvLocation_warehouseId_code_key" ON "InvLocation"("warehouseId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "InvMaterial_sku_key" ON "InvMaterial"("sku");

-- CreateIndex
CREATE INDEX "InvMaterial_categoryId_idx" ON "InvMaterial"("categoryId");

-- CreateIndex
CREATE INDEX "InvMaterial_status_idx" ON "InvMaterial"("status");

-- CreateIndex
CREATE INDEX "InvMaterial_name_idx" ON "InvMaterial"("name");

-- CreateIndex
CREATE INDEX "InvMaterial_legacyProductId_idx" ON "InvMaterial"("legacyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "InvDocument_docNumber_key" ON "InvDocument"("docNumber");

-- CreateIndex
CREATE INDEX "InvDocument_docType_idx" ON "InvDocument"("docType");

-- CreateIndex
CREATE INDEX "InvDocument_status_idx" ON "InvDocument"("status");

-- CreateIndex
CREATE INDEX "InvDocument_warehouseId_idx" ON "InvDocument"("warehouseId");

-- CreateIndex
CREATE INDEX "InvDocument_projectId_idx" ON "InvDocument"("projectId");

-- CreateIndex
CREATE INDEX "InvDocument_mfgOrderId_idx" ON "InvDocument"("mfgOrderId");

-- CreateIndex
CREATE INDEX "InvDocument_docDate_idx" ON "InvDocument"("docDate");

-- CreateIndex
CREATE INDEX "InvDocumentLine_documentId_idx" ON "InvDocumentLine"("documentId");

-- CreateIndex
CREATE INDEX "InvDocumentLine_materialId_idx" ON "InvDocumentLine"("materialId");

-- CreateIndex
CREATE INDEX "InvStockLedger_materialId_warehouseId_idx" ON "InvStockLedger"("materialId", "warehouseId");

-- CreateIndex
CREATE INDEX "InvStockLedger_documentId_idx" ON "InvStockLedger"("documentId");

-- CreateIndex
CREATE INDEX "InvStockLedger_postedAt_idx" ON "InvStockLedger"("postedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvStockBalance_materialId_warehouseId_key" ON "InvStockBalance"("materialId", "warehouseId");

-- CreateIndex
CREATE INDEX "InvStockReservation_materialId_warehouseId_status_idx" ON "InvStockReservation"("materialId", "warehouseId", "status");

-- CreateIndex
CREATE INDEX "InvStockReservation_projectId_idx" ON "InvStockReservation"("projectId");

-- CreateIndex
CREATE INDEX "InvStockReservation_mfgOrderId_idx" ON "InvStockReservation"("mfgOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "InvMaterialRemnant_remnantCode_key" ON "InvMaterialRemnant"("remnantCode");

-- CreateIndex
CREATE INDEX "InvMaterialRemnant_parentMaterialId_idx" ON "InvMaterialRemnant"("parentMaterialId");

-- CreateIndex
CREATE INDEX "InvMaterialRemnant_status_idx" ON "InvMaterialRemnant"("status");

-- CreateIndex
CREATE INDEX "InvMaterialRemnant_sourceProjectId_idx" ON "InvMaterialRemnant"("sourceProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "InvStocktake_code_key" ON "InvStocktake"("code");

-- CreateIndex
CREATE INDEX "InvStocktake_warehouseId_idx" ON "InvStocktake"("warehouseId");

-- CreateIndex
CREATE INDEX "InvStocktake_status_idx" ON "InvStocktake"("status");

-- CreateIndex
CREATE INDEX "InvStocktakeLine_stocktakeId_idx" ON "InvStocktakeLine"("stocktakeId");

-- CreateIndex
CREATE INDEX "InvStocktakeLine_materialId_idx" ON "InvStocktakeLine"("materialId");

-- CreateIndex
CREATE INDEX "InvAuditLog_entityType_entityId_idx" ON "InvAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "InvAuditLog_createdAt_idx" ON "InvAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "InvAttachment_entityType_entityId_idx" ON "InvAttachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "InvMigrationMapping_status_idx" ON "InvMigrationMapping"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InvMigrationMapping_legacyProductId_legacyWarehouseId_key" ON "InvMigrationMapping"("legacyProductId", "legacyWarehouseId");

-- AddForeignKey
ALTER TABLE "InvMaterialCategory" ADD CONSTRAINT "InvMaterialCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "InvMaterialCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvLocation" ADD CONSTRAINT "InvLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InvWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvLocation" ADD CONSTRAINT "InvLocation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "InvLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterial" ADD CONSTRAINT "InvMaterial_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InvMaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterial" ADD CONSTRAINT "InvMaterial_purchaseUnitId_fkey" FOREIGN KEY ("purchaseUnitId") REFERENCES "InvUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterial" ADD CONSTRAINT "InvMaterial_stockUnitId_fkey" FOREIGN KEY ("stockUnitId") REFERENCES "InvUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterial" ADD CONSTRAINT "InvMaterial_issueUnitId_fkey" FOREIGN KEY ("issueUnitId") REFERENCES "InvUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterial" ADD CONSTRAINT "InvMaterial_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterial" ADD CONSTRAINT "InvMaterial_defaultWarehouseId_fkey" FOREIGN KEY ("defaultWarehouseId") REFERENCES "InvWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterial" ADD CONSTRAINT "InvMaterial_defaultLocationId_fkey" FOREIGN KEY ("defaultLocationId") REFERENCES "InvLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocument" ADD CONSTRAINT "InvDocument_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InvWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocument" ADD CONSTRAINT "InvDocument_targetWarehouseId_fkey" FOREIGN KEY ("targetWarehouseId") REFERENCES "InvWarehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocument" ADD CONSTRAINT "InvDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocument" ADD CONSTRAINT "InvDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocument" ADD CONSTRAINT "InvDocument_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocument" ADD CONSTRAINT "InvDocument_scheduleTaskId_fkey" FOREIGN KEY ("scheduleTaskId") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocument" ADD CONSTRAINT "InvDocument_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "InvDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocumentLine" ADD CONSTRAINT "InvDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InvDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocumentLine" ADD CONSTRAINT "InvDocumentLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InvMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvDocumentLine" ADD CONSTRAINT "InvDocumentLine_enteredUnitId_fkey" FOREIGN KEY ("enteredUnitId") REFERENCES "InvUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockLedger" ADD CONSTRAINT "InvStockLedger_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InvMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockLedger" ADD CONSTRAINT "InvStockLedger_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InvWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockLedger" ADD CONSTRAINT "InvStockLedger_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InvLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockLedger" ADD CONSTRAINT "InvStockLedger_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InvDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockBalance" ADD CONSTRAINT "InvStockBalance_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InvMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockBalance" ADD CONSTRAINT "InvStockBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InvWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockReservation" ADD CONSTRAINT "InvStockReservation_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InvMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockReservation" ADD CONSTRAINT "InvStockReservation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InvWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockReservation" ADD CONSTRAINT "InvStockReservation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockReservation" ADD CONSTRAINT "InvStockReservation_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockReservation" ADD CONSTRAINT "InvStockReservation_scheduleTaskId_fkey" FOREIGN KEY ("scheduleTaskId") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStockReservation" ADD CONSTRAINT "InvStockReservation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InvDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterialRemnant" ADD CONSTRAINT "InvMaterialRemnant_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InvMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterialRemnant" ADD CONSTRAINT "InvMaterialRemnant_parentMaterialId_fkey" FOREIGN KEY ("parentMaterialId") REFERENCES "InvMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterialRemnant" ADD CONSTRAINT "InvMaterialRemnant_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterialRemnant" ADD CONSTRAINT "InvMaterialRemnant_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InvWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMaterialRemnant" ADD CONSTRAINT "InvMaterialRemnant_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InvLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStocktake" ADD CONSTRAINT "InvStocktake_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InvWarehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStocktakeLine" ADD CONSTRAINT "InvStocktakeLine_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "InvStocktake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvStocktakeLine" ADD CONSTRAINT "InvStocktakeLine_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "InvMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvAttachment" ADD CONSTRAINT "InvAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InvDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMigrationMapping" ADD CONSTRAINT "InvMigrationMapping_targetMaterialId_fkey" FOREIGN KEY ("targetMaterialId") REFERENCES "InvMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvMigrationMapping" ADD CONSTRAINT "InvMigrationMapping_duplicateOfMaterialId_fkey" FOREIGN KEY ("duplicateOfMaterialId") REFERENCES "InvMaterial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
