// Quy trình trạng thái Đồng hành 360 — hàm thuần, dùng chung cho API và UI (kéo thả Kanban).
import { ISSUE_STATUS, ISSUE_STATUS_LABELS, PRIORITY_DUE_DAYS, WORK_ORDER_DONE_STATUS, KANBAN_BOARD, BOARD_COLUMN } from './constants';

const S = ISSUE_STATUS;

// from -> to -> { perm: quyền cần có, reason: bắt buộc lý do, resolution: bắt buộc kết quả xử lý }
export const TRANSITIONS = {
    [S.NEW]: {
        [S.IN_PROGRESS]: { perm: 'transition' },
        [S.CANCELLED]: { perm: 'cancel', reason: true },
    },
    [S.IN_PROGRESS]: {
        [S.WAITING_CONFIRMATION]: { perm: 'transition', resolution: true },
        [S.CANCELLED]: { perm: 'cancel', reason: true },
    },
    [S.WAITING_CONFIRMATION]: {
        [S.DONE]: { perm: 'confirm' },
        [S.IN_PROGRESS]: { perm: 'confirm', reason: true }, // khách/quản lý chưa đồng ý -> xử lý lại
    },
    [S.DONE]: {
        [S.IN_PROGRESS]: { perm: 'reopen', reason: true },
    },
    [S.CANCELLED]: {
        [S.NEW]: { perm: 'reopen', reason: true },
    },
};

export function getTransitionRule(fromStatus, toStatus) {
    return TRANSITIONS[fromStatus]?.[toStatus] || null;
}

/** Danh sách trạng thái có thể chuyển tới (để UI bật/tắt nút & cột thả). */
export function allowedTargets(fromStatus, perms) {
    return Object.entries(TRANSITIONS[fromStatus] || {})
        .filter(([, rule]) => !perms || perms[rule.perm])
        .map(([to]) => to);
}

/**
 * Kiểm tra một lần chuyển trạng thái.
 * @param {{ status: string, resolution?: string }} issue
 * @param {string} toStatus
 * @param {{ perms?: Record<string, boolean>, reason?: string, resolution?: string }} [options]
 * @returns {string|null} thông báo lỗi, hoặc null nếu hợp lệ
 */
export function assertTransition(issue, toStatus, { perms, reason = '', resolution } = {}) {
    if (issue.status === toStatus) return 'Vấn đề đã ở trạng thái này';
    const rule = getTransitionRule(issue.status, toStatus);
    if (!rule) return `Không thể chuyển từ ${issue.status} sang ${toStatus}`;
    if (perms && !perms[rule.perm]) return 'Bạn không có quyền thực hiện bước chuyển trạng thái này';
    if (rule.reason && !reason.trim()) return 'Vui lòng nhập lý do';
    const finalResolution = resolution !== undefined ? resolution : issue.resolution;
    if (rule.resolution && !(finalResolution || '').trim()) return 'Cần nhập kết quả xử lý trước khi chuyển sang Chờ xác nhận';
    return null;
}

/**
 * Các trường cập nhật kèm theo khi chuyển trạng thái.
 * @param {string} toStatus
 * @param {{ actor?: { id?: string, name?: string }, reason?: string, now?: Date }} [options]
 */
export function transitionFields(toStatus, { actor, reason = '', now = new Date() } = {}) {
    const data = { status: toStatus, statusReason: reason.trim() };
    if (toStatus === S.WAITING_CONFIRMATION) data.resolvedAt = now;
    if (toStatus === S.DONE) {
        data.confirmedAt = now;
        data.confirmedById = actor?.id || '';
        data.confirmedByName = actor?.name || '';
    }
    if (toStatus === S.CANCELLED) data.cancelledAt = now;
    return data;
}

/** Hạn xử lý mặc định theo mức ưu tiên. */
export function defaultDueDate(priority, from = new Date()) {
    const days = PRIORITY_DUE_DAYS[priority] ?? PRIORITY_DUE_DAYS.MEDIUM;
    return new Date(from.getTime() + days * 24 * 3_600_000);
}

/** Nối một dòng kết quả (VD từ phiếu công việc) vào kết quả xử lý hiện có. */
export function appendResolution(existing, line) {
    const text = (line || '').trim();
    if (!text) return existing || '';
    return existing?.trim() ? `${existing.trim()}\n${text}` : text;
}

/**
 * Vấn đề có đủ điều kiện tự chuyển sang Chờ xác nhận khi phiếu công việc hoàn thành:
 * đang NEW/IN_PROGRESS và mọi phiếu liên kết (chưa xoá) đều đã hoàn thành.
 */
export function shouldAwaitConfirmation(issueStatus, workOrders) {
    if (![S.NEW, S.IN_PROGRESS].includes(issueStatus)) return false;
    if (!workOrders?.length) return false;
    return workOrders.every(w => w.status === WORK_ORDER_DONE_STATUS);
}

/**
 * Cột Kanban chứa vấn đề, hoặc null nếu không hiện trên Kanban (Đã huỷ).
 * @param {{ status: string, openWorkOrderCount?: number }} issue
 */
export function boardColumnOf(issue) {
    const hasOpen = (issue.openWorkOrderCount || 0) > 0;
    const col = KANBAN_BOARD.find(c => c.statuses.includes(issue.status)
        && (c.openWorkOrders === undefined || c.openWorkOrders === hasOpen));
    return col?.key || null;
}

/**
 * Trạng thái đích khi thả vấn đề vào một cột Kanban, hoặc null nếu không thả được
 * (cột không nhận thả, cùng nhóm trạng thái, hoặc workflow/quyền không cho phép).
 */
export function dropTargetStatus(issue, columnKey, perms) {
    const col = KANBAN_BOARD.find(c => c.key === columnKey);
    if (!col?.dropStatus || col.statuses.includes(issue.status)) return null;
    return allowedTargets(issue.status, perms).includes(col.dropStatus) ? col.dropStatus : null;
}

/**
 * Lý do không thả được vấn đề vào cột (tiếng Việt), hoặc null nếu thả được / cùng cột.
 * Dùng để báo lỗi khi người dùng thả thẻ sai chỗ.
 */
export function dropRejectReason(issue, columnKey, perms) {
    const col = KANBAN_BOARD.find(c => c.key === columnKey);
    if (!col || boardColumnOf(issue) === columnKey) return null;
    if (dropTargetStatus(issue, columnKey, perms)) return null;
    const from = ISSUE_STATUS_LABELS[issue.status];
    if (col.key === BOARD_COLUMN.COORDINATION) {
        return 'Cột "Chờ phối hợp" được xếp tự động khi vấn đề đang xử lý còn phiếu công việc chưa hoàn thành — hãy tạo hoặc liên kết phiếu công việc trong panel chi tiết.';
    }
    if (col.statuses.includes(issue.status)) return null;
    const to = col.dropStatus;
    const rule = getTransitionRule(issue.status, to);
    if (rule && perms && !perms[rule.perm]) {
        return `Bạn không có quyền chuyển vấn đề từ "${from}" sang "${ISSUE_STATUS_LABELS[to]}".`;
    }
    return `Không thể chuyển từ "${from}" sang "${col.label}" theo quy trình xử lý.`;
}

export function isOverdue(issue, now = new Date()) {
    if (!issue?.dueDate) return false;
    if (![S.NEW, S.IN_PROGRESS, S.WAITING_CONFIRMATION].includes(issue.status)) return false;
    return new Date(issue.dueDate) < now;
}
