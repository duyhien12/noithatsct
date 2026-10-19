import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { ensureTables, newId, toNum } from '@/lib/costMgmt';
import { materialFullName } from '@/lib/inventoryV2/materialLabel';

// Phiếu tính vào giá thành: xuất cho công trình/lệnh SX (+), hoàn trả về kho (−).
// Phiếu đảo (sourceDocumentId) của các loại này cũng được tính, dấu theo chiều của phiếu đảo.
const COUNTED_DOC_TYPES = new Set(['EXPORT_PROJECT', 'EXPORT_PRODUCTION', 'IMPORT_RETURN_PROJECT', 'IMPORT_RETURN_PRODUCTION', 'RETURN_TO_WAREHOUSE']);
const LABOR_SKIP_CATEGORIES = new Set(['Nhân công nghỉ']);
const SHIFT_WORKDAY = 0.5; // mỗi ca Sáng/Chiều = 0,5 công
const round = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

async function buildMaterialRows(projectId) {
    const docs = await prisma.invDocument.findMany({
        where: { status: 'APPROVED', deletedAt: null, OR: [{ projectId }, { mfgOrder: { projectId } }] },
        include: {
            sourceDocument: { select: { docType: true } },
            lines: { include: { material: { include: { category: true, stockUnit: true } } } },
        },
    });
    const byMaterial = new Map();
    for (const doc of docs) {
        const counted = COUNTED_DOC_TYPES.has(doc.docType) || (doc.sourceDocumentId && COUNTED_DOC_TYPES.has(doc.sourceDocument?.docType));
        if (!counted) continue;
        const sign = doc.direction === 'OUT' ? 1 : -1;
        for (const l of doc.lines) {
            const m = l.material;
            const price = toNum(l.unitPrice) || toNum(m.avgCost) || toNum(m.lastImportPrice);
            const lineAmount = toNum(l.amount) || toNum(l.quantity) * price;
            const cur = byMaterial.get(m.id) || { material: m, qty: 0, amount: 0 };
            cur.qty += sign * toNum(l.quantity);
            cur.amount += sign * lineAmount;
            byMaterial.set(m.id, cur);
        }
    }
    const rows = [];
    for (const [materialId, { material: m, qty, amount }] of byMaterial) {
        if (qty <= 0) continue;
        rows.push({
            source: `kho:${materialId}`,
            grp: m.category?.name || '',
            name: materialFullName(m),
            detail: m.sku,
            unit: m.stockUnit?.name || '',
            qty: round(qty, 3),
            unitPrice: round(amount / qty),
        });
    }
    return rows.sort((a, b) => a.grp.localeCompare(b.grp, 'vi') || a.name.localeCompare(b.name, 'vi'));
}

async function buildLaborRows(projectId) {
    const [logs, workers] = await Promise.all([
        prisma.workLogEntry.findMany({ where: { projectId } }),
        prisma.workshopWorker.findMany({ select: { name: true, hourlyRate: true } }),
    ]);
    // hourlyRate của thợ xưởng thực tế đang nhập là lương 1 ngày công
    const rateByName = new Map(workers.map(w => [w.name.trim().toLowerCase(), toNum(w.hourlyRate)]));
    const parse = (s) => { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };

    const byKey = new Map();
    for (const log of logs) {
        if (LABOR_SKIP_CATEGORIES.has(log.category)) continue;
        for (const w of [...parse(log.mainWorkers), ...parse(log.subWorkers)]) {
            const name = (typeof w === 'string' ? w : w?.name || '').trim();
            if (!name) continue;
            const hours = toNum(typeof w === 'object' ? w.hours : 0);
            const workdays = hours > 0 ? hours / 8 : SHIFT_WORKDAY;
            const key = `${log.category}|${name}`;
            const cur = byKey.get(key) || { category: log.category, name, qty: 0 };
            cur.qty += workdays;
            byKey.set(key, cur);
        }
    }
    const missingRate = new Set();
    const rows = [...byKey.values()].map(r => {
        const rate = rateByName.get(r.name.toLowerCase()) || 0;
        if (!rate) missingRate.add(r.name);
        return { source: `nk:${r.category}|${r.name}`, category: r.category, type: r.name, unit: 'Công', qty: round(r.qty, 2), unitPrice: rate };
    }).sort((a, b) => a.category.localeCompare(b.category, 'vi') || a.type.localeCompare(b.type, 'vi'));
    return { rows, missingRate: [...missingRate] };
}

/**
 * Lấy dữ liệu sẵn có vào bảng giá thành: kind=materials (phiếu kho Kho 2.0) | labor (Nhật ký công việc xưởng).
 * Chỉ thay các dòng đã lấy tự động lần trước (source khác rỗng); dòng nhập tay giữ nguyên.
 */
export const POST = withAuth(async (req, { params }) => {
    await ensureTables();
    const { id } = await params;
    const { kind } = await req.json();
    const [cp] = await prisma.$queryRaw`SELECT "projectId" FROM "CostProject" WHERE id = ${id}`;
    if (!cp) return NextResponse.json({ error: 'Không tìm thấy công trình' }, { status: 404 });
    if (!cp.projectId) return NextResponse.json({ error: 'Chưa liên kết dự án — bấm "Sửa" để chọn dự án trước' }, { status: 400 });

    if (kind === 'materials') {
        const rows = await buildMaterialRows(cp.projectId);
        const old = await prisma.$queryRaw`SELECT "source","wastePct" FROM "CostMaterial" WHERE "costProjectId" = ${id} AND "source" <> ''`;
        const wasteBySource = new Map(old.map(o => [o.source, toNum(o.wastePct)]));
        await prisma.$transaction([
            prisma.$executeRaw`DELETE FROM "CostMaterial" WHERE "costProjectId" = ${id} AND "source" <> ''`,
            ...rows.map((r, i) => {
                const waste = wasteBySource.get(r.source) || 0;
                const amount = Math.round(r.qty * r.unitPrice * (1 + waste));
                return prisma.$executeRaw`
                    INSERT INTO "CostMaterial" ("id","costProjectId","grp","name","detail","unit","qty","unitPrice","wastePct","amount","sortOrder","source")
                    VALUES (${newId() + i},${id},${r.grp},${r.name},${r.detail},${r.unit},${r.qty},${r.unitPrice},${waste},${amount},${i},${r.source})
                `;
            }),
        ]);
        return NextResponse.json({ count: rows.length, missingPrice: rows.filter(r => !r.unitPrice).map(r => r.name) });
    }

    if (kind === 'labor') {
        const { rows, missingRate } = await buildLaborRows(cp.projectId);
        await prisma.$transaction([
            prisma.$executeRaw`DELETE FROM "CostLabor" WHERE "costProjectId" = ${id} AND "source" <> ''`,
            ...rows.map((r, i) => prisma.$executeRaw`
                INSERT INTO "CostLabor" ("id","costProjectId","category","type","unit","qty","unitPrice","amount","sortOrder","source")
                VALUES (${newId() + i},${id},${r.category},${r.type},${r.unit},${r.qty},${r.unitPrice},${Math.round(r.qty * r.unitPrice)},${i},${r.source})
            `),
        ]);
        return NextResponse.json({ count: rows.length, missingRate });
    }

    return NextResponse.json({ error: 'kind không hợp lệ' }, { status: 400 });
});
