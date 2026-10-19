-- Đánh dấu dòng chi phí lấy tự động: 'kho:<materialId>' (Kho 2.0) hoặc 'nk:<hạng mục>|<thợ>' (Nhật ký công việc)
ALTER TABLE "CostMaterial" ADD COLUMN "source" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CostLabor" ADD COLUMN "source" TEXT NOT NULL DEFAULT '';
