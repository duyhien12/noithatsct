/**
 * Prisma client extension for soft delete.
 * Models with `deletedAt` field will be:
 * - Filtered out from findMany/findFirst/findUnique/count (unless explicitly including deleted)
 * - Soft-deleted (set deletedAt) instead of hard-deleted on delete/deleteMany
 *
 * Uses Prisma $extends (replaces deprecated $use middleware removed in Prisma 6).
 */

const SOFT_DELETE_MODELS = [
    'Customer', 'Project', 'Product', 'Quotation', 'Contract',
    'Contractor', 'Supplier', 'Employee', 'WorkOrder', 'ProjectExpense',
];

function modelKey(model) {
    return model.charAt(0).toLowerCase() + model.slice(1);
}

export function withSoftDelete(basePrisma) {
    let extended;

    extended = basePrisma.$extends({
        query: {
            $allModels: {
                async findMany({ model, args, query }) {
                    if (!SOFT_DELETE_MODELS.includes(model)) return query(args);
                    if (!args.where) args.where = {};
                    if (args.where.deletedAt === undefined) args.where.deletedAt = null;
                    return query(args);
                },

                async findFirst({ model, args, query }) {
                    if (!SOFT_DELETE_MODELS.includes(model)) return query(args);
                    if (!args.where) args.where = {};
                    if (args.where.deletedAt === undefined) args.where.deletedAt = null;
                    return query(args);
                },

                async findUnique({ model, args, query }) {
                    if (!SOFT_DELETE_MODELS.includes(model)) return query(args);
                    if (args.where?.deletedAt !== undefined) return query(args);
                    // Convert to findFirst to add deletedAt filter
                    // (findUnique where clause only accepts unique fields)
                    return extended[modelKey(model)].findFirst({
                        ...args,
                        where: { ...args.where, deletedAt: null },
                    });
                },

                async findUniqueOrThrow({ model, args, query }) {
                    if (!SOFT_DELETE_MODELS.includes(model)) return query(args);
                    if (args.where?.deletedAt !== undefined) return query(args);
                    const result = await extended[modelKey(model)].findFirst({
                        ...args,
                        where: { ...args.where, deletedAt: null },
                    });
                    if (!result) {
                        const error = new Error(`No ${model} found`);
                        error.code = 'P2025';
                        throw error;
                    }
                    return result;
                },

                async count({ model, args, query }) {
                    if (!SOFT_DELETE_MODELS.includes(model)) return query(args);
                    if (!args.where) args.where = {};
                    if (args.where.deletedAt === undefined) args.where.deletedAt = null;
                    return query(args);
                },

                async delete({ model, args, query }) {
                    if (!SOFT_DELETE_MODELS.includes(model)) return query(args);
                    // Soft delete: update deletedAt instead of real delete
                    return basePrisma[modelKey(model)].update({
                        where: args.where,
                        data: { deletedAt: new Date() },
                    });
                },

                async deleteMany({ model, args, query }) {
                    if (!SOFT_DELETE_MODELS.includes(model)) return query(args);
                    return basePrisma[modelKey(model)].updateMany({
                        where: args.where || {},
                        data: { deletedAt: new Date() },
                    });
                },
            },
        },
    });

    return extended;
}
