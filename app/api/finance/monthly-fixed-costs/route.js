import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

const EDIT_ROLES = ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt', 'kinh_doanh'];

// Normalize rows from raw SQL (BigInt → Number)
function normalize(rows) {
    return rows.map(r => ({
        id:          Number(r.id),
        year:        Number(r.year),
        month:       Number(r.month),
        rowKey:      r.rowKey,
        amount:      Number(r.amount),
        description: r.description ?? null,
        createdAt:   r.createdAt,
        updatedAt:   r.updatedAt,
    }));
}

// GET – danh sách phiếu theo năm
export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const year  = parseInt(searchParams.get('year')  || new Date().getFullYear());
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')) : null;

    const rows = month
        ? await prisma.$queryRaw`
            SELECT id, year, month, "rowKey", amount, description, "createdAt", "updatedAt"
            FROM "MonthlyFixedCost"
            WHERE year = ${year} AND month = ${month}
            ORDER BY month ASC, "createdAt" ASC`
        : await prisma.$queryRaw`
            SELECT id, year, month, "rowKey", amount, description, "createdAt", "updatedAt"
            FROM "MonthlyFixedCost"
            WHERE year = ${year}
            ORDER BY month ASC, "createdAt" ASC`;

    return Response.json({ entries: normalize(rows) });
});

// POST – tạo phiếu mới
export const POST = withAuth(async (req, _ctx, session) => {
    if (!EDIT_ROLES.includes(session?.user?.role)) {
        return Response.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const { year, month, rowKey, amount, description } = await req.json();
    if (!year || !month || !rowKey || amount == null) {
        return Response.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const rows = await prisma.$queryRaw`
        INSERT INTO "MonthlyFixedCost" (year, month, "rowKey", amount, description, "createdAt", "updatedAt")
        VALUES (${Number(year)}, ${Number(month)}, ${rowKey}, ${Number(amount) || 0}, ${description?.trim() || null}, NOW(), NOW())
        RETURNING id, year, month, "rowKey", amount, description, "createdAt", "updatedAt"`;

    return Response.json({ entry: normalize(rows)[0] });
}, { requireAuth: true });

// PUT – cập nhật phiếu
export const PUT = withAuth(async (req, _ctx, session) => {
    if (!EDIT_ROLES.includes(session?.user?.role)) {
        return Response.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const { id, amount, description, month, rowKey } = await req.json();
    if (!id) return Response.json({ error: 'Thiếu id' }, { status: 400 });

    const newAmount = amount != null ? Number(amount) : null;
    const newDesc   = description != null ? (description?.trim() || null) : null;
    const newMonth  = month != null ? Number(month) : null;
    const newRowKey = rowKey ?? null;

    const rows = await prisma.$queryRaw`
        UPDATE "MonthlyFixedCost"
        SET amount      = CASE WHEN ${newAmount}::float8 IS NOT NULL THEN ${newAmount}::float8 ELSE amount END,
            description = CASE WHEN ${newDesc} IS NOT NULL THEN ${newDesc} ELSE description END,
            month       = CASE WHEN ${newMonth}::int IS NOT NULL THEN ${newMonth}::int ELSE month END,
            "rowKey"    = CASE WHEN ${newRowKey} IS NOT NULL THEN ${newRowKey} ELSE "rowKey" END,
            "updatedAt" = NOW()
        WHERE id = ${Number(id)}
        RETURNING id, year, month, "rowKey", amount, description, "createdAt", "updatedAt"`;

    return Response.json({ entry: normalize(rows)[0] });
}, { requireAuth: true });

// DELETE – xoá phiếu
export const DELETE = withAuth(async (req, _ctx, session) => {
    if (!EDIT_ROLES.includes(session?.user?.role)) {
        return Response.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return Response.json({ error: 'Thiếu id' }, { status: 400 });

    await prisma.$queryRaw`DELETE FROM "MonthlyFixedCost" WHERE id = ${id}`;
    return Response.json({ ok: true });
}, { requireAuth: true });
