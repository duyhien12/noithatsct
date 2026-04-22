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
function fmtShortDate(d) { return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`; }
function toISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function getWeekNum(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(),0,1))) / 86400000) + 1) / 7);
}
function parseWorkers(json) {
    try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}

// Worker multi-select chip input
function WorkerChipInput({ selected, workerList, onChange, placeholder = 'Chọn thợ...' }) {
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
            setSuggestions(workerList.filter(w => !selected.includes(w.name)).slice(0, 8));
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
        if (e.key === 'Backspace' && !input && selected.length > 0) remove(selected[selected.length - 1]);
    };

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', minHeight: 34, alignItems: 'center', cursor: 'text' }}
                onClick={() => { ref.current?.focus(); if (!input) setSuggestions(workerList.filter(w => !selected.includes(w.name)).slice(0, 8)); }}>
                {selected.map(name => (
                    <span key={name} style={{ padding: '1px 6px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        {name}
                        <span style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12 }} onClick={e => { e.stopPropagation(); remove(name); }}>×</span>
                    </span>
                ))}
                <input ref={ref} value={input} onChange={e => handleInput(e.target.value)} onKeyDown={handleKeyDown}
                    onBlur={() => setTimeout(() => setSuggestions([]), 150)}
                    placeholder={selected.length === 0 ? placeholder : ''}
                    style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, minWidth: 80, background: 'transparent', padding: '2px 0' }} />
            </div>
            {suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto', marginTop: 2 }}>
                    {suggestions.map(w => (
                        <div key={w.id} onMouseDown={() => add(w.name)}
                            style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}
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

// Project dropdown (for non-"Việc khác" categories)
function ProjectDropdown({ value, projectId, projects, onChange }) {
    const [input, setInput] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => { setInput(value || ''); }, [value]);

    const handleInput = (val) => {
        setInput(val);
        onChange(val, null);
        const q = val.toLowerCase();
        setSuggestions(val.trim() ? projects.filter(p =>
            p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
        ).slice(0, 10) : projects.slice(0, 10));
        setOpen(true);
    };

    const select = (p) => {
        setInput(p.name);
        setSuggestions([]);
        setOpen(false);
        onChange(p.name, p.id);
    };

    return (
        <div style={{ position: 'relative' }}>
            <input ref={ref} className="form-input" placeholder="Chọn công trình..."
                value={input}
                onChange={e => handleInput(e.target.value)}
                onFocus={() => { setSuggestions(projects.slice(0, 10)); setOpen(true); }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                style={{ fontSize: 12, padding: '5px 8px', width: '100%' }} />
            {open && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1100, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
                    {suggestions.map(p => (
                        <div key={p.id} onMouseDown={() => select(p)}
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-light)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontWeight: 700, color: '#2563eb', marginRight: 6 }}>{p.code}</span>
                            <span>{p.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Inline entry row (edit existing entry)
function EntryRow({ entry, category, workers, projects, onSaved, onDeleted }) {
    const [editing, setEditing] = useState(false);
    const [projectName, setProjectName] = useState(entry.projectName || '');
    const [projectId, setProjectId] = useState(entry.projectId || '');
    const [selWorkers, setSelWorkers] = useState(parseWorkers(entry.mainWorkers));
    const [note, setNote] = useState(entry.note || '');
    const [saving, setSaving] = useState(false);
    const isViecKhac = category.key === 'Việc khác';

    const save = async () => {
        setSaving(true);
        await fetch(`/api/workshop/work-log/${entry.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: projectId || null, projectName, mainWorkers: selWorkers, subWorkers: [], note }),
        });
        setSaving(false);
        setEditing(false);
        onSaved();
    };

    const del = async () => {
        if (!confirm('Xóa mục này?')) return;
        await fetch(`/api/workshop/work-log/${entry.id}`, { method: 'DELETE' });
        onDeleted();
    };

    const displayName = entry.projectName || entry.project?.name || '';
    const workerNames = parseWorkers(entry.mainWorkers);

    if (!editing) return (
        <div style={{ padding: '5px 7px', background: category.color, borderRadius: 6, marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditing(true)}>
                {!isViecKhac && displayName && <div style={{ fontWeight: 600, fontSize: 12, color: '#1e3a5f' }}>{displayName}</div>}
                {entry.project && !isViecKhac && <div style={{ fontSize: 10, color: '#2563eb' }}>{entry.project.code}</div>}
                {isViecKhac && entry.note && <div style={{ fontWeight: 600, fontSize: 12, color: '#166534' }}>{entry.note}</div>}
                {workerNames.length > 0 && <div style={{ fontSize: 11, color: '#374151' }}>👷 {workerNames.join(', ')}</div>}
            </div>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <button style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', fontSize: 11 }} onClick={() => setEditing(true)}>✏️</button>
                <button style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', fontSize: 11 }} onClick={del}>✕</button>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '6px 7px', background: '#f0f9ff', border: '1px solid #93c5fd', borderRadius: 6, marginBottom: 5, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {isViecKhac ? (
                <input className="form-input" placeholder="Nội dung việc khác..." value={note}
                    onChange={e => setNote(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
            ) : (
                <ProjectDropdown value={projectName} projectId={projectId} projects={projects}
                    onChange={(name, id) => { setProjectName(name); setProjectId(id || ''); }} />
            )}
            <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: -2 }}>Người thực hiện</div>
            <WorkerChipInput selected={selWorkers} workerList={workers} onChange={setSelWorkers} placeholder="Chọn người thực hiện..." />
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} style={{ padding: '2px 7px', fontSize: 11 }}>Hủy</button>
                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ padding: '2px 8px', fontSize: 11 }}>{saving ? '...' : 'Lưu'}</button>
            </div>
        </div>
    );
}

