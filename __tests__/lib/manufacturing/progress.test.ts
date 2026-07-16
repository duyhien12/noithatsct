import { describe, it, expect } from 'vitest';
import {
    computeItemProgressFromStages, computeOrderProgressFromItems,
    computeProjectMfgProgress, computeProjectMfgStepState, isOrderLate, daysLate,
} from '@/lib/manufacturing/progress';

describe('computeItemProgressFromStages', () => {
    it('returns 0 when no stages', () => {
        expect(computeItemProgressFromStages([])).toBe(0);
    });

    it('weights by estimatedHours', () => {
        const stages = [
            { status: 'COMPLETED', progressPercent: 100, estimatedHours: 2 },
            { status: 'NOT_STARTED', progressPercent: 0, estimatedHours: 6 },
        ];
        // (100*2 + 0*6) / 8 = 25
        expect(computeItemProgressFromStages(stages)).toBe(25);
    });

    it('falls back to equal weights when no estimatedHours', () => {
        const stages = [
            { status: 'COMPLETED', progressPercent: 100, estimatedHours: 0 },
            { status: 'NOT_STARTED', progressPercent: 0, estimatedHours: 0 },
        ];
        expect(computeItemProgressFromStages(stages)).toBe(50);
    });

    it('ignores CANCELLED stages', () => {
        const stages = [
            { status: 'COMPLETED', progressPercent: 100, estimatedHours: 1 },
            { status: 'CANCELLED', progressPercent: 0, estimatedHours: 1 },
        ];
        expect(computeItemProgressFromStages(stages)).toBe(100);
    });
});

describe('computeOrderProgressFromItems', () => {
    it('ignores CANCELLED items', () => {
        const items = [
            { status: 'COMPLETED', progressPercent: 100 },
            { status: 'CANCELLED', progressPercent: 0 },
        ];
        expect(computeOrderProgressFromItems(items)).toBe(100);
    });

    it('returns 0 for empty/all-cancelled', () => {
        expect(computeOrderProgressFromItems([])).toBe(0);
        expect(computeOrderProgressFromItems([{ status: 'CANCELLED', progressPercent: 50 }])).toBe(0);
    });
});

describe('computeProjectMfgProgress / computeProjectMfgStepState', () => {
    it('returns none state when no orders', () => {
        expect(computeProjectMfgStepState([])).toEqual({ state: 'none', progress: null });
    });

    it('detects late state when an active order is overdue', () => {
        const orders = [
            { status: 'IN_PRODUCTION', progressPercent: 40, plannedEndDate: new Date(Date.now() - 86400000), items: [{}] },
        ];
        const result = computeProjectMfgStepState(orders);
        expect(result.state).toBe('late');
    });

    it('detects completed state when all active orders are done', () => {
        const orders = [
            { status: 'COMPLETED', progressPercent: 100, plannedEndDate: null, items: [{}] },
            { status: 'DELIVERED', progressPercent: 100, plannedEndDate: null, items: [{}] },
        ];
        expect(computeProjectMfgStepState(orders).state).toBe('completed');
    });

    it('detects not_started state when nothing has begun', () => {
        const orders = [{ status: 'DRAFT', progressPercent: 0, plannedEndDate: null, items: [{}] }];
        expect(computeProjectMfgStepState(orders).state).toBe('not_started');
    });

    it('ignores CANCELLED orders entirely', () => {
        expect(computeProjectMfgStepState([{ status: 'CANCELLED', progressPercent: 0, items: [] }]).state).toBe('none');
    });
});

describe('isOrderLate / daysLate', () => {
    it('is not late without plannedEndDate', () => {
        expect(isOrderLate({ status: 'IN_PRODUCTION', plannedEndDate: null })).toBe(false);
    });

    it('is late when plannedEndDate passed and not terminal', () => {
        expect(isOrderLate({ status: 'IN_PRODUCTION', plannedEndDate: new Date(Date.now() - 86400000) })).toBe(true);
    });

    it('is never late once COMPLETED', () => {
        expect(isOrderLate({ status: 'COMPLETED', plannedEndDate: new Date(Date.now() - 86400000) })).toBe(false);
    });

    it('computes positive days late', () => {
        const order = { plannedEndDate: new Date(Date.now() - 3 * 86400000), actualEndDate: new Date() };
        expect(daysLate(order)).toBeGreaterThanOrEqual(2);
    });

    it('returns 0 when not late', () => {
        const order = { plannedEndDate: new Date(Date.now() + 86400000), actualEndDate: null };
        expect(daysLate(order)).toBe(0);
    });
});
