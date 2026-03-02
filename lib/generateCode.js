import prisma from '@/lib/prisma';

// Map Prisma model name → actual DB table name
const TABLE_MAP = {
    customer: '"Customer"',
    project: '"Project"',
    product: '"Product"',
    quotation: '"Quotation"',
    contract: '"Contract"',
    contractor: '"Contractor"',
    supplier: '"Supplier"',
    employee: '"Employee"',
    workOrder: '"WorkOrder"',
    projectExpense: '"ProjectExpense"',
    inventoryTransaction: '"InventoryTransaction"',
    transaction: '"Transaction"',
    purchaseOrder: '"PurchaseOrder"',
    materialRequisition: '"MaterialRequisition"',
};

const MAX_RETRIES = 3;

/**
 * Generate next sequential code for a model.
 * Uses raw SQL with numeric CAST to find the true max code number,
 * then retries on unique constraint violation (race condition safe).
 *
 * @param {string} model - Prisma model name (e.g., 'customer', 'project')
 * @param {string} prefix - Code prefix (e.g., 'KH', 'DA')
 * @param {number} padLength - Number of digits (default: 3)
 */
export async function generateCode(model, prefix, padLength = 3) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const tableName = TABLE_MAP[model];
            if (!tableName) {
                throw new Error(`Unknown model "${model}" in generateCode`);
            }

            // Use raw SQL for correct numeric max (string sort is wrong: SP9 > SP10)
            // Filter with regex to avoid CAST errors on non-numeric suffixes
            const result = await prisma.$queryRawUnsafe(
                `SELECT COALESCE(MAX(CAST(REPLACE(code, $1, '') AS INTEGER)), 0) as max_num
                 FROM ${tableName}
                 WHERE code LIKE $2
                   AND REPLACE(code, $1, '') ~ '^[0-9]+$'`,
                prefix,
                `${prefix}%`
            );

            const maxNum = Number(result?.[0]?.max_num ?? 0);
            const nextNum = maxNum + 1 + attempt; // bump on retry

            return `${prefix}${String(nextNum).padStart(padLength, '0')}`;
        } catch (err) {
            // P2002 = Prisma unique constraint violation — retry with next number
            if (err.code === 'P2002' && attempt < MAX_RETRIES - 1) {
                continue;
            }
            throw err;
        }
    }
}

/**
 * Retry wrapper: generates code then calls createFn(code).
 * Retries on P2002 unique constraint violation (race condition between generate + create).
 *
 * Usage:
 *   const result = await withCodeRetry('product', 'SP', (code) =>
 *       prisma.product.create({ data: { code, ...data } })
 *   );
 *
 * @param {string} model - Prisma model name
 * @param {string} prefix - Code prefix
 * @param {Function} createFn - async (code: string) => created record
 * @param {number} padLength - Number of digits (default: 3)
 */
export async function withCodeRetry(model, prefix, createFn, padLength = 3) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const code = await generateCode(model, prefix, padLength);
            return await createFn(code);
        } catch (err) {
            if (err.code === 'P2002' && attempt < MAX_RETRIES - 1) {
                continue;
            }
            throw err;
        }
    }
}
