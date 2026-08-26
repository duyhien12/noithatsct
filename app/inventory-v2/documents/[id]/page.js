'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_BADGE = { DRAFT: 'badge-info', PENDING_APPROVAL: 'badge-warning', APPROVED: 'badge-success', CANCELLED: 'badge-danger' };
const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function DocumentDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [cancelNote, setCancelNote] = useState('');
    const [showCancel, setShowCancel] = useState(false);

    const fetchDoc = useCallback(async () => {
        const res = await fetch(`/api/inventory-v2/documents/${id}`);
        setDoc(await res.json());
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchDoc(); }, [fetchDoc]);

    const doAction = async (action, note) => {
        setBusy(true); setError('');
        try {
            const res = await fetch(`/api/inventory-v2/documents/${id}/actions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, note }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi thao tác');
            await fetchDoc();
            setShowCancel(false);
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    const doReverse = async () => {
        if (!confirm('Lập phiếu đảo cho phiếu này?')) return;
        setBusy(true); setError('');
        try {
            const res = await fetch(`/api/inventory-v2/documents/${id}/reverse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi lập phiếu đảo');
            router.push(`/inventory-v2/documents/${d.id}`);
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    if (loading || !doc) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (doc.error) return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{doc.error}</div>;

    const canViewCost = doc.totalAmount !== undefined;

    return (
        <div className="card">
            <div className="card-header">
                <div>
                    <h3 style={{ margin: 0 }}>{doc.code} <span className={`badge ${STATUS_BADGE[doc.status]}`} style={{ marginLeft: 8 }}>{doc.statusLabel}</span></h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{doc.docType} · {fmtDate(doc.docDate)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Link href={`/inventory-v2/documents/${id}/print`} target="_blank" className="btn btn-ghost">🖨 In phiếu</Link>
                    {doc.status === 'DRAFT' && <button className="btn btn-primary" disabled={busy} onClick={() => doAction('submit')}>Gửi duyệt</button>}
                    {doc.status === 'PENDING_APPROVAL' && <>
                        <button className="btn btn-ghost" disabled={busy} onClick={() => doAction('reject', 'Từ chối, trả về nháp')}>Từ chối</button>
                        <button className="btn btn-primary" disabled={busy} onClick={() => doAction('approve')}>Duyệt</button>
                    </>}
                    {doc.status === 'APPROVED' && <button className="btn btn-ghost" disabled={busy} onClick={doReverse}>↩ Lập phiếu đảo</button>}
                    {(doc.status === 'DRAFT' || doc.status === 'PENDING_APPROVAL') && <button className="btn btn-ghost" style={{ color: '#dc2626' }} disabled={busy} onClick={() => setShowCancel(true)}>Hủy phiếu</button>}
                </div>
            </div>

            {error && <div style={{ padding: '10px 20px', color: '#dc2626', fontSize: 13 }}>{error}</div>}

            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12, borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Kho</div>{doc.warehouse?.name}{doc.targetWarehouse ? ` → ${doc.targetWarehouse.name}` : ''}</div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Công trình</div>{doc.project?.name || '—'}</div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Nhà cung cấp</div>{doc.supplier?.name || '—'}</div>
                <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Người tạo</div>{doc.createdById || '—'}</div>
                {doc.sourceDocument && <div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Phiếu gốc</div><Link href={`/inventory-v2/documents/${doc.sourceDocument.id}`}>{doc.sourceDocument.code}</Link></div>}
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead><tr><th>Vật tư</th><th style={{ textAlign: 'right' }}>SL nhập</th><th>ĐVT</th><th style={{ textAlign: 'right' }}>SL quy đổi</th>{canViewCost && <><th style={{ textAlign: 'right' }}>Đơn giá</th><th style={{ textAlign: 'right' }}>Thành tiền</th></>}</tr></thead>
                    <tbody>
                        {doc.lines.map(l => (
                            <tr key={l.id}>
                                <td className="primary">{l.material?.sku} — {l.material?.name}</td>
                                <td style={{ textAlign: 'right' }}>{fmtNum(l.enteredQuantity)}</td>
                                <td style={{ fontSize: 12 }}>{l.enteredUnit?.code}</td>
                                <td style={{ textAlign: 'right' }}>{fmtNum(l.quantity)}</td>
                                {canViewCost && <><td style={{ textAlign: 'right' }}>{fmt(l.unitPrice)}</td><td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(l.amount)}</td></>}
                            </tr>
                        ))}
                    </tbody>
                    {canViewCost && (
                        <tfoot><tr><td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px' }}>Tổng cộng</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(doc.totalAmount)}</td></tr></tfoot>
                    )}
                </table>
            </div>

            {doc.auditLog?.length > 0 && (
                <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>LỊCH SỬ THAO TÁC</div>
                    {doc.auditLog.map(a => (
                        <div key={a.id} style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {fmtDate(a.createdAt)} · <strong>{a.byUserName}</strong> · {a.action} {a.fromStatus && a.toStatus ? `(${a.fromStatus} → ${a.toStatus})` : ''} {a.note && `— ${a.note}`}
                        </div>
                    ))}
                </div>
            )}

            {showCancel && (
                <div className="modal-overlay" onClick={() => setShowCancel(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header"><h3>Hủy phiếu {doc.code}</h3><button className="modal-close" onClick={() => setShowCancel(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Lý do hủy</label><input className="form-input" value={cancelNote} onChange={e => setCancelNote(e.target.value)} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowCancel(false)}>Đóng</button>
                            <button className="btn btn-primary" disabled={busy} onClick={() => doAction('cancel', cancelNote)}>Xác nhận hủy</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
