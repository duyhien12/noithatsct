'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact', maximumFractionDigits: 1 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const STATUS_COLORS = {
    'Thi công': 'var(--status-info)',
    'Thiết kế': 'var(--accent-primary)',
    'Đang thi công': 'var(--status-info)',
    'Hoàn thiện': 'var(--status-warning)',
    'Hoàn thành': 'var(--status-success)',
    'Tạm dừng': 'var(--status-danger)',
    'Chờ khởi công': 'var(--text-muted)',
};

function MonthLabel(month) {
    const [, m] = month.split('-');
    const names = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
    return names[parseInt(m) - 1];
}

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const { role } = useRole();
    const canSeeFinance = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);

    useEffect(() => {
        fetch('/api/dashboard').then(r => r.json()).then(d => { setData(d); setLoading(false); });
    }, []);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, color: 'var(--text-muted)' }}>
            Đang tải dữ liệu...
        </div>
    );

    const s = data.stats;
    const collectionRate = s.totalContractValue > 0 ? Math.round(s.totalPaid / s.totalContractValue * 100) : 0;
    const profit = s.revenue - s.expense;
    const maxCashflow = Math.max(...(data.monthlyCashflow || []).flatMap(m => [m.thu, m.chi]), 1);
    const hasAlerts = data.alerts.overduePayments > 0 || data.alerts.staleWorkOrders > 0;
    const maxProjectCount = Math.max(...data.projectsByStatus.map(x => x._count), 1);

    return (
        <div>
            {/* KPI Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                <div className="stat-card">
                    <div className="stat-icon">🏗️</div>
                    <div>
                        <div className="stat-value">{s.activeProjects}</div>
                        <div className="stat-label">DA đang chạy</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.projects} tổng</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div>
                        <div className="stat-value">{s.customers}</div>
                        <div className="stat-label">Khách hàng</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔧</div>
                    <div>
                        <div className="stat-value">{s.workOrders}</div>
                        <div className="stat-label">Phiếu công việc</div>
                        {s.pendingWorkOrders > 0 && (
                            <div style={{ fontSize: 10, color: 'var(--status-warning)' }}>{s.pendingWorkOrders} chờ xử lý</div>
                        )}
                    </div>
                </div>
                {canSeeFinance && <>
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(s.revenue)}</div>
                            <div className="stat-label">Đã thu</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📥</div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{fmt(s.receivable)}</div>
                            <div className="stat-label">Phải thu KH</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📤</div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--status-danger)' }}>{fmt(s.supplierPayable + s.contractorPayable)}</div>
                            <div className="stat-label">Phải trả</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>NCC + Thầu</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">{profit >= 0 ? '📈' : '📉'}</div>
                        <div>
                            <div className="stat-value" style={{ color: profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmt(profit)}</div>
                            <div className="stat-label">Lợi nhuận</div>
                        </div>
                    </div>
                </>}
            </div>

            {/* Row 2: Finance summary + Alerts/Status */}
            <div style={{ display: 'grid', gridTemplateColumns: canSeeFinance ? '1fr 1fr' : '1fr', gap: 24, marginTop: 24 }}>
                {canSeeFinance && (
                    <div className="card">
                        <div className="card-header"><h3>Tổng quan tài chính</h3></div>
                        <div style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontSize: 13 }}>Doanh thu (đã thu)</span>
                                <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmtFull(s.revenue)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontSize: 13 }}>Chi phí</span>
                                <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>{fmtFull(s.expense)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginBottom: 16, borderTop: '1px solid var(--border-subtle)' }}>
                                <span style={{ fontWeight: 700 }}>Lợi nhuận</span>
                                <span style={{ color: profit >= 0 ? 'var(--status-success)' : 'var(--status-danger)', fontWeight: 700 }}>{fmtFull(profit)}</span>
                            </div>
                            <div style={{ paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng giá trị HĐ</span>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{fmtFull(s.totalContractValue)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thu</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-success)' }}>{fmtFull(s.totalPaid)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Còn phải thu KH</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>{fmtFull(s.receivable)}</span>
                                </div>
                                <div className="progress-bar" style={{ marginBottom: 4 }}>
                                    <div className="progress-fill" style={{ width: `${collectionRate}%` }} />
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>Tỷ lệ thu: {collectionRate}%</div>
                            </div>
                            <div style={{ paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phải trả NCC</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-warning)' }}>{fmtFull(s.supplierPayable)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phải trả thầu phụ</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-warning)' }}>{fmtFull(s.contractorPayable)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {hasAlerts && (
                        <div className="card" style={{ borderLeft: '3px solid var(--status-danger)' }}>
                            <div className="card-header"><h3>⚠️ Cảnh báo</h3></div>
                            <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {data.alerts.overduePayments > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)' }}>
                                        <span style={{ fontSize: 18 }}>💸</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-danger)' }}>
                                                {data.alerts.overduePayments} hợp đồng thầu phụ quá hạn thanh toán
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kiểm tra tab Thầu phụ trong từng dự án</div>
                                        </div>
                                    </div>
                                )}
                                {data.alerts.staleWorkOrders > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)' }}>
                                        <span style={{ fontSize: 18 }}>🔧</span>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--status-warning)' }}>
                                                {data.alerts.staleWorkOrders} phiếu công việc chờ xử lý &gt;7 ngày
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cần xử lý sớm</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ flex: 1 }}>
                        <div className="card-header"><h3>Dự án theo trạng thái</h3></div>
                        <div style={{ padding: 20 }}>
                            {data.projectsByStatus.map(ps => (
                                <div key={ps.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[ps.status] || 'var(--text-muted)', flexShrink: 0 }} />
                                        <span style={{ fontSize: 13 }}>{ps.status}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ height: 4, borderRadius: 2, background: STATUS_COLORS[ps.status] || 'var(--text-muted)', opacity: 0.35, width: Math.round(ps._count / maxProjectCount * 60) }} />
                                        <span className="badge badge-info">{ps._count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Cashflow */}
            {canSeeFinance && data.monthlyCashflow && data.monthlyCashflow.length > 0 && (
                <div className="card" style={{ marginTop: 24 }}>
                    <div className="card-header">
                        <h3>Dòng tiền 6 tháng</h3>
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--status-success)' }} /> Thu
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--status-danger)' }} /> Chi
                            </span>
                        </div>
                    </div>
                    <div style={{ padding: '16px 20px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
                            {data.monthlyCashflow.map(m => {
                                const thuH = Math.round((m.thu / maxCashflow) * 100);
                                const chiH = Math.round((m.chi / maxCashflow) * 100);
                                return (
                                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
                                            <div
                                                title={`Thu: ${fmtFull(m.thu)}`}
                                                style={{ flex: 1, height: `${thuH}%`, minHeight: thuH > 0 ? 2 : 0, background: 'var(--status-success)', borderRadius: '3px 3px 0 0', opacity: 0.85 }}
                                            />
                                            <div
                                                title={`Chi: ${fmtFull(m.chi)}`}
                                                style={{ flex: 1, height: `${chiH}%`, minHeight: chiH > 0 ? 2 : 0, background: 'var(--status-danger)', borderRadius: '3px 3px 0 0', opacity: 0.75 }}
                                            />
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>{MonthLabel(m.month)}</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 12, paddingTop: 12, display: 'flex', gap: 32 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng thu 6 tháng</div>
                                <div style={{ fontWeight: 700, color: 'var(--status-success)', fontSize: 14 }}>
                                    {fmtFull(data.monthlyCashflow.reduce((acc, m) => acc + m.thu, 0))}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng chi 6 tháng</div>
                                <div style={{ fontWeight: 700, color: 'var(--status-danger)', fontSize: 14 }}>
                                    {fmtFull(data.monthlyCashflow.reduce((acc, m) => acc + m.chi, 0))}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chênh lệch</div>
                                {(() => {
                                    const diff = data.monthlyCashflow.reduce((acc, m) => acc + m.thu - m.chi, 0);
                                    return <div style={{ fontWeight: 700, fontSize: 14, color: diff >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmtFull(diff)}</div>;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Projects */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header"><h3>Dự án gần đây</h3></div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã DA</th>
                                <th>Tên dự án</th>
                                <th>Khách hàng</th>
                                {canSeeFinance && <th>Ngân sách</th>}
                                <th>Tiến độ</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.recentProjects.map(p => (
                                <tr key={p.id} onClick={() => window.location.href = `/projects/${p.id}`} style={{ cursor: 'pointer' }}>
                                    <td className="accent">{p.code}</td>
                                    <td className="primary">{p.name}</td>
                                    <td>{p.customer?.name}</td>
                                    {canSeeFinance && <td>{fmtFull(p.budget || 0)}</td>}
                                    <td>
                                        <div className="progress-bar" style={{ marginBottom: 2 }}>
                                            <div className="progress-fill" style={{ width: `${p.progress || 0}%` }} />
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.progress || 0}%</span>
                                    </td>
                                    <td>
                                        <span className="badge badge-info" style={{
                                            background: `${STATUS_COLORS[p.status] || 'var(--text-muted)'}22`,
                                            color: STATUS_COLORS[p.status] || 'var(--text-muted)',
                                            border: `1px solid ${STATUS_COLORS[p.status] || 'var(--text-muted)'}44`,
                                        }}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
