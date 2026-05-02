'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function toISO(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function getWeekNum(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(),0,1))) / 86400000) + 1) / 7);
}

const CATEGORIES = ['Thi công', 'Lắp đặt', 'Kiểm tra', 'Hoàn thiện', 'Sửa chữa', 'Khác'];
const PRIORITIES = ['Cao', 'Trung bình', 'Thấp'];
const STATUSES = ['Chờ xử lý', 'Đang xử lý', 'Hoàn thành', 'Quá hạn'];

export default function WorkOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');
    const [syncWeek, setSyncWeek] = useState(() => getWeekStart(new Date()));
    const [editingWO, setEditingWO] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [zaloMsg, setZaloMsg] = useState({});
    const router = useRouter();

    const fetchOrders = () => { fetch('/api/work-orders?limit=1000').then(r => r.json()).then(d => { setOrders(d.data || []); setLoading(false); }); };
    useEffect(fetchOrders, []);

    const syncFromLog = async () => {
        setSyncing(true);
        setSyncMsg('');
        const start = toISO(syncWeek);
        const end = toISO(addDays(syncWeek, 6));
        const res = await fetch('/api/work-orders/sync-from-log', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, end }),
        });
        const data = await res.json();
        if (data.created !== undefined) {
            setSyncMsg(`✅ Tạo mới ${data.created} phiếu, bỏ qua ${data.skipped} (đã tồn tại)`);
            if (data.created > 0) fetchOrders();
        } else {
            setSyncMsg(`❌ ${data.error || 'Lỗi không xác định'}`);
        }
        setSyncing(false);
    };

    const updateStatus = async (id, status) => {
        await fetch(`/api/work-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        fetchOrders();
    };

    const openEdit = (wo) => {
        setEditingWO(wo);
        setEditForm({
            title: wo.title || '',
            description: wo.description || '',
            category: wo.category || '',
            assignee: wo.assignee || '',
            priority: wo.priority || 'Trung bình',
            status: wo.status || 'Chờ xử lý',
            dueDate: toInputDate(wo.dueDate),
        });
    };

    const saveEdit = async () => {
        if (!editForm.title?.trim()) return;
        setSaving(true);
        const body = {
            title: editForm.title.trim(),
            description: editForm.description || '',
            category: editForm.category || '',
            assignee: editForm.assignee || '',
            priority: editForm.priority,
            status: editForm.status,
            dueDate: editForm.dueDate || null,
        };
        await fetch(`/api/work-orders/${editingWO.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        setSaving(false);
        setEditingWO(null);
        fetchOrders();
    };

    const deleteOrder = async (wo) => {
        if (!window.confirm(`Xoá phiếu "${wo.title}"?\nHành động này không thể hoàn tác.`)) return;
        await fetch(`/api/work-orders/${wo.id}`, { method: 'DELETE' });
        fetchOrders();
    };

    const sendZalo = async (wo) => {
        setZaloMsg(p => ({ ...p, [wo.id]: '⏳' }));
        const res = await fetch(`/api/work-orders/${wo.id}/notify-zalo`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            setZaloMsg(p => ({ ...p, [wo.id]: '✅ Đã gửi' }));
        } else {
            setZaloMsg(p => ({ ...p, [wo.id]: `❌ ${data.message || 'Lỗi'}` }));
        }
        setTimeout(() => setZaloMsg(p => { const n = { ...p }; delete n[wo.id]; return n; }), 4000);
    };

    const filtered = orders.filter(w => {
        if (filterStatus && w.status !== filterStatus) return false;
        if (filterPriority && w.priority !== filterPriority) return false;
        if (search && !w.title.toLowerCase().includes(search.toLowerCase()) && !w.code.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const pending = orders.filter(w => w.status === 'Chờ xử lý').length;
    const inProgress = orders.filter(w => w.status === 'Đang xử lý').length;
    const done = orders.filter(w => w.status === 'Hoàn thành').length;
    const highPriority = orders.filter(w => w.priority === 'Cao').length;

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon revenue">📋</span></div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{orders.length}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng phiếu</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon quotations">⏳</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-warning)', marginTop: 8 }}>{pending}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chờ xử lý</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon projects">🔄</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-info)', marginTop: 8 }}>{inProgress}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang xử lý</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon customers">✅</span></div><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-success)', marginTop: 8 }}>{done}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hoàn thành</div></div>
                <div className="stat-card"><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--status-danger)' }}>{highPriority}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ưu tiên cao</div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span className="card-title">Phiếu công việc</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Tuần {getWeekNum(syncWeek)}:</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSyncWeek(d => addDays(d, -7))}>◀</button>
                            <span style={{ fontWeight: 600, fontSize: 12, minWidth: 80, textAlign: 'center' }}>
                                {toISO(syncWeek).slice(5).replace('-','/')} – {toISO(addDays(syncWeek,6)).slice(5).replace('-','/')}
                            </span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSyncWeek(d => addDays(d, 7))}>▶</button>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={syncFromLog} disabled={syncing}
                            style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                            {syncing ? '⏳ Đang đồng bộ...' : '🔄 Đồng bộ từ Nhật ký'}
                        </button>
                        {syncMsg && (
                            <span style={{ fontSize: 11, color: syncMsg.startsWith('✅') ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                                {syncMsg}
                            </span>
                        )}
                    </div>
                </div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả TT</option><option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                    </select>
                    <select className="form-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="">Tất cả ưu tiên</option><option>Cao</option><option>Trung bình</option><option>Thấp</option>
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (<>
                    <div className="desktop-table-view">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Công trình</th><th>Tiêu đề</th><th>Loại</th><th>Ưu tiên</th><th>Người thực hiện</th><th>Hạn</th><th style={{ width: 110 }}>HĐ</th></tr></thead>
                            <tbody>{filtered.map(wo => (
                                <tr key={wo.id}>
                                    <td style={{ cursor: wo.project ? 'pointer' : 'default' }} onClick={() => wo.project && router.push(`/projects/${wo.projectId}`)}>
                                        <span className="badge info">{wo.project?.code}</span> <span style={{ fontSize: 12 }}>{wo.project?.name}</span>
                                    </td>
                                    <td className="primary">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{wo.code}</span>
                                            {wo.sourceLogId && <span style={{ fontSize: 9, color: '#7c3aed', background: '#ede9fe', borderRadius: 4, padding: '1px 4px' }}>Nhật ký</span>}
                                        </div>
                                        <div>{wo.title}</div>
                                        {wo.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{wo.description}</div>}
                                    </td>
                                    <td><span className="badge muted">{wo.category}</span></td>
                                    <td><span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span></td>
                                    <td style={{ fontSize: 13 }}>{wo.assignee || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(wo.dueDate)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                            <button className="btn btn-ghost btn-sm" title="Chỉnh sửa" onClick={() => openEdit(wo)}
                                                style={{ padding: '3px 7px', fontSize: 14 }}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" title="Gửi qua Zalo OA" onClick={() => sendZalo(wo)}
                                                style={{ padding: '3px 7px', fontSize: 14 }}
                                                disabled={zaloMsg[wo.id] === '⏳'}>
                                                {zaloMsg[wo.id] === '⏳' ? '⏳' : '💬'}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" title="Xoá" onClick={() => deleteOrder(wo)}
                                                style={{ padding: '3px 7px', fontSize: 14, color: '#dc2626' }}>🗑️</button>
                                        </div>
                                        {zaloMsg[wo.id] && zaloMsg[wo.id] !== '⏳' && (
                                            <div style={{ fontSize: 10, marginTop: 2, color: zaloMsg[wo.id].startsWith('✅') ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                                                {zaloMsg[wo.id]}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    </div>
                    <div className="mobile-card-list">
                        {filtered.map(wo => (
                            <div key={wo.id} className="mobile-card-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wo.title}</div>
                                        <div className="card-subtitle">{wo.code} · {wo.project?.name || '—'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <span className={`badge ${wo.priority === 'Cao' ? 'danger' : wo.priority === 'Trung bình' ? 'warning' : 'muted'}`}>{wo.priority}</span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(wo)} style={{ padding: '2px 6px', fontSize: 13 }}>✏️</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => sendZalo(wo)} style={{ padding: '2px 6px', fontSize: 13 }} disabled={zaloMsg[wo.id] === '⏳'}>
                                            {zaloMsg[wo.id] === '⏳' ? '⏳' : '💬'}
                                        </button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => deleteOrder(wo)} style={{ padding: '2px 6px', fontSize: 13, color: '#dc2626' }}>🗑️</button>
                                    </div>
                                </div>
                                {zaloMsg[wo.id] && zaloMsg[wo.id] !== '⏳' && (
                                    <div style={{ fontSize: 11, color: zaloMsg[wo.id].startsWith('✅') ? '#16a34a' : '#dc2626', marginTop: 4 }}>
                                        {zaloMsg[wo.id]}
                                    </div>
                                )}
                                <div className="card-row">
                                    <div><span className="card-label">Người TH</span><div style={{ fontSize: 12, fontWeight: 500 }}>{wo.assignee || '—'}</div></div>
                                    <div><span className="card-label">Hạn</span><div style={{ fontSize: 12, fontWeight: 500 }}>{fmtDate(wo.dueDate)}</div></div>
                                    <div>
                                        <select value={wo.status} onChange={e => updateStatus(wo.id, e.target.value)} className="form-select" style={{ padding: '6px 28px 6px 8px', fontSize: 12, minWidth: 0 }}>
                                            <option>Chờ xử lý</option><option>Đang xử lý</option><option>Hoàn thành</option><option>Quá hạn</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>)}
            </div>

            {/* Edit Modal */}
            {editingWO && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Chỉnh sửa phiếu — {editingWO.code}</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingWO(null)} style={{ fontSize: 18, lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tiêu đề *</label>
                                <input className="form-input" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mô tả</label>
                                <textarea className="form-input" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                                    rows={2} style={{ width: '100%', resize: 'vertical' }} />
                            </div>
                            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Loại công việc</label>
                                    <select className="form-select" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%' }}>
                                        <option value="">— Chọn —</option>
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        {editForm.category && !CATEGORIES.includes(editForm.category) && <option value={editForm.category}>{editForm.category}</option>}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ưu tiên</label>
                                    <select className="form-select" value={editForm.priority} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))} style={{ width: '100%' }}>
                                        {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Trạng thái</label>
                                    <select className="form-select" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%' }}>
                                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hạn chót</label>
                                    <input type="date" className="form-input" value={editForm.dueDate} onChange={e => setEditForm(p => ({ ...p, dueDate: e.target.value }))} style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Người thực hiện</label>
                                <input className="form-input" value={editForm.assignee} onChange={e => setEditForm(p => ({ ...p, assignee: e.target.value }))}
                                    placeholder="Tên hoặc email người thực hiện" style={{ width: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                                <button className="btn btn-ghost" onClick={() => setEditingWO(null)}>Huỷ</button>
                                <button className="btn btn-primary" onClick={saveEdit} disabled={saving || !editForm.title?.trim()}>
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
