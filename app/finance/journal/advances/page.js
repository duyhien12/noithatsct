'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { DEPARTMENTS, getFinancePermissions } from '@/lib/financeJournal';
import { ADVANCE_TYPES, SETTLE_TYPES } from '@/lib/employeeAdvance';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_ADVANCE_FORM = {
    employeeId: '', employeeName: '', projectId: '', advanceType: 'Khác',
    date: today(), content: '', amount: '',
    method: 'Tiền mặt', bankAccountId: '', cashFundId: '',
    department: '', debitAccountId: '', creditAccountId: '',
    documentNo: '', documentDate: '', attachments: [], notes: '',
};

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
function findAccountByCode(accounts, code) { return accounts.find(a => a.code === code)?.id || ''; }

function EmployeePicker({ employees, employeeId, employeeName, onChange }) {
    const [q, setQ] = useState('');
    const options = q ? employees.filter(e => e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : [];
    return (
        <div>
            <input className="form-input" placeholder="Tìm nhân viên..." value={employeeId ? employeeName : q}
                onChange={e => { setQ(e.target.value); onChange({ employeeId: '', employeeName: e.target.value, department: '' }); }} />
            {options.length > 0 && !employeeId && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                    {options.map(o => (
                        <div key={o.id} style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
                            onClick={() => { onChange({ employeeId: o.id, employeeName: o.name, department: o.department?.name || '' }); setQ(''); }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            {o.name} ({o.code}) — {o.department?.name || ''}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CreateAdvanceModal({ employees, projects, bankAccounts, cashFunds, accounts, onClose, onSave }) {
    const [form, setForm] = useState(EMPTY_ADVANCE_FORM);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
        // Mặc định hạch toán Nợ TK 141 (Tạm ứng) / Có 111|112 theo phương thức — kế toán có thể đổi lại.
        setForm(f => ({
            ...f,
            debitAccountId: f.debitAccountId || findAccountByCode(accounts, '141'),
            creditAccountId: findAccountByCode(accounts, f.method === 'Tiền mặt' ? '111' : '112'),
        }));
    }, [form.method, accounts]);

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'documents');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) set('attachments', [...form.attachments, { url: json.url, name: file.name }]);
        setUploading(false);
        e.target.value = '';
    };

    const submit = async () => {
        if (!form.employeeId) return alert('Vui lòng chọn nhân viên');
        if (!form.department) return alert('Vui lòng chọn phòng ban');
        if (!form.content.trim()) return alert('Vui lòng nhập nội dung');
        if (!(Number(form.amount) > 0)) return alert('Số tiền phải lớn hơn 0');
        if (form.method === 'Chuyển khoản' && !form.bankAccountId) return alert('Vui lòng chọn tài khoản ngân hàng');
        if (!form.debitAccountId || !form.creditAccountId) return alert('Vui lòng chọn TK Nợ/Có');
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginBottom: 16 }}>+ Tạo tạm ứng</h2>

                <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                        <label className="form-label">Nhân viên *</label>
                        <EmployeePicker employees={employees} employeeId={form.employeeId} employeeName={form.employeeName}
                            onChange={patch => setForm(f => ({ ...f, ...patch }))} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Ngày *</label>
                            <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Loại tạm ứng *</label>
                            <select className="form-select" value={form.advanceType} onChange={e => set('advanceType', e.target.value)}>
                                {ADVANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Nội dung *</label>
                        <input className="form-input" value={form.content} onChange={e => set('content', e.target.value)} placeholder="VD: Tạm ứng công tác Hà Nội" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Dự án/Công trình</label>
                            <select className="form-select" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                                <option value="">-- không có --</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Phòng ban *</label>
                            <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                                <option value="">-- chọn --</option>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Số tiền *</label>
                        <input className="form-input" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">Phương thức *</label>
                            <select className="form-select" value={form.method} onChange={e => set('method', e.target.value)}>
                                <option value="Tiền mặt">Tiền mặt</option>
                                <option value="Chuyển khoản">Chuyển khoản</option>
                            </select>
                        </div>
                        {form.method === 'Tiền mặt' ? (
                            <div>
                                <label className="form-label">Quỹ tiền mặt</label>
                                <select className="form-select" value={form.cashFundId} onChange={e => set('cashFundId', e.target.value)}>
                                    <option value="">-- mặc định --</option>
                                    {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="form-label">Tài khoản ngân hàng *</label>
                                <select className="form-select" value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)}>
                                    <option value="">-- chọn --</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label">TK Nợ *</label>
                            <select className="form-select" value={form.debitAccountId} onChange={e => set('debitAccountId', e.target.value)}>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">TK Có *</label>
                            <select className="form-select" value={form.creditAccountId} onChange={e => set('creditAccountId', e.target.value)}>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Chứng từ</label>
                        <input className="form-file" type="file" onChange={upload} disabled={uploading} />
                        {form.attachments.map((a, i) => (
                            <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
                                📎 <a href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
                                <button className="btn btn-icon" onClick={() => set('attachments', form.attachments.filter((_, idx) => idx !== i))}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu...' : 'Lưu tạm ứng'}</button>
                </div>
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

// ════════════════════════════════════════════════════════════════════════
function SettleModal({ advance, bankAccounts, cashFunds, accounts, onClose, onDone }) {
    const settled = advance.settlements.reduce((s, x) => s + x.amount, 0);
    const remaining = advance.amount - settled;

    const [form, setForm] = useState({
        settleType: 'cash_return', amount: remaining, date: today(),
        method: 'Tiền mặt', bankAccountId: '', cashFundId: '',
        debitAccountId: findAccountByCode(accounts, '111'), creditAccountId: findAccountByCode(accounts, '141'),
        proofUrl: '', notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    useEffect(() => {
        if (form.settleType !== 'cash_return') return;
        set('debitAccountId', findAccountByCode(accounts, form.method === 'Tiền mặt' ? '111' : '112'));
    }, [form.method, form.settleType]); // eslint-disable-line react-hooks/exhaustive-deps

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'documents');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const json = await res.json();
        if (json.url) set('proofUrl', json.url);
        setUploading(false);
    };

    const submit = async () => {
        if (!(Number(form.amount) > 0)) return alert('Số tiền phải lớn hơn 0');
        if (Number(form.amount) > remaining + 0.01) return alert(`Số tiền vượt quá số dư còn lại (${fmt(remaining)} đ)`);
        if (form.settleType === 'cash_return' && form.method === 'Chuyển khoản' && !form.bankAccountId) return alert('Vui lòng chọn tài khoản ngân hàng');

        const payload = {
            settleType: form.settleType, amount: Number(form.amount), date: form.date,
            proofUrl: form.proofUrl, notes: form.notes,
            method: form.settleType === 'cash_return' ? form.method : null,
            bankAccountId: form.settleType === 'cash_return' && form.method === 'Chuyển khoản' ? form.bankAccountId : null,
            cashFundId: form.settleType === 'cash_return' && form.method === 'Tiền mặt' ? (form.cashFundId || null) : null,
            debitAccountId: form.settleType === 'cash_return' ? form.debitAccountId : null,
            creditAccountId: form.settleType === 'cash_return' ? form.creditAccountId : null,
        };
        setSaving(true);
        const res = await fetch(`/api/employee-advances/${advance.id}/settle`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        const json = await res.json();
        setSaving(false);
        if (!res.ok) { alert(json.error || 'Lỗi xử lý'); return; }
        onDone();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <h2 style={{ marginBottom: 4 }}>Hoàn ứng — {advance.code}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Còn lại: <strong>{fmt(remaining)} đ</strong> / Tổng tạm ứng: {fmt(advance.amount)} đ</div>

                <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                        <label className="form-label">Hình thức *</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {SETTLE_TYPES.map(t => (
                                <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                    <input type="radio" name="settleType" checked={form.settleType === t.value} onChange={() => set('settleType', t.value)} />
                                    {t.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="form-label">Số tiền *</label>
                        <input className="form-input" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">Ngày *</label>
                        <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                    </div>

                    {form.settleType === 'cash_return' ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label className="form-label">Phương thức *</label>
                                    <select className="form-select" value={form.method} onChange={e => set('method', e.target.value)}>
                                        <option value="Tiền mặt">Tiền mặt</option>
                                        <option value="Chuyển khoản">Chuyển khoản</option>
                                    </select>
                                </div>
                                {form.method === 'Tiền mặt' ? (
                                    <div>
                                        <label className="form-label">Quỹ nhận</label>
                                        <select className="form-select" value={form.cashFundId} onChange={e => set('cashFundId', e.target.value)}>
                                            <option value="">-- mặc định --</option>
                                            {cashFunds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="form-label">TK nhận *</label>
                                        <select className="form-select" value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)}>
                                            <option value="">-- chọn --</option>
                                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label className="form-label">TK Nợ *</label>
                                    <select className="form-select" value={form.debitAccountId} onChange={e => set('debitAccountId', e.target.value)}>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">TK Có *</label>
                                    <select className="form-select" value={form.creditAccountId} onChange={e => set('creditAccountId', e.target.value)}>
                                        {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: 8, borderRadius: 6 }}>
                            ℹ️ Hình thức này chỉ giảm số dư tạm ứng, <strong>không</strong> tạo dòng tiền trong Nhật ký Thu – Chi.
                        </div>
                    )}

                    <div>
                        <label className="form-label">Chứng từ {form.settleType === 'expense_proof' ? '*' : ''}</label>
                        <input className="form-file" type="file" onChange={upload} disabled={uploading} />
                        {form.proofUrl && <div style={{ fontSize: 12, marginTop: 4 }}>📎 <a href={form.proofUrl} target="_blank" rel="noreferrer">Đã đính kèm</a></div>}
                    </div>

                    <div>
                        <label className="form-label">Ghi chú</label>
                        <textarea className="form-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu...' : 'Xác nhận'}</button>
                </div>
            </div>
        </div>
    );
}
