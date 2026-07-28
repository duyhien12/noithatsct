'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { STATUS_PROGRESS, DONE_STATUSES, DESIGNERS, STATUSES, colorForExecutor } from '@/lib/designTaskStatus';

const ROW_H   = 34;
const GROUP_H = 28;
const LEFT_W  = 260;
const DAY_W   = 32;
const ACT_TOP = 8;
const ACT_H   = 18;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '—';
const daysBetween = (a, b) => Math.round((b - a) / (1000 * 60 * 60 * 24));
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };

// Ngày bắt đầu/kết thúc hiệu lực: ưu tiên ngày đặt trên bảng CV Thiết kế, rồi tới ngày tạo công việc.
function effectiveStart(t) {
    return t.startDate || t.createdAt;
}
function effectiveEnd(t) {
    return t.endDate || t.startDate || t.createdAt;
}

export default function DesignTaskGanttPage() {
    const [tasks, setTasks]       = useState([]);
    const [loading, setLoading]   = useState(true);
    const [filterExecutor, setFilterExecutor] = useState('');
    const [filterStatus,   setFilterStatus]   = useState('');
    const [search,         setSearch]         = useState('');
    const [hideDone,       setHideDone]       = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());
    const [lastSync, setLastSync] = useState(null);
    const intervalRef    = useRef(null);
    const scrollRef       = useRef(null);
    const dragRef         = useRef(null);
    const dragPreviewRef  = useRef(null);
    const [dragPreview, setDragPreviewState] = useState(null);
    const fetchDataRef = useRef(null);

    const toggleCollapse = (name) => setCollapsedGroups(prev => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
    });

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            let all = [];
            let page = 1;
            for (;;) {
                const res = await fetch(`/api/design-tasks?limit=500&page=${page}`).then(r => r.json());
                all = all.concat(res?.data || []);
                if (!res?.pagination?.hasNext) break;
                page += 1;
            }
            setTasks(all);
            setLastSync(new Date());
        } catch {}
        if (!silent) setLoading(false);
    }, []);

    useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);
    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(intervalRef.current);
    }, [fetchData]);

    // ── Drag handlers ────────────────────────────────────────
    const handleBarMouseDown = useCallback((e, task, type) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
            id: task.id,
            type,
            startX: e.clientX,
            origStart: new Date(effectiveStart(task)),
            origEnd:   new Date(effectiveEnd(task)),
        };
        document.body.style.cursor     = type === 'move' ? 'grabbing' : 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!dragRef.current) return;
            const { type, startX, origStart, origEnd, id } = dragRef.current;
            const deltaDays = Math.round((e.clientX - startX) / DAY_W);
            let s = new Date(origStart);
            let ed = new Date(origEnd);
            if (type === 'move') {
                s  = addDays(s,  deltaDays);
                ed = addDays(ed, deltaDays);
            } else if (type === 'resize-left') {
                s = new Date(Math.min(addDays(s, deltaDays).getTime(), ed.getTime() - 86400000));
            } else if (type === 'resize-right') {
                ed = new Date(Math.max(addDays(ed, deltaDays).getTime(), s.getTime() + 86400000));
            }
            const preview = { id, startDate: s.toISOString(), endDate: ed.toISOString() };
            dragPreviewRef.current = preview;
            setDragPreviewState(preview);
        };

        const onMouseUp = async () => {
            if (!dragRef.current) return;
            dragRef.current = null;
            document.body.style.cursor     = '';
            document.body.style.userSelect = '';
            const preview = dragPreviewRef.current;
            dragPreviewRef.current = null;
            setDragPreviewState(null);
            if (!preview) return;
            try {
                await fetch(`/api/design-tasks/${preview.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ startDate: preview.startDate, endDate: preview.endDate }),
                });
                fetchDataRef.current?.(true);
            } catch {}
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup',   onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup',   onMouseUp);
        };
    }, []);

    // ── Filter ──────────────────────────────────────────────
    const executors = Array.from(new Set([...DESIGNERS, ...tasks.map(t => t.executorName).filter(Boolean)])).sort((a, b) => a.localeCompare(b, 'vi'));
    const filtered = tasks.filter(t => {
        if (filterExecutor && t.executorName !== filterExecutor) return false;
        if (filterStatus   && t.status !== filterStatus)         return false;
        if (hideDone && DONE_STATUSES.includes(t.status))        return false;
        if (search) {
            const q = search.toLowerCase();
            if (!t.customerName?.toLowerCase().includes(q) && !t.code?.toLowerCase().includes(q) && !t.title?.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    // ── Date range ──────────────────────────────────────────
    const now = new Date();
    const allDates = filtered.flatMap(t => [new Date(effectiveStart(t)), new Date(effectiveEnd(t))]);
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

    useEffect(() => {
        if (!scrollRef.current || loading) return;
        const el = scrollRef.current;
        const todayPx = LEFT_W + todayOffset * DAY_W;
        const center  = todayPx - el.clientWidth / 2 + DAY_W / 2;
        el.scrollLeft = Math.max(0, center);
    }, [loading, todayOffset]);

    // ── Group by người thực hiện ─────────────────────────────
    const groupedRaw = {};
    filtered.forEach(t => {
        const key = t.executorName || 'Chưa phân công';
        if (!groupedRaw[key]) groupedRaw[key] = [];
        groupedRaw[key].push(t);
    });
    Object.values(groupedRaw).forEach(list => {
        list.sort((a, b) => new Date(effectiveStart(a)) - new Date(effectiveStart(b)));
    });
    const groupNames = Object.keys(groupedRaw).sort((a, b) => {
        if (a === 'Chưa phân công') return 1;
        if (b === 'Chưa phân công') return -1;
        return a.localeCompare(b, 'vi');
    });

    const getBarPx = (task) => {
        const s = new Date(effectiveStart(task));
        const e = new Date(effectiveEnd(task));
        const x = Math.max(0, daysBetween(minDate, s)) * DAY_W;
        const w = Math.max(daysBetween(s, e), 1) * DAY_W;
        return { x, w };
    };

    let svgRunY = 0;
    groupNames.forEach(name => {
        svgRunY += GROUP_H;
        if (!collapsedGroups.has(name)) {
            groupedRaw[name].forEach(() => { svgRunY += ROW_H; });
        }
    });
    const totalChartH = svgRunY;

    const totalFiltered = filtered.length;
    const overdueCount  = filtered.filter(t => !DONE_STATUSES.includes(t.status) && new Date(effectiveEnd(t)) < now).length;
    const doneCount     = filtered.filter(t => DONE_STATUSES.includes(t.status)).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Toolbar */}
            <div className="card" style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>🎨 Tiến độ Gantt CV Thiết Kế</span>

                    <input className="form-input" placeholder="Tìm khách hàng / mã / tên việc..." value={search}
                        onChange={e => setSearch(e.target.value)} style={{ fontSize: 13, maxWidth: 200 }} />
                    <select className="form-select" value={filterExecutor} onChange={e => setFilterExecutor(e.target.value)} style={{ fontSize: 13, maxWidth: 180 }}>
                        <option value="">Tất cả người thực hiện</option>
                        {executors.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
                        <option value="">Tất cả trạng thái</option>
                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {(filterExecutor || filterStatus || search) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterExecutor(''); setFilterStatus(''); setSearch(''); }}>✕ Xóa lọc</button>
                    )}

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', userSelect: 'none' }}>
                            <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
                            Ẩn Hoàn thành
                        </label>
                        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-muted)', alignItems: 'center', flexWrap: 'wrap' }}>
                            {executors.map(name => (
                                <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorForExecutor(name), display: 'inline-block' }} />
                                    <span style={{ color: 'var(--text-muted)' }}>{name}</span>
                                </span>
                            ))}
                            <span style={{ width: 1, height: 14, background: 'var(--border-light)', display: 'inline-block', margin: '0 2px' }} />
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, background: '#dc2626', display: 'inline-block', transform: 'rotate(45deg)' }} />
                                Trễ
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
                        <span style={{ color: 'var(--text-muted)' }}>Hiển thị <b style={{ color: 'var(--text-primary)' }}>{totalFiltered}</b> công việc / <b>{groupNames.length}</b> người thực hiện</span>
                        <span style={{ color: '#16a34a' }}>✓ Hoàn thành: <b>{doneCount}</b></span>
                        <span style={{ color: '#dc2626' }}>⚠ Trễ hạn: <b>{overdueCount}</b></span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                onClick={() => setCollapsedGroups(new Set(groupNames))}>
                                ▶ Thu gọn tất cả
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                onClick={() => setCollapsedGroups(new Set())}>
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
                    Không có công việc thiết kế nào. Vào <b>CV Thiết kế</b> để tạo công việc mới.
                </div>
            ) : (
                <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
                    <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                        <div style={{ minWidth: totalDays * DAY_W + LEFT_W }}>

                            {/* Sticky header */}
                            <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 20 }}>
                                <div style={{ minWidth: LEFT_W, padding: '10px 14px', fontSize: 12, fontWeight: 700, borderRight: '2px solid var(--border)', flexShrink: 0, position: 'sticky', left: 0, zIndex: 50, background: 'var(--bg-secondary, #ffffff)' }}>
                                    Người thực hiện / Khách hàng
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
                                    {headerDays.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) && (
                                        <rect key={i} x={i * DAY_W} y={0} width={DAY_W} height={totalChartH} fill="rgba(0,0,0,0.018)" />
                                    ))}
                                    <line
                                        x1={todayOffset * DAY_W + DAY_W / 2} y1={0}
                                        x2={todayOffset * DAY_W + DAY_W / 2} y2={totalChartH}
                                        stroke="rgba(37,99,235,0.3)" strokeWidth={2} />
                                </svg>

                                {/* Nhóm theo người thực hiện + dòng công việc */}
                                {groupNames.map(name => {
                                    const list = groupedRaw[name];
                                    const isCollapsed = collapsedGroups.has(name);
                                    const gDates = list.flatMap(t => [new Date(effectiveStart(t)), new Date(effectiveEnd(t))]);
                                    const gStart = new Date(Math.min(...gDates.map(d => d.getTime())));
                                    const gEnd   = new Date(Math.max(...gDates.map(d => d.getTime())));
                                    const gX = Math.max(0, daysBetween(minDate, gStart)) * DAY_W;
                                    const gW = Math.max(daysBetween(gStart, gEnd), 1) * DAY_W;
                                    const gDone = list.every(t => DONE_STATUSES.includes(t.status));
                                    const gLate = list.some(t => !DONE_STATUSES.includes(t.status) && new Date(effectiveEnd(t)) < now);
                                    const gPct  = list.length ? Math.round(list.reduce((s, t) => s + (STATUS_PROGRESS[t.status] ?? 0), 0) / list.length) : 0;
                                    const pColor = colorForExecutor(name);

                                    return (
                                        <div key={name}>
                                            {/* Group header — clickable to collapse */}
                                            <div
                                                onClick={() => toggleCollapse(name)}
                                                style={{ display: 'flex', height: GROUP_H, background: `${pColor}0d`, borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
                                            >
                                                <div style={{ minWidth: LEFT_W, padding: '0 8px', fontSize: 11, fontWeight: 700, color: pColor, borderRight: `2px solid ${pColor}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, position: 'sticky', left: 0, zIndex: 30, background: `${pColor}14`, height: GROUP_H }}>
                                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 10, flexShrink: 0 }}>{isCollapsed ? '▶' : '▼'}</span>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
                                                    <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{gPct}%</span>
                                                    {gDone && <span style={{ fontSize: 9, background: '#dcfce7', color: '#16a34a', padding: '1px 4px', borderRadius: 3, fontWeight: 700, flexShrink: 0 }}>✓ Xong</span>}
                                                    {gLate && <span style={{ fontSize: 9, background: '#fee2e2', color: '#dc2626', padding: '1px 4px', borderRadius: 3, fontWeight: 700, flexShrink: 0 }}>Trễ</span>}
                                                    <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>{list.length}</span>
                                                </div>
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    <div style={{
                                                        position: 'absolute', left: gX, top: 6, height: 12, width: gW,
                                                        borderRadius: 3,
                                                        background: `${pColor}1A`,
                                                        border: `1px solid ${pColor}55`,
                                                    }}>
                                                        <div style={{ height: '100%', width: `${gPct}%`, background: pColor, opacity: 0.35, borderRadius: 3 }} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Task rows — hidden when collapsed */}
                                            {!isCollapsed && list.map(task => {
                                                const taskForRender = dragPreview?.id === task.id
                                                    ? { ...task, startDate: dragPreview.startDate, endDate: dragPreview.endDate }
                                                    : task;
                                                const bp        = getBarPx(taskForRender);
                                                const isDone    = DONE_STATUSES.includes(task.status);
                                                const isOverdue = !isDone && new Date(effectiveEnd(taskForRender)) < now;
                                                const pct       = STATUS_PROGRESS[task.status] ?? 0;
                                                const barColor  = pColor;
                                                const barBg     = `${pColor}1A`;
                                                const deadlineX = Math.max(0, daysBetween(minDate, new Date(effectiveEnd(taskForRender)))) * DAY_W + DAY_W / 2;
                                                const daysLate  = isOverdue ? daysBetween(new Date(effectiveEnd(taskForRender)), now) : 0;
                                                const label     = task.title || task.customerName;

                                                return (
                                                    <div key={task.id} style={{
                                                        display: 'flex', height: ROW_H,
                                                        borderBottom: '1px solid var(--border-light)',
                                                        borderLeft: `3px solid ${barColor}`,
                                                        transition: 'background 0.12s',
                                                    }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                                                        {/* Left pane */}
                                                        <div style={{ minWidth: LEFT_W - 3, padding: '0 8px', borderRight: `2px solid ${barColor}55`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, position: 'sticky', left: 0, zIndex: 20, background: 'var(--bg-card, #ffffff)', height: ROW_H }}>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isOverdue ? '#dc2626' : 'var(--text-primary)', lineHeight: 1.2 }}>
                                                                    {task.customerName}
                                                                </div>
                                                                <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, marginTop: 1 }}>
                                                                    {task.title || task.code}
                                                                </div>
                                                            </div>
                                                            <span style={{ padding: '1px 5px', borderRadius: 4, background: barBg, color: barColor, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                                                {pct}%
                                                            </span>
                                                        </div>

                                                        {/* Right pane: bar */}
                                                        <div style={{ flex: 1, position: 'relative' }}>
                                                            <div
                                                                style={{
                                                                    position: 'absolute', left: bp.x, top: ACT_TOP, height: ACT_H, width: bp.w,
                                                                    borderRadius: 5, background: barBg, overflow: 'hidden',
                                                                    border: `2px solid ${barColor}`,
                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                                    cursor: dragPreview?.id === task.id ? 'grabbing' : 'grab',
                                                                    opacity: dragPreview?.id === task.id ? 0.82 : 1,
                                                                }}
                                                                title={`${label} (${task.code})\n${fmtDate(effectiveStart(taskForRender))} → ${fmtDate(effectiveEnd(taskForRender))}\nTrạng thái: ${task.status}${isOverdue ? `\n⚠️ Trễ ${daysLate} ngày` : ''}`}
                                                                onMouseDown={e => handleBarMouseDown(e, task, 'move')}
                                                            >
                                                                <div
                                                                    style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 3 }}
                                                                    onMouseDown={e => { e.stopPropagation(); handleBarMouseDown(e, task, 'resize-left'); }}
                                                                />
                                                                <div style={{
                                                                    position: 'absolute', left: 0, top: 0, bottom: 0,
                                                                    width: `${pct}%`,
                                                                    background: barColor, opacity: 0.28, borderRadius: 3,
                                                                }} />
                                                                <span style={{
                                                                    position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700,
                                                                    padding: '0 7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                    display: 'block', lineHeight: `${ACT_H - 4}px`, color: barColor,
                                                                }}>
                                                                    {label}
                                                                </span>
                                                                <div
                                                                    style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 3 }}
                                                                    onMouseDown={e => { e.stopPropagation(); handleBarMouseDown(e, task, 'resize-right'); }}
                                                                />
                                                            </div>

                                                            {/* Delay diamond */}
                                                            {isOverdue && (
                                                                <>
                                                                    <div style={{
                                                                        position: 'absolute', left: deadlineX - 5, top: ACT_TOP + 3,
                                                                        width: 10, height: 10, background: '#dc2626',
                                                                        transform: 'rotate(45deg)', zIndex: 7,
                                                                        boxShadow: '0 0 0 2px rgba(220,38,38,0.25)',
                                                                    }} title={`Trễ ${daysLate} ngày`} />
                                                                    <div style={{
                                                                        position: 'absolute', left: deadlineX + 7, top: ACT_TOP + 4,
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
