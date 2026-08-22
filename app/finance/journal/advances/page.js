'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getFinancePermissions } from '@/lib/financeJournal';
import { SETTLE_TYPES } from '@/lib/employeeAdvance';
import { CreateAdvanceModal, SettleModal } from '@/components/journal/EmployeeAdvanceShared';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const today = () => new Date().toISOString().slice(0, 10);

export default function EmployeeAdvancePage() {
    const { data: session } = useSession();
    const user = session?.user;
    const perms = getFinancePermissions(user || {});

    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [dashboard, setDashboard] = useState({ totalOutstanding: 0, periodAdvance: 0, periodReturned: 0, employeesWithBalance: 0 });
    const [loading, setLoading] = useState(true);

    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [projects, setProjects] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cashFunds, setCashFunds] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [filters, setFilters] = useState({ from: '', to: '', departmentId: '', projectId: '', status: '', search: '' });
    const [searchInput, setSearchInput] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [drawerEmployeeId, setDrawerEmployeeId] = useState(null);

    const fetchLookups = useCallback(async () => {
        const [empRes, projs, banks, funds, accs] = await Promise.all([
            fetch('/api/employees?limit=1000').then(r => r.json()).catch(() => ({ data: [], departments: [] })),
            fetch('/api/projects?limit=500').then(r => r.json()).then(d => d.data || d || []).catch(() => []),
            fetch('/api/bank-accounts').then(r => r.json()).catch(() => []),
            fetch('/api/cash-funds').then(r => r.json()).catch(() => []),
            fetch('/api/accounting-accounts').then(r => r.json()).catch(() => []),
        ]);
        setEmployees(empRes.data || []);
        setDepartments(empRes.departments || []);
        setProjects(Array.isArray(projs) ? projs : []);
        setBankAccounts(Array.isArray(banks) ? banks : []);
        setCashFunds(Array.isArray(funds) ? funds : []);
        setAccounts(Array.isArray(accs) ? accs : []);
    }, []);

    const fetchRows = useCallback(async (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('page', String(page));
        params.set('limit', String(pagination.limit));
        const res = await fetch(`/api/employee-advances?${params}`).then(r => r.json()).catch(() => null);
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

    const clearFilters = () => { setFilters({ from: '', to: '', departmentId: '', projectId: '', status: '', search: '' }); setSearchInput(''); };

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('limit', '1000');
        const res = await fetch(`/api/employee-advances?${params}`).then(r => r.json());
        const sheetRows = (res.data || []).map((r, i) => ({
            'STT': i + 1, 'Nhân viên': r.employeeName, 'Mã NV': r.employeeCode, 'Phòng ban': r.departmentName,
            'Tạm ứng đầu kỳ': r.openingBalance, 'Phát sinh tạm ứng': r.periodAdvance, 'Đã hoàn ứng': r.periodReturned,
            'Khấu trừ lương': r.periodDeducted, 'Số dư còn lại': r.closingBalance,
            'Tạm ứng gần nhất': fmtDate(r.lastAdvanceDate), 'Trạng thái': r.status === 'with_balance' ? 'Còn dư' : 'Đã tất toán',
        }));
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tạm ứng nhân viên');
        XLSX.writeFile(wb, `tam-ung-nhan-vien-${today()}.xlsx`);
    };

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
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>💼 Tạm ứng &amp; Hoàn ứng nhân viên</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Xuất Excel</button>
                    {perms.canCreate && <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>+ Tạo tạm ứng</button>}
                </div>
            </div>

            <DashboardCards dashboard={dashboard} filters={filters} setFilters={setFilters} />

            <FilterBar filters={filters} setFilters={setFilters} searchInput={searchInput} setSearchInput={setSearchInput}
                departments={departments} projects={projects} onClear={clearFilters} count={pagination.total} />

            <EmployeeTable rows={rows} loading={loading} onOpen={(id) => setDrawerEmployeeId(id)} />

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchRows(pagination.page - 1)}>← Trước</button>
                    <span style={{ fontSize: 13, alignSelf: 'center' }}>Trang {pagination.page}/{pagination.totalPages}</span>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRows(pagination.page + 1)}>Sau →</button>
                </div>
            )}

            {createOpen && (
                <CreateAdvanceModal employees={employees} projects={projects} bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts}
                    onClose={() => setCreateOpen(false)} onSave={saveAdvance} />
            )}

            {drawerEmployeeId && (
                <EmployeeDetailModal employeeId={drawerEmployeeId} bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts} canCreate={perms.canCreate}
                    onClose={() => setDrawerEmployeeId(null)} onChanged={() => fetchRows(pagination.page)} />
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function DashboardCards({ dashboard, filters, setFilters }) {
    const cards = [
        { label: 'Tổng đang tạm ứng', value: dashboard.totalOutstanding, color: 'var(--status-warning)', bg: 'rgba(245, 158, 11, 0.12)', icon: '💼', onClick: () => setFilters(f => ({ ...f, status: 'with_balance' })) },
        { label: 'Tạm ứng trong tháng', value: dashboard.periodAdvance, color: 'var(--status-danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: '📤' },
        { label: 'Đã hoàn ứng trong tháng', value: dashboard.periodReturned, color: 'var(--status-success)', bg: 'rgba(52, 211, 153, 0.12)', icon: '📥' },
        { label: 'Còn phải thu hồi', value: dashboard.totalOutstanding, color: 'var(--status-warning)', bg: 'rgba(245, 158, 11, 0.12)', icon: '⏳', onClick: () => setFilters(f => ({ ...f, status: 'with_balance' })) },
        { label: 'Số NV còn dư tạm ứng', value: dashboard.employeesWithBalance, isCount: true, color: 'var(--accent-primary)', bg: 'rgba(59, 130, 246, 0.12)', icon: '👥', onClick: () => setFilters(f => ({ ...f, status: 'with_balance' })) },
    ];
    return (
        <div className="stats-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            {cards.map(c => (
                <div className="stat-card" key={c.label} style={{ cursor: c.onClick ? 'pointer' : 'default' }} onClick={c.onClick}>
                    <div className="stat-icon" style={{ fontSize: 20, width: 40, height: 40, minWidth: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: c.color }}>{c.isCount ? c.value || 0 : `${fmt(c.value)} đ`}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function FilterBar({ filters, setFilters, searchInput, setSearchInput, departments, projects, onClear, count }) {
    const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
                <input className="form-input search-input" placeholder="🔍 Tìm nhân viên..."
                    value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                <input className="form-input" type="date" value={filters.from} onChange={e => set('from', e.target.value)} title="Từ ngày" />
                <input className="form-input" type="date" value={filters.to} onChange={e => set('to', e.target.value)} title="Đến ngày" />
                <select className="form-select" value={filters.departmentId} onChange={e => set('departmentId', e.target.value)}>
                    <option value="">Tất cả phòng ban</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select className="form-select" value={filters.projectId} onChange={e => set('projectId', e.target.value)}>
                    <option value="">Mọi dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
                <select className="form-select" value={filters.status} onChange={e => set('status', e.target.value)}>
                    <option value="">Mọi trạng thái</option>
                    <option value="with_balance">Còn dư</option>
                    <option value="settled">Đã tất toán</option>
                </select>
                <button className="btn btn-ghost btn-sm" onClick={onClear}>✕ Xóa lọc</button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{count} nhân viên</div>
            </div>
        </div>
    );
}

function EmployeeTable({ rows, loading, onOpen }) {
    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
    if (rows.length === 0) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</div>;

    return (
        <div className="card">
            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                    <thead>
                        <tr>
                            <th>#</th><th>Nhân viên</th><th>Phòng ban</th>
                            <th style={{ textAlign: 'right' }}>Đầu kỳ</th>
                            <th style={{ textAlign: 'right' }}>Phát sinh</th>
                            <th style={{ textAlign: 'right' }}>Đã hoàn ứng</th>
                            <th style={{ textAlign: 'right' }}>Khấu trừ lương</th>
                            <th style={{ textAlign: 'right' }}>Số dư còn lại</th>
                            <th>Tạm ứng gần nhất</th><th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.employeeId} onClick={() => onOpen(r.employeeId)} style={{ cursor: 'pointer' }}>
                                <td>{i + 1}</td>
                                <td><strong>{r.employeeName}</strong> <span style={{ color: 'var(--text-muted)' }}>({r.employeeCode})</span></td>
                                <td>{r.departmentName}</td>
                                <td style={{ textAlign: 'right' }}>{fmt(r.openingBalance)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmt(r.periodAdvance)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmt(r.periodReturned)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmt(r.periodDeducted)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.closingBalance)}</td>
                                <td>{fmtDate(r.lastAdvanceDate)}</td>
                                <td>
                                    <span className="badge" style={r.status === 'with_balance'
                                        ? { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)' }
                                        : { background: 'rgba(52, 211, 153, 0.15)', color: 'var(--status-success)' }}>
                                        {r.status === 'with_balance' ? 'Còn dư' : 'Đã tất toán'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function EmployeeDetailModal({ employeeId, bankAccounts, cashFunds, accounts, canCreate, onClose, onChanged }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [settleFor, setSettleFor] = useState(null); // advance object đang thao tác Hoàn ứng

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/employee-advances/${employeeId}`).then(r => r.json()).catch(() => null);
        setData(res);
        setLoading(false);
    }, [employeeId]);

    useEffect(() => { load(); }, [load]);

    if (loading || !data) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, padding: 40, textAlign: 'center' }}>Đang tải...</div>
            </div>
        );
    }

    const openAdvances = data.advances.filter(a => {
        const settled = a.settlements.reduce((s, x) => s + x.amount, 0);
        return a.amount - settled > 0.01;
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 1000, width: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <h2>{data.employee.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 14 }}>({data.employee.code})</span></h2>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{data.employee.departmentName} {data.employee.position ? `— ${data.employee.position}` : ''}</div>
                    </div>
                    <button className="btn btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="stats-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    <MiniStat label="Tổng đã tạm ứng" value={data.summary.totalAdvance} />
                    <MiniStat label="Tổng đã hoàn" value={data.summary.totalReturned} color="var(--status-success)" />
                    <MiniStat label="Tổng đã khấu trừ" value={data.summary.totalDeducted} color="var(--status-success)" />
                    <MiniStat label="Còn phải thu hồi" value={data.summary.closingBalance} color="var(--status-warning)" bold />
                </div>

                {canCreate && openAdvances.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Khoản tạm ứng còn dư — chọn để hoàn ứng:</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {openAdvances.map(a => {
                                const settled = a.settlements.reduce((s, x) => s + x.amount, 0);
                                return (
                                    <button key={a.id} className="btn btn-ghost btn-sm" onClick={() => setSettleFor(a)}>
                                        {a.code} · còn {fmt(a.amount - settled)} đ
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                        <thead>
                            <tr>
                                <th>Ngày</th><th>Số phiếu</th><th>Nghiệp vụ</th><th>Nội dung</th><th>Dự án</th>
                                <th style={{ textAlign: 'right' }}>Tạm ứng</th>
                                <th style={{ textAlign: 'right' }}>Hoàn ứng</th>
                                <th style={{ textAlign: 'right' }}>Khấu trừ</th>
                                <th style={{ textAlign: 'right' }}>Còn lại</th>
                                <th>Chứng từ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.ledger.map((e, i) => (
                                <tr key={i}>
                                    <td>{fmtDate(e.date)}</td>
                                    <td>{e.financeTransactionCode
                                        ? <a href="/finance/journal" title="Mở trong Nhật ký Thu – Chi" onClick={ev => { ev.preventDefault(); window.open(`/finance/journal?search=${e.financeTransactionCode}`, '_blank'); }}>{e.code}</a>
                                        : e.code}</td>
                                    <td>{e.kind === 'advance' ? `Tạm ứng ${e.advanceType?.toLowerCase() || ''}` : SETTLE_TYPES.find(s => s.value === e.settleType)?.label || e.settleType}</td>
                                    <td>{e.content}</td>
                                    <td>{e.project ? `${e.project.code}` : '—'}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{e.advanceAmount ? fmt(e.advanceAmount) : ''}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{e.returnedAmount ? fmt(e.returnedAmount) : ''}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{e.deductedAmount ? fmt(e.deductedAmount) : ''}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(e.remaining)}</td>
                                    <td>{e.attachments?.length > 0 ? e.attachments.map((a, ai) => <a key={ai} href={a.url} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>📎</a>) : '—'}</td>
                                </tr>
                            ))}
                            {data.ledger.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chưa có phát sinh</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {settleFor && (
                <SettleModal advance={settleFor} bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts}
                    onClose={() => setSettleFor(null)}
                    onDone={() => { setSettleFor(null); load(); onChanged(); }} />
            )}
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
