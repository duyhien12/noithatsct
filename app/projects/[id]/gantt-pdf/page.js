'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';

/* ── Constants ─────────────────────────────────────── */
const DAY_MS     = 86400000;
const ROW_H      = 28;
const HEADER_H   = 44;
const LABEL_W    = 260;
const ORANGE     = '#F47920';
const ORANGE_DK  = '#C94F12';

const STATUS_COLOR = {
    'Hoàn thành':    '#16a34a',
    'Đang thi công': '#2563eb',
    'Tạm dừng':      '#d97706',
    'Hủy':           '#dc2626',
    default:         '#64748b',
};

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function diffDays(a, b)   { return Math.round((new Date(b) - new Date(a)) / DAY_MS); }
const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : '';
const today = new Date().toLocaleDateString('vi-VN');

function flattenTasks(tasks, depth = 0) {
    const out = [];
    for (const t of tasks) {
        out.push({ ...t, _depth: depth, _isGroup: !!(t.children?.length) });
        if (t.children?.length) out.push(...flattenTasks(t.children, depth + 1));
    }
    return out;
}

/* ── Main component ─────────────────────────────────── */
export default function GanttPdfPage() {
    const { id } = useParams();
    const [project,       setProject]       = useState(null);
    const [rows,          setRows]          = useState([]);
    const [totalProgress, setTotalProgress] = useState(0);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    /* print width: measured after mount so it works on any screen */
    const [pageW, setPageW] = useState(1080);

    useEffect(() => {
        /* measure usable width (minus padding) */
        setPageW(Math.min(window.innerWidth - 32, 1200));
    }, []);

    useEffect(() => {
        Promise.all([
            fetch(`/api/projects/${id}`).then(r => r.json()),
            fetch(`/api/schedule-tasks?projectId=${id}`).then(r => r.json()),
        ]).then(([proj, sched]) => {
            setProject(proj);
            setRows(flattenTasks(sched.tasks || []));
            setTotalProgress(sched.totalProgress || 0);
            setLoading(false);
        }).catch(e => { setError(e.message); setLoading(false); });
    }, [id]);

    /* ── Date range ──────────────────────────────────── */
    const { minDate, totalDays } = useMemo(() => {
        if (!rows.length) return { minDate: new Date(), totalDays: 30 };
        let min = Infinity, max = -Infinity;
        rows.forEach(t => {
            const s = new Date(t.startDate).getTime();
            const e = new Date(t.endDate).getTime();
            if (s < min) min = s;
            if (e > max) max = e;
            if (t.baselineStart) {
                const bs = new Date(t.baselineStart).getTime();
                const be = new Date(t.baselineEnd || t.baselineStart).getTime();
                if (bs < min) min = bs;
                if (be > max) max = be;
            }
        });
        min -= DAY_MS * 2;
        max += DAY_MS * 5;
        return { minDate: new Date(min), totalDays: Math.ceil((max - min) / DAY_MS) };
    }, [rows]);

    /* ── Column width: scale to fit available width ─── */
    const colW = useMemo(() => {
        const available = pageW - LABEL_W;
        return Math.max(8, Math.floor(available / totalDays));
    }, [pageW, totalDays]);

    /* ── Date headers ────────────────────────────────── */
    const { dayHeaders, monthHeaders } = useMemo(() => {
        const days = [], months = [];
        let curMonth = '';
        for (let i = 0; i < totalDays; i++) {
            const d = addDays(minDate, i);
            const mk = `${d.getFullYear()}-${d.getMonth()}`;
            if (mk !== curMonth) {
                months.push({ label: d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }), startCol: i, span: 0 });
                curMonth = mk;
            }
            months[months.length - 1].span++;
            days.push({ d, isWeekend: [0,6].includes(d.getDay()), isToday: d.toDateString() === new Date().toDateString(), day: d.getDate() });
        }
        return { dayHeaders: days, monthHeaders: months };
    }, [minDate, totalDays]);

    const dateToX = d => diffDays(minDate, d) * colW;

    const chartW = totalDays * colW;
    const chartH = rows.length * ROW_H;
    const svgW   = LABEL_W + chartW;
    const svgH   = HEADER_H + chartH;

    if (loading) return <Loading />;
    if (error)   return <div style={{ padding: 40, color: 'red' }}>Lỗi: {error}</div>;

    /* ── Render ─────────────────────────────────────── */
    return (
        <>
            <PrintStyles />
            <div style={{ padding: '16px', background: '#fff', fontFamily: 'Arial, sans-serif' }}>

                {/* ── Header ── */}
                <div style={{ background: `linear-gradient(135deg,${ORANGE},${ORANGE_DK})`, color: '#fff', borderRadius: 8, padding: '14px 20px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {/* HomeSCT Logo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 14px' }}>
                            <KLogo />
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1 }}>
                                    Home<span style={{ color: '#ffe0b2' }}>SCT</span>
                                </div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, marginTop: 1 }}>KIẾN TRÚC ĐÔ THỊ SCT</div>
                            </div>
                        </div>
                        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.3)' }} />
                        <div>
                            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.5 }}>SƠ ĐỒ TIẾN ĐỘ THI CÔNG (GANTT)</div>
                            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>{project?.name}{project?.code ? ` — ${project.code}` : ''}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 10, opacity: 0.85, lineHeight: 1.8 }}>
                        <div>Ngày xuất: {today}</div>
                        <div>Địa chỉ: {project?.address || '—'}</div>
                        <div>Tiến độ: <b>{totalProgress}%</b> hoàn thành</div>
                    </div>
                </div>

                {/* ── Summary bar ── */}
                <SummaryBar rows={rows} totalProgress={totalProgress} project={project} />

                {/* ── Gantt SVG ── */}
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 12 }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={svgW}
                        height={svgH}
                        style={{ display: 'block', fontSize: 11, fontFamily: 'Arial, sans-serif' }}
                    >
                        {/* ── Background ── */}
                        <rect width={svgW} height={svgH} fill="#fff" />

                        {/* ── Header background ── */}
                        <rect x={0} y={0} width={svgW} height={HEADER_H} fill={ORANGE} rx={0} />

                        {/* ── Label column header ── */}
                        <text x={10} y={HEADER_H / 2 + 4} fill="#fff" fontSize={10} fontWeight="bold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>HẠNG MỤC</text>

                        {/* ── Month headers ── */}
                        {monthHeaders.map((m, i) => (
                            <g key={i}>
                                <text
                                    x={LABEL_W + m.startCol * colW + m.span * colW / 2}
                                    y={14}
                                    fill="#fff" fontSize={9} fontWeight="bold" textAnchor="middle"
                                    style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                                >{m.label}</text>
                                <line x1={LABEL_W + m.startCol * colW} y1={0} x2={LABEL_W + m.startCol * colW} y2={HEADER_H} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
                            </g>
                        ))}

                        {/* ── Day headers ── */}
                        {dayHeaders.map((d, i) => (
                            <g key={i}>
                                {d.isWeekend && <rect x={LABEL_W + i * colW} y={0} width={colW} height={svgH} fill="rgba(0,0,0,0.03)" />}
                                {d.isToday   && <rect x={LABEL_W + i * colW} y={0} width={colW} height={svgH} fill="rgba(59,130,246,0.06)" />}
                                {(colW >= 20 || d.day === 1 || d.day === 15) && (
                                    <text x={LABEL_W + i * colW + colW / 2} y={HEADER_H - 5} fill={d.isToday ? '#fff' : 'rgba(255,255,255,0.7)'} fontSize={8} textAnchor="middle" fontWeight={d.isToday ? 'bold' : 'normal'}>{d.day}</text>
                                )}
                            </g>
                        ))}

                        {/* ── Separator between label & chart ── */}
                        <line x1={LABEL_W} y1={HEADER_H} x2={LABEL_W} y2={svgH} stroke="#cbd5e1" strokeWidth={2} />

                        {/* ── Today vertical line ── */}
                        {(() => {
                            const x = LABEL_W + dateToX(new Date());
                            return x > LABEL_W && x < svgW
                                ? <line x1={x} y1={HEADER_H} x2={x} y2={svgH} stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
                                : null;
                        })()}

                        {/* ── Row grid ── */}
                        {rows.map((_, i) => (
                            <line key={i}
                                x1={0} y1={HEADER_H + (i + 1) * ROW_H}
                                x2={svgW} y2={HEADER_H + (i + 1) * ROW_H}
                                stroke="#e2e8f0" strokeWidth={0.5}
                            />
                        ))}

                        {/* ── Column grid (months) ── */}
                        {monthHeaders.map((m, i) => (
                            <line key={i}
                                x1={LABEL_W + m.startCol * colW} y1={HEADER_H}
                                x2={LABEL_W + m.startCol * colW} y2={svgH}
                                stroke="#e2e8f0" strokeWidth={1}
                            />
                        ))}

                        {/* ── Rows ── */}
                        {rows.map((row, ri) => {
                            const rowY = HEADER_H + ri * ROW_H;
                            const indent = row._depth * 12;
                            const isGroup = row._isGroup;
                            const isOverdue = row.status !== 'Hoàn thành' && row.endDate && new Date(row.endDate) < new Date();
                            const barColor = row.color || (row.progress === 100 ? '#16a34a' : isOverdue ? '#ef4444' : isGroup ? ORANGE : '#2563eb');

                            const sx = dateToX(row.startDate);
                            const ex = dateToX(row.endDate) + colW;
                            const bw = Math.max(colW, ex - sx);
                            const bh = isGroup ? 6 : ROW_H - 10;
                            const bY = isGroup ? rowY + ROW_H - 10 : rowY + 5;

                            return (
                                <g key={row.id}>
                                    {/* Row bg for group */}
                                    {isGroup && <rect x={0} y={rowY} width={svgW} height={ROW_H} fill="#fff7ed" />}

                                    {/* Label */}
                                    <text
                                        x={8 + indent}
                                        y={rowY + ROW_H / 2 + 4}
                                        fontSize={isGroup ? 10 : 9}
                                        fontWeight={isGroup ? 'bold' : 'normal'}
                                        fill={isGroup ? '#1e293b' : '#475569'}
                                        clipPath={`url(#clip-label-${ri})`}
                                    >
                                        {row.wbs && <tspan fill="#94a3b8" fontSize={8}>{row.wbs} </tspan>}
                                        {row.name}
                                    </text>
                                    <clipPath id={`clip-label-${ri}`}>
                                        <rect x={0} y={rowY} width={LABEL_W - 8} height={ROW_H} />
                                    </clipPath>

                                    {/* Progress % label */}
                                    <text x={LABEL_W - 4} y={rowY + ROW_H / 2 + 4} fontSize={8} fill="#94a3b8" textAnchor="end">{row.progress}%</text>

                                    {/* Baseline (ghost) */}
                                    {row.baselineStart && row.baselineEnd && (
                                        <rect
                                            x={LABEL_W + dateToX(row.baselineStart)}
                                            y={bY + bh - 3}
                                            width={Math.max(colW, (dateToX(row.baselineEnd) - dateToX(row.baselineStart)) + colW)}
                                            height={3}
                                            rx={1}
                                            fill="#94a3b8"
                                            opacity={0.3}
                                        />
                                    )}

                                    {/* Bar background */}
                                    <rect x={LABEL_W + sx} y={bY} width={bw} height={bh} rx={isGroup ? 0 : 3} fill={barColor} opacity={0.15} />

                                    {/* Progress fill */}
                                    {!isGroup && (
                                        <rect x={LABEL_W + sx} y={bY} width={bw * (row.progress / 100)} height={bh} rx={3} fill={barColor} opacity={0.75} />
                                    )}

                                    {/* Group diamonds & line */}
                                    {isGroup && (
                                        <>
                                            <line x1={LABEL_W + sx + 4} y1={bY + 3} x2={LABEL_W + sx + bw - 4} y2={bY + 3} stroke={barColor} strokeWidth={2} opacity={0.7} />
                                            <polygon points={`${LABEL_W + sx},${bY + 3} ${LABEL_W + sx + 4},${bY} ${LABEL_W + sx + 8},${bY + 3} ${LABEL_W + sx + 4},${bY + 6}`} fill={barColor} opacity={0.85} />
                                            <polygon points={`${LABEL_W + sx + bw - 8},${bY + 3} ${LABEL_W + sx + bw - 4},${bY} ${LABEL_W + sx + bw},${bY + 3} ${LABEL_W + sx + bw - 4},${bY + 6}`} fill={barColor} opacity={0.85} />
                                        </>
                                    )}

                                    {/* Progress % inside bar */}
                                    {!isGroup && bw > 32 && (
                                        <text x={LABEL_W + sx + 5} y={bY + bh / 2 + 3} fontSize={8} fontWeight="bold" fill="#fff">{row.progress}%</text>
                                    )}

                                    {/* Date labels on bar ends */}
                                    {bw > 50 && (
                                        <text x={LABEL_W + sx + bw + 3} y={bY + bh / 2 + 3} fontSize={7} fill="#94a3b8">{fmtShort(row.endDate)}</text>
                                    )}
                                </g>
                            );
                        })}

                        {/* ── Dependency arrows ── */}
                        {rows.filter(r => r.predecessorId).map(row => {
                            const pred = rows.find(r => r.id === row.predecessorId);
                            if (!pred) return null;
                            const pi = rows.findIndex(r => r.id === pred.id);
                            const ri = rows.findIndex(r => r.id === row.id);
                            if (pi < 0 || ri < 0) return null;
                            const x1 = LABEL_W + dateToX(pred.endDate) + colW;
                            const y1 = HEADER_H + pi * ROW_H + ROW_H / 2;
                            const x2 = LABEL_W + dateToX(row.startDate);
                            const y2 = HEADER_H + ri * ROW_H + ROW_H / 2;
                            return (
                                <g key={`dep-${row.id}`}>
                                    <path d={`M${x1},${y1} H${x1 + 8} V${y2} H${x2}`} fill="none" stroke="#94a3b8" strokeWidth={1} opacity={0.5} />
                                    <polygon points={`${x2},${y2} ${x2 - 5},${y2 - 3} ${x2 - 5},${y2 + 3}`} fill="#94a3b8" opacity={0.5} />
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* ── Legend ── */}
                <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 10, color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
                    <LegendItem color="#2563eb" label="Đang thi công" />
                    <LegendItem color="#16a34a" label="Hoàn thành" />
                    <LegendItem color="#ef4444" label="Quá hạn" />
                    <LegendItem color={ORANGE} label="Nhóm hạng mục" />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 20, height: 3, background: '#94a3b8', display: 'inline-block', opacity: 0.4 }}></span>Baseline
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 0, borderLeft: '2px dashed #2563eb', height: 12, display: 'inline-block', opacity: 0.7 }}></span>Hôm nay
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: '#94a3b8' }}>Kiến Trúc Đô Thị SCT — Xuất ngày {today}</span>
                </div>

                {/* ── Signature ── */}
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <SignBlock title="Chủ đầu tư" name={project?.customer?.name} />
                    <SignBlock title="Đại diện SCT" name={project?.manager} />
                </div>
            </div>

            {/* ── Floating buttons ── */}
            <button className="no-print" onClick={() => window.print()} style={{ ...btnStyle(ORANGE), right: 24 }}>🖨️ In / Xuất PDF</button>
            <button className="no-print" onClick={() => window.history.back()} style={{ ...btnStyle('#fff', '#1e293b', '#e2e8f0'), right: 176 }}>← Quay lại</button>
        </>
    );
}

