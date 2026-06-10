'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const STATUS_COLOR = {
    'Chưa bắt đầu': '#d97706',
    'Đang thực hiện': '#2563eb',
    'Hoàn thành':    '#16a34a',
    'Tạm dừng':      '#9ca3af',
};
const STATUS_BG = {
    'Chưa bắt đầu': '#fef3c7',
    'Đang thực hiện': '#dbeafe',
    'Hoàn thành':    '#dcfce7',
    'Tạm dừng':      '#f3f4f6',
};

// Màu theo loại hạng mục (match theo tên, không phân biệt hoa/thường, có dấu/không dấu)
const TASK_TYPE_COLORS = [
    { test: n => /vẽ\s*cnc|ve\s*cnc/i.test(n),                        color: '#15803d', bg: '#dcfce7' }, // xanh lá
    { test: n => /^vẽ$|^ve$/i.test(n.trim()),                         color: '#65a30d', bg: '#ecfccb' }, // xanh lá nhạt
    { test: n => /gia\s*công|gia\s*cong/i.test(n),                    color: '#0284c7', bg: '#e0f2fe' }, // xanh da trời
    { test: n => /lắp\s*ráp\s*tại\s*xưởng|lap\s*rap\s*tai\s*xuong/i.test(n), color: '#7c3aed', bg: '#ede9fe' }, // tím
    { test: n => /lắp\s*đặt\s*tại\s*công\s*trình|lap\s*dat\s*tai\s*cong\s*trinh/i.test(n), color: '#dc2626', bg: '#fee2e2' }, // đỏ
    { test: n => /^lắp$|^lap$/i.test(n.trim()),                       color: '#9333ea', bg: '#f3e8ff' }, // tím nhạt
    { test: n => /hoàn\s*thiện|hoan\s*thien/i.test(n),                color: '#0891b2', bg: '#cffafe' }, // cyan
    { test: n => /sơn|son/i.test(n),                                   color: '#ea580c', bg: '#ffedd5' }, // cam
    { test: n => /điện|dien/i.test(n),                                 color: '#ca8a04', bg: '#fef9c3' }, // vàng
    { test: n => /nước|nuoc/i.test(n),                                 color: '#0369a1', bg: '#dbeafe' }, // xanh nước
];

function getTaskTypeColor(task) {
    // Ưu tiên màu người dùng đặt trong DB
    if (task.color && task.color !== '') {
        const hex = task.color;
        return { color: hex, bg: hex + '22' };
    }
    const name = (task.title || task.name || '');
    for (const { test, color, bg } of TASK_TYPE_COLORS) {
        if (test(name)) return { color, bg };
    }
    return null;
}

const ROW_H   = 32;
const GROUP_H = 26;
const LEFT_W  = 260;
const DAY_W   = 32;
const BASE_TOP = 5;
const BASE_H   = 4;
const ACT_TOP  = 8;
const ACT_H    = 16;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—';
const daysBetween = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));

// Map ScheduleTask → display shape expected by the chart
function mapTask(t) {
    return {
        ...t,
        title:    t.name,
        deadline: t.endDate,
        workers:  t.assignee ? [{ worker: { name: t.assignee } }] : [],
    };
}

