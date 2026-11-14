export const INSTALL_STATUSES = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành'];

// Trả { data } hoặc { error }. Ngày nhận dạng 'YYYY-MM-DD'.
export function parseInstallPlan(body, { requireCustomer = false } = {}) {
    const data = {};
    if (requireCustomer) {
        // Chọn khách trong danh sách (customerId) hoặc ghi tên tự do (customerName)
        const customerId = body.customerId ? String(body.customerId) : '';
        const customerName = String(body.customerName || '').trim();
        if (!customerId && !customerName) return { error: 'Chọn hoặc nhập tên công trình' };
        data.customerId = customerId || null;
        data.customerName = customerId ? '' : customerName;
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
    // Thông tin để bộ xếp lịch — tất cả tùy chọn
    if (body.effortHours !== undefined) {
        if (body.effortHours === null || body.effortHours === "") data.effortHours = null;
        else {
            const n = Number(body.effortHours);
            if (!Number.isFinite(n) || n < 0 || n > 100000) return { error: "Khối lượng (giờ-người) không hợp lệ" };
            data.effortHours = n;
        }
    }
    if (body.doneHours !== undefined) {
        const n = Number(body.doneHours);
        if (!Number.isFinite(n) || n < 0) return { error: "Giờ-người đã làm không hợp lệ" };
        data.doneHours = n;
    }
    if (body.priority !== undefined) {
        const n = Number(body.priority);
        if (!Number.isInteger(n) || n < 1 || n > 5) return { error: "Mức ưu tiên phải từ 1 đến 5" };
        data.priority = n;
    }
    if (body.maxTeams !== undefined) {
        const n = Number(body.maxTeams);
        if (!Number.isInteger(n) || n < 1 || n > 5) return { error: "Số đội tối đa làm đồng thời phải từ 1 đến 5" };
        data.maxTeams = n;
    }
    if (body.travelDays !== undefined) {
        const n = Number(body.travelDays);
        if (!Number.isInteger(n) || n < 0 || n > 30) return { error: "Số ngày di chuyển phải từ 0 đến 30" };
        data.travelDays = n;
    }
    if (body.skill !== undefined) data.skill = String(body.skill || "").trim().slice(0, 40);
    if (body.allowOvertime !== undefined) data.allowOvertime = !!body.allowOvertime;
    if (body.locked !== undefined) data.locked = !!body.locked;
    if (body.dependsOn !== undefined) {
        const list = Array.isArray(body.dependsOn) ? body.dependsOn : String(body.dependsOn || "").split(",");
        data.dependsOn = list.map(x => String(x).trim()).filter(Boolean).join(",");
    }
    for (const k of ["deadline", "startNotBefore", "readyDate", "siteReadyDate"]) {
        if (body[k] === undefined) continue;
        if (body[k] === null || body[k] === "") { data[k] = null; continue; }
        const d = new Date(body[k]);
        if (Number.isNaN(d.getTime())) return { error: "Ngày không hợp lệ" };
        data[k] = d;
    }
    for (const k of ['startDate', 'endDate']) {
        if (body[k] === undefined) continue;
        const d = new Date(body[k]);
        if (Number.isNaN(d.getTime())) return { error: 'Ngày không hợp lệ' };
        data[k] = d;
    }
    if (requireCustomer && (!data.startDate || !data.endDate)) return { error: 'Chọn ngày bắt đầu và kết thúc' };
    if (data.startDate && data.endDate && data.endDate < data.startDate) return { error: 'Ngày kết thúc phải sau ngày bắt đầu' };
    return { data };
}
