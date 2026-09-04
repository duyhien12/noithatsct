'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const today = () => new Date().toISOString().slice(0, 10);

export default function ProjectCostsPage() {
    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [dashboard, setDashboard] = useState({ totalBudget: 0, totalChi: 0, totalThu: 0, overBudgetCount: 0 });
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({ search: '', status: '', overBudget: '' });
    const [searchInput, setSearchInput] = useState('');
    const [openProjectId, setOpenProjectId] = useState(null);
    const [view, setView] = useState('summary'); // 'summary' | 'detail'
    const [projectOptions, setProjectOptions] = useState([]);

    useEffect(() => {
        fetch('/api/projects?limit=500').then(r => r.json()).then(d => setProjectOptions(d.data || [])).catch(() => {});
    }, []);

    const fetchRows = useCallback(async (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('page', String(page));
        params.set('limit', String(pagination.limit));
        const res = await fetch(`/api/project-costs?${params}`).then(r => r.json()).catch(() => null);
        if (res) {
            setRows(res.data || []);
            setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
            setDashboard(res.dashboard || {});
        }
        setLoading(false);
    }, [filters, pagination.limit]);

    useEffect(() => { fetchRows(1); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setTimeout(() => setFilters(f => ({ ...f, search: searchInput })), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const clearFilters = () => { setFilters({ search: '', status: '', overBudget: '' }); setSearchInput(''); };

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('limit', '1000');
        const res = await fetch(`/api/project-costs?${params}`).then(r => r.json());
        const sheetRows = (res.data || []).map((r, i) => ({
            'STT': i + 1, 'Mã DA': r.code, 'Tên dự án': r.name, 'Khách hàng': r.customerName, 'Trạng thái': r.status,
            'Dự toán': r.budgetTotal, 'Giá trị HĐ': r.contractValue,
            'Tổng đã chi (Thu-Chi)': r.totalChi, 'Tổng đã thu (Thu-Chi)': r.totalThu,
            '% Dự toán': r.usagePercent, 'Lợi nhuận dự kiến': r.estimatedProfit,
        }));
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tong chi phi cong trinh');
        XLSX.writeFile(wb, `tong-chi-phi-cong-trinh-${today()}.xlsx`);
    };

    return (
        <div>
            <div style={{
                position: 'sticky', top: 'var(--header-height)', zIndex: 50,
                background: 'var(--bg-primary)', padding: '12px 0', margin: '-12px 0 4px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>🏗️ Tổng chi phí công trình</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Xuất Excel</button>
                </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                ℹ️ &quot;Tổng đã chi&quot; / &quot;Tổng đã thu&quot; lấy trực tiếp từ Nhật ký Thu – Chi (giao dịch có gắn dự án này), không lấy từ Mua sắm vật tư/Thanh toán thầu phụ/Chi phí dự án. Bấm vào 1 dòng để xem chi tiết giao dịch.
            </div>

            <DashboardCards dashboard={dashboard} />

            <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
                {[{ key: 'summary', label: 'Theo dự án' }, { key: 'detail', label: 'Chi tiết giao dịch' }].map(t => (
                    <button key={t.key} onClick={() => setView(t.key)} className="btn btn-ghost btn-sm"
                        style={{ borderRadius: '6px 6px 0 0', borderBottom: view === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent', fontWeight: view === t.key ? 700 : 400 }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {view === 'summary' ? (
                <>
                    <FilterBar filters={filters} setFilters={setFilters} searchInput={searchInput} setSearchInput={setSearchInput}
                        onClear={clearFilters} count={pagination.total} />

                    <ProjectTable rows={rows} loading={loading} onOpen={(id) => setOpenProjectId(id)} />

                    {pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                            <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchRows(pagination.page - 1)}>← Trước</button>
                            <span style={{ fontSize: 13, alignSelf: 'center' }}>Trang {pagination.page}/{pagination.totalPages}</span>
                            <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRows(pagination.page + 1)}>Sau →</button>
                        </div>
                    )}
                </>
            ) : (
                <DetailTransactionsView projectOptions={projectOptions} />
            )}

            {openProjectId && (
                <ProjectCostDetailModal projectId={openProjectId} onClose={() => setOpenProjectId(null)} />
            )}
        </div>
    );
}

function DashboardCards({ dashboard }) {
    const cards = [
        { label: 'Tổng dự toán', value: dashboard.totalBudget, color: 'var(--accent-primary)', bg: 'rgba(59, 130, 246, 0.12)', icon: '📐' },
        { label: 'Tổng đã chi', value: dashboard.totalChi, color: 'var(--status-danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: '💸' },
        { label: 'Tổng đã thu', value: dashboard.totalThu, color: 'var(--status-success)', bg: 'rgba(52, 211, 153, 0.12)', icon: '💰' },
        { label: 'Dự án vượt dự toán', value: dashboard.overBudgetCount, isCount: true, color: 'var(--status-danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: '⚠️' },
    ];
    return (
        <div className="stats-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            {cards.map(c => (
                <div className="stat-card" key={c.label}>
                    <div className="stat-icon" style={{ fontSize: 20, width: 40, height: 40, minWidth: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: c.color }}>{c.isCount ? (c.value || 0) : `${fmt(c.value)} đ`}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function FilterBar({ filters, setFilters, searchInput, setSearchInput, onClear, count }) {
    const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
                <input className="form-input search-input" placeholder="🔍 Tìm mã DA, tên dự án, khách hàng..."
                    value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
                <select className="form-select" value={filters.overBudget} onChange={e => set('overBudget', e.target.value)}>
                    <option value="">Mọi dự án</option>
                    <option value="1">Chỉ dự án vượt dự toán</option>
                </select>
                <button className="btn btn-ghost btn-sm" onClick={onClear}>✕ Xóa lọc</button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{count} dự án</div>
            </div>
        </div>
    );
}

function UsageBar({ percent }) {
    if (percent == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    const color = percent > 100 ? 'var(--status-danger)' : percent > 85 ? 'var(--status-warning)' : 'var(--status-success)';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--border-light)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, percent)}%`, height: '100%', background: color }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color }}>{percent}%</span>
        </div>
    );
}

function ProjectTable({ rows, loading, onOpen }) {
    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
    if (rows.length === 0) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu</div>;

    return (
        <div className="card">
            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                    <thead>
                        <tr>
                            <th>#</th><th>Dự án</th><th>Khách hàng</th>
                            <th style={{ textAlign: 'right' }}>Dự toán</th>
                            <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                            <th style={{ textAlign: 'right' }}>Tổng đã chi</th>
                            <th style={{ textAlign: 'right' }}>Tổng đã thu</th>
                            <th>% Dự toán</th>
                            <th style={{ textAlign: 'right' }}>LN dự kiến</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.projectId} onClick={() => onOpen(r.projectId)} style={{ cursor: 'pointer' }}>
                                <td>{i + 1}</td>
                                <td><strong>{r.code}</strong> — {r.name}</td>
                                <td>{r.customerName}</td>
                                <td style={{ textAlign: 'right' }}>{fmt(r.budgetTotal)}</td>
                                <td style={{ textAlign: 'right' }}>{fmt(r.contractValue)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-danger)', fontWeight: 600 }}>{fmt(r.totalChi)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmt(r.totalThu)}</td>
                                <td><UsageBar percent={r.usagePercent} /></td>
                                <td style={{ textAlign: 'right', color: r.estimatedProfit < 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 600 }}>{fmt(r.estimatedProfit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
// Bảng phẳng: từng giao dịch Thu/Chi đã gắn Dự án trong Nhật ký Thu – Chi, không cần bấm vào
// từng dự án. Giao dịch chưa chọn "Dự án/Công trình" khi nhập phiếu sẽ KHÔNG xuất hiện ở đây.
function DetailTransactionsView({ projectOptions }) {
    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', from: '', to: '', projectId: '', type: '' });
    const [searchInput, setSearchInput] = useState('');

    const fetchRows = useCallback(async (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('page', String(page));
        params.set('limit', String(pagination.limit));
        const res = await fetch(`/api/project-costs/transactions?${params}`).then(r => r.json()).catch(() => null);
        if (res) {
            setRows(res.data || []);
            setPagination(res.pagination || { page: 1, limit: 30, total: 0, totalPages: 1 });
        }
        setLoading(false);
    }, [filters, pagination.limit]);

    useEffect(() => { fetchRows(1); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setTimeout(() => setFilters(f => ({ ...f, search: searchInput })), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
    const clearFilters = () => { setFilters({ search: '', from: '', to: '', projectId: '', type: '' }); setSearchInput(''); };

    return (
        <div>
            <div className="card" style={{ marginBottom: 16 }}>
                <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
                    <input className="form-input search-input" placeholder="🔍 Tìm nội dung, đối tượng, dự án..."
                        value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                    <input className="form-input" type="date" value={filters.from} onChange={e => set('from', e.target.value)} title="Từ ngày" />
                    <input className="form-input" type="date" value={filters.to} onChange={e => set('to', e.target.value)} title="Đến ngày" />
                    <select className="form-select" value={filters.projectId} onChange={e => set('projectId', e.target.value)}>
                        <option value="">Mọi dự án</option>
                        {projectOptions.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                    </select>
                    <select className="form-select" value={filters.type} onChange={e => set('type', e.target.value)}>
                        <option value="">Thu &amp; Chi</option>
                        <option value="Chi">Chỉ Chi</option>
                        <option value="Thu">Chỉ Thu</option>
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Xóa lọc</button>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{pagination.total} giao dịch</div>
                </div>
            </div>

            <div className="card">
                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                        <thead>
                            <tr>
                                <th>Ngày</th><th>Số phiếu</th><th>Dự án</th><th>Nội dung</th><th>Đối tượng</th><th>Phòng ban</th>
                                <th style={{ textAlign: 'right' }}>Thu</th><th style={{ textAlign: 'right' }}>Chi</th><th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30 }}>Đang tải...</td></tr>}
                            {!loading && rows.length === 0 && (
                                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                                    Chưa có giao dịch nào được gắn Dự án — khi tạo phiếu Thu-Chi, chọn Dự án/Công trình để phiếu hiện ở đây.
                                </td></tr>
                            )}
                            {!loading && rows.map(t => (
                                <tr key={t.id}>
                                    <td>{fmtDate(t.date)}</td>
                                    <td>{t.code}</td>
                                    <td>{t.project ? `${t.project.code} — ${t.project.name}` : '—'}</td>
                                    <td>{t.content}</td>
                                    <td>{t.objectName ? `${t.objectType}: ${t.objectName}` : (t.objectType || '—')}</td>
                                    <td>{t.department || '—'}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{t.type === 'Thu' ? fmt(t.amount) : ''}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{t.type === 'Chi' ? fmt(t.amount) : ''}</td>
                                    <td>{t.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchRows(pagination.page - 1)}>← Trước</button>
                    <span style={{ fontSize: 13, alignSelf: 'center' }}>Trang {pagination.page}/{pagination.totalPages}</span>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRows(pagination.page + 1)}>Sau →</button>
                </div>
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function ProjectCostDetailModal({ projectId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        setLoading(true);
        fetch(`/api/project-costs/${projectId}`).then(r => r.json()).then(setData).finally(() => setLoading(false));
    }, [projectId]);

    if (loading || !data) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, padding: 40, textAlign: 'center' }}>Đang tải...</div>
            </div>
        );
    }
    if (data.error) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 40, textAlign: 'center' }}>{data.error}</div>
            </div>
        );
    }

    const { project, summary, byDepartment, byObjectType, transactions } = data;
    const tabs = [
        { key: 'overview', label: 'Tổng quan' },
        { key: 'transactions', label: `Chi tiết giao dịch (${transactions.length})` },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 1000, width: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                        <h2>{project.code} — {project.name}</h2>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{project.customerName} · {project.status}</div>
                    </div>
                    <button className="btn btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="stats-grid" style={{ margin: '16px 0', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    <MiniStat label="Dự toán" value={summary.budgetTotal} />
                    <MiniStat label="Giá trị HĐ" value={summary.contractValue} />
                    <MiniStat label="Tổng đã chi" value={summary.totalChi} color="var(--status-danger)" bold />
                    <MiniStat label="Tổng đã thu" value={summary.totalThu} color="var(--status-success)" />
                    <MiniStat label="LN dự kiến" value={summary.estimatedProfit} color={summary.estimatedProfit < 0 ? 'var(--status-danger)' : 'var(--status-success)'} bold />
                </div>

                <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--border-light)' }}>
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`btn btn-ghost btn-sm`}
                            style={{ borderRadius: '6px 6px 0 0', borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent', fontWeight: tab === t.key ? 700 : 400 }}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Chi phí theo phòng ban</div>
                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                                    <thead><tr><th>Phòng ban</th><th style={{ textAlign: 'right' }}>Đã chi</th><th style={{ textAlign: 'right' }}>Số phiếu</th></tr></thead>
                                    <tbody>
                                        {byDepartment.map(d => (
                                            <tr key={d.department}>
                                                <td>{d.department}</td>
                                                <td style={{ textAlign: 'right' }}>{fmt(d.total)}</td>
                                                <td style={{ textAlign: 'right' }}>{d.count}</td>
                                            </tr>
                                        ))}
                                        {byDepartment.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chưa có chi phí</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Chi phí theo đối tượng</div>
                            <div className="table-container" style={{ overflowX: 'auto' }}>
                                <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                                    <thead><tr><th>Đối tượng</th><th style={{ textAlign: 'right' }}>Đã chi</th><th style={{ textAlign: 'right' }}>Số phiếu</th></tr></thead>
                                    <tbody>
                                        {byObjectType.map(o => (
                                            <tr key={o.objectType}>
                                                <td>{o.objectType}</td>
                                                <td style={{ textAlign: 'right' }}>{fmt(o.total)}</td>
                                                <td style={{ textAlign: 'right' }}>{o.count}</td>
                                            </tr>
                                        ))}
                                        {byObjectType.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chưa có chi phí</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'transactions' && (
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th>Ngày</th><th>Số phiếu</th><th>Nội dung</th><th>Phòng ban</th><th>Đối tượng</th>
                                    <th style={{ textAlign: 'right' }}>Thu</th><th style={{ textAlign: 'right' }}>Chi</th><th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(t => (
                                    <tr key={t.id}>
                                        <td>{fmtDate(t.date)}</td>
                                        <td>{t.code}</td>
                                        <td>{t.content}{t.objectName ? ` — ${t.objectName}` : ''}</td>
                                        <td>{t.department || '—'}</td>
                                        <td>{t.objectType || '—'}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{t.type === 'Thu' ? fmt(t.amount) : ''}</td>
                                        <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{t.type === 'Chi' ? fmt(t.amount) : ''}</td>
                                        <td>{t.status}</td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chưa có giao dịch nào gắn dự án này</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function MiniStat({ label, value, color, bold }) {
    return (
        <div className="stat-card">
            <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: bold ? 800 : 700, color: color || 'var(--text-primary)' }}>{fmt(value)} đ</div>
            </div>
        </div>
    );
}
