import { describe, it, expect } from 'vitest';
import { resolveConversionRatio, toStockQuantity } from '@/lib/inventoryV2/units';

const material = {
    stockUnitId: 'u-cai', purchaseUnitId: 'u-hop', issueUnitId: 'u-cai',
    purchaseToStockRatio: 500, // 1 hộp = 500 cái
    issueToStockRatio: 1,
};

describe('resolveConversionRatio — mọi số lượng phải quy về đơn vị tồn chuẩn trước khi tính tồn/giá vốn', () => {
    it('ratio = 1 khi nhập đúng đơn vị tồn', () => {
        expect(resolveConversionRatio(material, 'u-cai')).toBe(1);
    });
    it('ratio = purchaseToStockRatio khi nhập theo đơn vị mua', () => {
        expect(resolveConversionRatio(material, 'u-hop')).toBe(500);
    });
    it('throws khi đơn vị không thuộc 3 đơn vị đã khai báo cho vật tư', () => {
        expect(() => resolveConversionRatio(material, 'u-la')).toThrow();
    });
});

describe('toStockQuantity — ví dụ mục 5 spec: mua 1 hộp gồm 500 vít nhưng có thể xuất 50 cái', () => {
    it('1 hộp → 500 cái', () => {
        expect(toStockQuantity(material, 1, 'u-hop')).toBe(500);
    });
    it('50 cái (đơn vị xuất = đơn vị tồn ở đây) → 50 cái', () => {
        expect(toStockQuantity(material, 50, 'u-cai')).toBe(50);
    });
});
