-- InstallPlan: công trình lấy từ Khách hàng (cột "Khách hợp đồng" KD) thay vì Dự án

-- AddColumn (tạm cho phép NULL để chuyển dữ liệu cũ)
ALTER TABLE "InstallPlan" ADD COLUMN "customerId" TEXT;

-- Chuyển dữ liệu: lấy khách hàng của dự án đang gắn
UPDATE "InstallPlan" ip SET "customerId" = p."customerId"
FROM "Project" p WHERE p."id" = ip."projectId";

-- Dòng nào không truy được khách hàng thì bỏ (không thể gắn công trình)
DELETE FROM "InstallPlan" WHERE "customerId" IS NULL;

ALTER TABLE "InstallPlan" ALTER COLUMN "customerId" SET NOT NULL;

-- DropForeignKey / DropIndex / DropColumn
ALTER TABLE "InstallPlan" DROP CONSTRAINT "InstallPlan_projectId_fkey";
DROP INDEX "InstallPlan_projectId_idx";
ALTER TABLE "InstallPlan" DROP COLUMN "projectId";

-- CreateIndex
CREATE INDEX "InstallPlan_customerId_idx" ON "InstallPlan"("customerId");

-- AddForeignKey
ALTER TABLE "InstallPlan" ADD CONSTRAINT "InstallPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
