import { describe, it, expect } from 'vitest';
import { parsePagination, paginatedResponse } from '@/lib/pagination';

describe('parsePagination', () => {
    it('returns defaults for empty params', () => {
        const params = new URLSearchParams();
        const result = parsePagination(params);
        expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    it('parses page and limit', () => {
        const params = new URLSearchParams('page=3&limit=10');
        const result = parsePagination(params);
        expect(result).toEqual({ page: 3, limit: 10, skip: 20 });
    });

    it('enforces min page 1', () => {
        const params = new URLSearchParams('page=-5');
        const result = parsePagination(params);
        expect(result.page).toBe(1);
    });

    it('enforces max limit 500', () => {
        const params = new URLSearchParams('limit=1000');
        const result = parsePagination(params);
        expect(result.limit).toBe(500);
    });
});

describe('paginatedResponse', () => {
    it('builds correct response', () => {
        const data = [{ id: '1' }, { id: '2' }];
        const result = paginatedResponse(data, 50, { page: 2, limit: 10 });

        expect(result.data).toEqual(data);
        expect(result.pagination).toEqual({
            page: 2,
            limit: 10,
            total: 50,
            totalPages: 5,
            hasNext: true,
            hasPrev: true,
        });
    });

    it('hasNext is false on last page', () => {
        const result = paginatedResponse([], 20, { page: 2, limit: 10 });
        expect(result.pagination.hasNext).toBe(false);
    });

    it('hasPrev is false on first page', () => {
        const result = paginatedResponse([], 20, { page: 1, limit: 10 });
        expect(result.pagination.hasPrev).toBe(false);
    });
});
