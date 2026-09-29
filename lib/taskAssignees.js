// Tác vụ Kanban lưu nhiều người nhận trong 1 chuỗi, ngăn cách bằng dấu phẩy: "A, B, C"
export const MAX_TASK_ASSIGNEES = 3;

export function parseAssignees(value) {
    if (!value) return [];
    return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

export function joinAssignees(names) {
    return [...new Set((names || []).map(s => String(s).trim()).filter(Boolean))].join(', ');
}

export function hasAssignee(value, name) {
    return !!name && parseAssignees(value).includes(name);
}
