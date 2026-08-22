'use client';
import { useState, useEffect, useCallback } from 'react';
import FinanceRecordModal, { ObjectPicker } from '@/components/FinanceRecordModal';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const today = () => new Date().toISOString().slice(0, 10);

export default function PayablesPage() {
    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [dashboard, setDashboard] = useState({ totalPayable: 0, periodPayable: 0, periodPaid: 0, supplierCount: 0 });
    const [loading, setLoading] = useState(true);

    const [suppliers, setSuppliers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [cashFunds, setCashFunds] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [filters, setFilters] = useState({ from: '', to: '', projectId: '', status: '', search: '' });
    const [searchInput, setSearchInput] = useState('');
    const [drawerSupplierId, setDrawerSupplierId] = useState(null);
    const [payOpen, setPayOpen] = useState(false);
    const [debtOpen, setDebtOpen] = useState(false);

    const fetchLookups = useCallback(async () => {
        const [sups, projs, banks, funds, accs] = await Promise.all([
            fetch('/api/suppliers?limit=500').then(r => r.json()).then(d => d.data || d || []).catch(() => []),
            fetch('/api/projects?limit=500').then(r => r.json()).then(d => d.data || d || []).catch(() => []),
            fetch('/api/bank-accounts').then(r => r.json()).catch(() => []),
            fetch('/api/cash-funds').then(r => r.json()).catch(() => []),
            fetch('/api/accounting-accounts').then(r => r.json()).catch(() => []),
        ]);
        setSuppliers(Array.isArray(sups) ? sups : []);
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
        const res = await fetch(`/api/payables?${params}`).then(r => r.json()).catch(() => null);
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

    const clearFilters = () => { setFilters({ from: '', to: '', projectId: '', status: '', search: '' }); setSearchInput(''); };

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        params.set('limit', '1000');
        const res = await fetch(`/api/payables?${params}`).then(r => r.json());
        const sheetRows = (res.data || []).map((r, i) => ({
            'STT': i + 1, 'NCC': r.supplierName, 'Số dư đầu kỳ': r.openingBalance, 'Phát sinh trong kỳ': r.periodPayable,
            'Đã trả trong kỳ': r.periodPaid, 'Tồn cuối kỳ': r.closingBalance, 'Giao dịch gần nhất': fmtDate(r.lastDate),
        }));
        const ws = XLSX.utils.json_to_sheet(sheetRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Công nợ NCC');
        XLSX.writeFile(wb, `cong-no-ncc-${today()}.xlsx`);
    };

    const saveOpeningBalance = async (supplierId, value) => {
        await fetch(`/api/payables/${supplierId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openingBalance: value }),
        });
        fetchRows(pagination.page);
    };

    return (
        <div>
            <div style={{
                position: 'sticky', top: 'var(--header-height)', zIndex: 50,
                background: 'var(--bg-primary)', padding: '12px 0', margin: '-12px 0 4px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>🧾 Công nợ Nhà cung cấp</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={exportExcel}>⬇️ Xuất Excel</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDebtOpen(true)}>+ Ghi nợ mua hàng</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setPayOpen(true)}>+ Ghi nhận thanh toán</button>
                </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                ℹ️ &quot;Phát sinh&quot; = mua chịu chưa trả (Ghi nợ mua hàng). &quot;Đã trả&quot; lấy từ Nhật ký Thu – Chi (đối tượng = NCC). Bấm vào ô &quot;Số dư đầu kỳ&quot; để sửa.
            </div>

            <DashboardCards dashboard={dashboard} setFilters={setFilters} />

            <FilterBar filters={filters} setFilters={setFilters} searchInput={searchInput} setSearchInput={setSearchInput}
                projects={projects} onClear={clearFilters} count={pagination.total} />

            <SupplierTable rows={rows} loading={loading} onOpen={(id) => setDrawerSupplierId(id)} onSaveOpening={saveOpeningBalance} />

            {pagination.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page <= 1} onClick={() => fetchRows(pagination.page - 1)}>← Trước</button>
                    <span style={{ fontSize: 13, alignSelf: 'center' }}>Trang {pagination.page}/{pagination.totalPages}</span>
                    <button className="btn btn-ghost btn-sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchRows(pagination.page + 1)}>Sau →</button>
                </div>
            )}

            {drawerSupplierId && (
                <SupplierDetailModal supplierId={drawerSupplierId} bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts} projects={projects}
                    onClose={() => setDrawerSupplierId(null)} onChanged={() => fetchRows(pagination.page)} />
            )}

            {payOpen && (
                <FinanceRecordModal title="+ Ghi nhận thanh toán NCC" objectType="NCC" objectOptions={suppliers}
                    bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts}
                    debitCode="331" onClose={() => setPayOpen(false)} onDone={() => { setPayOpen(false); fetchRows(1); }} />
            )}

            {debtOpen && (
                <DebtModal suppliers={suppliers} projects={projects}
                    onClose={() => setDebtOpen(false)} onDone={() => { setDebtOpen(false); fetchRows(1); }} />
            )}
        </div>
    );
}

function DashboardCards({ dashboard }) {
    const cards = [
        { label: 'Tổng còn nợ', value: dashboard.totalPayable, color: 'var(--status-warning)', bg: 'rgba(245, 158, 11, 0.12)', icon: '🧾' },
        { label: 'Phát sinh trong kỳ', value: dashboard.periodPayable, color: 'var(--status-danger)', bg: 'rgba(239, 68, 68, 0.12)', icon: '📥' },
        { label: 'Đã trả trong kỳ', value: dashboard.periodPaid, color: 'var(--status-success)', bg: 'rgba(52, 211, 153, 0.12)', icon: '📤' },
        { label: 'Số NCC còn nợ', value: dashboard.supplierCount, isCount: true, color: 'var(--accent-primary)', bg: 'rgba(59, 130, 246, 0.12)', icon: '🏭' },
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

function FilterBar({ filters, setFilters, searchInput, setSearchInput, projects, onClear, count }) {
    const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));
    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
                <input className="form-input search-input" placeholder="🔍 Tìm NCC..."
                    value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
                <input className="form-input" type="date" value={filters.from} onChange={e => set('from', e.target.value)} title="Từ ngày" />
                <input className="form-input" type="date" value={filters.to} onChange={e => set('to', e.target.value)} title="Đến ngày" />
                <select className="form-select" value={filters.projectId} onChange={e => set('projectId', e.target.value)}>
                    <option value="">Mọi dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
                <select className="form-select" value={filters.status} onChange={e => set('status', e.target.value)}>
                    <option value="">Mọi trạng thái</option>
                    <option value="with_balance">Còn nợ</option>
                    <option value="settled">Đã tất toán</option>
                </select>
                <button className="btn btn-ghost btn-sm" onClick={onClear}>✕ Xóa lọc</button>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{count} NCC</div>
            </div>
        </div>
    );
}

function OpeningBalanceCell({ value, onSave }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    useEffect(() => { setVal(value); }, [value]);

    if (editing) {
        return (
            <input
                className="form-input" type="number" autoFocus style={{ width: 130, textAlign: 'right' }}
                value={val} onClick={e => e.stopPropagation()}
                onChange={e => setVal(e.target.value)}
                onBlur={() => { setEditing(false); if (Number(val) !== value) onSave(Number(val) || 0); }}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
            />
        );
    }
    return (
        <span style={{ cursor: 'pointer', borderBottom: '1px dashed var(--text-muted)' }}
            title="Bấm để sửa số dư đầu kỳ"
            onClick={e => { e.stopPropagation(); setEditing(true); }}>
            {fmt(value)}
        </span>
    );
}

function SupplierTable({ rows, loading, onOpen, onSaveOpening }) {
    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
    if (rows.length === 0) return <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu</div>;

    return (
        <div className="card">
            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                    <thead>
                        <tr>
                            <th>#</th><th>NCC</th>
                            <th style={{ textAlign: 'right' }}>Số dư đầu kỳ</th>
                            <th style={{ textAlign: 'right' }}>Phát sinh trong kỳ</th>
                            <th style={{ textAlign: 'right' }}>Đã trả trong kỳ</th>
                            <th style={{ textAlign: 'right' }}>Tồn cuối kỳ</th>
                            <th>Giao dịch gần nhất</th>
                            <th>Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={r.supplierId} onClick={() => onOpen(r.supplierId)} style={{ cursor: 'pointer' }}>
                                <td>{i + 1}</td>
                                <td><strong>{r.supplierName}</strong></td>
                                <td style={{ textAlign: 'right' }}>
                                    <OpeningBalanceCell value={r.openingBalance} onSave={(v) => onSaveOpening(r.supplierId, v)} />
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmt(r.periodPayable)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmt(r.periodPaid)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.closingBalance)}</td>
                                <td>{fmtDate(r.lastDate)}</td>
                                <td>
                                    <span className="badge" style={r.status === 'with_balance'
                                        ? { background: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)' }
                                        : { background: 'rgba(52, 211, 153, 0.15)', color: 'var(--status-success)' }}>
                                        {r.status === 'with_balance' ? 'Còn nợ' : 'Đã tất toán'}
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
function SupplierDetailModal({ supplierId, bankAccounts, cashFunds, accounts, projects, onClose, onChanged }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [payOpen, setPayOpen] = useState(false);
    const [debtOpen, setDebtOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/payables/${supplierId}`).then(r => r.json()).catch(() => null);
        setData(res);
        setLoading(false);
    }, [supplierId]);

    useEffect(() => { load(); }, [load]);

    if (loading || !data) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, padding: 40, textAlign: 'center' }}>Đang tải...</div>
            </div>
        );
    }

    const saveOpening = async (value) => {
        await fetch(`/api/payables/${supplierId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ openingBalance: value }),
        });
        load(); onChanged();
    };

    const onDeleteEntry = async (entryId) => {
        if (!confirm('Xóa khoản ghi nợ mua hàng này?')) return;
        await fetch(`/api/payables/entries/${entryId}`, { method: 'DELETE' });
        load(); onChanged();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 1000, width: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div><h2>{data.supplier.name}</h2></div>
                    <button className="btn btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="stats-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    <div className="stat-card">
                        <div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Số dư đầu kỳ</div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}><OpeningBalanceCell value={data.summary.openingBalance} onSave={saveOpening} /> đ</div>
                        </div>
                    </div>
                    <MiniStat label="Phát sinh (toàn thời gian)" value={data.summary.periodPayable} color="var(--status-danger)" />
                    <MiniStat label="Đã trả (toàn thời gian)" value={data.summary.periodPaid} color="var(--status-success)" />
                    <MiniStat label="Còn nợ" value={data.summary.closingBalance} color="var(--status-warning)" bold />
                </div>

                <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDebtOpen(true)}>+ Ghi nợ mua hàng</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setPayOpen(true)}>💳 Ghi nhận thanh toán</button>
                </div>

                <div className="table-container" style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0, fontSize: 12 }}>
                        <thead>
                            <tr>
                                <th>Ngày</th><th>Số phiếu</th><th>Nội dung</th><th>Dự án</th>
                                <th style={{ textAlign: 'right' }}>Phát sinh</th>
                                <th style={{ textAlign: 'right' }}>Đã trả</th>
                                <th style={{ textAlign: 'right' }}>Dư nợ</th>
                                <th>Chứng từ</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.ledger.map((e, i) => (
                                <tr key={i}>
                                    <td>{fmtDate(e.date)}</td>
                                    <td>{e.code}</td>
                                    <td>{e.content}</td>
                                    <td>{e.project ? e.project.code : '—'}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{e.payableAmount ? fmt(e.payableAmount) : ''}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{e.paidAmount ? fmt(e.paidAmount) : ''}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(e.debtBalance)}</td>
                                    <td>{e.attachments?.length > 0 ? e.attachments.map((a, ai) => <a key={ai} href={a.url} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>📎</a>) : '—'}</td>
                                    <td>{e.kind === 'invoice' && <button className="btn btn-icon" title="Xóa khoản ghi nợ này" onClick={() => onDeleteEntry(e.entryId)}>🗑️</button>}</td>
                                </tr>
                            ))}
                            {data.ledger.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chưa có phát sinh</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {payOpen && (
                <FinanceRecordModal title={`💳 Ghi nhận thanh toán — ${data.supplier.name}`} objectType="NCC"
                    fixedObject={{ id: supplierId, name: data.supplier.name }}
                    bankAccounts={bankAccounts} cashFunds={cashFunds} accounts={accounts} debitCode="331"
                    onClose={() => setPayOpen(false)}
                    onDone={() => { setPayOpen(false); load(); onChanged(); }} />
            )}
            {debtOpen && (
                <DebtModal fixedSupplier={{ id: supplierId, name: data.supplier.name }} projects={projects}
                    onClose={() => setDebtOpen(false)}
                    onDone={() => { setDebtOpen(false); load(); onChanged(); }} />
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
// Ghi nợ mua hàng — mua chịu, CHƯA trả tiền. Tạo PayableEntry (bảng mới, tách biệt khỏi
// PurchaseOrder/dữ liệu Mua sắm cũ), không đụng Nhật ký Thu – Chi (không có tiền thật di chuyển).
function DebtModal({ suppliers, projects, fixedSupplier, onClose, onDone }) {
    const [supplier, setSupplier] = useState(fixedSupplier || { id: '', name: '' });
    const [form, setForm] = useState({ date: today(), content: '', amount: '', projectId: '', attachments: [] });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
        if (!supplier.id) return alert('Vui lòng chọn NCC');
        if (!(Number(form.amount) > 0)) return alert('Số tiền phải lớn hơn 0');
        setSaving(true);
        const res = await fetch('/api/payables/entries', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                supplierId: supplier.id, amount: Number(form.amount),
                date: form.date, content: form.content, projectId: form.projectId || null,
                attachments: form.attachments,
            }),
        });
        const json = await res.json();
        setSaving(false);
        if (!res.ok) { alert(json.error || 'Lỗi ghi nợ mua hàng'); return; }
        onDone();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <h2 style={{ marginBottom: 4 }}>+ Ghi nợ mua hàng</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Mua chịu — chưa trả tiền. Không tạo giao dịch trong Nhật ký Thu – Chi.</div>
                <div style={{ display: 'grid', gap: 12 }}>
                    {!fixedSupplier && (
                        <div>
                            <label className="form-label">Nhà cung cấp *</label>
                            <ObjectPicker options={suppliers} objectId={supplier.id} objectName={supplier.name} onChange={setSupplier} />
                        </div>
                    )}
                    <div>
                        <label className="form-label">Ngày phát sinh *</label>
                        <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
                    </div>
                    <div>
                        <label className="form-label">Nội dung</label>
                        <input className="form-input" value={form.content} onChange={e => set('content', e.target.value)} placeholder="VD: Mua vật tư đợt 1" />
                    </div>
                    <div>
                        <label className="form-label">Số tiền *</label>
                        <input className="form-input" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0" />
                    </div>
                    {projects.length > 0 && (
                        <div>
                            <label className="form-label">Dự án/Công trình</label>
                            <select className="form-select" value={form.projectId} onChange={e => set('projectId', e.target.value)}>
                                <option value="">-- không có --</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="form-label">Chứng từ công nợ</label>
                        <input className="form-file" type="file" onChange={upload} disabled={uploading} />
                        {form.attachments.map((a, i) => (
                            <div key={i} style={{ fontSize: 12, marginTop: 4 }}>
                                📎 <a href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
                                <button className="btn btn-icon" onClick={() => set('attachments', form.attachments.filter((_, idx) => idx !== i))}>✕</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                </div>
            </div>
        </div>
    );
}
