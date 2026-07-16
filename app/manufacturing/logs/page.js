'use client';
import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { getMfgPermissions } from '@/lib/manufacturing/permissions';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

export default function ManufacturingLogsPage() {
    const toast = useToast();
    const { role, email, department } = useRole();
    const perms = getMfgPermissions({ role, email, department });

    const [data, setData] = useState({ data: [], pagination: {} });
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [items, setItems] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [page, setPage] = useState(1);
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ mfgOrderId: '', mfgItemId: '', workerId: '', workDescription: '', completedQuantity: '', workHours: '', progressAfter: '', issueDescription: '', nextPlan: '' });

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/manufacturing/logs?page=${page}&limit=20`)
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || `HTTP ${r.status}`))))
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { console.error('[ManufacturingLogs]', e); setLoading(false); });
    }, [page]);

    useEffect(load, [load]);
    useEffect(() => {
        fetch('/api/manufacturing/orders?limit=200').then(r => r.json()).then(d => setOrders(d?.data || []));
        fetch('/api/workshop/workers').then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : []));
    }, []);

    useEffect(() => {
        if (!form.mfgOrderId) { setItems([]); return; }
        fetch(`/api/manufacturing/items?mfgOrderId=${form.mfgOrderId}&limit=200`).then(r => r.json()).then(d => setItems(d?.data || []));
    }, [form.mfgOrderId]);

    async function handleCreate() {
        if (!form.mfgOrderId || !form.workDescription.trim()) { toast.error('Chọn lệnh sản xuất và mô tả công việc'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/manufacturing/logs', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    mfgItemId: form.mfgItemId || undefined,
                    workerId: form.workerId || undefined,
                    completedQuantity: Number(form.completedQuantity) || 0,
                    workHours: Number(form.workHours) || 0,
                    progressAfter: form.progressAfter !== '' ? Number(form.progressAfter) : undefined,
                }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi ghi nhật ký');
            toast.success('Đã ghi nhật ký sản xuất');
            setShowCreate(false);
            setForm({ mfgOrderId: '', mfgItemId: '', workerId: '', workDescription: '', completedQuantity: '', workHours: '', progressAfter: '', issueDescription: '', nextPlan: '' });
            load();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <BookOpen size={20} color="#2563eb" />
                    <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Nhật ký sản xuất</h1>
                </div>
                {(perms.start || perms.create) && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Ghi nhật ký</button>}
            </div>

            {loading ? <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> :
                data.data.length === 0 ? <div className="card" style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có nhật ký nào.</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {data.data.map(l => (
                            <div key={l.id} className="card" style={{ padding: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                                    <span>{l.mfgOrder?.code}{l.item ? ` · ${l.item.code} ${l.item.name}` : ''}</span>
                                    <span>{fmtDateTime(l.logDate)}</span>
                                </div>
                                <div style={{ fontSize: 13 }}>{l.workDescription}</div>
                                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                    {l.worker?.name && <span>👤 {l.worker.name}</span>}
                                    {l.workHours > 0 && <span>⏱ {l.workHours}h</span>}
                                    {l.completedQuantity > 0 && <span>📦 SL: {l.completedQuantity}</span>}
                                    {l.progressAfter != null && <span>📈 {l.progressBefore}% → {l.progressAfter}%</span>}
                                </div>
                                {l.issueDescription && <div style={{ marginTop: 6, fontSize: 12, color: '#b45309', background: '#fffbeb', padding: 6, borderRadius: 6 }}>⚠ {l.issueDescription}</div>}
                            </div>
                        ))}
                    </div>
                )}
            <Pagination pagination={data.pagination} onPageChange={setPage} />

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Ghi nhật ký sản xuất">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Lệnh sản xuất *</label>
                        <select className="form-input" value={form.mfgOrderId} onChange={e => setForm(f => ({ ...f, mfgOrderId: e.target.value, mfgItemId: '' }))}>
                            <option value="">-- Chọn lệnh --</option>
                            {orders.map(o => <option key={o.id} value={o.id}>{o.code} — {o.title}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Sản phẩm (không bắt buộc)</label>
                        <select className="form-input" value={form.mfgItemId} onChange={e => setForm(f => ({ ...f, mfgItemId: e.target.value }))} disabled={!items.length}>
                            <option value="">-- Không chọn --</option>
                            {items.map(it => <option key={it.id} value={it.id}>{it.code} — {it.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nội dung công việc *</label>
                        <textarea className="form-input" rows={2} value={form.workDescription} onChange={e => setForm(f => ({ ...f, workDescription: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Người thực hiện</label>
                            <select className="form-input" value={form.workerId} onChange={e => setForm(f => ({ ...f, workerId: e.target.value }))}>
                                <option value="">-- Chọn thợ --</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Số giờ làm</label><input type="number" className="form-input" value={form.workHours} onChange={e => setForm(f => ({ ...f, workHours: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Số lượng hoàn thành</label><input type="number" className="form-input" value={form.completedQuantity} onChange={e => setForm(f => ({ ...f, completedQuantity: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Tiến độ sản phẩm sau (%)</label><input type="number" min="0" max="100" className="form-input" value={form.progressAfter} onChange={e => setForm(f => ({ ...f, progressAfter: e.target.value }))} disabled={!form.mfgItemId} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Khó khăn / phát sinh</label><input className="form-input" value={form.issueDescription} onChange={e => setForm(f => ({ ...f, issueDescription: e.target.value }))} /></div>
                    <div className="form-group"><label className="form-label">Kế hoạch tiếp theo</label><input className="form-input" value={form.nextPlan} onChange={e => setForm(f => ({ ...f, nextPlan: e.target.value }))} /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu nhật ký'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
