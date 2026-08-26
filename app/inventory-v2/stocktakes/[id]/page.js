'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

const STATUS_LABEL = { DRAFT: 'Nháp', COUNTING: 'Đang đếm', PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', CANCELLED: 'Đã hủy' };
const fmtNum = (n) => n == null ? '—' : new Intl.NumberFormat('vi-VN').format(n);

export default function StocktakeDetailPage() {
    const { id } = useParams();
    const [st, setSt] = useState(null);
    const [counts, setCounts] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const fetchDetail = useCallback(async () => {
        const res = await fetch(`/api/inventory-v2/stocktakes/${id}`);
        const d = await res.json();
        setSt(d);
        setCounts(Object.fromEntries((d.lines || []).map(l => [l.id, l.countedQty ?? ''])));
    }, [id]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    const doAction = async (action) => {
        setBusy(true); setError('');
        try {
            const res = await fetch(`/api/inventory-v2/stocktakes/${id}/actions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            await fetchDetail();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    const saveCounts = async () => {
        setBusy(true); setError('');
        try {
            const lines = Object.entries(counts).filter(([, v]) => v !== '').map(([lineId, v]) => ({ id: lineId, countedQty: Number(v) }));
            const res = await fetch(`/api/inventory-v2/stocktakes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            await fetchDetail();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    };

    if (!st) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ margin: 0 }}>{st.code} <span className="badge badge-info" style={{ marginLeft: 8 }}>{STATUS_LABEL[st.status]}</span></h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    {st.status === 'DRAFT' && <button className="btn btn-primary" disabled={busy} onClick={() => doAction('start_count')}>Bắt đầu đếm</button>}
                    {st.status === 'COUNTING' && <>
                        <button className="btn btn-ghost" disabled={busy} onClick={saveCounts}>💾 Lưu số đếm</button>
                        <button className="btn btn-primary" disabled={busy} onClick={() => doAction('submit')}>Gửi duyệt</button>
                    </>}
                    {st.status === 'PENDING_APPROVAL' && <button className="btn btn-primary" disabled={busy} onClick={() => doAction('approve')}>Duyệt (tự tạo phiếu điều chỉnh)</button>}
                    {(st.status === 'DRAFT' || st.status === 'COUNTING' || st.status === 'PENDING_APPROVAL') && <button className="btn btn-ghost" style={{ color: '#dc2626' }} disabled={busy} onClick={() => doAction('cancel')}>Hủy</button>}
                </div>
            </div>
            {error && <div style={{ padding: '10px 20px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
            <div className="table-container">
                <table className="data-table">
                    <thead><tr><th>Vật tư</th><th style={{ textAlign: 'right' }}>Tồn hệ thống</th><th style={{ textAlign: 'right' }}>Số đếm thực tế</th><th style={{ textAlign: 'right' }}>Chênh lệch</th></tr></thead>
                    <tbody>
                        {(st.lines || []).map(l => {
                            const counted = counts[l.id];
                            const diff = counted !== '' && counted != null ? Number(counted) - Number(l.systemQty) : null;
                            return (
                                <tr key={l.id}>
                                    <td className="primary">{l.material?.sku} — {l.material?.name}</td>
                                    <td style={{ textAlign: 'right' }}>{fmtNum(l.systemQty)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        {st.status === 'COUNTING' ? (
                                            <input type="number" className="form-input" style={{ width: 100, textAlign: 'right' }}
                                                value={counts[l.id] ?? ''} onChange={e => setCounts(c => ({ ...c, [l.id]: e.target.value }))} />
                                        ) : fmtNum(l.countedQty)}
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: (diff ?? l.varianceQty) > 0 ? '#16a34a' : (diff ?? l.varianceQty) < 0 ? '#dc2626' : undefined }}>
                                        {fmtNum(diff ?? l.varianceQty)}
                                    </td>
                                </tr>
                            );
                        })}
                        {(!st.lines || st.lines.length === 0) && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chưa có dòng — bấm &quot;Bắt đầu đếm&quot; để snapshot tồn hệ thống</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
