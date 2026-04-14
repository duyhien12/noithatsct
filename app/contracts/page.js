'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
const TYPE_COLORS = { 'Thiết kế kiến trúc': 'info', 'Thiết kế nội thất': 'purple', 'Thi công thô': 'warning', 'Thi công hoàn thiện': 'success', 'Thi công nội thất': 'accent' };
const TYPE_ICONS = { 'Thiết kế kiến trúc': '📐', 'Thiết kế nội thất': '🎨', 'Thi công thô': '🧱', 'Thi công hoàn thiện': '🏠', 'Thi công nội thất': '🪑' };

export default function ContractsPage() {
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const router = useRouter();
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === 'loading') return;
        if (session?.user?.role === 'xuong') { router.replace('/'); return; }
        fetch('/api/contracts?limit=1000').then(r => r.json()).then(d => { setContracts(d.data || []); setLoading(false); });
    }, [session, status]);

    if (status === 'loading' || session?.user?.role === 'xuong') return null;

    const filtered = contracts.filter(c => {
        if (filterType && c.type !== filterType) return false;
        if (filterStatus && c.status !== filterStatus) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalValue = contracts.reduce((s, c) => s + c.contractValue, 0);
    const totalPaid = contracts.reduce((s, c) => s + c.paidAmount, 0);
    const totalDebt = totalValue - totalPaid;
    const activeCount = contracts.filter(c => c.status === 'Đang thực hiện').length;

    // Group by type for summary
    const typeGroups = ['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Thi công thô', 'Thi công hoàn thiện', 'Thi công nội thất'].map(type => ({
        type,
        icon: TYPE_ICONS[type],
        count: contracts.filter(c => c.type === type).length,
        value: contracts.filter(c => c.type === type).reduce((s, c) => s + c.contractValue, 0),
    }));

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon revenue">📝</span></div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{contracts.length}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng hợp đồng</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon projects">🔨</span></div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{activeCount}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang thực hiện</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon customers">💰</span></div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--status-success)' }}>{fmt(totalValue)}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tổng giá trị HĐ</div></div>
                <div className="stat-card"><div className="stat-card-header"><span className="stat-card-icon quotations">💵</span></div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 8 }}>{fmt(totalPaid)}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đã thu</div></div>
                <div className="stat-card"><div style={{ fontSize: 24, fontWeight: 700, color: totalDebt > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{fmt(totalDebt)}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Công nợ</div></div>
            </div>

            {/* Type summary cards */}
            <div className="contract-type-grid">
                {typeGroups.map(g => (
                    <div key={g.type} className="stat-card contract-type-card" onClick={() => setFilterType(filterType === g.type ? '' : g.type)} style={{ cursor: 'pointer', border: filterType === g.type ? '2px solid var(--accent-primary)' : undefined, transition: 'border 0.2s' }}>
                        <div style={{ fontSize: 18 }}>{g.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>{g.type}</div>
                        <div style={{ marginTop: 6 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.count} HĐ</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: g.value > 0 ? 'var(--status-success)' : 'var(--text-muted)', marginTop: 2, wordBreak: 'break-all' }}>{fmt(g.value)}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header"><span className="card-title">Danh sách hợp đồng</span><button className="btn btn-primary" onClick={() => router.push('/contracts/create')}>➕ Tạo hợp đồng</button></div>
                <div className="filter-bar">
                    <input type="text" className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">Tất cả loại</option>
                        <option>Thiết kế kiến trúc</option><option>Thiết kế nội thất</option><option>Thi công thô</option><option>Thi công hoàn thiện</option><option>Thi công nội thất</option>
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả TT</option><option>Nháp</option><option>Đã ký</option><option>Đang thực hiện</option><option>Hoàn thành</option>
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (<>
                    <div className="desktop-table-view">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã HĐ</th><th>Tên</th><th>Khách hàng</th><th>Dự án</th><th>Loại</th><th>Giá trị</th><th>Đã thu</th><th>Tỷ lệ</th><th>Đợt TT</th><th>Trạng thái</th></tr></thead>
                            <tbody>{filtered.map(c => {
                                const rate = pct(c.paidAmount, c.contractValue);
                                return (
                                    <tr key={c.id} onClick={() => router.push(`/contracts/${c.id}`)} style={{ cursor: 'pointer' }}>
                                        <td className="accent">{c.code}</td>
                                        <td className="primary">{c.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ký: {fmtDate(c.signDate)}</div></td>
                                        <td>{c.customer?.name}</td>
                                        <td><span className="badge info">{c.project?.code}</span> {c.project?.name}</td>
                                        <td><span className={`badge ${TYPE_COLORS[c.type] || 'muted'}`}>{TYPE_ICONS[c.type] || ''} {c.type}</span></td>
                                        <td className="amount">{fmt(c.contractValue)}</td>
                                        <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(c.paidAmount)}</td>
                                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div><span style={{ fontSize: 11 }}>{rate}%</span></div></td>
                                        <td><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.payments?.length || 0} đợt</span></td>
                                        <td><span className={`badge ${c.status === 'Hoàn thành' ? 'success' : c.status === 'Đang thực hiện' ? 'warning' : c.status === 'Đã ký' ? 'info' : 'muted'}`}>{c.status}</span></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table></div>
                    </div>
                    <div className="mobile-card-list">
                        {filtered.map(c => {
                            const rate = pct(c.paidAmount, c.contractValue);
                            return (
                                <div key={c.id} className="mobile-card-item" onClick={() => router.push(`/contracts/${c.id}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                                            <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                            <div className="card-subtitle" style={{ marginTop: 2 }}>{c.code} · {c.customer?.name}</div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                            <span className={`badge ${c.status === 'Hoàn thành' ? 'success' : c.status === 'Đang thực hiện' ? 'warning' : c.status === 'Đã ký' ? 'info' : 'muted'}`}>{c.status}</span>
                                            <span className={`badge ${TYPE_COLORS[c.type] || 'muted'}`} style={{ fontSize: 10 }}>{TYPE_ICONS[c.type]} {c.type}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Giá trị HĐ</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(c.contractValue)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã thu</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(c.paidAmount)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div className="progress-bar" style={{ flex: 1, height: 6 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div>
                                        <span style={{ fontSize: 11, fontWeight: 600, minWidth: 32 }}>{rate}%</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.payments?.length || 0} đợt</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>)}
            </div>
        </div>
    );
}
