'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n) return '0';
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}tỷ`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(0)}tr`;
    return new Intl.NumberFormat('vi-VN').format(n);
};

const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];
const BUCKETS = ['0–30', '31–60', '61–90', '>90'];
const BUCKET_COLORS = ['var(--status-success)', 'var(--accent-primary)', 'var(--status-warning)', 'var(--status-danger)'];
const BUCKET_LABELS = { '0–30': '0–30 ngày', '31–60': '31–60 ngày', '61–90': '61–90 ngày', '>90': '>90 ngày' };

function AgingBar({ aging, total }) {
    if (!total) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</div>;
    return (
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1, minWidth: 80 }}>
            {BUCKETS.map((b, i) => {
                const pct = total ? ((aging[b] || 0) / total) * 100 : 0;
                return pct > 0 ? (
                    <div key={b} title={`${BUCKET_LABELS[b]}: ${fmt(aging[b])}`}
                        style={{ flex: pct, background: BUCKET_COLORS[i], minWidth: 3 }} />
                ) : null;
            })}
        </div>
    );
}

export default function ReportsPage() {
    const router = useRouter();
    const { role } = useRole();
    const canSeeFinance = FINANCE_ROLES.includes(role);
    const [tab, setTab] = useState('overview');
    const [debt, setDebt] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/reports/debt').then(r => r.ok ? r.json() : null).catch(() => null),
            fetch('/api/reports/projects').then(r => r.ok ? r.json() : []).catch(() => []),
        ]).then(([d, p]) => {
            setDebt(d);
            setProjects(p || []);
            setLoading(false);
        });
    }, []);

    if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải báo cáo...</div>;

    const totalPayable = (debt?.supplierTotal || 0) + (debt?.contractorTotal || 0);
    const totalReceivable = projects.reduce((s, p) => s + Math.max(0, (p.contractValue || 0) - (p.paidAmount || 0)), 0);
    const activeProjects = projects.filter(p => !['Bàn giao', 'Hủy'].includes(p.status)).length;

    const TABS = [
        { key: 'overview', label: '🗺️ Tổng quan' },
        ...(canSeeFinance ? [
            { key: 'supplier_debt', label: '🏭 Công nợ NCC' },
            { key: 'contractor_debt', label: '👷 Công nợ thầu' },
        ] : []),
        { key: 'projects', label: '🏗️ Thu chi dự án' },
    ];

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📈 Báo cáo & Thống kê</h1>
                    <p>Dữ liệu thực từ hệ thống — công nợ, dự án, tài chính</p>
                </div>
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Dự án hoạt động', value: `${activeProjects}`, color: 'var(--accent-primary)', icon: '🏗️' },
                    canSeeFinance && { label: 'Phải thu KH', value: fmtShort(totalReceivable), color: 'var(--status-success)', icon: '💰' },
                    canSeeFinance && { label: 'Phải trả NCC', value: fmtShort(debt?.supplierTotal), color: 'var(--status-warning)', icon: '🏭' },
                    canSeeFinance && { label: 'Phải trả thầu', value: fmtShort(debt?.contractorTotal), color: 'var(--status-danger)', icon: '👷' },
                    canSeeFinance && { label: 'Tổng phải trả', value: fmtShort(totalPayable), color: 'var(--status-danger)', icon: '📊' },
                ].filter(Boolean).map(k => (
                    <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{k.icon}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="card">
                <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', paddingLeft: 16 }}>
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{ padding: '10px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', borderBottom: tab === t.key ? '3px solid var(--accent-primary)' : '3px solid transparent', background: 'none', color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', transition: '0.2s' }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab: Tổng quan */}
                {tab === 'overview' && (
                    <div style={{ padding: 24 }}>
                        {canSeeFinance && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 20 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🏭 Phân kỳ nợ NCC</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-warning)', marginBottom: 10 }}>{fmt(debt?.supplierTotal)}</div>
                                    <AgingBar aging={debt?.supplierAging || {}} total={debt?.supplierTotal || 0} />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                                        {BUCKETS.filter(b => (debt?.supplierAging?.[b] || 0) > 0).map(b => (
                                            <div key={b}>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{BUCKET_LABELS[b]}</div>
                                                <div style={{ fontWeight: 600, fontSize: 12, color: BUCKET_COLORS[BUCKETS.indexOf(b)] }}>{fmtShort(debt?.supplierAging?.[b])}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 20 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>👷 Phân kỳ nợ thầu</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-danger)', marginBottom: 10 }}>{fmt(debt?.contractorTotal)}</div>
                                    <AgingBar aging={debt?.contractorAging || {}} total={debt?.contractorTotal || 0} />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
                                        {BUCKETS.filter(b => (debt?.contractorAging?.[b] || 0) > 0).map(b => (
                                            <div key={b}>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{BUCKET_LABELS[b]}</div>
                                                <div style={{ fontWeight: 600, fontSize: 12, color: BUCKET_COLORS[BUCKETS.indexOf(b)] }}>{fmtShort(debt?.contractorAging?.[b])}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: canSeeFinance ? 24 : 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🏗️ Tình trạng dự án</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                {Object.entries(
                                    projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {})
                                ).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                                    <div key={status} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 18px', textAlign: 'center', cursor: 'pointer' }}
                                        onClick={() => router.push(`/projects?status=${encodeURIComponent(status)}`)}>
                                        <div style={{ fontSize: 22, fontWeight: 700 }}>{count}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{status}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {canSeeFinance && debt?.topSuppliers?.length > 0 && (
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🔝 Top NCC nợ nhiều nhất</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {debt.topSuppliers.slice(0, 5).map(s => (
                                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--accent-primary)' }}
                                                    onClick={() => router.push(`/partners/suppliers/${s.id}`)}>{s.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.code} · {s.type}</div>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: 140 }}>
                                                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--status-danger)', marginBottom: 4 }}>{fmt(s.totalDebt)}</div>
                                                <AgingBar aging={s.aging} total={s.totalDebt} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Công nợ NCC */}
                {tab === 'supplier_debt' && canSeeFinance && (
                    <div>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Tổng nợ NCC:</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--status-danger)' }}>{fmt(debt?.supplierTotal)}</span>
                            {BUCKETS.filter(b => (debt?.supplierAging?.[b] || 0) > 0).map(b => (
                                <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{BUCKET_LABELS[b]}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: BUCKET_COLORS[BUCKETS.indexOf(b)] }}>{fmt(debt?.supplierAging?.[b])}</div>
                                </div>
                            ))}
                        </div>
                        {!debt?.topSuppliers?.length ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có NCC tồn nợ ✅</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr>
                                        <th>NCC</th><th>Loại</th>
                                        <th style={{ textAlign: 'right' }}>Tổng nợ</th>
                                        <th>Phân kỳ</th>
                                        {BUCKETS.map(b => <th key={b} style={{ textAlign: 'right', fontSize: 11 }}>{BUCKET_LABELS[b]}</th>)}
                                        <th></th>
                                    </tr></thead>
                                    <tbody>
                                        {debt.topSuppliers.map(s => (
                                            <tr key={s.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.code}</div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{s.type}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)', fontSize: 13 }}>{fmt(s.totalDebt)}</td>
                                                <td style={{ minWidth: 100 }}><AgingBar aging={s.aging} total={s.totalDebt} /></td>
                                                {BUCKETS.map((b, i) => (
                                                    <td key={b} style={{ textAlign: 'right', fontSize: 12, color: (s.aging[b] || 0) > 0 ? BUCKET_COLORS[i] : 'var(--text-muted)' }}>
                                                        {(s.aging[b] || 0) > 0 ? fmtShort(s.aging[b]) : '—'}
                                                    </td>
                                                ))}
                                                <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/partners/suppliers/${s.id}`)}>Xem →</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Công nợ thầu */}
                {tab === 'contractor_debt' && canSeeFinance && (
                    <div>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Tổng nợ thầu:</span>
                            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--status-danger)' }}>{fmt(debt?.contractorTotal)}</span>
                            {BUCKETS.filter(b => (debt?.contractorAging?.[b] || 0) > 0).map(b => (
                                <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{BUCKET_LABELS[b]}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: BUCKET_COLORS[BUCKETS.indexOf(b)] }}>{fmt(debt?.contractorAging?.[b])}</div>
                                </div>
                            ))}
                        </div>
                        {!debt?.topContractors?.length ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có thầu phụ tồn nợ ✅</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0 }}>
                                    <thead><tr>
                                        <th>Thầu phụ</th><th>Loại</th>
                                        <th style={{ textAlign: 'right' }}>Tổng nợ</th>
                                        <th>Phân kỳ</th>
                                        {BUCKETS.map(b => <th key={b} style={{ textAlign: 'right', fontSize: 11 }}>{BUCKET_LABELS[b]}</th>)}
                                        <th></th>
                                    </tr></thead>
                                    <tbody>
                                        {debt.topContractors.map(c => (
                                            <tr key={c.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.code}</div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{c.type}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-danger)', fontSize: 13 }}>{fmt(c.totalDebt)}</td>
                                                <td style={{ minWidth: 100 }}><AgingBar aging={c.aging} total={c.totalDebt} /></td>
                                                {BUCKETS.map((b, i) => (
                                                    <td key={b} style={{ textAlign: 'right', fontSize: 12, color: (c.aging[b] || 0) > 0 ? BUCKET_COLORS[i] : 'var(--text-muted)' }}>
                                                        {(c.aging[b] || 0) > 0 ? fmtShort(c.aging[b]) : '—'}
                                                    </td>
                                                ))}
                                                <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/partners/contractors/${c.id}`)}>Xem →</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Thu chi dự án */}
                {tab === 'projects' && (
                    <div style={{ overflowX: 'auto' }}>
                        {!projects.length ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</div>
                        ) : (
                            <table className="data-table" style={{ margin: 0 }}>
                                <thead><tr>
                                    <th>Dự án</th>
                                    <th>Trạng thái</th>
                                    {canSeeFinance && <>
                                        <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                                        <th style={{ textAlign: 'right' }}>Đã thu</th>
                                        <th style={{ textAlign: 'right' }}>Còn thu</th>
                                        <th style={{ textAlign: 'right' }}>Chi thầu</th>
                                        <th style={{ textAlign: 'right' }}>Chi VT</th>
                                        <th style={{ textAlign: 'right' }}>Tổng chi</th>
                                    </>}
                                    <th></th>
                                </tr></thead>
                                <tbody>
                                    {projects.map(p => {
                                        const receivable = Math.max(0, (p.contractValue || 0) - (p.paidAmount || 0));
                                        const totalCost = (p.contractorCost || 0) + (p.poCost || 0);
                                        return (
                                            <tr key={p.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.code} · {p.customer?.name}</div>
                                                </td>
                                                <td><span className={`badge ${p.status === 'Bàn giao' ? 'success' : p.status === 'Thi công' ? 'info' : 'muted'}`}>{p.status}</span></td>
                                                {canSeeFinance && <>
                                                    <td style={{ textAlign: 'right', fontSize: 12 }}>{p.contractValue > 0 ? fmt(p.contractValue) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--status-success)' }}>{p.paidAmount > 0 ? fmt(p.paidAmount) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: receivable > 0 ? 'var(--status-warning)' : 'var(--text-muted)' }}>{receivable > 0 ? fmt(receivable) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{p.contractorCost > 0 ? fmt(p.contractorCost) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{p.poCost > 0 ? fmt(p.poCost) : '—'}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: totalCost > 0 ? 'var(--status-danger)' : 'var(--text-muted)' }}>{totalCost > 0 ? fmt(totalCost) : '—'}</td>
                                                </>}
                                                <td><button className="btn btn-ghost btn-sm" onClick={() => router.push(`/projects/${p.id}`)}>Xem →</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {canSeeFinance && (
                                    <tfoot>
                                        <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                            <td colSpan={2} style={{ textAlign: 'right', fontSize: 13 }}>Tổng cộng</td>
                                            <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(projects.reduce((s, p) => s + (p.contractValue || 0), 0))}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-success)' }}>{fmt(projects.reduce((s, p) => s + (p.paidAmount || 0), 0))}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-warning)' }}>{fmt(totalReceivable)}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(projects.reduce((s, p) => s + (p.contractorCost || 0), 0))}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(projects.reduce((s, p) => s + (p.poCost || 0), 0))}</td>
                                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--status-danger)' }}>{fmt(projects.reduce((s, p) => s + (p.contractorCost || 0) + (p.poCost || 0), 0))}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