/* ── Sub-components ────────────────────────────────── */
function Loading() {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'Arial', color: '#475569' }}>Đang tải sơ đồ Gantt...</div>;
}

function KLogo() {
    return (
        <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
            <path d="M12 8 L12 40" stroke="white" strokeWidth="7" strokeLinecap="round"/>
            <path d="M12 24 L34 8" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 24 L34 40" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20 16 L28 24" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" strokeLinecap="round"/>
            <path d="M20 32 L28 24" stroke="rgba(255,255,255,0.5)" strokeWidth="3.5" strokeLinecap="round"/>
        </svg>
    );
}

function SummaryBar({ rows, totalProgress, project }) {
    const doneCount = rows.filter(r => r.status === 'Hoàn thành').length;
    const inProg    = rows.filter(r => r.status === 'Đang thi công').length;
    const overdue   = rows.filter(r => r.status !== 'Hoàn thành' && r.endDate && new Date(r.endDate) < new Date()).length;
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, fontSize: 11 }}>
            {[
                { label: 'Tiến độ tổng', value: `${totalProgress}%`, color: ORANGE, bar: true },
                { label: 'Tổng hạng mục', value: rows.length, color: '#1e293b' },
                { label: 'Hoàn thành', value: doneCount, color: '#16a34a' },
                { label: 'Đang thi công', value: inProg, color: '#2563eb' },
                { label: 'Quá hạn', value: overdue, color: overdue > 0 ? '#dc2626' : '#16a34a' },
            ].map(k => (
                <div key={k.label} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
                    {k.bar && <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, margin: '4px 0' }}><div style={{ width: `${totalProgress}%`, height: 4, background: ORANGE, borderRadius: 2 }}></div></div>}
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: k.bar ? 0 : 4 }}>{k.label}</div>
                </div>
            ))}
        </div>
    );
}

