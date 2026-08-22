'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getFinancePermissions, DEPARTMENTS } from '@/lib/financeJournal';
import { OPERATIONAL_ADVANCE_TYPES } from '@/lib/employeeAdvance';
import { CreateAdvanceModal, SettleModal } from '@/components/journal/EmployeeAdvanceShared';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const TYPE_BADGE = {
    'Công tác': { bg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' },
    'Vật tư': { bg: 'rgba(168, 85, 247, 0.12)', color: '#A855F7' },
    'Tiền ăn': { bg: 'rgba(245, 158, 11, 0.12)', color: '#D97706' },
};

export default function OperationalAdvancePage() {
    const { data: session } = useSession();
    const user = session?.user;
    const perms = getFinancePermissions(user || {});

    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [dashboard, setDashboard] = useState({ totalAdvance: 0, totalSettled: 0, totalOutstanding: 0, openCount: 0 });
    const [loading, setLoading] = useState(true);

    const [employees, setEmployees] = useState([]);
    const [projects, setProjects] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cashFunds, setCashFunds] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [filters, setFilters] = useState({ from: '', to: '', type: '', department: '', projectId: '', status: '', search: '' });
    const [searchInput, setSearchInput] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [settleFor, setSettleFor] = useState(null);

    const fetchLookups = useCallback(async () => {
        const [empRes, projs, banks, funds, accs] = await Promise.all([
            fetch('/api/employees?limit=1000').then(r => r.json()).catch(() => ({ data: [] })),
            fetch('/api/projects?limit=500').then(r => r.json()).then(d => d.data || d || []).catch(() => []),
            fetch('/api/bank-accounts').then(r => r.json()).catch(() => []),
            fetch('/api/cash-funds').then(r => r.json()).catch(() => []),
            fetch('/api/accounting-accounts').then(r => r.json()).catch(() => []),
        ]);
        setEmployees(empRes.data || []);
        setProjects(Array.isArray(projs) ? projs : []);
        setBankAccounts(Array.isArray(banks) ? banks : []);
        setCashFunds(Array.isArray(funds) ? funds : []);
        setAccounts(Array.isArray(accs) ? accs : []);
    }, []);

    const fetchRows = useCallback(async (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k === 'type' ? 'types' : k, v); });
        params.set('page', String(page));
        params.set('limit', String(pagination.limit));
        const res = await fetch(`/api/employee-advances/by-type?${params}`).then(r => r.json()).catch(() => null);
        if (res) {
            setRows(res.data || []);
            setPagination(res.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
            setDashboard(res.dashboard || {});
        }
        setLoading(false);
    }, [filters, pagination.limit]);

    useEffect(() => { fetchLookups(); }, [fetchLookups]);
    useEffect(() => { fetchRows(1); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        const t = setTimeout(() => setFilters(f => ({ ...f, search: searchInput })), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const clearFilters = () => { setFilters({ from: '', to: '', type: '', department: '', projectId: '', status: '', search: '' }); setSearchInput(''); };

    const saveAdvance = async (form) => {
        const payload = {
            ...form,
            projectId: form.projectId || null,
            amount: Number(form.amount) || 0,
            documentDate: form.documentDate || null,
            bankAccountId: form.method === 'Chuyển khoản' ? (form.bankAccountId || null) : null,
            cashFundId: form.method === 'Tiền mặt' ? (form.cashFundId || null) : null,
        };
        delete payload.employeeName;
        const res = await fetch('/api/employee-advances', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi tạo tạm ứng'); return false; }
        setCreateOpen(false);
        fetchRows(pagination.page);
        return true;
    };

    return (
        <div>
            <div style={{
                position: 'sticky', top: 'var(--header-height)', zIndex: 50,
                background: 'var(--bg-primary)', padding: '12px 0', margin: '-12px 0 4px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>🧳 Tạm ứng công tác / vật tư / tiền ăn</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {perms.canCreate && <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>+ Tạo tạm ứng</button>}
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
                {[
                    { label: 'Tổng đã tạm ứng', value: dashboard.totalAdvance, color: 'var(--status-danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: '📤' },
                    { label: 'Đã hoàn ứng', value: dashboard.totalSettled, color: 'var(--status-success)', bg: 'rgba(52, 211, 153, 0.12)', icon: '📥' },
                    { label: 'Còn phải thu hồi', value: dashboard.totalOutstanding, color: 'var(--status-warning)', bg: 'rgba(245, 158, 11, 0.12)', icon: '⏳' },
                    { label: 'Số phiếu đang mở', value: dashboard.openCount, isCount: true, color: 'var(--accent-primary)', bg: 'rgba(59, 130, 246, 0.12)', icon: '📋' },
                ].map(c => (
                    <div className="stat-card" key={c.label}>
                        <div className="stat-icon" style={{ fontSize: 20, width: 40, height: 40, minWidth: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.label}</div>
                            <div style={{ fontSize: 17, fontWeight: 700, color: c.color }}>{c.isCount ? c.value || 0 : `${fmt(c.value)} đ`}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
                <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
                    <input className="form-input search-input" placeholder="🔍 Tìm nhân viên/nội dung..."
                        value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                    <input className="form-input" type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} title="Từ ngày" />
                    <input className="form-input" type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} title="Đến ngày" />
                    <select className="form-select" value={filters.type} onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                        <option value="">Tất cả loại</option>
                        {OPERATIONAL_ADVANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select className="form-select" value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
                        <option value="">Tất cả phòng ban</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="form-select" value={filters.projectId} onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))}>
                        <option value="">Mọi dự án</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                    </select>
                    <select className="form-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                        <option value="">Mọi trạng thái</option>
                        <option value="open">Đang mở</option>
                        <option value="settled">Đã tất toán</option>
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Xóa lọc</button>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{pagination.total} phiếu</div>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
            ) : rows.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</div>
            ) : (
                <div className="card">
                    <div className="table-container" style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th>Ngày</th><th>Số phiếu</th><th>Nhân viên</th><th>Loại</th><th>Nội dung</th><th>Dự án</th>
                                    <th style={{ textAlign: 'right' }}>Tạm ứng</th>
                                    <th style={{ textAlign: 'right' }}>Đã hoàn ứng</th>
                                    <th style={{ textAlign: 'right' }}>Còn lại</th>
                                    <th>Trạng thái</th><th>Chứng từ</th>
                                    {perms.canCreate && <th>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => {
                                    const badge = TYPE_BADGE[r.advanceType] || { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' };
                                    return (
                                        <tr key={r.id}>
                                            <td>{fmtDate(r.date)}</td>
                                            <td>{r.financeTransactionCode
                                                ? <a href="#" onClick={ev => { ev.preventDefault(); window.open(`/finance/journal?search=${r.financeTransactionCode}`, '_blank'); }}>{r.code}</a>
                                                : r.code}</td>
                                            <td><strong>{r.employeeName}</strong> <span style={{ color: 'var(--text-muted)' }}>({r.employeeCode})</span></td>
                                            <td><span className="badge" style={{ background: badge.bg, color: badge.color }}>{r.advanceType || 'Chưa phân loại'}</span></td>
                                            <td>{r.content}</td>
                                            <td>{r.project ? r.project.code : '—'}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmt(r.amount)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmt(r.settledAmount)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.remaining)}</td>
                                            <td>
                                                <span className="badge" style={r.status === 'open'
                                                    ? { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)' }
                                                    : { background: 'rgba(52, 211, 153, 0.15)', color: 'var(--status-success)' }}>
                                                    {r.status === 'open' ? 'Đang mở' : 'Đã tất toán'}
                                                </span>
                                            </td>
                                            <td>{r.attachments?.length > 0 ? r.attachments.map((a, ai) => <a key={ai} href={a.url} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>📎</a>) : '—'}</td>
                                            {perms.canCreate && (
                                                <td>
                                                    {r.status === 'open' && r.advanceId && (
                                                        <button className="btn btn-ghost btn-sm"
                                                            onClick={() => setSettleFor({ id: r.advanceId, code: r.code, amount: r.amount, settlements: r.settlements })}>
                                                            Hoàn ứng
                                                        </button>
                                                    )}
                                                    {r.status === 'open' && !r.advanceId && (
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }} title="Phiếu nhập trực tiếp trong Nhật ký — vào Nhật ký Thu-Chi để ghi nhận hoàn ứng">Nhập tay</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchRows(pagination.page - 1)}>← Trước</button>
                    <span style={{ fontSize: 13, alignSelf: 'center' }}>Trang {pagination.page}/{pagination.totalPages}</span>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRows(pagination.page + 1)}>Sau →</button>
                </div>
            )}

            {createOpen && (
                <CreateAdvanceModal employees={employees} projects={projects} bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts}
                    typeOptions={OPERATIONAL_ADVANCE_TYPES}
                    onClose={() => setCreateOpen(false)} onSave={saveAdvance} />
            )}

            {settleFor && (
                <SettleModal advance={settleFor} bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts}
                    onClose={() => setSettleFor(null)}
                    onDone={() => { setSettleFor(null); fetchRows(pagination.page); }} />
            )}
        </div>
    );
}
