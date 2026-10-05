'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/components/ui/Toast';
import { MANAGE_ROLES } from '@/lib/designTaskStatus';
import { ARCHITECTS, REQUEST_DEPTS, DESIGN_WORK_LOG_SHIFTS as SHIFTS, DESIGN_WORK_LOG_CATEGORIES as CATEGORIES } from '@/lib/designWorkLog';

// Nhật ký tuần TKKT — bảng ngày × ca × hạng mục, mẫu theo nhật ký nhân sự xưởng (/workshop/work-log)
// nhưng dữ liệu riêng (DesignWorkLog), tên công trình gợi ý từ bảng Khách hàng TKKT.

const DAYS_VI = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
// Màu từng ca: bg nền ô, text chữ, br viền (badge trên mobile), pill badge trong popup.
const SHIFT_STYLE = {
    'Sáng':  { bg: '#fefce8', text: '#854d0e', br: '#fde68a', pill: '#fef9c3' },
    'Chiều': { bg: '#fff7ed', text: '#9a3412', br: '#fed7aa', pill: '#ffedd5' },
    'Tối':   { bg: '#eef2ff', text: '#3730a3', br: '#c7d2fe', pill: '#e0e7ff' },
};
const shiftStyle = shift => SHIFT_STYLE[shift] || SHIFT_STYLE['Sáng'];
const LAST_SHIFT = SHIFTS.length - 1;
const LEAVE = CATEGORIES.find(c => c.singleCol);
const SHOW_CATEGORY_ROW = CATEGORIES.length > 1;

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    d.setHours(0, 0, 0, 0);
    return d;
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmtShortDate(d) { return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`; }
function toISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function getWeekNum(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}
function parseWorkers(json) {
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.filter(w => w?.name) : [];
    } catch { return []; }
}
const fmtWorker = w => w.hours ? `${w.name} (${w.hours}h)` : w.name;

async function request(url, method, body) {
    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Không lưu được thay đổi');
    return res.json();
}

// Chọn nhiều người thực hiện, mỗi người có thể ghi số giờ — selected: [{name, hours}]
function WorkerChipInput({ selected, people, onChange, placeholder }) {
    const [input, setInput] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const names = selected.map(w => w.name);
    const suggestions = people.filter(p => !names.includes(p) && p.toLowerCase().includes(input.trim().toLowerCase())).slice(0, 8);

    const add = (name) => {
        if (name && !names.includes(name)) onChange([...selected, { name, hours: null }]);
        setInput('');
    };
    const remove = (name) => onChange(selected.filter(w => w.name !== name));
    const setHours = (name, hours) => onChange(selected.map(w => w.name === name ? { ...w, hours: hours === '' ? null : Number(hours) } : w));

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 6px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', minHeight: 34, alignItems: 'center', cursor: 'text' }}
                onClick={() => { ref.current?.focus(); setOpen(true); }}>
                {selected.map(({ name, hours }) => (
                    <span key={name} style={{ padding: '1px 4px 1px 7px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        {name}
                        <input type="number" min={0.5} step={0.5} value={hours ?? ''} placeholder="h"
                            onChange={e => setHours(name, e.target.value)} onClick={e => e.stopPropagation()}
                            style={{ width: 34, border: '1px solid #93c5fd', borderRadius: 4, padding: '0 3px', fontSize: 11, color: '#1d4ed8', background: '#eff6ff', outline: 'none', textAlign: 'center' }} />
                        <span style={{ fontSize: 10, color: '#3b82f6', marginLeft: -1 }}>h</span>
                        <span style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, marginLeft: 1 }} onClick={e => { e.stopPropagation(); remove(name); }}>×</span>
                    </span>
                ))}
                <input ref={ref} value={input}
                    onChange={e => { setInput(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && input.trim()) { e.preventDefault(); add(suggestions[0] || input.trim()); }
                        if (e.key === 'Backspace' && !input && selected.length > 0) remove(selected[selected.length - 1].name);
                    }}
                    placeholder={selected.length === 0 ? placeholder : ''}
                    style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, minWidth: 80, background: 'transparent', padding: '2px 0', color: 'var(--text-primary)' }} />
            </div>
            {open && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 180, overflowY: 'auto', marginTop: 2 }}>
                    {suggestions.map(name => (
                        <div key={name} onMouseDown={() => add(name)}
                            style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-light)', fontWeight: 600 }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            {name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Form một mục — dùng cho cả thêm mới lẫn sửa.
function EntryForm({ category, initial, people, onSubmit, onCancel, submitLabel }) {
    const [projectName, setProjectName] = useState(initial?.projectName || '');
    const [note, setNote] = useState(initial?.note || '');
    const [requestDept, setRequestDept] = useState(initial?.requestDept || '');
    const [workers, setWorkers] = useState(initial ? parseWorkers(initial.workers) : []);
    const [saving, setSaving] = useState(false);
    const isLeave = category.singleCol;

    const submit = async () => {
        setSaving(true);
        const ok = await onSubmit({ projectName: category.noProject ? '' : projectName.trim(), requestDept: isLeave ? '' : requestDept.trim(), note: isLeave ? '' : note.trim(), workers });
        setSaving(false);
        return ok;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {category.noProject ? (!isLeave && (
                <input className="form-input" placeholder="Nội dung việc khác..." value={note} autoFocus
                    onChange={e => setNote(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
            )) : (
                <>
                    <input className="form-input" list="tkkt-projects" placeholder="Tên công trình..." value={projectName} autoFocus
                        onChange={e => setProjectName(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
                    <input className="form-input" list="tkkt-depts" placeholder="Phòng ban yêu cầu..." value={requestDept}
                        onChange={e => setRequestDept(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
                    <input className="form-input" placeholder="Ghi chú (không bắt buộc)" value={note}
                        onChange={e => setNote(e.target.value)} style={{ fontSize: 12, padding: '5px 8px' }} />
                </>
            )}
            <div style={{ fontSize: 11, fontWeight: 600, color: isLeave ? '#dc2626' : 'var(--text-secondary)', marginBottom: -2 }}>
                {isLeave ? '👤 Người nghỉ' : 'Người thực hiện'}
            </div>
            <WorkerChipInput selected={workers} people={people} onChange={setWorkers}
                placeholder={isLeave ? 'Chọn người nghỉ...' : 'Chọn người thực hiện...'} />
            <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={onCancel} style={{ padding: '3px 8px', fontSize: 12 }}>Hủy</button>
                <button className="btn btn-primary btn-sm" onClick={submit} disabled={saving} style={{ padding: '3px 10px', fontSize: 12 }}>{saving ? '...' : submitLabel}</button>
            </div>
        </div>
    );
}

function EntryRow({ entry, category, people, onUpdate, onDelete }) {
    const [editing, setEditing] = useState(false);
    const ws = parseWorkers(entry.workers);

    if (editing) return (
        <div style={{ padding: '6px 7px', background: '#f0f9ff', border: '1px solid #93c5fd', borderRadius: 6, marginBottom: 5 }}>
            <EntryForm category={category} initial={entry} people={people} submitLabel="Lưu"
                onCancel={() => setEditing(false)}
                onSubmit={async (data) => { if (await onUpdate(entry, data)) setEditing(false); }} />
        </div>
    );

    return (
        <div style={{ padding: '5px 7px', background: category.color, borderRadius: 6, marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditing(true)}>
                {entry.projectName && <div style={{ fontWeight: 600, fontSize: 12, color: '#1e3a5f' }}>{entry.projectName}</div>}
                {entry.requestDept && <div style={{ fontSize: 11, color: '#475569' }}>🏢 {entry.requestDept}</div>}
                {entry.note && <div style={{ fontSize: 11, color: category.noProject ? '#166534' : '#475569', fontWeight: category.noProject ? 600 : 400 }}>{entry.note}</div>}
                {ws.length > 0 && (
                    <div style={{ fontSize: 11, color: category.singleCol ? '#dc2626' : '#374151' }}>
                        {category.singleCol ? '🏠 ' : '👤 '}{ws.map(fmtWorker).join(', ')}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <button style={{ background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', fontSize: 11 }} onClick={() => setEditing(true)}>✏️</button>
                <button style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', fontSize: 11 }}
                    onClick={() => { if (confirm('Xóa mục này?')) onDelete(entry); }}>✕</button>
            </div>
        </div>
    );
}

function CellEditor({ day, category, shift, cellEntries, pos, people, onCreate, onUpdate, onDelete, onClose }) {
    const [showAdd, setShowAdd] = useState(cellEntries.length === 0);

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1998 }} onMouseDown={onClose} />
            <div style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1999, width: 300, background: 'var(--bg-card)', border: '1.5px solid var(--accent-primary)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.22)', padding: 12, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}
                onMouseDown={e => e.stopPropagation()}>
                <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--accent-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{DAYS_VI[day.getDay()]} {fmtShortDate(day)} · {category.label}</span>
                    <span style={{ padding: '1px 7px', borderRadius: 8, fontSize: 10, fontWeight: 800, background: shiftStyle(shift).pill, color: shiftStyle(shift).text }}>Ca {shift}</span>
                </div>

                {cellEntries.map(entry => (
                    <EntryRow key={entry.id} entry={entry} category={category} people={people} onUpdate={onUpdate} onDelete={onDelete} />
                ))}

                {showAdd ? (
                    <div style={{ borderTop: cellEntries.length > 0 ? '1px dashed var(--border)' : 'none', paddingTop: cellEntries.length > 0 ? 8 : 0 }}>
                        {cellEntries.length > 0 && <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Thêm mục mới</div>}
                        <EntryForm category={category} people={people} submitLabel="+ Thêm"
                            onCancel={() => { setShowAdd(false); if (cellEntries.length === 0) onClose(); }}
                            onSubmit={async (data) => { if (await onCreate({ date: toISO(day), shift, category: category.key, ...data })) setShowAdd(false); }} />
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

// Tên CT có ghi chú thì chiếm 2 dòng — các cột cạnh bên giữ cùng chiều cao để thẳng hàng.
const entryMinHeight = entry => (entry.note && entry.projectName ? 34 : 18);

const Empty = () => <div style={{ color: '#d1d5db', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>·</div>;

const round1 = n => Math.round(n * 10) / 10;
const fmtNum = n => String(round1(n));
const SHIFT_HOURS = 4; // mục không nhập giờ: mỗi người mỗi ca tính 4 giờ (= 0.5 công)
const NO_NOTE = '(Không ghi chú)';
const NO_DEPT = '(Chưa có phòng ban)';

// Tổng hợp giờ theo công trình, chia theo nội dung ghi chú (bỏ Việc khác / Nhân sự nghỉ).
// Giờ của một mục = tổng giờ từng người; người không nhập giờ tính SHIFT_HOURS. 8 giờ = 1 công.
function computeProjectSummary(entries) {
    const map = {};
    entries.forEach(entry => {
        const cat = CATEGORIES.find(c => c.key === entry.category);
        if (!cat || cat.noProject) return;
        const name = entry.projectName?.trim();
        if (!name) return;
        const hours = parseWorkers(entry.workers).reduce((s, w) => s + (w.hours || SHIFT_HOURS), 0);
        if (!hours) return;
        const note = entry.note?.trim() || NO_NOTE;
        const project = map[name] || (map[name] = {});
        project[note] = (project[note] || 0) + hours;
    });
    return Object.entries(map).map(([name, notes]) => {
        const rows = Object.entries(notes).map(([note, hours]) => ({ note, hours }))
            .sort((a, b) => (a.note === NO_NOTE) - (b.note === NO_NOTE) || b.hours - a.hours);
        return { name, notes: rows, total: rows.reduce((s, r) => s + r.hours, 0) };
    }).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

function ProjectSummaryTable({ entries, weekNum, weekStart, weekEnd }) {
    const [filter, setFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const allSummary = useMemo(() => computeProjectSummary(entries), [entries]);
    const depts = useMemo(() => {
        const set = new Set(entries.map(e => e.requestDept?.trim() || NO_DEPT));
        return [...set].sort((a, b) => (a === NO_DEPT) - (b === NO_DEPT) || a.localeCompare(b, 'vi'));
    }, [entries]);

    // Sang tuần khác mà giá trị đang lọc không còn trong tuần thì coi như bỏ lọc.
    const activeDept = depts.includes(deptFilter) ? deptFilter : '';
    const summary = useMemo(
        () => activeDept ? computeProjectSummary(entries.filter(e => (e.requestDept?.trim() || NO_DEPT) === activeDept)) : allSummary,
        [entries, activeDept, allSummary]
    );
    if (allSummary.length === 0) return null;

    const active = summary.some(p => p.name === filter) ? filter : '';
    const shown = active ? summary.filter(p => p.name === active) : summary;
    const grand = shown.reduce((s, p) => s + p.total, 0);
    const thS = { padding: '8px 10px', border: '1px solid #2a4a8b', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#fff' };
    const tdS = { padding: '6px 10px', border: '1px solid var(--border)', verticalAlign: 'top', fontSize: 12 };

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', background: '#1C3A6B', color: '#fff', textAlign: 'center', borderBottom: '2px solid var(--border)' }}>
                <div style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tổng hợp giờ làm theo công trình</div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
                    Tuần {weekNum}&nbsp;•&nbsp;{fmtShortDate(weekStart)} – {fmtShortDate(weekEnd)}.{weekEnd.getFullYear()}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Lọc công trình:</span>
                <select className="form-select" value={active} onChange={e => setFilter(e.target.value)} style={{ fontSize: 12, maxWidth: 320 }}>
                    <option value="">Tất cả công trình ({summary.length})</option>
                    {summary.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 8 }}>Phòng ban yêu cầu:</span>
                <select className="form-select" value={activeDept} onChange={e => setDeptFilter(e.target.value)} style={{ fontSize: 12, maxWidth: 240 }}>
                    <option value="">Tất cả phòng ban</option>
                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                {(active || activeDept) && <button className="btn btn-ghost btn-sm" onClick={() => { setFilter(''); setDeptFilter(''); }}>✕ Bỏ lọc</button>}
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
                    <thead>
                        <tr style={{ background: '#1C3A6B' }}>
                            <th style={{ ...thS, width: 44 }}>STT</th>
                            <th style={{ ...thS, textAlign: 'left', minWidth: 240 }}>Công trình</th>
                            <th style={{ ...thS, minWidth: 260 }}>Nội dung</th>
                            <th style={{ ...thS, width: 120 }}>Tổng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shown.length === 0 && (
                            <tr><td colSpan={4} style={{ ...tdS, textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Không có công trình nào thuộc phòng ban này trong tuần.</td></tr>
                        )}
                        {shown.map((p, i) => (
                            <tr key={p.name} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)' }}>
                                <td style={{ ...tdS, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                                <td style={{ ...tdS, fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{p.name}</td>
                                <td style={tdS}>
                                    {p.notes.map(n => (
                                        <div key={n.note} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 0', borderBottom: '1px solid var(--border-light)' }}>
                                            <span style={{ color: n.note === NO_NOTE ? 'var(--text-muted)' : 'var(--text-secondary)', fontStyle: n.note === NO_NOTE ? 'italic' : 'normal' }}>{n.note}</span>
                                            <span style={{ fontWeight: 700, color: '#1d4ed8', background: '#dbeafe', padding: '1px 8px', borderRadius: 10, fontSize: 11, whiteSpace: 'nowrap' }}>{fmtNum(n.hours)} giờ</span>
                                        </div>
                                    ))}
                                </td>
                                <td style={{ ...tdS, textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, fontSize: 20, color: '#1d4ed8', background: '#eff6ff' }}>
                                    {fmtNum(p.total)} giờ
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{fmtNum(p.total / 8)} công</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ background: '#1e3a5f' }}>
                            <td colSpan={3} style={{ ...thS, fontSize: 13, letterSpacing: 1 }}>{(active || activeDept) ? 'TỔNG THEO BỘ LỌC' : 'TỔNG CỘNG TOÀN TUẦN'}</td>
                            <td style={{ ...thS, fontSize: 20 }}>
                                {fmtNum(grand)} giờ
                                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{fmtNum(grand / 8)} công</div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-muted)' }}>
                💡 Giờ lấy theo số giờ nhập cho từng người; người không nhập giờ tính 4 giờ/ca. 8 giờ = 1 công. Không tính Việc khác và Nhân sự nghỉ.
            </div>
        </div>
    );
}

export default function DesignWorkLogPage() {
    const toast = useToast();
    const { role } = useRole();
    const isReadOnly = !MANAGE_ROLES.includes(role);
    const [entries, setEntries] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
    const [editCell, setEditCell] = useState(null);

    useEffect(() => {
        // Gợi ý tên công trình: khách thuộc bảng "Khách hàng TKKT" (giai đoạn bắt đầu bằng "TKKT ").
        fetch('/api/customers?dept=thiet_ke&limit=1000').then(r => r.json())
            .then(d => setCustomers((d.data || []).filter(c => (c.pipelineStage || '').startsWith('TKKT '))))
            .catch(() => {});
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const d = await fetch(`/api/design-work-logs?start=${toISO(weekStart)}&end=${toISO(addDays(weekStart, 6))}`).then(r => r.json());
            setEntries(Array.isArray(d) ? d : []);
        } catch {
            setEntries([]);
        }
        setLoading(false);
    }, [weekStart]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const people = useMemo(() => Array.from(new Set([
        ...ARCHITECTS,
        ...entries.flatMap(e => parseWorkers(e.workers).map(w => w.name)),
    ])).sort((a, b) => a.localeCompare(b, 'vi')), [entries]);

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekEnd = weekDays[6];
    const weekNum = getWeekNum(weekStart);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const getCell = (day, catKey, shift) => entries.filter(e =>
        e.category === catKey && isSameDay(new Date(e.date), day) && (e.shift || 'Sáng') === shift
    );

    const openEdit = (day, category, shift, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setEditCell({ day, category, shift, pos: { top: Math.min(rect.bottom + 4, window.innerHeight - 420), left: Math.min(rect.left, window.innerWidth - 316) } });
    };
    const openQuick = (category, shift) => {
        setEditCell({ day: today, category, shift, pos: { top: 110, left: Math.max(8, Math.round((window.innerWidth - 320) / 2)) } });
    };

    const handleCreate = async (data) => {
        try {
            const created = await request('/api/design-work-logs', 'POST', data);
            setEntries(list => [...list, created]);
            return true;
        } catch (e) { toast.error(e.message); return false; }
    };
    const handleUpdate = async (entry, data) => {
        try {
            const updated = await request(`/api/design-work-logs/${entry.id}`, 'PATCH', data);
            setEntries(list => list.map(e => e.id === entry.id ? updated : e));
            return true;
        } catch (e) { toast.error(e.message); return false; }
    };
    const handleDelete = async (entry) => {
        try {
            await request(`/api/design-work-logs/${entry.id}`, 'DELETE');
            setEntries(list => list.filter(e => e.id !== entry.id));
        } catch (e) { toast.error(e.message); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--border)', background: '#1C3A6B', color: '#fff', textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        Kế hoạch - Nhật ký nhân sự thiết kế kiến trúc SCT
                    </div>
                    <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>
                        Từ ngày {fmtShortDate(weekStart)} đến ngày {fmtShortDate(weekEnd)}.{weekEnd.getFullYear()}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(d => addDays(d, -7))}>◀</button>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', padding: '0 8px' }}>Tuần {weekNum}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(d => addDays(d, 7))}>▶</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setWeekStart(getWeekStart(new Date()))}>Tuần này</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                        {!isReadOnly && <span className="desktop-table-view">💡 Nhấn vào ô để thêm/sửa</span>}
                        <button className="btn btn-ghost btn-sm" onClick={fetchAll}>🔄 Làm mới</button>
                    </div>
                </div>

                {!isReadOnly && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>Thao tác nhanh:</span>
                        {LEAVE && (
                            <button onClick={() => openQuick(LEAVE, 'Sáng')}
                                style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #fca5a5', background: '#fee2e2', color: '#dc2626' }}>
                                🏠 Chấm nghỉ hôm nay
                            </button>
                        )}
                        <button onClick={() => openQuick(CATEGORIES[0], 'Chiều')}
                            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #fdba74', background: '#fff7ed', color: '#c2410c' }}>
                            🌇 Thêm ca chiều
                        </button>
                        <button onClick={() => openQuick(CATEGORIES[0], 'Tối')}
                            style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #a5b4fc', background: '#eef2ff', color: '#3730a3' }}>
                            🌙 Thêm ca tối
                        </button>
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                        <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 600 }}>
                                <thead>
                                    {/* Chỉ còn một hạng mục thì bỏ dòng tên hạng mục, giữ một dòng tiêu đề Tên CT / Người thực hiện. */}
                                    {SHOW_CATEGORY_ROW && (
                                        <tr style={{ background: '#1C3A6B', color: '#fff' }}>
                                            <th rowSpan={2} style={{ padding: '8px 10px', border: '1px solid #2a4a8b', minWidth: 80, verticalAlign: 'middle', textAlign: 'center', fontSize: 11 }}>Ngày / Tháng</th>
                                            <th rowSpan={2} style={{ padding: '8px 6px', border: '1px solid #2a4a8b', width: 40, verticalAlign: 'middle', textAlign: 'center', fontSize: 11 }}>Ca</th>
                                            {CATEGORIES.map(cat => cat.singleCol
                                                ? <th key={cat.key} rowSpan={2} style={{ padding: '6px 10px', border: '1px solid #2a4a8b', textAlign: 'center', fontSize: 12, fontWeight: 700, minWidth: 140, verticalAlign: 'middle', background: '#7f1d1d' }}>{cat.label}</th>
                                                : <th key={cat.key} colSpan={cat.noProject ? 2 : 3} style={{ padding: '6px 10px', border: '1px solid #2a4a8b', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{cat.label}</th>
                                            )}
                                        </tr>
                                    )}
                                    <tr style={{ background: SHOW_CATEGORY_ROW ? '#2A5298' : '#1C3A6B', color: SHOW_CATEGORY_ROW ? '#e2e8f0' : '#fff' }}>
                                        {!SHOW_CATEGORY_ROW && <>
                                            <th style={{ padding: '8px 10px', border: '1px solid #2a4a8b', minWidth: 80, textAlign: 'center', fontSize: 11 }}>Ngày / Tháng</th>
                                            <th style={{ padding: '8px 6px', border: '1px solid #2a4a8b', width: 40, textAlign: 'center', fontSize: 11 }}>Ca</th>
                                        </>}
                                        {CATEGORIES.filter(cat => !cat.singleCol).map(cat => [
                                            <th key={cat.key + '_ct'} style={{ padding: '8px', border: '1px solid #3a5fa8', minWidth: 130, fontSize: 11, fontWeight: SHOW_CATEGORY_ROW ? 600 : 700, textAlign: 'center' }}>
                                                {cat.noProject ? 'Nội dung' : 'Tên CT'}
                                            </th>,
                                            !cat.noProject && <th key={cat.key + '_dept'} style={{ padding: '8px', border: '1px solid #3a5fa8', minWidth: 120, fontSize: 11, fontWeight: SHOW_CATEGORY_ROW ? 600 : 700, textAlign: 'center' }}>Phòng ban yêu cầu</th>,
                                            <th key={cat.key + '_nth'} style={{ padding: '8px', border: '1px solid #3a5fa8', minWidth: 120, fontSize: 11, fontWeight: SHOW_CATEGORY_ROW ? 600 : 700, textAlign: 'center' }}>Người thực hiện</th>,
                                        ])}
                                    </tr>
                                </thead>
                                <tbody>
                                    {weekDays.map((day, di) => {
                                        const isToday = isSameDay(day, today);
                                        const dow = day.getDay();
                                        const isWeekend = dow === 0 || dow === 6;
                                        const rowBg = isToday ? '#fffbeb' : isWeekend ? '#fef2f2' : di % 2 === 0 ? '#f8fafc' : '#ffffff';

                                        return SHIFTS.map((shift, si) => (
                                            <tr key={`${toISO(day)}-${shift}`} style={{ background: rowBg, borderBottom: si === LAST_SHIFT ? '2px solid var(--border)' : 'none' }}>
                                                {si === 0 && (
                                                    <td rowSpan={SHIFTS.length} style={{ padding: '8px 10px', border: '1px solid var(--border)', background: isToday ? '#fef3c7' : isWeekend ? '#fee2e2' : '#f1f5f9', fontWeight: isToday ? 800 : 600, textAlign: 'center', verticalAlign: 'middle', fontSize: 12, whiteSpace: 'nowrap', color: isToday ? '#92400e' : isWeekend ? '#dc2626' : '#475569' }}>
                                                        <div>{DAYS_VI[dow]}</div>
                                                        <div style={{ fontSize: 13, fontWeight: 800 }}>{fmtShortDate(day)}</div>
                                                        {isToday && <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>Hôm nay</div>}
                                                    </td>
                                                )}
                                                <td style={{ padding: '4px 6px', border: '1px solid var(--border-light)', textAlign: 'center', fontSize: 10, fontWeight: 800, width: 40, whiteSpace: 'nowrap', verticalAlign: 'middle', background: shiftStyle(shift).bg, color: shiftStyle(shift).text, borderTop: si > 0 ? '1px dashed var(--border)' : undefined }}>
                                                    {shift}
                                                </td>
                                                {CATEGORIES.map(cat => {
                                                    const cell = getCell(day, cat.key, shift);
                                                    const tdStyle = { padding: '4px 8px', border: '1px solid var(--border-light)', verticalAlign: 'top', cursor: isReadOnly ? 'default' : 'pointer', borderTop: si > 0 ? '1px dashed var(--border)' : undefined, background: cell.length > 0 ? cat.color : 'transparent' };
                                                    const onClick = isReadOnly ? undefined : (e) => openEdit(day, cat, shift, e);
                                                    const title = isReadOnly ? undefined : 'Nhấn để thêm/sửa';

                                                    if (cat.singleCol) {
                                                        return (
                                                            <td key={cat.key + '_' + shift} onClick={onClick} title={title} style={{ ...tdStyle, minWidth: 140 }}>
                                                                {cell.length > 0 ? cell.map(entry => (
                                                                    <div key={entry.id} style={{ color: '#dc2626', fontSize: 11, fontWeight: 600 }}>
                                                                        🏠 {parseWorkers(entry.workers).map(fmtWorker).join(', ')}
                                                                    </div>
                                                                )) : <Empty />}
                                                            </td>
                                                        );
                                                    }

                                                    // Mỗi mục là một dòng ở mọi cột, căn cùng chiều cao để tên CT khớp phòng ban / người thực hiện.
                                                    return [
                                                        <td key={cat.key + '_ct_' + shift} onClick={onClick} title={title} style={{ ...tdStyle, minWidth: 130 }}>
                                                            {cell.length > 0 ? cell.map(entry => (
                                                                <div key={entry.id} style={{ marginBottom: 2, minHeight: entryMinHeight(entry) }}>
                                                                    <div style={{ fontWeight: 600, color: cat.noProject ? '#166534' : '#1e3a5f', fontSize: 12 }}>
                                                                        {cat.noProject ? entry.note : (entry.projectName || '—')}
                                                                    </div>
                                                                    {!cat.noProject && entry.note && <div style={{ fontSize: 10, color: '#6b7280' }}>{entry.note}</div>}
                                                                </div>
                                                            )) : <Empty />}
                                                        </td>,
                                                        !cat.noProject && (
                                                            <td key={cat.key + '_dept_' + shift} onClick={onClick} title={title} style={{ ...tdStyle, minWidth: 120 }}>
                                                                {cell.length > 0 ? cell.map(entry => (
                                                                    <div key={entry.id} style={{ color: '#374151', fontSize: 11, marginBottom: 2, minHeight: entryMinHeight(entry) }}>
                                                                        {entry.requestDept || '—'}
                                                                    </div>
                                                                )) : <Empty />}
                                                            </td>
                                                        ),
                                                        <td key={cat.key + '_nth_' + shift} onClick={onClick} title={title} style={{ ...tdStyle, minWidth: 120 }}>
                                                            {cell.length > 0 ? cell.map(entry => (
                                                                <div key={entry.id} style={{ color: '#374151', fontSize: 11, marginBottom: 2, minHeight: entryMinHeight(entry) }}>
                                                                    {parseWorkers(entry.workers).map(fmtWorker).join(', ') || '—'}
                                                                </div>
                                                            )) : <Empty />}
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
                                        <div style={{ padding: '8px 14px', background: isToday ? '#fef3c7' : isWeekend ? '#fee2e2' : '#f1f5f9', borderBottom: '2px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: 13, color: isWeekend ? '#dc2626' : '#475569' }}>{DAYS_VI[dow]} {fmtShortDate(day)}</span>
                                            {isToday && <span style={{ fontSize: 10, background: '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: 8 }}>Hôm nay</span>}
                                            {!isReadOnly && <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                                                {SHIFTS.map(sh => (
                                                    <button key={sh} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 8px' }} onClick={(e) => openEdit(day, CATEGORIES[0], sh, e)}>+ {sh}</button>
                                                ))}
                                            </div>}
                                        </div>
                                        {dayEntries.length === 0
                                            ? <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có việc</div>
                                            : dayEntries.map(entry => {
                                                const cat = CATEGORIES.find(c => c.key === entry.category) || CATEGORIES[0];
                                                const entryShift = entry.shift || 'Sáng';
                                                const ws = parseWorkers(entry.workers);
                                                return (
                                                    <div key={entry.id} className="mobile-card-item" style={{ borderLeft: `3px solid ${cat.hd}` }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                                                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: shiftStyle(entryShift).bg, color: shiftStyle(entryShift).text, border: `1px solid ${shiftStyle(entryShift).br}`, flexShrink: 0, fontWeight: 700 }}>{entryShift}</span>
                                                            <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13 }}>{entry.projectName || entry.note || (cat.singleCol ? 'Nghỉ' : '—')}</div>
                                                            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: cat.color, color: '#374151', flexShrink: 0 }}>{cat.label}</span>
                                                        </div>
                                                        {entry.requestDept && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>🏢 {entry.requestDept}</div>}
                                                        {ws.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{cat.singleCol ? '🏠' : '👤'} {ws.map(fmtWorker).join(', ')}</div>}
                                                        {!isReadOnly && (
                                                            <button onClick={(e) => openEdit(day, cat, entryShift, e)}
                                                                style={{ padding: '3px 10px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-secondary)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                                                                ✏ Sửa
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                    {CATEGORIES.map(cat => (
                        <span key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 3, background: cat.hd, display: 'inline-block' }} />
                            {cat.singleCol ? '🏠 ' : ''}{cat.label}
                        </span>
                    ))}
                </div>
            </div>

            {!loading && <ProjectSummaryTable entries={entries} weekNum={weekNum} weekStart={weekStart} weekEnd={weekEnd} />}

            <datalist id="tkkt-depts">
                {REQUEST_DEPTS.map(d => <option key={d} value={d} />)}
            </datalist>
            <datalist id="tkkt-projects">
                {[...new Set(customers.map(c => c.name).filter(Boolean))].map(n => <option key={n} value={n} />)}
            </datalist>

            {editCell && (
                <CellEditor
                    key={`${toISO(editCell.day)}-${editCell.category.key}-${editCell.shift}`}
                    day={editCell.day}
                    category={editCell.category}
                    shift={editCell.shift}
                    cellEntries={getCell(editCell.day, editCell.category.key, editCell.shift)}
                    pos={editCell.pos}
                    people={people}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onClose={() => setEditCell(null)}
                />
            )}
        </div>
    );
}
