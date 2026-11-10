-- InstallPlan: cho phép ghi tên khách/công trình ngoài danh sách Khách hàng
-- (customerId thành tùy chọn, thêm customerName lưu tên tự gõ)

ALTER TABLE "InstallPlan" ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "InstallPlan" ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '';
