// Đồng hành 360 — nguồn chân lý duy nhất cho mã trạng thái/ưu tiên/nhóm vấn đề.
// Logic chỉ so sánh MÃ tiếng Anh; nhãn tiếng Việt chỉ dùng để hiển thị.

export const ISSUE_STATUS = Object.freeze({
    NEW: 'NEW',
    IN_PROGRESS: 'IN_PROGRESS',
    WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
    DONE: 'DONE',
    CANCELLED: 'CANCELLED',
});

export const ISSUE_STATUSES = Object.values(ISSUE_STATUS);

export const ISSUE_STATUS_LABELS = {
    NEW: 'Mới tiếp nhận',
    IN_PROGRESS: 'Đang xử lý',
    WAITING_CONFIRMATION: 'Chờ xác nhận',
    DONE: 'Hoàn thành',
    CANCELLED: 'Đã huỷ',
};

// Tone của Badge (components/ui/Badge.js) — theo quy ước màu chung của hệ thống
export const ISSUE_STATUS_TONES = {
    NEW: 'neutral',
    IN_PROGRESS: 'warning',
    WAITING_CONFIRMATION: 'purple',
    DONE: 'success',
    CANCELLED: 'danger',
};

// Trạng thái còn mở (tính quá hạn, KPI "đang mở")
export const OPEN_STATUSES = [ISSUE_STATUS.NEW, ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.WAITING_CONFIRMATION];

// 4 cột của Kanban. Cột là cách NHÓM trạng thái, không phải trạng thái mới:
// "Chờ phối hợp" = đang xử lý và còn phiếu công việc liên kết chưa hoàn thành (tự tính,
// không thả thẻ vào được). CANCELLED chỉ xem qua bộ lọc.
// openWorkOrders: true = phải có phiếu đang mở, false = không có phiếu đang mở, undefined = không xét.
// dropStatus: trạng thái đích khi thả thẻ vào cột (null = không nhận thả).
export const BOARD_COLUMN = Object.freeze({ NEW: 'NEW', IN_PROGRESS: 'IN_PROGRESS', COORDINATION: 'COORDINATION', CLOSING: 'CLOSING' });

export const KANBAN_BOARD = [
    { key: BOARD_COLUMN.NEW, label: 'Mới tiếp nhận', statuses: [ISSUE_STATUS.NEW], dropStatus: ISSUE_STATUS.NEW },
    { key: BOARD_COLUMN.IN_PROGRESS, label: 'Đang xử lý', statuses: [ISSUE_STATUS.IN_PROGRESS], openWorkOrders: false, dropStatus: ISSUE_STATUS.IN_PROGRESS },
    { key: BOARD_COLUMN.COORDINATION, label: 'Chờ phối hợp', statuses: [ISSUE_STATUS.IN_PROGRESS], openWorkOrders: true, dropStatus: null },
    { key: BOARD_COLUMN.CLOSING, label: 'Chờ xác nhận / Hoàn thành', statuses: [ISSUE_STATUS.WAITING_CONFIRMATION, ISSUE_STATUS.DONE], dropStatus: ISSUE_STATUS.WAITING_CONFIRMATION },
];

// Nhãn nút cho từng bước chuyển, khoá `${from}>${to}` (bước hợp lệ nằm ở workflow.TRANSITIONS)
export const TRANSITION_ACTION_LABELS = {
    'NEW>IN_PROGRESS': 'Bắt đầu xử lý',
    'NEW>CANCELLED': 'Huỷ vấn đề',
    'IN_PROGRESS>WAITING_CONFIRMATION': 'Báo đã xử lý xong',
    'IN_PROGRESS>CANCELLED': 'Huỷ vấn đề',
    'WAITING_CONFIRMATION>DONE': 'Xác nhận hoàn thành',
    'WAITING_CONFIRMATION>IN_PROGRESS': 'Chưa đạt — xử lý lại',
    'DONE>IN_PROGRESS': 'Mở lại',
    'CANCELLED>NEW': 'Khôi phục',
};

