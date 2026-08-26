import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { hasInvPermission } from '@/lib/inventoryV2/permissions';

/**
 * Phân bổ vật tư theo công trình/lệnh sản xuất (mục 11 spec): giữ / xuất / hoàn trả / giá trị
 * — nguồn dữ liệu THẬT (InvStockReservation + InvStockLedger), không suy luận rời rạc như
 * hệ kho cũ. "Định mức vật tư" (MaterialPlan) chưa nối ở v1 vì MaterialPlan hiện gắn Product
 * cũ, không gắn InvMaterial — để trống, thiết kế nối sau (đúng quyết định trong kế hoạch).
 */
export const GET = withAuth(async (request, ctx, session) => {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const canViewCost = hasInvPermission(session.user, 'view_cost');

    const [reservations, ledgerRows] = await Promise.all([
        prisma.invStockReservation.findMany({
            where: { projectId: projectId || { not: null } },
            include: { material: { select: { id: true, sku: true, name: true, stockUnit: { select: { code: true } } } }, project: { select: { id: true, code: true, name: true } } },
        }),
        prisma.invStockLedger.findMany({
            where: { document: { projectId: projectId || { not: null } } },
            include: {
                material: { select: { id: true, sku: true, name: true } },
                document: { select: { id: true, code: true, docType: true, projectId: true, project: { select: { code: true, name: true } } } },
            },
        }),
    ]);

    const byProject = new Map();
    const ensure = (pid, pinfo) => {
        if (!byProject.has(pid)) byProject.set(pid, { projectId: pid, project: pinfo, materials: new Map() });
        return byProject.get(pid);
    };
    const ensureMaterial = (bucket, materialId, minfo) => {
        if (!bucket.materials.has(materialId)) {
            bucket.materials.set(materialId, { materialId, material: minfo, held: 0, issued: 0, returned: 0, issuedValue: 0, returnedValue: 0 });
        }
        return bucket.materials.get(materialId);
    };

    for (const r of reservations) {
        if (!r.projectId) continue;
        const bucket = ensure(r.projectId, r.project);
        const m = ensureMaterial(bucket, r.materialId, r.material);
        if (r.status === 'ACTIVE') m.held += Number(r.quantity);
    }

    for (const row of ledgerRows) {
        const pid = row.document?.projectId;
        if (!pid) continue;
        const bucket = ensure(pid, row.document.project);
        const m = ensureMaterial(bucket, row.materialId, row.material);
        const isReturn = row.document.docType === 'IMPORT_RETURN_PROJECT' || row.document.docType === 'IMPORT_RETURN_PRODUCTION';
        if (row.direction === 'OUT') {
            m.issued += Number(row.quantity);
            m.issuedValue += Number(row.amount);
        } else if (isReturn) {
            m.returned += Number(row.quantity);
            m.returnedValue += Number(row.amount);
        }
    }

    const data = Array.from(byProject.values()).map(bucket => ({
        projectId: bucket.projectId,
        project: bucket.project,
        materials: Array.from(bucket.materials.values()).map(m => ({
            ...m,
            netCost: canViewCost ? m.issuedValue - m.returnedValue : undefined,
            issuedValue: canViewCost ? m.issuedValue : undefined,
            returnedValue: canViewCost ? m.returnedValue : undefined,
        })),
    }));

    return NextResponse.json({ data });
});