function LegendItem({ color, label }) {
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 12, background: color, borderRadius: 2, display: 'inline-block' }}></span>
            {label}
        </span>
    );
}

function SignBlock({ title, name }) {
    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '12px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 48 }}>{title}</div>
            {name && <div style={{ fontSize: 10, color: '#475569' }}>{name}</div>}
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>(Ký và ghi rõ họ tên)</div>
        </div>
    );
}

function btnStyle(bg, color = '#fff', border = 'transparent') {
    return {
        position: 'fixed', bottom: 24, right: 24,
        background: bg, color, border: `1px solid ${border}`,
        borderRadius: 8, padding: '11px 22px', fontSize: 14, fontWeight: 700,
        cursor: 'pointer', zIndex: 999, boxShadow: bg !== '#fff' ? `0 4px 12px rgba(244,121,32,0.4)` : '0 2px 8px rgba(0,0,0,0.1)',
    };
}
// Two buttons: print (right) and back (left of print)
function PrintStyles() {
    return (
        <style>{`
            * { box-sizing: border-box; }
            body { margin: 0; background: #fff; }
            .no-print:nth-child(1) { right: 24px; }
            .no-print:nth-child(2) { right: 170px; }
            @media print {
                .no-print { display: none !important; }
                body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @page { size: A3 landscape; margin: 8mm 8mm; }
            }
        `}</style>
    );
}
