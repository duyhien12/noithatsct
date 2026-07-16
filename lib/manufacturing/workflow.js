/**
 * Quy tắc nghiệp vụ dùng chung cho lệnh sản xuất / sản phẩm (mục VI trong spec).
 * Mỗi hàm assert* trả về chuỗi lỗi (string) nếu vi phạm, hoặc null nếu hợp lệ —
 * để route gọi `const err = assertX(...); if (err) return NextResponse.json({ error: err }, { status: 400 });`
 */

const TERMINAL_ITEM_STATUSES = ['COMPLETED', 'INSTALLED', 'DELIVERED', 'CANCELLED'];
const OPEN_ISSUE_STATUSES = ['OPEN', 'ASSIGNED', 'IN_REPAIR', 'WAITING_VERIFICATION'];

export function assertOrderCanSubmit(order) {
    if (!order.items || order.items.length === 0) return 'Lệnh chưa có hạng mục sản phẩm nào';
    return null;
}

export function assertOrderCanApprove(order) {
    if (!order.items || order.items.length === 0) return 'Lệnh chưa có hạng mục sản phẩm — không thể duyệt';
    if (order.status !== 'WAITING_APPROVAL' && order.status !== 'WAITING_DOCUMENTS' && order.status !== 'DRAFT') {
        return `Lệnh đang ở trạng thái "${order.status}", không thể duyệt`;
    }
    return null;
}

export function assertOrderCanStart(order) {
    if (!order.items || order.items.length === 0) return 'Lệnh chưa có hạng mục sản phẩm — không thể bắt đầu sản xuất';
    if (!order.approvedAt) return 'Lệnh chưa được phê duyệt — không thể bắt đầu sản xuất';
    if (!['READY', 'WAITING_MATERIALS', 'PAUSED'].includes(order.status)) {
        return `Lệnh đang ở trạng thái "${order.status}", không thể bắt đầu sản xuất`;
    }
    return null;
}

/** Sau khi duyệt: READY nếu không còn nhu cầu vật tư nào chưa sẵn sàng, ngược lại WAITING_MATERIALS */
export function statusAfterApprove(materialReqs) {
    const pending = (materialReqs || []).filter(m => !['AVAILABLE', 'ISSUED', 'USED', 'CANCELLED'].includes(m.status));
    return pending.length > 0 ? 'WAITING_MATERIALS' : 'READY';
}

export function assertItemCanPassQC(item, latestInspection, openIssuesForItem) {
    if (!latestInspection || latestInspection.result !== 'PASSED') {
        return 'Sản phẩm chưa có phiếu QC cuối xưởng đạt (PASSED)';
    }
    const openCritical = (openIssuesForItem || []).some(i => OPEN_ISSUE_STATUSES.includes(i.status));
    if (openCritical) return 'Sản phẩm còn lỗi chưa xử lý xong';
    return null;
}

export function assertCanPack(item) {
    if (item.status !== 'PASSED_QC') return 'Sản phẩm chưa đạt QC — không thể đóng gói';
    return null;
}

export function assertCanDeliver(item) {
    if (item.status !== 'PACKED') return 'Sản phẩm chưa đóng gói — không thể xuất xưởng';
    return null;
}

export function assertOrderCanCompleteFactory(order, items, openIssues) {
    const active = (items || []).filter(i => i.status !== 'CANCELLED');
    if (active.length === 0) return 'Lệnh chưa có sản phẩm';
    const notPassed = active.filter(i => !['PASSED_QC', 'PACKED', 'DELIVERED', 'INSTALLED', 'COMPLETED'].includes(i.status));
    if (notPassed.length > 0) return `Còn ${notPassed.length} sản phẩm chưa đạt QC`;
    const critical = (openIssues || []).some(i => OPEN_ISSUE_STATUSES.includes(i.status) && ['MAJOR', 'CRITICAL'].includes(i.severity));
    if (critical) return 'Còn lỗi nghiêm trọng chưa xử lý xong';
    return null;
}

export function assertOrderCanComplete(order, items, openIssues) {
    const active = (items || []).filter(i => i.status !== 'CANCELLED');
    if (active.length === 0) return 'Lệnh chưa có sản phẩm';
    const notDone = active.filter(i => !TERMINAL_ITEM_STATUSES.includes(i.status));
    if (notDone.length > 0) return `Còn ${notDone.length} sản phẩm chưa hoàn thành`;
    const openAny = (openIssues || []).some(i => OPEN_ISSUE_STATUSES.includes(i.status));
    if (openAny) return 'Còn phiếu lỗi chưa đóng';
    return null;
}

/** Danh sách entity phụ thuộc chặn xóa cứng lệnh sản xuất (mục VI.9) */
export async function orderHasDependentRecords(prisma, mfgOrderId) {
    const [qc, mat, pack, del] = await Promise.all([
        prisma.qualityInspection.count({ where: { mfgOrderId } }),
        prisma.mfgMaterialRequirement.count({ where: { mfgOrderId, status: { not: 'NOT_REQUESTED' } } }),
        prisma.packingRecord.count({ where: { mfgOrderId } }),
        prisma.deliveryRecord.count({ where: { mfgOrderId } }),
    ]);
    return (qc + mat + pack + del) > 0;
}

export { OPEN_ISSUE_STATUSES, TERMINAL_ITEM_STATUSES };
