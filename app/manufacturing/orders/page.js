'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Plus, Search, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { getMfgPermissions } from '@/lib/manufacturing/permissions';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/manufacturing/constants';
import { useToast } from '@/components/ui/Toast';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function ManufacturingOrdersPage() {
    const router = useRouter();
    const toast = useToast();
    const { role, email, department } = useRole();
    const perms = getMfgPermissions({ role, email, department });

    const [data, setData] = useState({ data: [], pagination: { page: 1, totalPages: 1 } });
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [filters, setFilters] = useState({ search: '', status: '', priority: '', overdueOnly: false, page: 1 });
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ projectId: '', title: '', priority: 'NORMAL', plannedStartDate: '', plannedEndDate: '' });

    const load = useCallback(() => {
        setLoading(true);
        const qs = new URLSearchParams();
        if (filters.search) qs.set('search', filters.search);
        if (filters.status) qs.set('status', filters.status);
        if (filters.priority) qs.set('priority', filters.priority);
        if (filters.overdueOnly) qs.set('overdueOnly', 'true');
        qs.set('page', filters.page);
        qs.set('limit', '20');
        fetch(`/api/manufacturing/orders?${qs}`)
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error || `HTTP ${r.status}`))))
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { console.error('[ManufacturingOrders]', e); setLoading(false); });
    }, [filters]);

    useEffect(load, [load]);
    useEffect(() => { fetch('/api/projects?limit=300').then(r => r.json()).then(d => setProjects(d?.data || [])); }, []);

    async function handleCreate() {
        if (!form.projectId || !form.title.trim()) { toast.error('Chọn dự án và nhập tiêu đề'); return; }
        setCreating(true);
        try {
            const res = await fetch('/api/manufacturing/orders', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi tạo lệnh sản xuất');
            toast.success(`Đã tạo lệnh ${d.code}`);
            setShowCreate(false);
            router.push(`/manufacturing/orders/${d.id}`);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setCreating(false);
        }
    }

    const hasFilter = filters.search || filters.status || filters.priority || filters.overdueOnly;

    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Factory size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Lệnh sản xuất</h1>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{data.pagination?.total ?? 0} lệnh sản xuất</p>
                    </div>
                </div>
                {perms.create && (
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={15} /> Tạo lệnh sản xuất</button>
                )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                    <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input className="form-input" style={{ paddingLeft: 32 }} placeholder="Tìm mã lệnh, tiêu đề, dự án..."
                        value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} />
                </div>
                <select className="form-input" style={{ width: 180 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
                    <option value="">Tất cả trạng thái</option>
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                </select>
                <select className="form-input" style={{ width: 150 }} value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value, page: 1 }))}>
                    <option value="">Tất cả ưu tiên</option>
                    {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', cursor: 'pointer', background: filters.overdueOnly ? '#fef2f2' : 'white' }}>
                    <input type="checkbox" checked={filters.overdueOnly} onChange={e => setFilters(f => ({ ...f, overdueOnly: e.target.checked, page: 1 }))} /> Chỉ trễ hạn
                </label>
                {hasFilter && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ search: '', status: '', priority: '', overdueOnly: false, page: 1 })}>
                        <X size={13} /> Xoá lọc
                    </button>
                )}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : data.data.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Không có lệnh sản xuất phù hợp.</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Mã lệnh</th><th>Dự án</th><th>Tiêu đề</th><th>Ưu tiên</th><th>Trạng thái</th>
                                    <th>Sản phẩm</th><th>Tiến độ</th><th>Deadline</th><th>Lỗi mở</th><th />
                                </tr>
                            </thead>
                            <tbody>
                                {data.data.map(o => (
                                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/manufacturing/orders/${o.id}`)}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{o.code}</td>
                                        <td>{o.project?.code} — {o.project?.name}</td>
                                        <td>{o.title}</td>
                                        <td>{PRIORITY_LABELS[o.priority] || o.priority}</td>
                                        <td><span className="badge">{ORDER_STATUS_LABELS[o.status] || o.status}</span></td>
                                        <td>{o._count?.items ?? 0}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 80 }}>
                                                <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${o.progressPercent}%`, background: o.progressPercent === 100 ? '#16a34a' : '#3b82f6' }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>{o.progressPercent}%</span>
                                            </div>
                                        </td>
                                        <td style={{ color: o.isLate ? '#dc2626' : undefined, fontWeight: o.isLate ? 700 : 400 }}>
                                            {o.isLate && <AlertTriangle size={12} style={{ marginRight: 4, verticalAlign: -1 }} />}{fmtDate(o.plannedEndDate)}
                                        </td>
                                        <td>{o._count?.qualityIssues > 0 ? <span className="badge danger">{o._count.qualityIssues}</span> : '—'}</td>
                                        <td><ChevronRight size={14} color="#9ca3af" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination pagination={data.pagination} onPageChange={p => setFilters(f => ({ ...f, page: p }))} />

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo lệnh sản xuất mới">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Dự án *</label>
                        <select className="form-input" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                            <option value="">-- Chọn dự án --</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Tiêu đề lệnh *</label>
                        <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Ưu tiên</label>
                            <select className="form-input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                        <div />
                        <div className="form-group">
                            <label className="form-label">Ngày dự kiến bắt đầu</label>
                            <input type="date" className="form-input" value={form.plannedStartDate} onChange={e => setForm(f => ({ ...f, plannedStartDate: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày dự kiến hoàn thành</label>
                            <input type="date" className="form-input" value={form.plannedEndDate} onChange={e => setForm(f => ({ ...f, plannedEndDate: e.target.value }))} />
                        </div>
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
