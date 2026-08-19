'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const toInput = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

const STATUS_OPTS = ['Chờ làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'];
const PRIORITY_OPTS = ['Cao', 'Trung bình', 'Thấp'];
const STAGES = ['Cut', 'CNC', 'Edge', 'Paint', 'Assembly', 'QC'];
const STAGE_VI = { Cut: 'Cắt', CNC: 'CNC', Edge: 'Dán cạnh', Paint: 'Sơn/PU', Assembly: 'Lắp ráp', QC: 'QC' };

const STATUS_STYLE = {
    'Chờ làm':    { color: '#d97706', bg: '#fef3c7' },
    'Đang làm':   { color: '#2563eb', bg: '#dbeafe' },
    'Hoàn thành': { color: '#16a34a', bg: '#dcfce7' },
    'Tạm dừng':   { color: '#9ca3af', bg: '#f3f4f6' },
};
const PRIORITY_STYLE = {
    'Cao':        { color: '#dc2626', bg: '#fee2e2' },
    'Trung bình': { color: '#d97706', bg: '#fef3c7' },
    'Thấp':       { color: '#16a34a', bg: '#dcfce7' },
};
const STAGE_STYLE = {
    Cut:      { color: '#4f46e5', bg: '#ede9fe' },
    CNC:      { color: '#0891b2', bg: '#cffafe' },
    Edge:     { color: '#b45309', bg: '#fef3c7' },
    Paint:    { color: '#7c3aed', bg: '#f3e8ff' },
    Assembly: { color: '#1d4ed8', bg: '#dbeafe' },
    QC:       { color: '#15803d', bg: '#dcfce7' },
};

const EMPTY_FORM = {
    title: '', description: '', projectId: '', startDate: '', deadline: '',
    priority: 'Trung bình', notes: '', workerIds: [], materials: [], stage: 'Cut',
};

