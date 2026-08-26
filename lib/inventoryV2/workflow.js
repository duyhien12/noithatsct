/**
 * Luồng trạng thái phiếu kho: Nháp → Chờ duyệt → Đã duyệt / Đã hủy.
 * - Nháp không ảnh hưởng tồn kho.
 * - Chỉ "approve" (Chờ duyệt/Nháp → Đã duyệt) mới thật sự ghi sổ (gọi lib/inventoryV2/costing.js).
 * - Đã duyệt là bất biến — sửa sai phải lập phiếu đảo (documents/[id]/reverse), không sửa/xóa trực tiếp.
 */

export const STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CANCELLED'];

export const STATUS_LABELS = {
    DRAFT: 'Nháp',
    PENDING_APPROVAL: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    CANCELLED: 'Đã hủy',
};

const ALLOWED_TRANSITIONS = {
    DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
    PENDING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
    APPROVED: [],
    CANCELLED: [],
};

export function canTransition(from, to) {
    return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/**
 * Phân loại nghiệp vụ theo docType — quyết định route `actions` gọi costing.postLedgerEntry
 * (LEDGER_IN/LEDGER_OUT/TRANSFER) hay reservation.activateReservation/deactivateReservation
 * (RESERVE/RELEASE) khi duyệt, và prefix mã phiếu tương ứng.
 */
export const DOC_TYPE_META = {
    IMPORT_PURCHASE:          { class: 'LEDGER', direction: 'IN', prefix: 'PNK', label: 'Nhập mua từ NCC' },
    IMPORT_CUSTOMER_SUPPLIED: { class: 'LEDGER', direction: 'IN', prefix: 'PNK', label: 'Nhập vật tư khách hàng cấp' },
    IMPORT_RETURN_PROJECT:    { class: 'LEDGER', direction: 'IN', prefix: 'PHT', label: 'Nhập hoàn trả từ công trình' },
    IMPORT_RETURN_PRODUCTION: { class: 'LEDGER', direction: 'IN', prefix: 'PHT', label: 'Nhập hoàn trả từ lệnh sản xuất' },
    IMPORT_SEMI_FINISHED:     { class: 'LEDGER', direction: 'IN', prefix: 'PNK', label: 'Nhập bán thành phẩm' },
    IMPORT_FINISHED:          { class: 'LEDGER', direction: 'IN', prefix: 'PNK', label: 'Nhập thành phẩm' },
    IMPORT_REMNANT:           { class: 'LEDGER', direction: 'IN', prefix: 'PNK', label: 'Nhập vật tư thừa' },
    IMPORT_STOCKTAKE_ADJUST:  { class: 'LEDGER', direction: 'IN', prefix: 'PDC', label: 'Nhập điều chỉnh sau kiểm kê' },
    IMPORT_OPENING_BALANCE:   { class: 'LEDGER', direction: 'IN', prefix: 'PDK', label: 'Nhập tồn đầu kỳ (di trú)' },

    EXPORT_PRODUCTION:        { class: 'LEDGER', direction: 'OUT', prefix: 'PXK', label: 'Xuất cho lệnh sản xuất' },
    EXPORT_PROJECT:           { class: 'LEDGER', direction: 'OUT', prefix: 'PXK', label: 'Xuất cho công trình' },
    EXPORT_DEPARTMENT:        { class: 'LEDGER', direction: 'OUT', prefix: 'PXK', label: 'Xuất cho phòng ban/nhân viên' },
    EXPORT_RETURN_SUPPLIER:   { class: 'LEDGER', direction: 'OUT', prefix: 'PXK', label: 'Xuất trả nhà cung cấp' },
    EXPORT_SALE:              { class: 'LEDGER', direction: 'OUT', prefix: 'PXK', label: 'Xuất bán' },
    EXPORT_SCRAP:             { class: 'LEDGER', direction: 'OUT', prefix: 'PXK', label: 'Xuất hủy/phế liệu' },
    EXPORT_STOCKTAKE_ADJUST:  { class: 'LEDGER', direction: 'OUT', prefix: 'PDC', label: 'Xuất điều chỉnh sau kiểm kê' },

    TRANSFER_WAREHOUSE:       { class: 'TRANSFER', direction: 'TRANSFER', prefix: 'PDC', label: 'Điều chuyển kho' },
    TRANSFER_LOCATION:        { class: 'TRANSFER', direction: 'TRANSFER', prefix: 'PDC', label: 'Điều chuyển vị trí/kệ' },
    RETURN_TO_WAREHOUSE:      { class: 'LEDGER', direction: 'IN', prefix: 'PHT', label: 'Hoàn trả vật tư' },

    HOLD:                     { class: 'RESERVE', direction: 'NONE', prefix: 'PGV', label: 'Giữ vật tư cho công trình' },
    RELEASE_HOLD:             { class: 'RELEASE', direction: 'NONE', prefix: 'PHG', label: 'Hủy giữ vật tư' },
};

export function docTypeMeta(docType) {
    const meta = DOC_TYPE_META[docType];
    if (!meta) throw new Error(`docType không hợp lệ: ${docType}`);
    return meta;
}

export function assertDocumentCanSubmit(document) {
    if (!canTransition(document.status, 'PENDING_APPROVAL')) {
        return { error: `Không thể gửi duyệt phiếu ở trạng thái ${STATUS_LABELS[document.status]}`, status: 400 };
    }
    if (!document.lines || document.lines.length === 0) {
        return { error: 'Phiếu chưa có dòng vật tư nào', status: 400 };
    }
    return null;
}

export function assertDocumentCanApprove(document) {
    if (!canTransition(document.status, 'APPROVED')) {
        return { error: `Không thể duyệt phiếu ở trạng thái ${STATUS_LABELS[document.status]}`, status: 400 };
    }
    if (!document.lines || document.lines.length === 0) {
        return { error: 'Phiếu chưa có dòng vật tư nào', status: 400 };
    }
    return null;
}

export function assertDocumentCanReject(document) {
    if (document.status !== 'PENDING_APPROVAL') {
        return { error: 'Chỉ phiếu đang Chờ duyệt mới có thể từ chối về Nháp', status: 400 };
    }
    return null;
}

export function assertDocumentCanCancel(document) {
    if (document.status === 'APPROVED') {
        return { error: 'Phiếu đã duyệt không thể hủy trực tiếp — hãy lập phiếu đảo', status: 400 };
    }
    if (document.status === 'CANCELLED') {
        return { error: 'Phiếu đã bị hủy trước đó', status: 400 };
    }
    return null;
}

export function assertDocumentEditable(document) {
    if (document.status !== 'DRAFT') {
        return { error: 'Chỉ sửa được phiếu ở trạng thái Nháp — phiếu Chờ duyệt phải từ chối về Nháp trước', status: 400 };
    }
    return null;
}
