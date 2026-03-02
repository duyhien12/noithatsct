'use client';
import { useState, useRef, useMemo, useCallback, useEffect } from 'react';

/**
 * Custom SVG-based Gantt Chart for HomeERP.
 * Features: drag & drop bars, baseline overlay, FS dependency arrows, zoom levels.
 */

const DAY_MS = 86400000;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 50;
const LABEL_WIDTH = 280;
const MIN_COL_WIDTH = 28;

const STATUS_COLORS = {
    'Chưa bắt đầu': '#64748b',
    'Đang thi công': '#3b82f6',
    'Hoàn thành': '#22c55e',
    'Quá hạn': '#ef4444',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function diffDays(a, b) {
    return Math.round((new Date(b) - new Date(a)) / DAY_MS);
}

export default function ScheduleGanttView({ tasks, flat, onUpdate }) {
    const containerRef = useRef(null);
    const [zoom, setZoom] = useState('week'); // day | week | month
    const [dragging, setDragging] = useState(null);
    const [scrollLeft, setScrollLeft] = useState(0);

    const COL_WIDTH = zoom === 'day' ? 36 : zoom === 'week' ? 28 : 10;

    // Flatten tasks for rendering rows
    const rows = useMemo(() => {
        const result = [];
        const flatten = (items, depth = 0) => {
            items.forEach(t => {
                result.push({ ...t, depth });
                if (t.children?.length) flatten(t.children, depth + 1);
            });
        };
        flatten(tasks);
        return result;
    }, [tasks]);

    // Date range
    const { minDate, maxDate, totalDays } = useMemo(() => {
        if (!flat.length) return { minDate: new Date(), maxDate: new Date(), totalDays: 30 };
        let min = Infinity, max = -Infinity;
        flat.forEach(t => {
            const s = new Date(t.startDate).getTime();
            const e = new Date(t.endDate).getTime();
            if (t.baselineStart) {
                const bs = new Date(t.baselineStart).getTime();
                const be = new Date(t.baselineEnd).getTime();
                if (bs < min) min = bs;
                if (be > max) max = be;
            }
            if (s < min) min = s;
            if (e > max) max = e;
        });
        // Add padding
        min -= DAY_MS * 3;
        max += DAY_MS * 7;
        return {
            minDate: new Date(min),
            maxDate: new Date(max),
            totalDays: Math.ceil((max - min) / DAY_MS),
        };
    }, [flat]);

    // Generate date headers
    const dateHeaders = useMemo(() => {
        const headers = [];
        const months = [];
        let currentMonth = '';
        for (let i = 0; i < totalDays; i++) {
            const d = addDays(minDate, i);
            const day = d.getDay(); // 0=Sun
            const isWeekend = day === 0 || day === 6;
            const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
            if (monthKey !== currentMonth) {
                months.push({
                    label: d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }),
                    startIdx: i,
                    colSpan: 0,
                });
                currentMonth = monthKey;
            }
            months[months.length - 1].colSpan++;
            headers.push({ date: d, isWeekend, isToday: d.toDateString() === new Date().toDateString(), dayOfMonth: d.getDate() });
        }
        return { days: headers, months };
    }, [minDate, totalDays]);

    // Convert date to X position
    const dateToX = useCallback((date) => {
        return diffDays(minDate, date) * COL_WIDTH;
    }, [minDate, COL_WIDTH]);

    // Drag handlers
    const handleMouseDown = useCallback((e, taskId, type) => {
        e.preventDefault();
        e.stopPropagation();
        const task = flat.find(t => t.id === taskId);
        if (!task) return;
        setDragging({
            taskId, type,
            startX: e.clientX,
            origStart: new Date(task.startDate),
            origEnd: new Date(task.endDate),
        });
    }, [flat]);

    const handleMouseMove = useCallback((e) => {
        if (!dragging) return;
        const dx = e.clientX - dragging.startX;
        const daysDelta = Math.round(dx / COL_WIDTH);
        if (daysDelta === 0) return;

        const task = flat.find(t => t.id === dragging.taskId);
        if (!task) return;

        let newStart, newEnd;
        if (dragging.type === 'move') {
            newStart = addDays(dragging.origStart, daysDelta);
            newEnd = addDays(dragging.origEnd, daysDelta);
        } else if (dragging.type === 'resize-end') {
            newStart = dragging.origStart;
            newEnd = addDays(dragging.origEnd, daysDelta);
            if (newEnd <= newStart) newEnd = addDays(newStart, 1);
        }

        // Visual feedback only — actual update on mouseUp
        setDragging(prev => ({ ...prev, previewStart: newStart, previewEnd: newEnd }));
    }, [dragging, COL_WIDTH, flat]);

    const handleMouseUp = useCallback(() => {
        if (!dragging || (!dragging.previewStart && !dragging.previewEnd)) {
            setDragging(null);
            return;
        }
        const start = dragging.previewStart || dragging.origStart;
        const end = dragging.previewEnd || dragging.origEnd;
        onUpdate(dragging.taskId, {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            duration: Math.max(1, diffDays(start, end)),
        });
        setDragging(null);
    }, [dragging, onUpdate]);

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragging, handleMouseMove, handleMouseUp]);

    // Scroll to today on mount
    useEffect(() => {
        const todayX = dateToX(new Date());
        if (containerRef.current) {
            containerRef.current.scrollLeft = Math.max(0, todayX - 200);
        }
    }, [dateToX]);

    const chartWidth = totalDays * COL_WIDTH;
    const chartHeight = rows.length * ROW_HEIGHT;

    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            {/* Zoom controls */}
            <div style={{ display: 'flex', gap: 4, padding: '8px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-elevated)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 8, lineHeight: '28px' }}>Zoom:</span>
                {[{ key: 'day', label: 'Ngày' }, { key: 'week', label: 'Tuần' }, { key: 'month', label: 'Tháng' }].map(z => (
                    <button key={z.key} className={`btn ${zoom === z.key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                        style={{ padding: '4px 12px', fontSize: 11 }}
                        onClick={() => setZoom(z.key)}>{z.label}</button>
                ))}
            </div>

            <div style={{ display: 'flex', position: 'relative' }}>
                {/* Left: Task labels (fixed) */}
                <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: '2px solid var(--border-color)', background: 'var(--bg-card)', zIndex: 2 }}>
                    {/* Header spacer */}
                    <div style={{ height: HEADER_HEIGHT, borderBottom: '1px solid var(--border-light)', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hạng mục</div>
                    {rows.map((row) => {
                        const isGroup = row.children && row.children.length > 0;
                        return (
                            <div key={row.id} style={{
                                height: ROW_HEIGHT,
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: `0 12px 0 ${12 + row.depth * 16}px`,
                                borderBottom: '1px solid var(--border-light)',
                                fontSize: 12,
                                fontWeight: isGroup ? 700 : 400,
                                color: 'var(--text-primary)',
                                background: isGroup ? 'var(--bg-elevated)' : 'transparent',
                            }}>
                                {row.color && <span style={{ width: 3, height: 16, borderRadius: 2, background: row.color, flexShrink: 0 }}></span>}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {row.wbs && <span style={{ color: 'var(--text-muted)', marginRight: 4, fontSize: 10 }}>{row.wbs}</span>}
                                    {row.name}
                                </span>
                                <span style={{ marginLeft: 'auto', fontSize: 10, color: row.progress === 100 ? 'var(--status-success)' : 'var(--text-muted)', flexShrink: 0 }}>{row.progress}%</span>
                            </div>
                        );
                    })}
                </div>

                {/* Right: Gantt chart (scrollable) */}
                <div ref={containerRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}
                    onScroll={e => setScrollLeft(e.target.scrollLeft)}>
                    {/* Date headers */}
                    <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>
                        {/* Month row */}
                        <div style={{ display: 'flex', height: 22, borderBottom: '1px solid var(--border-light)' }}>
                            {dateHeaders.months.map((m, i) => (
                                <div key={i} style={{
                                    width: m.colSpan * COL_WIDTH, flexShrink: 0,
                                    fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    borderRight: '1px solid var(--border-light)',
                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                }}>{m.label}</div>
                            ))}
                        </div>
                        {/* Day row */}
                        <div style={{ display: 'flex', height: HEADER_HEIGHT - 22, borderBottom: '1px solid var(--border-color)' }}>
                            {dateHeaders.days.map((d, i) => (
                                <div key={i} style={{
                                    width: COL_WIDTH, flexShrink: 0,
                                    fontSize: 9, color: d.isToday ? 'var(--accent-primary)' : d.isWeekend ? 'var(--text-muted)' : 'var(--text-secondary)',
                                    fontWeight: d.isToday ? 800 : 400,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: d.isToday ? 'rgba(59,130,246,0.08)' : d.isWeekend ? 'rgba(0,0,0,0.03)' : 'transparent',
                                }}>{zoom !== 'month' ? d.dayOfMonth : (d.dayOfMonth === 1 || d.dayOfMonth === 15 ? d.dayOfMonth : '')}</div>
                            ))}
                        </div>
                    </div>

                    {/* Chart area */}
                    <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
                        {/* Grid lines */}
                        {dateHeaders.days.map((d, i) => (
                            <g key={i}>
                                {d.isWeekend && <rect x={i * COL_WIDTH} y={0} width={COL_WIDTH} height={chartHeight} fill="rgba(0,0,0,0.02)" />}
                                {d.isToday && <rect x={i * COL_WIDTH} y={0} width={COL_WIDTH} height={chartHeight} fill="rgba(59,130,246,0.06)" />}
                            </g>
                        ))}
                        {/* Today line */}
                        {(() => {
                            const x = dateToX(new Date());
                            return x > 0 && x < chartWidth ? <line x1={x} y1={0} x2={x} y2={chartHeight} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" opacity={0.6} /> : null;
                        })()}
                        {/* Row separators */}
                        {rows.map((_, i) => (
                            <line key={i} x1={0} y1={(i + 1) * ROW_HEIGHT} x2={chartWidth} y2={(i + 1) * ROW_HEIGHT} stroke="var(--border-light)" strokeWidth={0.5} />
                        ))}

                        {/* Dependency arrows (FS) */}
                        {rows.filter(r => r.predecessorId).map(row => {
                            const pred = flat.find(t => t.id === row.predecessorId);
                            if (!pred) return null;
                            const predRowIdx = rows.findIndex(r => r.id === pred.id);
                            const rowIdx = rows.findIndex(r => r.id === row.id);
                            if (predRowIdx < 0 || rowIdx < 0) return null;

                            const x1 = dateToX(pred.endDate) + COL_WIDTH;
                            const y1 = predRowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                            const x2 = dateToX(row.startDate);
                            const y2 = rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
                            const midX = x1 + 8;

                            return (
                                <g key={`dep-${row.id}`}>
                                    <path d={`M${x1},${y1} H${midX} V${y2} H${x2}`}
                                        fill="none" stroke="var(--text-muted)" strokeWidth={1.5} opacity={0.4} />
                                    {/* Arrow head */}
                                    <polygon points={`${x2},${y2} ${x2 - 5},${y2 - 3} ${x2 - 5},${y2 + 3}`}
                                        fill="var(--text-muted)" opacity={0.4} />
                                </g>
                            );
                        })}

                        {/* Task bars */}
                        {rows.map((row, rowIdx) => {
                            const isGroup = row.children && row.children.length > 0;
                            const isDragging = dragging?.taskId === row.id;
                            const start = isDragging && dragging.previewStart ? dragging.previewStart : new Date(row.startDate);
                            const end = isDragging && dragging.previewEnd ? dragging.previewEnd : new Date(row.endDate);
                            const x = dateToX(start);
                            const w = Math.max(COL_WIDTH, diffDays(start, end) * COL_WIDTH + COL_WIDTH);
                            const y = rowIdx * ROW_HEIGHT + 8;
                            const h = isGroup ? 8 : ROW_HEIGHT - 16;
                            const barY = isGroup ? rowIdx * ROW_HEIGHT + ROW_HEIGHT - 12 : y;

                            const isOverdue = row.status !== 'Hoàn thành' && new Date(row.endDate) < new Date();
                            const barColor = row.color || (row.progress === 100 ? '#22c55e' : isOverdue ? '#ef4444' : '#3b82f6');

                            return (
                                <g key={row.id}>
                                    {/* Baseline bar (ghost) */}
                                    {row.baselineStart && row.baselineEnd && (
                                        <rect
                                            x={dateToX(row.baselineStart)}
                                            y={barY + (isGroup ? 0 : h - 4)}
                                            width={Math.max(COL_WIDTH, diffDays(row.baselineStart, row.baselineEnd) * COL_WIDTH + COL_WIDTH)}
                                            height={4}
                                            rx={2}
                                            fill="var(--text-muted)"
                                            opacity={0.2}
                                        />
                                    )}

                                    {/* Background bar */}
                                    <rect x={x} y={barY} width={w} height={h} rx={isGroup ? 0 : 4}
                                        fill={barColor} opacity={0.15}
                                        style={{ cursor: isGroup ? 'default' : 'grab' }}
                                        onMouseDown={!isGroup ? (e) => handleMouseDown(e, row.id, 'move') : undefined}
                                    />

                                    {/* Progress fill */}
                                    {!isGroup && (
                                        <rect x={x} y={barY} width={w * row.progress / 100} height={h} rx={4}
                                            fill={barColor} opacity={0.7} style={{ pointerEvents: 'none' }}
                                        />
                                    )}

                                    {/* Group diamond markers */}
                                    {isGroup && (
                                        <>
                                            <polygon points={`${x},${barY + 4} ${x + 4},${barY} ${x + 8},${barY + 4} ${x + 4},${barY + 8}`} fill={barColor} opacity={0.8} />
                                            <polygon points={`${x + w - 8},${barY + 4} ${x + w - 4},${barY} ${x + w},${barY + 4} ${x + w - 4},${barY + 8}`} fill={barColor} opacity={0.8} />
                                            <line x1={x + 4} y1={barY + 4} x2={x + w - 4} y2={barY + 4} stroke={barColor} strokeWidth={2} opacity={0.6} />
                                        </>
                                    )}

                                    {/* Progress text */}
                                    {!isGroup && w > 40 && (
                                        <text x={x + 6} y={barY + h / 2 + 4} fontSize={10} fontWeight={600} fill="#fff" style={{ pointerEvents: 'none' }}>
                                            {row.progress}%
                                        </text>
                                    )}

                                    {/* Resize handle (right edge) */}
                                    {!isGroup && (
                                        <rect x={x + w - 6} y={barY} width={6} height={h} rx={2}
                                            fill="transparent" style={{ cursor: 'ew-resize' }}
                                            onMouseDown={(e) => handleMouseDown(e, row.id, 'resize-end')}
                                        />
                                    )}

                                    {/* Drag indicator */}
                                    {isDragging && (
                                        <rect x={x - 1} y={barY - 1} width={w + 2} height={h + 2} rx={5}
                                            fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="3 2" />
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid var(--border-light)', fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#3b82f6', marginRight: 4, verticalAlign: 'middle' }}></span>Đang thi công</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#22c55e', marginRight: 4, verticalAlign: 'middle' }}></span>Hoàn thành</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#ef4444', marginRight: 4, verticalAlign: 'middle' }}></span>Quá hạn</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 3, background: 'var(--text-muted)', marginRight: 4, verticalAlign: 'middle', opacity: 0.3 }}></span>Baseline</span>
                <span style={{ borderLeft: '2px dashed #3b82f6', paddingLeft: 6 }}>Hôm nay</span>
                <span>→ Liên kết FS</span>
            </div>
        </div>
    );
}
