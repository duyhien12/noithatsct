import prisma from '@/lib/prisma';

const MAX_RETRIES = 3;

/**
 * Sinh SKU tự động theo prefix của nhóm vật tư, dạng "<skuPrefix>-<số thứ tự>",
 * ví dụ nhóm "Ván công nghiệp" (prefix VCN) → VCN-001, VCN-002...
 * Khác lib/generateCode.js (cột "code" cố định, prefix cố định theo model) vì ở đây
 * prefix biến đổi theo từng nhóm vật tư, không theo model.
 */
export async function generateMaterialSku(tx, categoryId, padLength = 3) {
    const category = await tx.invMaterialCategory.findUniqueOrThrow({ where: { id: categoryId } });
    const prefix = `${category.skuPrefix}-`;

    const rows = await tx.$queryRawUnsafe(
        `SELECT sku FROM "InvMaterial" WHERE sku LIKE $1`,
        `${prefix}%`
    );
    const existing = new Set(rows.map(r => r.sku));
    const maxNum = rows
        .map(r => r.sku.slice(prefix.length))
        .filter(s => /^\d+$/.test(s))
        .reduce((max, s) => Math.max(max, Number(s)), 0);

    let candidate = maxNum + 1;
    while (existing.has(`${prefix}${String(candidate).padStart(padLength, '0')}`)) {
        candidate++;
    }
    return `${prefix}${String(candidate).padStart(padLength, '0')}`;
}

/**
 * Sinh SKU giả cho ván thừa: "<skuPrefix nhóm Vật tư thừa>-<mã ngày>-<số thứ tự>",
 * ví dụ VTT-20260826-001, dùng chung cơ chế với generateMaterialSku nhưng thêm mốc ngày
 * để mã ván thừa dễ tra cứu theo lô phát sinh.
 */
export async function generateRemnantCode(tx, padLength = 3) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `VT-${dateStr}-`;

    const rows = await tx.$queryRawUnsafe(
        `SELECT "remnantCode" FROM "InvMaterialRemnant" WHERE "remnantCode" LIKE $1`,
        `${prefix}%`
    );
    const existing = new Set(rows.map(r => r.remnantCode));
    const maxNum = rows
        .map(r => r.remnantCode.slice(prefix.length))
        .filter(s => /^\d+$/.test(s))
        .reduce((max, s) => Math.max(max, Number(s)), 0);

    let candidate = maxNum + 1;
    while (existing.has(`${prefix}${String(candidate).padStart(padLength, '0')}`)) {
        candidate++;
    }
    return `${prefix}${String(candidate).padStart(padLength, '0')}`;
}

/** Retry wrapper — sinh SKU rồi tạo record, thử lại khi đụng unique (race condition). */
export async function withMaterialSkuRetry(categoryId, createFn) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const sku = await generateMaterialSku(prisma, categoryId);
            return await createFn(sku);
        } catch (err) {
            if (err.code === 'P2002' && attempt < MAX_RETRIES - 1) continue;
            throw err;
        }
    }
}
