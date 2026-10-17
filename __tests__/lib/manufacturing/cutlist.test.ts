import { describe, it, expect } from 'vitest';
import {
    panelAreaM2, panelEdgeMeters, parseEdgeSpec, fitsSheet, checkCutlist, summarizeCutlist,
    compareWithStock, sanitizeLine, getCutlistPermissions,
} from '@/lib/manufacturing/cutlist';

const VAN = { id: 'm1', sku: 'VCN-001', name: 'AC', colorCode: '101', length: 2440, width: 1220, thickness: 17, category: { code: 'VCN' }, stockUnit: { code: 'tấm' } };
const CHI = { id: 'm2', sku: 'NCC-001', name: 'Chỉ PVC', colorCode: '101', length: 0, width: 0, thickness: 0, category: { code: 'NCC' }, stockUnit: { code: 'mét' } };
const BAN_LE = { id: 'm3', sku: 'PK-001', name: 'Bản lề giảm chấn', colorCode: '', length: 0, width: 0, thickness: 0, category: { code: 'PK' }, stockUnit: { code: 'cái' } };

const panel = (over = {}) => ({
    lineType: 'PANEL', mfgItemId: 'i1', partName: 'Hông', materialId: VAN.id, material: VAN,
    length: 720, width: 560, thickness: 0, quantity: 2, grainLocked: false,
    edgeMaterialId: CHI.id, edgeMaterial: CHI, edgeL1: true, edgeL2: false, edgeW1: true, edgeW2: true,
    drawingPage: 'T3', ...over,
});
const header = { drawingRef: 'TuBep.pdf', wastePercent: 10, purGramPerMeter: 2 };

describe('panelAreaM2 / panelEdgeMeters', () => {
    it('tính m² và mét chỉ theo cạnh dán × SL', () => {
        const l = panel();
        expect(panelAreaM2(l)).toBeCloseTo(0.72 * 0.56 * 2, 6);
        // (720×1 + 560×2) × 2 / 1000 = 3.68 m
        expect(panelEdgeMeters(l)).toBeCloseTo(3.68, 6);
    });
});

describe('parseEdgeSpec', () => {
    it('đọc nhiều kiểu ký hiệu cạnh', () => {
        expect(parseEdgeSpec('D1 D2 R1')).toEqual({ edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: false });
        expect(parseEdgeSpec('L1,W2')).toEqual({ edgeL1: true, edgeL2: false, edgeW1: false, edgeW2: true });
        expect(parseEdgeSpec('2D1R')).toEqual({ edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: false });
        expect(parseEdgeSpec('4')).toEqual({ edgeL1: true, edgeL2: true, edgeW1: true, edgeW2: true });
        expect(parseEdgeSpec('')).toEqual({ edgeL1: false, edgeL2: false, edgeW1: false, edgeW2: false });
    });
});

describe('fitsSheet', () => {
    it('cho xoay khi không theo vân, không cho xoay khi theo vân', () => {
        expect(fitsSheet(panel({ length: 1200, width: 2400 }))).toBe(true);
        expect(fitsSheet(panel({ length: 1200, width: 2400, grainLocked: true }))).toBe(false);
        expect(fitsSheet(panel({ length: 2500, width: 600 }))).toBe(false);
        expect(fitsSheet(panel({ material: { ...VAN, length: 0 } }))).toBeNull();
    });
});

describe('checkCutlist', () => {
    it('bảng hợp lệ không có lỗi', () => {
        const issues = checkCutlist(header, [panel()]);
        expect(issues.filter(i => i.severity === 'error')).toEqual([]);
    });

    it('bắt thiếu nguồn bản vẽ, vượt khổ, lệch độ dày, thiếu mã chỉ', () => {
        const issues = checkCutlist({ ...header, drawingRef: '' }, [
            panel({ length: 2600 }),
            panel({ partName: 'Đáy', thickness: 9 }),
            panel({ partName: 'Hậu', edgeMaterialId: null, edgeMaterial: null }),
        ]);
        const msgs = issues.filter(i => i.severity === 'error').map(i => i.message).join('\n');
        expect(msgs).toMatch(/nguồn bản vẽ/);
        expect(msgs).toMatch(/vượt khổ tấm/);
        expect(msgs).toMatch(/khác độ dày/);
        expect(msgs).toMatch(/chưa chọn mã chỉ cạnh/);
    });

    it('cảnh báo dòng trùng và thiếu định mức keo', () => {
        const issues = checkCutlist({ ...header, purGramPerMeter: null }, [panel(), panel()]);
        const warns = issues.filter(i => i.severity === 'warn').map(i => i.message).join('\n');
        expect(warns).toMatch(/trùng với dòng 1/);
        expect(warns).toMatch(/keo PUR/);
    });

    it('cảnh báo đơn vị dòng khác đơn vị kho', () => {
        const issues = checkCutlist(header, [{ lineType: 'ITEM', mfgItemId: 'i1', materialId: BAN_LE.id, material: BAN_LE, quantity: 4, unit: 'bộ', drawingPage: 'T3' }]);
        expect(issues.some(i => i.severity === 'warn' && /đơn vị kho/.test(i.message))).toBe(true);
    });
});

