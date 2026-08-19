-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ky_thuat',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "zaloUserId" TEXT NOT NULL DEFAULT '',
    "allowedRoles" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'Cá nhân',
    "status" TEXT NOT NULL DEFAULT 'Lead',
    "taxCode" TEXT NOT NULL DEFAULT '',
    "representative" TEXT NOT NULL DEFAULT '',
    "birthday" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gender" TEXT NOT NULL DEFAULT 'Nam',
    "projectAddress" TEXT NOT NULL DEFAULT '',
    "projectName" TEXT NOT NULL DEFAULT '',
    "salesPerson" TEXT NOT NULL DEFAULT '',
    "designer" TEXT NOT NULL DEFAULT '',
    "contactPerson2" TEXT NOT NULL DEFAULT '',
    "phone2" TEXT NOT NULL DEFAULT '',
    "pipelineStage" TEXT NOT NULL DEFAULT 'Lead',
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "estimatedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextFollowUp" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "lastContactAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByRole" TEXT NOT NULL DEFAULT '',
    "processData" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT 'HQ',
    "demand" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "area" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "constructionStatus" TEXT NOT NULL DEFAULT '',
    "decisionMaker" TEXT NOT NULL DEFAULT '',
    "specialRequest" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "area" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "floors" INTEGER NOT NULL DEFAULT 0,
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contractValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Khảo sát',
    "phase" TEXT NOT NULL DEFAULT '',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "manager" TEXT NOT NULL DEFAULT '',
    "designer" TEXT NOT NULL DEFAULT '',
    "supervisor" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "budgetStatus" TEXT NOT NULL DEFAULT 'draft',
    "budgetLockedAt" TIMESTAMP(3),
    "budgetLockedBy" TEXT NOT NULL DEFAULT '',
    "budgetTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetEstimateData" JSONB,
    "createdByRole" TEXT NOT NULL DEFAULT '',
    "frontPhotos" JSONB,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "routeNotes" TEXT NOT NULL DEFAULT '',
    "siteContact" TEXT NOT NULL DEFAULT '',
    "siteContactPhone" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "importPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "supplier" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "dimensions" TEXT NOT NULL DEFAULT '',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '',
    "material" TEXT NOT NULL DEFAULT '',
    "origin" TEXT NOT NULL DEFAULT '',
    "warranty" TEXT NOT NULL DEFAULT '',
    "brand" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Đang bán',
    "supplyType" TEXT NOT NULL DEFAULT 'Vật tư lưu kho',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "coreBoard" TEXT NOT NULL DEFAULT '',
    "surfaceCode" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Nháp',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'Thi công',
    "directCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "managementFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "managementFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "designFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adjustmentType" TEXT NOT NULL DEFAULT 'amount',
    "adjustmentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" JSONB DEFAULT '[]',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentSchedule" JSONB DEFAULT '[]',
    "promoText" TEXT NOT NULL DEFAULT '',
    "terms" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB DEFAULT '[]',

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quotationId" TEXT NOT NULL,
    "sharedUnit" TEXT NOT NULL DEFAULT 'trọn gói',
    "sharedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sharedUnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mainMaterial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "auxMaterial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "length" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "image" TEXT NOT NULL DEFAULT '',
    "productId" TEXT,
    "parentItemId" TEXT,
    "quotationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "mergedWithPrev" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "customerName" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL DEFAULT '',
    "siteAddress" TEXT NOT NULL DEFAULT '',
    "projectType" TEXT NOT NULL DEFAULT 'Nhà phố',
    "designArea" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "designStyle" TEXT NOT NULL DEFAULT '',
    "requirementLevel" TEXT NOT NULL DEFAULT 'Tiêu chuẩn',
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3) NOT NULL,
    "confirmedDeadline" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "attachments" JSONB DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'Nháp',
    "designerAssignee" TEXT NOT NULL DEFAULT '',
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountType" TEXT NOT NULL DEFAULT 'amount',
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAfterDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdByRole" TEXT NOT NULL DEFAULT '',
    "salesApprovedBy" TEXT NOT NULL DEFAULT '',
    "salesApprovedAt" TIMESTAMP(3),
    "designConfirmedBy" TEXT NOT NULL DEFAULT '',
    "designConfirmedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignOrderItem" (
    "id" TEXT NOT NULL,
    "designOrderId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "DesignOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignTask" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "executorName" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Việc cần làm',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignTask_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "DesignPriceListItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "defaultUnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignPriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "images" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Đang làm',
    "joinDate" TIMESTAMP(3),
    "departmentId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "birthDate" TIMESTAMP(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEmployee" (
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "ProjectEmployee_pkey" PRIMARY KEY ("projectId","employeeId")
);

-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "taxCode" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT NOT NULL DEFAULT '',
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT '',
    "advanceAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPayment" (
    "id" TEXT NOT NULL,
    "contractAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_technical',
    "phase" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "attachments" JSONB,
    "retentionRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "retentionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retentionReleased" BOOLEAN NOT NULL DEFAULT false,
    "contractorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorPaymentItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contractorPaymentId" TEXT NOT NULL,

    CONSTRAINT "ContractorPaymentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Vật tư xây dựng',
    "contact" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "taxCode" TEXT NOT NULL DEFAULT '',
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "bankName" TEXT NOT NULL DEFAULT '',
    "rating" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT NOT NULL DEFAULT '',
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Chưa bắt đầu',
    "order" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectBudget" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "budgetAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Thi công',
    "contractValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variationAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Nháp',
    "signDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "quotationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractPayment" (
    "id" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'Hợp đồng',
    "status" TEXT NOT NULL DEFAULT 'Chưa thu',
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "proofUrl" TEXT NOT NULL DEFAULT '',
    "contractId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'Trung bình',
    "status" TEXT NOT NULL DEFAULT 'Chờ xử lý',
    "assignee" TEXT NOT NULL DEFAULT '',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "category" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceLogId" TEXT,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderCheckin" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "checkinAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkoutAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "WorkOrderCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderPhoto" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'evidence',
    "uploadedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderQCItem" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT NOT NULL DEFAULT '',
    "checkedBy" TEXT NOT NULL DEFAULT '',
    "checkedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkOrderQCItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderStageLog" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrderStageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPlan" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Chưa đặt',
    "type" TEXT NOT NULL DEFAULT 'Chính',
    "category" TEXT NOT NULL DEFAULT '',
    "budgetUnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastePercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "costType" TEXT NOT NULL DEFAULT 'Vật tư',
    "group1" TEXT NOT NULL DEFAULT '',
    "group2" TEXT NOT NULL DEFAULT '',
    "drawingUrl" TEXT NOT NULL DEFAULT '',
    "drawingNote" TEXT NOT NULL DEFAULT '',
    "supplierTag" TEXT NOT NULL DEFAULT '',
    "productId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "planType" TEXT NOT NULL DEFAULT 'tracking',
    "customName" TEXT NOT NULL DEFAULT '',
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '',
    "actualQty" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "MaterialPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionCostItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL DEFAULT '',
    "groupOrder" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL DEFAULT '',
    "productCode" TEXT NOT NULL DEFAULT '',
    "spec" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimLength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimWidth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimHeight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dimTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "autoPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "ProductionCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetChangeOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "materialPlanId" TEXT,
    "reason" TEXT NOT NULL,
    "oldQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oldPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetChangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequisition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "requestedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requestedDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Chờ xử lý',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "materialPlanId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Chờ duyệt',
    "deliveryType" TEXT NOT NULL DEFAULT 'Giao thẳng dự án',
    "deliveryAddress" TEXT NOT NULL DEFAULT '',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByRole" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "productId" TEXT,
    "materialPlanId" TEXT,
    "purchaseOrderId" TEXT NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectExpense" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL DEFAULT 'Dự án',
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'Khác',
    "status" TEXT NOT NULL DEFAULT 'Chờ duyệt',
    "submittedBy" TEXT NOT NULL DEFAULT '',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "proofUrl" TEXT NOT NULL DEFAULT '',
    "recipientType" TEXT NOT NULL DEFAULT '',
    "recipientId" TEXT NOT NULL DEFAULT '',
    "recipientName" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "fundSource" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'Thường',

    CONSTRAINT "ProjectExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingLog" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Ghi chú',
    "contactMethod" TEXT NOT NULL DEFAULT '',
    "nextFollowUp" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "customerId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'Khác',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "fileUrl" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "space" TEXT NOT NULL DEFAULT '',
    "uploadedBy" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'Nháp',
    "accessLevel" TEXT NOT NULL DEFAULT 'internal',
    "folderId" TEXT,
    "parentDocumentId" TEXT,
    "customerId" TEXT,
    "projectId" TEXT,
    "supplierId" TEXT,
    "contractorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KdCostEntry" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "rowKey" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KdCostEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyFixedCost" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "rowKey" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "MonthlyFixedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBOM" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "productId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBOM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputType" TEXT NOT NULL DEFAULT 'select',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceAddon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "attributeId" TEXT NOT NULL,

    CONSTRAINT "ProductAttributeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputType" TEXT NOT NULL DEFAULT 'select',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariantTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantTemplateOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceAddon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "VariantTemplateOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkItemLibrary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Phần thô',
    "subcategory" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT 'm²',
    "mainMaterial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "auxMaterial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkItemLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Thi công thô',
    "description" TEXT NOT NULL DEFAULT '',
    "managementFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "designFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuotationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationTemplateCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "QuotationTemplateCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryProgress" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stages" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractValueOverride" DOUBLE PRECISION,
    "assignees" TEXT NOT NULL DEFAULT '{}',
    "progress" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "SalaryProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryEntry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stages" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignees" TEXT NOT NULL DEFAULT '{}',
    "progress" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "SalaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteriorSalaryEntry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "looseFurnitureRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stages" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignees" TEXT NOT NULL DEFAULT '{}',
    "progress" TEXT NOT NULL DEFAULT '{}',

    CONSTRAINT "InteriorSalaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationTemplateItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mainMaterial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "auxMaterial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "categoryId" TEXT NOT NULL,
    "length" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTask" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "wbs" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 1,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'Chưa bắt đầu',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "assignee" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '',
    "baselineStart" TIMESTAMP(3),
    "baselineEnd" TIMESTAMP(3),
    "parentId" TEXT,
    "predecessorId" TEXT,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressReport" (
    "id" TEXT NOT NULL,
    "progressFrom" INTEGER NOT NULL DEFAULT 0,
    "progressTo" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "images" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'Chờ duyệt',
    "rejectionNote" TEXT NOT NULL DEFAULT '',
    "reportDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "taskId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Nội thất',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleTemplateItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "wbs" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL DEFAULT 1,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "color" TEXT NOT NULL DEFAULT '',
    "parentId" TEXT,
    "predecessorId" TEXT,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "ScheduleTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'paste',
    "rawInput" TEXT NOT NULL,
    "aiSummary" TEXT,
    "aiRaw" JSONB,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'yêu cầu',
    "assignee" TEXT NOT NULL DEFAULT '',
    "deadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopWorker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "skill" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Hoạt động',
    "hourlyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "zaloUserId" TEXT NOT NULL DEFAULT '',
    "workerType" TEXT NOT NULL DEFAULT 'Thợ chính',

    CONSTRAINT "WorkshopWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT,
    "startDate" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Chờ làm',
    "priority" TEXT NOT NULL DEFAULT 'Trung bình',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Lắp ghép tại xưởng',
    "blockedReason" TEXT NOT NULL DEFAULT '',
    "stage" TEXT NOT NULL DEFAULT 'Cut',

    CONSTRAINT "WorkshopTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopTaskWorker" (
    "taskId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,

    CONSTRAINT "WorkshopTaskWorker_pkey" PRIMARY KEY ("taskId","workerId")
);

-- CreateTable
CREATE TABLE "WorkshopTaskMaterial" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "WorkshopTaskMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkLogEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "projectId" TEXT,
    "projectName" TEXT NOT NULL DEFAULT '',
    "mainWorkers" TEXT NOT NULL DEFAULT '[]',
    "subWorkers" TEXT NOT NULL DEFAULT '[]',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shift" TEXT NOT NULL DEFAULT 'Sáng',

    CONSTRAINT "WorkLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectChatMsg" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "images" TEXT NOT NULL DEFAULT '[]',
    "senderName" TEXT NOT NULL,
    "senderType" TEXT NOT NULL DEFAULT 'staff',
    "senderRole" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectChatMsg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "images" TEXT NOT NULL DEFAULT '[]',
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopAttendance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkshopAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerOvertime" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rateMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "totalPay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Chờ duyệt',
    "approvedBy" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerOvertime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerSalaryAdvance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerSalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "assignee" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Cần làm',
    "priority" TEXT NOT NULL DEFAULT 'Trung bình',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Việc sẽ làm',
    "priority" TEXT NOT NULL DEFAULT 'Trung bình',
    "assignee" TEXT NOT NULL DEFAULT '',
    "order" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,
    "recurringDays" TEXT,
    "recurringEndDate" TIMESTAMP(3),
    "recurringInterval" INTEGER NOT NULL DEFAULT 1,
    "recurringType" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerComment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachments" TEXT,

    CONSTRAINT "CustomerComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'mention',
    "message" TEXT NOT NULL,
    "link" TEXT NOT NULL DEFAULT '',
    "actorName" TEXT NOT NULL DEFAULT '',
    "actorUserId" TEXT NOT NULL DEFAULT '',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LarkJournalEntry" (
    "id" TEXT NOT NULL,
    "larkRecordId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3),
    "postDate" TIMESTAMP(3),
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "cashIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LarkJournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Đề xuất',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Mới',
    "response" TEXT NOT NULL DEFAULT '',
    "submittedBy" TEXT NOT NULL DEFAULT '',
    "submittedName" TEXT NOT NULL DEFAULT '',
    "respondedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SalesWorker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workerType" TEXT NOT NULL DEFAULT 'Nhân viên KD',
    "position" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "dailyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Hoạt động',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "birthdate" TIMESTAMP(3),

    CONSTRAINT "SalesWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAttendance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSalaryAdvance" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unionFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesSalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedAsset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'Máy móc - Thiết bị',
    "origin" TEXT NOT NULL DEFAULT '',
    "startUseDate" TIMESTAMP(3),
    "originalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depreciationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wearRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accumulatedDepreciation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "disposalDate" TIMESTAMP(3),
    "disposalReason" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Đang dùng',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopPLEntry" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "assignedTo" TEXT,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopPLEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionFloor" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionFloor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRoom" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionItem" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "stepCNC" BOOLEAN NOT NULL DEFAULT false,
    "stepCNCAt" TIMESTAMP(3),
    "stepCNCBy" TEXT NOT NULL DEFAULT '',
    "stepColdProcess" BOOLEAN NOT NULL DEFAULT false,
    "stepColdProcessAt" TIMESTAMP(3),
    "stepColdProcessBy" TEXT NOT NULL DEFAULT '',
    "stepWorkshopAssembly" BOOLEAN NOT NULL DEFAULT false,
    "stepWorkshopAssemblyAt" TIMESTAMP(3),
    "stepWorkshopAssemblyBy" TEXT NOT NULL DEFAULT '',
    "stepTransport" BOOLEAN NOT NULL DEFAULT false,
    "stepTransportAt" TIMESTAMP(3),
    "stepTransportBy" TEXT NOT NULL DEFAULT '',
    "stepSiteInstall" BOOLEAN NOT NULL DEFAULT false,
    "stepSiteInstallAt" TIMESTAMP(3),
    "stepSiteInstallBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPlanStage" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductionPlanStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionPlanStep" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3),

    CONSTRAINT "ProductionPlanStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Bảo hành',
    "category" TEXT NOT NULL DEFAULT 'Khác',
    "priority" TEXT NOT NULL DEFAULT 'Trung bình',
    "status" TEXT NOT NULL DEFAULT 'Tiếp nhận',
    "description" TEXT NOT NULL DEFAULT '',
    "resolution" TEXT NOT NULL DEFAULT '',
    "rootCause" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "assignee" TEXT NOT NULL DEFAULT '',
    "reportedBy" TEXT NOT NULL DEFAULT '',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduledDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "slaDeadline" TIMESTAMP(3),
    "nextScheduleDate" TIMESTAMP(3),
    "warrantyEndDate" TIMESTAMP(3),
    "isUnderWarranty" BOOLEAN NOT NULL DEFAULT true,
    "isRepeatIssue" BOOLEAN NOT NULL DEFAULT false,
    "repeatCount" INTEGER NOT NULL DEFAULT 0,
    "parentIssueId" TEXT,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "beforePhotos" TEXT NOT NULL DEFAULT '[]',
    "afterPhotos" TEXT NOT NULL DEFAULT '[]',
    "customerRating" INTEGER,
    "customerFeedback" TEXT NOT NULL DEFAULT '',
    "ratedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCheckIn" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'check_in',
    "userName" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "address" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostAllocation" (
    "id" TEXT NOT NULL,
    "costProjectId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "basis" TEXT NOT NULL DEFAULT 'Theo m²',
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'Chi phí xưởng',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostLabor" (
    "id" TEXT NOT NULL,
    "costProjectId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostLabor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostMachine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "startDate" TEXT,
    "originalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depreciationYears" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "monthlyDepreciation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Đang dùng',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostMaterial" (
    "id" TEXT NOT NULL,
    "costProjectId" TEXT NOT NULL,
    "grp" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wastePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostMonthly" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "electric" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "water" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "management" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maintenance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tools" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "machineDepreciation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "capacitySqm" DOUBLE PRECISION NOT NULL DEFAULT 800,
    "machineHours" DOUBLE PRECISION NOT NULL DEFAULT 160,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostOther" (
    "id" TEXT NOT NULL,
    "costProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostOther_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostProject" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "code" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL DEFAULT '',
    "client" TEXT NOT NULL DEFAULT '',
    "signDate" TEXT,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatPct" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "mgmtPct" DOUBLE PRECISION NOT NULL DEFAULT 0.04,
    "status" TEXT NOT NULL DEFAULT 'Báo giá',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostSettings" (
    "id" TEXT NOT NULL,
    "vatPct" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "targetProfitPct" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "mgmtPct" DOUBLE PRECISION NOT NULL DEFAULT 0.04,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractProcess" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Đang thực hiện',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "contractId" TEXT,

    CONSTRAINT "ContractProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractProcessStep" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "parentId" TEXT,
    "wbs" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "assignee" TEXT NOT NULL DEFAULT '',
    "department" TEXT NOT NULL DEFAULT '',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "duration" INTEGER NOT NULL DEFAULT 1,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Chưa bắt đầu',
    "notes" TEXT NOT NULL DEFAULT '',
    "files" TEXT NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isPaymentStep" BOOLEAN NOT NULL DEFAULT false,
    "paymentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractProcessStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractProcessTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractProcessTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT '',
    "userName" TEXT NOT NULL DEFAULT '',
    "userRole" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "toolCalls" JSONB,
    "actions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractProcessTemplateStep" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "parentId" TEXT,
    "wbs" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "isPaymentStep" BOOLEAN NOT NULL DEFAULT false,
    "paymentPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "ContractProcessTemplateStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionChecklist" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Đang thực hiện',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupervisionChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupervisionChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL,
    "hint" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT NOT NULL DEFAULT '',
    "photos" TEXT NOT NULL DEFAULT '[]',
    "checkedBy" TEXT NOT NULL DEFAULT '',
    "checkedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SupervisionChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgOrder" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "batchNumber" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "productionManagerId" TEXT NOT NULL DEFAULT '',
    "qcManagerId" TEXT NOT NULL DEFAULT '',
    "approvedById" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfgOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "floorName" TEXT NOT NULL DEFAULT '',
    "roomName" TEXT NOT NULL DEFAULT '',
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'cái',
    "length" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialDescription" TEXT NOT NULL DEFAULT '',
    "colorDescription" TEXT NOT NULL DEFAULT '',
    "hardwareDescription" TEXT NOT NULL DEFAULT '',
    "drawingDocumentId" TEXT,
    "drawingUrl" TEXT NOT NULL DEFAULT '',
    "referenceImageUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "assignedTeamName" TEXT NOT NULL DEFAULT '',
    "assignedWorkerId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfgItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgStageTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "productCategory" TEXT NOT NULL DEFAULT '',
    "defaultDurationHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfgStageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgItemStage" (
    "id" TEXT NOT NULL,
    "mfgItemId" TEXT NOT NULL,
    "stageTemplateId" TEXT,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "assignedTeamName" TEXT NOT NULL DEFAULT '',
    "assignedWorkerId" TEXT,
    "plannedStartDate" TIMESTAMP(3),
    "plannedEndDate" TIMESTAMP(3),
    "actualStartDate" TIMESTAMP(3),
    "actualEndDate" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "completedById" TEXT NOT NULL DEFAULT '',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfgItemStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgTask" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "mfgItemId" TEXT,
    "mfgItemStageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "assignedTeamName" TEXT NOT NULL DEFAULT '',
    "assignedWorkerId" TEXT,
    "assignedById" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "plannedStartDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfgTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgLog" (
    "id" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "mfgItemId" TEXT,
    "mfgItemStageId" TEXT,
    "taskId" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workerId" TEXT,
    "teamName" TEXT NOT NULL DEFAULT '',
    "workDescription" TEXT NOT NULL DEFAULT '',
    "completedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "workHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progressBefore" INTEGER NOT NULL DEFAULT 0,
    "progressAfter" INTEGER NOT NULL DEFAULT 0,
    "issueDescription" TEXT NOT NULL DEFAULT '',
    "nextPlan" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfgLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgMaterialRequirement" (
    "id" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "mfgItemId" TEXT,
    "productId" TEXT,
    "materialName" TEXT NOT NULL DEFAULT '',
    "specification" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT '',
    "estimatedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returnedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "missingQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedUnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualUnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "requiredDate" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MfgMaterialRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityInspection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "mfgItemId" TEXT,
    "inspectionType" TEXT NOT NULL DEFAULT 'IN_PROCESS',
    "inspectorId" TEXT NOT NULL DEFAULT '',
    "inspectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL DEFAULT 'PASSED',
    "dimensionPassed" BOOLEAN NOT NULL DEFAULT true,
    "materialPassed" BOOLEAN NOT NULL DEFAULT true,
    "colorPassed" BOOLEAN NOT NULL DEFAULT true,
    "hardwarePassed" BOOLEAN NOT NULL DEFAULT true,
    "surfacePassed" BOOLEAN NOT NULL DEFAULT true,
    "edgePassed" BOOLEAN NOT NULL DEFAULT true,
    "structurePassed" BOOLEAN NOT NULL DEFAULT true,
    "assemblyPassed" BOOLEAN NOT NULL DEFAULT true,
    "cleanlinessPassed" BOOLEAN NOT NULL DEFAULT true,
    "packingPassed" BOOLEAN NOT NULL DEFAULT true,
    "overallNote" TEXT NOT NULL DEFAULT '',
    "approvedById" TEXT NOT NULL DEFAULT '',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityIssue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "mfgItemId" TEXT,
    "mfgItemStageId" TEXT,
    "qualityInspectionId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "severity" TEXT NOT NULL DEFAULT 'NORMAL',
    "causeType" TEXT NOT NULL DEFAULT '',
    "responsibleTeamName" TEXT NOT NULL DEFAULT '',
    "responsibleWorkerId" TEXT,
    "reportedById" TEXT NOT NULL DEFAULT '',
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "correctiveAction" TEXT NOT NULL DEFAULT '',
    "repairCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resolvedById" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TIMESTAMP(3),
    "verifiedById" TEXT NOT NULL DEFAULT '',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingRecord" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "packageNumber" TEXT NOT NULL DEFAULT '',
    "packageType" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "packedById" TEXT NOT NULL DEFAULT '',
    "packedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PACKED',
    "labelCode" TEXT NOT NULL DEFAULT '',
    "qrCodeValue" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PackingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingItem" (
    "id" TEXT NOT NULL,
    "packingRecordId" TEXT NOT NULL,
    "mfgItemId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "PackingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRecord" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mfgOrderId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleNumber" TEXT NOT NULL DEFAULT '',
    "driverName" TEXT NOT NULL DEFAULT '',
    "driverPhone" TEXT NOT NULL DEFAULT '',
    "carrierName" TEXT NOT NULL DEFAULT '',
    "deliveryContactName" TEXT NOT NULL DEFAULT '',
    "deliveryContactPhone" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "departedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "receivedBy" TEXT NOT NULL DEFAULT '',
    "receivedAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryItem" (
    "id" TEXT NOT NULL,
    "deliveryRecordId" TEXT NOT NULL,
    "packingRecordId" TEXT,
    "mfgItemId" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "DeliveryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgAttachment" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "photoStage" TEXT NOT NULL DEFAULT '',
    "uploadedById" TEXT NOT NULL DEFAULT '',
    "uploadedByName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfgAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MfgAuditLog" (
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

    CONSTRAINT "MfgAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL DEFAULT '',
    "accountHolder" TEXT NOT NULL DEFAULT '',
    "branch" TEXT NOT NULL DEFAULT '',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'Chi',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransaction" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "cashIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "department" TEXT NOT NULL,
    "projectId" TEXT,
    "content" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "debitAccountId" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "categoryId" TEXT,
    "objectType" TEXT NOT NULL DEFAULT '',
    "objectId" TEXT NOT NULL DEFAULT '',
    "objectName" TEXT NOT NULL DEFAULT '',
    "payerReceiver" TEXT NOT NULL DEFAULT '',
    "itemName" TEXT NOT NULL DEFAULT '',
    "itemUnit" TEXT NOT NULL DEFAULT '',
    "itemQty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemUnitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itemAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "documentNo" TEXT NOT NULL DEFAULT '',
    "documentDate" TIMESTAMP(3),
    "attachments" JSONB DEFAULT '[]',
    "notes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Nháp',
    "cancelReason" TEXT NOT NULL DEFAULT '',
    "canceledBy" TEXT NOT NULL DEFAULT '',
    "canceledAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdByRole" TEXT NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceTransactionAudit" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorName" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL DEFAULT '',
    "actorRole" TEXT NOT NULL DEFAULT '',
    "beforeData" JSONB,
    "afterData" JSONB,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTransactionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashReconciliation" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetType" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "systemBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "reconciledBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "ProductCategory_parentId_idx" ON "ProductCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_code_key" ON "Quotation"("code");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_projectId_idx" ON "Quotation"("projectId");

-- CreateIndex
CREATE INDEX "Quotation_parentId_idx" ON "Quotation"("parentId");

-- CreateIndex
CREATE INDEX "QuotationCategory_quotationId_idx" ON "QuotationCategory"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationItem_parentItemId_idx" ON "QuotationItem"("parentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignOrder_code_key" ON "DesignOrder"("code");

-- CreateIndex
CREATE INDEX "DesignOrder_customerId_idx" ON "DesignOrder"("customerId");

-- CreateIndex
CREATE INDEX "DesignOrder_projectId_idx" ON "DesignOrder"("projectId");

-- CreateIndex
CREATE INDEX "DesignOrderItem_designOrderId_idx" ON "DesignOrderItem"("designOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignTask_code_key" ON "DesignTask"("code");

-- CreateIndex
CREATE INDEX "DesignTask_customerId_idx" ON "DesignTask"("customerId");

-- CreateIndex
CREATE INDEX "DesignTask_executorName_idx" ON "DesignTask"("executorName");

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

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_code_key" ON "InventoryTransaction"("code");

-- CreateIndex
CREATE INDEX "InventoryTransaction_productId_idx" ON "InventoryTransaction"("productId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_projectId_idx" ON "InventoryTransaction"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_code_key" ON "Transaction"("code");

-- CreateIndex
CREATE INDEX "Transaction_projectId_idx" ON "Transaction"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_code_key" ON "Contractor"("code");

-- CreateIndex
CREATE INDEX "ContractorPayment_projectId_idx" ON "ContractorPayment"("projectId");

-- CreateIndex
CREATE INDEX "ContractorPayment_contractorId_idx" ON "ContractorPayment"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorPaymentItem_contractorPaymentId_idx" ON "ContractorPaymentItem"("contractorPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_idx" ON "ProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ProjectBudget_projectId_idx" ON "ProjectBudget"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_code_key" ON "Contract"("code");

-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "Contract"("projectId");

-- CreateIndex
CREATE INDEX "Contract_customerId_idx" ON "Contract"("customerId");

-- CreateIndex
CREATE INDEX "ContractPayment_contractId_idx" ON "ContractPayment"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_code_key" ON "WorkOrder"("code");

-- CreateIndex
CREATE INDEX "WorkOrder_projectId_idx" ON "WorkOrder"("projectId");

-- CreateIndex
CREATE INDEX "WorkOrder_sourceLogId_idx" ON "WorkOrder"("sourceLogId");

-- CreateIndex
CREATE INDEX "WorkOrderCheckin_workOrderId_idx" ON "WorkOrderCheckin"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderPhoto_workOrderId_idx" ON "WorkOrderPhoto"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderQCItem_workOrderId_idx" ON "WorkOrderQCItem"("workOrderId");

-- CreateIndex
CREATE INDEX "WorkOrderStageLog_workOrderId_idx" ON "WorkOrderStageLog"("workOrderId");

-- CreateIndex
CREATE INDEX "MaterialPlan_projectId_idx" ON "MaterialPlan"("projectId");

-- CreateIndex
CREATE INDEX "MaterialPlan_productId_idx" ON "MaterialPlan"("productId");

-- CreateIndex
CREATE INDEX "ProductionCostItem_projectId_idx" ON "ProductionCostItem"("projectId");

-- CreateIndex
CREATE INDEX "BudgetChangeOrder_projectId_idx" ON "BudgetChangeOrder"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequisition_code_key" ON "MaterialRequisition"("code");

-- CreateIndex
CREATE INDEX "MaterialRequisition_projectId_idx" ON "MaterialRequisition"("projectId");

-- CreateIndex
CREATE INDEX "MaterialRequisition_materialPlanId_idx" ON "MaterialRequisition"("materialPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_code_key" ON "PurchaseOrder"("code");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectId_idx" ON "PurchaseOrder"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_createdByRole_idx" ON "PurchaseOrder"("createdByRole");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_materialPlanId_idx" ON "PurchaseOrderItem"("materialPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectExpense_code_key" ON "ProjectExpense"("code");

-- CreateIndex
CREATE INDEX "ProjectExpense_projectId_idx" ON "ProjectExpense"("projectId");

-- CreateIndex
CREATE INDEX "ProjectExpense_department_idx" ON "ProjectExpense"("department");

-- CreateIndex
CREATE INDEX "TrackingLog_customerId_idx" ON "TrackingLog"("customerId");

-- CreateIndex
CREATE INDEX "TrackingLog_projectId_idx" ON "TrackingLog"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_projectId_idx" ON "ProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ProjectDocument_customerId_idx" ON "ProjectDocument"("customerId");

-- CreateIndex
CREATE INDEX "ProjectDocument_supplierId_idx" ON "ProjectDocument"("supplierId");

-- CreateIndex
CREATE INDEX "ProjectDocument_contractorId_idx" ON "ProjectDocument"("contractorId");

-- CreateIndex
CREATE INDEX "ProjectDocument_folderId_idx" ON "ProjectDocument"("folderId");

-- CreateIndex
CREATE INDEX "ProjectDocument_parentDocumentId_idx" ON "ProjectDocument"("parentDocumentId");

-- CreateIndex
CREATE INDEX "DocumentFolder_projectId_idx" ON "DocumentFolder"("projectId");

-- CreateIndex
CREATE INDEX "KdCostEntry_year_idx" ON "KdCostEntry"("year");

-- CreateIndex
CREATE UNIQUE INDEX "KdCostEntry_year_month_rowKey_key" ON "KdCostEntry"("year", "month", "rowKey");

-- CreateIndex
CREATE INDEX "MonthlyFixedCost_year_idx" ON "MonthlyFixedCost"("year");

-- CreateIndex
CREATE INDEX "MonthlyFixedCost_year_month_idx" ON "MonthlyFixedCost"("year", "month");

-- CreateIndex
CREATE INDEX "ProductBOM_productId_idx" ON "ProductBOM"("productId");

-- CreateIndex
CREATE INDEX "ProductBOM_componentId_idx" ON "ProductBOM"("componentId");

-- CreateIndex
CREATE INDEX "ProductAttribute_productId_idx" ON "ProductAttribute"("productId");

-- CreateIndex
CREATE INDEX "ProductAttributeOption_attributeId_idx" ON "ProductAttributeOption"("attributeId");

-- CreateIndex
CREATE INDEX "VariantTemplateOption_templateId_idx" ON "VariantTemplateOption"("templateId");

-- CreateIndex
CREATE INDEX "QuotationTemplateCategory_templateId_idx" ON "QuotationTemplateCategory"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryProgress_projectId_key" ON "SalaryProgress"("projectId");

-- CreateIndex
CREATE INDEX "SalaryProgress_projectId_idx" ON "SalaryProgress"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryEntry_code_key" ON "SalaryEntry"("code");

-- CreateIndex
CREATE UNIQUE INDEX "InteriorSalaryEntry_code_key" ON "InteriorSalaryEntry"("code");

-- CreateIndex
CREATE INDEX "ScheduleTask_projectId_idx" ON "ScheduleTask"("projectId");

-- CreateIndex
CREATE INDEX "ScheduleTask_parentId_idx" ON "ScheduleTask"("parentId");

-- CreateIndex
CREATE INDEX "ProgressReport_taskId_idx" ON "ProgressReport"("taskId");

-- CreateIndex
CREATE INDEX "ProgressReport_projectId_idx" ON "ProgressReport"("projectId");

-- CreateIndex
CREATE INDEX "JournalEntry_projectId_idx" ON "JournalEntry"("projectId");

-- CreateIndex
CREATE INDEX "Commitment_projectId_idx" ON "Commitment"("projectId");

-- CreateIndex
CREATE INDEX "Commitment_journalEntryId_idx" ON "Commitment"("journalEntryId");

-- CreateIndex
CREATE INDEX "Commitment_status_idx" ON "Commitment"("status");

-- CreateIndex
CREATE INDEX "WorkshopTask_projectId_idx" ON "WorkshopTask"("projectId");

-- CreateIndex
CREATE INDEX "WorkshopTask_stage_idx" ON "WorkshopTask"("stage");

-- CreateIndex
CREATE INDEX "WorkshopTaskMaterial_taskId_idx" ON "WorkshopTaskMaterial"("taskId");

-- CreateIndex
CREATE INDEX "WorkshopTaskMaterial_productId_idx" ON "WorkshopTaskMaterial"("productId");

-- CreateIndex
CREATE INDEX "WorkLogEntry_date_idx" ON "WorkLogEntry"("date");

-- CreateIndex
CREATE INDEX "WorkLogEntry_projectId_idx" ON "WorkLogEntry"("projectId");

-- CreateIndex
CREATE INDEX "ProjectChatMsg_projectId_createdAt_idx" ON "ProjectChatMsg"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WorkshopAttendance_workerId_idx" ON "WorkshopAttendance"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopAttendance_workerId_date_key" ON "WorkshopAttendance"("workerId", "date");

-- CreateIndex
CREATE INDEX "WorkerOvertime_workerId_idx" ON "WorkerOvertime"("workerId");

-- CreateIndex
CREATE INDEX "WorkerOvertime_date_idx" ON "WorkerOvertime"("date");

-- CreateIndex
CREATE INDEX "WorkerOvertime_status_idx" ON "WorkerOvertime"("status");

-- CreateIndex
CREATE INDEX "WorkerSalaryAdvance_month_idx" ON "WorkerSalaryAdvance"("month");

-- CreateIndex
CREATE UNIQUE INDEX "WorkerSalaryAdvance_workerId_month_key" ON "WorkerSalaryAdvance"("workerId", "month");

-- CreateIndex
CREATE INDEX "MarketingCalendarEvent_date_idx" ON "MarketingCalendarEvent"("date");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_assignee_idx" ON "Task"("assignee");

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");

-- CreateIndex
CREATE INDEX "CustomerComment_customerId_idx" ON "CustomerComment"("customerId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE UNIQUE INDEX "LarkJournalEntry_larkRecordId_key" ON "LarkJournalEntry"("larkRecordId");

-- CreateIndex
CREATE INDEX "LarkJournalEntry_entryDate_idx" ON "LarkJournalEntry"("entryDate");

-- CreateIndex
CREATE INDEX "LarkJournalEntry_department_idx" ON "LarkJournalEntry"("department");

-- CreateIndex
CREATE INDEX "LarkJournalEntry_category_idx" ON "LarkJournalEntry"("category");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_submittedBy_idx" ON "Proposal"("submittedBy");

-- CreateIndex
CREATE INDEX "SalesWorker_status_idx" ON "SalesWorker"("status");

-- CreateIndex
CREATE INDEX "SalesAttendance_workerId_idx" ON "SalesAttendance"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesAttendance_workerId_date_key" ON "SalesAttendance"("workerId", "date");

-- CreateIndex
CREATE INDEX "SalesSalaryAdvance_workerId_idx" ON "SalesSalaryAdvance"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesSalaryAdvance_workerId_month_key" ON "SalesSalaryAdvance"("workerId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "FixedAsset_code_key" ON "FixedAsset"("code");

-- CreateIndex
CREATE INDEX "FixedAsset_assetType_idx" ON "FixedAsset"("assetType");

-- CreateIndex
CREATE INDEX "FixedAsset_status_idx" ON "FixedAsset"("status");

-- CreateIndex
CREATE INDEX "WorkshopPLEntry_period_idx" ON "WorkshopPLEntry"("period");

-- CreateIndex
CREATE INDEX "WorkshopPLEntry_entryType_idx" ON "WorkshopPLEntry"("entryType");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_projectId_key" ON "ProductionOrder"("projectId");

-- CreateIndex
CREATE INDEX "ProductionOrder_projectId_idx" ON "ProductionOrder"("projectId");

-- CreateIndex
CREATE INDEX "ProductionFloor_orderId_idx" ON "ProductionFloor"("orderId");

-- CreateIndex
CREATE INDEX "ProductionRoom_floorId_idx" ON "ProductionRoom"("floorId");

-- CreateIndex
CREATE INDEX "ProductionItem_roomId_idx" ON "ProductionItem"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionPlan_projectId_key" ON "ProductionPlan"("projectId");

-- CreateIndex
CREATE INDEX "ProductionPlanStage_planId_idx" ON "ProductionPlanStage"("planId");

-- CreateIndex
CREATE INDEX "ProductionPlanStep_stageId_idx" ON "ProductionPlanStep"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceRecord_code_key" ON "MaintenanceRecord"("code");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_projectId_idx" ON "MaintenanceRecord"("projectId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_status_idx" ON "MaintenanceRecord"("status");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_slaDeadline_idx" ON "MaintenanceRecord"("slaDeadline");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_parentIssueId_idx" ON "MaintenanceRecord"("parentIssueId");

-- CreateIndex
CREATE INDEX "ProjectCheckIn_projectId_idx" ON "ProjectCheckIn"("projectId");

-- CreateIndex
CREATE INDEX "idx_call_cpid" ON "CostAllocation"("costProjectId");

-- CreateIndex
CREATE INDEX "idx_clab_cpid" ON "CostLabor"("costProjectId");

-- CreateIndex
CREATE INDEX "idx_cmat_cpid" ON "CostMaterial"("costProjectId");

-- CreateIndex
CREATE INDEX "idx_coth_cpid" ON "CostOther"("costProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractProcess_code_key" ON "ContractProcess"("code");

-- CreateIndex
CREATE INDEX "ContractProcess_customerId_idx" ON "ContractProcess"("customerId");

-- CreateIndex
CREATE INDEX "ContractProcess_contractId_idx" ON "ContractProcess"("contractId");

-- CreateIndex
CREATE INDEX "ContractProcessStep_processId_idx" ON "ContractProcessStep"("processId");

-- CreateIndex
CREATE INDEX "ContractProcessStep_parentId_idx" ON "ContractProcessStep"("parentId");

-- CreateIndex
CREATE INDEX "AiLog_userId_idx" ON "AiLog"("userId");

-- CreateIndex
CREATE INDEX "AiLog_createdAt_idx" ON "AiLog"("createdAt");

-- CreateIndex
CREATE INDEX "ContractProcessTemplateStep_templateId_idx" ON "ContractProcessTemplateStep"("templateId");

-- CreateIndex
CREATE INDEX "ContractProcessTemplateStep_parentId_idx" ON "ContractProcessTemplateStep"("parentId");

-- CreateIndex
CREATE INDEX "SupervisionChecklist_projectId_idx" ON "SupervisionChecklist"("projectId");

-- CreateIndex
CREATE INDEX "SupervisionChecklistItem_checklistId_idx" ON "SupervisionChecklistItem"("checklistId");

-- CreateIndex
CREATE UNIQUE INDEX "MfgOrder_code_key" ON "MfgOrder"("code");

-- CreateIndex
CREATE INDEX "MfgOrder_projectId_idx" ON "MfgOrder"("projectId");

-- CreateIndex
CREATE INDEX "MfgOrder_status_idx" ON "MfgOrder"("status");

-- CreateIndex
CREATE INDEX "MfgOrder_plannedEndDate_idx" ON "MfgOrder"("plannedEndDate");

-- CreateIndex
CREATE UNIQUE INDEX "MfgItem_code_key" ON "MfgItem"("code");

-- CreateIndex
CREATE INDEX "MfgItem_mfgOrderId_idx" ON "MfgItem"("mfgOrderId");

-- CreateIndex
CREATE INDEX "MfgItem_projectId_idx" ON "MfgItem"("projectId");

-- CreateIndex
CREATE INDEX "MfgItem_status_idx" ON "MfgItem"("status");

-- CreateIndex
CREATE INDEX "MfgItem_assignedWorkerId_idx" ON "MfgItem"("assignedWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "MfgStageTemplate_code_key" ON "MfgStageTemplate"("code");

-- CreateIndex
CREATE INDEX "MfgStageTemplate_sequence_idx" ON "MfgStageTemplate"("sequence");

-- CreateIndex
CREATE INDEX "MfgItemStage_mfgItemId_idx" ON "MfgItemStage"("mfgItemId");

-- CreateIndex
CREATE INDEX "MfgItemStage_status_idx" ON "MfgItemStage"("status");

-- CreateIndex
CREATE INDEX "MfgItemStage_assignedWorkerId_idx" ON "MfgItemStage"("assignedWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "MfgTask_code_key" ON "MfgTask"("code");

-- CreateIndex
CREATE INDEX "MfgTask_mfgOrderId_idx" ON "MfgTask"("mfgOrderId");

-- CreateIndex
CREATE INDEX "MfgTask_mfgItemId_idx" ON "MfgTask"("mfgItemId");

-- CreateIndex
CREATE INDEX "MfgTask_assignedWorkerId_idx" ON "MfgTask"("assignedWorkerId");

-- CreateIndex
CREATE INDEX "MfgTask_dueDate_idx" ON "MfgTask"("dueDate");

-- CreateIndex
CREATE INDEX "MfgTask_status_idx" ON "MfgTask"("status");

-- CreateIndex
CREATE INDEX "MfgLog_mfgOrderId_idx" ON "MfgLog"("mfgOrderId");

-- CreateIndex
CREATE INDEX "MfgLog_mfgItemId_idx" ON "MfgLog"("mfgItemId");

-- CreateIndex
CREATE INDEX "MfgLog_logDate_idx" ON "MfgLog"("logDate");

-- CreateIndex
CREATE INDEX "MfgMaterialRequirement_mfgOrderId_idx" ON "MfgMaterialRequirement"("mfgOrderId");

-- CreateIndex
CREATE INDEX "MfgMaterialRequirement_mfgItemId_idx" ON "MfgMaterialRequirement"("mfgItemId");

-- CreateIndex
CREATE INDEX "MfgMaterialRequirement_status_idx" ON "MfgMaterialRequirement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QualityInspection_code_key" ON "QualityInspection"("code");

-- CreateIndex
CREATE INDEX "QualityInspection_mfgOrderId_idx" ON "QualityInspection"("mfgOrderId");

-- CreateIndex
CREATE INDEX "QualityInspection_mfgItemId_idx" ON "QualityInspection"("mfgItemId");

-- CreateIndex
CREATE INDEX "QualityInspection_result_idx" ON "QualityInspection"("result");

-- CreateIndex
CREATE UNIQUE INDEX "QualityIssue_code_key" ON "QualityIssue"("code");

-- CreateIndex
CREATE INDEX "QualityIssue_mfgOrderId_idx" ON "QualityIssue"("mfgOrderId");

-- CreateIndex
CREATE INDEX "QualityIssue_mfgItemId_idx" ON "QualityIssue"("mfgItemId");

-- CreateIndex
CREATE INDEX "QualityIssue_status_idx" ON "QualityIssue"("status");

-- CreateIndex
CREATE INDEX "QualityIssue_dueDate_idx" ON "QualityIssue"("dueDate");

-- CreateIndex
CREATE INDEX "QualityIssue_severity_idx" ON "QualityIssue"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "PackingRecord_code_key" ON "PackingRecord"("code");

-- CreateIndex
CREATE INDEX "PackingRecord_mfgOrderId_idx" ON "PackingRecord"("mfgOrderId");

-- CreateIndex
CREATE INDEX "PackingItem_packingRecordId_idx" ON "PackingItem"("packingRecordId");

-- CreateIndex
CREATE INDEX "PackingItem_mfgItemId_idx" ON "PackingItem"("mfgItemId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRecord_code_key" ON "DeliveryRecord"("code");

-- CreateIndex
CREATE INDEX "DeliveryRecord_mfgOrderId_idx" ON "DeliveryRecord"("mfgOrderId");

-- CreateIndex
CREATE INDEX "DeliveryRecord_projectId_idx" ON "DeliveryRecord"("projectId");

-- CreateIndex
CREATE INDEX "DeliveryItem_deliveryRecordId_idx" ON "DeliveryItem"("deliveryRecordId");

-- CreateIndex
CREATE INDEX "DeliveryItem_packingRecordId_idx" ON "DeliveryItem"("packingRecordId");

-- CreateIndex
CREATE INDEX "DeliveryItem_mfgItemId_idx" ON "DeliveryItem"("mfgItemId");

-- CreateIndex
CREATE INDEX "MfgAttachment_entityType_entityId_idx" ON "MfgAttachment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MfgAuditLog_entityType_entityId_idx" ON "MfgAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MfgAuditLog_createdAt_idx" ON "MfgAuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccount_code_key" ON "AccountingAccount"("code");

-- CreateIndex
CREATE INDEX "FinanceCategory_group_idx" ON "FinanceCategory"("group");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTransaction_code_key" ON "FinanceTransaction"("code");

-- CreateIndex
CREATE INDEX "FinanceTransaction_date_idx" ON "FinanceTransaction"("date");

-- CreateIndex
CREATE INDEX "FinanceTransaction_projectId_idx" ON "FinanceTransaction"("projectId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_department_idx" ON "FinanceTransaction"("department");

-- CreateIndex
CREATE INDEX "FinanceTransaction_status_idx" ON "FinanceTransaction"("status");

-- CreateIndex
CREATE INDEX "FinanceTransaction_type_idx" ON "FinanceTransaction"("type");

-- CreateIndex
CREATE INDEX "FinanceTransaction_debitAccountId_idx" ON "FinanceTransaction"("debitAccountId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_creditAccountId_idx" ON "FinanceTransaction"("creditAccountId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_bankAccountId_idx" ON "FinanceTransaction"("bankAccountId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_categoryId_idx" ON "FinanceTransaction"("categoryId");

-- CreateIndex
CREATE INDEX "FinanceTransactionAudit_transactionId_idx" ON "FinanceTransactionAudit"("transactionId");

-- CreateIndex
CREATE INDEX "CashReconciliation_targetType_idx" ON "CashReconciliation"("targetType");

-- CreateIndex
CREATE INDEX "CashReconciliation_bankAccountId_idx" ON "CashReconciliation"("bankAccountId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationCategory" ADD CONSTRAINT "QuotationCategory_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuotationCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "QuotationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrder" ADD CONSTRAINT "DesignOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrder" ADD CONSTRAINT "DesignOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignOrderItem" ADD CONSTRAINT "DesignOrderItem_designOrderId_fkey" FOREIGN KEY ("designOrderId") REFERENCES "DesignOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignTask" ADD CONSTRAINT "DesignTask_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLearned" ADD CONSTRAINT "LessonLearned_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonLearned" ADD CONSTRAINT "LessonLearned_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEmployee" ADD CONSTRAINT "ProjectEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEmployee" ADD CONSTRAINT "ProjectEmployee_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPayment" ADD CONSTRAINT "ContractorPayment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorPaymentItem" ADD CONSTRAINT "ContractorPaymentItem_contractorPaymentId_fkey" FOREIGN KEY ("contractorPaymentId") REFERENCES "ContractorPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudget" ADD CONSTRAINT "ProjectBudget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractPayment" ADD CONSTRAINT "ContractPayment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderCheckin" ADD CONSTRAINT "WorkOrderCheckin_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderPhoto" ADD CONSTRAINT "WorkOrderPhoto_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderQCItem" ADD CONSTRAINT "WorkOrderQCItem_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderStageLog" ADD CONSTRAINT "WorkOrderStageLog_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPlan" ADD CONSTRAINT "MaterialPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPlan" ADD CONSTRAINT "MaterialPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionCostItem" ADD CONSTRAINT "ProductionCostItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetChangeOrder" ADD CONSTRAINT "BudgetChangeOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequisition" ADD CONSTRAINT "MaterialRequisition_materialPlanId_fkey" FOREIGN KEY ("materialPlanId") REFERENCES "MaterialPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequisition" ADD CONSTRAINT "MaterialRequisition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequisition" ADD CONSTRAINT "MaterialRequisition_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_materialPlanId_fkey" FOREIGN KEY ("materialPlanId") REFERENCES "MaterialPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectExpense" ADD CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLog" ADD CONSTRAINT "TrackingLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingLog" ADD CONSTRAINT "TrackingLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBOM" ADD CONSTRAINT "ProductBOM_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBOM" ADD CONSTRAINT "ProductBOM_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeOption" ADD CONSTRAINT "ProductAttributeOption_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantTemplateOption" ADD CONSTRAINT "VariantTemplateOption_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "VariantTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationTemplateCategory" ADD CONSTRAINT "QuotationTemplateCategory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuotationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryProgress" ADD CONSTRAINT "SalaryProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationTemplateItem" ADD CONSTRAINT "QuotationTemplateItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuotationTemplateCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ScheduleTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTask" ADD CONSTRAINT "ScheduleTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ScheduleTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateItem" ADD CONSTRAINT "ScheduleTemplateItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ScheduleTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateItem" ADD CONSTRAINT "ScheduleTemplateItem_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "ScheduleTemplateItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleTemplateItem" ADD CONSTRAINT "ScheduleTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScheduleTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTask" ADD CONSTRAINT "WorkshopTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTaskWorker" ADD CONSTRAINT "WorkshopTaskWorker_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkshopTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTaskWorker" ADD CONSTRAINT "WorkshopTaskWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkshopWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTaskMaterial" ADD CONSTRAINT "WorkshopTaskMaterial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopTaskMaterial" ADD CONSTRAINT "WorkshopTaskMaterial_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "WorkshopTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkLogEntry" ADD CONSTRAINT "WorkLogEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectChatMsg" ADD CONSTRAINT "ProjectChatMsg_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopAttendance" ADD CONSTRAINT "WorkshopAttendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkshopWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerOvertime" ADD CONSTRAINT "WorkerOvertime_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkshopWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerSalaryAdvance" ADD CONSTRAINT "WorkerSalaryAdvance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkshopWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAttendance" ADD CONSTRAINT "SalesAttendance_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "SalesWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFloor" ADD CONSTRAINT "ProductionFloor_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRoom" ADD CONSTRAINT "ProductionRoom_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "ProductionFloor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionItem" ADD CONSTRAINT "ProductionItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ProductionRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlan" ADD CONSTRAINT "ProductionPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlanStage" ADD CONSTRAINT "ProductionPlanStage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ProductionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionPlanStep" ADD CONSTRAINT "ProductionPlanStep_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "ProductionPlanStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCheckIn" ADD CONSTRAINT "ProjectCheckIn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractProcess" ADD CONSTRAINT "ContractProcess_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractProcess" ADD CONSTRAINT "ContractProcess_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractProcessStep" ADD CONSTRAINT "ContractProcessStep_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContractProcessStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractProcessStep" ADD CONSTRAINT "ContractProcessStep_processId_fkey" FOREIGN KEY ("processId") REFERENCES "ContractProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractProcessTemplateStep" ADD CONSTRAINT "ContractProcessTemplateStep_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContractProcessTemplateStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractProcessTemplateStep" ADD CONSTRAINT "ContractProcessTemplateStep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractProcessTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionChecklist" ADD CONSTRAINT "SupervisionChecklist_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisionChecklistItem" ADD CONSTRAINT "SupervisionChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "SupervisionChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgOrder" ADD CONSTRAINT "MfgOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgOrder" ADD CONSTRAINT "MfgOrder_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgItem" ADD CONSTRAINT "MfgItem_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgItem" ADD CONSTRAINT "MfgItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgItem" ADD CONSTRAINT "MfgItem_drawingDocumentId_fkey" FOREIGN KEY ("drawingDocumentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgItem" ADD CONSTRAINT "MfgItem_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "WorkshopWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgItemStage" ADD CONSTRAINT "MfgItemStage_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgItemStage" ADD CONSTRAINT "MfgItemStage_stageTemplateId_fkey" FOREIGN KEY ("stageTemplateId") REFERENCES "MfgStageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgItemStage" ADD CONSTRAINT "MfgItemStage_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "WorkshopWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgTask" ADD CONSTRAINT "MfgTask_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgTask" ADD CONSTRAINT "MfgTask_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgTask" ADD CONSTRAINT "MfgTask_mfgItemStageId_fkey" FOREIGN KEY ("mfgItemStageId") REFERENCES "MfgItemStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgTask" ADD CONSTRAINT "MfgTask_assignedWorkerId_fkey" FOREIGN KEY ("assignedWorkerId") REFERENCES "WorkshopWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgLog" ADD CONSTRAINT "MfgLog_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgLog" ADD CONSTRAINT "MfgLog_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgLog" ADD CONSTRAINT "MfgLog_mfgItemStageId_fkey" FOREIGN KEY ("mfgItemStageId") REFERENCES "MfgItemStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgLog" ADD CONSTRAINT "MfgLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MfgTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgLog" ADD CONSTRAINT "MfgLog_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkshopWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgMaterialRequirement" ADD CONSTRAINT "MfgMaterialRequirement_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgMaterialRequirement" ADD CONSTRAINT "MfgMaterialRequirement_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MfgMaterialRequirement" ADD CONSTRAINT "MfgMaterialRequirement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityInspection" ADD CONSTRAINT "QualityInspection_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_mfgItemStageId_fkey" FOREIGN KEY ("mfgItemStageId") REFERENCES "MfgItemStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_qualityInspectionId_fkey" FOREIGN KEY ("qualityInspectionId") REFERENCES "QualityInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityIssue" ADD CONSTRAINT "QualityIssue_responsibleWorkerId_fkey" FOREIGN KEY ("responsibleWorkerId") REFERENCES "WorkshopWorker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingRecord" ADD CONSTRAINT "PackingRecord_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_packingRecordId_fkey" FOREIGN KEY ("packingRecordId") REFERENCES "PackingRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingItem" ADD CONSTRAINT "PackingItem_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_mfgOrderId_fkey" FOREIGN KEY ("mfgOrderId") REFERENCES "MfgOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRecord" ADD CONSTRAINT "DeliveryRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_deliveryRecordId_fkey" FOREIGN KEY ("deliveryRecordId") REFERENCES "DeliveryRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_packingRecordId_fkey" FOREIGN KEY ("packingRecordId") REFERENCES "PackingRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryItem" ADD CONSTRAINT "DeliveryItem_mfgItemId_fkey" FOREIGN KEY ("mfgItemId") REFERENCES "MfgItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_debitAccountId_fkey" FOREIGN KEY ("debitAccountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTransactionAudit" ADD CONSTRAINT "FinanceTransactionAudit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinanceTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

