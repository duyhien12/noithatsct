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
 * Uses Prisma ORM (works with both PostgreSQL and SQLite).
 *
 * @param {string} model - Prisma model name (e.g., 'customer', 'project')
 * @param {string} prefix - Code prefix (e.g., 'KH', 'DA')
 * @param {number} padLength - Number of digits (default: 3)
 */
export async function generateCode(model, prefix, padLength = 3) {
    if (!TABLE_MAP[model]) throw new Error(`Unknown model "${model}" in generateCode`);

    // Use $queryRaw to bypass the soft-delete extension (which filters deletedAt:null),
    // so codes from soft-deleted records are never reused (avoids P2002).
    const table = TABLE_MAP[model];
    const records = await prisma.$queryRawUnsafe(
        `SELECT code FROM ${table} WHERE code LIKE $1`,
        `${prefix}%`
    );

    const existing = new Set(records.map(r => r.code));
    const maxNum = records
        .map(r => r.code.slice(prefix.length))
        .filter(s => /^\d+$/.test(s))
        .reduce((max, s) => Math.max(max, Number(s)), 0);

    // Find the first candidate that doesn't already exist
    let candidate = maxNum + 1;
    while (existing.has(`${prefix}${String(candidate).padStart(padLength, '0')}`)) {
        candidate++;
    }
    return `${prefix}${String(candidate).padStart(padLength, '0')}`;
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
