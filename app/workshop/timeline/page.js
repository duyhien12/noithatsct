'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

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
const STAGES   = ['Cut', 'CNC', 'Edge', 'Paint', 'Assembly', 'QC'];
const STAGE_VI = { Cut: 'Cắt', CNC: 'CNC', Edge: 'Dán cạnh', Paint: 'Sơn/PU', Assembly: 'Lắp ráp', QC: 'QC' };
const STAGE_STYLE = {
    Cut:      { color: '#4f46e5', bg: '#ede9fe' },
    CNC:      { color: '#0891b2', bg: '#cffafe' },
    Edge:     { color: '#b45309', bg: '#fef3c7' },
    Paint:    { color: '#7c3aed', bg: '#f3e8ff' },
    Assembly: { color: '#1d4ed8', bg: '#dbeafe' },
    QC:       { color: '#15803d', bg: '#dcfce7' },
};
const STAGE_IDX = { Cut: 0, CNC: 1, Edge: 2, Paint: 3, Assembly: 4, QC: 5 };

const ROW_H    = 56;   // px per task row
const GROUP_H  = 30;   // px for project group header
const LEFT_W   = 244;  // px for left pane
const DAY_W    = 36;   // px per day
// Bar positions within a row:
const BASE_TOP = 10;   // baseline bar top
const BASE_H   = 7;    // baseline bar height
const ACT_TOP  = 22;   // actual bar top
const ACT_H    = 22;   // actual bar height

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—';
const daysBetween = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));

