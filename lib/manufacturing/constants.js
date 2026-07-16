// Nhãn tiếng Việt cho các trạng thái — dùng chung giữa API (validation) và UI (hiển thị).

export const ORDER_STATUSES = [
    'DRAFT', 'WAITING_DOCUMENTS', 'WAITING_APPROVAL', 'WAITING_MATERIALS', 'READY',
    'IN_PRODUCTION', 'WAITING_QC', 'REWORK', 'COMPLETED_AT_FACTORY', 'PACKED',
    'DELIVERED', 'INSTALLING', 'COMPLETED', 'PAUSED', 'CANCELLED',
];

export const ORDER_STATUS_LABELS = {
    DRAFT: 'Nháp',
    WAITING_DOCUMENTS: 'Chờ hồ sơ',
    WAITING_APPROVAL: 'Chờ duyệt',
    WAITING_MATERIALS: 'Chờ vật tư',
    READY: 'Sẵn sàng',
    IN_PRODUCTION: 'Đang sản xuất',
    WAITING_QC: 'Chờ QC',
    REWORK: 'Sửa lỗi',
    COMPLETED_AT_FACTORY: 'Hoàn thành tại xưởng',
    PACKED: 'Đã đóng gói',
    DELIVERED: 'Đã giao',
    INSTALLING: 'Đang lắp đặt',
    COMPLETED: 'Hoàn thành',
    PAUSED: 'Tạm dừng',
    CANCELLED: 'Đã hủy',
};

export const ITEM_STATUSES = [
    'NOT_STARTED', 'WAITING_DRAWING', 'WAITING_MATERIAL', 'READY', 'IN_PROGRESS',
    'WAITING_QC', 'REWORK', 'PASSED_QC', 'PACKED', 'DELIVERED', 'INSTALLED',
    'COMPLETED', 'PAUSED', 'CANCELLED',
];

export const ITEM_STATUS_LABELS = {
    NOT_STARTED: 'Chưa bắt đầu',
    WAITING_DRAWING: 'Chờ bản vẽ',
    WAITING_MATERIAL: 'Chờ vật tư',
    READY: 'Sẵn sàng',
    IN_PROGRESS: 'Đang sản xuất',
    WAITING_QC: 'Chờ QC',
    REWORK: 'Sửa lỗi',
    PASSED_QC: 'Đạt QC',
    PACKED: 'Đã đóng gói',
    DELIVERED: 'Đã giao',
    INSTALLED: 'Đã lắp đặt',
    COMPLETED: 'Hoàn thành',
    PAUSED: 'Tạm dừng',
    CANCELLED: 'Đã hủy',
};

// Cột Kanban theo mục VIII.5 — map nhiều trạng thái item vào 1 cột hiển thị
export const KANBAN_COLUMNS = [
    { key: 'WAITING_DRAWING', label: 'Chờ hồ sơ', statuses: ['NOT_STARTED', 'WAITING_DRAWING'] },
    { key: 'WAITING_MATERIAL', label: 'Chờ vật tư', statuses: ['WAITING_MATERIAL'] },
    { key: 'READY', label: 'Sẵn sàng', statuses: ['READY'] },
    { key: 'IN_PROGRESS', label: 'Đang sản xuất', statuses: ['IN_PROGRESS'] },
    { key: 'WAITING_QC', label: 'Chờ QC', statuses: ['WAITING_QC'] },
    { key: 'REWORK', label: 'Sửa lỗi', statuses: ['REWORK'] },
    { key: 'PASSED_QC', label: 'Đạt QC / Chờ xuất xưởng', statuses: ['PASSED_QC'] },
    { key: 'PACKED', label: 'Đã đóng gói', statuses: ['PACKED'] },
    { key: 'DELIVERED', label: 'Đã giao', statuses: ['DELIVERED'] },
    { key: 'INSTALLED', label: 'Đã lắp đặt', statuses: ['INSTALLED', 'COMPLETED'] },
];

