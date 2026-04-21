'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const CATEGORIES = [
    { key: 'Gia công nguội',         label: 'Gia công nguội',         color: '#dbeafe', hd: '#93c5fd' },
    { key: 'Lắp ghép tại xưởng',     label: 'Lắp ghép tại xưởng',     color: '#fef9c3', hd: '#fde047' },
    { key: 'Lắp đặt tại công trình', label: 'Lắp đặt tại công trình', color: '#dbeafe', hd: '#93c5fd' },
    { key: 'Bảo dưỡng',              label: 'Bảo dưỡng',              color: '#fef9c3', hd: '#fde047' },
    { key: 'Việc khác',              label: 'Việc khác',              color: '#f0fdf4', hd: '#86efac' },
];
const DAYS_VI = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isActiveOnDay(task, day) {
    const start = task.startDate ? new Date(task.startDate) : null;
    const end = task.deadline ? new Date(task.deadline) : null;
    const localStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dayStr = localStr(day);
    const startStr = start ? localStr(start) : null;
    const endStr = end ? localStr(end) : null;
    if (startStr && endStr) return dayStr >= startStr && dayStr <= endStr;
    if (startStr) return dayStr === startStr;
    if (endStr) return dayStr === endStr;
    return false;
}
function fmtShortDate(d) { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`; }
// toLocalISO dùng giờ địa phương để tránh lệch timezone
function toISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function getWeekNum(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(),0,1))) / 86400000) + 1) / 7);
}

// Worker autocomplete chip input
function WorkerChipInput({ selected, workerList, onChange }) {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const ref = useRef(null);

    const handleInput = (val) => {
        setInput(val);
        if (val.trim().length > 0) {
            setSuggestions(workerList.filter(w =>
                w.name.toLowerCase().includes(val.toLowerCase()) && !selected.includes(w.name)
            ).slice(0, 6));
        } else {
            setSuggestions([]);
        }
    };

    const add = (name) => {
        if (!selected.includes(name)) onChange([...selected, name]);
        setInput('');
        setSuggestions([]);
    };

    const remove = (name) => onChange(selected.filter(n => n !== name));

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            if (suggestions.length > 0) add(suggestions[0].name);
            else add(input.trim());
        }
        if (e.key === 'Backspace' && !input && selected.length > 0) {
            remove(selected[selected.length - 1]);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', minHeight: 34, alignItems: 'center', cursor: 'text' }} onClick={() => ref.current?.focus()}>
                {selected.map(name => (
                    <span key={name} style={{ padding: '1px 6px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        {name}
                        <span style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, lineHeight: 1 }} onClick={(e) => { e.stopPropagation(); remove(name); }}>×</span>
                    </span>
                ))}
                <input
                    ref={ref}
                    value={input}
                    onChange={e => handleInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={selected.length === 0 ? 'Nhập tên thợ...' : ''}
                    style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, minWidth: 80, background: 'transparent', padding: '2px 0' }}
                />
            </div>
            {suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto', marginTop: 2 }}>
                    {suggestions.map(w => (
                        <div key={w.id} onMouseDown={() => add(w.name)} style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                                {w.name.split(' ').pop()?.[0]?.toUpperCase()}
                            </span>
                            <div>
                                <div style={{ fontWeight: 600 }}>{w.name}</div>
                                {w.skill && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{w.skill}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Project autocomplete input (single line)
function ProjectInput({ value, projectId, projects, onChange }) {
    const [input, setInput] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Sync when value changes externally
    useEffect(() => { setInput(value || ''); }, [value]);

    const handleInput = (val) => {
        setInput(val);
        onChange(val, null);
        if (val.trim().length > 0) {
            const q = val.toLowerCase();
            setSuggestions(projects.filter(p =>
                p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
            ).slice(0, 8));
            setOpen(true);
        } else {
            setSuggestions([]);
            setOpen(false);
        }
    };

    const select = (p) => {
        setInput(p.name);
        setSuggestions([]);
        setOpen(false);
        onChange(p.name, p.id);
    };

    return (
        <div style={{ position: 'relative' }}>
            <input
                ref={ref}
                className="form-input"
                placeholder="Tên công trình *"
                value={input}
                autoFocus
                onChange={e => handleInput(e.target.value)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                onFocus={() => input.trim() && suggestions.length > 0 && setOpen(true)}
                style={{ fontSize: 12, padding: '5px 8px', width: '100%' }}
            />
            {open && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                    {suggestions.map(p => (
                        <div key={p.id} onMouseDown={() => select(p)}
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-light)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontWeight: 700, color: '#2563eb', marginRight: 6 }}>{p.code}</span>
                            <span style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Inline task row (edit existing task inside CellEditor)
function TaskRow({ task, category, workers, projects, onSaved, onDeleted }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(task.title || '');
    const [projectId, setProjectId] = useState(task.projectId || '');
    const [selWorkers, setSelWorkers] = useState(task.workers?.map(tw => tw.worker?.name).filter(Boolean) || []);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!title.trim()) return;
        setSaving(true);
        const workerIds = selWorkers.map(name => workers.find(w => w.name === name)?.id).filter(Boolean);
        await fetch(`/api/workshop/tasks/${task.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title.trim(), projectId: projectId || null, workerIds, category: category.key }),
        });
        setSaving(false);
        setEditing(false);
        onSaved();
    };

    const del = async () => {
        if (!confirm(`Xóa "${task.title}"?`)) return;
        await fetch(`/api/workshop/tasks/${task.id}`, { method: 'DELETE' });
        onDeleted();
    };

    const workerNames = task.workers?.map(tw => tw.worker?.name).filter(Boolean).join(', ');

    if (!editing) return (
        <div style={{ padding: '5px 7px', background: category.color, borderRadius: 6, marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditing(true)}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#1e3a5f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                {task.project && <div style={{ fontSize: 10, color: '#2563eb' }}>{task.project.code}</div>}
                {workerNames && <div style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>👷 {workerNames}</div>}
            </div>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <button style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', fontSize: 11 }} onClick={() => setEditing(true)}>✏️</button>
                <button style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', fontSize: 11 }} onClick={del}>✕</button>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '6px 7px', background: '#f0f9ff', border: '1px solid #93c5fd', borderRadius: 6, marginBottom: 5, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <ProjectInput value={title} projectId={projectId} projects={projects} onChange={(name, id) => { setTitle(name); setProjectId(id || ''); }} />
            <WorkerChipInput selected={selWorkers} workerList={workers} onChange={setSelWorkers} />
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} style={{ padding: '2px 7px', fontSize: 11 }}>Hủy</button>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !title.trim()} style={{ padding: '2px 8px', fontSize: 11 }}>{saving ? '...' : 'Lưu'}</button>
            </div>
        </div>
    );
}

