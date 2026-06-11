import { withAuth } from '@/lib/apiHandler';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Parse số thập phân VN: "1.500.000", "1,500", "1.57"
function parseVNNumber(str) {
    if (!str) return 0;
    const s = String(str).replace(/[^\d.,]/g, '');
    if (!s) return 0;
    if ((s.match(/\./g) || []).length > 1) return parseFloat(s.replace(/\./g, '')) || 0;
    if ((s.match(/,/g) || []).length > 1) return parseFloat(s.replace(/,/g, '')) || 0;
    if (s.includes('.') && s.split('.')[1]?.length === 3) return parseFloat(s.replace('.', '')) || 0;
    return parseFloat(s.replace(',', '.')) || 0;
}

const SKIP_LINES = ['tổng cộng', 'tổng tiền', 'grand total', 'bằng chữ',
    'ký tên', 'đại diện', 'giám đốc', 'kế toán', 'người mua', 'người bán',
    'chữ ký', 'cộng tiền', 'số tiền bằng', 'hotline', 'địa chỉ', 'website',
    'zalo', 'facebook', 'kính gửi', 'trân trọng'];

// Đơn vị tính — thứ tự quan trọng: dài hơn trước để tránh nhầm "m" vào "m2"
const UNITS = ['m2', 'm3', 'md', 'cái', 'chiếc', 'bộ', 'tấm', 'cuộn', 'kg',
    'lít', 'lit', 'ml', 'thanh', 'cây', 'viên', 'hộp', 'thùng', 'bình',
    'chai', 'bản', 'con', 'tấm', 'bảng', 'bộ'];

// Tìm đơn vị trong dòng — trả về {unit, index} hoặc null
function findUnit(line) {
    const low = line.toLowerCase();
    for (const u of UNITS) {
        // word boundary: trước và sau phải là space hoặc đầu/cuối
        const rx = new RegExp(`(?:^|\\s)(${u})(?:\\s|$)`, 'i');
        const m = low.match(rx);
        if (m) {
            const idx = low.indexOf(m[1], m.index);
            return { unit: m[1], index: idx, length: m[1].length };
        }
    }
    return null;
}

// Kiểm tra dòng có phải chữ Việt thực sự không (có ký tự a-z/unicode)
function hasVietnameseText(str) {
    return /[a-zA-ZÀ-ỹ]{2,}/.test(str);
}

// Parser chính: dùng đơn vị tính làm "neo" để tách tên và số lượng
function parsePdfText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const rows = [];

    for (const line of lines) {
        const low = line.toLowerCase();

        // Bỏ dòng tổng, chữ ký, thông tin công ty
        if (SKIP_LINES.some(w => low.includes(w))) continue;

        // Bỏ dòng toàn số / quá ngắn / header
        if (/^[\d\s.,\-\/]+$/.test(line)) continue;
        if (line.length < 4) continue;
        if (low === 'stt' || low.includes('hạng mục') && low.includes('chất liệu')) continue;

        const unitInfo = findUnit(line);

        if (unitInfo) {
            // ── Có đơn vị: tách tên = trước ĐVT, qty = sau ĐVT ────────────
            let namePart = line.slice(0, unitInfo.index).trim();

            // Bỏ STT đầu dòng (số 1–3 chữ số)
            namePart = namePart.replace(/^\d{1,3}\s+/, '');
            // Bỏ kích thước cuối tên (chuỗi số và dấu chấm cuối cùng)
            namePart = namePart.replace(/[\s]+[\d.,]+(\s+[\d.,]+)*\s*$/, '').trim();
            // Bỏ dấu gạch ngang đầu dòng
            namePart = namePart.replace(/^[-–•\s]+/, '').trim();

            if (!namePart || namePart.length < 3 || !hasVietnameseText(namePart)) continue;

            // Số ngay sau đơn vị = khối lượng/số lượng
            const afterUnit = line.slice(unitInfo.index + unitInfo.length).trim();
            const qtyMatch  = afterUnit.match(/^([\d.,]+)/);
            const qty = qtyMatch ? (parseVNNumber(qtyMatch[1]) || 1) : 1;

            // Số lớn cuối dòng = giá (nếu có)
            const allNums = [...afterUnit.matchAll(/[\d.,]+/g)].map(m => parseVNNumber(m[0]));
            const prices  = allNums.filter(n => n >= 1000);
            const salePrice = prices.length > 0 ? prices[prices.length - 1] : 0;

            rows.push({ name: namePart, unit: unitInfo.unit, qty, salePrice });

        } else {
            // ── Không có đơn vị: chỉ lấy nếu trông như tên hàng rõ ràng ───
            // Bỏ qua dòng toàn số, quá ngắn, hoặc chỉ là kích thước
            if (!hasVietnameseText(line)) continue;

            let namePart = line
                .replace(/^\d{1,3}\s+/, '')   // bỏ STT
                .replace(/[-–•]\s*/, '')        // bỏ gạch đầu dòng
                .replace(/\s+[\d.,]+\s*$/, '') // bỏ số cuối
                .trim();

            if (!namePart || namePart.length < 4 || !hasVietnameseText(namePart)) continue;

            // Bỏ các dòng chỉ là thông tin công ty / tiêu đề
            if (/^(tầng|phòng|khu vực|khu|hạng mục)\s*\d*/i.test(namePart.toLowerCase())) {
                // Đây là header tầng/phòng — bỏ qua
                continue;
            }

            // Thử tìm giá ở cuối dòng gốc
            const priceMatch = [...line.matchAll(/[\d.,]+/g)].map(m => parseVNNumber(m[0])).filter(n => n >= 10000);
            const salePrice  = priceMatch.length > 0 ? priceMatch[priceMatch.length - 1] : 0;

            rows.push({ name: namePart, unit: '', qty: 1, salePrice });
        }
    }

    return rows;
}

export const POST = withAuth(async (request) => {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return NextResponse.json({ error: 'Không có file' }, { status: 400 });

        const mimeType = file.type || '';
        if (!mimeType.includes('pdf') && !file.name?.toLowerCase().endsWith('.pdf')) {
            return NextResponse.json({ error: 'Chỉ chấp nhận file PDF' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Import trực tiếp lib để tránh bug pdf-parse chạy test khi import
        const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text || '';

        if (!text.trim()) {
            return NextResponse.json({ error: 'PDF không có text (có thể là file scan ảnh, chưa hỗ trợ)' }, { status: 422 });
        }

        const rows = parsePdfText(text);

        return NextResponse.json({
            rows,
            pageCount: pdfData.numpages,
            rawText: text.slice(0, 2000), // preview text để debug
        });
    } catch (err) {
        console.error('parse-pdf error:', err);
        return NextResponse.json({ error: 'Lỗi xử lý PDF: ' + err.message }, { status: 500 });
    }
});
