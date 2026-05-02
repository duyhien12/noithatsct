'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + ' tr';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + ' k';
    return new Intl.NumberFormat('vi-VN').format(n);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_STYLE = {
    'Chờ làm':    { color: '#d97706', bg: '#fef3c7' },
    'Đang làm':   { color: '#2563eb', bg: '#dbeafe' },
    'Hoàn thành': { color: '#16a34a', bg: '#dcfce7' },
    'Tạm dừng':   { color: '#9ca3af', bg: '#f3f4f6' },
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

function BarChart({ data }) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(500);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            setWidth(entries[0].contentRect.width || 500);
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    if (!data?.length) return null;

    const H = 110;
    const LABEL_H = 32;
    const PADDING = 16;
    const n = data.length;
    const barW = Math.max(24, Math.min(40, (width - PADDING * 2) / n - 10));
    const gap = (width - PADDING * 2 - n * barW) / (n + 1);
    const max = Math.max(...data.map(d => d.total), 1);

    return (
        <div ref={containerRef} style={{ width: '100%' }}>
            <svg width="100%" height={H + LABEL_H} viewBox={`0 0 ${width} ${H + LABEL_H}`} preserveAspectRatio="none">
                {/* Horizontal grid lines */}
                {[0.25, 0.5, 0.75, 1].map(pct => (
                    <line key={pct} x1={PADDING} x2={width - PADDING} y1={H - H * pct} y2={H - H * pct}
                        stroke="var(--border-light)" strokeWidth={1} strokeDasharray="4 4" />
                ))}

                {data.map((d, i) => {
                    const x = PADDING + gap + i * (barW + gap);
                    const totalH = max > 0 ? Math.round((d.total / max) * (H - 10)) : 0;
                    const doneH = max > 0 ? Math.round((d.done / max) * (H - 10)) : 0;
                    const dayDate = new Date(d._date);
                    const dayLabel = DAY_LABELS[dayDate.getDay()];
                    const dateLabel = dayDate.getDate();
                    const isToday = i === n - 1;

                    return (
                        <g key={i}>
                            {/* Total bar (background) */}
                            {totalH > 0 && (
                                <rect x={x} y={H - totalH} width={barW} height={totalH} rx={5}
                                    fill={isToday ? '#bfdbfe' : '#e0e7ff'} />
                            )}
                            {/* Done bar */}
                            {doneH > 0 && (
                                <rect x={x} y={H - doneH} width={barW} height={doneH} rx={5}
                                    fill={isToday ? '#2563eb' : '#6366f1'} />
                            )}
                            {/* Empty state bar */}
                            {totalH === 0 && (
                                <rect x={x} y={H - 4} width={barW} height={4} rx={2} fill="var(--border-light)" />
                            )}
                            {/* Overdue dot */}
                            {d.overdue > 0 && (
                                <circle cx={x + barW / 2} cy={H - totalH - 7} r={4} fill="#ef4444" />
                            )}
                            {/* Count label */}
                            {d.total > 0 && (
                                <text x={x + barW / 2} y={H - totalH - (d.overdue > 0 ? 14 : 4)}
                                    textAnchor="middle" fontSize={10} fontWeight={700}
                                    fill={isToday ? '#2563eb' : '#374151'}>
                                    {d.total}
                                </text>
                            )}
                            {/* Day label */}
                            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={10}
                                fontWeight={isToday ? 700 : 400}
                                fill={isToday ? '#2563eb' : '#9ca3af'}>
                                {dayLabel}
                            </text>
                            {/* Date number */}
                            <text x={x + barW / 2} y={H + 26} textAnchor="middle" fontSize={9}
                                fill={isToday ? '#2563eb' : '#d1d5db'} fontWeight={isToday ? 700 : 400}>
                                {dateLabel}
                            </text>
                        </g>
                    );
                })}

                {/* Today marker */}
                {(() => {
                    const i = n - 1;
                    const x = PADDING + gap + i * (barW + gap) + barW / 2;
                    return (
                        <line x1={x} x2={x} y1={0} y2={H}
                            stroke="#2563eb" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
                    );
                })()}
            </svg>
        </div>
    );
}