export default function WorkshopTasksPage() {
    const router = useRouter();
    const { role } = useRole();
    const [tasks, setTasks]           = useState([]);
    const [workers, setWorkers]       = useState([]);
    const [projects, setProjects]     = useState([]);
    const [products, setProducts]     = useState([]);
    const [loading, setLoading]       = useState(true);
    const [filterStatus, setFilterStatus]   = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('status') || '' : '');
    const [filterStage, setFilterStage]     = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('stage') || '' : '');
    const [filterProject, setFilterProject] = useState('');
    const [search, setSearch]         = useState('');
    const [showModal, setShowModal]   = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm]             = useState(EMPTY_FORM);
    const [saving, setSaving]         = useState(false);
    const [deleteTarget, setDeleteTarget]     = useState(null);
    const [progressTarget, setProgressTarget] = useState(null);
    const [progressVal, setProgressVal]       = useState(0);
    const [blockTarget, setBlockTarget]       = useState(null);
    const [blockReason, setBlockReason]       = useState('');
    const [matSearch, setMatSearch]   = useState('');
    const intervalRef = useRef(null);

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const params = new URLSearchParams();
        if (filterStatus)  params.set('status', filterStatus);
        if (filterProject) params.set('projectId', filterProject);
        if (filterStage)   params.set('stage', filterStage);
        const [tRes, wRes, pRes, prRes] = await Promise.all([
            fetch(`/api/workshop/tasks?${params}`),
            fetch('/api/workshop/workers'),
            fetch('/api/projects?limit=200'),
            fetch('/api/workshop/materials'),
        ]);
        const [t, w, p, pr] = await Promise.all([tRes.json(), wRes.json(), pRes.json(), prRes.json()]);
        setTasks(Array.isArray(t) ? t : []);
        setWorkers(Array.isArray(w) ? w : []);
        setProjects(p?.data || []);
        setProducts(Array.isArray(pr) ? pr : []);
        if (!silent) setLoading(false);
    }, [filterStatus, filterProject, filterStage]);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/');
            return;
        }
        fetchAll();
        intervalRef.current = setInterval(() => fetchAll(true), 30000);
        return () => clearInterval(intervalRef.current);
    }, [fetchAll, role, router]);

    const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true); };
    const openEdit = (t) => {
        setEditTarget(t);
        setForm({
            title: t.title, description: t.description || '',
            projectId: t.projectId || '', startDate: toInput(t.startDate),
            deadline: toInput(t.deadline), priority: t.priority, notes: t.notes || '',
            stage: t.stage || 'Cut',
            workerIds: t.workers?.map(w => w.workerId) || [],
            materials: t.materials?.map(m => ({ productId: m.productId, quantity: m.quantity })) || [],
        });
        setShowModal(true);
    };

    const api = (id, body) => fetch(`/api/workshop/tasks/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const handleSubmit = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, projectId: form.projectId || null, startDate: form.startDate || null, deadline: form.deadline || null };
            const url = editTarget ? `/api/workshop/tasks/${editTarget.id}` : '/api/workshop/tasks';
            await fetch(url, { method: editTarget ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setShowModal(false);
            fetchAll(true);
        } finally { setSaving(false); }
    };

    const handleStatusChange = async (task, newStatus) => {
        await api(task.id, { status: newStatus, progress: newStatus === 'Hoàn thành' ? 100 : task.progress });
        fetchAll(true);
    };

    const handleStageChange = async (task, newStage) => {
        await api(task.id, { stage: newStage });
        fetchAll(true);
    };

    const handleLock = async (task) => {
        await api(task.id, { isLocked: !task.isLocked });
        fetchAll(true);
    };

    const handleProgressSave = async () => {
        const n = Number(progressVal);
        await api(progressTarget.id, { progress: n, status: n >= 100 ? 'Hoàn thành' : progressTarget.status });
        setProgressTarget(null);
        fetchAll(true);
    };

    const handleDelete = async () => {
        await fetch(`/api/workshop/tasks/${deleteTarget.id}`, { method: 'DELETE' });
        setDeleteTarget(null);
        fetchAll(true);
    };

    const handleBlock = async () => {
        await api(blockTarget.id, { blockedReason: blockReason.trim(), status: 'Tạm dừng' });
        setBlockTarget(null);
        setBlockReason('');
        fetchAll(true);
    };

    const handleUnblock = async (task) => {
        await api(task.id, { blockedReason: '', status: 'Đang làm' });
        fetchAll(true);
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
        if (!search) return true;
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q)
            || t.project?.name?.toLowerCase().includes(q)
            || t.workers?.some(w => w.worker.name.toLowerCase().includes(q));
    });

    const counts = STATUS_OPTS.reduce((a, s) => ({ ...a, [s]: tasks.filter(t => t.status === s).length }), {});
    const overdueCount = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành').length;
    const activeWorkers = workers.filter(w => w.status === 'Hoạt động');

    // Bottleneck stats per stage (all tasks, not filtered)
    const stageStats = STAGES.map(s => ({
        stage: s,
        total:   tasks.filter(t => t.stage === s && t.status !== 'Hoàn thành').length,
        blocked: tasks.filter(t => t.stage === s && t.blockedReason && t.status !== 'Hoàn thành').length,
    }));
    const totalBlocked = stageStats.reduce((sum, x) => sum + x.blocked, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Status filter strip */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                    { label: 'Tất cả', value: '', count: tasks.length, color: '#6b7280' },
                    { label: 'Chờ làm',    value: 'Chờ làm',    count: counts['Chờ làm'],    color: '#d97706' },
                    { label: 'Đang làm',   value: 'Đang làm',   count: counts['Đang làm'],   color: '#2563eb' },
                    { label: 'Hoàn thành', value: 'Hoàn thành', count: counts['Hoàn thành'], color: '#16a34a' },
                    { label: 'Tạm dừng',   value: 'Tạm dừng',   count: counts['Tạm dừng'],   color: '#9ca3af' },
                ].map(({ label, value, count, color }) => (
                    <button
                        key={label}
                        onClick={() => setFilterStatus(filterStatus === value && value !== '' ? '' : value)}
                        style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: '2px solid', borderColor: filterStatus === value ? color : 'var(--border)',
                            background: filterStatus === value ? color : 'var(--bg-card)',
                            color: filterStatus === value ? '#fff' : 'var(--text-primary)',
                        }}
                    >
                        {label} <span style={{ opacity: 0.8 }}>({count || 0})</span>
                    </button>
                ))}
                {overdueCount > 0 && (
                    <span style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, background: '#fee2e2', color: '#dc2626', border: '2px solid #dc2626' }}>
                        ⚠ Trễ: {overdueCount}
                    </span>
                )}
            </div>

            {/* Stage pipeline / bottleneck counter */}
            <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Dây chuyền sản xuất
                        {totalBlocked > 0 && (
                            <span style={{ marginLeft: 8, color: '#dc2626', fontWeight: 700 }}>· {totalBlocked} tắc nghẽn</span>
                        )}
                    </div>
                    {filterStage && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setFilterStage('')}>Bỏ lọc công đoạn</button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
                    {stageStats.map((s, i) => {
                        const ss = STAGE_STYLE[s.stage] || { color: '#6b7280', bg: '#f3f4f6' };
                        const isActive  = filterStage === s.stage;
                        const isBlocked = s.blocked > 0;
                        return (
                            <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                <button
                                    onClick={() => setFilterStage(isActive ? '' : s.stage)}
                                    style={{
                                        padding: '8px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                                        minWidth: 86, border: '2px solid',
                                        borderColor: isActive ? ss.color : isBlocked ? '#dc2626' : 'var(--border)',
                                        background:  isActive ? ss.color : isBlocked ? '#fee2e2' : 'var(--bg-secondary)',
                                        color:       isActive ? '#fff'   : isBlocked ? '#dc2626' : 'var(--text-primary)',
                                        fontWeight: 600, transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 2 }}>{STAGE_VI[s.stage]}</div>
                                    <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>
                                        {s.total}
                                        {isBlocked && <span style={{ fontSize: 10, marginLeft: 2 }}>🔴{s.blocked}</span>}
                                    </div>
                                </button>
                                {i < STAGES.length - 1 && (
                                    <svg width="14" height="10" viewBox="0 0 14 10" style={{ flexShrink: 0 }}>
                                        <path d="M0 5h10M6 1l5 4-5 4" stroke="var(--border-color, #d1d5db)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main table card */}
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
                    <input
                        className="form-input" placeholder="🔍 Tìm theo tên việc, dự án, nhân công..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }}
                    />
                    {(search || filterStatus || filterProject || filterStage) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterProject(''); setFilterStage(''); }}>
                            Xóa bộ lọc
                        </button>
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
                                    <th>Tên công việc</th>
                                    <th>Dự án</th>
                                    <th>Công đoạn</th>
                                    <th>Nhân công</th>
                                    <th>Hạn hoàn thành</th>
                                    <th style={{ minWidth: 120 }}>Tiến độ</th>
                                    <th>Ưu tiên</th>
                                    <th>Trạng thái</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(t => {
                                    const ss  = STATUS_STYLE[t.status]   || STATUS_STYLE['Chờ làm'];
                                    const ps  = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE['Trung bình'];
                                    const stg = STAGE_STYLE[t.stage]     || { color: '#6b7280', bg: '#f3f4f6' };
                                    const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
                                    const isBlocked = !!t.blockedReason;
                                    const rowBg = isBlocked ? 'rgba(220,38,38,0.06)' : isOverdue ? 'rgba(245,158,11,0.06)' : undefined;
                                    return (
                                        <tr key={t.id} style={{ background: rowBg }}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
                                                    color: isBlocked ? '#dc2626' : isOverdue ? '#b45309' : 'var(--text-primary)' }}>
                                                    {t.isLocked && <span title="Đã khóa" style={{ fontSize: 11 }}>🔒</span>}
                                                    {t.title}
                                                </div>
                                                {t.description && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {t.description}
                                                    </div>
                                                )}
                                                {isBlocked && (
                                                    <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                        <span>⛔</span>
                                                        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {t.blockedReason}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.project?.name || '—'}</td>
                                            <td>
                                                <select
                                                    value={t.stage || 'Cut'}
                                                    disabled={t.isLocked}
                                                    onChange={e => handleStageChange(t, e.target.value)}
                                                    style={{
                                                        padding: '3px 8px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 20,
                                                        background: stg.bg, color: stg.color,
                                                        cursor: t.isLocked ? 'not-allowed' : 'pointer', minWidth: 90,
                                                    }}
                                                >
                                                    {STAGES.map(s => <option key={s} value={s}>{STAGE_VI[s]}</option>)}
                                                </select>
                                            </td>
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
                                            <td style={{ fontSize: 12, whiteSpace: 'nowrap', fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#dc2626' : 'var(--text-muted)' }}>
                                                {isOverdue && '⚠ '}{fmtDate(t.deadline)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--border-light)', overflow: 'hidden', minWidth: 60 }}>
                                                        <div style={{
                                                            height: '100%', borderRadius: 4, width: `${t.progress}%`, transition: 'width 0.3s',
                                                            background: isBlocked ? '#dc2626' : t.progress >= 100 ? '#16a34a' : t.progress >= 50 ? '#2563eb' : '#f59e0b',
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 600, minWidth: 30 }}>{t.progress}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{ padding: '2px 7px', borderRadius: 20, background: ps.bg, color: ps.color, fontSize: 11, fontWeight: 600 }}>
                                                    {t.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <select
                                                    value={t.status}
                                                    disabled={t.isLocked}
                                                    onChange={e => handleStatusChange(t, e.target.value)}
                                                    style={{
                                                        padding: '3px 8px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 20,
                                                        background: ss.bg, color: ss.color,
                                                        cursor: t.isLocked ? 'not-allowed' : 'pointer',
                                                    }}
                                                >
                                                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-ghost btn-sm" title="Cập nhật tiến độ"
                                                        onClick={() => { setProgressTarget(t); setProgressVal(t.progress); }}>📊</button>
                                                    {isBlocked
                                                        ? <button className="btn btn-ghost btn-sm" title="Gỡ tắc nghẽn"
                                                            onClick={() => handleUnblock(t)} style={{ color: '#16a34a' }}>✅</button>
                                                        : <button className="btn btn-ghost btn-sm" title="Đánh dấu tắc nghẽn"
                                                            onClick={() => { setBlockTarget(t); setBlockReason(''); }} style={{ color: '#dc2626' }}>⛔</button>
                                                    }
                                                    <button className="btn btn-ghost btn-sm" title="Sửa"
                                                        onClick={() => openEdit(t)} disabled={t.isLocked}>✏️</button>
                                                    <button className="btn btn-ghost btn-sm" title={t.isLocked ? 'Mở khóa' : 'Khóa'}
                                                        onClick={() => handleLock(t)}>{t.isLocked ? '🔓' : '🔒'}</button>
                                                    <button className="btn btn-ghost btn-sm" title="Xóa"
                                                        onClick={() => setDeleteTarget(t)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                                        {search || filterStatus || filterProject || filterStage ? 'Không tìm thấy công việc nào' : 'Chưa có công việc nào'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="mobile-card-list">
                        {filtered.map(t => {
                            const ss  = STATUS_STYLE[t.status]   || STATUS_STYLE['Chờ làm'];
                            const stg = STAGE_STYLE[t.stage]     || { color: '#6b7280', bg: '#f3f4f6' };
                            const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
                            const isBlocked = !!t.blockedReason;
                            return (
                                <div key={t.id} className="mobile-card-item"
                                    style={{ borderLeft: `3px solid ${isBlocked ? '#dc2626' : isOverdue ? '#f59e0b' : 'transparent'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div style={{ flex: 1, paddingRight: 8 }}>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: isBlocked ? '#dc2626' : isOverdue ? '#b45309' : 'inherit' }}>
                                                {t.isLocked && '🔒 '}{t.title}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.project?.name || 'Không có DA'}</div>
                                            {isBlocked && (
                                                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>⛔ {t.blockedReason}</div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                            <span style={{ padding: '2px 8px', borderRadius: 20, background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 600 }}>
                                                {t.status}
                                            </span>
                                            <span style={{ padding: '1px 6px', borderRadius: 20, background: stg.bg, color: stg.color, fontSize: 10, fontWeight: 600 }}>
                                                {STAGE_VI[t.stage] || t.stage}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Tiến độ</span>
                                            <span style={{ fontWeight: 600 }}>{t.progress}%</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${t.progress}%`, borderRadius: 3,
                                                background: isBlocked ? '#dc2626' : t.progress >= 100 ? '#16a34a' : '#2563eb' }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                        <span style={{ color: isOverdue ? '#dc2626' : 'var(--text-muted)' }}>
                                            {isOverdue && '⚠ '}Hạn: {fmtDate(t.deadline)}
                                        </span>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setProgressTarget(t); setProgressVal(t.progress); }}>📊</button>
                                            {isBlocked
                                                ? <button className="btn btn-ghost btn-sm" onClick={() => handleUnblock(t)} style={{ color: '#16a34a' }}>✅</button>
                                                : <button className="btn btn-ghost btn-sm" onClick={() => { setBlockTarget(t); setBlockReason(''); }}>⛔</button>
                                            }
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

            {/* Modal tạo/sửa */}
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
                                <input className="form-input" value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="VD: Đóng tủ bếp nhà anh Nam..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả</label>
                                <textarea className="form-input" rows={2} value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Dự án</label>
                                    <select className="form-select" value={form.projectId}
                                        onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                                        <option value="">— Không gắn DA —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ưu tiên</label>
                                    <select className="form-select" value={form.priority}
                                        onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                        {PRIORITY_OPTS.map(p => <option key={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ngày bắt đầu</label>
                                    <input className="form-input" type="date" value={form.startDate}
                                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hạn hoàn thành</label>
                                    <input className="form-input" type="date" value={form.deadline}
                                        onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                                </div>
                            </div>

                            {/* Stage picker */}
                            <div className="form-group">
                                <label className="form-label">Công đoạn hiện tại</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                    {STAGES.map(s => {
                                        const st = STAGE_STYLE[s] || { color: '#6b7280', bg: '#f3f4f6' };
                                        return (
                                            <button key={s} type="button" onClick={() => setForm(f => ({ ...f, stage: s }))}
                                                style={{
                                                    padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '2px solid', fontWeight: 600,
                                                    borderColor: form.stage === s ? st.color : 'var(--border)',
                                                    background:  form.stage === s ? st.color : 'transparent',
                                                    color:       form.stage === s ? '#fff'   : 'inherit',
                                                }}>
                                                {STAGE_VI[s]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Worker picker */}
                            <div className="form-group">
                                <label className="form-label">Nhân công phụ trách</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                    {activeWorkers.length === 0 && (
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chưa có thợ. <a href="/workshop/workers">Thêm thợ →</a></span>
                                    )}
                                    {activeWorkers.map(w => (
                                        <button key={w.id} type="button" onClick={() => toggleWorker(w.id)}
                                            style={{
                                                padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: '2px solid', fontWeight: 600,
                                                borderColor: form.workerIds.includes(w.id) ? '#2563eb' : 'var(--border)',
                                                background:  form.workerIds.includes(w.id) ? '#2563eb' : 'transparent',
                                                color:       form.workerIds.includes(w.id) ? '#fff'   : 'inherit',
                                            }}>
                                            {w.name}{w.skill ? ` · ${w.skill}` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Material picker */}
                            <div className="form-group">
                                <label className="form-label">Vật tư sử dụng</label>
                                <input className="form-input" placeholder="Tìm vật tư..." value={matSearch}
                                    onChange={e => setMatSearch(e.target.value)} style={{ marginBottom: 8 }} />
                                {matSearch && (
                                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto', marginBottom: 8 }}>
                                        {products
                                            .filter(p => p.name.toLowerCase().includes(matSearch.toLowerCase()) && !form.materials.find(m => m.productId === p.id))
                                            .slice(0, 8)
                                            .map(p => (
                                                <div key={p.id} onClick={() => { addMaterial(p.id); setMatSearch(''); }}
                                                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <span>{p.name}</span>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Tồn: {p.stock} {p.unit}</span>
                                                </div>
                                            ))
                                        }
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
                                                    <button onClick={() => removeMaterial(m.productId)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--status-danger)', fontSize: 16 }}>×</button>
                                                </div>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
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

            {/* Modal tắc nghẽn */}
            {blockTarget && (
                <div className="modal-overlay" onClick={() => setBlockTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3>Đánh dấu tắc nghẽn</h3>
                            <button className="modal-close" onClick={() => setBlockTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 14 }}>⛔ {blockTarget.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                                Công đoạn: <strong>{STAGE_VI[blockTarget.stage] || blockTarget.stage}</strong>
                                &nbsp;· Trạng thái sẽ chuyển sang <strong>Tạm dừng</strong>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Lý do tắc nghẽn *</label>
                                <textarea className="form-input" rows={3} autoFocus
                                    placeholder="VD: Thiếu vật liệu gỗ MDF, chờ nhà cung cấp giao hàng..."
                                    value={blockReason} onChange={e => setBlockReason(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setBlockTarget(null)}>Hủy</button>
                            <button className="btn btn-danger" onClick={handleBlock} disabled={!blockReason.trim()}>
                                Xác nhận tắc nghẽn
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal cập nhật tiến độ */}
            {progressTarget && (
                <div className="modal-overlay" onClick={() => setProgressTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>Cập nhật tiến độ</h3>
                            <button className="modal-close" onClick={() => setProgressTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 14 }}>{progressTarget.title}</div>
                            <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                                Công đoạn:{' '}
                                <span style={{ fontWeight: 600, color: (STAGE_STYLE[progressTarget.stage] || {}).color }}>
                                    {STAGE_VI[progressTarget.stage] || progressTarget.stage}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                                <span>Tiến độ</span>
                                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 18 }}>{progressVal}%</span>
                            </div>
                            <input type="range" min={0} max={100} step={5} value={progressVal}
                                onChange={e => setProgressVal(Number(e.target.value))}
                                style={{ width: '100%', marginBottom: 8 }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                <span>0%</span><span>50%</span><span>100%</span>
                            </div>
                            <div style={{ marginTop: 12, height: 10, borderRadius: 5, background: 'var(--border-light)', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 5, transition: 'width 0.2s', width: `${progressVal}%`,
                                    background: progressVal >= 100 ? '#16a34a' : progressVal >= 50 ? '#2563eb' : '#f59e0b',
                                }} />
                            </div>
                            {progressVal >= 100 && (
                                <div style={{ marginTop: 8, fontSize: 12, color: '#16a34a', fontWeight: 600, textAlign: 'center' }}>
                                    ✓ Sẽ đánh dấu là Hoàn thành
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setProgressTarget(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleProgressSave}>Lưu tiến độ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm delete */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="modal-header">
                            <h3>Xác nhận xóa</h3>
                            <button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 14 }}>Xóa công việc <strong>{deleteTarget.title}</strong>?</p>
                        </div>
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
