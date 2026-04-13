'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const BAN_GD = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : null;

const COLUMNS = [
    { key: 'Việc sẽ làm',    label: 'VIỆC SẼ LÀM',   color: '#6b7280', bg: '#f3f4f6' },
    { key: 'Việc cần làm',   label: 'VIỆC CẦN LÀM',  color: '#d97706', bg: '#fffbeb' },
    { key: 'Đang thực hiện', label: 'VIỆC ĐANG LÀM', color: '#2563eb', bg: '#eff6ff' },
    { key: 'Hoàn thành',     label: 'HOÀN THÀNH',     color: '#16a34a', bg: '#f0fdf4' },
    { key: 'Đã hủy',         label: 'VIỆC HỦY',       color: '#dc2626', bg: '#fef2f2' },
];

const PRIORITIES = ['Cao', 'Trung bình', 'Thấp'];

export default function TasksPage() {
    const { data: session, status } = useSession();
    const [tasks, setTasks] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterUser, setFilterUser] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [dragging, setDragging] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const dragTask = useRef(null);

    const isAdmin = BAN_GD.includes(session?.user?.role);
    const currentUserName = session?.user?.name || '';

    // Auto-filter: non-admin chỉ thấy việc của mình
    useEffect(() => {
        if (status === 'authenticated' && !isAdmin) {
            setFilterUser(currentUserName);
        }
    }, [status, isAdmin, currentUserName]);

    const fetchTasks = () => {
        const params = new URLSearchParams();
        const effectiveFilter = isAdmin ? filterUser : currentUserName;
        if (effectiveFilter) params.set('assignee', effectiveFilter);
        fetch(`/api/tasks?${params}`)
            .then(r => r.json())
            .then(d => {
                if (d.data) setTasks(d.data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetch('/api/users').then(r => r.json()).then(d => setUsers(Array.isArray(d) ? d : []));
    }, []);

    useEffect(() => {
        if (status !== 'authenticated') return;
        setLoading(true);
        fetchTasks();
    }, [filterUser, status, isAdmin]);

    const updateStatus = async (taskId, newStatus) => {
        const prev = tasks.find(t => t.id === taskId)?.status;
        setTasks(t => t.map(x => x.id === taskId ? { ...x, status: newStatus } : x));
        const res = await fetch(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok && prev) {
            setTasks(t => t.map(x => x.id === taskId ? { ...x, status: prev } : x));
            alert('Lỗi cập nhật trạng thái, vui lòng thử lại.');
        }
    };

    const deleteTask = async (taskId) => {
        const snapshot = tasks;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        if (!res.ok && res.status !== 404) {
            setTasks(snapshot);
            alert('Lỗi xóa tác vụ, vui lòng thử lại.');
        }
    };

    const filtered = tasks.filter(t => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || (t.assignee || '').toLowerCase().includes(q);
    });

    const byColumn = (colKey) => filtered.filter(t => t.status === colKey);

    const onDragStart = (e, task) => { dragTask.current = task; setDragging(task.id); e.dataTransfer.effectAllowed = 'move'; };
    const onDragEnd = () => { setDragging(null); setDragOver(null); dragTask.current = null; };
    const onDragOver = (e, colKey) => { e.preventDefault(); setDragOver(colKey); };
    const onDrop = (e, colKey) => {
        e.preventDefault();
        if (dragTask.current && dragTask.current.status !== colKey) updateStatus(dragTask.current.id, colKey);
        setDragOver(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Tìm kiếm..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 180 }}
                />
                {isAdmin ? (
                    <select className="form-select" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">Tất cả người dùng</option>
                        {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        👤 {currentUserName}
                    </div>
                )}
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Tạo việc</button>
            </div>

            {/* Board */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 16 }}>
                    {COLUMNS.map(col => (
                        <div
                            key={col.key}
                            onDragOver={e => onDragOver(e, col.key)}
                            onDrop={e => onDrop(e, col.key)}
                            style={{
                                minWidth: 252,
                                width: 252,
                                flexShrink: 0,
                                background: dragOver === col.key ? col.bg : 'var(--bg-secondary, #f8f9fa)',
                                borderRadius: 10,
                                border: dragOver === col.key ? `2px dashed ${col.color}` : '2px solid transparent',
                                transition: 'border 0.15s, background 0.15s',
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: 'calc(100vh - 160px)',
                            }}
                        >
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '8px 8px 0 0',
                                background: col.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexShrink: 0,
                            }}>
                                <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>{col.label}</span>
                                <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 12, padding: '1px 9px', fontSize: 12, fontWeight: 700 }}>
                                    {byColumn(col.key).length}
                                </span>
                            </div>
                            <div style={{ padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                                {byColumn(col.key).length === 0 && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '20px 0', opacity: 0.6, border: '1.5px dashed var(--border-color)', borderRadius: 8 }}>
                                        Trống
                                    </div>
                                )}
                                {byColumn(col.key).map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        col={col}
                                        dragging={dragging === task.id}
                                        columns={COLUMNS}
                                        onDragStart={onDragStart}
                                        onDragEnd={onDragEnd}
                                        onStatusChange={updateStatus}
                                        onDelete={deleteTask}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateTaskModal
                    users={users}
                    currentUserName={currentUserName}
                    onClose={() => setShowCreate(false)}
                    onCreate={(task) => {
                        setTasks(prev => [task, ...prev]);
                        setShowCreate(false);
                        fetchTasks();
                    }}
                />
            )}
        </div>
    );
}

