'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const CATEGORIES = [
    { key: 'Gia công nguội',         label: 'Gia công nguội',         short: 'GCN',  color: '#dbeafe', hd: '#bfdbfe' },
    { key: 'Lắp ghép tại xưởng',     label: 'Lắp ghép tại xưởng',     short: 'LGX',  color: '#fef9c3', hd: '#fef08a' },
    { key: 'Lắp đặt tại công trình', label: 'Lắp đặt tại công trình', short: 'LĐCT', color: '#dbeafe', hd: '#bfdbfe' },
    { key: 'Bảo dưỡng',              label: 'Bảo dưỡng',              short: 'BD',   color: '#fef9c3', hd: '#fef08a' },
    { key: 'Việc khác',              label: 'Việc khác',              short: 'VK',   color: '#f0fdf4', hd: '#bbf7d0' },
];

const DAYS_VI = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // shift to Monday
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function isActiveOnDay(task, day) {
    if (!task.startDate && !task.deadline) return false;
    const start = task.startDate ? new Date(task.startDate) : null;
    const end = task.deadline ? new Date(task.deadline) : null;
    if (start && end) return day >= start && day <= end;
    if (start) return isSameDay(day, start);
    if (end) return isSameDay(day, end);
    return false;
}

function fmtShortDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekNum(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export default function WorkLogPage() {
    const router = useRouter();
    const { role } = useRole();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/');
            return;
        }
        fetch('/api/workshop/tasks')
            .then(r => r.json())
            .then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); });
    }, [role]);

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekEnd = weekDays[6];
    const weekNum = getWeekNum(weekStart);

    const prevWeek = () => setWeekStart(d => addDays(d, -7));
    const nextWeek = () => setWeekStart(d => addDays(d, 7));
    const thisWeek = () => setWeekStart(getWeekStart(new Date()));

    // For each day and category, get tasks active that day with that category
    const getCell = (day, catKey) =>
        tasks.filter(t => t.category === catKey && isActiveOnDay(t, day));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
                        <button className="btn btn-ghost btn-sm" onClick={prevWeek}>◀</button>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', padding: '0 8px' }}>
                            Tuần {weekNum}
                        </span>
                        <button className="btn btn-ghost btn-sm" onClick={nextWeek}>▶</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={thisWeek}>Tuần này</button>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setLoading(true); fetch('/api/workshop/tasks').then(r => r.json()).then(d => { setTasks(Array.isArray(d) ? d : []); setLoading(false); }); }}>
                        🔄 Làm mới
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                    {/* ── Desktop table ── */}
                    <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
                            <thead>
                                {/* Row 1: category groups */}
                                <tr style={{ background: '#1C3A6B', color: '#fff' }}>
                                    <th rowSpan={2} style={{ padding: '8px 10px', border: '1px solid #2a4a8b', minWidth: 80, whiteSpace: 'nowrap', verticalAlign: 'middle', textAlign: 'center', fontSize: 11 }}>
                                        Ngày / Tháng
                                    </th>
                                    {CATEGORIES.map(cat => (
                                        <th key={cat.key} colSpan={2} style={{ padding: '6px 10px', border: '1px solid #2a4a8b', textAlign: 'center', fontSize: 12, fontWeight: 700 }}>
                                            {cat.label}
                                        </th>
                                    ))}
                                </tr>
                                {/* Row 2: Tên CT / CB T/hiện */}
                                <tr style={{ background: '#2A5298', color: '#e2e8f0' }}>
                                    {CATEGORIES.map(cat => (
                                        <>
                                            <th key={cat.key + '_ct'} style={{ padding: '5px 8px', border: '1px solid #3a5fa8', minWidth: 130, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>Tên CT</th>
                                            <th key={cat.key + '_cb'} style={{ padding: '5px 8px', border: '1px solid #3a5fa8', minWidth: 120, fontSize: 11, fontWeight: 600, textAlign: 'center' }}>CB T/hiện</th>
                                        </>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {weekDays.map((day, di) => {
                                    const isToday = isSameDay(day, today);
                                    const dayOfWeek = day.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const rowBg = isToday ? '#fffbeb' : isWeekend ? '#fef2f2' : di % 2 === 0 ? '#f8fafc' : '#ffffff';

                                    // max rows needed for this day (most tasks in any category)
                                    const cellTasks = CATEGORIES.map(cat => getCell(day, cat.key));
                                    const maxRows = Math.max(1, ...cellTasks.map(t => t.length));

                                    return Array.from({ length: maxRows }, (_, ri) => (
                                        <tr key={`${day.toISOString()}-${ri}`} style={{ background: rowBg, borderBottom: ri === maxRows - 1 ? '2px solid var(--border)' : '1px solid var(--border-light)' }}>
                                            {ri === 0 && (
                                                <td rowSpan={maxRows} style={{
                                                    padding: '8px 10px', border: '1px solid var(--border)',
                                                    background: isToday ? '#fef3c7' : isWeekend ? '#fee2e2' : '#f1f5f9',
                                                    fontWeight: isToday ? 800 : 600, textAlign: 'center', verticalAlign: 'middle',
                                                    fontSize: 12, whiteSpace: 'nowrap',
                                                    color: isToday ? '#92400e' : isWeekend ? '#dc2626' : '#475569',
                                                }}>
                                                    <div>{DAYS_VI[dayOfWeek]}</div>
                                                    <div style={{ fontSize: 13, fontWeight: 800 }}>{fmtShortDate(day)}</div>
                                                    {isToday && <div style={{ fontSize: 10, color: '#d97706', marginTop: 2 }}>Hôm nay</div>}
                                                </td>
                                            )}
                                            {cellTasks.map((catTasks, ci) => {
                                                const task = catTasks[ri];
                                                const cat = CATEGORIES[ci];
                                                const workers = task?.workers?.map(tw => tw.worker?.name).filter(Boolean).join(', ') || '';
                                                return (
                                                    <>
                                                        <td key={cat.key + '_ct_' + ri} style={{ padding: '5px 8px', border: '1px solid var(--border-light)', background: task ? cat.color : 'transparent', verticalAlign: 'top', fontSize: 12 }}>
                                                            {task ? (
                                                                <div>
                                                                    <div style={{ fontWeight: 600, color: '#1e3a5f', lineHeight: 1.3 }}>{task.title}</div>
                                                                    {task.project && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{task.project.code}</div>}
                                                                </div>
                                                            ) : null}
                                                        </td>
                                                        <td key={cat.key + '_cb_' + ri} style={{ padding: '5px 8px', border: '1px solid var(--border-light)', background: task ? cat.color : 'transparent', verticalAlign: 'top', fontSize: 12 }}>
                                                            {task && workers ? (
                                                                <div style={{ color: '#374151' }}>{workers}</div>
                                                            ) : null}
                                                        </td>
                                                    </>
                                                );
                                            })}
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile view ── */}
                    <div className="mobile-card-list">
                        {weekDays.map(day => {
                            const dayOfWeek = day.getDay();
                            const isToday = isSameDay(day, today);
                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                            const dayTasks = tasks.filter(t => isActiveOnDay(t, day));
                            return (
                                <div key={day.toISOString()}>
                                    <div style={{ padding: '8px 14px', background: isToday ? '#fef3c7' : isWeekend ? '#fee2e2' : '#f1f5f9', borderBottom: '2px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: isWeekend ? '#dc2626' : '#475569' }}>{DAYS_VI[dayOfWeek]} {fmtShortDate(day)}</span>
                                        {isToday && <span style={{ fontSize: 11, background: '#f59e0b', color: '#fff', padding: '1px 6px', borderRadius: 8 }}>Hôm nay</span>}
                                        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{dayTasks.length} việc</span>
                                    </div>
                                    {dayTasks.length === 0 ? (
                                        <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có việc</div>
                                    ) : (
                                        dayTasks.map(task => (
                                            <div key={task.id} className="mobile-card-item" style={{ borderLeft: `3px solid ${CATEGORIES.find(c => c.key === task.category)?.hd || '#e5e7eb'}` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{task.title}</div>
                                                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: CATEGORIES.find(c => c.key === task.category)?.color || '#f3f4f6', color: '#374151', flexShrink: 0, marginLeft: 6 }}>
                                                        {CATEGORIES.find(c => c.key === task.category)?.short || task.category}
                                                    </span>
                                                </div>
                                                {task.project && <div style={{ fontSize: 11, color: '#2563eb' }}>{task.project.code} · {task.project.name}</div>}
                                                {task.workers?.length > 0 && (
                                                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>
                                                        👷 {task.workers.map(tw => tw.worker?.name).filter(Boolean).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
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
        </div>
    );
}
