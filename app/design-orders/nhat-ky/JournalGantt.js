'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { colorForExecutor } from '@/lib/designTaskStatus';

// Biểu đồ tiến độ cho Nhật ký TKKT — cùng kiểu với Gantt CV Thiết kế nhưng nhật ký không có
// %, nên thanh chỉ thể hiện khoảng Từ ngày → Đến ngày (tính cả ngày cuối). Trang cha chỉ
// truyền vào các việc "Đang làm".

const ROW_H   = 34;
const GROUP_H = 28;
const LEFT_W  = 260;
const DAY_W   = 32;
const ACT_TOP = 8;
const ACT_H   = 18;
const NO_EXECUTOR = 'Chưa chọn người';

const DAY_MS = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
const addDays = (date, days) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const effectiveStart = (r) => r.startDate || r.endDate || r.createdAt;
const effectiveEnd = (r) => r.endDate || r.startDate || r.createdAt;

export default function JournalGantt({ rows, onChangeDates }) {
    const [collapsedGroups, setCollapsedGroups] = useState(new Set());
    const [dragPreview, setDragPreview] = useState(null);
    const scrollRef = useRef(null);
    const dragRef = useRef(null);
    const dragPreviewRef = useRef(null);
    const onChangeRef = useRef(onChangeDates);
    useEffect(() => { onChangeRef.current = onChangeDates; }, [onChangeDates]);

    const toggleCollapse = (name) => setCollapsedGroups(prev => {
        const next = new Set(prev);
        next.has(name) ? next.delete(name) : next.add(name);
        return next;
    });

    // ── Kéo thả: di chuyển cả thanh hoặc kéo 2 mép để đổi Từ ngày / Đến ngày ──
    const handleBarMouseDown = useCallback((e, row, type) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        dragRef.current = {
            id: row.id,
            type,
            startX: e.clientX,
            origStart: startOfDay(effectiveStart(row)),
            origEnd: startOfDay(effectiveEnd(row)),
        };
        document.body.style.cursor = type === 'move' ? 'grabbing' : 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!dragRef.current) return;
            const { type, startX, origStart, origEnd, id } = dragRef.current;
            const delta = Math.round((e.clientX - startX) / DAY_W);
            let s = origStart;
            let ed = origEnd;
            if (type === 'move') {
                s = addDays(s, delta);
                ed = addDays(ed, delta);
            } else if (type === 'resize-left') {
                s = new Date(Math.min(addDays(s, delta).getTime(), ed.getTime()));
            } else {
                ed = new Date(Math.max(addDays(ed, delta).getTime(), s.getTime()));
            }
            const changed = s.getTime() !== origStart.getTime() || ed.getTime() !== origEnd.getTime();
            const preview = changed ? { id, startDate: s.toISOString(), endDate: ed.toISOString() } : null;
            dragPreviewRef.current = preview;
            setDragPreview(preview);
        };

        const onMouseUp = () => {
            if (!dragRef.current) return;
            dragRef.current = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            const preview = dragPreviewRef.current;
            dragPreviewRef.current = null;
            setDragPreview(null);
            if (preview) onChangeRef.current(preview.id, preview.startDate, preview.endDate);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    // ── Khoảng ngày hiển thị ──
    const now = new Date();
    const allDates = rows.flatMap(r => [startOfDay(effectiveStart(r)), startOfDay(effectiveEnd(r))]);
    const minDate = allDates.length
        ? new Date(Math.min(...allDates.map(d => d.getTime()), startOfDay(now).getTime()))
        : new Date(now.getFullYear(), now.getMonth(), 1);
    const maxDate = allDates.length
        ? new Date(Math.max(...allDates.map(d => d.getTime()), startOfDay(now).getTime()))
        : new Date(now.getFullYear(), now.getMonth() + 1, 0);
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);
    const totalDays = Math.max(daysBetween(minDate, maxDate) + 1, 14);
    const todayOffset = daysBetween(minDate, now);
    const headerDays = Array.from({ length: totalDays }, (_, i) => addDays(minDate, i));

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollLeft = Math.max(0, LEFT_W + todayOffset * DAY_W - el.clientWidth / 2);
    }, [todayOffset]);

    // ── Nhóm theo người thực hiện ──
    const grouped = {};
    rows.forEach(r => {
        const key = r.executorName || NO_EXECUTOR;
        (grouped[key] ||= []).push(r);
    });
    Object.values(grouped).forEach(list => list.sort((a, b) => new Date(effectiveStart(a)) - new Date(effectiveStart(b))));
    const groupNames = Object.keys(grouped).sort((a, b) => {
        if (a === NO_EXECUTOR) return 1;
        if (b === NO_EXECUTOR) return -1;
        return a.localeCompare(b, 'vi');
    });

    const barPx = (s, e) => ({
        x: daysBetween(minDate, s) * DAY_W,
        w: (daysBetween(s, e) + 1) * DAY_W,
    });

    const totalChartH = groupNames.reduce((h, name) => h + GROUP_H + (collapsedGroups.has(name) ? 0 : grouped[name].length * ROW_H), 0);

    if (rows.length === 0) {
        return <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Không có việc nào đang làm. Việc Hoàn thành / Huỷ xem ở dạng Bảng.</div>;
    }

    return (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '8px 14px', borderBottom: '1px solid var(--border-light)', fontSize: 11, color: 'var(--text-muted)' }}>
                {groupNames.map(name => (
                    <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorForExecutor(name === NO_EXECUTOR ? '' : name) }} />
                        {name}
                    </span>
                ))}
                <span>· Kéo thanh để dời ngày, kéo 2 mép để đổi Từ ngày / Đến ngày</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setCollapsedGroups(new Set(groupNames))}>▶ Thu gọn tất cả</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setCollapsedGroups(new Set())}>▼ Mở tất cả</button>
                </span>
            </div>

            <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
                <div style={{ minWidth: totalDays * DAY_W + LEFT_W }}>

                    {/* Header ngày */}
                    <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 20 }}>
                        <div style={{ minWidth: LEFT_W, padding: '10px 14px', fontSize: 12, fontWeight: 700, borderRight: '2px solid var(--border)', flexShrink: 0, position: 'sticky', left: 0, zIndex: 50, background: 'var(--bg-secondary)' }}>
                            Người thực hiện / Công trình
                        </div>
                        <div style={{ display: 'flex' }}>
                            {headerDays.map((d, i) => {
                                const isToday = i === todayOffset;
                                const isFirstOfMonth = d.getDate() === 1;
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                return (
                                    <div key={i} style={{
                                        width: DAY_W, minWidth: DAY_W, textAlign: 'center', padding: '3px 0',
                                        fontSize: 10, fontWeight: isToday ? 800 : 400,
                                        color: isToday ? 'var(--color-primary)' : isWeekend ? 'var(--color-warning)' : 'var(--text-muted)',
                                        background: isToday ? 'rgba(37,99,235,0.10)' : 'transparent',
                                        borderLeft: isFirstOfMonth || d.getDay() === 1 ? '1px dashed var(--border-light)' : 'none',
                                    }}>
                                        <div style={{ fontSize: 9 }}>{isFirstOfMonth || i === 0 ? `T${d.getMonth() + 1}` : ''}</div>
                                        <div>{d.getDate()}</div>
                                        {isToday && <div style={{ fontSize: 8, fontWeight: 800 }}>HN</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        {/* Nền cuối tuần + vạch hôm nay */}
                        <svg style={{ position: 'absolute', top: 0, left: LEFT_W, width: totalDays * DAY_W, height: Math.max(totalChartH, 1), pointerEvents: 'none', zIndex: 6 }}>
                            {headerDays.map((d, i) => (d.getDay() === 0 || d.getDay() === 6) && (
                                <rect key={i} x={i * DAY_W} y={0} width={DAY_W} height={totalChartH} fill="rgba(0,0,0,0.018)" />
                            ))}
                            <line x1={todayOffset * DAY_W + DAY_W / 2} y1={0} x2={todayOffset * DAY_W + DAY_W / 2} y2={totalChartH}
                                stroke="rgba(37,99,235,0.3)" strokeWidth={2} />
                        </svg>

                        {groupNames.map(name => {
                            const list = grouped[name];
                            const isCollapsed = collapsedGroups.has(name);
                            const color = colorForExecutor(name === NO_EXECUTOR ? '' : name);
                            const totalDaysWorked = list.reduce((s, r) => s + daysBetween(effectiveStart(r), effectiveEnd(r)) + 1, 0);

                            return (
                                <div key={name}>
                                    <div onClick={() => toggleCollapse(name)}
                                        style={{ display: 'flex', height: GROUP_H, background: `${color}0d`, borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}>
                                        <div style={{ minWidth: LEFT_W, padding: '0 8px', fontSize: 11, fontWeight: 700, color, borderRight: `2px solid ${color}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, position: 'sticky', left: 0, zIndex: 30, background: `${color}14`, height: GROUP_H }}>
                                            <span style={{ fontSize: 9, color: 'var(--text-muted)', width: 10, flexShrink: 0 }}>{isCollapsed ? '▶' : '▼'}</span>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{name}</span>
                                            <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>{list.length} việc · {totalDaysWorked} ngày</span>
                                        </div>
                                        <div style={{ flex: 1 }} />
                                    </div>

                                    {!isCollapsed && list.map(row => {
                                        const preview = dragPreview?.id === row.id ? dragPreview : null;
                                        const s = startOfDay(preview ? preview.startDate : effectiveStart(row));
                                        const e = startOfDay(preview ? preview.endDate : effectiveEnd(row));
                                        const bp = barPx(s, e);
                                        const days = daysBetween(s, e) + 1;
                                        const tip = `${row.projectName || '(Chưa có công trình)'}\n${row.content}\n${fmtDate(s)} → ${fmtDate(e)} (${days} ngày)${row.duration ? `\nThời gian: ${row.duration}` : ''}`;

                                        return (
                                            <div key={row.id}
                                                style={{ display: 'flex', height: ROW_H, borderBottom: '1px solid var(--border-light)', borderLeft: `3px solid ${color}` }}
                                                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                                                <div style={{ minWidth: LEFT_W - 3, padding: '0 8px', borderRight: `2px solid ${color}55`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, position: 'sticky', left: 0, zIndex: 20, background: 'var(--bg-card)', height: ROW_H }}>
                                                    <div style={{ flex: 1, minWidth: 0 }} title={tip}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                                                            {row.projectName || '(Chưa có công trình)'}
                                                        </div>
                                                        <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2, marginTop: 1 }}>
                                                            {row.content}
                                                        </div>
                                                    </div>
                                                    <span style={{ padding: '1px 5px', borderRadius: 4, background: `${color}1A`, color, fontSize: 9, fontWeight: 700, flexShrink: 0 }}>
                                                        {row.duration || `${days} ngày`}
                                                    </span>                                                </div>

                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    <div title={tip} onMouseDown={ev => handleBarMouseDown(ev, row, 'move')}
                                                        style={{
                                                            position: 'absolute', left: bp.x, top: ACT_TOP, height: ACT_H, width: bp.w,
                                                            borderRadius: 5, background: `${color}26`, border: `2px solid ${color}`, overflow: 'hidden',
                                                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', cursor: preview ? 'grabbing' : 'grab', opacity: preview ? 0.82 : 1,
                                                        }}>
                                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 3 }}
                                                            onMouseDown={ev => { ev.stopPropagation(); handleBarMouseDown(ev, row, 'resize-left'); }} />
                                                        <span style={{ display: 'block', fontSize: 10, fontWeight: 700, padding: '0 7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: `${ACT_H - 4}px`, color }}>
                                                            {row.content}
                                                        </span>
                                                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, cursor: 'col-resize', zIndex: 3 }}
                                                            onMouseDown={ev => { ev.stopPropagation(); handleBarMouseDown(ev, row, 'resize-right'); }} />
                                                    </div>
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
    );
}
