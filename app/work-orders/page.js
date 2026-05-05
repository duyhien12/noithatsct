'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

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

// ─── Tab 1: Phiếu công việc ───────────────────────────────────────────────────

const WO_CATEGORIES = ['Thi công', 'Lắp đặt', 'Kiểm tra', 'Hoàn thiện', 'Sửa chữa', 'Khác'];
const WO_PRIORITIES = ['Cao', 'Trung bình', 'Thấp'];
const WO_STATUSES   = ['Chờ xử lý', 'Đang xử lý', 'Hoàn thành', 'Quá hạn'];

function PhieuTab() {
    const router = useRouter();
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

    const fetchOrders = () => {
        fetch('/api/work-orders?limit=1000').then(r => r.json()).then(d => {
            setOrders(d.data || []); setLoading(false);
        });
    };
    useEffect(fetchOrders, []);

    const syncFromLog = async () => {
        setSyncing(true); setSyncMsg('');
        const res = await fetch('/api/work-orders/sync-from-log', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start: toISO(syncWeek), end: toISO(addDays(syncWeek, 6)) }),
        });
        const data = await res.json();
        setSyncMsg(data.created !== undefined
            ? `✅ Tạo mới ${data.created} phiếu, bỏ qua ${data.skipped} (đã tồn tại)`
            : `❌ ${data.error || 'Lỗi không xác định'}`);
        if (data.created > 0) fetchOrders();
        setSyncing(false);
    };

    const updateStatus = async (id, status) => {
        await fetch(`/api/work-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        fetchOrders();
    };

    const openEdit = (wo) => {
        setEditingWO(wo);
        setEditForm({ title: wo.title || '', description: wo.description || '', category: wo.category || '',
            assignee: wo.assignee || '', priority: wo.priority || 'Trung bình', status: wo.status || 'Chờ xử lý',
            dueDate: toInputDate(wo.dueDate) });
    };

    const saveEdit = async () => {
        if (!editForm.title?.trim()) return;
        setSaving(true);
        await fetch(`/api/work-orders/${editingWO.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: editForm.title.trim(), description: editForm.description || '',
                category: editForm.category || '', assignee: editForm.assignee || '',
                priority: editForm.priority, status: editForm.status, dueDate: editForm.dueDate || null }),
        });
        setSaving(false); setEditingWO(null); fetchOrders();
    };

    const deleteOrder = async (wo) => {
        if (!window.confirm(`Xoá phiếu "${wo.title}"?`)) return;
        await fetch(`/api/work-orders/${wo.id}`, { method: 'DELETE' });
        fetchOrders();
    };

    const sendZalo = async (wo) => {
        setZaloMsg(p => ({ ...p, [wo.id]: '⏳' }));
        const res = await fetch(`/api/work-orders/${wo.id}/notify-zalo`, { method: 'POST' });
        const data = await res.json();
        setZaloMsg(p => ({ ...p, [wo.id]: data.success ? '✅ Đã gửi' : `❌ ${data.message || 'Lỗi'}` }));
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

            <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span className="card-title">Danh sách phiếu</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                            <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Tuần {getWeekNum(syncWeek)}:</span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSyncWeek(d => addDays(d, -7))}>◀</button>
                            <span style={{ fontWeight: 600, fontSize: 12, minWidth: 80, textAlign: 'center' }}>
                                {toISO(syncWeek).slice(5).replace('-','/')} – {toISO(addDays(syncWeek,6)).slice(5).replace('-','/')}
                            </span>
                            <button className="btn btn-ghost btn-sm" onClick={() => setSyncWeek(d => addDays(d, 7))}>▶</button>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={syncFromLog} disabled={syncing} style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                            {syncing ? '⏳ Đang đồng bộ...' : '🔄 Đồng bộ từ Nhật ký'}
                        </button>
                        {syncMsg && <span style={{ fontSize: 11, color: syncMsg.startsWith('✅') ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>{syncMsg}</span>}
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
                                            <button className="btn btn-ghost btn-sm" title="Chỉnh sửa" onClick={() => openEdit(wo)} style={{ padding: '3px 7px', fontSize: 14 }}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" title="Gửi qua Zalo OA" onClick={() => sendZalo(wo)} style={{ padding: '3px 7px', fontSize: 14 }} disabled={zaloMsg[wo.id] === '⏳'}>
                                                {zaloMsg[wo.id] === '⏳' ? '⏳' : '💬'}
                                            </button>
                                            <button className="btn btn-ghost btn-sm" title="Xoá" onClick={() => deleteOrder(wo)} style={{ padding: '3px 7px', fontSize: 14, color: '#dc2626' }}>🗑️</button>
                                        </div>
                                        {zaloMsg[wo.id] && zaloMsg[wo.id] !== '⏳' && (
                                            <div style={{ fontSize: 10, marginTop: 2, color: zaloMsg[wo.id].startsWith('✅') ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>{zaloMsg[wo.id]}</div>
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
                                    <div style={{ fontSize: 11, color: zaloMsg[wo.id].startsWith('✅') ? '#16a34a' : '#dc2626', marginTop: 4 }}>{zaloMsg[wo.id]}</div>
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
                                <textarea className="form-input" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ width: '100%', resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Loại công việc</label>
                                    <select className="form-select" value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%' }}>
                                        <option value="">— Chọn —</option>
                                        {WO_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        {editForm.category && !WO_CATEGORIES.includes(editForm.category) && <option value={editForm.category}>{editForm.category}</option>}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ưu tiên</label>
                                    <select className="form-select" value={editForm.priority} onChange={e => setEditForm(p => ({ ...p, priority: e.target.value }))} style={{ width: '100%' }}>
                                        {WO_PRIORITIES.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Trạng thái</label>
                                    <select className="form-select" value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} style={{ width: '100%' }}>
                                        {WO_STATUSES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Hạn chót</label>
                                    <input type="date" className="form-input" value={editForm.dueDate} onChange={e => setEditForm(p => ({ ...p, dueDate: e.target.value }))} style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Người thực hiện</label>
                                <input className="form-input" value={editForm.assignee} onChange={e => setEditForm(p => ({ ...p, assignee: e.target.value }))} placeholder="Tên hoặc email người thực hiện" style={{ width: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                                <button className="btn btn-ghost" onClick={() => setEditingWO(null)}>Huỷ</button>
                                <button className="btn btn-primary" onClick={saveEdit} disabled={saving || !editForm.title?.trim()}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Tab 2: Công việc xưởng ───────────────────────────────────────────────────

const WT_STATUS_OPTS   = ['Chờ làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
const WT_PRIORITY_OPTS = ['Cao', 'Trung bình', 'Thấp'];
const WT_STATUS_STYLE  = {
    'Chờ làm':    { color: '#d97706', bg: '#fef3c7' },
    'Đang làm':   { color: '#2563eb', bg: '#dbeafe' },
    'Hoàn thành': { color: '#16a34a', bg: '#dcfce7' },
    'Tạm dừng':   { color: '#9ca3af', bg: '#f3f4f6' },
};
const WT_PRIORITY_STYLE = {
    'Cao':        { color: '#dc2626', bg: '#fee2e2' },
    'Trung bình': { color: '#d97706', bg: '#fef3c7' },
    'Thấp':       { color: '#16a34a', bg: '#dcfce7' },
};
const WT_EMPTY_FORM = {
    title: '', description: '', projectId: '', startDate: '', deadline: '',
    priority: 'Trung bình', notes: '', workerIds: [], materials: [],
};

function CongViecXuongTab({ workers, projects }) {
    const [tasks, setTasks] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(WT_EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [progressTarget, setProgressTarget] = useState(null);
    const [progressVal, setProgressVal] = useState(0);
    const [matSearch, setMatSearch] = useState('');

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        if (filterProject) params.set('projectId', filterProject);
        const [tRes, prRes] = await Promise.all([
            fetch(`/api/workshop/tasks?${params}`),
            fetch('/api/workshop/materials'),
        ]);
        const [t, pr] = await Promise.all([tRes.json(), prRes.json()]);
        setTasks(Array.isArray(t) ? t : []);
        setProducts(Array.isArray(pr) ? pr : []);
        setLoading(false);
    }, [filterStatus, filterProject]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const openAdd = () => { setEditTarget(null); setForm(WT_EMPTY_FORM); setShowModal(true); };
    const openEdit = (t) => {
        setEditTarget(t);
        setForm({ title: t.title, description: t.description || '', projectId: t.projectId || '',
            startDate: toInputDate(t.startDate), deadline: toInputDate(t.deadline),
            priority: t.priority, notes: t.notes || '',
            workerIds: t.workers?.map(w => w.workerId) || [],
            materials: t.materials?.map(m => ({ productId: m.productId, quantity: m.quantity })) || [] });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, projectId: form.projectId || null, startDate: form.startDate || null, deadline: form.deadline || null };
            const url = editTarget ? `/api/workshop/tasks/${editTarget.id}` : '/api/workshop/tasks';
            await fetch(url, { method: editTarget ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setShowModal(false); fetchTasks();
        } finally { setSaving(false); }
    };

    const handleStatusChange = async (task, newStatus) => {
        const progress = newStatus === 'Hoàn thành' ? 100 : task.progress;
        await fetch(`/api/workshop/tasks/${task.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, progress }),
        });
        fetchTasks();
    };

    const handleLock = async (task) => {
        await fetch(`/api/workshop/tasks/${task.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isLocked: !task.isLocked }),
        });
        fetchTasks();
    };

    const handleProgressSave = async () => {
        await fetch(`/api/workshop/tasks/${progressTarget.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ progress: Number(progressVal), status: Number(progressVal) >= 100 ? 'Hoàn thành' : progressTarget.status }),
        });
        setProgressTarget(null); fetchTasks();
    };

    const handleDelete = async () => {
        await fetch(`/api/workshop/tasks/${deleteTarget.id}`, { method: 'DELETE' });
        setDeleteTarget(null); fetchTasks();
    };

    const toggleWorker = (wid) => setForm(f => ({
        ...f, workerIds: f.workerIds.includes(wid) ? f.workerIds.filter(id => id !== wid) : [...f.workerIds, wid],
    }));
    const addMaterial = (productId) => {
        if (!productId || form.materials.find(m => m.productId === productId)) return;
        setForm(f => ({ ...f, materials: [...f.materials, { productId, quantity: 1 }] }));
    };
    const updateMaterialQty = (productId, qty) => setForm(f => ({
        ...f, materials: f.materials.map(m => m.productId === productId ? { ...m, quantity: qty } : m),
    }));
    const removeMaterial = (productId) => setForm(f => ({
        ...f, materials: f.materials.filter(m => m.productId !== productId),
    }));

    const filtered = tasks.filter(t => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
            !t.project?.name?.toLowerCase().includes(search.toLowerCase()) &&
            !t.workers?.some(w => w.worker.name.toLowerCase().includes(search.toLowerCase()))) return false;
        return true;
    });

    const counts = WT_STATUS_OPTS.reduce((a, s) => ({ ...a, [s]: tasks.filter(t => t.status === s).length }), {});
    const overdueCount = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành').length;
    const activeWorkers = workers.filter(w => w.status === 'Hoạt động');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                    { label: 'Tất cả', value: '', count: tasks.length, color: '#6b7280' },
                    { label: 'Chờ làm', value: 'Chờ làm', count: counts['Chờ làm'], color: '#d97706' },
                    { label: 'Đang làm', value: 'Đang làm', count: counts['Đang làm'], color: '#2563eb' },
                    { label: 'Hoàn thành', value: 'Hoàn thành', count: counts['Hoàn thành'], color: '#16a34a' },
                    { label: 'Tạm dừng', value: 'Tạm dừng', count: counts['Tạm dừng'], color: '#9ca3af' },
                ].map(({ label, value, count, color }) => (
                    <button key={label} onClick={() => setFilterStatus(filterStatus === value && value !== '' ? '' : value)}
                        style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: '2px solid', borderColor: filterStatus === value ? color : 'var(--border)',
                            background: filterStatus === value ? color : 'var(--bg-card)',
                            color: filterStatus === value ? '#fff' : 'var(--text-primary)' }}>
                        {label} <span style={{ opacity: 0.8 }}>({count || 0})</span>
                    </button>
                ))}
                {overdueCount > 0 && (
                    <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '2px solid #dc2626' }}>
                        ⚠️ Trễ: {overdueCount}
                    </span>
                )}
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách công việc xưởng</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ fontSize: 13 }}>
                            <option value="">Tất cả dự án</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button className="btn btn-primary" onClick={openAdd}>+ Thêm việc</button>
                    </div>
                </div>
                <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                    <input className="form-input" placeholder="🔍 Tìm theo tên việc, dự án, nhân công..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    {(search || filterStatus || filterProject) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterProject(''); }}>Xóa bộ lọc</button>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tên công việc</th><th>Dự án</th><th>Nhân công</th>
                                    <th>Bắt đầu</th><th>Hạn hoàn thành</th>
                                    <th style={{ minWidth: 120 }}>Tiến độ</th>
                                    <th>Ưu tiên</th><th>Trạng thái</th><th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => {
                                    const ss = WT_STATUS_STYLE[t.status] || WT_STATUS_STYLE['Chờ làm'];
                                    const ps = WT_PRIORITY_STYLE[t.priority] || WT_PRIORITY_STYLE['Trung bình'];
                                    const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
                                    return (
                                        <tr key={t.id} style={{ background: isOverdue ? 'rgba(220,38,38,0.04)' : undefined }}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: isOverdue ? '#dc2626' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {t.isLocked && <span title="Đã khóa">🔒</span>}{t.title}
                                                </div>
                                                {t.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.project?.name || '—'}</td>
                                            <td style={{ fontSize: 12 }}>
                                                {t.workers?.length > 0
                                                    ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                                        {t.workers.map(w => (
                                                            <span key={w.workerId} style={{ padding: '1px 6px', borderRadius: 10, background: 'var(--bg-secondary)', fontSize: 11, border: '1px solid var(--border-light)' }}>
                                                                {w.worker.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    : <span style={{ color: 'var(--text-muted)' }}>Chưa giao</span>
                                                }
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(t.startDate)}</td>
                                            <td style={{ fontSize: 12, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#dc2626' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {isOverdue ? '⚠️ ' : ''}{fmtDate(t.deadline)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden', minWidth: 60 }}>
                                                        <div style={{ height: '100%', borderRadius: 4, width: `${t.progress}%`, background: t.progress >= 100 ? '#16a34a' : t.progress >= 50 ? '#2563eb' : '#f59e0b', transition: 'width 0.3s' }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 30 }}>{t.progress}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ padding: '2px 7px', borderRadius: 20, background: ps.bg, color: ps.color, fontSize: 11, fontWeight: 600 }}>{t.priority}</span>
                                            </td>
                                            <td>
                                                <select className="form-select" value={t.status} disabled={t.isLocked} onChange={e => handleStatusChange(t, e.target.value)}
                                                    style={{ padding: '3px 8px', fontSize: 12, background: ss.bg, color: ss.color, fontWeight: 600, border: 'none', borderRadius: 20, cursor: t.isLocked ? 'not-allowed' : 'pointer' }}>
                                                    {WT_STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-ghost btn-sm" title="Cập nhật tiến độ" onClick={() => { setProgressTarget(t); setProgressVal(t.progress); }}>📊</button>
                                                    <button className="btn btn-ghost btn-sm" title="Sửa" onClick={() => openEdit(t)} disabled={t.isLocked}>✏️</button>
                                                    <button className="btn btn-ghost btn-sm" title={t.isLocked ? 'Mở khóa' : 'Khóa'} onClick={() => handleLock(t)}>{t.isLocked ? '🔓' : '🔒'}</button>
                                                    <button className="btn btn-ghost btn-sm" title="Xóa" onClick={() => setDeleteTarget(t)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                        {search || filterStatus || filterProject ? 'Không tìm thấy công việc nào' : 'Chưa có công việc nào'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mobile-card-list">
                        {filtered.map(t => {
                            const ss = WT_STATUS_STYLE[t.status] || WT_STATUS_STYLE['Chờ làm'];
                            const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
                            return (
                                <div key={t.id} className="mobile-card-item" style={{ borderLeft: isOverdue ? '3px solid #dc2626' : undefined }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ flex: 1, paddingRight: 8 }}>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: isOverdue ? '#dc2626' : 'inherit' }}>{t.isLocked && '🔒 '}{t.title}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.project?.name || 'Không có DA'}</div>
                                        </div>
                                        <span style={{ padding: '2px 8px', borderRadius: 20, background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 600, height: 'fit-content' }}>{t.status}</span>
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Tiến độ</span>
                                            <span style={{ fontWeight: 600 }}>{t.progress}%</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${t.progress}%`, background: t.progress >= 100 ? '#16a34a' : '#2563eb', borderRadius: 3 }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                        <span style={{ color: isOverdue ? '#dc2626' : 'var(--text-muted)' }}>{isOverdue ? '⚠️ ' : ''}Hạn: {fmtDate(t.deadline)}</span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setProgressTarget(t); setProgressVal(t.progress); }}>📊</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(t)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>{editTarget ? 'Sửa công việc' : 'Thêm công việc xưởng'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Tên công việc *</label>
                                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="VD: Đóng tủ bếp nhà anh Nam..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả</label>
                                <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Dự án</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                                        <option value="">— Không gắn DA —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ưu tiên</label>
                                    <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                        {WT_PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ngày bắt đầu</label>
                                    <input className="form-input" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hạn hoàn thành</label>
                                    <input className="form-input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nhân công phụ trách</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                    {activeWorkers.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chưa có thợ nào. <a href="/workshop/workers">Thêm thợ →</a></span>}
                                    {activeWorkers.map(w => (
                                        <button key={w.id} type="button" onClick={() => toggleWorker(w.id)}
                                            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '2px solid',
                                                borderColor: form.workerIds.includes(w.id) ? '#2563eb' : 'var(--border)',
                                                background: form.workerIds.includes(w.id) ? '#2563eb' : 'transparent',
                                                color: form.workerIds.includes(w.id) ? '#fff' : 'inherit', fontWeight: 600 }}>
                                            {w.name} {w.skill ? `· ${w.skill}` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Vật tư sử dụng</label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <input className="form-input" placeholder="Tìm vật tư..." value={matSearch} onChange={e => setMatSearch(e.target.value)} style={{ flex: 1 }} />
                                </div>
                                {matSearch && (
                                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
                                        {products.filter(p => p.name.toLowerCase().includes(matSearch.toLowerCase()) && !form.materials.find(m => m.productId === p.id)).slice(0, 8).map(p => (
                                            <div key={p.id} onClick={() => { addMaterial(p.id); setMatSearch(''); }}
                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <span>{p.name}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tồn: {p.stock} {p.unit}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {form.materials.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {form.materials.map(m => {
                                            const p = products.find(pr => pr.id === m.productId);
                                            return p ? (
                                                <div key={m.productId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                                                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                                                    <input type="number" min={0.1} step={0.1} value={m.quantity}
                                                        onChange={e => updateMaterialQty(m.productId, Number(e.target.value))}
                                                        style={{ width: 60, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, textAlign: 'right' }} />
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 30 }}>{p.unit}</span>
                                                    <button onClick={() => removeMaterial(m.productId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 16 }}>×</button>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.title.trim()}>
                                {saving ? 'Đang lưu...' : editTarget ? 'Cập nhật' : 'Tạo công việc'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {progressTarget && (
                <div className="modal-overlay" onClick={() => setProgressTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>Cập nhật tiến độ</h3>
                            <button className="modal-close" onClick={() => setProgressTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>{progressTarget.title}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                                <span>Tiến độ</span>
                                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 18 }}>{progressVal}%</span>
                            </div>
                            <input type="range" min={0} max={100} step={5} value={progressVal}
                                onChange={e => setProgressVal(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                <span>0%</span><span>50%</span><span>100%</span>
                            </div>
                            <div style={{ marginTop: 12, height: 10, borderRadius: 5, background: 'var(--border-light)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progressVal}%`, background: progressVal >= 100 ? '#16a34a' : progressVal >= 50 ? '#2563eb' : '#f59e0b', borderRadius: 5, transition: 'width 0.2s' }} />
                            </div>
                            {progressVal >= 100 && <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a', fontWeight: 600, textAlign: 'center' }}>✓ Sẽ đánh dấu là Hoàn thành</div>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setProgressTarget(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleProgressSave}>Lưu tiến độ</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="modal-header"><h3>Xác nhận xóa</h3><button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button></div>
                        <div className="modal-body"><p style={{ fontSize: 14 }}>Xóa công việc <strong>{deleteTarget.title}</strong>?</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
                            <button className="btn btn-danger" onClick={handleDelete}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
    const { role } = useRole();
    const router = useRouter();
    const [tab, setTab] = useState('phieu');
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd', 'admin',
            'ke_toan', 'hanh_chinh_kt', 'kinh_doanh', 'ky_thuat', 'viewer',
            'xay_dung', 'thiet_ke'].includes(role)) {
            router.replace('/'); return;
        }
        fetch('/api/workshop/workers').then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : []));
        fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(d?.data || []));
    }, [role]);

    const tabs = [
        { key: 'phieu', label: '📋 Phiếu công việc' },
        { key: 'xuong', label: '🔧 Công việc xưởng' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                            border: 'none', background: 'transparent',
                            borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                            marginBottom: -2, transition: 'color 0.15s',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'phieu'
                ? <PhieuTab />
                : <CongViecXuongTab workers={workers} projects={projects} />
            }
        </div>
    );
}
