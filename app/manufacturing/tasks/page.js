'use client';
import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, AlertTriangle } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { getMfgPermissions } from '@/lib/manufacturing/permissions';
import { PRIORITY_LABELS } from '@/lib/manufacturing/constants';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';

const TASK_STATUS_LABELS = { NOT_STARTED: 'Chưa bắt đầu', READY: 'Sẵn sàng', IN_PROGRESS: 'Đang làm', PAUSED: 'Tạm dừng', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy' };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function ManufacturingTasksPage() {
    const toast = useToast();
    const { role, email, department } = useRole();
    const perms = getMfgPermissions({ role, email, department });

    const [data, setData] = useState({ data: [], pagination: {} });
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [filters, setFilters] = useState({ status: '', myTasksOnly: false, overdueOnly: false, page: 1 });
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ mfgOrderId: '', title: '', assignedWorkerId: '', priority: 'NORMAL', dueDate: '', estimatedHours: '' });

    const load = useCallback(() => {
        setLoading(true);
        const qs = new URLSearchParams({ page: filters.page, limit: '20' });
        if (filters.status) qs.set('status', filters.status);
        if (filters.myTasksOnly) qs.set('myTasksOnly', 'true');
        if (filters.overdueOnly) qs.set('overdueOnly', 'true');
        fetch(`/api/manufacturing/tasks?${qs}`)
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || `HTTP ${r.status}`))))
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { console.error('[ManufacturingTasks]', e); setLoading(false); });
    }, [filters]);

    useEffect(load, [load]);
    useEffect(() => {
        fetch('/api/manufacturing/orders?limit=200').then(r => r.json()).then(d => setOrders(d?.data || []));
        fetch('/api/workshop/workers').then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : []));
    }, []);

    async function updateStatus(id, status) {
        const res = await fetch(`/api/manufacturing/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Lỗi cập nhật'); return; }
        toast.success('Đã cập nhật');
        load();
    }

    async function handleCreate() {
        if (!form.mfgOrderId || !form.title.trim()) { toast.error('Chọn lệnh sản xuất và nhập tiêu đề'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/manufacturing/tasks', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, estimatedHours: Number(form.estimatedHours) || 0 }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi tạo phiếu giao việc');
            toast.success(`Đã giao việc: ${d.code}`);
            setShowCreate(false);
            setForm({ mfgOrderId: '', title: '', assignedWorkerId: '', priority: 'NORMAL', dueDate: '', estimatedHours: '' });
            load();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ClipboardList size={20} color="#2563eb" />
                    <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Giao việc sản xuất</h1>
                </div>
                {(perms.assign || perms.create) && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Giao việc mới</button>}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <select className="form-input" style={{ width: 180 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={filters.myTasksOnly} onChange={e => setFilters(f => ({ ...f, myTasksOnly: e.target.checked, page: 1 }))} /> Việc của tôi
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', cursor: 'pointer', background: filters.overdueOnly ? '#fef2f2' : 'white' }}>
                    <input type="checkbox" checked={filters.overdueOnly} onChange={e => setFilters(f => ({ ...f, overdueOnly: e.target.checked, page: 1 }))} /> Quá hạn
                </label>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> :
                    data.data.length === 0 ? <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Không có phiếu giao việc nào.</div> : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Lệnh SX / Sản phẩm</th><th>Người nhận</th><th>Ưu tiên</th><th>Hạn</th><th>Trạng thái</th><th /></tr></thead>
                                <tbody>
                                    {data.data.map(t => {
                                        const overdue = t.dueDate && new Date(t.dueDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(t.status);
                                        return (
                                            <tr key={t.id}>
                                                <td style={{ fontWeight: 600 }}>{t.code}</td>
                                                <td>{t.title}</td>
                                                <td style={{ fontSize: 12 }}>{t.mfgOrder?.code}{t.item ? ` / ${t.item.code}` : ''}</td>
                                                <td>{t.assignedWorker?.name || t.assignedTeamName || '—'}</td>
                                                <td>{PRIORITY_LABELS[t.priority]}</td>
                                                <td style={{ color: overdue ? '#dc2626' : undefined, fontWeight: overdue ? 700 : 400 }}>{overdue && <AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />}{fmtDate(t.dueDate)}</td>
                                                <td><span className="badge">{TASK_STATUS_LABELS[t.status] || t.status}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {t.status === 'NOT_STARTED' && <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(t.id, 'IN_PROGRESS')}>Bắt đầu</button>}
                                                        {t.status === 'IN_PROGRESS' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, 'COMPLETED')}>Hoàn thành</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
            </div>
            <Pagination pagination={data.pagination} onPageChange={p => setFilters(f => ({ ...f, page: p }))} />

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Giao việc sản xuất">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Lệnh sản xuất *</label>
                        <select className="form-input" value={form.mfgOrderId} onChange={e => setForm(f => ({ ...f, mfgOrderId: e.target.value }))}>
                            <option value="">-- Chọn lệnh --</option>
                            {orders.map(o => <option key={o.id} value={o.id}>{o.code} — {o.title}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tiêu đề công việc *</label>
                        <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Giao cho</label>
                            <select className="form-input" value={form.assignedWorkerId} onChange={e => setForm(f => ({ ...f, assignedWorkerId: e.target.value }))}>
                                <option value="">-- Chọn thợ --</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ưu tiên</label>
                            <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hạn hoàn thành</label>
                            <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Số giờ dự kiến</label>
                            <input type="number" className="form-input" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Đang lưu...' : 'Giao việc'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
