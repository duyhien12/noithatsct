import { describe, it, expect } from 'vitest';
import {
    formatCurrency,
    formatCompact,
    formatNumber,
    formatPercent,
    formatDate,
    formatDateShort,
    formatPhone,
    initials,
    truncate,
} from '@/lib/format';

describe('formatCurrency', () => {
    it('làm tròn đến đồng, không có phần thập phân thừa', () => {
        expect(formatCurrency(35966666.667)).toBe('35.966.667 ₫');
    });

    it('định dạng theo chuẩn Việt Nam', () => {
        expect(formatCurrency(1250000000)).toBe('1.250.000.000 ₫');
    });

    it('có thể bỏ ký hiệu tiền tệ', () => {
        expect(formatCurrency(1000, { symbol: false })).toBe('1.000');
    });

    it('trả về giá trị mặc định khi không có số', () => {
        expect(formatCurrency(null)).toBe('0 ₫');
        expect(formatCurrency('abc')).toBe('0 ₫');
    });
});

describe('formatCompact', () => {
    it('rút gọn theo tỷ', () => {
        expect(formatCompact(1250000000)).toBe('1,25 tỷ');
    });

    it('rút gọn theo triệu', () => {
        expect(formatCompact(35000000)).toBe('35 triệu');
    });

    it('giữ dấu âm', () => {
        expect(formatCompact(-2000000000)).toBe('-2 tỷ');
    });

    it('số nhỏ giữ nguyên', () => {
        expect(formatCompact(850)).toBe('850');
    });
});

describe('formatNumber / formatPercent', () => {
    it('phân tách hàng nghìn', () => {
        expect(formatNumber(1234567)).toBe('1.234.567');
    });

    it('phần trăm mặc định không có thập phân', () => {
        expect(formatPercent(75)).toBe('75%');
    });

    it('phần trăm có thể làm tròn 1 chữ số', () => {
        expect(formatPercent(12.345, { decimals: 1 })).toBe('12,3%');
    });

    it('phần trăm có thể hiện dấu cộng', () => {
        expect(formatPercent(8, { sign: true })).toBe('+8%');
    });
});

describe('formatDate', () => {
    it('định dạng dd/mm/yyyy', () => {
        expect(formatDate('2026-09-15T00:00:00')).toBe('15/09/2026');
    });

    it('dạng ngắn dd/mm', () => {
        expect(formatDateShort('2026-09-15T00:00:00')).toBe('15/09');
    });

    it('ngày không hợp lệ trả về chuỗi rỗng', () => {
        expect(formatDate('không-phải-ngày')).toBe('');
    });
});

describe('formatPhone', () => {
    it('tách nhóm số điện thoại 10 chữ số', () => {
        expect(formatPhone('0901234567')).toBe('0901 234 567');
    });

    it('chuyển đầu số +84 về 0', () => {
        expect(formatPhone('+84901234567')).toBe('0901 234 567');
    });

    it('giữ nguyên chuỗi không đúng định dạng', () => {
        expect(formatPhone('123')).toBe('123');
    });
});

describe('initials / truncate', () => {
    it('lấy chữ cái họ và tên gọi', () => {
        expect(initials('Nguyễn Văn An')).toBe('NA');
    });

    it('tên một chữ lấy 2 ký tự đầu', () => {
        expect(initials('Long')).toBe('LO');
    });

    it('cắt gọn chuỗi dài', () => {
        expect(truncate('abcdefghij', 5)).toBe('abcd…');
    });
});
