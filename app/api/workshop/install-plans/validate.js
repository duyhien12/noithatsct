export const INSTALL_STATUSES = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành'];

// Trả { data } hoặc { error }. Ngày nhận dạng 'YYYY-MM-DD'.
export function parseInstallPlan(body, { requireProject = false } = {}) {
    const data = {};
    if (requireProject) {
        if (!body.projectId) return { error: 'Chọn công trình' };
        data.projectId = String(body.projectId);
    }
    if (body.name !== undefined) data.name = String(body.name).trim() || 'Lắp đặt tại công trình';
    if (body.workerCount !== undefined) {
        const n = Number(body.workerCount);
        if (!Number.isInteger(n) || n < 1 || n > 200) return { error: 'Số người phải là số nguyên từ 1 đến 200' };
        data.workerCount = n;
    }
    if (body.status !== undefined) {
        if (!INSTALL_STATUSES.includes(body.status)) return { error: 'Trạng thái không hợp lệ' };
        data.status = body.status;
    }
    if (body.notes !== undefined) data.notes = String(body.notes);
    for (const k of ['startDate', 'endDate']) {
        if (body[k] === undefined) continue;
        const d = new Date(body[k]);
        if (Number.isNaN(d.getTime())) return { error: 'Ngày không hợp lệ' };
        data[k] = d;
    }
    if (requireProject && (!data.startDate || !data.endDate)) return { error: 'Chọn ngày bắt đầu và kết thúc' };
    if (data.startDate && data.endDate && data.endDate < data.startDate) return { error: 'Ngày kết thúc phải sau ngày bắt đầu' };
    return { data };
}