describe('summarizeCutlist + compareWithStock', () => {
    it('cộng theo mã, tính hao hụt, số tấm làm tròn lên, keo PUR theo định mức', () => {
        const lines = [
            panel(),
            panel({ partName: 'Nóc', length: 1000, width: 560, quantity: 1, edgeL1: true, edgeW1: false, edgeW2: false }),
            { lineType: 'ITEM', materialId: BAN_LE.id, material: BAN_LE, quantity: 4, unit: 'cái' },
            { lineType: 'ITEM', materialId: BAN_LE.id, material: BAN_LE, quantity: 2, unit: 'cái' },
        ];
        const s = summarizeCutlist(header, lines);
        expect(s.panels).toHaveLength(1);
        const area = 0.72 * 0.56 * 2 + 1.0 * 0.56;
        expect(s.panels[0].areaM2).toBeCloseTo(area, 3);
        expect(s.panels[0].areaWithWaste).toBeCloseTo(area * 1.1, 3);
        expect(s.panels[0].sheetsEstimate).toBe(Math.ceil((area * 1.1) / (2.44 * 1.22)));
        const meters = 3.68 + 1.0;
        expect(s.edges[0].metersWithWaste).toBeCloseTo(meters * 1.1, 2);
        expect(s.pur.kg).toBeCloseTo((meters * 1.1 * 2) / 1000, 3);
        expect(s.items).toEqual([expect.objectContaining({ materialId: BAN_LE.id, quantity: 6, unit: 'cái' })]);

        const cmp = compareWithStock(s, { [VAN.id]: 0, [CHI.id]: 100, [BAN_LE.id]: 5 });
        const byId = Object.fromEntries(cmp.map(r => [r.materialId, r]));
        expect(byId[VAN.id].shortage).toBe(s.panels[0].sheetsEstimate);
        expect(byId[CHI.id].shortage).toBe(0);
        expect(byId[BAN_LE.id].shortage).toBe(1);
    });

    it('không có định mức keo → kg = null; khác đơn vị kho → không so', () => {
        const s = summarizeCutlist({ ...header, purGramPerMeter: null }, [
            panel(),
            { lineType: 'ITEM', materialId: BAN_LE.id, material: BAN_LE, quantity: 2, unit: 'bộ' },
        ]);
        expect(s.pur.kg).toBeNull();
        const row = compareWithStock(s, { [BAN_LE.id]: 10 }).find(r => r.materialId === BAN_LE.id);
        expect(row.required).toBeNull();
        expect(row.shortage).toBeNull();
    });
});

describe('sanitizeLine', () => {
    it('ép kiểu và bỏ field kích thước/cạnh cho dòng ITEM', () => {
        const l = sanitizeLine({ lineType: 'ITEM', length: '100', edgeL1: true, quantity: '3', unit: ' cái ', material: { id: 'x' } }, 5);
        expect(l).toMatchObject({ sortOrder: 5, lineType: 'ITEM', length: 0, edgeL1: false, quantity: 3, unit: 'cái' });
        expect(l).not.toHaveProperty('material');
    });
});

describe('getCutlistPermissions', () => {
    it('Thủ kho sửa được nhưng không duyệt; Quản đốc duyệt được; thợ chỉ xem', () => {
        expect(getCutlistPermissions({ role: 'xuong', department: 'Kho' })).toEqual({ view: true, edit: true, approve: false });
        expect(getCutlistPermissions({ role: 'xuong', department: 'Quản đốc' })).toEqual({ view: true, edit: true, approve: true });
        expect(getCutlistPermissions({ role: 'xuong', department: 'Thợ chính' })).toEqual({ view: true, edit: false, approve: false });
    });
});
