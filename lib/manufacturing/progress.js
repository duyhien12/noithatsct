/**
 * Tính tiến độ sản xuất theo trọng số (mục VI.7 trong spec):
 * - Công đoạn -> Sản phẩm: trọng số estimatedHours (bằng nhau nếu không có).
 * - Sản phẩm -> Lệnh: trọng số plannedHours/estimatedHours của sản phẩm (bằng nhau nếu không có).
 * - Lệnh -> Dự án: trọng số theo số sản phẩm của lệnh (bằng nhau nếu không có), bỏ qua CANCELLED.
 */

function weightedAverage(entries) {
    // entries: [{ value: number(0-100), weight: number }]
    const valid = entries.filter(e => e.weight > 0 || entries.every(x => x.weight === 0));
    const totalWeight = valid.reduce((s, e) => s + (e.weight || 1), 0);
    if (totalWeight === 0) return valid.length ? Math.round(valid.reduce((s, e) => s + e.value, 0) / valid.length) : 0;
    const sum = valid.reduce((s, e) => s + e.value * (e.weight || 1), 0);
    return Math.round(sum / totalWeight);
}

export function computeItemProgressFromStages(stages) {
    if (!stages || stages.length === 0) return 0;
    const entries = stages.map(s => ({
        value: s.status === 'CANCELLED' ? null : (s.progressPercent ?? (s.status === 'COMPLETED' ? 100 : 0)),
        weight: s.estimatedHours || 0,
    })).filter(e => e.value !== null);
    if (entries.length === 0) return 0;
    return weightedAverage(entries);
}

export function computeOrderProgressFromItems(items) {
    const active = (items || []).filter(i => i.status !== 'CANCELLED');
    if (active.length === 0) return 0;
    const entries = active.map(i => ({
        value: i.progressPercent ?? 0,
        weight: (i.plannedHours || i.estimatedHours || 0) || 0,
    }));
    return weightedAverage(entries);
}

export function computeProjectMfgProgress(orders) {
    const active = (orders || []).filter(o => o.status !== 'CANCELLED');
    if (active.length === 0) return null; // chưa có lệnh sản xuất nào
    const entries = active.map(o => ({
        value: o.progressPercent ?? 0,
        weight: (o.items?.length ?? o._count?.items ?? 0) || 0,
    }));
    return weightedAverage(entries);
}

/**
 * Trạng thái tổng hợp bước "Sản xuất" hiển thị trên pipeline dự án (mục II).
 * @returns {{ state: 'none'|'not_started'|'in_progress'|'completed'|'late', progress: number|null }}
 */
export function computeProjectMfgStepState(orders) {
    const active = (orders || []).filter(o => o.status !== 'CANCELLED');
    if (active.length === 0) return { state: 'none', progress: null };

    const progress = computeProjectMfgProgress(orders);
    const now = new Date();
    const isLate = active.some(o => {
        if (['COMPLETED', 'DELIVERED', 'INSTALLING'].includes(o.status)) return false;
        return o.plannedEndDate && new Date(o.plannedEndDate) < now;
    });
    if (isLate) return { state: 'late', progress };

    const allCompleted = active.every(o => ['COMPLETED', 'DELIVERED', 'INSTALLING'].includes(o.status));
    if (allCompleted) return { state: 'completed', progress };

    const anyStarted = active.some(o => o.status !== 'DRAFT' && o.status !== 'WAITING_DOCUMENTS' && o.status !== 'WAITING_APPROVAL');
    if (anyStarted) return { state: 'in_progress', progress };

    return { state: 'not_started', progress };
}

export function isOrderLate(order) {
    if (['COMPLETED', 'DELIVERED', 'INSTALLING', 'CANCELLED'].includes(order.status)) return false;
    if (!order.plannedEndDate) return false;
    return new Date(order.plannedEndDate) < new Date();
}

export function daysLate(order) {
    if (!order.plannedEndDate) return 0;
    const end = order.actualEndDate ? new Date(order.actualEndDate) : new Date();
    const diff = Math.ceil((end - new Date(order.plannedEndDate)) / 86400000);
    return diff > 0 ? diff : 0;
}
