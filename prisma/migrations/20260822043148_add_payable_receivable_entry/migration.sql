-- CreateTable
CREATE TABLE "PayableEntry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivableEntry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL DEFAULT '',
    "contractId" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayableEntry_code_key" ON "PayableEntry"("code");

-- CreateIndex
CREATE INDEX "PayableEntry_supplierId_idx" ON "PayableEntry"("supplierId");

-- CreateIndex
CREATE INDEX "PayableEntry_projectId_idx" ON "PayableEntry"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivableEntry_code_key" ON "ReceivableEntry"("code");

-- CreateIndex
CREATE INDEX "ReceivableEntry_customerId_idx" ON "ReceivableEntry"("customerId");

-- CreateIndex
CREATE INDEX "ReceivableEntry_contractId_idx" ON "ReceivableEntry"("contractId");

-- AddForeignKey
ALTER TABLE "PayableEntry" ADD CONSTRAINT "PayableEntry_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayableEntry" ADD CONSTRAINT "PayableEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableEntry" ADD CONSTRAINT "ReceivableEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableEntry" ADD CONSTRAINT "ReceivableEntry_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
