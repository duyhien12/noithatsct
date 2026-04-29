'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const BAN_GD = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];
const PEER_GROUP_EMAILS = ['buihoa@kientrucsct.com', 'quocvuong@kientrucsct.com'];
const MANAGER_POSITIONS = ['Trưởng phòng', 'Quản lý'];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : null;
const fmtDateInput = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toISOString().split('T')[0];
};

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
    const [editingTask, setEditingTask] = useState(null);
    const [dragging, setDragging] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const dragTask = useRef(null);

    const isAdmin = BAN_GD.includes(session?.user?.role);
    const currentUserName = session?.user?.name || '';
    const currentUserEmail = session?.user?.email || '';
    const currentUserRole = session?.user?.role || '';
    const currentUserDept = session?.user?.department || '';
    const isPeerGroup = PEER_GROUP_EMAILS.includes(currentUserEmail);
    const isManager = !isAdmin && MANAGER_POSITIONS.includes(currentUserDept);
    const peerGroupUsers = users.filter(u => PEER_GROUP_EMAILS.includes(u.email));
    const peerGroupNames = peerGroupUsers.map(u => u.name);
    const teamUsers = isManager ? users.filter(u => u.role === currentUserRole) : [];

    useEffect(() => {
        if (status === 'authenticated' && !isAdmin && !isPeerGroup && !isManager) {
            setFilterUser(currentUserName);
        }
    }, [status, isAdmin, isPeerGroup, isManager, currentUserName]);

    const fetchTasks = () => {
        const params = new URLSearchParams();
        if (isAdmin) {
            if (filterUser) params.set('assignee', filterUser);
        } else if (isManager) {
            if (filterUser) params.set('assignee', filterUser);
            else params.set('dept', currentUserRole);
        } else if (isPeerGroup) {
            if (filterUser) params.set('assignee', filterUser);
        } else {
            params.set('assignee', currentUserName);
        }
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
    }, [filterUser, status, isAdmin, isManager]);

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

    const handleTaskSaved = (updatedTask) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        setEditingTask(null);
    };

    const filtered = tasks.filter(t => {
        if (isPeerGroup && !isAdmin && !filterUser && peerGroupNames.length > 0) {
            if (!peerGroupNames.includes(t.assignee) && !peerGroupNames.includes(t.createdBy)) return false;
        }
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

    const visibleUsers = isAdmin ? users : isManager ? teamUsers : users;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                ) : isManager ? (
                    <select className="form-select" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">Tất cả phòng ({teamUsers.length} người)</option>
                        {teamUsers.map(u => <option key={u.id} value={u.name}>{u.name}{u.department ? ` · ${u.department}` : ''}</option>)}
                    </select>
                ) : isPeerGroup ? (
                    <select className="form-select" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">Tất cả nhóm</option>
                        {peerGroupUsers.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                    </select>
                ) : (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        👤 {currentUserName}
                    </div>
                )}
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Tạo việc</button>
            </div>

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
                                        onEdit={setEditingTask}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateTaskModal
                    users={visibleUsers}
                    currentUserName={currentUserName}
                    onClose={() => setShowCreate(false)}
                    onCreate={(task) => {
                        setTasks(prev => [{ ...task, subTasks: [] }, ...prev]);
                        setShowCreate(false);
                    }}
                />
            )}

            {editingTask && (
                <TaskDetailModal
                    task={editingTask}
                    users={visibleUsers}
                    columns={COLUMNS}
                    priorities={PRIORITIES}
                    onClose={() => setEditingTask(null)}
                    onSave={handleTaskSaved}
                    onDelete={(taskId) => {
                        deleteTask(taskId);
                        setEditingTask(null);
                    }}
                />
            )}
        </div>
    );
}