// Cell editor popover
function CellEditor({ day, category, cellEntries, pos, workers, projects, onSave, onClose }) {
    const [showAdd, setShowAdd] = useState(cellEntries.length === 0);
    const [projectName, setProjectName] = useState('');
    const [projectId, setProjectId] = useState('');
    const [selWorkers, setSelWorkers] = useState([]);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const isViecKhac = category.key === 'Việc khác';

    const addEntry = async () => {
        if (!isViecKhac && !projectName.trim() && selWorkers.length === 0) return;
        if (isViecKhac && !note.trim() && selWorkers.length === 0) return;
        setSaving(true);
        await fetch('/api/workshop/work-log', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: toISO(day), category: category.key, projectId: projectId || null, projectName, mainWorkers: selWorkers, subWorkers: [], note }),
        });
        setSaving(false);
        setProjectName(''); setProjectId(''); setSelWorkers([]); setNote('');
        setShowAdd(false);
        onSave();
    };

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1998 }} onMouseDown={onClose} />
            <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1999, width: 300, background: 'var(--bg-card)', border: '1.5px solid var(--accent-primary)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', padding: 12, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
                onMouseDown={e => e.stopPropagation()}>
                <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--accent-primary)', marginBottom: 8 }}>
                    {DAYS_VI[day.getDay()]} {fmtShortDate(day)} · {category.label}
                </div>

                {cellEntries.map(entry => (
                    <EntryRow key={entry.id} entry={entry} category={category} workers={workers} projects={projects} onSaved={onSave} onDeleted={onSave} />
                ))}

                {showAdd ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: cellEntries.length > 0 ? '1px dashed var(--border)' : 'none', paddingTop: cellEntries.length > 0 ? 8 : 0 }}>
                        {cellEntries.length > 0 && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Thêm mục mới</div>}
                        {isViecKhac ? (
                            <input className="form-input" placeholder="Nội dung việc khác..." value={note}
                                autoFocus onChange={e => setNote(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
                        ) : (
                            <ProjectDropdown value={projectName} projectId={projectId} projects={projects}
                                onChange={(name, id) => { setProjectName(name); setProjectId(id || ''); }} />
                        )}
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: -2 }}>Người thực hiện</div>
                        <WorkerChipInput selected={selWorkers} workerList={workers} onChange={setSelWorkers} placeholder="Chọn người thực hiện..." />
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setShowAdd(false); if (cellEntries.length === 0) onClose(); }} style={{ padding: '3px 8px', fontSize: 12 }}>Hủy</button>
                            <button className="btn btn-primary btn-sm" onClick={addEntry} disabled={saving} style={{ padding: '3px 10px', fontSize: 12 }}>{saving ? '...' : '+ Thêm'}</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '3px 8px', fontSize: 12 }}>Đóng</button>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} style={{ padding: '3px 10px', fontSize: 12 }}>+ Thêm mục</button>
                    </div>
                )}
            </div>
        </>
    );
}