function TaskCard({ task, col, dragging, columns, onDragStart, onDragEnd, onStatusChange, onDelete }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!showMenu) return;
        const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showMenu]);

    const priorityColor = task.priority === 'Cao' ? '#dc2626' : task.priority === 'Thấp' ? '#6b7280' : '#d97706';

    return (
        <div
            draggable
            onDragStart={e => onDragStart(e, task)}
            onDragEnd={onDragEnd}
            style={{
                background: '#fff',
                borderRadius: 8,
                padding: '10px 11px',
                boxShadow: dragging ? '0 4px 16px rgba(0,0,0,0.18)' : '0 1px 4px rgba(0,0,0,0.08)',
                opacity: dragging ? 0.5 : 1,
                cursor: 'grab',
                border: `1px solid ${col.color}22`,
                userSelect: 'none',
                position: 'relative',
            }}
        >
            {/* Priority + delete */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor, background: `${priorityColor}18`, borderRadius: 4, padding: '1px 7px' }}>
                    {task.priority}
                </span>
                <button
                    onClick={() => { if (confirm('Xóa tác vụ này?')) onDelete(task.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                    title="Xóa"
                >×</button>
            </div>

            {/* Title */}
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7, lineHeight: 1.4 }}>
                {task.title}
            </div>

            {/* Description */}
            {task.description && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{task.description}</div>
            )}

            {/* Meta */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {task.assignee && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {task.assignee}</span>}
                    {fmtDate(task.dueDate) && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>📅 {fmtDate(task.dueDate)}</span>}
                </div>
            </div>

            {/* Move button */}
            <div style={{ marginTop: 8, position: 'relative' }} ref={menuRef}>
                <button
                    onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
                    style={{ background: col.bg || '#f3f4f6', border: `1px solid ${col.color}44`, borderRadius: 5, padding: '3px 10px', fontSize: 11, color: col.color, cursor: 'pointer', fontWeight: 600, width: '100%' }}
                >
                    Chuyển cột ▾
                </button>
                {showMenu && (
                    <div style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.13)', zIndex: 100, overflow: 'hidden' }}>
                        {columns.map(c => (
                            <button
                                key={c.key}
                                onClick={e => { e.stopPropagation(); onStatusChange(task.id, c.key); setShowMenu(false); }}
                                style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: c.key === task.status ? c.bg : 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 12, fontWeight: c.key === task.status ? 700 : 400, color: c.color }}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function CreateTaskModal({ users, currentUserName, onClose, onCreate }) {
    const [form, setForm] = useState({ title: '', description: '', status: 'Việc sẽ làm', priority: 'Trung bình', assignee: currentUserName || '', dueDate: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề'); return; }
        setSaving(true);
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Lỗi tạo tác vụ'); setSaving(false); return; }
        onCreate(data);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Tạo tác vụ mới</span>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tiêu đề *</label>
                        <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nhập tiêu đề tác vụ..." style={{ width: '100%' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Mô tả</label>
                        <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả chi tiết..." rows={3} style={{ width: '100%', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cột</label>
                            <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Ưu tiên</label>
                            <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Người nhận</label>
                        <select className="form-select" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} style={{ width: '100%' }}>
                            <option value="">-- Chọn người --</option>
                            {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Hạn</label>
                        <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ width: '100%' }} />
                    </div>
                </div>
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo việc'}</button>
                </div>
            </div>
        </div>
    );
}
