'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const STATUS_BADGE = { DRAFT: 'badge-info', PENDING_APPROVAL: 'badge-warning', APPROVED: 'badge-success', CANCELLED: 'badge-danger' };
const STATUS_LABEL = { DRAFT: 'Nháp', PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', CANCELLED: 'Đã hủy' };
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');

const GROUPS = [
    { key: '', label: 'Tất cả' },
    { key: 'IMPORT', label: 'Phiếu nhập' },
    { key: 'EXPORT', label: 'Phiếu xuất' },
    { key: 'TRANSFER', label: 'Điều chuyển' },
    { key: 'RETURN_TO_WAREHOUSE', label: 'Hoàn trả' },
    { key: 'HOLD', label: 'Giữ vật tư' },
];

function DocumentsPageInner() {
    const searchParams = useSearchParams();
    const [group, setGroup] = useState(searchParams.get('group') || '');
    const [status, setStatus] = useState('');
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDocs = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 200 });
        if (group) p.set('group', group);
        if (status) p.set('status', status);
        const res = await fetch(`/api/inventory-v2/documents?${p}`);
        const d = await res.json();
        setDocs(d.data || []);
        setLoading(false);
    }, [group, status]);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    return (
        <div className="card">
            <div className="card-header">
                <div className="tab-bar">
                    {GROUPS.map(g => (
                        <button key={g.key} className={`tab-item ${group === g.key ? 'active' : ''}`} onClick={() => setGroup(g.key)}>{g.label}</button>
                    ))}
                </div>
                <Link href="/inventory-v2/documents/new" className="btn btn-primary">+ Tạo phiếu</Link>
            </div>
            <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)} style={{ minWidth: 160 }}>
                    <option value="">Tất cả trạng thái</option>
                    <option value="DRAFT">Nháp</option>
                    <option value="PENDING_APPROVAL">Chờ duyệt</option>
                    <option value="APPROVED">Đã duyệt</option>
                    <option value="CANCELLED">Đã hủy</option>
                </select>
            </div>
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Số phiếu</th><th>Loại</th><th>Ngày</th><th>Kho</th><th>Công trình/LSX</th><th>Số dòng</th><th>Trạng thái</th></tr></thead>
                        <tbody>
                            {docs.map(d => (
                                <tr key={d.id}>
                                    <td className="accent"><Link href={`/inventory-v2/documents/${d.id}`}>{d.code}</Link></td>
                                    <td style={{ fontSize: 13 }}>{d.docType}</td>
                                    <td style={{ fontSize: 13 }}>{fmtDate(d.docDate)}</td>
                                    <td style={{ fontSize: 13 }}>{d.warehouse?.name}{d.targetWarehouse ? ` → ${d.targetWarehouse.name}` : ''}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.project?.name || d.mfgOrder?.title || '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{d.lines?.length ?? 0}</td>
                                    <td><span className={`badge ${STATUS_BADGE[d.status]}`}>{STATUS_LABEL[d.status]}</span></td>
                                </tr>
                            ))}
                            {docs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chưa có phiếu</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function DocumentsPage() {
    return <Suspense fallback={null}><DocumentsPageInner /></Suspense>;
}
