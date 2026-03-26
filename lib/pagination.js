/**
 * Parse pagination params from URL search params.
 */
export function parsePagination(searchParams) {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

/**
 * Build paginated response object.
 */
export function paginatedResponse(data, total, { page, limit }) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