function TaskCard({ task, col, dragging, columns, onDragStart, onDragEnd, onStatusChange, onDelete, onEdit }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);
    const isDraggingRef = useRef(false);

    useEffect(() => {
        if (!showMenu) return;
        const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showMenu]);

    const priorityColor = task.priority === 'Cao' ? '#dc2626' : task.priority === 'Thấp' ? '#6b7280' : '#d97706';
    const subTasks = task.subTasks || [];
    const doneSubTasks = subTasks.filter(s => s.status === 'Hoàn thành').length;

    return (
        <div
            draggable
            onDragStart={e => { isDraggingRef.current = true; onDragStart(e, task); }}
            onDragEnd={e => { isDraggingRef.current = false; onDragEnd(e); }}
            onClick={(e) => {
                if (isDraggingRef.current) return;
                if (e.target.closest('[data-no-open]')) return;
                onEdit(task);
            }}
            style={{
                background: '#fff',
                borderRadius: 8,
                padding: '10px 11px',
                boxShadow: dragging ? '0 4px 16px rgba(0,0,0,0.18)' : '0 1px 4px rgba(0,0,0,0.08)',
                opacity: dragging ? 0.5 : 1,
                cursor: 'pointer',
                border: `1px solid ${col.color}22`,
                userSelect: 'none',
                position: 'relative',
                transition: 'box-shadow 0.15s',
            }}
        >
            <div data-no-open style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor, background: `${priorityColor}18`, borderRadius: 4, padding: '1px 7px' }}>
                    {task.priority}
                </span>
                <button
                    data-no-open
                    onClick={(e) => { e.stopPropagation(); if (confirm('Xóa tác vụ này?')) onDelete(task.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
                    title="Xóa"
                >×</button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 7, lineHeight: 1.4 }}>
                {task.title}
            </div>

            {task.description && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {task.description}
                </div>
            )}

            {subTasks.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${(doneSubTasks / subTasks.length) * 100}%`, height: '100%', background: '#16a34a', transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>✓ {doneSubTasks}/{subTasks.length}</span>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {task.assignee && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {task.assignee}</span>}
                    {fmtDate(task.dueDate) && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>📅 {fmtDate(task.dueDate)}</span>}
                </div>
            </div>

            <div data-no-open style={{ marginTop: 8, position: 'relative' }} ref={menuRef}>
                <button
                    data-no-open
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

function TaskDetailModal({ task, users, columns, priorities, onClose, onSave, onDelete }) {
    const [form, setForm] = useState({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'Việc sẽ làm',
        priority: task.priority || 'Trung bình',
        assignee: task.assignee || '',
        dueDate: fmtDateInput(task.dueDate),
    });
    const [subTasks, setSubTasks] = useState(task.subTasks || []);
    const [newSubTask, setNewSubTask] = useState('');
    const [saving, setSaving] = useState(false);
    const [addingSubTask, setAddingSubTask] = useState(false);
    const [error, setError] = useState('');
    const newSubRef = useRef(null);

    const save = async () => {
        if (!form.title.trim()) { setError('Vui lòng nhập tiêu đề'); return; }
        setSaving(true);
        setError('');
        const res = await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: form.title.trim(),
                description: form.description.trim(),
                status: form.status,
                priority: form.priority,
                assignee: form.assignee,
                dueDate: form.dueDate || null,
            }),
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) { setError(data.error || 'Lỗi lưu tác vụ'); return; }
        onSave({ ...data, subTasks });
    };

    const addSubTask = async () => {
        if (!newSubTask.trim()) return;
        setAddingSubTask(true);
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: newSubTask.trim(),
                parentId: task.id,
                status: 'Việc sẽ làm',
                priority: 'Trung bình',
                assignee: '',
            }),
        });
        const data = await res.json();
        setAddingSubTask(false);
        if (res.ok) {
            setSubTasks(prev => [...prev, data]);
            setNewSubTask('');
            newSubRef.current?.focus();
        }
    };

    const toggleSubTask = async (sub) => {
        const newStatus = sub.status === 'Hoàn thành' ? 'Việc sẽ làm' : 'Hoàn thành';
        setSubTasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s));
        const res = await fetch(`/api/tasks/${sub.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
            setSubTasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: sub.status } : s));
        }
    };

    const deleteSubTask = async (subId) => {
        setSubTasks(prev => prev.filter(s => s.id !== subId));
        await fetch(`/api/tasks/${subId}`, { method: 'DELETE' });
    };

    const doneCount = subTasks.filter(s => s.status === 'Hoàn thành').length;
    const totalCount = subTasks.length;
    const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560, boxShadow: '0 12px 40px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 80px)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            className="form-input"
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            style={{ flex: 1, fontSize: 15, fontWeight: 700, padding: '6px 10px' }}
                            placeholder="Tiêu đề tác vụ..."
                        />
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1, padding: '4px 6px', flexShrink: 0 }}>×</button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                    {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Trạng thái</label>
                            <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', fontSize: 12 }}>
                                {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ưu tiên</label>
                            <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ width: '100%', fontSize: 12 }}>
                                {priorities.map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Người nhận</label>
                            <select className="form-select" value={form.assignee} onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))} style={{ width: '100%', fontSize: 12 }}>
                                <option value="">-- Chọn người --</option>
                                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hạn</label>
                            <input type="date" className="form-input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} style={{ width: '100%', fontSize: 12 }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Mô tả</label>
                        <textarea
                            className="form-input"
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Thêm mô tả chi tiết..."
                            rows={3}
                            style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                        />
                    </div>

                    {/* Subtasks / Checklist */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Tác vụ con
                            </label>
                            {totalCount > 0 && (
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{doneCount}/{totalCount}</span>
                            )}
                        </div>

                        {totalCount > 0 && (
                            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 30, textAlign: 'right' }}>{progressPct}%</span>
                                <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPct}%`, height: '100%', background: '#16a34a', borderRadius: 3, transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                            {subTasks.map(sub => (
                                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                    <input
                                        type="checkbox"
                                        checked={sub.status === 'Hoàn thành'}
                                        onChange={() => toggleSubTask(sub)}
                                        style={{ cursor: 'pointer', width: 15, height: 15, flexShrink: 0, accentColor: '#16a34a' }}
                                    />
                                    <span style={{
                                        flex: 1,
                                        fontSize: 13,
                                        color: sub.status === 'Hoàn thành' ? '#9ca3af' : 'var(--text-primary)',
                                        textDecoration: sub.status === 'Hoàn thành' ? 'line-through' : 'none',
                                    }}>
                                        {sub.title}
                                    </span>
                                    <button
                                        onClick={() => deleteSubTask(sub.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                                        title="Xóa tác vụ con"
                                    >×</button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 6 }}>
                            <input
                                ref={newSubRef}
                                className="form-input"
                                value={newSubTask}
                                onChange={e => setNewSubTask(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubTask(); } }}
                                placeholder="Thêm tác vụ con... (Enter để thêm)"
                                style={{ flex: 1, fontSize: 12 }}
                                disabled={addingSubTask}
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={addSubTask}
                                disabled={addingSubTask || !newSubTask.trim()}
                                style={{ fontSize: 12, padding: '4px 12px', flexShrink: 0 }}
                            >
                                {addingSubTask ? '...' : '+ Thêm'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#fafafa' }}>
                    <button
                        className="btn btn-danger"
                        onClick={() => { if (confirm('Xóa tác vụ này và tất cả tác vụ con?')) onDelete(task.id); }}
                        style={{ fontSize: 12 }}
                    >
                        Xóa tác vụ
                    </button>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={onClose} style={{ fontSize: 12 }}>Hủy</button>
                        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ fontSize: 12 }}>
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </div>
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
