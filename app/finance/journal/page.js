'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
    DEPARTMENTS, TRANSACTION_TYPES, PAYMENT_METHODS, OBJECT_TYPES, STATUSES, STATUS_COLORS,
    ALLOWED_TRANSITIONS, getFinancePermissions, canEditTransaction, canTransitionStatus,
} from '@/lib/financeJournal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtOrBlank = (n) => (!n ? '' : fmt(n));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const toInputDate = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const today = () => new Date().toISOString().slice(0, 10);

const OBJECT_ENDPOINT = {
    'Khách hàng': '/api/customers',
    'NCC': '/api/suppliers',
    'Thầu phụ': '/api/contractors',
    'Nhân viên': '/api/employees',
};

const EMPTY_FORM = {
    date: today(), type: 'Thu', method: 'Tiền mặt', amount: '',
    department: '', projectId: '', content: '', detail: '',
    debitAccountId: '', creditAccountId: '', bankAccountId: '', categoryId: '',
    objectType: '', objectId: '', objectName: '', payerReceiver: '',
    itemName: '', itemUnit: '', itemQty: '', itemUnitPrice: '',
    documentNo: '', documentDate: '', attachments: [], notes: '', status: 'Nháp',
};

export default function FinanceJournalPage() {
    const { data: session } = useSession();
    const user = session?.user;
    const perms = getFinancePermissions(user || {});

    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [summary, setSummary] = useState({ totalCashIn: 0, totalCashOut: 0, totalBankIn: 0, totalBankOut: 0, netCashFlow: 0 });
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [projects, setProjects] = useState([]);

    const [filters, setFilters] = useState({ from: '', to: '', department: '', type: '', method: '', categoryId: '', projectId: '', status: '', search: '' });
    const [searchInput, setSearchInput] = useState('');

    const [modal, setModal] = useState(null); // { mode: 'add'|'edit'|'view', tx }
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [cancelModal, setCancelModal] = useState(null); // tx
    const [openMenuId, setOpenMenuId] = useState(null);

    const fetchLookups = useCallback(async () => {
        const [cats, banks, accs, projs] = await Promise.all([
            fetch('/api/finance-categories').then(r => r.json()).catch(() => []),
            fetch('/api/bank-accounts').then(r => r.json()).catch(() => []),
            fetch('/api/accounting-accounts').then(r => r.json()).catch(() => []),
            fetch('/api/projects?limit=500').then(r => r.json()).then(d => d.data || d || []).catch(() => []),
        ]);
        setCategories(Array.isArray(cats) ? cats : []);
        setBankAccounts(Array.isArray(banks) ? banks : []);
        setAccounts(Array.isArray(accs) ? accs : []);
        setProjects(Array.isArray(projs) ? projs : []);
    }, []);

    const fetchTransactions = useCallback(async (page = 1) => {
        setLoading(true);
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('page', String(page));
        params.set('limit', String(pagination.limit));
        const res = await fetch(`/api/finance-transactions?${params}`).then(r => r.json()).catch(() => null);
        if (res) {
            setRows(res.data || []);
            setPagination(res.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 });
            setSummary(res.summary || {});
        }
        setLoading(false);
    }, [filters, pagination.limit]);

    useEffect(() => { fetchLookups(); }, [fetchLookups]);
    useEffect(() => { fetchTransactions(1); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const t = setTimeout(() => setFilters(f => ({ ...f, search: searchInput })), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const clearFilters = () => {
        setFilters({ from: '', to: '', department: '', type: '', method: '', categoryId: '', projectId: '', status: '', search: '' });
        setSearchInput('');
    };

    const netPositive = (summary.netCashFlow || 0) >= 0;

    // ── Actions ──────────────────────────────────────────────────────────
    const saveTransaction = async (form) => {
        const payload = {
            ...form,
            amount: Number(form.amount) || 0,
            itemQty: Number(form.itemQty) || 0,
            itemUnitPrice: Number(form.itemUnitPrice) || 0,
            projectId: form.projectId || null,
            bankAccountId: form.method === 'Chuyển khoản' ? (form.bankAccountId || null) : null,
            categoryId: form.categoryId || null,
            documentDate: form.documentDate || null,
        };
        const isEdit = modal?.mode === 'edit';
        const res = await fetch(isEdit ? `/api/finance-transactions/${modal.tx.id}` : '/api/finance-transactions', {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi lưu giao dịch'); return false; }
        setModal(null);
        fetchTransactions(pagination.page);
        return true;
    };

    const changeStatus = async (tx, status, cancelReason = '') => {
        const res = await fetch(`/api/finance-transactions/${tx.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, cancelReason }),
        });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi chuyển trạng thái'); return; }
        setCancelModal(null);
        fetchTransactions(pagination.page);
    };

    const duplicateTx = async (tx) => {
        const res = await fetch(`/api/finance-transactions/${tx.id}/duplicate`, { method: 'POST' });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi nhân bản'); return; }
        fetchTransactions(1);
    };

    const deleteTx = async (tx) => {
        if (!confirm(`Xóa nháp "${tx.code}"? Hành động này không thể hoàn tác.`)) return;
        const res = await fetch(`/api/finance-transactions/${tx.id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok) { alert(json.error || 'Lỗi xóa'); return; }
        fetchTransactions(pagination.page);
    };

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('limit', '500');
        const res = await fetch(`/api/finance-transactions?${params}`).then(r => r.json());
        const data = res.data || [];
        const s = res.summary || {};
        const sheetRows = data.map(t => ({
            'Ngày': fmtDate(t.date), 'Số phiếu': t.code, 'Nội dung': t.content, 'Chi tiết': t.detail,
            'Phòng ban': t.department, 'Dự án': t.project?.code || '',
            'Thu TM': t.cashIn || 0, 'Chi TM': t.cashOut || 0, 'Thu TGNH': t.bankIn || 0, 'Chi TGNH': t.bankOut || 0,
            'TK Nợ': t.debitAccount?.code || '', 'TK Có': t.creditAccount?.code || '',
            'TK ngân hàng': t.bankAccount?.accountNumber || '', 'Phân loại': t.category?.name || '',
            'Đối tượng': t.objectName || '', 'Người nhận/nộp': t.payerReceiver || '',
            'Trạng thái': t.status,
        }));
        sheetRows.push({});
        sheetRows.push({
            'Ngày': 'TỔNG', 'Thu TM': s.totalCashIn || 0, 'Chi TM': s.totalCashOut || 0,
            'Thu TGNH': s.totalBankIn || 0, 'Chi TGNH': s.totalBankOut || 0,
            'TK ngân hàng': `Dòng tiền ròng: ${fmt(s.netCashFlow || 0)}`,
        });
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Nhật ký Thu Chi');
        XLSX.writeFile(wb, `nhat-ky-thu-chi-${today()}.xlsx`);
    };

    const downloadTemplate = async () => {
        const XLSX = await import('xlsx');
        const sample = [{
            'Ngày': today(), 'Loại GD': 'Thu', 'Phương thức': 'Tiền mặt', 'Số tiền': 1000000,
            'Phòng ban': 'Kinh doanh', 'Dự án': '', 'Nội dung': 'VD: Thu tạm ứng khách hàng', 'Chi tiết': '',
            'TK Nợ': '111', 'TK Có': '511', 'TK ngân hàng': '', 'Phân loại': 'Thu khách hàng',
            'Loại đối tượng': 'Khách hàng', 'Tên đối tượng': '', 'Người nhận/nộp': '',
            'Chủng loại': '', 'ĐVT': '', 'Số lượng': '', 'Đơn giá': '',
            'Số chứng từ': '', 'Ngày chứng từ': '', 'Ghi chú': '',
        }];
        const ws = XLSX.utils.json_to_sheet(sample);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mẫu import');
        XLSX.writeFile(wb, 'mau-import-nhat-ky-thu-chi.xlsx');
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>📒 Nhật ký Thu – Chi</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {perms.canImportExport && <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>📄 File mẫu</button>}
                    {perms.canImportExport && <button className="btn btn-ghost btn-sm" onClick={() => setImportOpen(true)}>⬆️ Nhập Excel</button>}
                    {perms.canImportExport && <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Xuất Excel</button>}
                    {perms.canManageSettings && <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(true)}>⚙️ Danh mục</button>}
                    {perms.canCreate && <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'add', tx: null })}>+ Thêm giao dịch</button>}
                </div>
            </div>

            <SummaryCards summary={summary} netPositive={netPositive} />

            <ReconcilePanel bankAccounts={bankAccounts} canSave={perms.canCreate} />

            <FilterBar filters={filters} setFilters={setFilters} searchInput={searchInput} setSearchInput={setSearchInput}
                categories={categories} projects={projects} onClear={clearFilters} count={pagination.total} />

            <TransactionTable
                rows={rows} loading={loading} user={user}
                openMenuId={openMenuId} setOpenMenuId={setOpenMenuId}
                onView={(tx) => setModal({ mode: 'view', tx })}
                onEdit={(tx) => setModal({ mode: 'edit', tx })}
                onDuplicate={duplicateTx}
                onCancel={(tx) => setCancelModal(tx)}
                onDelete={deleteTx}
                onChangeStatus={changeStatus}
            />

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchTransactions(pagination.page - 1)}>← Trước</button>
                    <span style={{ fontSize: 13, alignSelf: 'center' }}>Trang {pagination.page}/{pagination.totalPages}</span>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTransactions(pagination.page + 1)}>Sau →</button>
                </div>
            )}

            {modal && (
                <TransactionModal
                    mode={modal.mode} tx={modal.tx} user={user}
                    categories={categories} bankAccounts={bankAccounts} accounts={accounts} projects={projects}
                    onClose={() => setModal(null)} onSave={saveTransaction}
                    onEdit={() => setModal({ mode: 'edit', tx: modal.tx })}
                />
            )}

            {cancelModal && (
                <CancelModal tx={cancelModal} onClose={() => setCancelModal(null)}
                    onConfirm={(reason) => changeStatus(cancelModal, 'Hủy', reason)} />
            )}

            {settingsOpen && (
                <SettingsModal categories={categories} bankAccounts={bankAccounts} accounts={accounts}
                    onClose={() => setSettingsOpen(false)} onRefresh={fetchLookups} />
            )}

            {importOpen && (
                <ImportModal onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); fetchTransactions(1); }} />
            )}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function SummaryCards({ summary, netPositive }) {
    const cards = [
        { label: 'Thu tiền mặt', value: summary.totalCashIn, color: 'var(--status-success)', icon: '💵' },
        { label: 'Chi tiền mặt', value: summary.totalCashOut, color: 'var(--status-danger)', icon: '💸' },
        { label: 'Thu ngân hàng', value: summary.totalBankIn, color: 'var(--status-success)', icon: '🏦' },
        { label: 'Chi ngân hàng', value: summary.totalBankOut, color: 'var(--status-danger)', icon: '🏧' },
    ];
    return (
        <div>
            <div className="stats-grid" style={{ marginBottom: 12 }}>
                {cards.map(c => (
                    <div className="stat-card" key={c.label}>
                        <div className="stat-icon">{c.icon}</div>
                        <div><div className="stat-value" style={{ color: c.color }}>{fmt(c.value)}</div><div className="stat-label">{c.label}</div></div>
                    </div>
                ))}
                <div className="stat-card">
                    <div className="stat-icon">{netPositive ? '📈' : '⚠️'}</div>
                    <div>
                        <div className="stat-value" style={{ color: netPositive ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmt(summary.netCashFlow)}</div>
                        <div className="stat-label">Dòng tiền ròng {netPositive ? '' : '— cảnh báo âm'}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FilterBar({ filters, setFilters, searchInput, setSearchInput, categories, projects, onClear, count }) {
    const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
                <input className="form-input search-input" placeholder="🔍 Tìm nội dung, số phiếu, chứng từ, đối tượng..."
                    value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
                <input className="form-input" type="date" value={filters.from} onChange={e => set('from', e.target.value)} title="Từ ngày" />
                <input className="form-input" type="date" value={filters.to} onChange={e => set('to', e.target.value)} title="Đến ngày" />
                <select className="form-select" value={filters.department} onChange={e => set('department', e.target.value)}>
                    <option value="">Tất cả phòng ban</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="form-select" value={filters.type} onChange={e => set('type', e.target.value)}>
                    <option value="">Thu &amp; Chi</option>
                    {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className="form-select" value={filters.method} onChange={e => set('method', e.target.value)}>
                    <option value="">Mọi phương thức</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className="form-select" value={filters.categoryId} onChange={e => set('categoryId', e.target.value)}>
                    <option value="">Mọi phân loại</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="form-select" value={filters.projectId} onChange={e => set('projectId', e.target.value)}>
                    <option value="">Mọi dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
                <select className="form-select" value={filters.status} onChange={e => set('status', e.target.value)}>
                    <option value="">Mọi trạng thái</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={onClear}>✕ Xóa lọc</button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{count} giao dịch</div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    const c = STATUS_COLORS[status] || {};
    return <span className="badge" style={{ background: c.bg, color: c.text }}>{status}</span>;
}

function TransactionTable({ rows, loading, user, openMenuId, setOpenMenuId, onView, onEdit, onDuplicate, onCancel, onDelete, onChangeStatus }) {
    const perms = getFinancePermissions(user || {});

    const nextStatuses = (tx) => (ALLOWED_TRANSITIONS[tx.status] || []).filter(s => canTransitionStatus(user, tx.status, s) && s !== 'Hủy');

    const RowMenu = ({ tx }) => (
        <div style={{ position: 'relative' }}>
            <button className="btn btn-icon" onClick={() => setOpenMenuId(openMenuId === tx.id ? null : tx.id)}>⋯</button>
            {openMenuId === tx.id && (
                <div onMouseLeave={() => setOpenMenuId(null)}
                    style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: 'var(--shadow-md)', minWidth: 170, padding: 4 }}>
                    <MenuItem onClick={() => { onView(tx); setOpenMenuId(null); }}>👁️ Xem chi tiết</MenuItem>
                    {canEditTransaction(user, tx) && <MenuItem onClick={() => { onEdit(tx); setOpenMenuId(null); }}>✏️ Sửa</MenuItem>}
                    {perms.canCreate && <MenuItem onClick={() => { onDuplicate(tx); setOpenMenuId(null); }}>📄 Nhân bản</MenuItem>}
                    {nextStatuses(tx).map(s => (
                        <MenuItem key={s} onClick={() => { onChangeStatus(tx, s); setOpenMenuId(null); }}>
                            {s === 'Đã duyệt' ? '✅ Duyệt' : s === 'Đã hạch toán' ? '📘 Hạch toán' : `→ ${s}`}
                        </MenuItem>
                    ))}
                    {canTransitionStatus(user, tx.status, 'Hủy') && <MenuItem danger onClick={() => { onCancel(tx); setOpenMenuId(null); }}>🚫 Hủy giao dịch</MenuItem>}
                    {tx.status === 'Nháp' && perms.canHardDelete && <MenuItem danger onClick={() => { onDelete(tx); setOpenMenuId(null); }}>🗑️ Xóa</MenuItem>}
                </div>
            )}
        </div>
    );

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
    if (rows.length === 0) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Không có giao dịch nào</div>;

    return (
        <div className="card">
            <div className="desktop-table-view">
                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                        <thead>
                            <tr>
                                <th>#</th><th>Ngày</th><th>Số phiếu</th><th>Nội dung</th><th>Phòng ban</th><th>Dự án</th>
                                <th style={{ textAlign: 'right' }}>Thu TM</th><th style={{ textAlign: 'right' }}>Chi TM</th>
                                <th style={{ textAlign: 'right' }}>Thu TGNH</th><th style={{ textAlign: 'right' }}>Chi TGNH</th>
                                <th>TK Nợ</th><th>TK Có</th><th>TK ngân hàng</th><th>Phân loại</th>
                                <th>Đối tượng</th><th>Người nhận/nộp</th><th>Chủng loại</th><th>ĐVT</th>
                                <th>Trạng thái</th><th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((t, i) => (
                                <tr key={t.id} style={{ opacity: t.status === 'Hủy' ? 0.5 : 1 }}>
                                    <td>{i + 1}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</td>
                                    <td className="accent" style={{ whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => onView(t)}>{t.code}</td>
                                    <td className="primary" style={{ maxWidth: 200 }}>{t.content}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>{t.department}</td>
                                    <td>{t.project?.code || '—'}</td>
                                    <td className="amount" style={{ color: 'var(--status-success)' }}>{fmtOrBlank(t.cashIn)}</td>
                                    <td className="amount" style={{ color: 'var(--status-danger)' }}>{fmtOrBlank(t.cashOut)}</td>
                                    <td className="amount" style={{ color: 'var(--status-success)' }}>{fmtOrBlank(t.bankIn)}</td>
                                    <td className="amount" style={{ color: 'var(--status-danger)' }}>{fmtOrBlank(t.bankOut)}</td>
                                    <td>{t.debitAccount?.code}</td>
                                    <td>{t.creditAccount?.code}</td>
                                    <td style={{ fontSize: 11 }}>{t.bankAccount?.accountNumber || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.category?.name || '—'}</td>
                                    <td style={{ fontSize: 11, maxWidth: 120 }}>{t.objectName || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.payerReceiver || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.itemName || '—'}</td>
                                    <td style={{ fontSize: 11 }}>{t.itemUnit || '—'}</td>
                                    <td><StatusBadge status={t.status} /></td>
                                    <td><RowMenu tx={t} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mobile-card-list">
                {rows.map(t => (
                    <div key={t.id} className="mobile-card-item" style={{ opacity: t.status === 'Hủy' ? 0.5 : 1 }} onClick={() => onView(t)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div><div className="card-title">{t.content}</div><div className="card-subtitle">{t.code} · {fmtDate(t.date)} · {t.department}</div></div>
                            <StatusBadge status={t.status} />
                        </div>
                        <div className="card-row">
                            <div><span className="card-label">Thu</span><div className="card-value" style={{ color: 'var(--status-success)' }}>{fmt((t.cashIn || 0) + (t.bankIn || 0))}</div></div>
                            <div><span className="card-label">Chi</span><div className="card-value" style={{ color: 'var(--status-danger)' }}>{fmt((t.cashOut || 0) + (t.bankOut || 0))}</div></div>
                            <div><span className="card-label">PT</span><div className="card-value">{t.method}</div></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MenuItem({ children, onClick, danger }) {
    return (
        <button onClick={onClick} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 13, border: 'none',
            background: 'transparent', cursor: 'pointer', borderRadius: 6, color: danger ? 'var(--status-danger)' : 'var(--text-primary)',
        }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            {children}
        </button>
    );
}

// ════════════════════════════════════════════════════════════════════════
function ObjectSelect({ objectType, objectId, objectName, onChange }) {
    const [options, setOptions] = useState([]);
    const [q, setQ] = useState('');
    useEffect(() => {
        if (!objectType || objectType === 'Khác' || !OBJECT_ENDPOINT[objectType]) { setOptions([]); return; }
        const t = setTimeout(() => {
            fetch(`${OBJECT_ENDPOINT[objectType]}?search=${encodeURIComponent(q)}&limit=50`)
                .then(r => r.json()).then(d => setOptions(d.data || d || [])).catch(() => setOptions([]));
        }, 300);
        return () => clearTimeout(t);
    }, [objectType, q]);

    if (!objectType || objectType === 'Khác') {
        return <input className="form-input" placeholder="Tên đối tượng" value={objectName} onChange={e => onChange({ objectId: '', objectName: e.target.value })} />;
    }
    return (
        <div>
            <input className="form-input" placeholder={`Tìm ${objectType.toLowerCase()}...`} value={objectId ? objectName : q}
                onChange={e => { setQ(e.target.value); onChange({ objectId: '', objectName: e.target.value }); }} />
            {options.length > 0 && !objectId && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 6, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                    {options.map(o => (
                        <div key={o.id} style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer' }}
                            onClick={() => { onChange({ objectId: o.id, objectName: o.name }); setOptions([]); setQ(''); }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            {o.name} {o.code ? `(${o.code})` : ''}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function TransactionModal({ mode, tx, user, categories, bankAccounts, accounts, projects, onClose, onSave, onEdit }) {
    const isView = mode === 'view';
    const [form, setForm] = useState(() => tx ? {
        date: toInputDate(tx.date), type: tx.type, method: tx.method, amount: tx.amount,
        department: tx.department, projectId: tx.projectId || '', content: tx.content, detail: tx.detail || '',
        debitAccountId: tx.debitAccountId, creditAccountId: tx.creditAccountId, bankAccountId: tx.bankAccountId || '',
        categoryId: tx.categoryId || '', objectType: tx.objectType || '', objectId: tx.objectId || '', objectName: tx.objectName || '',
        payerReceiver: tx.payerReceiver || '', itemName: tx.itemName || '', itemUnit: tx.itemUnit || '',
        itemQty: tx.itemQty || '', itemUnitPrice: tx.itemUnitPrice || '',
        documentNo: tx.documentNo || '', documentDate: toInputDate(tx.documentDate), attachments: tx.attachments || [],
        notes: tx.notes || '', status: tx.status,
    } : EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef();
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const itemAmount = (Number(form.itemQty) || 0) * (Number(form.itemUnitPrice) || 0);
    const filteredCategories = categories.filter(c => c.group === form.type);

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
        if (fileRef.current) fileRef.current.value = '';
    };

    const submit = async (statusOverride) => {
        if (form.method === 'Chuyển khoản' && !form.bankAccountId) return alert('Giao dịch chuyển khoản bắt buộc chọn TK ngân hàng');
        if (!form.department) return alert('Vui lòng chọn phòng ban');
        if (!form.content?.trim()) return alert('Vui lòng nhập nội dung');
        if (!form.debitAccountId || !form.creditAccountId) return alert('Vui lòng chọn TK Nợ và TK Có');
        if (form.debitAccountId === form.creditAccountId) return alert('TK Nợ và TK Có không được trùng nhau');
        if (!(Number(form.amount) > 0)) return alert('Số tiền phải lớn hơn 0');
        setSaving(true);
        await onSave({ ...form, status: statusOverride || form.status });
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h3>{isView ? `Giao dịch ${tx.code}` : mode === 'edit' ? `Sửa giao dịch ${tx.code}` : '+ Thêm giao dịch'}</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {isView && (
                        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <StatusBadge status={tx.status} />
                            {canEditTransaction(user, tx) && <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Sửa</button>}
                        </div>
                    )}

                    <FieldsetGroup title="A · Thông tin chung">
                        <Row>
                            <Field label="Ngày *"><input className="form-input" type="date" disabled={isView} value={form.date} onChange={e => set('date', e.target.value)} /></Field>
                            <Field label="Phòng ban *">
                                <select className="form-select" disabled={isView} value={form.department} onChange={e => set('department', e.target.value)}>
                                    <option value="">-- chọn --</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                                </select>
                            </Field>
                            <Field label="Dự án / Công trình">
                                <select className="form-select" disabled={isView} value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                                    <option value="">-- không có --</option>{projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                </select>
                            </Field>
                        </Row>
                        <Row>
                            <Field label="Chi tiết">
                                <select className="form-select" disabled={isView} value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                                    <option value="">-- chọn --</option>{filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </Field>
                        </Row>
                        <Field label="Nội dung *"><input className="form-input" disabled={isView} value={form.content} onChange={e => set('content', e.target.value)} /></Field>
                    </FieldsetGroup>

                    <FieldsetGroup title="B · Thông tin tiền">
                        <Row>
                            <Field label="Loại giao dịch *">
                                <select className="form-select" disabled={isView} value={form.type} onChange={e => set('type', e.target.value)}>
                                    {TRANSACTION_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="Phương thức *">
                                <select className="form-select" disabled={isView} value={form.method} onChange={e => set('method', e.target.value)}>
                                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </Field>
                            <Field label="Số tiền *"><input className="form-input" disabled={isView} type="number" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} /></Field>
                        </Row>
                        {form.method === 'Chuyển khoản' && (
                            <Field label="Tài khoản ngân hàng *">
                                <select className="form-select" disabled={isView} value={form.bankAccountId} onChange={e => set('bankAccountId', e.target.value)}>
                                    <option value="">-- chọn --</option>
                                    {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                                </select>
                            </Field>
                        )}
                    </FieldsetGroup>

                    <FieldsetGroup title="C · Hạch toán">
                        <Row>
                            <Field label="TK Nợ *">
                                <select className="form-select" disabled={isView} value={form.debitAccountId} onChange={e => set('debitAccountId', e.target.value)}>
                                    <option value="">-- chọn --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                </select>
                            </Field>
                            <Field label="TK Có *">
                                <select className="form-select" disabled={isView} value={form.creditAccountId} onChange={e => set('creditAccountId', e.target.value)}>
                                    <option value="">-- chọn --</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                </select>
                            </Field>
                        </Row>
                        <Row>
                            <Field label="Loại đối tượng">
                                <select className="form-select" disabled={isView} value={form.objectType} onChange={e => set('objectType', e.target.value)}>
                                    <option value="">-- không có --</option>{OBJECT_TYPES.map(o => <option key={o}>{o}</option>)}
                                </select>
                            </Field>
                            <Field label="Khách hàng / Đối tượng">
                                {isView ? <input className="form-input" disabled value={form.objectName} /> :
                                    <ObjectSelect objectType={form.objectType} objectId={form.objectId} objectName={form.objectName}
                                        onChange={({ objectId, objectName }) => setForm(f => ({ ...f, objectId, objectName }))} />}
                            </Field>
                        </Row>
                        <Field label="Người nhận / nộp tiền"><input className="form-input" disabled={isView} value={form.payerReceiver} onChange={e => set('payerReceiver', e.target.value)} /></Field>
                    </FieldsetGroup>

                    <FieldsetGroup title="D · Hàng hóa / vật tư (không bắt buộc)">
                        <Row>
                            <Field label="Chủng loại"><input className="form-input" disabled={isView} value={form.itemName} onChange={e => set('itemName', e.target.value)} /></Field>
                            <Field label="ĐVT"><input className="form-input" disabled={isView} value={form.itemUnit} onChange={e => set('itemUnit', e.target.value)} /></Field>
                        </Row>
                        <Row>
                            <Field label="Số lượng"><input className="form-input" disabled={isView} type="number" value={form.itemQty} onChange={e => set('itemQty', e.target.value)} /></Field>
                            <Field label="Đơn giá"><input className="form-input" disabled={isView} type="number" value={form.itemUnitPrice} onChange={e => set('itemUnitPrice', e.target.value)} /></Field>
                            <Field label="Thành tiền"><input className="form-input" disabled value={fmt(itemAmount)} /></Field>
                        </Row>
                    </FieldsetGroup>

                    <FieldsetGroup title="E · Chứng từ">
                        <Row>
                            <Field label="Số chứng từ"><input className="form-input" disabled={isView} value={form.documentNo} onChange={e => set('documentNo', e.target.value)} /></Field>
                            <Field label="Ngày chứng từ"><input className="form-input" disabled={isView} type="date" value={form.documentDate} onChange={e => set('documentDate', e.target.value)} /></Field>
                        </Row>
                        {!isView && (
                            <Field label="Upload file">
                                <input ref={fileRef} type="file" onChange={upload} disabled={uploading} />
                                {uploading && <span style={{ fontSize: 12 }}> Đang tải lên...</span>}
                            </Field>
                        )}
                        {form.attachments?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                {form.attachments.map((a, i) => (
                                    <a key={i} href={a.url} target="_blank" rel="noreferrer" className="badge info" style={{ textDecoration: 'none' }}>📎 {a.name}</a>
                                ))}
                            </div>
                        )}
                        <Field label="Ghi chú"><textarea className="form-input" disabled={isView} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
                    </FieldsetGroup>

                    {isView && tx.audits?.length > 0 && (
                        <FieldsetGroup title="Lịch sử">
                            {tx.audits.map(a => (
                                <div key={a.id} style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0', borderBottom: '1px dotted var(--border-color)' }}>
                                    {a.action === 'create' ? '🆕 Tạo' : a.action === 'update' ? '✏️ Cập nhật' : a.action === 'cancel' ? '🚫 Hủy' : a.action}
                                    {' bởi '}{a.actorName} — {new Date(a.createdAt).toLocaleString('vi-VN')}
                                    {a.reason && ` — Lý do: ${a.reason}`}
                                </div>
                            ))}
                        </FieldsetGroup>
                    )}
                </div>
                {!isView && (
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Hủy bỏ</button>
                        <button className="btn btn-secondary" onClick={() => submit('Nháp')} disabled={saving}>💾 Lưu nháp</button>
                        <button className="btn btn-primary" onClick={() => submit('Đã hạch toán')} disabled={saving}>✅ Lưu &amp; Hạch toán</button>
                    </div>
                )}
            </div>
        </div>
    );
}

function FieldsetGroup({ title, children }) {
    return (
        <fieldset style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <legend style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-accent)', padding: '0 6px' }}>{title}</legend>
            {children}
        </fieldset>
    );
}
function Row({ children }) { return <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{Array.isArray(children) ? children.map((c, i) => <div key={i} style={{ flex: 1, minWidth: 160 }}>{c}</div>) : children}</div>; }
function Field({ label, children }) { return <div className="form-group"><label className="form-label">{label}</label>{children}</div>; }

// ════════════════════════════════════════════════════════════════════════
function CancelModal({ tx, onClose, onConfirm }) {
    const [reason, setReason] = useState('');
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                <div className="modal-header"><h3>🚫 Hủy giao dịch {tx.code}</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Lý do hủy *</label>
                        <textarea className="form-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
                    <button className="btn btn-danger" disabled={!reason.trim()} onClick={() => onConfirm(reason)}>Xác nhận hủy</button>
                </div>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function ReconcilePanel({ bankAccounts, canSave }) {
    const [targetType, setTargetType] = useState('cash');
    const [bankAccountId, setBankAccountId] = useState('');
    const [systemBalance, setSystemBalance] = useState(null);
    const [actualBalance, setActualBalance] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchBalance = useCallback(async () => {
        if (targetType === 'bank' && !bankAccountId) { setSystemBalance(null); return; }
        setLoading(true);
        if (targetType === 'cash') {
            const agg = await fetch(`/api/finance-transactions?status=${encodeURIComponent('Đã hạch toán')}&limit=1`).then(r => r.json()).catch(() => null);
            setSystemBalance(agg?.summary ? (agg.summary.totalCashIn - agg.summary.totalCashOut) : 0);
        } else {
            const banks = await fetch('/api/bank-accounts').then(r => r.json()).catch(() => []);
            const b = (banks || []).find(x => x.id === bankAccountId);
            setSystemBalance(b?.balance ?? 0);
        }
        setLoading(false);
    }, [targetType, bankAccountId]);

    useEffect(() => { fetchBalance(); }, [fetchBalance]);

    const diff = actualBalance !== '' && systemBalance !== null ? Number(actualBalance) - systemBalance : null;

    const save = async () => {
        if (targetType === 'bank' && !bankAccountId) return alert('Vui lòng chọn tài khoản ngân hàng');
        if (actualBalance === '') return alert('Vui lòng nhập số dư thực tế');
        setSaving(true);
        const res = await fetch('/api/cash-reconciliation', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetType, bankAccountId: targetType === 'bank' ? bankAccountId : null, actualBalance: Number(actualBalance) }),
        });
        setSaving(false);
        if (res.ok) { alert('Đã lưu đối chiếu'); setActualBalance(''); }
        else alert((await res.json()).error || 'Lỗi lưu đối chiếu');
    };

    return (
        <details className="card" style={{ marginBottom: 16, padding: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>🔍 Đối chiếu số dư</summary>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12, alignItems: 'flex-end' }}>
                <Field label="Đối tượng">
                    <select className="form-select" value={targetType} onChange={e => { setTargetType(e.target.value); setBankAccountId(''); }}>
                        <option value="cash">Tiền mặt</option><option value="bank">Tài khoản ngân hàng</option>
                    </select>
                </Field>
                {targetType === 'bank' && (
                    <Field label="Tài khoản">
                        <select className="form-select" value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}>
                            <option value="">-- chọn --</option>
                            {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} — {b.accountNumber}</option>)}
                        </select>
                    </Field>
                )}
                <Field label="Số dư hệ thống"><input className="form-input" disabled value={loading ? '...' : fmt(systemBalance)} /></Field>
                <Field label="Số dư thực tế"><input className="form-input" type="number" value={actualBalance} onChange={e => setActualBalance(e.target.value)} /></Field>
                <Field label="Chênh lệch">
                    <input className="form-input" disabled value={diff === null ? '' : fmt(diff)}
                        style={{ color: diff && diff !== 0 ? 'var(--status-danger)' : 'var(--status-success)', fontWeight: 700 }} />
                </Field>
                {canSave && <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>Lưu đối chiếu</button>}
            </div>
            {diff !== null && diff !== 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--status-danger)' }}>⚠️ Có chênh lệch giữa sổ sách và thực tế — cần kiểm tra lại.</div>
            )}
        </details>
    );
}

// ════════════════════════════════════════════════════════════════════════
function SettingsModal({ categories, bankAccounts, accounts, onClose, onRefresh }) {
    const [tab, setTab] = useState('categories');
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="modal-header"><h3>⚙️ Cài đặt danh mục</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="tab-bar">
                    <button className={`tab-item ${tab === 'categories' ? 'active' : ''}`} onClick={() => setTab('categories')}>Phân loại Thu/Chi</button>
                    <button className={`tab-item ${tab === 'banks' ? 'active' : ''}`} onClick={() => setTab('banks')}>TK ngân hàng</button>
                    <button className={`tab-item ${tab === 'accounts' ? 'active' : ''}`} onClick={() => setTab('accounts')}>TK kế toán</button>
                </div>
                <div className="modal-body">
                    {tab === 'categories' && <CategoryManager items={categories} onRefresh={onRefresh} />}
                    {tab === 'banks' && <BankManager items={bankAccounts} onRefresh={onRefresh} />}
                    {tab === 'accounts' && <AccountManager items={accounts} onRefresh={onRefresh} />}
                </div>
            </div>
        </div>
    );
}

function CategoryManager({ items, onRefresh }) {
    const [form, setForm] = useState({ name: '', group: 'Chi' });
    const add = async () => {
        if (!form.name.trim()) return;
        await fetch('/api/finance-categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setForm({ name: '', group: 'Chi' });
        onRefresh();
    };
    const del = async (id) => { await fetch(`/api/finance-categories/${id}`, { method: 'DELETE' }); onRefresh(); };
    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="form-input" placeholder="Tên phân loại" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ flex: 1 }} />
                <select className="form-select" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
                    <option value="Thu">Thu</option><option value="Chi">Chi</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={add}>+ Thêm</button>
            </div>
            <ListRows items={items} render={c => `${c.name} (${c.group})${c.active ? '' : ' — đã ẩn'}`} onDelete={del} />
        </div>
    );
}

function BankManager({ items, onRefresh }) {
    const [form, setForm] = useState({ bankName: '', accountNumber: '', accountHolder: '', openingBalance: 0 });
    const add = async () => {
        if (!form.bankName.trim()) return;
        await fetch('/api/bank-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, openingBalance: Number(form.openingBalance) || 0 }) });
        setForm({ bankName: '', accountNumber: '', accountHolder: '', openingBalance: 0 });
        onRefresh();
    };
    const del = async (id) => { await fetch(`/api/bank-accounts/${id}`, { method: 'DELETE' }); onRefresh(); };
    return (
        <div>
            <Row>
                <input className="form-input" placeholder="Tên ngân hàng" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} />
                <input className="form-input" placeholder="Số tài khoản" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} />
                <input className="form-input" placeholder="Chủ tài khoản" value={form.accountHolder} onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))} />
                <input className="form-input" type="number" placeholder="Số dư đầu kỳ" value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))} />
            </Row>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={add}>+ Thêm TK ngân hàng</button>
            <div style={{ marginTop: 12 }}>
                <ListRows items={items} render={b => `${b.bankName} — ${b.accountNumber} (${b.accountHolder || '—'}) · Số dư: ${fmt(b.balance ?? b.openingBalance)}`} onDelete={del} />
            </div>
        </div>
    );
}

function AccountManager({ items, onRefresh }) {
    const [form, setForm] = useState({ code: '', name: '' });
    const add = async () => {
        if (!form.code.trim() || !form.name.trim()) return;
        await fetch('/api/accounting-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setForm({ code: '', name: '' });
        onRefresh();
    };
    const del = async (id) => { await fetch(`/api/accounting-accounts/${id}`, { method: 'DELETE' }); onRefresh(); };
    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="form-input" placeholder="Mã TK (vd 111)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} style={{ width: 100 }} />
                <input className="form-input" placeholder="Tên TK" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={add}>+ Thêm</button>
            </div>
            <ListRows items={items} render={a => `${a.code} — ${a.name}${a.active ? '' : ' — đã ẩn'}`} onDelete={del} />
        </div>
    );
}

function ListRows({ items, render, onDelete }) {
    return (
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {items.map(it => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', fontSize: 13, borderBottom: '1px dotted var(--border-color)' }}>
                    <span>{render(it)}</span>
                    <button className="btn btn-icon" onClick={() => onDelete(it.id)} title="Xóa / ẩn">🗑️</button>
                </div>
            ))}
            {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Chưa có dữ liệu</div>}
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════
function ImportModal({ onClose, onDone }) {
    const [file, setFile] = useState(null);
    const [rows, setRows] = useState([]);
    const [step, setStep] = useState('pick'); // pick | preview | done
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);

    const pickFile = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        const XLSX = await import('xlsx');
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(ws, { raw: false });
        setRows(parsed);
        setStep('preview');
    };

    const confirmImport = async () => {
        setBusy(true);
        const res = await fetch('/api/finance-transactions/import', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
        });
        const json = await res.json();
        setBusy(false);
        setResult(json);
        setStep('done');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: '85vh', overflowY: 'auto' }}>
                <div className="modal-header"><h3>⬆️ Nhập Excel</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body">
                    {step === 'pick' && (
                        <div className="form-group">
                            <label className="form-label">Chọn file Excel (.xlsx) theo đúng cấu trúc file mẫu</label>
                            <input type="file" accept=".xlsx,.xls" onChange={pickFile} />
                        </div>
                    )}
                    {step === 'preview' && (
                        <div>
                            <div style={{ marginBottom: 8, fontSize: 13 }}>📄 {file?.name} — {rows.length} dòng dữ liệu sẽ được nhập.</div>
                            <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                                <table className="data-table" style={{ fontSize: 11, margin: 0 }}>
                                    <thead><tr>{Object.keys(rows[0] || {}).map(k => <th key={k}>{k}</th>)}</tr></thead>
                                    <tbody>
                                        {rows.slice(0, 20).map((r, i) => (
                                            <tr key={i}>{Object.keys(rows[0] || {}).map(k => <td key={k}>{String(r[k] ?? '')}</td>)}</tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {rows.length > 20 && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>...và {rows.length - 20} dòng khác</div>}
                        </div>
                    )}
                    {step === 'done' && result && (
                        <div>
                            <div style={{ color: 'var(--status-success)', fontWeight: 600, marginBottom: 8 }}>✅ Đã nhập thành công {result.success} dòng</div>
                            {result.errors?.length > 0 && (
                                <div>
                                    <div style={{ color: 'var(--status-danger)', fontWeight: 600, marginBottom: 4 }}>⚠️ {result.errors.length} dòng lỗi:</div>
                                    <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: 12 }}>
                                        {result.errors.map((e, i) => <div key={i}>Dòng {e.row}: {e.message}</div>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    {step === 'preview' && <button className="btn btn-ghost" onClick={() => setStep('pick')} disabled={busy}>← Chọn lại</button>}
                    {step === 'preview' && <button className="btn btn-primary" onClick={confirmImport} disabled={busy}>{busy ? 'Đang nhập...' : `Xác nhận nhập ${rows.length} dòng`}</button>}
                    {step === 'done' && <button className="btn btn-primary" onClick={onDone}>Xong</button>}
                    {step !== 'preview' && step !== 'done' && <button className="btn btn-ghost" onClick={onClose}>Đóng</button>}
                </div>
            </div>
        </div>
    );
}