// Cell editor popover — manages ALL tasks in a day+category cell
function CellEditor({ day, category, cellTasks, pos, workers, projects, onSave, onClose }) {
    const [showAdd, setShowAdd] = useState(cellTasks.length === 0);
    const [newTitle, setNewTitle] = useState('');
    const [newProjectId, setNewProjectId] = useState('');
    const [newWorkers, setNewWorkers] = useState([]);
    const [saving, setSaving] = useState(false);

    const addTask = async () => {
        if (!newTitle.trim()) return;
        setSaving(true);
        const workerIds = newWorkers.map(name => workers.find(w => w.name === name)?.id).filter(Boolean);
        const dateStr = toISO(day);
        await fetch('/api/workshop/tasks', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle.trim(), projectId: newProjectId || null, startDate: dateStr, deadline: dateStr, category: category.key, status: 'Đang làm', workerIds }),
        });
        setSaving(false);
        setNewTitle(''); setNewProjectId(''); setNewWorkers([]);
        setShowAdd(false);
        onSave();
    };

    return (
        <>
            {/* Overlay để click ngoài đóng */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 1998 }} onMouseDown={onClose} />
            <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1999, width: 290, background: 'var(--bg-card)', border: '1.5px solid var(--accent-primary)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', padding: 12, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }} onMouseDown={e => e.stopPropagation()}>
                <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--accent-primary)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {DAYS_VI[day.getDay()]} {fmtShortDate(day)} · {category.label}
                </div>

                {/* Existing tasks */}
                {cellTasks.map(task => (
                    <TaskRow key={task.id} task={task} category={category} workers={workers} projects={projects} onSaved={onSave} onDeleted={onSave} />
                ))}

                {/* Add form */}
                {showAdd ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: cellTasks.length > 0 ? '1px dashed var(--border)' : 'none', paddingTop: cellTasks.length > 0 ? 8 : 0 }}>
                        {cellTasks.length > 0 && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Thêm dự án mới</div>}
                        <ProjectInput value={newTitle} projects={projects} onChange={(name, id) => { setNewTitle(name); setNewProjectId(id || ''); }} />
                        <WorkerChipInput selected={newWorkers} workerList={workers} onChange={setNewWorkers} />
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); if (cellTasks.length === 0) onClose(); }} style={{ padding: '3px 8px', fontSize: 12 }}>Hủy</button>
                            <button className="btn btn-primary btn-sm" onClick={addTask} disabled={saving || !newTitle.trim()} style={{ padding: '3px 10px', fontSize: 12 }}>{saving ? '...' : '+ Thêm'}</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '3px 8px', fontSize: 12 }}>Đóng</button>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} style={{ padding: '3px 10px', fontSize: 12 }}>+ Thêm dự án</button>
                    </div>
                )}
            </div>
        </>
    );
}

