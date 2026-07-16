'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Plus, ChevronRight, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { getMfgPermissions } from '@/lib/manufacturing/permissions';
import { ORDER_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/manufacturing/constants';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';

const ORDER_STATUS_COLORS = {
    DRAFT: { bg: '#F1F5F9', text: '#64748B' },
    WAITING_DOCUMENTS: { bg: '#FFF7ED', text: '#EA580C' },
    WAITING_APPROVAL: { bg: '#FEF9C3', text: '#CA8A04' },
    WAITING_MATERIALS: { bg: '#FEF3C7', text: '#D97706' },
    READY: { bg: '#DBEAFE', text: '#2563EB' },
    IN_PRODUCTION: { bg: '#FEF3C7', text: '#D97706' },
    WAITING_QC: { bg: '#EDE9FE', text: '#7C3AED' },
    REWORK: { bg: '#FEE2E2', text: '#DC2626' },
    COMPLETED_AT_FACTORY: { bg: '#D1FAE5', text: '#059669' },
    PACKED: { bg: '#E0E7FF', text: '#4338CA' },
    DELIVERED: { bg: '#DBEAFE', text: '#2563EB' },
    INSTALLING: { bg: '#FEF3C7', text: '#D97706' },
    COMPLETED: { bg: '#D1FAE5', text: '#059669' },
    PAUSED: { bg: '#F3E8FF', text: '#9333EA' },
    CANCELLED: { bg: '#F1F5F9', text: '#94A3B8' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function ProjectManufacturingTab({ projectId, projectCode, project, onSummaryChange }) {
    const router = useRouter();
    const toast = useToast();
    const { role, email, department } = useRole();
    const perms = getMfgPermissions({ role, email, department });

    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ title: '', priority: 'NORMAL', plannedStartDate: '', plannedEndDate: '', note: '' });

    const load = useCallback(() => {
        setLoading(true);
        fetch(`/api/projects/${projectId}/manufacturing-summary`)
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || `HTTP ${r.status}`))))
            .then(d => { setSummary(d); setLoading(false); })
            .catch(e => { console.error('[ProjectManufacturingTab]', e); setLoading(false); });
    }, [projectId]);

    useEffect(load, [load]);

    async function handleCreate() {
        if (!form.title.trim()) { toast.error('Nhập tiêu đề lệnh sản xuất'); return; }
        setCreating(true);
        try {
            const res = await fetch('/api/manufacturing/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, ...form }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi tạo lệnh sản xuất');
            toast.success(`Đã tạo lệnh ${d.code}`);
            setShowCreate(false);
            setForm({ title: '', priority: 'NORMAL', plannedStartDate: '', plannedEndDate: '', note: '' });
            load();
            onSummaryChange?.();
            router.push(`/manufacturing/orders/${d.id}`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setCreating(false);
        }
    }

    if (loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text-muted)' }}><Loader2 size={22} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />Đang tải dữ liệu sản xuất...</div>;
    }

    const s = summary || { ordersCount: 0, itemsCount: 0, itemsCompleted: 0, itemsWaitingMaterial: 0, itemsInError: 0, orders: [], lateOrders: [] };

    return (
        <div>
            {/* Thanh tổng quan */}
            <div className="card" style={{ marginBottom: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Factory size={20} color="#2563eb" />
                        <span style={{ fontWeight: 700, fontSize: 16 }}>Sản xuất xưởng — {projectCode}</span>
                    </div>
                    {perms.create && (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                            <Plus size={14} /> Tạo lệnh sản xuất
                        </button>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                    {[
                        { v: s.ordersCount, l: 'Lệnh sản xuất' },
                        { v: s.itemsCount, l: 'Sản phẩm' },
                        { v: s.itemsCompleted, l: 'Đã hoàn thành', c: 'var(--status-success)' },
                        { v: s.itemsWaitingMaterial, l: 'Chờ vật tư', c: s.itemsWaitingMaterial > 0 ? 'var(--status-warning)' : undefined },
                        { v: s.itemsInError, l: 'Đang sửa lỗi', c: s.itemsInError > 0 ? 'var(--status-danger)' : undefined },
                        { v: s.step?.progress != null ? `${s.step.progress}%` : '—', l: 'Tiến độ SX' },
                    ].map(x => (
                        <div key={x.l} style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 8 }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: x.c || 'var(--text-primary)' }}>{x.v}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{x.l}</div>
                        </div>
                    ))}
                </div>

                {s.lateOrders?.length > 0 && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#b91c1c' }}>
                        <AlertTriangle size={15} />
                        {s.lateOrders.length} lệnh sản xuất trễ tiến độ: {s.lateOrders.map(o => o.code).join(', ')}
                    </div>
                )}
            </div>

            {/* Danh sách lệnh sản xuất */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 18px' }}>
                    <span className="card-title">Lệnh sản xuất ({s.orders.length})</span>
                </div>
                {s.orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                        <Package size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                        <p>Dự án chưa có lệnh sản xuất nào.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Mã lệnh</th><th>Tiêu đề</th><th>Ưu tiên</th><th>Trạng thái</th>
                                    <th>Sản phẩm</th><th>Tiến độ</th><th>Deadline</th><th>Lỗi mở</th><th />
                                </tr>
                            </thead>
                            <tbody>
                                {s.orders.map(o => (
                                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/manufacturing/orders/${o.id}`)}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{o.code}</td>
                                        <td>{o.title}</td>
                                        <td>{PRIORITY_LABELS[o.priority] || o.priority}</td>
                                        <td>
                                            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600, background: ORDER_STATUS_COLORS[o.status]?.bg, color: ORDER_STATUS_COLORS[o.status]?.text }}>
                                                {ORDER_STATUS_LABELS[o.status] || o.status}
                                            </span>
                                        </td>
                                        <td>{o.itemsCount}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
                                                <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${o.progressPercent}%`, background: o.progressPercent === 100 ? '#16a34a' : '#3b82f6' }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>{o.progressPercent}%</span>
                                            </div>
                                        </td>
                                        <td style={{ color: o.isLate ? '#dc2626' : undefined, fontWeight: o.isLate ? 700 : 400 }}>
                                            {o.isLate && '⚠ '}{fmtDate(o.plannedEndDate)}
                                        </td>
                                        <td>{o.openIssuesCount > 0 ? <span className="badge danger">{o.openIssuesCount}</span> : '—'}</td>
                                        <td><ChevronRight size={14} color="#9ca3af" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo lệnh sản xuất mới">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Tiêu đề lệnh *</label>
                        <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Sản xuất nội thất tầng 1" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Ưu tiên</label>
                            <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Đợt sản xuất</label>
                            <input className="form-input" value={form.batchNumber || ''} onChange={e => setForm(f => ({ ...f, batchNumber: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày dự kiến bắt đầu</label>
                            <input type="date" className="form-input" value={form.plannedStartDate} onChange={e => setForm(f => ({ ...f, plannedStartDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày dự kiến hoàn thành</label>
                            <input type="date" className="form-input" value={form.plannedEndDate} onChange={e => setForm(f => ({ ...f, plannedEndDate: e.target.value }))} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Đang tạo...' : 'Tạo lệnh'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
