'use client';
import { useState, useEffect } from 'react';

const STATUS_COLOR = {
    'Chờ làm':    '#d97706',
    'Đang làm':   '#2563eb',
    'Hoàn thành': '#16a34a',
    'Tạm dừng':   '#9ca3af',
};
const STATUS_BG = {
    'Chờ làm':    '#fef3c7',
    'Đang làm':   '#dbeafe',
    'Hoàn thành': '#dcfce7',
    'Tạm dừng':   '#f3f4f6',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
const daysBetween = (a, b) => Math.ceil((b - a) / (1000 * 60 * 60 * 24));

export default function TimelinePage() {
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/workshop/tasks').then(r => r.json()),
            fetch('/api/projects?limit=200').then(r => r.json()),
        ]).then(([t, p]) => {
            setTasks(Array.isArray(t) ? t : []);
            setProjects(p?.data || []);
            setLoading(false);
        });
    }, []);

    const filtered = tasks.filter(t => {
        if (filterProject && t.projectId !== filterProject) return false;
        if (filterStatus && t.status !== filterStatus) return false;
        if (!t.startDate && !t.deadline) return false;
        return true;
    });

    // Determine date range
    const now = new Date();
    const allDates = filtered.flatMap(t => [t.startDate && new Date(t.startDate), t.deadline && new Date(t.deadline)].filter(Boolean));
    const minDate = allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date(now.getFullYear(), now.getMonth(), 1);
    const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    // Extend range a bit
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 5);
    const totalDays = Math.max(daysBetween(minDate, maxDate), 14);

    // Generate header days
    const headerDays = Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(minDate);
        d.setDate(d.getDate() + i);
        return d;
    });

    const todayOffset = daysBetween(minDate, now);
    const DAY_W = 36; // px per day

    const getBarStyle = (task) => {
        const start = task.startDate ? new Date(task.startDate) : (task.deadline ? new Date(task.deadline) : null);
        const end = task.deadline ? new Date(task.deadline) : (task.startDate ? new Date(task.startDate) : null);
        if (!start && !end) return null;

        const left = daysBetween(minDate, start || end) * DAY_W;
        const width = Math.max(daysBetween(start || end, end || start), 1) * DAY_W;
        const isOverdue = task.deadline && new Date(task.deadline) < now && task.status !== 'Hoàn thành';

        return {
            left: `${left}px`,
            width: `${width}px`,
            background: isOverdue ? '#fee2e2' : (STATUS_BG[task.status] || '#dbeafe'),
            border: `2px solid ${isOverdue ? '#dc2626' : STATUS_COLOR[task.status] || '#2563eb'}`,
            color: isOverdue ? '#dc2626' : (STATUS_COLOR[task.status] || '#1d4ed8'),
        };
    };

    const grouped = {};
    filtered.forEach(t => {
        const key = t.project?.name || 'Không thuộc dự án';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Filters */}
            <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>🗓️ Tiến độ công việc xưởng</span>
                    <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ fontSize: 13 }}>
                        <option value="">Tất cả dự án</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
                        <option value="">Tất cả trạng thái</option>
                        {['Chờ làm','Đang làm','Hoàn thành','Tạm dừng'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    {(filterProject || filterStatus) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterProject(''); setFilterStatus(''); }}>Xóa bộ lọc</button>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 12 }}>
                        {Object.entries(STATUS_COLOR).map(([s, c]) => (
                            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_BG[s], border: `2px solid ${c}`, display: 'inline-block' }}></span>{s}
                            </span>
                        ))}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fee2e2', border: '2px solid #dc2626', display: 'inline-block' }}></span>Trễ
                        </span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có công việc nào có ngày bắt đầu hoặc deadline. Hãy thêm ngày vào công việc.
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <div style={{ minWidth: totalDays * DAY_W + 240, fontFamily: 'var(--font-mono, monospace)' }}>
                            {/* Header: months + days */}
                            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                                {/* Left pane header */}
                                <div style={{ minWidth: 220, padding: '10px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', borderRight: '2px solid var(--border)', flexShrink: 0 }}>
                                    Công việc
                                </div>
                                {/* Day headers */}
                                <div style={{ display: 'flex', position: 'relative', overflow: 'visible' }}>
                                    {headerDays.map((d, i) => {
                                        const isToday = d.toDateString() === now.toDateString();
                                        const isMonday = d.getDay() === 1;
                                        const isFirstOfMonth = d.getDate() === 1;
                                        return (
                                            <div key={i} style={{
                                                width: DAY_W, minWidth: DAY_W, textAlign: 'center', padding: '4px 0',
                                                fontSize: 10, fontWeight: isToday ? 800 : 400,
                                                color: isToday ? '#2563eb' : d.getDay() === 0 || d.getDay() === 6 ? '#d97706' : 'var(--text-muted)',
                                                background: isToday ? 'rgba(37,99,235,0.08)' : isFirstOfMonth ? 'rgba(0,0,0,0.03)' : 'transparent',
                                                borderLeft: isFirstOfMonth || isMonday ? '1px dashed var(--border-light)' : 'none',
                                            }}>
                                                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{isFirstOfMonth ? `T${d.getMonth()+1}` : ''}</div>
                                                <div>{d.getDate()}</div>
                                                {isToday && <div style={{ fontSize: 8, color: '#2563eb', fontWeight: 800 }}>HN</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Rows grouped by project */}
                            {Object.entries(grouped).map(([projectName, projectTasks]) => (
                                <div key={projectName}>
                                    {/* Project group header */}
                                    <div style={{ display: 'flex', background: 'rgba(37,99,235,0.06)', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ minWidth: 220, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#1d4ed8', borderRight: '2px solid var(--border)', flexShrink: 0 }}>
                                            📁 {projectName}
                                        </div>
                                        <div style={{ flex: 1 }}></div>
                                    </div>

                                    {/* Task rows */}
                                    {projectTasks.map(task => {
                                        const barStyle = getBarStyle(task);
                                        const isOverdue = task.deadline && new Date(task.deadline) < now && task.status !== 'Hoàn thành';
                                        return (
                                            <div key={task.id} style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', minHeight: 44 }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                {/* Left: task info */}
                                                <div style={{ minWidth: 220, padding: '8px 16px', borderRight: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: isOverdue ? '#dc2626' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {task.isLocked && '🔒 '}{task.title}
                                                        </div>
                                                        {task.workers?.length > 0 && (
                                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                                                👷 {task.workers.map(w => w.worker.name).join(', ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span style={{ padding: '1px 6px', borderRadius: 8, background: STATUS_BG[task.status], color: STATUS_COLOR[task.status], fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                                                        {task.progress}%
                                                    </span>
                                                </div>

                                                {/* Right: Gantt bar */}
                                                <div style={{ flex: 1, position: 'relative', minHeight: 44 }}>
                                                    {/* Today line */}
                                                    <div style={{ position: 'absolute', left: todayOffset * DAY_W + DAY_W / 2, top: 0, bottom: 0, width: 2, background: 'rgba(37,99,235,0.3)', zIndex: 1 }} />

                                                    {/* Weekend shading */}
                                                    {headerDays.map((d, i) => (
                                                        (d.getDay() === 0 || d.getDay() === 6) ? (
                                                            <div key={i} style={{ position: 'absolute', left: i * DAY_W, top: 0, bottom: 0, width: DAY_W, background: 'rgba(0,0,0,0.025)' }} />
                                                        ) : null
                                                    ))}

                                                    {/* Gantt bar */}
                                                    {barStyle && (
                                                        <div style={{
                                                            position: 'absolute', top: 8, height: 28, borderRadius: 6,
                                                            ...barStyle, display: 'flex', alignItems: 'center',
                                                            padding: '0 8px', overflow: 'hidden', cursor: 'default',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                        }}
                                                            title={`${task.title}\n${fmtDate(task.startDate)} → ${fmtDate(task.deadline)}\nTiến độ: ${task.progress}%`}>
                                                            {/* Progress fill */}
                                                            <div style={{
                                                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                                                width: `${task.progress}%`,
                                                                background: STATUS_COLOR[task.status] || '#2563eb',
                                                                opacity: 0.25, borderRadius: 4,
                                                            }} />
                                                            <span style={{ fontSize: 11, fontWeight: 700, position: 'relative', zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {task.title}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
