'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { GanttChart, Search } from 'lucide-react';

const DAY_MS = 86400000;
const ROW_HEIGHT = 34;
const COL_WIDTH = 26;

const STAGE_STYLE = {
    intake:     { color: '#4f46e5', bg: '#ede9fe' },
    material:   { color: '#0891b2', bg: '#cffafe' },
    production: { color: '#b45309', bg: '#fef3c7' },
    install:    { color: '#1d4ed8', bg: '#dbeafe' },
    complete:   { color: '#15803d', bg: '#dcfce7' },
};

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function diffDays(a, b) { return Math.round((new Date(b).setHours(0,0,0,0) - new Date(a).setHours(0,0,0,0)) / DAY_MS); }
function isOverdue(step) {
    if (step.completed || !step.deadline) return false;
    return new Date(step.deadline) < new Date(new Date().toDateString());
}

export default function SalesProductionGanttPage() {
    const router = useRouter();
    const { role } = useRole();
    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [plan, setPlan] = useState(null);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingPlan, setLoadingPlan] = useState(false);

    useEffect(() => {
        if (role && !['kinh_doanh', 'ban_gd', 'giam_doc', 'pho_gd', 'xuong'].includes(role)) {
            router.replace('/'); return;
        }
    }, [role, router]);

    useEffect(() => {
        fetch('/api/projects?limit=200&type=Thi công nội thất')
            .then(r => r.json())
            .then(d => { setProjects(Array.isArray(d?.data) ? d.data : []); setLoadingProjects(false); });
    }, []);

    const fetchPlan = useCallback((projectId) => {
        if (!projectId) return;
        setLoadingPlan(true);
        fetch(`/api/production-plan/${projectId}`)
            .then(r => r.json())
            .then(d => { setPlan(d); setLoadingPlan(false); });
    }, []);

    useEffect(() => { if (selectedId) fetchPlan(selectedId); }, [selectedId, fetchPlan]);

    const filteredProjects = useMemo(() => {
        if (!search.trim()) return projects;
        const q = search.trim().toLowerCase();
        return projects.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }, [projects, search]);

    const selectedProject = projects.find(p => p.id === selectedId);

    // ── Build Gantt date range + rows ──
    const { minDate, totalDays, rows } = useMemo(() => {
        if (!plan?.stages) return { minDate: new Date(), totalDays: 30, rows: [] };
        const dates = [];
        plan.stages.forEach(s => s.steps.forEach(st => {
            if (st.startDate) dates.push(new Date(st.startDate));
            if (st.deadline) dates.push(new Date(st.deadline));
        }));
        let min, max;
        if (dates.length === 0) {
            min = new Date(); max = addDays(new Date(), 30);
        } else {
            min = new Date(Math.min(...dates.map(d => d.getTime())));
            max = new Date(Math.max(...dates.map(d => d.getTime())));
        }
        min = addDays(min, -2);
        max = addDays(max, 4);
        const total = Math.max(14, diffDays(min, max));

        const built = [];
        plan.stages.forEach(stage => {
            const st = STAGE_STYLE[stage.key] || STAGE_STYLE.intake;
            const done = stage.steps.filter(s => s.completed).length;
            built.push({ type: 'group', id: stage.id, name: stage.name, style: st, done, total: stage.steps.length });
            stage.steps.forEach(step => {
                built.push({ type: 'step', id: step.id, name: step.name, style: st, step });
            });
        });
        return { minDate: min, totalDays: total, rows: built };
    }, [plan]);

    const dateHeaders = useMemo(() => {
        const headers = [];
        const months = [];
        let currentMonth = '';
        for (let i = 0; i < totalDays; i++) {
            const d = addDays(minDate, i);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
            if (monthKey !== currentMonth) {
                months.push({ label: d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }), colSpan: 0 });
                currentMonth = monthKey;
            }
            months[months.length - 1].colSpan++;
            headers.push({ isWeekend, isToday: d.toDateString() === new Date().toDateString(), dayOfMonth: d.getDate() });
        }
        return { days: headers, months };
    }, [minDate, totalDays]);

    const dateToX = useCallback((date) => diffDays(minDate, date) * COL_WIDTH, [minDate]);
    const chartWidth = totalDays * COL_WIDTH;
    const chartHeight = rows.length * ROW_HEIGHT;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <GanttChart size={20} color="#2563eb" />
                    <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Tiến độ sản xuất (Gantt)</h1>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 14px' }}>
                    Theo dõi kế hoạch BC sản xuất theo từng dự án để báo tiến độ cho khách hàng.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                        <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm dự án theo mã hoặc tên..."
                            className="form-input"
                            style={{ width: '100%', padding: '8px 10px 8px 32px', fontSize: 13 }}
                        />
                    </div>
                    <select
                        className="form-select"
                        value={selectedId}
                        onChange={e => setSelectedId(e.target.value)}
                        style={{ minWidth: 280, padding: '8px 12px', fontSize: 13 }}
                    >
                        <option value="">{loadingProjects ? 'Đang tải dự án...' : '— Chọn dự án —'}</option>
                        {filteredProjects.map(p => (
                            <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {!selectedId ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <GanttChart size={40} style={{ opacity: 0.3, marginBottom: 10 }} />
                    <p style={{ fontSize: 14 }}>Chọn một dự án để xem tiến độ sản xuất dạng Gantt.</p>
                </div>
            ) : loadingPlan ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải kế hoạch...</div>
            ) : !plan?.stages ? (
                <div className="card" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>Không tải được kế hoạch sản xuất.</div>
            ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{selectedProject?.code} — {selectedProject?.name}</div>
                        {plan.orderId ? (
                            <button
                                onClick={() => router.push(`/production/${plan.orderId}/plan`)}
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: 12, padding: '6px 12px' }}
                            >
                                Điền / Sửa kế hoạch →
                            </button>
                        ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Dự án chưa có đơn sản xuất — tạo ở trang Quản lý sản xuất (xưởng) trước khi điền kế hoạch.
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', position: 'relative' }}>
                        {/* Label column */}
                        <div style={{ width: 240, flexShrink: 0, borderRight: '2px solid var(--border-color)', background: 'var(--bg-card)' }}>
                            <div style={{ height: 50, borderBottom: '1px solid var(--border-light)', padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Giai đoạn / Bước
                            </div>
                            {rows.map(row => row.type === 'group' ? (
                                <div key={row.id} style={{
                                    height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
                                    borderBottom: '1px solid var(--border-light)', background: row.style.bg, fontWeight: 700, fontSize: 12, color: row.style.color,
                                }}>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                                    <span style={{ fontSize: 11, flexShrink: 0 }}>{row.done}/{row.total}</span>
                                </div>
                            ) : (
                                <div key={row.id} style={{
                                    height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px 0 22px',
                                    borderBottom: '1px solid var(--border-light)', fontSize: 12,
                                    color: row.step.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                    textDecoration: row.step.completed ? 'line-through' : 'none',
                                }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                                </div>
                            ))}
                        </div>

                        {/* Gantt chart */}
                        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}>
                            <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>
                                <div style={{ display: 'flex', height: 22, borderBottom: '1px solid var(--border-light)' }}>
                                    {dateHeaders.months.map((m, i) => (
                                        <div key={i} style={{
                                            width: m.colSpan * COL_WIDTH, flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid var(--border-light)',
                                            textTransform: 'uppercase', letterSpacing: 0.5,
                                        }}>{m.label}</div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', height: 28, borderBottom: '1px solid var(--border-color)' }}>
                                    {dateHeaders.days.map((d, i) => (
                                        <div key={i} style={{
                                            width: COL_WIDTH, flexShrink: 0, fontSize: 9,
                                            color: d.isToday ? 'var(--accent-primary)' : d.isWeekend ? 'var(--text-muted)' : 'var(--text-secondary)',
                                            fontWeight: d.isToday ? 800 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: d.isToday ? 'rgba(59,130,246,0.08)' : d.isWeekend ? 'rgba(0,0,0,0.03)' : 'transparent',
                                        }}>{d.dayOfMonth}</div>
                                    ))}
                                </div>
                            </div>

                            <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
                                {dateHeaders.days.map((d, i) => (
                                    <g key={i}>
                                        {d.isWeekend && <rect x={i * COL_WIDTH} y={0} width={COL_WIDTH} height={chartHeight} fill="rgba(0,0,0,0.02)" />}
                                        {d.isToday && <rect x={i * COL_WIDTH} y={0} width={COL_WIDTH} height={chartHeight} fill="rgba(59,130,246,0.06)" />}
                                    </g>
                                ))}
                                {(() => {
                                    const x = dateToX(new Date());
                                    return x > 0 && x < chartWidth ? <line x1={x} y1={0} x2={x} y2={chartHeight} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" opacity={0.6} /> : null;
                                })()}
                                {rows.map((_, i) => (
                                    <line key={i} x1={0} y1={(i + 1) * ROW_HEIGHT} x2={chartWidth} y2={(i + 1) * ROW_HEIGHT} stroke="var(--border-light)" strokeWidth={0.5} />
                                ))}

                                {rows.map((row, i) => {
                                    if (row.type === 'group') {
                                        const groupSteps = plan.stages.find(s => s.id === row.id)?.steps || [];
                                        const dated = groupSteps.filter(s => s.startDate || s.deadline);
                                        if (dated.length === 0) return null;
                                        const starts = dated.map(s => new Date(s.startDate || s.deadline));
                                        const ends = dated.map(s => new Date(s.deadline || s.startDate));
                                        const gs = new Date(Math.min(...starts.map(d => d.getTime())));
                                        const ge = new Date(Math.max(...ends.map(d => d.getTime())));
                                        const x = dateToX(gs);
                                        const w = Math.max(COL_WIDTH, diffDays(gs, ge) * COL_WIDTH + COL_WIDTH);
                                        const y = i * ROW_HEIGHT + ROW_HEIGHT - 10;
                                        return (
                                            <g key={row.id}>
                                                <polygon points={`${x},${y + 4} ${x + 4},${y} ${x + 8},${y + 4} ${x + 4},${y + 8}`} fill={row.style.color} />
                                                <polygon points={`${x + w - 8},${y + 4} ${x + w - 4},${y} ${x + w},${y + 4} ${x + w - 4},${y + 8}`} fill={row.style.color} />
                                                <line x1={x + 4} y1={y + 4} x2={x + w - 4} y2={y + 4} stroke={row.style.color} strokeWidth={2} />
                                            </g>
                                        );
                                    }

                                    const step = row.step;
                                    const hasStart = !!step.startDate;
                                    const hasEnd = !!step.deadline;
                                    if (!hasStart && !hasEnd) return null;
                                    const start = new Date(step.startDate || step.deadline);
                                    const end = new Date(step.deadline || step.startDate);
                                    const x = dateToX(start);
                                    const w = Math.max(COL_WIDTH, diffDays(start, end) * COL_WIDTH + COL_WIDTH);
                                    const y = i * ROW_HEIGHT + 7;
                                    const h = ROW_HEIGHT - 14;
                                    const overdue = isOverdue(step);
                                    const barColor = step.completed ? '#16a34a' : overdue ? '#dc2626' : row.style.color;

                                    return (
                                        <g key={row.id}>
                                            <rect x={x} y={y} width={w} height={h} rx={4} fill={barColor} opacity={step.completed ? 1 : 0.75} />
                                            {w > 50 && (
                                                <text x={x + 6} y={y + h / 2 + 4} fontSize={10} fontWeight={600} fill="#fff">
                                                    {step.completed ? '✓ Hoàn thành' : overdue ? 'Quá hạn' : `${diffDays(start, end) + 1}D`}
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid var(--border-light)', fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#3b82f6', marginRight: 4, verticalAlign: 'middle' }}></span>Đang thực hiện</span>
                        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#16a34a', marginRight: 4, verticalAlign: 'middle' }}></span>Hoàn thành</span>
                        <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#dc2626', marginRight: 4, verticalAlign: 'middle' }}></span>Quá hạn</span>
                        <span style={{ borderLeft: '2px dashed #3b82f6', paddingLeft: 6 }}>Hôm nay</span>
                    </div>
                </div>
            )}
        </div>
    );
}