export default function TimelinePage() {
    const [tasks, setTasks]       = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [filterProject,     setFilterProject]     = useState('');
    const [filterStatus,      setFilterStatus]      = useState('');
    const [filterProjectType, setFilterProjectType] = useState('Thi công nội thất');
    const [filterSection,     setFilterSection]     = useState('');
    const [showBaseline,      setShowBaseline]      = useState(true);
    const [showDeps,          setShowDeps]          = useState(true);
    const [hideDoneProjects,  setHideDoneProjects]  = useState(false);
    const [collapsedProjects, setCollapsedProjects] = useState(new Set());
    const [lastSync,          setLastSync]          = useState(null);
    const intervalRef = useRef(null);
    const scrollRef   = useRef(null);

    const toggleCollapse = (name) => setCollapsedProjects(prev => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
    });

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const qs = filterProjectType ? `?projectType=${encodeURIComponent(filterProjectType)}` : '';
            const [t, p] = await Promise.all([
                fetch(`/api/schedule-tasks/all${qs}`).then(r => r.json()),
                fetch('/api/projects?limit=200').then(r => r.json()),
            ]);
            setTasks(Array.isArray(t) ? t.map(mapTask) : []);
            setProjects(p?.data || []);
            setLastSync(new Date());
        } catch {}
        if (!silent) setLoading(false);
    }, [filterProjectType]);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(intervalRef.current);
    }, [fetchData]);

    // ── Section matcher ─────────────────────────────────────
    const SECTIONS = [
        { value: 've-cnc',       label: 'Vẽ CNC',                   test: n => /vẽ\s*cnc|ve\s*cnc/i.test(n) },
        { value: 'gia-cong',     label: 'Gia công nguội',            test: n => /gia\s*công|gia\s*cong/i.test(n) },
        { value: 'lap-rap-xuong',label: 'Lắp ráp tại xưởng',        test: n => /lắp\s*ráp\s*tại\s*xưởng|lap\s*rap\s*tai\s*xuong/i.test(n) },
        { value: 'lap-dat-ct',   label: 'Lắp đặt tại công trình',   test: n => /lắp\s*đặt\s*tại\s*công\s*trình|lap\s*dat\s*tai\s*cong\s*trinh/i.test(n) },
    ];

    // ── Filter ──────────────────────────────────────────────
    const filtered = tasks.filter(t => {
        if (filterProject && t.projectId !== filterProject) return false;
        if (filterStatus  && t.status !== filterStatus)     return false;
        if (!t.startDate && !t.deadline) return false;
        if (filterSection) {
            const sec = SECTIONS.find(s => s.value === filterSection);
            if (sec && !sec.test(t.title || t.name || '')) return false;
        }
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

    // Scroll đến hôm nay sau khi render xong
    useEffect(() => {
        if (!scrollRef.current || loading) return;
        const el = scrollRef.current;
        const todayPx = LEFT_W + todayOffset * DAY_W;
        const center  = todayPx - el.clientWidth / 2 + DAY_W / 2;
        el.scrollLeft = Math.max(0, center);
    }, [loading, todayOffset]);

    // ── Grouping by project ─────────────────────────────────
    const groupedRaw = {};
    filtered.forEach(t => {
        const key = t.project?.name || 'Không thuộc dự án';
        if (!groupedRaw[key]) groupedRaw[key] = { projectId: t.projectId, tasks: [] };
        groupedRaw[key].tasks.push(t);
    });
    Object.values(groupedRaw).forEach(g => {
        g.tasks.sort((a, b) =>
            (a.order ?? 0) - (b.order ?? 0) ||
            (a.startDate ? new Date(a.startDate) : new Date(0)) - (b.startDate ? new Date(b.startDate) : new Date(0)));
    });
    const grouped = Object.fromEntries(
        Object.entries(groupedRaw).filter(([, g]) =>
            !hideDoneProjects || !g.tasks.every(t => t.status === 'Hoàn thành')
        )
    );

    // ── Bar pixel helper ─────────────────────────────────────
    const getBarPx = (task) => {
        const s = task.startDate ? new Date(task.startDate) : (task.deadline ? new Date(task.deadline) : null);
        const e = task.deadline  ? new Date(task.deadline)  : s;
        if (!s) return null;
        const x = Math.max(0, daysBetween(minDate, s)) * DAY_W;
        const w = Math.max(daysBetween(s, e), 1) * DAY_W;
        return { x, w };
    };

    // ── Row Y positions ──────────────────────────────────────
    let svgRunY = 0;
    const taskRowY = {};
    Object.entries(grouped).forEach(([name, { tasks: gt }]) => {
        svgRunY += GROUP_H;
        if (!collapsedProjects.has(name)) {
            gt.forEach(task => { taskRowY[task.id] = svgRunY; svgRunY += ROW_H; });
        }
    });
    const totalChartH = svgRunY;

    // ── Critical path ────────────────────────────────────────
    const criticalIds = new Set();
    Object.values(grouped).forEach(({ tasks: gt }) => {
        const active = gt.filter(t => t.deadline && t.status !== 'Hoàn thành');
        if (!active.length) return;
        const latest = active.reduce((mx, t) => new Date(t.deadline) > new Date(mx.deadline) ? t : mx);
        criticalIds.add(latest.id);
    });

    // ── Dependency arrows (predecessorId-based) ──────────────
    const depArrows = [];
    if (showDeps) {
        const taskById = {};
        filtered.forEach(t => { taskById[t.id] = t; });
        filtered.forEach(t => {
            if (!t.predecessorId || !taskById[t.predecessorId]) return;
            const from = taskById[t.predecessorId];
            const fp = getBarPx(from);
            const tp = getBarPx(t);
            if (!fp || !tp) return;
            const fy = (taskRowY[from.id] ?? 0) + ACT_TOP + ACT_H / 2;
            const ty = (taskRowY[t.id]    ?? 0) + ACT_TOP + ACT_H / 2;
            depArrows.push({
                x1: fp.x + fp.w, y1: fy,
                x2: tp.x,        y2: ty,
                critical: criticalIds.has(from.id) && criticalIds.has(t.id),
            });
        });
    }

    // ── Stats ────────────────────────────────────────────────
    const totalFiltered = filtered.length;
    const overdueCount  = filtered.filter(t => t.deadline && new Date(t.deadline) < now && t.status !== 'Hoàn thành').length;
    const doneCount     = filtered.filter(t => t.status === 'Hoàn thành').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Toolbar */}
            <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>🗓️ Tiến độ Gantt xưởng</span>

                    <select className="form-select" value={filterProjectType} onChange={e => { setFilterProjectType(e.target.value); setFilterProject(''); }} style={{ fontSize: 13 }}>
                        <option value="">Tất cả loại dự án</option>
                        <option value="Thi công nội thất">🪑 Nội thất</option>
                        <option value="Xây dựng">🏗️ Xây dựng</option>
                        <option value="Thiết kế">🎨 Thiết kế</option>
                    </select>
                    <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ fontSize: 13, maxWidth: 200 }}>
                        <option value="">Tất cả dự án</option>
                        {projects.filter(p => !filterProjectType || p.type === filterProjectType).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
                        <option value="">Tất cả trạng thái</option>
                        {['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'].map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className="form-select" value={filterSection} onChange={e => setFilterSection(e.target.value)} style={{ fontSize: 13 }}>
                        <option value="">Tất cả phần</option>
                        {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    {(filterProject || filterStatus || filterSection || filterProjectType !== 'Thi công nội thất') && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterProject(''); setFilterStatus(''); setFilterSection(''); setFilterProjectType('Thi công nội thất'); }}>✕ Xóa lọc</button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={hideDoneProjects} onChange={e => setHideDoneProjects(e.target.checked)} />
                            Ẩn đã xong
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showBaseline} onChange={e => setShowBaseline(e.target.checked)} />
                            Baseline
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={showDeps} onChange={e => setShowDeps(e.target.checked)} />
                            Dependencies
                        </label>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
                            {[
                                { color: '#15803d', bg: '#dcfce7', label: 'Vẽ CNC' },
                                { color: '#0284c7', bg: '#e0f2fe', label: 'Gia công' },
                                { color: '#7c3aed', bg: '#ede9fe', label: 'Lắp ráp xưởng' },
                                { color: '#dc2626', bg: '#fee2e2', label: 'Lắp đặt CT' },
                                { color: '#ea580c', bg: '#ffedd5', label: 'Sơn' },
                            ].map(({ color, bg, label }) => (
                                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <span style={{ width: 22, height: 10, background: bg, border: `1.5px solid ${color}`, display: 'inline-block', borderRadius: 3 }} />
                                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                </span>
                            ))}
                            <span style={{ width: 1, height: 14, background: 'var(--border-light)', display: 'inline-block', margin: '0 2px' }} />
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 20, height: 5, background: 'rgba(148,163,184,0.4)', border: '1px solid #94a3b8', display: 'inline-block', borderRadius: 2 }} />
                                KH
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, background: '#dc2626', display: 'inline-block', transform: 'rotate(45deg)' }} />
                                Trễ
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 20, height: 10, background: 'rgba(251,191,36,0.2)', border: '1.5px solid #f59e0b', display: 'inline-block', borderRadius: 2 }} />
                                Critical
                            </span>
                        </div>
                        {lastSync && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                🔄 {lastSync.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>

                {!loading && totalFiltered > 0 && (
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)', fontSize: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Hiển thị <b style={{ color: 'var(--text-primary)' }}>{totalFiltered}</b> hạng mục / <b>{Object.keys(grouped).length}</b> dự án</span>
                        <span style={{ color: '#16a34a' }}>✓ Hoàn thành: <b>{doneCount}</b></span>
                        <span style={{ color: '#dc2626' }}>⚠ Trễ hạn: <b>{overdueCount}</b></span>
                        <span style={{ color: '#d97706' }}>⚡ Critical: <b>{criticalIds.size}</b></span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                onClick={() => setCollapsedProjects(new Set(Object.keys(grouped)))}>
                                ▶ Thu gọn tất cả
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                onClick={() => setCollapsedProjects(new Set())}>
                                ▼ Mở tất cả
                            </button>
                        </span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>🗓️</div>Đang tải...
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có hạng mục tiến độ nào.
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                        <div style={{ minWidth: totalDays * DAY_W + LEFT_W }}>

                            {/* Sticky header */}
                            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 20 }}>
                                <div style={{ minWidth: LEFT_W, padding: '10px 14px', fontSize: 12, fontWeight: 700, borderRight: '2px solid var(--border)', flexShrink: 0, position: 'sticky', left: 0, zIndex: 50, background: 'var(--bg-secondary, #ffffff)' }}>
                                    Hạng mục / Phụ trách
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

                            {/* Chart body */}
                            <div style={{ position: 'relative' }}>

                                {/* SVG overlay */}
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

                                    {headerDays.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) && (
                                        <rect key={i} x={i * DAY_W} y={0} width={DAY_W} height={totalChartH} fill="rgba(0,0,0,0.018)" />
                                    ))}

                                    <line
                                        x1={todayOffset * DAY_W + DAY_W / 2} y1={0}
                                        x2={todayOffset * DAY_W + DAY_W / 2} y2={totalChartH}
                                        stroke="rgba(37,99,235,0.3)" strokeWidth={2} />

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
                                    const isCollapsed = collapsedProjects.has(projectName);
                                    const pDates = gt.flatMap(t => [
                                        t.startDate && new Date(t.startDate),
                                        t.deadline  && new Date(t.deadline),
                                    ].filter(Boolean));
                                    const pStart = pDates.length ? new Date(Math.min(...pDates.map(d => d.getTime()))) : null;
                                    const pEnd   = pDates.length ? new Date(Math.max(...pDates.map(d => d.getTime()))) : null;
                                    const pX  = pStart ? Math.max(0, daysBetween(minDate, pStart)) * DAY_W : null;
                                    const pW  = pStart && pEnd ? Math.max(daysBetween(pStart, pEnd), 1) * DAY_W : null;
                                    const pDone = gt.every(t => t.status === 'Hoàn thành');
                                    const pLate = gt.some(t => t.deadline && new Date(t.deadline) < now && t.status !== 'Hoàn thành');
                                    const pPct  = gt.length ? Math.round(gt.reduce((s, t) => s + (t.progress || 0), 0) / gt.length) : 0;

                                    return (
                                        <div key={projectName}>
                                            {/* Group header — clickable to collapse */}
                                            <div
                                                onClick={() => toggleCollapse(projectName)}
                                                style={{ display: 'flex', height: GROUP_H, background: pDone ? 'rgba(22,163,74,0.06)' : 'rgba(37,99,235,0.05)', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                                            >
                                                <div style={{ minWidth: LEFT_W, padding: '0 8px', fontSize: 11, fontWeight: 700, color: pLate ? '#dc2626' : pDone ? '#16a34a' : '#1d4ed8', borderRight: '2px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, position: 'sticky', left: 0, zIndex: 30, background: pDone ? '#f0fdf4' : '#eff6ff', height: GROUP_H }}>
                                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 10, flexShrink: 0 }}>{isCollapsed ? '▶' : '▼'}</span>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>📁 {projectName}</span>
                                                    <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{pPct}%</span>
                                                    {pLate && <span style={{ fontSize: 9, background: '#fee2e2', color: '#dc2626', padding: '1px 4px', borderRadius: 3, fontWeight: 700, flexShrink: 0 }}>Trễ</span>}
                                                    {pDone && <span style={{ fontSize: 9, background: '#dcfce7', color: '#16a34a', padding: '1px 4px', borderRadius: 3, fontWeight: 700, flexShrink: 0 }}>✓</span>}
                                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>{gt.length}</span>
                                                </div>
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    {pX !== null && pW !== null && (
                                                        <div style={{
                                                            position: 'absolute', left: pX, top: 6, height: 12, width: pW,
                                                            borderRadius: 3,
                                                            background: pDone ? 'rgba(22,163,74,0.15)' : pLate ? 'rgba(220,38,38,0.12)' : 'rgba(37,99,235,0.10)',
                                                            border: `1px solid ${pDone ? 'rgba(22,163,74,0.35)' : pLate ? 'rgba(220,38,38,0.3)' : 'rgba(37,99,235,0.2)'}`,
                                                        }}>
                                                            <div style={{ height: '100%', width: `${pPct}%`, background: pDone ? '#16a34a' : pLate ? '#dc2626' : '#2563eb', opacity: 0.3, borderRadius: 3 }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Task rows — hidden when collapsed */}
                                            {!isCollapsed && gt.map(task => {
                                                const bp         = getBarPx(task);
                                                const isOverdue  = task.deadline && new Date(task.deadline) < now && task.status !== 'Hoàn thành';
                                                const isCritical = criticalIds.has(task.id);
                                                const typeColor  = getTaskTypeColor(task);
                                                const barColor   = isOverdue
                                                    ? (typeColor ? typeColor.color : '#dc2626')
                                                    : (typeColor ? typeColor.color : (STATUS_COLOR[task.status] || '#2563eb'));
                                                const barBg      = isOverdue
                                                    ? (typeColor ? typeColor.bg : '#fee2e2')
                                                    : (typeColor ? typeColor.bg : (STATUS_BG[task.status] || '#dbeafe'));
                                                const deadlineX  = task.deadline
                                                    ? Math.max(0, daysBetween(minDate, new Date(task.deadline))) * DAY_W + DAY_W / 2
                                                    : null;
                                                const daysLate   = isOverdue ? daysBetween(new Date(task.deadline), now) : 0;
                                                const indent     = (task.level || 0) * 12;
                                                const rowBorderColor = isCritical ? '#f59e0b' : (typeColor ? typeColor.color : 'transparent');

                                                return (
                                                    <div key={task.id} style={{
                                                        display: 'flex', height: ROW_H,
                                                        borderBottom: '1px solid var(--border-light)',
                                                        borderLeft: `3px solid ${rowBorderColor}`,
                                                        background: isCritical ? 'rgba(251,191,36,0.025)' : 'transparent',
                                                        transition: 'background 0.12s',
                                                    }}
                                                        onMouseEnter={e => e.currentTarget.style.background = isCritical ? 'rgba(251,191,36,0.08)' : 'var(--bg-secondary)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = isCritical ? 'rgba(251,191,36,0.025)' : 'transparent'}>

                                                        {/* Left pane */}
                                                        <div style={{ minWidth: LEFT_W - 3, padding: '0 8px', paddingLeft: 8 + indent, borderRight: `2px solid ${typeColor ? typeColor.color + '55' : 'var(--border)'}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, position: 'sticky', left: 0, zIndex: 20, background: isCritical ? '#fffbeb' : 'var(--bg-card, #ffffff)', height: ROW_H }}>
                                                            {task.isLocked && <span style={{ fontSize: 9, flexShrink: 0 }}>🔒</span>}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 11, fontWeight: task.level === 0 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isOverdue ? '#dc2626' : 'var(--text-primary)', lineHeight: 1.2 }}>
                                                                    {task.title}
                                                                </div>
                                                                {task.assignee && (
                                                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, marginTop: 1 }}>
                                                                        {task.assignee}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span style={{ padding: '1px 5px', borderRadius: 4, background: barBg, color: barColor, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                                                {task.progress}%
                                                            </span>
                                                        </div>

                                                        {/* Right pane: bars */}
                                                        <div style={{ flex: 1, position: 'relative' }}>

                                                            {/* Baseline bar */}
                                                            {showBaseline && bp && task.baselineStart && task.baselineEnd && (() => {
                                                                const bs = new Date(task.baselineStart);
                                                                const be = new Date(task.baselineEnd);
                                                                const bx = Math.max(0, daysBetween(minDate, bs)) * DAY_W;
                                                                const bw = Math.max(daysBetween(bs, be), 1) * DAY_W;
                                                                return (
                                                                    <div style={{
                                                                        position: 'absolute', left: bx, top: BASE_TOP, height: BASE_H, width: bw,
                                                                        borderRadius: 2,
                                                                        background: 'rgba(148,163,184,0.22)',
                                                                        border: '1px solid rgba(148,163,184,0.45)',
                                                                    }} title={`Baseline: ${fmtDate(task.baselineStart)} → ${fmtDate(task.baselineEnd)}`} />
                                                                );
                                                            })()}

                                                            {/* Actual bar */}
                                                            {bp && (
                                                                <div style={{
                                                                    position: 'absolute', left: bp.x, top: ACT_TOP, height: ACT_H, width: bp.w,
                                                                    borderRadius: 5, background: barBg, overflow: 'hidden',
                                                                    border: `2px solid ${isCritical ? '#f59e0b' : barColor}`,
                                                                    boxShadow: isCritical
                                                                        ? '0 0 0 2px rgba(251,191,36,0.25), 0 1px 4px rgba(0,0,0,0.08)'
                                                                        : '0 1px 3px rgba(0,0,0,0.08)',
                                                                }} title={`${task.title}\n${fmtDate(task.startDate)} → ${fmtDate(task.deadline)}\nTiến độ: ${task.progress}%${isOverdue ? `\n⚠️ Trễ ${daysLate} ngày` : ''}`}>
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

                                                            {/* Delay diamond */}
                                                            {isOverdue && deadlineX !== null && (
                                                                <>
                                                                    <div style={{
                                                                        position: 'absolute', left: deadlineX - 5, top: ACT_TOP + 1,
                                                                        width: 10, height: 10, background: '#dc2626',
                                                                        transform: 'rotate(45deg)', zIndex: 7,
                                                                        boxShadow: '0 0 0 2px rgba(220,38,38,0.25)',
                                                                    }} title={`Trễ ${daysLate} ngày kể từ ${fmtDate(task.deadline)}`} />
                                                                    <div style={{
                                                                        position: 'absolute', left: deadlineX + 7, top: ACT_TOP + 2,
                                                                        fontSize: 8, fontWeight: 800, color: '#dc2626',
                                                                        whiteSpace: 'nowrap', zIndex: 7,
                                                                    }}>+{daysLate}d</div>
                                                                </>
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