// Tính tổng hợp công: mỗi (ngày, thợ, dự án) duy nhất = 1 công
// workerMap: { [name]: 'Thợ chính' | 'Thợ phụ' } — phân loại từ danh sách nhân viên
function computeWorkSummary(entries, workerMap) {
    const map = {}
    entries.forEach(entry => {
        if (entry.category === 'Việc khác') return
        const projectName = entry.projectName || entry.project?.name
        if (!projectName) return
        const code = entry.project?.code || ''
        const dateKey = new Date(entry.date).toDateString()
        if (!map[projectName]) map[projectName] = { name: projectName, code, main: {}, sub: {} }

        // Tất cả thợ trong entry → phân loại theo workerType của nhân viên
        const allWorkers = [
            ...parseWorkers(entry.mainWorkers),
            ...parseWorkers(entry.subWorkers),
        ]
        allWorkers.forEach(w => {
            const wType = workerMap[w] || 'Thợ chính'
            const bucket = wType === 'Thợ phụ' ? map[projectName].sub : map[projectName].main
            if (!bucket[w]) bucket[w] = new Set()
            bucket[w].add(dateKey)
        })
    })
    return Object.values(map).map(p => ({
        name: p.name,
        code: p.code,
        main: Object.entries(p.main).map(([n, s]) => ({ name: n, cong: s.size })).sort((a, b) => b.cong - a.cong),
        sub: Object.entries(p.sub).map(([n, s]) => ({ name: n, cong: s.size })).sort((a, b) => b.cong - a.cong),
    }))
}

