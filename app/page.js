'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Wallet, ArrowDownLeft, ArrowUpRight, Clock, Flame, Lock,
    AlertTriangle, PackageX, CheckCircle2,
} from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import {
    PageContainer, PageHeader, Card, StatCard, StatGrid, Badge,
    Table, EmptyState, ErrorState, SkeletonStats, SkeletonCard,
} from '@/components/ui';
import { formatCompact, formatPercent, formatDateShort } from '@/lib/format';

const PERIOD_OPTIONS = [
    { key: 1,  label: 'Hôm nay' },
    { key: 7,  label: '7 ngày' },
    { key: 30, label: '30 ngày' },
    { key: 90, label: 'Quý' },
];

const today = () => new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
});

/** Đường xu hướng nhỏ trong ô tổng hợp dòng tiền. */
function Sparkline({ values, tone = 'success', height = 24 }) {
    if (!values || values.length < 2) return null;
    const max = Math.max(...values, 1);
    const w = 80;
    const pts = values
        .map((v, i) => `${(i / (values.length - 1)) * w},${height - (v / max) * (height - 2) - 1}`)
        .join(' ');
    return (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} aria-hidden="true" style={{ display: 'block' }}>
            <polyline
                points={pts}
                fill="none"
                stroke={`var(--color-${tone})`}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}

