/**
 * Phân quyền cho Trợ lý AI (project-assistant) theo role người dùng.
 * scope quyết định: (1) danh sách tool được truyền cho Claude, (2) dữ liệu
 * mà từng tool trả về (xem lib/aiAssistant/tools.js).
 */

// Danh sách email được dùng Trợ lý AI (kiểm tra ở cả client lẫn server — xem
// app/api/ai/project-assistant/route.js và components/GlobalAIAssistant.js)
export const AI_ASSISTANT_ALLOWED_EMAILS = ['duyhien@kientrucsct.com'];

export function canUseAIAssistant(email) {
    return AI_ASSISTANT_ALLOWED_EMAILS.includes(email || '');
}

// Trợ lý Hồ sơ AI (soạn biên bản/nhật ký/checklist/văn bản hành chính) — tính năng riêng,
// đang ở giai đoạn thử nghiệm nên dùng danh sách email cấp quyền thủ công thay vì theo role.
// Pilot phòng Hành chính - Kế toán: Bùi Thị Hoa (kế toán trưởng), Nguyễn Thị Ngọc Lan
// (kế toán viên kiêm văn phòng), Trương Thị Hương.
export const DOCUMENT_ASSISTANT_ALLOWED_EMAILS = [
    'duyhien@kientrucsct.com',
    'admin@kientrucsct.com', // tài khoản Ban GĐ dùng để xem thử trước khi giao cho Hoa/Lan
    'buihoa@kientrucsct.com',
    'ngoclan@kientrucsct.com',
    'truonghuong@kientrucsct.com',
];

export function canUseDocumentAssistant(email) {
    return DOCUMENT_ASSISTANT_ALLOWED_EMAILS.includes(email || '');
}

const ROLE_SCOPE = {
    ban_gd: 'all',
    giam_doc: 'all',
    pho_gd: 'all',
    admin: 'all',
    ke_toan: 'finance',
    hanh_chinh_kt: 'finance',
    kinh_doanh: 'sales',
    xuong: 'production',
};

export function getScope(role) {
    return ROLE_SCOPE[role] || 'general';
}

export const SCOPE_TOOLS = {
    all: ['getProjectSummary', 'searchProjects', 'getProjectDetail', 'suggestNextActions', 'createTaskDraft', 'createReportDraft', 'checkProjectRisks'],
    finance: ['getProjectSummary', 'searchProjects', 'getProjectDetail', 'suggestNextActions', 'createReportDraft', 'checkProjectRisks'],
    sales: ['getProjectSummary', 'searchProjects', 'getProjectDetail', 'suggestNextActions', 'createTaskDraft', 'createReportDraft', 'checkProjectRisks'],
    production: ['getProjectSummary', 'searchProjects', 'getProjectDetail', 'suggestNextActions', 'createTaskDraft', 'createReportDraft', 'checkProjectRisks'],
    general: ['getProjectSummary', 'searchProjects', 'getProjectDetail'],
};

export const SCOPE_LABEL = {
    all: 'Ban giám đốc / Quản trị',
    finance: 'Kế toán / Tài chính',
    sales: 'Kinh doanh',
    production: 'Xưởng sản xuất',
    general: 'Nhân viên',
};

export const SCOPE_SYSTEM_PROMPT = {
    all: 'Người dùng thuộc Ban giám đốc/Quản trị — được xem toàn bộ thông tin dự án, tài chính, khách hàng, sản xuất và được tạo bản nháp tác vụ/báo cáo bất kỳ loại nào.',
    finance: 'Người dùng thuộc phòng Kế toán — CHỈ được trả lời các câu hỏi về tài chính: công nợ, thu/chi, ngân sách, thanh toán, chi phí dự án. KHÔNG được tiết lộ thông tin khách hàng, báo giá, hợp đồng kinh doanh, hay chi tiết thi công/sản xuất. KHÔNG được tạo tác vụ (task). Nếu bị hỏi ngoài phạm vi này, hãy từ chối lịch sự và giải thích đây là giới hạn quyền của phòng Kế toán.',
    sales: 'Người dùng thuộc phòng Kinh doanh — CHỈ được trả lời các câu hỏi về khách hàng, báo giá, hợp đồng, pipeline bán hàng, tiến độ chung của dự án. KHÔNG được tiết lộ số liệu ngân sách/chi phí thực tế nội bộ hay chi tiết sản xuất tại xưởng. Nếu bị hỏi ngoài phạm vi này, hãy từ chối lịch sự.',
    production: 'Người dùng thuộc Xưởng sản xuất — CHỈ được trả lời các câu hỏi về đơn hàng sản xuất, phiếu việc (work order), tiến độ xưởng. KHÔNG được tiết lộ số liệu tài chính, hợp đồng, hay thông tin khách hàng. Nếu bị hỏi ngoài phạm vi này, hãy từ chối lịch sự.',
    general: 'Người dùng chỉ được xem thông tin tổng quan (trạng thái, tiến độ chung) của dự án, KHÔNG được xem số liệu tài chính, khách hàng chi tiết, và KHÔNG được tạo tác vụ/báo cáo. Nếu bị hỏi ngoài phạm vi này, hãy từ chối lịch sự.',
};

export function canCreateTask(scope) {
    return scope === 'all' || scope === 'sales' || scope === 'production';
}

const REPORT_TYPES_BY_SCOPE = {
    all: ['finance', 'sales', 'production', 'general'],
    finance: ['finance'],
    sales: ['sales', 'general'],
    production: ['production', 'general'],
    general: [],
};

export function canCreateReport(scope, type) {
    return (REPORT_TYPES_BY_SCOPE[scope] || []).includes(type);
}
