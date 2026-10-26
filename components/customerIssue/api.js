// Gọi API Đồng hành 360 từ giao diện. Mọi lỗi được ném ra dưới dạng Error có
// `message` tiếng Việt (lấy từ API) và `status` để giao diện xử lý 403/409.
import { ISSUE_UPLOAD_TYPE } from '@/lib/customerIssue/constants';

const BASE = '/api/customer-issues';

async function request(url, { method = 'GET', body } = {}) {
    let res;
    try {
        res = await fetch(url, {
            method,
            headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
    } catch {
        const err = new Error('Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.');
        err.status = 0;
        throw err;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(json.error || (res.status === 403
            ? 'Bạn không có quyền thực hiện thao tác này.'
            : 'Không thực hiện được. Vui lòng thử lại.'));
        err.status = res.status;
        err.details = json.details;
        throw err;
    }
    return json;
}

/** Chuyển object bộ lọc thành query string, bỏ giá trị rỗng; mảng nối bằng dấu phẩy. */
export function toQuery(params) {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return;
        qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
    });
    const s = qs.toString();
    return s ? `?${s}` : '';
}

export const issueApi = {
    list: (params) => request(`${BASE}${toQuery(params)}`),
    kanban: (params) => request(`${BASE}${toQuery({ ...params, view: 'kanban' })}`),
    stats: (params) => request(`${BASE}/stats${toQuery(params)}`),
    get: (id) => request(`${BASE}/${id}`),
    create: (body) => request(BASE, { method: 'POST', body }),
    update: (id, body) => request(`${BASE}/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`${BASE}/${id}`, { method: 'DELETE' }),
    assign: (id, assigneeId) => request(`${BASE}/${id}/assign`, { method: 'POST', body: { assigneeId } }),
    transition: (id, body) => request(`${BASE}/${id}/transition`, { method: 'POST', body }),
    addCollaborator: (id, userId) => request(`${BASE}/${id}/collaborators`, { method: 'POST', body: { userId } }),
    removeCollaborator: (id, userId) => request(`${BASE}/${id}/collaborators${toQuery({ userId })}`, { method: 'DELETE' }),
    addAttachment: (id, body) => request(`${BASE}/${id}/attachments`, { method: 'POST', body }),
    removeAttachment: (id, attachmentId) => request(`${BASE}/${id}/attachments/${attachmentId}`, { method: 'DELETE' }),
    logs: (id) => request(`${BASE}/${id}/logs`),
    addNote: (id, message) => request(`${BASE}/${id}/logs`, { method: 'POST', body: { message } }),
    workOrder: (id, body) => request(`${BASE}/${id}/work-orders`, { method: 'POST', body }),
    lookup: (type, params) => request(`${BASE}/lookups${toQuery({ type, ...params })}`),
};

/** Upload tệp qua /api/upload có sẵn (loại `proofs`). */
export async function uploadIssueFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', ISSUE_UPLOAD_TYPE);
    let res;
    try {
        res = await fetch('/api/upload', { method: 'POST', body: fd });
    } catch {
        throw new Error('Không kết nối được máy chủ khi tải tệp lên.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) throw new Error(json.error || `Không tải được tệp ${file.name}.`);
    return json;
}
