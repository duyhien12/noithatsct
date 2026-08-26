import prisma from '@/lib/prisma';

/** Bỏ dấu tiếng Việt + hạ chữ thường + gộp khoảng trắng, để so khớp gần đúng. */
function normalize(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Cảnh báo (KHÔNG chặn) khi vật tư có dấu hiệu trùng lặp: cùng nhóm + cùng mã màu +
 * cùng kích thước (trùng chính xác), hoặc tên rất giống nhau trong cùng nhóm.
 * Trả về mảng warnings — form vẫn cho tạo tiếp nếu người dùng xác nhận.
 */
export async function findLikelyDuplicates({ id, name, categoryId, colorCode, length, width, thickness }) {
    if (!categoryId) return [];

    const candidates = await prisma.invMaterial.findMany({
        where: { categoryId, deletedAt: null, ...(id ? { id: { not: id } } : {}) },
        select: { id: true, sku: true, name: true, colorCode: true, length: true, width: true, thickness: true, status: true },
        take: 500,
    });

    const warnings = [];
    const normName = normalize(name);

    for (const c of candidates) {
        const sameDimensions = Number(c.length || 0) === Number(length || 0)
            && Number(c.width || 0) === Number(width || 0)
            && Number(c.thickness || 0) === Number(thickness || 0);
        const sameColor = (c.colorCode || '') !== '' && (c.colorCode || '') === (colorCode || '');

        if (sameColor && sameDimensions) {
            warnings.push({
                type: 'EXACT_SPEC_MATCH', materialId: c.id, sku: c.sku, name: c.name,
                message: `Trùng mã màu + kích thước với "${c.sku} — ${c.name}"`,
            });
            continue;
        }

        const cNormName = normalize(c.name);
        if (normName && cNormName && (cNormName === normName || cNormName.includes(normName) || normName.includes(cNormName))) {
            warnings.push({
                type: 'SIMILAR_NAME', materialId: c.id, sku: c.sku, name: c.name,
                message: `Tên gần giống "${c.sku} — ${c.name}"`,
            });
        }
    }

    return warnings;
}