export default function WorkLogPage() {
    const router = useRouter();
    const { role } = useRole();
    const [tasks, setTasks] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [editCell, setEditCell] = useState(null); // { day, category }

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/'); return;
        }
        fetchAll();
        fetch('/api/workshop/workers').then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : []));
        fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(Array.isArray(d?.data) ? d.data : []));
    }, [role]);

    const fetchAll = () => {
        setLoading(true);
        fetch('/api/workshop/tasks')
            .then(r => r.json())
            .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); });
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekEnd = weekDays[6];
    const weekNum = getWeekNum(weekStart);
    const today = new Date(); today.setHours(0,0,0,0);

    const getCell = (day, catKey) => tasks.filter(t => t.category === catKey && isActiveOnDay(t, day));

    const openEdit = (day, category, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const left = Math.min(rect.left, window.innerWidth - 296);
        const top = rect.bottom + 4;
        setEditCell({ day, category, pos: { top, left } });
    };

    const closeEdit = () => setEditCell(null);

    const handleSaved = () => { closeEdit(); fetchAll(); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--border)', background: '#1C3A6B', color: '#fff', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Kế hoạch - Nhật ký nhân sự xưởng nội thất SCT
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>
                        Từ ngày {fmtShortDate(weekStart)} đến ngày {fmtShortDate(weekEnd)}.{weekEnd.getFullYear()}
                    </div>
                </div>

                {/* Week nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(d => addDays(d, -7))}>◀</button>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', padding: '0 8px' }}>Tuần {weekNum}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(d => addDays(d, 7))}>▶</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setWeekStart(getWeekStart(new Date()))}>Tuần này</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>💡 Nhấn vào ô để thêm/sửa</span>
                        <button className="btn btn-ghost btn-sm" onClick={fetchAll}>🔄 Làm mới</button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                    {/* ── Desktop table ── */}
                    <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
                            <thead>
                                <tr style={{ background: '#1C3A6B', color: '#fff' }}>
                                    <th rowSpan={2} style={{ padding: '8px 10px', border: '1px solid #2a4a8b', minWidth: 80, verticalAlign: 'middle', textAlign: 'center', fontSize: 11 }}>Ngày / Tháng</th>
                                    {CATEGORIES.map(cat => (
                                        <th key={cat.key} colSpan={2} style={{ padding: '6px 10px', border: '1px solid #2a4a8b', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{cat.label}</th>
                                    ))}
                                </tr>
                                <tr style={{ background: '#2A5298', color: '#e2e8f0' }}>
                                    {CATEGORIES.map(cat => (
                                        [<th key={cat.key+'_ct'} style={{ padding: '5px 8px', border: '1px solid #3a5fa8', minWidth: 120, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>Tên CT</th>,
                                         <th key={cat.key+'_cb'} style={{ padding: '5px 8px', border: '1px solid #3a5fa8', minWidth: 110, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>CB T/hiện</th>]
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {weekDays.map((day, di) => {
                                    const isToday = isSameDay(day, today);
                                    const dow = day.getDay();
                                    const isWeekend = dow === 0 || dow === 6;
                                    const rowBg = isToday ? '#fffbeb' : isWeekend ? '#fef2f2' : di % 2 === 0 ? '#f8fafc' : '#ffffff';
                                    const cellTasks = CATEGORIES.map(cat => getCell(day, cat.key));
                                    const maxRows = Math.max(1, ...cellTasks.map(t => t.length));

                                    return Array.from({ length: maxRows }, (_, ri) => (
                                        <tr key={`${day.toISOString()}-${ri}`} style={{ background: rowBg, borderBottom: ri === maxRows - 1 ? '2px solid var(--border)' : '1px solid var(--border-light)' }}>
                                            {ri === 0 && (
                                                <td rowSpan={maxRows} style={{ padding: '8px 10px', border: '1px solid var(--border)', background: isToday ? '#fef3c7' : isWeekend ? '#fee2e2' : '#f1f5f9', fontWeight: isToday ? 800 : 600, textAlign: 'center', verticalAlign: 'middle', fontSize: 12, whiteSpace: 'nowrap', color: isToday ? '#92400e' : isWeekend ? '#dc2626' : '#475569' }}>
                                                    <div>{DAYS_VI[dow]}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 800 }}>{fmtShortDate(day)}</div>
                                                    {isToday && <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>Hôm nay</div>}
                                                </td>
                                            )}
                                            {CATEGORIES.map((cat, ci) => {
                                                const catTasks = cellTasks[ci];
                                                const task = catTasks[ri];
                                                const workers_ = task?.workers?.map(tw => tw.worker?.name).filter(Boolean).join(', ') || '';
                                                const isEditing = editCell && isSameDay(editCell.day, day) && editCell.category.key === cat.key;

                                                return [
                                                    <td key={cat.key+'_ct_'+ri} onClick={(e) => openEdit(day, cat, e)} style={{ padding: '5px 8px', border: '1px solid var(--border-light)', background: task ? cat.color : 'transparent', verticalAlign: 'top', cursor: 'pointer', minWidth: 120 }}
                                                        title="Nhấn để thêm/sửa">
                                                        {task ? (
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: '#1e3a5f', lineHeight: 1.3, fontSize: 12 }}>{task.title}</div>
                                                                {task.project && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{task.project.code}</div>}
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: '#d1d5db', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>+</div>
                                                        )}
                                                    </td>,
                                                    <td key={cat.key+'_cb_'+ri} onClick={(e) => openEdit(day, cat, e)} style={{ padding: '5px 8px', border: '1px solid var(--border-light)', background: task ? cat.color : 'transparent', verticalAlign: 'top', cursor: 'pointer', minWidth: 110 }}>
                                                        {task && workers_ ? <div style={{ color: '#374151', fontSize: 12 }}>{workers_}</div> : null}
                                                    </td>
                                                ];
                                            })}
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile ── */}
                    <div className="mobile-card-list">
                        {weekDays.map(day => {
                            const dow = day.getDay();
                            const isToday = isSameDay(day, today);
                            const isWeekend = dow === 0 || dow === 6;
                            const dayTasks = tasks.filter(t => isActiveOnDay(t, day));
                            return (
                                <div key={day.toISOString()}>
                                    <div style={{ padding: '8px 14px', background: isToday ? '#fef3c7' : isWeekend ? '#fee2e2' : '#f1f5f9', borderBottom: '2px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: isWeekend ? '#dc2626' : '#475569' }}>{DAYS_VI[dow]} {fmtShortDate(day)}</span>
                                        {isToday && <span style={{ fontSize: 11, background: '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: 8 }}>Hôm nay</span>}
                                                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={(e) => openEdit(day, CATEGORIES[0], e)}>+ Thêm</button>
                                    </div>
                                    {dayTasks.length === 0
                                        ? <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có việc</div>
                                        : dayTasks.map(task => {
                                            const cat = CATEGORIES.find(c => c.key === task.category);
                                            return (
                                                <div key={task.id} className="mobile-card-item" style={{ borderLeft: `3px solid ${cat?.hd || '#e5e7eb'}`, cursor: 'pointer' }}
                                                    onClick={(e) => openEdit(day, cat || CATEGORIES[0], e)}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{task.title}</div>
                                                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: cat?.color || '#f3f4f6', color: '#374151', flexShrink: 0, marginLeft: 6 }}>{cat?.label}</span>
                                                    </div>
                                                    {task.project && <div style={{ fontSize: 11, color: '#2563eb' }}>{task.project.code} · {task.project.name}</div>}
                                                    {task.workers?.length > 0 && <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>👷 {task.workers.map(tw => tw.worker?.name).filter(Boolean).join(', ')}</div>}
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            );
                        })}
                    </div>
                    </>
                )}

                {/* Legend */}
                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                    {CATEGORIES.map(cat => (
                        <span key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 3, background: cat.hd, display: 'inline-block' }} />
                            {cat.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* CellEditor portal — render ngoài table tránh bị clip bởi overflow */}
            {editCell && (
                <CellEditor
                    day={editCell.day}
                    category={editCell.category}
                    cellTasks={getCell(editCell.day, editCell.category.key)}
                    pos={editCell.pos}
                    workers={workers}
                    projects={projects}
                    onSave={handleSaved}
                    onClose={closeEdit}
                />
            )}
        </div>
    );
}
