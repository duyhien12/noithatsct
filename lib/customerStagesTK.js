// Giai đoạn khách hàng Phòng Thiết kế — dùng chung cho Kanban (app/customers/page.js) và trang chi tiết khách.
export const PIPELINE_TK = [
    { key: 'Ưu tiên', label: 'Khách chờ', color: '#8b5cf6', bg: '#ede9fe' },
    { key: 'Chăm sóc', label: 'Khách chăm sóc', color: '#3b82f6', bg: '#dbeafe' },
    { key: 'Khách ưu tiên', label: 'Khách ưu tiên', color: '#d946ef', bg: '#fae8ff' },
    { key: 'Hợp đồng', label: 'Khách hợp đồng nội thất', color: '#f97316', bg: '#ffedd5' },
    { key: 'Hợp đồng kiến trúc', label: 'Khách hợp đồng kiến trúc', color: '#0ea5e9', bg: '#e0f2fe' },
    { key: 'Chờ thanh toán', label: 'Khách chờ thanh toán', color: '#14b8a6', bg: '#ccfbf1' },
    { key: 'Hoàn thành', label: 'Khách hoàn thành', color: '#10b981', bg: '#d1fae5' },
    { key: 'Huỷ', label: 'Khách huỷ', color: '#ef4444', bg: '#fee2e2' },
];

// Bảng "Khách hàng TKKT" (thiết kế kiến trúc) — cùng phòng Thiết kế, cùng các cột như PIPELINE_TK,
// phân biệt bằng tiền tố "TKKT " trong pipelineStage. Kéo thẻ giữa 2 bảng để chuyển khách.
export const TKKT_PREFIX = 'TKKT ';
// Mỗi bảng bỏ cột "hợp đồng" của bảng kia: bảng TK không có cột kiến trúc, bảng TKKT không có cột nội thất.
export const PIPELINE_TK_BOARD = PIPELINE_TK.filter(p => p.key !== 'Hợp đồng kiến trúc');
export const PIPELINE_TKKT = PIPELINE_TK.filter(p => p.key !== 'Hợp đồng').map(p => ({ ...p, key: TKKT_PREFIX + p.key }));
export const isTKKTStage = (s) => (s || '').startsWith(TKKT_PREFIX);

// Map stage cũ (kinh doanh) → stage TK khi hiển thị kanban TK
export const TK_STAGE_MAP = {
    'Tư vấn': 'Ưu tiên',
    'Tiềm năng': 'Ưu tiên',
    'Báo giá': 'Ưu tiên',
    'Thi công': 'Hợp đồng',
    'Khách huỷ': 'Hoàn thành',
};

// Cột (key) mà khách đang nằm trên bảng TK/TKKT — stage cũ của kinh doanh quy về cột tương ứng
export const tkBoardStage = (s) => {
    if (isTKKTStage(s)) return s;
    const raw = s || 'Ưu tiên';
    return TK_STAGE_MAP[raw] || raw;
};