export default function TimelinePage() {
    const [tasks, setTasks]         = useState([]);
    const [projects, setProjects]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus]   = useState('');
    const [filterStage, setFilterStage]     = useState('');
    const [showBaseline, setShowBaseline]   = useState(true);
    const [showDeps, setShowDeps]           = useState(true);
    const [lastSync, setLastSync]           = useState(null);
    const intervalRef = useRef(null);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [t, p] = await Promise.all([
                fetch('/api/workshop/tasks').then(r => r.json()),
                fetch('/api/projects?limit=200').then(r => r.json()),
            ]);
            setTasks(Array.isArray(t) ? t : []);
            setProjects(p?.data || []);
            setLastSync(new Date());
        } catch {}
        if (!silent) setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(intervalRef.current);
    }, [fetchData]);

    // ── Filter ──────────────────────────────────────────────
    const filtered = tasks.filter(t => {
        if (filterProject && t.projectId !== filterProject) return false;
        if (filterStatus  && t.status !== filterStatus)     return false;
        if (filterStage   && t.stage !== filterStage)       return false;
        if (!t.startDate && !t.deadline) return false;
        return true;
    });

    // ── Date range ──────────────────────────────────────────
    const now = new Date();
    const allDates = filtered.flatMap(t =>
        [t.startDate && new Date(t.startDate), t.deadline && new Date(t.deadline)].filter(Boolean));
    const minDate = new Date(allDates.length > 0
        ? Math.min(...allDates.map(d => d.getTime()))
        : new Date(now.getFullYear(), now.getMonth(), 1).getTime());
    const maxDate = new Date(allDates.length > 0
        ? Math.max(...allDates.map(d => d.getTime()))
        : new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime());
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);
    const totalDays   = Math.max(daysBetween(minDate, maxDate), 14);
    const todayOffset = Math.max(0, daysBetween(minDate, now));
    const headerDays  = Array.from({ length: totalDays }, (_, i) => {
        const d = new Date(minDate); d.setDate(d.getDate() + i); return d;
    });

    // ── Grouping (sorted by stage within each project) ──────
    const grouped = {};
    filtered.forEach(t => {
        const key = t.project?.name || 'Không thuộc dự án';
        if (!grouped[key]) grouped[key] = { projectId: t.projectId, tasks: [] };
        grouped[key].tasks.push(t);
    });
    Object.values(grouped).forEach(g => {
        g.tasks.sort((a, b) =>
            (STAGE_IDX[a.stage] ?? 99) - (STAGE_IDX[b.stage] ?? 99) ||
            (a.startDate ? new Date(a.startDate) : new Date(0)) - (b.startDate ? new Date(b.startDate) : new Date(0)));
    });

    // ── Bar pixel helper ─────────────────────────────────────
    const getBarPx = (task) => {
        const s = task.startDate ? new Date(task.startDate) : (task.deadline ? new Date(task.deadline) : null);
        const e = task.deadline ? new Date(task.deadline) : s;
        if (!s) return null;
        const x = Math.max(0, daysBetween(minDate, s)) * DAY_W;
        const w = Math.max(daysBetween(s, e), 1) * DAY_W;
        return { x, w };
    };

    // ── Row Y positions (for SVG overlay alignment) ──────────
    let svgRunY = 0;
    const taskRowY = {};
    Object.values(grouped).forEach(({ tasks: gt }) => {
        svgRunY += GROUP_H;
        gt.forEach(task => { taskRowY[task.id] = svgRunY; svgRunY += ROW_H; });
    });
    const totalChartH = svgRunY;

    // ── Critical path ────────────────────────────────────────
    // Within each project: tasks on the chain leading to the latest deadline
    const criticalIds = new Set();
    Object.values(grouped).forEach(({ tasks: gt }) => {
        const active = gt.filter(t => t.deadline && t.status !== 'Hoàn thành');
        if (!active.length) return;
        const latest = active.reduce((mx, t) => new Date(t.deadline) > new Date(mx.deadline) ? t : mx);
        criticalIds.add(latest.id);
        const latestSI = STAGE_IDX[latest.stage] ?? 5;
        active.filter(t => (STAGE_IDX[t.stage] ?? 0) < latestSI).forEach(t => criticalIds.add(t.id));
    });

    // ── Dependency arrows (stage-based implicit) ─────────────
    const depArrows = [];
    if (showDeps) {
        Object.values(grouped).forEach(({ tasks: gt }) => {
            // Group tasks by stage index
            const byStage = {};
            gt.forEach(t => {
                const si = STAGE_IDX[t.stage] ?? 99;
                (byStage[si] = byStage[si] || []).push(t);
            });
            const stageKeys = Object.keys(byStage).map(Number).sort((a, b) => a - b);
            for (let i = 0; i < stageKeys.length - 1; i++) {
                const fromTasks = byStage[stageKeys[i]];
                const toTasks   = byStage[stageKeys[i + 1]];
                // Canonical arrow: latest deadline → earliest start
                const fromTask = fromTasks.reduce((mx, t) => {
                    const d  = t.deadline  ? new Date(t.deadline)  : new Date(0);
                    const md = mx.deadline ? new Date(mx.deadline) : new Date(0);
                    return d >= md ? t : mx;
                }, fromTasks[0]);
                const toTask = toTasks.reduce((mn, t) => {
                    const s  = t.startDate  ? new Date(t.startDate)  : (t.deadline  ? new Date(t.deadline)  : new Date(9e15));
                    const ms = mn.startDate ? new Date(mn.startDate) : (mn.deadline ? new Date(mn.deadline) : new Date(9e15));
                    return s <= ms ? t : mn;
                }, toTasks[0]);
                const fp = getBarPx(fromTask);
                const tp = getBarPx(toTask);
                if (!fp || !tp) continue;
                const fy = (taskRowY[fromTask.id] ?? 0) + ACT_TOP + ACT_H / 2;
                const ty = (taskRowY[toTask.id]   ?? 0) + ACT_TOP + ACT_H / 2;
                depArrows.push({
                    x1: fp.x + fp.w, y1: fy,
                    x2: tp.x,        y2: ty,
                    critical: criticalIds.has(fromTask.id) && criticalIds.has(toTask.id),
                });
            }
        });
    }

    // ── Stats bar ────────────────────────────────────────────
    const totalFiltered = filtered.length;
    const overdueCount  = filtered.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'Hoàn thành').length;
    const criticalCount = criticalIds.size;
    const doneCount     = filtered.filter(t => t.status === 'Hoàn thành').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Toolbar */}
            <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>🗓️ Tiến độ Gantt xưởng</span>

                    <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ fontSize: 13, maxWidth: 200 }}>
                        <option value="">Tất cả dự án</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
                        <option value="">Tất cả trạng thái</option>
                        {['Chờ làm', 'Đang làm', 'Hoàn thành', 'Tạm dừng'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className="form-select" value={filterStage} onChange={e => setFilterStage(e.target.value)} style={{ fontSize: 13 }}>
                        <option value="">Tất cả công đoạn</option>
                        {STAGES.map(s => <option key={s} value={s}>{STAGE_VI[s]}</option>)}
                    </select>
                    {(filterProject || filterStatus || filterStage) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterProject(''); setFilterStatus(''); setFilterStage(''); }}>✕ Xóa lọc</button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Toggle options */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showBaseline} onChange={e => setShowBaseline(e.target.checked)} />
                            Baseline
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showDeps} onChange={e => setShowDeps(e.target.checked)} />
                            Dependencies
                        </label>
                        {/* Legend */}
                        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 20, height: 5, background: 'rgba(148,163,184,0.4)', border: '1px solid #94a3b8', display: 'inline-block', borderRadius: 2 }} />
                                Kế hoạch
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 20, height: 10, background: '#dbeafe', border: '1.5px solid #2563eb', display: 'inline-block', borderRadius: 2 }} />
                                Thực tế
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, background: '#dc2626', display: 'inline-block', transform: 'rotate(45deg)' }} />
                                Trễ
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 20, height: 10, background: 'rgba(251,191,36,0.2)', border: '1.5px solid #f59e0b', display: 'inline-block', borderRadius: 2 }} />
                                Critical
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 18, height: 1.5, background: '#94a3b8', borderTop: '1.5px dashed #94a3b8', display: 'inline-block' }} />
                                Dependency
                            </span>
                        </div>
                        {lastSync && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                🔄 {lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats strip */}
                {!loading && totalFiltered > 0 && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>Hiển thị <b style={{ color: 'var(--text-primary)' }}>{totalFiltered}</b> việc</span>
                        <span style={{ color: '#16a34a' }}>✓ Hoàn thành: <b>{doneCount}</b></span>
                        <span style={{ color: '#dc2626' }}>⚠ Trễ hạn: <b>{overdueCount}</b></span>
                        <span style={{ color: '#d97706' }}>⚡ Critical path: <b>{criticalCount}</b></span>
                        <span style={{ color: '#94a3b8' }}>→ Dependencies: <b>{depArrows.length}</b></span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>🗓️</div>Đang tải...
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có công việc nào có ngày bắt đầu hoặc deadline.
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                        <div style={{ minWidth: totalDays * DAY_W + LEFT_W }}>

                            {/* ── Sticky header ─────────────────────────────── */}
                            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 20 }}>
                                <div style={{ minWidth: LEFT_W, padding: '10px 14px', fontSize: 12, fontWeight: 700, borderRight: '2px solid var(--border)', flexShrink: 0 }}>
                                    Công việc / Công đoạn
                                </div>
                                <div style={{ display: 'flex' }}>
                                    {headerDays.map((d, i) => {
                                        const isToday        = d.toDateString() === now.toDateString();
                                        const isFirstOfMonth = d.getDate() === 1;
                                        const isMonday       = d.getDay() === 1;
                                        return (
                                            <div key={i} style={{
                                                width: DAY_W, minWidth: DAY_W, textAlign: 'center', padding: '3px 0',
                                                fontSize: 10, fontWeight: isToday ? 800 : 400,
                                                color: isToday ? '#2563eb' : d.getDay() === 0 || d.getDay() === 6 ? '#d97706' : 'var(--text-muted)',
                                                background: isToday ? 'rgba(37,99,235,0.10)' : isFirstOfMonth ? 'rgba(0,0,0,0.025)' : 'transparent',
                                                borderLeft: isFirstOfMonth || isMonday ? '1px dashed var(--border-light)' : 'none',
                                            }}>
                                                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{isFirstOfMonth ? `T${d.getMonth() + 1}` : ''}</div>
                                                <div>{d.getDate()}</div>
                                                {isToday && <div style={{ fontSize: 8, color: '#2563eb', fontWeight: 800 }}>HN</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Chart body ────────────────────────────────── */}
                            <div style={{ position: 'relative' }}>

                                {/* SVG overlay: weekend shade + today line + dependency arrows */}
                                <svg style={{
                                    position: 'absolute', top: 0, left: LEFT_W,
                                    width: totalDays * DAY_W, height: Math.max(totalChartH, 1),
                                    pointerEvents: 'none', zIndex: 6, overflow: 'visible',
                                }}>
                                    <defs>
                                        <marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                                            <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#94a3b8" />
                                        </marker>
                                        <marker id="arr-cp" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                                            <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="#f59e0b" />
                                        </marker>
                                    </defs>

                                    {/* Weekend bands */}
                                    {headerDays.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) && (
                                        <rect key={i} x={i * DAY_W} y={0} width={DAY_W} height={totalChartH} fill="rgba(0,0,0,0.018)" />
                                    ))}

                                    {/* Today line */}
                                    <line
                                        x1={todayOffset * DAY_W + DAY_W / 2} y1={0}
                                        x2={todayOffset * DAY_W + DAY_W / 2} y2={totalChartH}
                                        stroke="rgba(37,99,235,0.3)" strokeWidth={2} />

                                    {/* Dependency arrows */}
                                    {depArrows.map((a, i) => {
                                        const bend = a.x1 + 12;
                                        const pathD = `M${a.x1},${a.y1} H${bend} V${a.y2} H${a.x2}`;
                                        return (
                                            <path key={i} d={pathD} fill="none"
                                                stroke={a.critical ? '#f59e0b' : '#94a3b8'}
                                                strokeWidth={a.critical ? 2 : 1.5}
                                                strokeDasharray={a.critical ? '6 3' : '4 3'}
                                                markerEnd={a.critical ? 'url(#arr-cp)' : 'url(#arr)'} />
                                        );
                                    })}
                                </svg>

                                {/* Project groups + task rows */}
                                {Object.entries(grouped).map(([projectName, { tasks: gt }]) => {
                                    // Project summary span
                                    const pDates = gt.flatMap(t => [
                                        t.startDate && new Date(t.startDate),
                                        t.deadline  && new Date(t.deadline),
                                    ].filter(Boolean));
                                    const pStart = pDates.length ? new Date(Math.min(...pDates.map(d => d.getTime()))) : null;
                                    const pEnd   = pDates.length ? new Date(Math.max(...pDates.map(d => d.getTime()))) : null;
                                    const pX  = pStart ? Math.max(0, daysBetween(minDate, pStart)) * DAY_W : null;
                                    const pW  = pStart && pEnd ? Math.max(daysBetween(pStart, pEnd), 1) * DAY_W : null;
                                    const pDone  = gt.every(t => t.status === 'Hoàn thành');
                                    const pLate  = gt.some(t => t.deadline && new Date(t.deadline) < now && t.status !== 'Hoàn thành');

                                    return (
                                        <div key={projectName}>
                                            {/* Group header row */}
                                            <div style={{ display: 'flex', height: GROUP_H, background: 'rgba(37,99,235,0.05)', borderBottom: '1px solid var(--border-light)' }}>
                                                <div style={{ minWidth: LEFT_W, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: pLate ? '#dc2626' : '#1d4ed8', borderRight: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    📁 {projectName}
                                                    {pLate && <span style={{ fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>Trễ</span>}
                                                    {pDone && <span style={{ fontSize: 10, background: '#dcfce7', color: '#16a34a', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>✓</span>}
                                                </div>
                                                {/* Project span bar */}
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    {pX !== null && pW !== null && (
                                                        <div style={{
                                                            position: 'absolute', left: pX, top: 8, height: 14, width: pW,
                                                            borderRadius: 3,
                                                            background: pLate ? 'rgba(220,38,38,0.12)' : 'rgba(37,99,235,0.10)',
                                                            border: `1px solid ${pLate ? 'rgba(220,38,38,0.3)' : 'rgba(37,99,235,0.2)'}`,
                                                        }} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Task rows */}
                                            {gt.map(task => {
                                                const bp        = getBarPx(task);
                                                const isOverdue = task.deadline && new Date(task.deadline) < now && task.status !== 'Hoàn thành';
                                                const isBlocked = task.status === 'Tạm dừng' && task.blockedReason;
                                                const isCritical = criticalIds.has(task.id);
                                                const stageSt   = STAGE_STYLE[task.stage] || { color: '#374151', bg: '#f3f4f6' };
                                                const barColor  = isOverdue ? '#dc2626' : (STATUS_COLOR[task.status] || '#2563eb');
                                                const barBg     = isOverdue ? '#fee2e2' : (STATUS_BG[task.status]  || '#dbeafe');

                                                const deadlineX = task.deadline
                                                    ? Math.max(0, daysBetween(minDate, new Date(task.deadline))) * DAY_W + DAY_W / 2
                                                    : null;
                                                const daysLate = isOverdue ? daysBetween(new Date(task.deadline), now) : 0;

                                                return (
                                                    <div key={task.id} style={{
                                                        display: 'flex', height: ROW_H,
                                                        borderBottom: '1px solid var(--border-light)',
                                                        borderLeft: `3px solid ${isCritical ? '#f59e0b' : 'transparent'}`,
                                                        background: isCritical ? 'rgba(251,191,36,0.025)' : 'transparent',
                                                        transition: 'background 0.12s',
                                                    }}
                                                        onMouseEnter={e => e.currentTarget.style.background = isCritical ? 'rgba(251,191,36,0.08)' : 'var(--bg-secondary)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = isCritical ? 'rgba(251,191,36,0.025)' : 'transparent'}>

                                                        {/* ── Left pane ──────────────────────────── */}
                                                        <div style={{ minWidth: LEFT_W - 3, padding: '7px 12px', borderRight: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isOverdue ? '#dc2626' : 'var(--text-primary)' }}>
                                                                    {isBlocked && '🔴 '}{task.isLocked && '🔒 '}{task.title}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                                                                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: stageSt.bg, color: stageSt.color, fontWeight: 700, flexShrink: 0 }}>
                                                                        {STAGE_VI[task.stage] || task.stage}
                                                                    </span>
                                                                    {isCritical && (
                                                                        <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 4, background: '#fef3c7', color: '#d97706', fontWeight: 700, flexShrink: 0 }}>CP</span>
                                                                    )}
                                                                    {task.workers?.length > 0 && (
                                                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                            👷 {task.workers.map(w => w.worker.name).join(', ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span style={{ padding: '2px 6px', borderRadius: 6, background: barBg, color: barColor, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                                                {task.progress}%
                                                            </span>
                                                        </div>

                                                        {/* ── Right pane: bars ───────────────────── */}
                                                        <div style={{ flex: 1, position: 'relative' }}>

                                                            {/* Baseline bar (planned startDate → deadline) */}
                                                            {showBaseline && bp && (
                                                                <div style={{
                                                                    position: 'absolute', left: bp.x, top: BASE_TOP, height: BASE_H, width: bp.w,
                                                                    borderRadius: 2,
                                                                    background: 'rgba(148,163,184,0.22)',
                                                                    border: '1px solid rgba(148,163,184,0.45)',
                                                                }} title={`Kế hoạch: ${fmtDate(task.startDate)} → ${fmtDate(task.deadline)}`} />
                                                            )}

                                                            {/* Actual bar (with progress fill) */}
                                                            {bp && (
                                                                <div style={{
                                                                    position: 'absolute', left: bp.x, top: ACT_TOP, height: ACT_H, width: bp.w,
                                                                    borderRadius: 5, background: barBg, overflow: 'hidden',
                                                                    border: `2px solid ${isCritical ? '#f59e0b' : barColor}`,
                                                                    boxShadow: isCritical
                                                                        ? '0 0 0 2px rgba(251,191,36,0.25), 0 1px 4px rgba(0,0,0,0.08)'
                                                                        : '0 1px 3px rgba(0,0,0,0.08)',
                                                                }} title={`${task.title}\n${fmtDate(task.startDate)} → ${fmtDate(task.deadline)}\nTiến độ: ${task.progress}%${isOverdue ? `\n⚠️ Trễ ${daysLate} ngày` : ''}`}>
                                                                    {/* Progress fill */}
                                                                    <div style={{
                                                                        position: 'absolute', left: 0, top: 0, bottom: 0,
                                                                        width: `${task.progress}%`,
                                                                        background: barColor, opacity: 0.28, borderRadius: 3,
                                                                    }} />
                                                                    <span style={{
                                                                        position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700,
                                                                        padding: '0 7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                        display: 'block', lineHeight: `${ACT_H - 4}px`, color: barColor,
                                                                    }}>
                                                                        {task.title}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Delay diamond at deadline */}
                                                            {isOverdue && deadlineX !== null && (
                                                                <>
                                                                    <div style={{
                                                                        position: 'absolute', left: deadlineX - 6, top: ACT_TOP,
                                                                        width: 12, height: 12, background: '#dc2626',
                                                                        transform: 'rotate(45deg)', zIndex: 7,
                                                                        boxShadow: '0 0 0 2px rgba(220,38,38,0.25)',
                                                                    }} title={`Trễ ${daysLate} ngày kể từ ${fmtDate(task.deadline)}`} />
                                                                    <div style={{
                                                                        position: 'absolute', left: deadlineX + 8, top: ACT_TOP + 1,
                                                                        fontSize: 9, fontWeight: 800, color: '#dc2626',
                                                                        whiteSpace: 'nowrap', zIndex: 7,
                                                                    }}>+{daysLate}d</div>
                                                                </>
                                                            )}

                                                            {/* Baseline label (date range) under bars */}
                                                            {showBaseline && bp && task.startDate && task.deadline && (
                                                                <div style={{
                                                                    position: 'absolute', left: bp.x + 2, top: ACT_TOP + ACT_H + 2,
                                                                    fontSize: 8, color: 'rgba(148,163,184,0.9)', whiteSpace: 'nowrap',
                                                                }}>
                                                                    {fmtDate(task.startDate)} → {fmtDate(task.deadline)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
