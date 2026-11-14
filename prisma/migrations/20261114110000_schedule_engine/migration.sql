-- Bộ xếp lịch thi công: thêm thông tin đội (chuyên môn, ngày làm, ngày nghỉ, thành viên),
-- thông tin công việc (khối lượng, hạn, sẵn sàng, phụ thuộc, khóa), cấu hình giờ làm/tăng ca
-- và bảng lưu các lần tính lịch. Chỉ thêm cột có mặc định và thêm bảng mới; không đổi dữ liệu cũ.

ALTER TABLE "InstallTeam"
    ADD COLUMN "skills" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "workWeekdays" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    ADD COLUMN "offDates" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "memberIds" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "allowPartial" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "InstallPlan"
    ADD COLUMN "effortHours" DOUBLE PRECISION,
    ADD COLUMN "doneHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN "deadline" TIMESTAMP(3),
    ADD COLUMN "startNotBefore" TIMESTAMP(3),
    ADD COLUMN "readyDate" TIMESTAMP(3),
    ADD COLUMN "siteReadyDate" TIMESTAMP(3),
    ADD COLUMN "skill" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "maxTeams" INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN "travelDays" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "allowOvertime" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "dependsOn" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ScheduleSettings" (
    "id" TEXT NOT NULL,
    "hoursPerDay" INTEGER NOT NULL DEFAULT 8,
    "otMaxPerDay" INTEGER NOT NULL DEFAULT 3,
    "otMaxPerMonth" INTEGER NOT NULL DEFAULT 40,
    "otMaxPerYear" INTEGER NOT NULL DEFAULT 300,
    "otWeekdays" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleRun" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'auto',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "label" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '{}',
    "inputJson" TEXT NOT NULL DEFAULT '{}',
    "resultJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduleRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScheduleRun_status_idx" ON "ScheduleRun"("status");
CREATE INDEX "ScheduleRun_createdAt_idx" ON "ScheduleRun"("createdAt");
