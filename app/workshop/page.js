'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + ' tr';
    if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k';
    return new Intl.NumberFormat('vi-VN').format(n);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_STYLE = {
    'Chờ làm':    { color: '#d97706', bg: '#fef3c7' },
    'Đang làm':   { color: '#2563eb', bg: '#dbeafe' },
    'Hoàn thành': { color: '#16a34a', bg: '#dcfce7' },
    'Tạm dừng':   { color: '#9ca3af', bg: '#f3f4f6' },
};

const STAGES    = ['Cut', 'CNC', 'Edge', 'Paint', 'Assembly', 'QC'];
const STAGE_VI  = { Cut: 'Cắt', CNC: 'CNC', Edge: 'Dán cạnh', Paint: 'Sơn/PU', Assembly: 'Lắp ráp', QC: 'QC' };
const STAGE_STYLE = {
    Cut:      { color: '#4f46e5', bg: '#ede9fe' },
    CNC:      { color: '#0891b2', bg: '#cffafe' },
    Edge:     { color: '#b45309', bg: '#fef3c7' },
    Paint:    { color: '#7c3aed', bg: '#f3e8ff' },
    Assembly: { color: '#1d4ed8', bg: '#dbeafe' },
    QC:       { color: '#15803d', bg: '#dcfce7' },
};

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const MACHINE_STATUS_STYLE = {
    'Đang dùng':  { color: '#16a34a', bg: '#dcfce7', label: 'Hoạt động' },
    'Bảo trì':    { color: '#d97706', bg: '#fef3c7', label: 'Bảo trì' },
    'Hỏng':       { color: '#dc2626', bg: '#fee2e2', label: 'Hỏng' },
    'Đã thanh lý':{ color: '#9ca3af', bg: '#f3f4f6', label: 'Thanh lý' },
};