export const STAGE_STATUSES = [
    'NOT_STARTED', 'READY', 'IN_PROGRESS', 'PAUSED', 'BLOCKED',
    'WAITING_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED',
];

export const STAGE_STATUS_LABELS = {
    NOT_STARTED: 'Chưa bắt đầu', READY: 'Sẵn sàng', IN_PROGRESS: 'Đang làm',
    PAUSED: 'Tạm dừng', BLOCKED: 'Bị chặn', WAITING_APPROVAL: 'Chờ duyệt',
    COMPLETED: 'Hoàn thành', FAILED: 'Thất bại', CANCELLED: 'Đã hủy',
};

export const MATERIAL_REQ_STATUSES = [
    'NOT_REQUESTED', 'REQUESTED', 'PARTIALLY_AVAILABLE', 'AVAILABLE', 'ISSUED',
    'USED', 'RETURNED', 'CANCELLED',
];

export const MATERIAL_REQ_STATUS_LABELS = {
    NOT_REQUESTED: 'Chưa yêu cầu', REQUESTED: 'Đã yêu cầu', PARTIALLY_AVAILABLE: 'Đủ một phần',
    AVAILABLE: 'Đã có sẵn', ISSUED: 'Đã cấp', USED: 'Đã dùng', RETURNED: 'Đã trả', CANCELLED: 'Đã hủy',
};

export const QUALITY_ISSUE_STATUSES = ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION', 'RESOLVED', 'REJECTED', 'CANCELLED'];

export const QUALITY_ISSUE_STATUS_LABELS = {
    OPEN: 'Mới mở', ASSIGNED: 'Đã giao', IN_REPAIR: 'Đang sửa',
    WAITING_VERIFICATION: 'Chờ xác minh', RESOLVED: 'Đã xử lý', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy',
};

export const SEVERITY_LABELS = { MINOR: 'Nhẹ', NORMAL: 'Bình thường', MAJOR: 'Nặng', CRITICAL: 'Nghiêm trọng' };
export const PRIORITY_LABELS = { LOW: 'Thấp', NORMAL: 'Trung bình', HIGH: 'Cao', URGENT: 'Khẩn cấp' };

export const QC_CHECKLIST_FIELDS = [
    { key: 'dimensionPassed', label: 'Đúng kích thước' },
    { key: 'materialPassed', label: 'Đúng vật liệu' },
    { key: 'colorPassed', label: 'Đúng màu sắc' },
    { key: 'hardwarePassed', label: 'Đúng loại phụ kiện' },
    { key: 'surfacePassed', label: 'Bề mặt không trầy xước' },
    { key: 'edgePassed', label: 'Dán cạnh đạt yêu cầu' },
    { key: 'structurePassed', label: 'Kết cấu chắc chắn' },
    { key: 'assemblyPassed', label: 'Đã lắp ráp thử' },
    { key: 'cleanlinessPassed', label: 'Đã vệ sinh' },
    { key: 'packingPassed', label: 'Đóng gói đúng quy cách' },
];

// 19 công đoạn mặc định (mục IV.3) — dùng để seed MfgStageTemplate
export const DEFAULT_STAGE_TEMPLATES = [
    'Tiếp nhận hồ sơ', 'Duyệt bản vẽ sản xuất', 'Bóc tách vật tư', 'Chuẩn bị vật tư',
    'Cắt ván/gia công thô', 'Dán cạnh', 'Khoan CNC/khoan liên kết', 'Gia công chi tiết',
    'Lắp ráp thử', 'Sơn/hoàn thiện bề mặt', 'Lắp phụ kiện', 'Kiểm tra QC', 'Sửa lỗi',
    'Vệ sinh', 'Đóng gói', 'Xuất xưởng', 'Vận chuyển', 'Lắp đặt', 'Nghiệm thu',
].map((name, i) => ({ name, sequence: (i + 1) * 10, isRequired: !['Sửa lỗi'].includes(name) }));
