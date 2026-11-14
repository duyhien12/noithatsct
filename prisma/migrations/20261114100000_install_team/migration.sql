-- Đội thi công cho kế hoạch lắp đặt: bảng đội + bảng nối InstallPlan ↔ InstallTeam
-- (chỉ thêm bảng mới, không đổi dữ liệu cũ)

CREATE TABLE "InstallTeam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'Lắp đặt',
    "memberCount" INTEGER NOT NULL DEFAULT 2,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InstallPlanTeam" (
    "planId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,

    CONSTRAINT "InstallPlanTeam_pkey" PRIMARY KEY ("planId", "teamId")
);

CREATE INDEX "InstallPlanTeam_teamId_idx" ON "InstallPlanTeam"("teamId");

ALTER TABLE "InstallPlanTeam" ADD CONSTRAINT "InstallPlanTeam_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InstallPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InstallPlanTeam" ADD CONSTRAINT "InstallPlanTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "InstallTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