export const ISSUE_PRIORITY = Object.freeze({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT' });
export const ISSUE_PRIORITIES = Object.values(ISSUE_PRIORITY);

export const ISSUE_PRIORITY_LABELS = {
    LOW: 'Thấp',
    MEDIUM: 'Trung bình',
    HIGH: 'Cao',
    URGENT: 'Khẩn cấp',
};

export const ISSUE_PRIORITY_TONES = {
    LOW: 'neutral',
    MEDIUM: 'warning',
    HIGH: 'primary',
    URGENT: 'danger',
};

// Hạn xử lý mặc định (ngày) khi người dùng không nhập
export const PRIORITY_DUE_DAYS = { LOW: 14, MEDIUM: 7, HIGH: 3, URGENT: 1 };

// Thứ tự sắp xếp: số lớn = gấp hơn
export const PRIORITY_RANK = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

export const ISSUE_CATEGORIES = [
    'CONSTRUCTION_QUALITY', 'FURNITURE', 'MATERIAL', 'ELECTRICAL', 'PLUMBING',
    'WATERPROOFING', 'DESIGN', 'SCHEDULE', 'SERVICE', 'PAYMENT_DOCUMENT', 'OTHER',
];

export const ISSUE_CATEGORY_LABELS = {
    CONSTRUCTION_QUALITY: 'Chất lượng thi công',
    FURNITURE: 'Đồ nội thất',
    MATERIAL: 'Vật tư/vật liệu',
    ELECTRICAL: 'Điện',
    PLUMBING: 'Cấp thoát nước',
    WATERPROOFING: 'Thấm dột',
    DESIGN: 'Thiết kế',
    SCHEDULE: 'Tiến độ',
    SERVICE: 'Thái độ/dịch vụ',
    PAYMENT_DOCUMENT: 'Thanh toán/hồ sơ',
    OTHER: 'Khác',
};

export const ISSUE_SOURCES = ['PHONE', 'ZALO', 'EMAIL', 'SITE', 'MEETING', 'OTHER'];

export const ISSUE_SOURCE_LABELS = {
    PHONE: 'Điện thoại',
    ZALO: 'Zalo',
    EMAIL: 'Email',
    SITE: 'Tại công trình',
    MEETING: 'Gặp trực tiếp',
    OTHER: 'Khác',
};

export const ATTACHMENT_CATEGORY = Object.freeze({ BEFORE: 'BEFORE', DURING: 'DURING', AFTER: 'AFTER', DOCUMENT: 'DOCUMENT' });
export const ATTACHMENT_CATEGORIES = Object.values(ATTACHMENT_CATEGORY);

export const ATTACHMENT_CATEGORY_LABELS = {
    BEFORE: 'Trước xử lý',
    DURING: 'Trong quá trình xử lý',
    AFTER: 'Sau xử lý',
    DOCUMENT: 'Tài liệu',
};

// Loại upload tái sử dụng của /api/upload (không thêm loại mới)
export const ISSUE_UPLOAD_TYPE = 'proofs';

// Giới hạn tệp. Ảnh (BEFORE/DURING/AFTER) chỉ nhận định dạng ảnh phổ biến; DOCUMENT nhận thêm tài liệu văn phòng.
export const PHOTO_CATEGORIES = [ATTACHMENT_CATEGORY.BEFORE, ATTACHMENT_CATEGORY.DURING, ATTACHMENT_CATEGORY.AFTER];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
export const DOCUMENT_EXTENSIONS = [...IMAGE_EXTENSIONS, 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'dwg', 'zip'];
export const ATTACHMENT_MAX_MB = { photo: 10, document: 25 };

export const LOG_ACTION = Object.freeze({
    CREATED: 'CREATED',
    UPDATED: 'UPDATED',
    ASSIGNED: 'ASSIGNED',
    COLLABORATOR_ADDED: 'COLLABORATOR_ADDED',
    COLLABORATOR_REMOVED: 'COLLABORATOR_REMOVED',
    STATUS_CHANGED: 'STATUS_CHANGED',
    FILE_ADDED: 'FILE_ADDED',
    FILE_REMOVED: 'FILE_REMOVED',
    WORK_ORDER_CREATED: 'WORK_ORDER_CREATED',
    WORK_ORDER_LINKED: 'WORK_ORDER_LINKED',
    WORK_ORDER_COMPLETED: 'WORK_ORDER_COMPLETED',
    NOTE: 'NOTE',
    DELETED: 'DELETED',
});

export const LOG_ACTION_LABELS = {
    CREATED: 'Ghi nhận vấn đề',
    UPDATED: 'Cập nhật thông tin',
    ASSIGNED: 'Phân công',
    COLLABORATOR_ADDED: 'Thêm người phối hợp',
    COLLABORATOR_REMOVED: 'Bỏ người phối hợp',
    STATUS_CHANGED: 'Chuyển trạng thái',
    FILE_ADDED: 'Thêm tệp',
    FILE_REMOVED: 'Xoá tệp',
    WORK_ORDER_CREATED: 'Tạo phiếu công việc',
    WORK_ORDER_LINKED: 'Liên kết phiếu công việc',
    WORK_ORDER_COMPLETED: 'Phiếu công việc hoàn thành',
    NOTE: 'Ghi chú',
    DELETED: 'Xoá vấn đề',
};

// Nhãn trường khi hiển thị nhật ký UPDATED (meta.changes dùng tên trường của model)
export const ISSUE_FIELD_LABELS = {
    projectId: 'Dự án',
    title: 'Tiêu đề',
    area: 'Khu vực/hạng mục',
    category: 'Nhóm vấn đề',
    description: 'Nội dung',
    priority: 'Ưu tiên',
    source: 'Kênh tiếp nhận',
    reporterName: 'Người phản ánh',
    reporterPhone: 'SĐT người phản ánh',
    reportedAt: 'Thời điểm ghi nhận',
    dueDate: 'Hạn xử lý',
    resolution: 'Kết quả xử lý',
};

// ── Cầu nối với module Phiếu công việc cũ ───────────────────────────────────
// WorkOrder lưu sẵn trạng thái/ưu tiên bằng nhãn tiếng Việt và không được đổi
// (giữ nguyên hành vi cũ) — gom các giá trị đó về đúng một chỗ ở đây.
export const WORK_ORDER_DONE_STATUS = 'Hoàn thành';
export const WORK_ORDER_DEFAULT_STATUS = 'Chờ xử lý';
export const WORK_ORDER_PRIORITY_BY_ISSUE = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', URGENT: 'Cao' };