function WorkSummaryTable({ entries, workers, weekNum, weekStart, weekEnd }) {
    // Build map name → workerType từ danh sách nhân viên
    const workerMap = {}
    workers.forEach(w => { workerMap[w.name] = w.workerType || 'Thợ chính' })
    const summary = computeWorkSummary(entries, workerMap)
    if (summary.length === 0) return null

    const thS = { padding: '8px 10px', border: '1px solid #2a4a8b', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#fff' }
    const tdS = { padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'top', fontSize: 12 }
    const grandMain = summary.reduce((a, p) => a + p.main.reduce((s, w) => s + w.cong, 0), 0)
    const grandSub  = summary.reduce((a, p) => a + p.sub.reduce((s, w) => s + w.cong, 0), 0)

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', background: '#1C3A6B', color: '#fff', textAlign: 'center', borderBottom: '2px solid var(--border)' }}>
                <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tổng hợp số công theo dự án
                </div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
                    Tuần {weekNum}&nbsp;•&nbsp;{fmtShortDate(weekStart)} – {fmtShortDate(weekEnd)}.{weekEnd.getFullYear()}
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                    <thead>
                        <tr style={{ background: '#1C3A6B' }}>
                            <th style={{ ...thS, width: 44 }}>STT</th>
                            <th style={{ ...thS, textAlign: 'left', minWidth: 220 }}>Dự án</th>
                            <th style={{ ...thS, minWidth: 200 }}>Thợ chính</th>
                            <th style={{ ...thS, width: 90 }}>Tổng TC</th>
                            <th style={{ ...thS, minWidth: 200 }}>Thợ phụ</th>
                            <th style={{ ...thS, width: 90 }}>Tổng TP</th>
                            <th style={{ ...thS, width: 90 }}>Tổng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((p, i) => {
                            const tMain = p.main.reduce((a, w) => a + w.cong, 0)
                            const tSub  = p.sub.reduce((a, w) => a + w.cong, 0)
                            return (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1.5px solid var(--border)' }}>
                                    <td style={{ ...tdS, textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                                    <td style={tdS}>
                                        <div style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 13 }}>{p.name}</div>
                                        {p.code && <div style={{ fontSize: 11, color: '#2563eb', marginTop: 2 }}>{p.code}</div>}
                                    </td>
                                    <td style={tdS}>
                                        {p.main.length > 0 ? p.main.map(w => (
                                            <div key={w.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 0', borderBottom: '1px solid var(--border-light)' }}>
                                                <span style={{ color: '#374151' }}>{w.name}</span>
                                                <span style={{ fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>{w.cong} công</span>
                                            </div>
                                        )) : <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>}
                                    </td>
                                    <td style={{ ...tdS, textAlign: 'center', fontWeight: 800, fontSize: 20, color: '#1d4ed8', background: '#eff6ff' }}>
                                        {tMain}
                                    </td>
                                    <td style={tdS}>
                                        {p.sub.length > 0 ? p.sub.map(w => (
                                            <div key={w.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 0', borderBottom: '1px solid var(--border-light)' }}>
                                                <span style={{ color: '#374151' }}>{w.name}</span>
                                                <span style={{ fontWeight: 700, color: '#6d28d9', background: '#ede9fe', padding: '1px 8px', borderRadius: 10, fontSize: 11 }}>{w.cong} công</span>
                                            </div>
                                        )) : <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>}
                                    </td>
                                    <td style={{ ...tdS, textAlign: 'center', fontWeight: 800, fontSize: 20, color: '#6d28d9', background: '#f5f3ff' }}>
                                        {tSub > 0 ? tSub : <span style={{ color: '#cbd5e1', fontSize: 14 }}>0</span>}
                                    </td>
                                    <td style={{ ...tdS, textAlign: 'center', fontWeight: 900, fontSize: 22, color: '#1e3a5f', background: '#f0f9ff' }}>
                                        {tMain + tSub}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#1e3a5f' }}>
                            <td colSpan={3} style={{ ...thS, fontSize: 13, letterSpacing: 1 }}>TỔNG CỘNG TOÀN TUẦN</td>
                            <td style={{ ...thS, fontSize: 22 }}>{grandMain}</td>
                            <td style={thS} />
                            <td style={{ ...thS, fontSize: 22 }}>{grandSub}</td>
                            <td style={{ ...thS, fontSize: 24 }}>{grandMain + grandSub}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-muted)' }}>
                💡 Mỗi ngày làm việc = 1 công (ca sáng 4h + ca chiều 4h). Thợ xuất hiện nhiều lần cùng ngày cùng dự án vẫn tính 1 công.
            </div>
        </div>
    )
}

export default function WorkLogPage() {
    const router = useRouter();
    const { role } = useRole();
    const [entries, setEntries] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [editCell, setEditCell] = useState(null);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/'); return;
        }
        fetch('/api/workshop/workers').then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : []));
        fetch('/api/projects?limit=200&type=Thi công nội thất').then(r => r.json()).then(d => setProjects(Array.isArray(d?.data) ? d.data : []));
    }, [role]);

    useEffect(() => {
        fetchAll();
    }, [weekStart]);

    const fetchAll = () => {
        setLoading(true);
        const start = toISO(weekStart);
        const end = toISO(addDays(weekStart, 6));
        fetch(`/api/workshop/work-log?start=${start}&end=${end}`)
            .then(r => r.json())
            .then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false); });
    };

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekEnd = weekDays[6];
    const weekNum = getWeekNum(weekStart);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const getCell = (day, catKey) => entries.filter(e => e.category === catKey && isSameDay(new Date(e.date), day));

    const openEdit = (day, category, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const left = Math.min(rect.left, window.innerWidth - 316);
        const top = Math.min(rect.bottom + 4, window.innerHeight - 420);
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
                    {/* Desktop table */}
                    <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 1100 }}>
                            <thead>
                                <tr style={{ background: '#1C3A6B', color: '#fff' }}>
                                    <th rowSpan={2} style={{ padding: '8px 10px', border: '1px solid #2a4a8b', minWidth: 80, verticalAlign: 'middle', textAlign: 'center', fontSize: 11 }}>Ngày / Tháng</th>
                                    {CATEGORIES.map(cat => (
                                        <th key={cat.key} colSpan={2} style={{ padding: '6px 10px', border: '1px solid #2a4a8b', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{cat.label}</th>
                                    ))}
                                </tr>
                                <tr style={{ background: '#2A5298', color: '#e2e8f0' }}>
                                    {CATEGORIES.map(cat => [
                                        <th key={cat.key+'_ct'} style={{ padding: '5px 8px', border: '1px solid #3a5fa8', minWidth: 130, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>
                                            {cat.key === 'Việc khác' ? 'Nội dung' : 'Tên CT'}
                                        </th>,
                                        <th key={cat.key+'_nth'} style={{ padding: '5px 8px', border: '1px solid #3a5fa8', minWidth: 120, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>Người thực hiện</th>,
                                    ])}
                                </tr>
                            </thead>
                            <tbody>
                                {weekDays.map((day, di) => {
                                    const isToday = isSameDay(day, today);
                                    const dow = day.getDay();
                                    const isWeekend = dow === 0 || dow === 6;
                                    const rowBg = isToday ? '#fffbeb' : isWeekend ? '#fef2f2' : di % 2 === 0 ? '#f8fafc' : '#ffffff';
                                    const cellEntries = CATEGORIES.map(cat => getCell(day, cat.key));
                                    const maxRows = Math.max(1, ...cellEntries.map(t => t.length));

                                    return Array.from({ length: maxRows }, (_, ri) => (
                                        <tr key={`${toISO(day)}-${ri}`} style={{ background: rowBg, borderBottom: ri === maxRows - 1 ? '2px solid var(--border)' : '1px solid var(--border-light)' }}>
                                            {ri === 0 && (
                                                <td rowSpan={maxRows} style={{ padding: '8px 10px', border: '1px solid var(--border)', background: isToday ? '#fef3c7' : isWeekend ? '#fee2e2' : '#f1f5f9', fontWeight: isToday ? 800 : 600, textAlign: 'center', verticalAlign: 'middle', fontSize: 12, whiteSpace: 'nowrap', color: isToday ? '#92400e' : isWeekend ? '#dc2626' : '#475569' }}>
                                                    <div>{DAYS_VI[dow]}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 800 }}>{fmtShortDate(day)}</div>
                                                    {isToday && <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>Hôm nay</div>}
                                                </td>
                                            )}
                                            {CATEGORIES.map((cat, ci) => {
                                                const catEntries = cellEntries[ci];
                                                const entry = catEntries[ri];
                                                const workers_ = entry ? parseWorkers(entry.mainWorkers) : [];
                                                const isViecKhac = cat.key === 'Việc khác';
                                                const displayName = entry ? (isViecKhac ? (entry.note || '') : (entry.projectName || entry.project?.name || '')) : '';
                                                const cellBg = entry ? cat.color : 'transparent';
                                                const tdStyle = { padding: '5px 8px', border: '1px solid var(--border-light)', background: cellBg, verticalAlign: 'top', cursor: 'pointer' };
                                                const onClick = (e) => openEdit(day, cat, e);

                                                return [
                                                    <td key={cat.key+'_ct_'+ri} onClick={onClick} style={{ ...tdStyle, minWidth: 130 }} title="Nhấn để thêm/sửa">
                                                        {displayName ? (
                                                            <div>
                                                                <div style={{ fontWeight: 600, color: isViecKhac ? '#166534' : '#1e3a5f', fontSize: 12 }}>{displayName}</div>
                                                                {entry?.project && !isViecKhac && <div style={{ fontSize: 10, color: '#6b7280' }}>{entry.project.code}</div>}
                                                            </div>
                                                        ) : <div style={{ color: '#d1d5db', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>·</div>}
                                                    </td>,
                                                    <td key={cat.key+'_nth_'+ri} onClick={onClick} style={{ ...tdStyle, minWidth: 120 }} title="Nhấn để thêm/sửa">
                                                        {workers_.length > 0
                                                            ? <div style={{ color: '#374151', fontSize: 11 }}>{workers_.join(', ')}</div>
                                                            : <div style={{ color: '#d1d5db', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>·</div>}
                                                    </td>,
                                                ];
                                            })}
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile */}
                    <div className="mobile-card-list">
                        {weekDays.map(day => {
                            const dow = day.getDay();
                            const isToday = isSameDay(day, today);
                            const isWeekend = dow === 0 || dow === 6;
                            const dayEntries = entries.filter(e => isSameDay(new Date(e.date), day));
                            return (
                                <div key={toISO(day)}>
                                    <div style={{ padding: '8px 14px', background: isToday ? '#fef3c7' : isWeekend ? '#fee2e2' : '#f1f5f9', borderBottom: '2px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: isWeekend ? '#dc2626' : '#475569' }}>{DAYS_VI[dow]} {fmtShortDate(day)}</span>
                                        {isToday && <span style={{ fontSize: 11, background: '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: 8 }}>Hôm nay</span>}
                                        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11 }} onClick={(e) => openEdit(day, CATEGORIES[0], e)}>+ Thêm</button>
                                    </div>
                                    {dayEntries.length === 0
                                        ? <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có việc</div>
                                        : dayEntries.map(entry => {
                                            const cat = CATEGORIES.find(c => c.key === entry.category);
                                            const main = parseWorkers(entry.mainWorkers);
                                            const sub = parseWorkers(entry.subWorkers);
                                            return (
                                                <div key={entry.id} className="mobile-card-item" style={{ borderLeft: `3px solid ${cat?.hd || '#e5e7eb'}`, cursor: 'pointer' }}
                                                    onClick={(e) => openEdit(day, cat || CATEGORIES[0], e)}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.projectName || entry.project?.name || entry.note || '—'}</div>
                                                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: cat?.color || '#f3f4f6', color: '#374151', flexShrink: 0, marginLeft: 6 }}>{cat?.label}</span>
                                                    </div>
                                                    {entry.project && <div style={{ fontSize: 11, color: '#2563eb' }}>{entry.project.code}</div>}
                                                    {(() => { const w = parseWorkers(entry.mainWorkers); return w.length > 0 ? <div style={{ fontSize: 11, color: '#374151' }}>👷 {w.join(', ')}</div> : null; })()}
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

            {!loading && <WorkSummaryTable entries={entries} workers={workers} weekNum={weekNum} weekStart={weekStart} weekEnd={weekEnd} />}

            {editCell && (
                <CellEditor
                    day={editCell.day}
                    category={editCell.category}
                    cellEntries={getCell(editCell.day, editCell.category.key)}
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
