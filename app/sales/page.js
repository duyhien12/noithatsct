'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + ' tr';
    return new Intl.NumberFormat('vi-VN').format(n);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const PIPELINE_COLORS = {
    'Khách nội thất': { color: '#06b6d4', bg: '#cffafe' },
    'Tư vấn':         { color: '#3b82f6', bg: '#dbeafe' },
    'Báo giá':        { color: '#8b5cf6', bg: '#ede9fe' },
    'Ký HĐ':          { color: '#10b981', bg: '#d1fae5' },
    'Thi công':       { color: '#f97316', bg: '#ffedd5' },
    'VIP':            { color: '#ec4899', bg: '#fce7f3' },
};

const PIPELINE_ORDER = ['Khách nội thất', 'Tư vấn', 'Báo giá', 'Ký HĐ', 'Thi công', 'VIP'];

export default function SalesDashboard() {
    const router = useRouter();
    const { role } = useRole();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (role && role !== 'kinh_doanh' && role !== 'ban_gd' && role !== 'giam_doc' && role !== 'pho_gd') {
            router.replace('/');
            return;
        }
        fetch('/api/sales/dashboard')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [role]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
            Đang tải dữ liệu...
        </div>
    );

    if (!data) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
            Không thể tải dữ liệu
        </div>
    );

    const { stats, pipelineGroups = [], recentCustomers = [], upcomingFollowUps = [] } = data;

    // Sort pipeline groups by defined order
    const sortedPipeline = PIPELINE_ORDER
        .map(stage => {
            const found = pipelineGroups.find(g => g.pipelineStage === stage);
            return { stage, count: found?._count || 0 };
        })
        .filter(p => p.count > 0);

    const totalPipeline = sortedPipeline.reduce((s, p) => s + p.count, 0);

    return (
        <div>
            {/* KPI Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div>
                        <div className="stat-value">{stats.totalCustomers}</div>
                        <div className="stat-label">Tổng khách hàng</div>
                        <div style={{ fontSize: 11, color: 'var(--status-success)', marginTop: 2 }}>
                            +{stats.newCustomersThisMonth} tháng này
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div>
                        <div className="stat-value">{stats.totalQuotations}</div>
                        <div className="stat-label">Báo giá (năm)</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {fmtShort(stats.quotationValue)} VNĐ
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div>
                        <div className="stat-value">{stats.totalContracts}</div>
                        <div className="stat-label">Hợp đồng (năm)</div>
                        <div style={{ fontSize: 11, color: 'var(--status-success)', marginTop: 2 }}>
                            {fmtShort(stats.contractValue)} VNĐ
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔔</div>
                    <div>
                        <div className="stat-value" style={{ color: upcomingFollowUps.length > 0 ? 'var(--status-warning)' : 'inherit' }}>
                            {upcomingFollowUps.length}
                        </div>
                        <div className="stat-label">Follow-up sắp tới</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>7 ngày tới</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                {/* Pipeline funnel */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Pipeline khách hàng</h3>
                        <a href="/pipeline" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem Kanban →</a>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        {sortedPipeline.map(({ stage, count }) => {
                            const c = PIPELINE_COLORS[stage] || { color: '#6b7280', bg: '#f3f4f6' };
                            const pct = totalPipeline > 0 ? Math.round(count / totalPipeline * 100) : 0;
                            return (
                                <div key={stage} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block' }}></span>
                                            {stage}
                                        </span>
                                        <span style={{ fontWeight: 600, color: c.color }}>{count}</span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: c.color, borderRadius: 3, transition: 'width 0.5s' }}></div>
                                    </div>
                                </div>
                            );
                        })}
                        {sortedPipeline.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 13 }}>
                                Chưa có dữ liệu pipeline
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming follow-ups */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3>Follow-up sắp tới</h3>
                        <a href="/customers" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
                    </div>
                    {upcomingFollowUps.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 13 }}>
                            Không có follow-up nào sắp tới ✓
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
                            {upcomingFollowUps.map(c => {
                                const col = PIPELINE_COLORS[c.pipelineStage] || { color: '#6b7280', bg: '#f3f4f6' };
                                const followDate = new Date(c.nextFollowUp);
                                const isToday = followDate.toDateString() === new Date().toDateString();
                                return (
                                    <a key={c.id} href={`/customers/${c.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)', textDecoration: 'none', color: 'inherit', border: '1px solid var(--border-light)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone} · {c.salesPerson || 'Chưa giao'}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ padding: '2px 8px', borderRadius: 20, background: col.bg, color: col.color, fontSize: 11, fontWeight: 600 }}>{c.pipelineStage}</span>
                                            <div style={{ fontSize: 11, color: isToday ? 'var(--status-danger)' : 'var(--text-muted)', marginTop: 4, fontWeight: isToday ? 700 : 400 }}>
                                                {isToday ? '⚡ Hôm nay' : fmtDate(c.nextFollowUp)}
                                            </div>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent customers */}
            <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>Khách hàng mới nhất</h3>
                    <a href="/customers" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Xem tất cả →</a>
                </div>

                {/* Desktop */}
                <div className="desktop-table-view">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Khách hàng</th>
                                    <th>SĐT</th>
                                    <th>Pipeline</th>
                                    <th>Nguồn</th>
                                    <th>Sales</th>
                                    <th>Giá trị dự kiến</th>
                                    <th>Ngày tạo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentCustomers.map(c => {
                                    const col = PIPELINE_COLORS[c.pipelineStage] || { color: '#6b7280', bg: '#f3f4f6' };
                                    return (
                                        <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} style={{ cursor: 'pointer' }}>
                                            <td className="primary">
                                                <div style={{ fontWeight: 600 }}>{c.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.code}</div>
                                            </td>
                                            <td>{c.phone}</td>
                                            <td>
                                                <span style={{ padding: '2px 8px', borderRadius: 20, background: col.bg, color: col.color, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {c.pipelineStage}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 12 }}>{c.source || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{c.salesPerson || '—'}</td>
                                            <td style={{ fontSize: 12, fontWeight: 600 }}>{c.estimatedValue > 0 ? fmtShort(c.estimatedValue) : '—'}</td>
                                            <td style={{ fontSize: 12 }}>{fmtDate(c.createdAt)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Mobile */}
                <div className="mobile-card-list">
                    {recentCustomers.map(c => {
                        const col = PIPELINE_COLORS[c.pipelineStage] || { color: '#6b7280', bg: '#f3f4f6' };
                        return (
                            <div key={c.id} className="mobile-card-item" onClick={() => router.push(`/customers/${c.id}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                    <div>
                                        <div className="card-title">{c.name}</div>
                                        <div className="card-subtitle">{c.phone} · {c.source || 'Không rõ nguồn'}</div>
                                    </div>
                                    <span style={{ padding: '2px 8px', borderRadius: 20, background: col.bg, color: col.color, fontSize: 11, fontWeight: 600 }}>
                                        {c.pipelineStage}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                                    <span>{c.salesPerson || 'Chưa giao'}</span>
                                    <span>{fmtDate(c.createdAt)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