function KpiCard({ icon, label, value, sub, subColor, borderColor, onClick }) {
    return (
        <div
            className="card"
            onClick={onClick}
            style={{
                padding: '18px 20px', borderLeft: `4px solid ${borderColor}`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}
        >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: 0.3 }}>
                {icon} {label}
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: borderColor, lineHeight: 1, marginBottom: 6 }}>
                {value}
            </div>
            <div style={{ fontSize: 11, color: subColor || 'var(--text-muted)', fontWeight: subColor ? 600 : 400 }}>
                {sub}
            </div>
        </div>
    );
}

export default function WorkshopDashboard() {
    const router = useRouter();
    const { role } = useRole();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/');
            return;
        }
        fetch('/api/workshop/dashboard')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [role]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🏭</div>
                <div>Đang tải dữ liệu xưởng...</div>
            </div>
        </div>
    );
    if (!data) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
            Không thể tải dữ liệu
        </div>
    );

    const { kpi, chartData, recentTasks, projectsInProgress, lowStockProducts } = data;

    // Use dateISO from API for accurate labels
    const enrichedChart = (chartData || []).map(d => ({
        ...d,
        _date: d.dateISO ? new Date(d.dateISO) : new Date(),
    }));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 14 }}>
                <KpiCard
                    icon="👷" label="Nhân công hoạt động"
                    value={kpi.activeWorkers} borderColor="#2563eb"
                    sub={`Chấm công hôm nay: ${data.todayAttendanceCount}`}
                    onClick={() => router.push('/workshop/workers')}
                />
                <KpiCard
                    icon="🔨" label="Việc đang thực hiện"
                    value={kpi.inProgressTasks} borderColor="#f59e0b"
                    sub="Xem danh sách →"
                    onClick={() => router.push('/workshop/tasks')}
                />
                <KpiCard
                    icon={kpi.overdueTasks > 0 ? '🚨' : '✅'} label="Trễ tiến độ"
                    value={kpi.overdueTasks} borderColor={kpi.overdueTasks > 0 ? '#ef4444' : '#16a34a'}
                    sub={kpi.overdueTasks > 0 ? 'Cần xử lý gấp!' : 'Đúng tiến độ'}
                    subColor={kpi.overdueTasks > 0 ? '#ef4444' : '#16a34a'}
                />
                <KpiCard
                    icon="📦" label="Giá trị tồn kho"
                    value={fmtShort(kpi.totalInventoryValue)}
                    borderColor="#8b5cf6"
                    sub={kpi.lowStockCount > 0 ? `⚠️ ${kpi.lowStockCount} loại sắp hết` : 'Tồn kho ổn định'}
                    subColor={kpi.lowStockCount > 0 ? '#ef4444' : undefined}
                    onClick={() => router.push('/workshop/materials')}
                />
                <KpiCard
                    icon="💵" label="Chi phí nhân công hôm nay"
                    value={fmtShort(kpi.todayCost)}
                    borderColor="#10b981"
                    sub="Tính theo giờ × đơn giá"
                />
            </div>

            {/* Middle row: Chart + Projects */}
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
                {/* Chart */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Công việc 7 ngày qua</h3>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {(chartData || []).reduce((s, d) => s + d.total, 0)} việc tổng cộng · {(chartData || []).reduce((s, d) => s + d.done, 0)} hoàn thành
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#e0e7ff', display: 'inline-block', border: '1px solid #c7d2fe' }}></span>Tổng
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#6366f1', display: 'inline-block' }}></span>Hoàn thành
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>Trễ
                            </span>
                        </div>
                    </div>
                    <div style={{ padding: '8px 4px 4px' }}>
                        <BarChart data={enrichedChart} />
                    </div>
                    {(chartData || []).every(d => d.total === 0) && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: 13 }}>
                            Chưa có dữ liệu — hãy tạo công việc xưởng để xem biểu đồ
                        </div>
                    )}
                </div>

                {/* Projects */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Dự án đang thi công</h3>
                        <a href="/projects" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
                    </div>
                    {projectsInProgress.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: 'var(--text-muted)', fontSize: 13, gap: 8 }}>
                            <span style={{ fontSize: 28 }}>🏗️</span>
                            <span>Chưa có dự án đang thi công</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
                            {projectsInProgress.map(p => (
                                <a key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', transition: 'border-color 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: 600, fontSize: 13, flex: 1, paddingRight: 8 }}>{p.name}</span>
                                            <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb', flexShrink: 0 }}>{p.progress}%</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden', marginBottom: 5 }}>
                                            <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 3, background: p.progress >= 80 ? '#16a34a' : p.progress >= 40 ? '#2563eb' : '#f59e0b', transition: 'width 0.5s' }} />
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.code} · Hạn: {fmtDate(p.endDate)}</div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom row: Tasks + Low stock */}
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 16 }}>
                {/* Recent tasks */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Công việc xưởng gần đây</h3>
                        <a href="/workshop/tasks" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
                    </div>
                    {recentTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0', fontSize: 13 }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>🔨</div>
                            Chưa có công việc nào.{' '}
                            <a href="/workshop/tasks" style={{ color: 'var(--primary)' }}>Tạo công việc →</a>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tên việc</th>
                                        <th>Nhân công</th>
                                        <th style={{ minWidth: 110 }}>Tiến độ</th>
                                        <th>Hạn</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTasks.map(t => {
                                        const ss = STATUS_STYLE[t.status] || STATUS_STYLE['Chờ làm'];
                                        const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
                                        return (
                                            <tr key={t.id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => router.push('/workshop/tasks')}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: isOverdue ? '#ef4444' : 'var(--text-primary)' }}>
                                                        {t.title}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.project?.name || '—'}</div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>
                                                    {t.workers?.length > 0
                                                        ? t.workers.slice(0, 2).map(w => w.worker.name).join(', ') + (t.workers.length > 2 ? ` +${t.workers.length - 2}` : '')
                                                        : <span style={{ color: 'var(--text-muted)' }}>Chưa giao</span>}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden' }}>
                                                            <div style={{
                                                                height: '100%', borderRadius: 3,
                                                                width: `${t.progress}%`,
                                                                background: t.progress >= 100 ? '#16a34a' : t.progress >= 50 ? '#2563eb' : '#f59e0b',
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 30, textAlign: 'right' }}>{t.progress}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 12, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#ef4444' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {isOverdue && '⚠️ '}{fmtDate(t.deadline)}
                                                </td>
                                                <td>
                                                    <span style={{ padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Low stock */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {lowStockProducts.length > 0
                                ? <><span style={{ color: '#ef4444' }}>⚠️</span> Vật tư sắp hết</>
                                : <>📦 Vật tư kho</>}
                        </h3>
                        <a href="/workshop/materials" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Kho vật tư →</a>
                    </div>
                    {lowStockProducts.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 100, color: '#16a34a', fontSize: 13, gap: 6 }}>
                            <span style={{ fontSize: 28 }}>✅</span>
                            <span style={{ fontWeight: 600 }}>Tồn kho đầy đủ</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                            {lowStockProducts.map(p => {
                                const pct = p.minStock > 0 ? Math.min(p.stock / p.minStock, 1) : 1;
                                return (
                                    <div key={p.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tối thiểu: {p.minStock} {p.unit}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: p.stock === 0 ? '#6b7280' : '#ef4444', lineHeight: 1 }}>{p.stock}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.unit}</div>
                                            </div>
                                        </div>
                                        <div style={{ height: 4, borderRadius: 2, background: 'var(--border-light)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct * 100}%`, background: pct < 0.3 ? '#ef4444' : '#f59e0b', borderRadius: 2 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
