'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n && n !== 0) return '—';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + ' tỷ';
    if (abs >= 1e6) return sign + (abs / 1e6).toFixed(0) + ' tr';
    return sign + new Intl.NumberFormat('vi-VN').format(abs);
};
const fmtDay = (iso) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const today = () => new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

const PERIOD_OPTIONS = [
    { key: 1,  label: 'Hôm nay' },
    { key: 7,  label: '7 ngày' },
    { key: 30, label: '30 ngày' },
    { key: 90, label: 'Quý' },
];

// SVG icons (minimal)
const Icons = {
    ArrowRight: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    Alert: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    TrendUp: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    TrendDown: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
    Fire: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/></svg>,
    Lock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    Wallet: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h2v-4z"/></svg>,
    ChevronRight: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

const statusColor = (s) => ({ 'Thi công': '#2563eb', 'Đang thi công': '#2563eb', 'Thiết kế': '#7c3aed', 'Hoàn thành': '#16a34a', 'Dừng': '#dc2626', 'Chờ': '#d97706' }[s] || '#64748b');
const statusBg    = (s) => ({ 'Thi công': 'rgba(37,99,235,0.1)', 'Đang thi công': 'rgba(37,99,235,0.1)', 'Thiết kế': 'rgba(124,58,237,0.1)', 'Hoàn thành': 'rgba(22,163,74,0.1)', 'Dừng': 'rgba(220,38,38,0.1)', 'Chờ': 'rgba(217,119,6,0.1)' }[s] || 'rgba(100,116,139,0.1)');

// Mini sparkline SVG
const Sparkline = ({ values, color = '#2563eb', height = 28 }) => {
    if (!values || values.length < 2) return null;
    const max = Math.max(...values, 1);
    const w = 80;
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - (v / max) * (height - 2) - 1}`).join(' ');
    return (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ overflow: 'visible', display: 'block' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
};

// KPI Card
const KpiCard = ({ label, value, sub, color, bg, href, urgent, icon: Icon, trend }) => (
    <a href={href} style={{ textDecoration: 'none' }}>
        <div
            style={{
                background: urgent ? 'rgba(220,38,38,0.04)' : 'var(--bg-card)',
                border: urgent ? '2px solid rgba(220,38,38,0.5)' : '1px solid var(--border-color)',
                borderRadius: 14, padding: '16px 18px',
                display: 'flex', flexDirection: 'column', gap: 8,
                boxShadow: urgent ? '0 4px 16px rgba(220,38,38,0.12)' : 'var(--shadow-sm)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = urgent ? '0 8px 24px rgba(220,38,38,0.18)' : 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = urgent ? '0 4px 16px rgba(220,38,38,0.12)' : 'var(--shadow-sm)'; }}
        >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '14px 14px 0 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 36, height: 36, background: bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                    {Icon && <Icon />}
                </div>
                {trend !== undefined && (
                    <span style={{ color: trend >= 0 ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600 }}>
                        {trend >= 0 ? <Icons.TrendUp /> : <Icons.TrendDown />}
                    </span>
                )}
            </div>
            <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: urgent ? '#dc2626' : 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: urgent ? '#dc2626' : 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    </a>
);

// Section card wrapper
const SectionCard = ({ title, href, linkLabel, children, headerRight, redBorder }) => (
    <div style={{
        background: 'var(--bg-card)',
        border: redBorder ? '1px solid rgba(220,38,38,0.25)' : '1px solid var(--border-color)',
        borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden',
    }}>
        <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: redBorder ? 'rgba(220,38,38,0.03)' : undefined,
        }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: redBorder ? '#dc2626' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {redBorder && <Icons.Alert />}
                {title}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {headerRight}
                {href && <a href={href} style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500 }}>{linkLabel || 'Xem chi tiết'} <Icons.ArrowRight /></a>}
            </div>
        </div>
        {children}
    </div>
);

export default function Dashboard() {
    const router = useRouter();
    const { canViewDashboard, role } = useRole();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);

    useEffect(() => {
        if (role === 'kinh_doanh') { router.replace('/sales'); return; }
        if (role === 'xuong') { router.replace('/workshop'); return; }
        if (role === 'xay_dung') { router.replace('/projects'); return; }
        if (role && !canViewDashboard) { router.replace('/projects'); return; }
    }, [role, canViewDashboard, router]);

    useEffect(() => {
        if (!canViewDashboard && role) return;
        setLoading(true);
        fetch(`/api/dashboard?days=${period}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [role, canViewDashboard, period]);

    if (!canViewDashboard && role) return null;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Đang tải CFO Dashboard...</span>
        </div>
    );

    if (!data?.stats) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
            Không thể tải dữ liệu dashboard
        </div>
    );

    const s = data.stats;
    const cfo = data.cfo || {};
    const {
        cashBalance = 0, receivable = 0, payable = 0,
        blockedAmount = 0, blockedCount = 0,
        burnRate30d = 0, runwayDays = 9999,
        approvalBottleneck = [], cashflowTimeline = [],
        expenseHeatmap = [], projectProfitability = [],
        overBudgetCount = 0, negativeMarginCount = 0,
    } = cfo;

    const totalCashflowThu = cashflowTimeline.reduce((s, d) => s + d.thu, 0);
    const totalCashflowChi = cashflowTimeline.reduce((s, d) => s + d.chi, 0);
    const maxCashflowVal = Math.max(...cashflowTimeline.map(d => Math.max(d.thu, d.chi)), 1);
    const thuSparkline = cashflowTimeline.map(d => d.thu);
    const chiSparkline = cashflowTimeline.map(d => d.chi);

    const maxHeatmap = expenseHeatmap.length > 0 ? expenseHeatmap[0].amount : 1;

    const runwayColor = runwayDays < 30 ? '#dc2626' : runwayDays < 60 ? '#d97706' : '#16a34a';
    const runwayLabel = runwayDays >= 9999 ? '∞ ngày' : `${runwayDays} ngày`;

    const riskAlerts = [
        s.pendingWorkOrders > 0 && { label: `${s.pendingWorkOrders} phiếu công việc chờ xử lý`, href: '/work-orders', color: '#d97706' },
        blockedCount > 0 && { label: `${blockedCount} lệnh chi kẹt duyệt — ${fmtShort(blockedAmount)}`, href: '/expenses', color: '#dc2626' },
        overBudgetCount > 0 && { label: `${overBudgetCount} dự án vượt ngân sách`, href: '/projects', color: '#dc2626' },
        negativeMarginCount > 0 && { label: `${negativeMarginCount} dự án đang lỗ (margin âm)`, href: '/projects', color: '#dc2626' },
        runwayDays < 30 && { label: `Cảnh báo: Runway chỉ còn ${runwayDays} ngày`, href: '/finance', color: '#dc2626' },
    ].filter(Boolean);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h1 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>CFO Executive Dashboard</h1>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{today()}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {/* Period filter */}
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 3 }}>
                        {PERIOD_OPTIONS.map(opt => (
                            <button key={opt.key} onClick={() => setPeriod(opt.key)} style={{
                                padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                background: period === opt.key ? 'var(--primary)' : 'transparent',
                                color: period === opt.key ? '#fff' : 'var(--text-muted)',
                                transition: 'all 0.15s',
                            }}>{opt.label}</button>
                        ))}
                    </div>
                    {/* Risk Alert Center */}
                    {riskAlerts.length > 0 && (
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px',
                                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
                                borderRadius: 9, color: '#dc2626', fontSize: 12, fontWeight: 600,
                            }}>
                                <Icons.Alert />
                                {riskAlerts.length} cảnh báo rủi ro
                                <span style={{ background: '#dc2626', color: '#fff', borderRadius: 99, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{riskAlerts.length}</span>
                            </div>
                            {/* Dropdown on hover - just show inline for simplicity */}
                        </div>
                    )}
                </div>
            </div>

            {/* Risk alerts expanded */}
            {riskAlerts.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {riskAlerts.map((a, i) => (
                        <a key={i} href={a.href} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 12px', borderRadius: 8, textDecoration: 'none',
                            background: `rgba(${a.color === '#dc2626' ? '220,38,38' : '217,119,6'},0.07)`,
                            border: `1px solid ${a.color}33`,
                            color: a.color, fontSize: 12, fontWeight: 500,
                        }}>
                            <Icons.Alert /> {a.label}
                        </a>
                    ))}
                </div>
            )}

            {/* ── Row 1: 6 CFO KPI Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12 }}>
                <KpiCard
                    label="Cash Balance"
                    value={fmtShort(cashBalance)}
                    sub="Tổng thu – tổng chi"
                    color="#1C3A6B" bg="rgba(28,58,107,0.08)"
                    href="/finance"
                    icon={Icons.Wallet}
                    trend={cashBalance >= 0 ? 1 : -1}
                />
                <KpiCard
                    label="Phải thu (AR)"
                    value={fmtShort(receivable)}
                    sub="HĐ chưa thu đủ"
                    color="#0891b2" bg="rgba(8,145,178,0.08)"
                    href="/finance/thu-tien"
                    icon={() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
                />
                <KpiCard
                    label="Phải trả (AP)"
                    value={fmtShort(payable)}
                    sub="Chi phí chờ thanh toán"
                    color="#7c3aed" bg="rgba(124,58,237,0.08)"
                    href="/expenses"
                    icon={() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
                />
                <KpiCard
                    label="Runway"
                    value={runwayLabel}
                    sub={`Burn ${fmtShort(burnRate30d)}/ngày`}
                    color={runwayColor} bg={`${runwayColor}14`}
                    href="/finance"
                    urgent={runwayDays < 30}
                    icon={() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                />
                <KpiCard
                    label="Burn Rate"
                    value={fmtShort(burnRate30d) + '/ngày'}
                    sub="30 ngày qua"
                    color="#d97706" bg="rgba(217,119,6,0.08)"
                    href="/expenses"
                    icon={Icons.Fire}
                />
                <KpiCard
                    label="Kẹt duyệt !"
                    value={fmtShort(blockedAmount)}
                    sub={`${blockedCount} lệnh chờ duyệt`}
                    color="#dc2626" bg="rgba(220,38,38,0.08)"
                    href="/expenses"
                    urgent
                    icon={Icons.Lock}
                />
            </div>

            {/* ── Row 2: Cashflow Timeline + Approval Bottleneck ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>

                {/* Cashflow Timeline */}
                <SectionCard
                    title={`Cashflow Timeline — ${period === 1 ? 'Hôm nay' : period === 90 ? 'Quý này' : `${period} ngày qua`}`}
                    href="/finance"
                >
                    {/* Period summary */}
                    <div style={{ padding: '14px 18px 0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                            {[
                                { label: 'Thu vào', value: totalCashflowThu, color: '#16a34a', bg: 'rgba(22,163,74,0.06)', spark: thuSparkline, sparkColor: '#16a34a' },
                                { label: 'Chi ra', value: totalCashflowChi, color: '#dc2626', bg: 'rgba(220,38,38,0.06)', spark: chiSparkline, sparkColor: '#dc2626' },
                                { label: 'Số dư kỳ', value: totalCashflowThu - totalCashflowChi, color: totalCashflowThu >= totalCashflowChi ? '#16a34a' : '#dc2626', bg: totalCashflowThu >= totalCashflowChi ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)' },
                            ].map(item => (
                                <div key={item.label} style={{ background: item.bg, borderRadius: 10, padding: '12px 14px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{item.label}</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{fmtShort(item.value)}</div>
                                    {item.spark && item.spark.some(v => v > 0) && (
                                        <div style={{ marginTop: 6 }}><Sparkline values={item.spark} color={item.sparkColor} /></div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Cảnh báo dòng tiền */}
                        {burnRate30d > 0 && cashBalance / burnRate30d < 30 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#dc2626', fontWeight: 500 }}>
                                <Icons.Alert />
                                ⚠ Runway &lt; 30 ngày — Xem xét tăng thu hoặc giảm chi
                            </div>
                        )}
                    </div>

                    {/* Daily bars — show last 7 or all if ≤7 */}
                    {cashflowTimeline.length > 0 ? (
                        <div style={{ padding: '0 18px 14px', maxHeight: 220, overflowY: 'auto' }}>
                            {(cashflowTimeline.length > 7 ? cashflowTimeline.slice(-7) : cashflowTimeline).map((d, i) => (
                                <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 36, fontWeight: 500 }}>{fmtDay(d.date)}</span>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {d.thu > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <div style={{ height: 5, width: `${Math.round((d.thu / maxCashflowVal) * 100)}%`, background: '#16a34a', borderRadius: 99, minWidth: 2 }} />
                                                <span style={{ fontSize: 10, color: '#16a34a' }}>+{fmtShort(d.thu)}</span>
                                            </div>
                                        )}
                                        {d.chi > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <div style={{ height: 5, width: `${Math.round((d.chi / maxCashflowVal) * 100)}%`, background: '#dc2626', borderRadius: 99, minWidth: 2 }} />
                                                <span style={{ fontSize: 10, color: '#dc2626' }}>-{fmtShort(d.chi)}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: d.net >= 0 ? '#16a34a' : '#dc2626', minWidth: 48, textAlign: 'right' }}>
                                        {d.net >= 0 ? '+' : ''}{fmtShort(d.net)}
                                    </span>
                                </div>
                            ))}
                            {cashflowTimeline.length > 7 && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>Hiển thị 7 ngày gần nhất trong {cashflowTimeline.length} ngày có giao dịch</div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '20px 18px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>Không có giao dịch trong kỳ này</div>
                    )}
                </SectionCard>

                {/* Approval Bottleneck */}
                <SectionCard title="Tiền đang kẹt ở đâu?" href="/expenses" linkLabel="Xem lệnh chi">
                    <div style={{ padding: '14px 18px' }}>
                        {approvalBottleneck.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>✅ Không có lệnh chi đang pending</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {approvalBottleneck.map(row => {
                                    const dayColor = row.avgDays > 5 ? '#dc2626' : row.avgDays > 3 ? '#d97706' : '#16a34a';
                                    return (
                                        <a key={row.status} href="/expenses" style={{ textDecoration: 'none' }}>
                                            <div style={{
                                                padding: '12px 14px', borderRadius: 10,
                                                background: row.avgDays > 5 ? 'rgba(220,38,38,0.04)' : row.avgDays > 3 ? 'rgba(217,119,6,0.04)' : 'var(--bg-primary)',
                                                border: `1px solid ${row.avgDays > 5 ? 'rgba(220,38,38,0.2)' : row.avgDays > 3 ? 'rgba(217,119,6,0.2)' : 'var(--border-color)'}`,
                                                transition: 'box-shadow 0.15s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                                                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{row.holder}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{row.status}</div>
                                                    </div>
                                                    <span style={{ background: dayColor + '18', color: dayColor, border: `1px solid ${dayColor}44`, borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                                        ~{row.avgDays}d
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtShort(row.total)}</span>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.count} lệnh</span>
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 10 }}>
                                    <span style={{ color: '#d97706' }}>● &gt;3 ngày = vàng</span>
                                    <span style={{ color: '#dc2626' }}>● &gt;5 ngày = đỏ</span>
                                </div>
                            </div>
                        )}
                    </div>
                </SectionCard>
            </div>

            {/* ── Row 3: Expense Heatmap + Project Profitability ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 14 }}>

                {/* Expense Heatmap */}
                <SectionCard
                    title="Phòng nào đang đốt tiền?"
                    href="/expenses"
                    headerRight={<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{period === 90 ? 'Quý này' : `${period}d`}</span>}
                >
                    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {expenseHeatmap.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Không có chi phí trong kỳ</div>
                        ) : (
                            expenseHeatmap.map((row, i) => (
                                <div key={row.category}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.category || 'Khác'}</span>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.pct}%</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? '#dc2626' : 'var(--text-primary)' }}>{fmtShort(row.amount)}</span>
                                        </div>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.round((row.amount / maxHeatmap) * 100)}%`,
                                            background: i === 0 ? '#dc2626' : i === 1 ? '#d97706' : i <= 3 ? '#2563eb' : '#64748b',
                                            borderRadius: 99, transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </SectionCard>

                {/* Project Profitability */}
                <SectionCard title="Dự án nào đang lỗ?" href="/projects" linkLabel="Xem dự án">
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-primary)' }}>
                                    {['Mã DA', 'Doanh thu', 'Chi phí', 'Lợi nhuận', 'Margin', 'TT'].map(h => (
                                        <th key={h} style={{ padding: '9px 14px', textAlign: h === 'Margin' || h === 'Doanh thu' || h === 'Chi phí' || h === 'Lợi nhuận' ? 'right' : 'left', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {projectProfitability.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Chưa có dữ liệu dự án</td></tr>
                                ) : (
                                    projectProfitability.map(p => {
                                        const marginColor = p.margin < 0 ? '#dc2626' : p.margin < 10 ? '#d97706' : '#16a34a';
                                        const marginBg    = p.margin < 0 ? 'rgba(220,38,38,0.08)' : p.margin < 10 ? 'rgba(217,119,6,0.08)' : 'rgba(22,163,74,0.08)';
                                        return (
                                            <tr key={p.id}
                                                onClick={() => window.location.href = `/projects/${p.id}`}
                                                style={{ borderTop: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.1s', background: p.margin < 0 ? 'rgba(220,38,38,0.02)' : 'transparent' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-primary)'}
                                                onMouseLeave={e => e.currentTarget.style.background = p.margin < 0 ? 'rgba(220,38,38,0.02)' : 'transparent'}
                                            >
                                                <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                                                    {p.overBudget && <span title="Vượt ngân sách" style={{ color: '#dc2626', marginRight: 3 }}>⚠</span>}
                                                    {p.code}
                                                </td>
                                                <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 500 }}>{fmtShort(p.revenue)}</td>
                                                <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtShort(p.cost)}</td>
                                                <td style={{ padding: '10px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700, color: marginColor }}>{fmtShort(p.profit)}</td>
                                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: marginBg, color: marginColor }}>
                                                        {p.margin}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <span style={{ display: 'inline-block', padding: '2px 8px', background: statusBg(p.status), color: statusColor(p.status), borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{p.status}</span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </SectionCard>
            </div>

            {/* ── Low Stock Alert (bottom) ── */}
            {data.lowStockProducts?.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 18px', borderBottom: '1px solid rgba(220,38,38,0.12)', background: 'rgba(220,38,38,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
                            <Icons.Alert />
                            Sản phẩm hết hàng
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 20, height: 20, background: '#dc2626', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{data.lowStockProducts.length}</span>
                        </div>
                        <Link href="/products" style={{ fontSize: 12, color: '#dc2626', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500 }}>Xem tất cả <Icons.ArrowRight /></Link>
                    </div>
                    <div style={{ padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {data.lowStockProducts.map(p => (
                            <a key={p.id} href={`/products/${p.id}`} style={{
                                display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px',
                                background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.13)',
                                borderRadius: 9, textDecoration: 'none', color: 'inherit',
                            }}>
                                {p.image && <img src={p.image} style={{ width: 26, height: 26, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} alt="" />}
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{p.name}</div>
                                    <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 500 }}>Tồn: {p.stock}</div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
}