/** Bộ lọc kỳ — dùng vai trò tablist để thao tác được bằng bàn phím. */
function PeriodFilter({ value, onChange }) {
    return (
        <div className="ui-tabs" role="tablist" aria-label="Kỳ báo cáo" style={{ borderBottom: 'none' }}>
            {PERIOD_OPTIONS.map(opt => (
                <button
                    key={opt.key}
                    type="button"
                    role="tab"
                    className="ui-tab"
                    aria-selected={value === opt.key}
                    onClick={() => onChange(opt.key)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const { canViewDashboard, role } = useRole();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [period, setPeriod] = useState(30);

    useEffect(() => {
        if (role === 'kinh_doanh') { router.replace('/sales'); return; }
        if (role === 'xuong') { router.replace('/workshop'); return; }
        if (role === 'xay_dung') { router.replace('/projects'); return; }
        if (role && !canViewDashboard) { router.replace('/projects'); return; }
    }, [role, canViewDashboard, router]);

    const load = useCallback(() => {
        setLoading(true);
        setFailed(false);
        fetch(`/api/dashboard?days=${period}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => { setFailed(true); setLoading(false); });
    }, [period]);

    useEffect(() => {
        if (!canViewDashboard && role) return;
        load();
    }, [role, canViewDashboard, load]);

    if (!canViewDashboard && role) return null;

    const header = (
        <PageHeader
            title="Dashboard điều hành"
            description={today()}
            filters={<PeriodFilter value={period} onChange={setPeriod} />}
        />
    );

    if (loading) {
        return (
            <PageContainer>
                {header}
                <SkeletonStats count={6} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
                    <SkeletonCard lines={5} />
                    <SkeletonCard lines={5} />
                </div>
            </PageContainer>
        );
    }

    if (failed || !data?.stats) {
        return (
            <PageContainer>
                {header}
                <Card>
                    <ErrorState
                        title="Không tải được dữ liệu điều hành"
                        description="Máy chủ chưa trả về số liệu dashboard. Vui lòng thử lại sau ít phút."
                        onRetry={load}
                    />
                </Card>
            </PageContainer>
        );
    }

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

    const totalThu = cashflowTimeline.reduce((acc, d) => acc + d.thu, 0);
    const totalChi = cashflowTimeline.reduce((acc, d) => acc + d.chi, 0);
    const netPeriod = totalThu - totalChi;
    const maxCashflowVal = Math.max(...cashflowTimeline.map(d => Math.max(d.thu, d.chi)), 1);
    const maxHeatmap = expenseHeatmap.length > 0 ? expenseHeatmap[0].amount : 1;

    const runwayLabel = runwayDays >= 9999 ? 'Không giới hạn' : `${runwayDays} ngày`;

    const riskAlerts = [
        s.pendingWorkOrders > 0 && {
            label: `${s.pendingWorkOrders} phiếu công việc chờ xử lý`, href: '/work-orders', tone: 'warning',
        },
        blockedCount > 0 && {
            label: `${blockedCount} lệnh chi kẹt duyệt — ${formatCompact(blockedAmount)} ₫`, href: '/expenses', tone: 'danger',
        },
        overBudgetCount > 0 && {
            label: `${overBudgetCount} dự án vượt ngân sách`, href: '/projects', tone: 'danger',
        },
        negativeMarginCount > 0 && {
            label: `${negativeMarginCount} dự án đang lỗ`, href: '/projects', tone: 'danger',
        },
        runwayDays < 30 && {
            label: `Dòng tiền chỉ còn đủ ${runwayDays} ngày`, href: '/finance/journal', tone: 'danger',
        },
    ].filter(Boolean);

    const periodLabel = PERIOD_OPTIONS.find(o => o.key === period)?.label || `${period} ngày`;

    const profitColumns = [
        {
            key: 'code',
            header: 'Mã dự án',
            nowrap: true,
            strong: true,
            render: (code, row) => (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-primary-700)' }}>
                    {row.overBudget && (
                        <AlertTriangle size={13} aria-label="Vượt ngân sách" style={{ color: 'var(--color-danger)' }} />
                    )}
                    {code}
                </span>
            ),
        },
        { key: 'revenue', header: 'Doanh thu', align: 'num', render: v => formatCompact(v) },
        { key: 'cost',    header: 'Chi phí',   align: 'num', render: v => formatCompact(v) },
        {
            key: 'profit',
            header: 'Lợi nhuận',
            align: 'num',
            render: (v, row) => (
                <span style={{ fontWeight: 600, color: row.margin < 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                    {formatCompact(v)}
                </span>
            ),
        },
        {
            key: 'margin',
            header: 'Biên LN',
            align: 'num',
            render: v => (
                <Badge tone={v < 0 ? 'danger' : v < 10 ? 'warning' : 'success'} size="sm">
                    {formatPercent(v, { decimals: 1 })}
                </Badge>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            nowrap: true,
            render: v => <Badge status={v} size="sm">{v}</Badge>,
        },
    ];

    return (
        <PageContainer>
            {header}

            {riskAlerts.length > 0 && (
                <section aria-label="Cảnh báo rủi ro" className="ui-row">
                    {riskAlerts.map((a, i) => (
                        <Link
                            key={i}
                            href={a.href}
                            className={`ui-badge ui-badge--${a.tone}`}
                            style={{ textDecoration: 'none', padding: '6px 12px' }}
                        >
                            <AlertTriangle size={13} aria-hidden="true" />
                            {a.label}
                        </Link>
                    ))}
                </section>
            )}

            {/* ── Chỉ số tài chính ── */}
            <StatGrid>
                <StatCard
                    label="Số dư tiền mặt"
                    value={formatCompact(cashBalance)}
                    unit="₫"
                    note="Tổng thu trừ tổng chi"
                    icon={Wallet}
                    href="/finance/journal"
                />
                <StatCard
                    label="Phải thu"
                    value={formatCompact(receivable)}
                    unit="₫"
                    note="Hợp đồng chưa thu đủ"
                    icon={ArrowDownLeft}
                    href="/finance/thu-tien"
                />
                <StatCard
                    label="Phải trả"
                    value={formatCompact(payable)}
                    unit="₫"
                    note="Chi phí chờ thanh toán"
                    icon={ArrowUpRight}
                    href="/expenses"
                />
                <StatCard
                    label="Số ngày dòng tiền còn đủ"
                    value={runwayLabel}
                    note={`Đốt ${formatCompact(burnRate30d)} ₫/ngày`}
                    icon={Clock}
                    href="/finance/journal"
                    alert={runwayDays < 30}
                />
                <StatCard
                    label="Tốc độ chi"
                    value={formatCompact(burnRate30d)}
                    unit="₫/ngày"
                    note="30 ngày qua"
                    icon={Flame}
                    href="/expenses"
                    goodDirection="down"
                />
                <StatCard
                    label="Tiền kẹt chờ duyệt"
                    value={formatCompact(blockedAmount)}
                    unit="₫"
                    note={`${blockedCount} lệnh chi đang chờ`}
                    icon={Lock}
                    href="/expenses"
                    alert={blockedCount > 0}
                />
            </StatGrid>

            {/* ── Dòng tiền + Điểm nghẽn duyệt ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 'var(--space-4)' }}>
                <Card
                    title={`Dòng tiền — ${periodLabel}`}
                    actions={<Link href="/finance/journal" className="ui-btn ui-btn--ghost ui-btn--sm">Xem nhật ký</Link>}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-3)' }}>
                        {[
                            { label: 'Thu vào', value: totalThu, tone: 'success', spark: cashflowTimeline.map(d => d.thu) },
                            { label: 'Chi ra', value: totalChi, tone: 'danger', spark: cashflowTimeline.map(d => d.chi) },
                            { label: 'Số dư kỳ', value: netPeriod, tone: netPeriod >= 0 ? 'success' : 'danger' },
                        ].map(item => (
                            <div
                                key={item.label}
                                style={{
                                    padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius)',
                                    background: 'var(--color-surface-2)',
                                    border: '1px solid var(--color-border)',
                                }}
                            >
                                <div className="ui-caption">{item.label}</div>
                                <div className="ui-num" style={{ fontSize: 16, fontWeight: 700, color: `var(--color-${item.tone})`, marginTop: 2 }}>
                                    {formatCompact(item.value)} ₫
                                </div>
                                {item.spark?.some(v => v > 0) && (
                                    <div style={{ marginTop: 6 }}>
                                        <Sparkline values={item.spark} tone={item.tone} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {burnRate30d > 0 && cashBalance / burnRate30d < 30 && (
                        <p
                            role="status"
                            className="ui-badge ui-badge--danger"
                            style={{ marginTop: 'var(--space-4)', whiteSpace: 'normal', padding: '8px 12px' }}
                        >
                            <AlertTriangle size={14} aria-hidden="true" />
                            Dòng tiền còn đủ dưới 30 ngày — cần tăng thu hoặc giảm chi.
                        </p>
                    )}

                    <div style={{ marginTop: 'var(--space-4)' }}>
                        {cashflowTimeline.length === 0 ? (
                            <EmptyState
                                title="Không có giao dịch trong kỳ"
                                description="Chọn kỳ dài hơn hoặc ghi nhận giao dịch trong Nhật ký Thu – Chi."
                            />
                        ) : (
                            <>
                                {(cashflowTimeline.length > 7 ? cashflowTimeline.slice(-7) : cashflowTimeline).map(d => (
                                    <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 6 }}>
                                        <span className="ui-caption ui-num" style={{ minWidth: 40 }}>{formatDateShort(d.date)}</span>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                                            {d.thu > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ height: 5, width: `${Math.round((d.thu / maxCashflowVal) * 100)}%`, minWidth: 2, background: 'var(--color-success)', borderRadius: 99 }} />
                                                    <span className="ui-num" style={{ fontSize: 11, color: 'var(--color-success)' }}>+{formatCompact(d.thu)}</span>
                                                </div>
                                            )}
                                            {d.chi > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ height: 5, width: `${Math.round((d.chi / maxCashflowVal) * 100)}%`, minWidth: 2, background: 'var(--color-danger)', borderRadius: 99 }} />
                                                    <span className="ui-num" style={{ fontSize: 11, color: 'var(--color-danger)' }}>−{formatCompact(d.chi)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            className="ui-num"
                                            style={{
                                                fontSize: 11, fontWeight: 600, minWidth: 64, textAlign: 'right',
                                                color: d.net >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                                            }}
                                        >
                                            {d.net >= 0 ? '+' : '−'}{formatCompact(Math.abs(d.net))}
                                        </span>
                                    </div>
                                ))}
                                {cashflowTimeline.length > 7 && (
                                    <p className="ui-caption" style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
                                        Hiển thị 7 ngày gần nhất trong {cashflowTimeline.length} ngày có giao dịch
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </Card>

                <Card
                    title="Tiền đang kẹt ở khâu nào"
                    subtitle="Trên 3 ngày là chậm, trên 5 ngày là nghẽn"
                    actions={<Link href="/expenses" className="ui-btn ui-btn--ghost ui-btn--sm">Xem lệnh chi</Link>}
                >
                    {approvalBottleneck.length === 0 ? (
                        <EmptyState
                            icon={CheckCircle2}
                            title="Không có lệnh chi nào đang chờ"
                            description="Toàn bộ lệnh chi đã được xử lý xong."
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            {approvalBottleneck.map(row => {
                                const tone = row.avgDays > 5 ? 'danger' : row.avgDays > 3 ? 'warning' : 'success';
                                return (
                                    <Link
                                        key={row.status}
                                        href="/expenses"
                                        style={{
                                            display: 'block',
                                            padding: 'var(--space-3)',
                                            borderRadius: 'var(--radius)',
                                            border: '1px solid var(--color-border)',
                                            background: 'var(--color-surface-2)',
                                            textDecoration: 'none',
                                            color: 'inherit',
                                        }}
                                    >
                                        <div className="ui-row ui-row--between" style={{ alignItems: 'flex-start' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{row.holder}</div>
                                                <div className="ui-caption">{row.status}</div>
                                            </div>
                                            <Badge tone={tone} size="sm">~{row.avgDays} ngày</Badge>
                                        </div>
                                        <div className="ui-row ui-row--between" style={{ marginTop: 6 }}>
                                            <span className="ui-num" style={{ fontSize: 14, fontWeight: 700 }}>
                                                {formatCompact(row.total)} ₫
                                            </span>
                                            <span className="ui-caption">{row.count} lệnh</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* ── Chi phí theo hạng mục + Hiệu quả dự án ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: 'var(--space-4)' }}>
                <Card
                    title="Chi phí theo hạng mục"
                    subtitle={periodLabel}
                    actions={<Link href="/expenses" className="ui-btn ui-btn--ghost ui-btn--sm">Xem chi phí</Link>}
                >
                    {expenseHeatmap.length === 0 ? (
                        <EmptyState title="Không có chi phí trong kỳ" description="Chưa ghi nhận khoản chi nào cho kỳ đã chọn." />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {expenseHeatmap.map((row, i) => (
                                <div key={row.category}>
                                    <div className="ui-row ui-row--between" style={{ marginBottom: 4, flexWrap: 'nowrap' }}>
                                        <span className="ui-truncate" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            {row.category || 'Khác'}
                                        </span>
                                        <span className="ui-row" style={{ flexWrap: 'nowrap', gap: 'var(--space-2)' }}>
                                            <span className="ui-caption ui-num">{formatPercent(row.pct)}</span>
                                            <span className="ui-num" style={{ fontSize: 13, fontWeight: 600 }}>
                                                {formatCompact(row.amount)}
                                            </span>
                                        </span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--color-surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                                        <span
                                            style={{
                                                display: 'block',
                                                height: '100%',
                                                width: `${Math.round((row.amount / maxHeatmap) * 100)}%`,
                                                background: i === 0 ? 'var(--color-primary-600)' : 'var(--color-info)',
                                                borderRadius: 99,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card
                    title="Hiệu quả dự án"
                    subtitle="Dự án có biên lợi nhuận âm được đánh dấu đỏ"
                    flush
                    actions={<Link href="/projects" className="ui-btn ui-btn--ghost ui-btn--sm">Xem dự án</Link>}
                >
                    <Table
                        columns={profitColumns}
                        data={projectProfitability}
                        onRowClick={(row) => router.push(`/projects/${row.id}`)}
                        emptyTitle="Chưa có dữ liệu dự án"
                        emptyDescription="Khi dự án phát sinh doanh thu và chi phí, hiệu quả sẽ hiển thị tại đây."
                        caption="Doanh thu, chi phí và biên lợi nhuận theo dự án"
                    />
                </Card>
            </div>

            {/* ── Sản phẩm sắp hết hàng ── */}
            {data.lowStockProducts?.length > 0 && (
                <Card
                    title={
                        <>
                            <PackageX size={16} aria-hidden="true" style={{ color: 'var(--color-danger)' }} />
                            Sản phẩm sắp hết hàng
                            <Badge tone="danger" size="sm">{data.lowStockProducts.length}</Badge>
                        </>
                    }
                    actions={<Link href="/products" className="ui-btn ui-btn--ghost ui-btn--sm">Xem tất cả</Link>}
                >
                    <div className="ui-row">
                        {data.lowStockProducts.map(p => (
                            <Link
                                key={p.id}
                                href={`/products/${p.id}`}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                                    padding: '8px 12px', borderRadius: 'var(--radius)',
                                    border: '1px solid var(--color-danger-br)',
                                    background: 'var(--color-danger-bg)',
                                    textDecoration: 'none', color: 'inherit',
                                }}
                            >
                                {p.image && (
                                    <img src={p.image} alt="" width={26} height={26} style={{ borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
                                )}
                                <span>
                                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                                    <span className="ui-num" style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600 }}>
                                        Tồn: {p.stock}
                                    </span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </Card>
            )}
        </PageContainer>
    );
}