function LiveClock() {
    const [time, setTime] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return <span>{time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>;
}

function BarChart({ data }) {
    const containerRef = useRef(null);
    const [width, setWidth] = useState(500);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(e => setWidth(e[0].contentRect.width || 500));
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    if (!data?.length) return null;
    const H = 110, LABEL_H = 32, PADDING = 16, n = data.length;
    const barW = Math.max(24, Math.min(40, (width - PADDING * 2) / n - 10));
    const gap  = (width - PADDING * 2 - n * barW) / (n + 1);
    const max  = Math.max(...data.map(d => d.total), 1);

    return (
        <div ref={containerRef} style={{ width: '100%' }}>
            <svg width="100%" height={H + LABEL_H} viewBox={`0 0 ${width} ${H + LABEL_H}`} preserveAspectRatio="none">
                {[0.25, 0.5, 0.75, 1].map(pct => (
                    <line key={pct} x1={PADDING} x2={width - PADDING} y1={H - H * pct} y2={H - H * pct}
                        stroke="var(--border-light)" strokeWidth={1} strokeDasharray="4 4" />
                ))}
                {data.map((d, i) => {
                    const x = PADDING + gap + i * (barW + gap);
                    const totalH = max > 0 ? Math.round((d.total / max) * (H - 10)) : 0;
                    const doneH  = max > 0 ? Math.round((d.done  / max) * (H - 10)) : 0;
                    const dayDate = new Date(d._date);
                    const isToday = i === n - 1;
                    return (
                        <g key={i}>
                            {totalH > 0 && <rect x={x} y={H - totalH} width={barW} height={totalH} rx={5} fill={isToday ? '#bfdbfe' : '#e0e7ff'} />}
                            {doneH  > 0 && <rect x={x} y={H - doneH}  width={barW} height={doneH}  rx={5} fill={isToday ? '#2563eb' : '#6366f1'} />}
                            {totalH === 0 && <rect x={x} y={H - 4} width={barW} height={4} rx={2} fill="var(--border-light)" />}
                            {d.overdue > 0 && <circle cx={x + barW / 2} cy={H - totalH - 7} r={4} fill="#ef4444" />}
                            {d.total > 0 && (
                                <text x={x + barW / 2} y={H - totalH - (d.overdue > 0 ? 14 : 4)}
                                    textAnchor="middle" fontSize={10} fontWeight={700}
                                    fill={isToday ? '#2563eb' : '#374151'}>{d.total}</text>
                            )}
                            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={10}
                                fontWeight={isToday ? 700 : 400} fill={isToday ? '#2563eb' : '#9ca3af'}>
                                {DAY_LABELS[dayDate.getDay()]}
                            </text>
                            <text x={x + barW / 2} y={H + 26} textAnchor="middle" fontSize={9}
                                fill={isToday ? '#2563eb' : '#d1d5db'} fontWeight={isToday ? 700 : 400}>
                                {dayDate.getDate()}
                            </text>
                        </g>
                    );
                })}
                {(() => {
                    const i = n - 1;
                    const x = PADDING + gap + i * (barW + gap) + barW / 2;
                    return <line x1={x} x2={x} y1={0} y2={H} stroke="#2563eb" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />;
                })()}
            </svg>
        </div>
    );
}

function KpiCard({ icon, label, value, sub, subColor, borderColor, onClick, badge }) {
    return (
        <div className="card" onClick={onClick}
            style={{ padding: '16px 18px', borderLeft: `4px solid ${borderColor}`, cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s, box-shadow 0.15s', position: 'relative' }}
            onMouseEnter={e => onClick && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => onClick && (e.currentTarget.style.transform = 'translateY(0)')}>
            {badge > 0 && (
                <div style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', color: '#fff', borderRadius: 20, fontSize: 10, fontWeight: 800, padding: '1px 7px', minWidth: 20, textAlign: 'center' }}>{badge}</div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>{icon} {label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: borderColor, lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: subColor || 'var(--text-muted)', fontWeight: subColor ? 600 : 400 }}>{sub}</div>
        </div>
    );
}

export default function WorkshopDashboard() {
    const router = useRouter();
    const { role } = useRole();
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [secsLeft, setSecsLeft] = useState(30);
    const intervalRef = useRef(null);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await fetch('/api/workshop/dashboard');
            const d = await res.json();
            setData(d);
            setLastRefresh(new Date());
        } catch {}
        if (!silent) setLoading(false);
    }, []);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/');
            return;
        }
        fetchData();
        intervalRef.current = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(intervalRef.current);
    }, [role, fetchData]);

    useEffect(() => {
        if (!lastRefresh) return;
        const id = setInterval(() => {
            const elapsed = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
            setSecsLeft(Math.max(0, 30 - elapsed));
        }, 1000);
        return () => clearInterval(id);
    }, [lastRefresh]);

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

    const { kpi = {}, chartData, recentTasks, projectsInProgress, lowStockProducts, plSummary,
            stagePipeline = [], idleWorkers = [], inventoryForecast = [], equipmentAlerts = [],
            deliveryRisks = [], machineStatus = [], overdueWorkOrders = [] } = data;

    if (!kpi || data.error) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
            Không thể tải dữ liệu dashboard. {data.error || ''}
        </div>
    );

    const enrichedChart = (chartData || []).map(d => ({ ...d, _date: new Date(d.dateISO || d._date) }));

    // Risk alerts
    const riskAlerts = [
        kpi.overdueTasks > 0       && { type: 'danger',  icon: '🚨', msg: `${kpi.overdueTasks} việc trễ hạn`,         href: '/workshop/tasks' },
        kpi.blockedTasksCount > 0  && { type: 'danger',  icon: '🔴', msg: `${kpi.blockedTasksCount} việc tắc nghẽn`,   href: '/workshop/tasks' },
        kpi.idleWorkersCount > 0   && { type: 'warning', icon: '⚠️', msg: `${kpi.idleWorkersCount} thợ không có việc`, href: '/workshop/workers' },
        kpi.lowStockCount > 0      && { type: 'warning', icon: '📦', msg: `${kpi.lowStockCount} vật tư sắp hết`,       href: '/workshop/materials' },
        equipmentAlerts.filter(e => e.status !== 'Đang dùng').length > 0 && {
            type: 'warning', icon: '🔧',
            msg: `${equipmentAlerts.filter(e => e.status !== 'Đang dùng').length} thiết bị cần kiểm tra`,
            href: '/workshop/assets',
        },
        inventoryForecast.filter(m => !m.sufficient).length > 0 && {
            type: 'danger', icon: '⛔',
            msg: `${inventoryForecast.filter(m => !m.sufficient).length} vật tư thiếu hụt cho tasks`,
            href: '/workshop/materials',
        },
        deliveryRisks.length > 0 && {
            type: 'danger', icon: '🕐',
            msg: `${deliveryRisks.length} dự án rủi ro giao hàng`,
            href: '/projects',
        },
        plSummary?.profitCritical && {
            type: 'danger', icon: '📉',
            msg: `Lợi nhuận âm tháng này (${plSummary.netMarginPct?.toFixed(1)}%)`,
            href: '/workshop/pl',
        },
        plSummary?.profitAlert && !plSummary?.profitCritical && {
            type: 'warning', icon: '📊',
            msg: `Biên lợi nhuận thấp: ${plSummary.netMarginPct?.toFixed(1)}%`,
            href: '/workshop/pl',
        },
    ].filter(Boolean);

    // Bottleneck = stage with highest active task count
    const bottleneckStage = stagePipeline.reduce((mx, s) => s.count > mx.count ? s : mx, { count: -1, stage: '' });
    const criticalStage   = stagePipeline.reduce((mx, s) => s.blocked > mx.blocked ? s : mx, { blocked: -1, stage: '' });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Command Center Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', borderRadius: 12, background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>🏭</span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.5 }}>Factory Command Center</div>
                        <div style={{ fontSize: 11, color: '#a5b4fc', marginTop: 1 }}>Xưởng sản xuất nội thất SCT</div>
                    </div>
                </div>
                <div style={{ display: 'flex', align: 'center', gap: 20 }}>
                    {machineStatus.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {machineStatus.map(m => {
                                const st = MACHINE_STATUS_STYLE[m.status] || { color: '#9ca3af', bg: '#f3f4f6', label: m.status };
                                return (
                                    <div key={m.status} onClick={() => router.push('/workshop/assets')}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: `${st.color}25`, border: `1px solid ${st.color}60`, cursor: 'pointer' }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                                        <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{m.count}</span>
                                        <span style={{ fontSize: 10, color: '#c7d2fe' }}>{st.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', color: '#e0e7ff' }}>
                            <LiveClock />
                        </div>
                        <div style={{ fontSize: 10, color: '#a5b4fc', marginTop: 1 }}>
                            Làm mới sau {secsLeft}s
                        </div>
                    </div>
                </div>
            </div>

            {/* Risk Banner */}
            {riskAlerts.length > 0 && (
                <div style={{ padding: '10px 16px', borderRadius: 12, background: riskAlerts.some(a => a.type === 'danger') ? '#fef2f2' : '#fffbeb', border: `1px solid ${riskAlerts.some(a => a.type === 'danger') ? '#fca5a5' : '#fcd34d'}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 12, color: riskAlerts.some(a => a.type === 'danger') ? '#dc2626' : '#d97706', flexShrink: 0 }}>
                        CẢNH BÁO RỦI RO
                    </span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                        {riskAlerts.map((a, i) => (
                            <span key={i} onClick={() => router.push(a.href)}
                                style={{ padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    background: a.type === 'danger' ? '#fee2e2' : '#fef3c7',
                                    color: a.type === 'danger' ? '#dc2626' : '#b45309',
                                    border: `1px solid ${a.type === 'danger' ? '#fca5a5' : '#fde68a'}` }}>
                                {a.icon} {a.msg}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <KpiCard icon="👷" label="Nhân công" value={kpi.activeWorkers} borderColor="#2563eb"
                    sub={`Chấm công: ${data.todayAttendanceCount} · Rảnh: ${kpi.idleWorkersCount}`}
                    subColor={kpi.idleWorkersCount > 0 ? '#d97706' : undefined}
                    onClick={() => router.push('/workshop/workers')} />
                <KpiCard icon="🔨" label="Đang thực hiện" value={kpi.inProgressTasks} borderColor="#f59e0b"
                    sub="Xem danh sách →" onClick={() => router.push('/workshop/tasks')} />
                <KpiCard icon={kpi.overdueTasks > 0 ? '🚨' : '✅'} label="Trễ tiến độ"
                    value={kpi.overdueTasks}
                    borderColor={kpi.overdueTasks > 0 ? '#ef4444' : '#16a34a'}
                    sub={kpi.overdueTasks > 0 ? 'Cần xử lý gấp!' : 'Đúng tiến độ'}
                    subColor={kpi.overdueTasks > 0 ? '#ef4444' : '#16a34a'}
                    onClick={() => router.push('/workshop/tasks')} />
                <KpiCard icon="🔴" label="Bị tắc nghẽn" value={kpi.blockedTasksCount}
                    borderColor={kpi.blockedTasksCount > 0 ? '#dc2626' : '#16a34a'}
                    sub={kpi.blockedTasksCount > 0 ? 'Việc tạm dừng' : 'Không tắc nghẽn'}
                    subColor={kpi.blockedTasksCount > 0 ? '#dc2626' : '#16a34a'}
                    onClick={() => router.push('/workshop/tasks')} />
                <KpiCard icon="📦" label="Giá trị kho" value={fmtShort(kpi.totalInventoryValue)}
                    borderColor="#8b5cf6"
                    sub={kpi.lowStockCount > 0 ? `⚠️ ${kpi.lowStockCount} loại sắp hết` : 'Tồn kho ổn định'}
                    subColor={kpi.lowStockCount > 0 ? '#ef4444' : undefined}
                    onClick={() => router.push('/workshop/materials')} />
                <KpiCard icon="💵" label="Chi phí nhân công/hôm nay" value={fmtShort(kpi.todayCost)}
                    borderColor="#10b981" sub="Tính theo giờ × đơn giá" />
            </div>

            {/* Overdue Work Orders Panel */}
            {overdueWorkOrders.length > 0 && (
                <div className="card" style={{ padding: '14px 20px', borderLeft: '4px solid #dc2626' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#dc2626' }}>🚨 Phiếu công việc quá hạn ({overdueWorkOrders.length})</h3>
                        <a href="/work-orders?status=Quá hạn" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Xem tất cả →</a>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {overdueWorkOrders.map(wo => {
                            const daysOverdue = Math.floor((Date.now() - new Date(wo.dueDate).getTime()) / 86400000);
                            const prioColor = wo.priority === 'Cao' ? '#dc2626' : wo.priority === 'Trung bình' ? '#d97706' : '#6b7280';
                            return (
                                <div key={wo.id} onClick={() => router.push(`/work-orders?wo=${wo.id}`)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fca5a5', cursor: 'pointer' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            [{wo.code}] {wo.title}
                                        </div>
                                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                                            {wo.project?.name || 'Không có dự án'} · Người giao: {wo.assignee || '—'}
                                        </div>
                                    </div>
                                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626' }}>Trễ {daysOverdue}n</div>
                                        <div style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: `${prioColor}18`, color: prioColor, fontWeight: 700 }}>{wo.priority}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Delivery Risk Panel */}
            {deliveryRisks.length > 0 && (
                <div className="card" style={{ padding: '14px 20px', borderLeft: '4px solid #dc2626' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#dc2626' }}>🕐 Rủi ro giao hàng — Dự án cần chú ý</h3>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Dự án có endDate trong 14 ngày tới và tiến độ &lt; 80%</div>
                        </div>
                        <a href="/projects" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Xem dự án →</a>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                        {deliveryRisks.map(p => {
                            const now2 = new Date();
                            const daysLeft = Math.ceil((new Date(p.endDate) - now2) / 86400000);
                            const isOverdue = daysLeft < 0;
                            const isUrgent  = daysLeft <= 3 && !isOverdue;
                            const badgeColor = isOverdue ? '#dc2626' : isUrgent ? '#d97706' : '#2563eb';
                            const bgColor    = isOverdue ? '#fef2f2' : isUrgent ? '#fffbeb' : '#eff6ff';
                            const borderColor = isOverdue ? '#fca5a5' : isUrgent ? '#fde68a' : '#bfdbfe';
                            return (
                                <a key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                                    <div style={{ padding: '10px 14px', borderRadius: 10, background: bgColor, border: `1px solid ${borderColor}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                            <span style={{ fontWeight: 600, fontSize: 12, color: '#1f2937', flex: 1, paddingRight: 8 }}>{p.name}</span>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: badgeColor, flexShrink: 0, background: `${badgeColor}18`, padding: '1px 7px', borderRadius: 10 }}>
                                                {isOverdue ? `Trễ ${Math.abs(daysLeft)}n` : `${daysLeft} ngày`}
                                            </span>
                                        </div>
                                        <div style={{ height: 5, borderRadius: 2, background: '#e5e7eb', overflow: 'hidden', marginBottom: 5 }}>
                                            <div style={{ height: '100%', width: `${p.progress}%`, background: p.progress >= 60 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                                            <span>{p.code} · {fmtDate(p.endDate)}</span>
                                            <span style={{ fontWeight: 700, color: badgeColor }}>{p.progress}%</span>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stage Pipeline */}
            <div className="card" style={{ padding: '14px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>🏭 Pipeline sản xuất theo công đoạn</h3>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                        {criticalStage.blocked > 0 && (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>🔴 Tắc tại: {STAGE_VI[criticalStage.stage]}</span>
                        )}
                        {bottleneckStage.count > 0 && (
                            <span style={{ color: '#d97706', fontWeight: 700 }}>⚡ Nút thắt: {STAGE_VI[bottleneckStage.stage]} ({bottleneckStage.count} việc)</span>
                        )}
                        <a href="/workshop/tasks" style={{ color: 'var(--primary)', fontWeight: 600 }}>Quản lý →</a>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
                    {stagePipeline.map((s, i) => {
                        const st = STAGE_STYLE[s.stage] || { color: '#374151', bg: '#f3f4f6' };
                        const isBottleneck = s.stage === bottleneckStage.stage && s.count > 0;
                        const isCritical   = s.stage === criticalStage.stage && s.blocked > 0;
                        return (
                            <div key={s.stage} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div onClick={() => router.push(`/workshop/tasks?stage=${s.stage}`)} style={{
                                    minWidth: 90, padding: '10px 14px', borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                                    background: isCritical ? '#fee2e2' : isBottleneck ? '#fef3c7' : st.bg,
                                    border: `2px solid ${isCritical ? '#dc2626' : isBottleneck ? '#d97706' : st.color}`,
                                    transition: 'transform 0.1s',
                                    boxShadow: isCritical ? '0 0 0 3px rgba(220,38,38,0.15)' : isBottleneck ? '0 0 0 3px rgba(217,119,6,0.15)' : 'none',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: isCritical ? '#dc2626' : isBottleneck ? '#d97706' : st.color, marginBottom: 4 }}>
                                        {STAGE_VI[s.stage]}
                                    </div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: isCritical ? '#dc2626' : isBottleneck ? '#d97706' : st.color, lineHeight: 1 }}>
                                        {s.count}
                                    </div>
                                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
                                        {s.count === 0 ? 'Trống' : 'việc'}
                                        {s.blocked > 0 && <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 4 }}>🔴{s.blocked}</span>}
                                    </div>
                                    {s.oldestTaskDays > 3 && s.count > 0 && (
                                        <div style={{ fontSize: 9, color: s.oldestTaskDays > 7 ? '#dc2626' : '#d97706', fontWeight: 700, marginTop: 2 }}>
                                            ⏱{s.oldestTaskDays}n
                                        </div>
                                    )}
                                </div>
                                {i < stagePipeline.length - 1 && (
                                    <svg width={18} height={18} viewBox="0 0 18 18" style={{ flexShrink: 0, opacity: 0.4 }}>
                                        <path d="M4 9h10M10 5l4 4-4 4" stroke="#64748b" strokeWidth={2} fill="none" strokeLinecap="round" />
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                    {stagePipeline.every(s => s.count === 0) && (
                        <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>
                            Không có việc đang thực hiện
                        </div>
                    )}
                </div>
            </div>

            {/* P&L tháng hiện tại */}
            {plSummary && (
                <div className="card" style={{ padding: '14px 20px', borderLeft: plSummary.profitCritical ? '4px solid #dc2626' : plSummary.profitAlert ? '4px solid #d97706' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                                {plSummary.profitCritical ? '📉' : plSummary.profitAlert ? '⚠️' : '📊'} P&L Xưởng — {(() => { const [y, m] = plSummary.period.split('-'); return `Tháng ${m}/${y}`; })()}
                            </h3>
                            {plSummary.entryCount === 0 && (
                                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>Chưa có bút toán — vào P&L để nhập</div>
                            )}
                            {plSummary.profitCritical && (
                                <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginTop: 2 }}>Lợi nhuận âm! Cần kiểm tra chi phí ngay</div>
                            )}
                            {plSummary.profitAlert && !plSummary.profitCritical && (
                                <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 2 }}>Biên lợi nhuận thấp ({plSummary.netMarginPct?.toFixed(1)}%) — mục tiêu &gt;15%</div>
                            )}
                        </div>
                        <a href="/workshop/pl" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Chi tiết P&L →</a>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                        {[
                            { label: 'Doanh thu',         value: plSummary.revenue,       color: '#2563eb' },
                            { label: 'Chi phí TT',        value: plSummary.directCosts,   color: '#ea580c' },
                            { label: 'Lợi nhuận gộp',     value: plSummary.grossProfit,   color: plSummary.grossProfit  >= 0 ? '#16a34a' : '#dc2626',
                              margin: `Biên: ${plSummary.revenue > 0 ? ((plSummary.grossProfit / plSummary.revenue) * 100).toFixed(1) : '0.0'}%` },
                            { label: 'Chi phí GT',        value: plSummary.indirectCosts, color: '#7c3aed' },
                            { label: 'Lợi nhuận dòng',   value: plSummary.netProfit,     color: plSummary.netProfit    >= 0 ? '#0f766e' : '#dc2626',
                              margin: `Biên: ${plSummary.revenue > 0 ? ((plSummary.netProfit / plSummary.revenue) * 100).toFixed(1) : '0.0'}%` },
                        ].map((item, i) => (
                            <div key={i} style={{ background: `${item.color}12`, border: `1px solid ${item.color}30`, borderRadius: 10, padding: '10px 14px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 5 }}>{item.label}</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: item.color }}>{fmtShort(Math.abs(item.value))}{item.value < 0 ? ' (âm)' : ''}</div>
                                {item.margin && <div style={{ fontSize: 10, color: item.color, marginTop: 2, opacity: 0.8 }}>{item.margin}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Middle row: Chart + Projects */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
                {/* Chart */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Công việc 7 ngày qua</h3>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {(chartData || []).reduce((s, d) => s + d.total, 0)} việc · {(chartData || []).reduce((s, d) => s + d.done, 0)} hoàn thành
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#e0e7ff', border: '1px solid #c7d2fe', display: 'inline-block' }} />Tổng
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#6366f1', display: 'inline-block' }} />Hoàn thành
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />Trễ
                            </span>
                        </div>
                    </div>
                    <div style={{ padding: '8px 4px 4px' }}>
                        <BarChart data={enrichedChart} />
                    </div>
                    {(chartData || []).every(d => d.total === 0) && (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px 0', fontSize: 13 }}>
                            Chưa có dữ liệu — hãy tạo công việc xưởng
                        </div>
                    )}
                </div>

                {/* Projects with profitability */}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                            {projectsInProgress.map(p => {
                                const contractVal = p.contractValue || 0;
                                const spent = p.spent || 0;
                                const budgetPct = contractVal > 0 ? Math.min(100, Math.round((spent / contractVal) * 100)) : null;
                                const isOverBudget = budgetPct !== null && budgetPct > 90;
                                return (
                                    <a key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-secondary)', border: `1px solid ${isOverBudget ? '#fca5a5' : 'var(--border-light)'}`, transition: 'border-color 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = isOverBudget ? '#fca5a5' : 'var(--border-light)'}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                                                <span style={{ fontWeight: 600, fontSize: 12, flex: 1, paddingRight: 6 }}>{p.name}</span>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: '#2563eb', flexShrink: 0 }}>{p.progress}%</span>
                                            </div>
                                            <div style={{ height: 5, borderRadius: 2, background: 'var(--border-light)', overflow: 'hidden', marginBottom: 5 }}>
                                                <div style={{ height: '100%', width: `${p.progress}%`, borderRadius: 2, background: p.progress >= 80 ? '#16a34a' : p.progress >= 40 ? '#2563eb' : '#f59e0b' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                                                <span>{p.code} · {fmtDate(p.endDate)}</span>
                                                {budgetPct !== null && (
                                                    <span style={{ fontWeight: 700, color: isOverBudget ? '#dc2626' : '#6b7280' }}>
                                                        Chi: {budgetPct}% HĐ{isOverBudget ? ' ⚠️' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom row: Tasks + Alerts Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 16 }}>
                {/* Recent tasks */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Công việc xưởng gần đây</h3>
                        <a href="/workshop/tasks" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
                    </div>
                    {recentTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px 0', fontSize: 13 }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>🔨</div>
                            Chưa có công việc.{' '}
                            <a href="/workshop/tasks" style={{ color: 'var(--primary)' }}>Tạo công việc →</a>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Tên việc / Công đoạn</th>
                                        <th>Nhân công</th>
                                        <th style={{ minWidth: 100 }}>Tiến độ</th>
                                        <th>Hạn</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTasks.map(t => {
                                        const ss = STATUS_STYLE[t.status] || STATUS_STYLE['Chờ làm'];
                                        const stageSt = STAGE_STYLE[t.stage] || {};
                                        const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'Hoàn thành';
                                        const isBlocked = t.status === 'Tạm dừng' && t.blockedReason;
                                        return (
                                            <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => router.push('/workshop/tasks')}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: isOverdue ? '#ef4444' : 'var(--text-primary)' }}>
                                                        {isBlocked && '🔴 '}{t.title}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                                                        {t.stage && (
                                                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: stageSt.bg, color: stageSt.color, fontWeight: 700 }}>
                                                                {STAGE_VI[t.stage] || t.stage}
                                                            </span>
                                                        )}
                                                        {t.project && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.project.name}</span>}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>
                                                    {t.workers?.length > 0
                                                        ? t.workers.slice(0, 2).map(w => w.worker.name).join(', ') + (t.workers.length > 2 ? ` +${t.workers.length - 2}` : '')
                                                        : <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 11 }}>Chưa giao</span>}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ flex: 1, height: 5, borderRadius: 2, background: 'var(--border-light)', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', borderRadius: 2, width: `${t.progress}%`, background: t.progress >= 100 ? '#16a34a' : t.progress >= 50 ? '#2563eb' : '#f59e0b' }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 28, textAlign: 'right' }}>{t.progress}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 12, fontWeight: isOverdue ? 700 : 400, color: isOverdue ? '#ef4444' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {isOverdue && '⚠️ '}{fmtDate(t.deadline)}
                                                </td>
                                                <td>
                                                    <span style={{ padding: '3px 8px', borderRadius: 20, background: ss.bg, color: ss.color, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
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

                {/* Right: Alerts Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Idle Workers */}
                    {idleWorkers.length > 0 && (
                        <div className="card" style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#d97706', marginBottom: 8 }}>
                                ⚠️ Thợ chưa có việc ({idleWorkers.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {idleWorkers.map(w => (
                                    <span key={w.id} onClick={() => router.push(`/workshop/workers?idle=1`)}
                                        style={{ padding: '3px 10px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #fde68a' }}>
                                        {w.name}
                                    </span>
                                ))}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>Click để giao việc</div>
                        </div>
                    )}

                    {/* Low Stock */}
                    <div className="card" style={{ flex: 1, overflow: 'hidden' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                {lowStockProducts.length > 0 ? <><span style={{ color: '#ef4444' }}>⚠️</span> Vật tư sắp hết</> : <>📦 Vật tư kho</>}
                            </h3>
                            <a href="/workshop/materials" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Kho →</a>
                        </div>
                        {lowStockProducts.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 80, color: '#16a34a', fontSize: 13, gap: 6 }}>
                                <span style={{ fontSize: 24 }}>✅</span>
                                <span style={{ fontWeight: 600 }}>Tồn kho đầy đủ</span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                {lowStockProducts.map(p => {
                                    const pct = p.minStock > 0 ? Math.min(p.stock / p.minStock, 1) : 1;
                                    return (
                                        <div key={p.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tối thiểu: {p.minStock} {p.unit}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: 18, fontWeight: 800, color: p.stock === 0 ? '#6b7280' : '#ef4444', lineHeight: 1 }}>{p.stock}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{p.unit}</div>
                                                </div>
                                            </div>
                                            <div style={{ height: 3, borderRadius: 2, background: 'var(--border-light)', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct * 100}%`, background: pct < 0.3 ? '#ef4444' : '#f59e0b', borderRadius: 2 }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Machine Status + Equipment Alerts */}
                    <div className="card" style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>🔧 Trạng thái máy móc</div>
                            <a href="/workshop/assets" style={{ fontSize: 11, color: 'var(--primary)' }}>Quản lý →</a>
                        </div>
                        {machineStatus.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                                {machineStatus.map(m => {
                                    const st = MACHINE_STATUS_STYLE[m.status] || { color: '#6b7280', bg: '#f9fafb', label: m.status };
                                    return (
                                        <div key={m.status} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: st.bg, border: `1px solid ${st.color}40` }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, display: 'inline-block' }} />
                                            <span style={{ fontSize: 12, fontWeight: 800, color: st.color }}>{m.count}</span>
                                            <span style={{ fontSize: 10, color: st.color, fontWeight: 600 }}>{st.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {equipmentAlerts.length > 0 && (
                            <>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>Cần kiểm tra:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {equipmentAlerts.map(eq => {
                                        const wearColor = eq.wearRate >= 90 ? '#dc2626' : eq.wearRate >= 80 ? '#d97706' : '#16a34a';
                                        const statusColor = eq.status !== 'Đang dùng' ? '#dc2626' : '#16a34a';
                                        return (
                                            <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.name}</div>
                                                    <div style={{ fontSize: 10, color: statusColor, fontWeight: 600 }}>{eq.status}</div>
                                                </div>
                                                {eq.wearRate > 0 && (
                                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 800, color: wearColor }}>{eq.wearRate}%</div>
                                                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>hao mòn</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                        {machineStatus.length === 0 && equipmentAlerts.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#16a34a', fontSize: 12, padding: '8px 0' }}>✅ Tất cả thiết bị hoạt động bình thường</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inventory Forecast — only show if any material demand exists */}
            {inventoryForecast.length > 0 && (
                <div className="card" style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>📋 Dự báo vật tư — Nhu cầu từ tasks đang làm</h3>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {inventoryForecast.filter(m => !m.sufficient).length > 0
                                    ? <span style={{ color: '#dc2626', fontWeight: 600 }}>⛔ {inventoryForecast.filter(m => !m.sufficient).length} vật tư không đủ</span>
                                    : <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ Đủ vật tư cho tất cả tasks</span>}
                            </div>
                        </div>
                        <a href="/workshop/materials" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Quản lý kho →</a>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                        {inventoryForecast.map(m => (
                            <div key={m.productId} style={{
                                padding: '10px 12px', borderRadius: 8,
                                background: m.sufficient ? '#f0fdf4' : '#fef2f2',
                                border: `1px solid ${m.sufficient ? '#bbf7d0' : '#fca5a5'}`,
                            }}>
                                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Cần: <b style={{ color: '#374151' }}>{m.needed} {m.unit}</b></span>
                                    <span style={{ color: 'var(--text-muted)' }}>Tồn: <b style={{ color: m.sufficient ? '#16a34a' : '#dc2626' }}>{m.stock} {m.unit}</b></span>
                                </div>
                                {!m.sufficient && (
                                    <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, marginTop: 3 }}>
                                        ⛔ Thiếu {m.shortage} {m.unit}
                                    </div>
                                )}
                                {m.sufficient && (
                                    <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, marginTop: 3 }}>✓ Đủ</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
