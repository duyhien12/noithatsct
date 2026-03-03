'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const SUPPLIER_TYPES = ['Vật tư xây dựng', 'Thiết bị vệ sinh', 'Thiết bị điện', 'Nội thất', 'Sắt thép', 'Gạch ốp lát', 'Sơn', 'Nhôm kính', 'Cơ khí', 'Khác'];
const CONTRACTOR_TYPES = ['Thầu xây dựng', 'CTV thiết kế kiến trúc', 'CTV Kết cấu', 'CTV 3D', 'Thầu mộc', 'Thầu điện', 'Thầu nước', 'Thầu sơn', 'Thầu đá', 'Thầu cơ khí', 'Thầu nhôm kính', 'Thầu trần thạch cao', 'Khác'];

const emptySup = { name: '', type: 'Vật tư xây dựng', contact: '', phone: '', email: '', address: '', taxCode: '', bankAccount: '', bankName: '', rating: 3, notes: '' };
const emptyCon = { name: '', type: 'Thầu xây dựng', phone: '', address: '', taxCode: '', bankAccount: '', bankName: '', rating: 3, notes: '' };

export default function PartnersPage() {
    const [tab, setTab] = useState('ncc');
    const [suppliers, setSuppliers] = useState([]);
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [supForm, setSupForm] = useState(emptySup);
    const [conForm, setConForm] = useState(emptyCon);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showPasteModal, setShowPasteModal] = useState(''); // 'ncc' | 'tp' | ''
    const [pasteText, setPasteText] = useState('');
    const [pastePreview, setPastePreview] = useState([]);
    const [importing, setImporting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const [s, c] = await Promise.all([
            fetch('/api/suppliers?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
            fetch('/api/contractors?limit=1000').then(r => r.json()).then(d => d.data || []).catch(() => []),
        ]);
        setSuppliers(s); setContractors(c); setLoading(false);
    };
    useEffect(() => { fetchData(); }, []);

    // === Suppliers CRUD ===
    const openCreateSup = () => { setEditing(null); setSupForm(emptySup); setShowModal('ncc'); };
    const openEditSup = (s) => { setEditing(s); setSupForm({ name: s.name, type: s.type, contact: s.contact, phone: s.phone, email: s.email, address: s.address, taxCode: s.taxCode, bankAccount: s.bankAccount, bankName: s.bankName, rating: s.rating, notes: s.notes }); setShowModal('ncc'); };
    const submitSup = async () => {
        if (!supForm.name.trim()) return alert('Nhập tên NCC!');
        if (editing) await fetch(`/api/suppliers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) });
        else await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) });
        setShowModal(false); fetchData();
    };
    const delSup = async (id) => { if (!confirm('Xóa NCC này?')) return; await fetch(`/api/suppliers/${id}`, { method: 'DELETE' }); fetchData(); };

    // === Contractors CRUD ===
    const openCreateCon = () => { setEditing(null); setConForm(emptyCon); setShowModal('tp'); };
    const openEditCon = (c) => { setEditing(c); setConForm({ name: c.name, type: c.type, phone: c.phone, address: c.address, taxCode: c.taxCode, bankAccount: c.bankAccount, bankName: c.bankName, rating: c.rating, notes: c.notes }); setShowModal('tp'); };
    const submitCon = async () => {
        if (!conForm.name.trim()) return alert('Nhập tên thầu phụ!');
        if (editing) await fetch(`/api/contractors/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conForm) });
        else await fetch('/api/contractors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(conForm) });
        setShowModal(false); fetchData();
    };
    const delCon = async (id) => { if (!confirm('Xóa thầu phụ này?')) return; await fetch(`/api/contractors/${id}`, { method: 'DELETE' }); fetchData(); };

    // === Paste from Excel ===
    const openPaste = (type) => { setShowPasteModal(type); setPasteText(''); setPastePreview([]); };
    const closePaste = () => { setShowPasteModal(''); setPasteText(''); setPastePreview([]); };

    const parsePaste = () => {
        if (showPasteModal === 'ncc') {
            const existingNames = new Set(suppliers.map(s => s.name.toLowerCase().trim()));
            const rows = pasteText.trim().split('\n').map(row => {
                const c = row.split('\t');
                const name = c[0]?.trim() || '';
                return {
                    name, type: SUPPLIER_TYPES.includes(c[1]?.trim()) ? c[1].trim() : 'Vật tư xây dựng',
                    phone: c[2]?.trim() || '', address: c[3]?.trim() || '', taxCode: c[4]?.trim() || '',
                    bankAccount: c[5]?.trim() || '', bankName: c[6]?.trim() || '',
                    contact: c[7]?.trim() || '', email: c[8]?.trim() || '',
                    _isDup: existingNames.has(name.toLowerCase()),
                };
            }).filter(r => r.name);
            setPastePreview(rows);
        } else {
            const existingNames = new Set(contractors.map(c => c.name.toLowerCase().trim()));
            const rows = pasteText.trim().split('\n').map(row => {
                const c = row.split('\t');
                const name = c[0]?.trim() || '';
                return {
                    name, type: CONTRACTOR_TYPES.includes(c[1]?.trim()) ? c[1].trim() : 'Thầu xây dựng',
                    phone: c[2]?.trim() || '', address: c[3]?.trim() || '', taxCode: c[4]?.trim() || '',
                    bankAccount: c[5]?.trim() || '', bankName: c[6]?.trim() || '',
                    _isDup: existingNames.has(name.toLowerCase()),
                };
            }).filter(r => r.name);
            setPastePreview(rows);
        }
    };

    const confirmPaste = async () => {
        if (!pastePreview.length) return;
        setImporting(true);
        const endpoint = showPasteModal === 'ncc' ? '/api/suppliers/bulk' : '/api/contractors/bulk';
        const payload = pastePreview.map(({ _isDup, ...r }) => r);
        await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setImporting(false);
        closePaste();
        fetchData();
    };

    // === Filter ===
    const filteredSup = suppliers.filter(s => {
        if (filterType && s.type !== filterType) return false;
        if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });
    const filteredCon = contractors.filter(c => {
        if (filterType && c.type !== filterType) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalConContract = contractors.reduce((s, c) => s + (c.payments?.reduce((t, p) => t + p.contractAmount, 0) || 0), 0);
    const totalConPaid = contractors.reduce((s, c) => s + (c.payments?.reduce((t, p) => t + p.paidAmount, 0) || 0), 0);

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card"><div className="stat-icon">🏭</div><div><div className="stat-value">{suppliers.length}</div><div className="stat-label">Nhà cung cấp</div></div></div>
                <div className="stat-card"><div className="stat-icon">👷</div><div><div className="stat-value">{contractors.length}</div><div className="stat-label">Thầu phụ / CTV</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(totalConContract)}</div><div className="stat-label">Tổng HĐ thầu phụ</div></div></div>
                <div className="stat-card"><div className="stat-icon">💸</div><div><div className="stat-value">{fmt(totalConPaid)}</div><div className="stat-label">Đã thanh toán TP</div></div></div>
            </div>

            {/* Tabs */}
            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)' }}>
                        {[{ key: 'ncc', label: '🏭 Nhà cung cấp', count: suppliers.length }, { key: 'tp', label: '👷 Thầu phụ / CTV', count: contractors.length }].map(t => (
                            <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilterType(''); }}
                                style={{ padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', borderBottom: tab === t.key ? '3px solid var(--accent-primary)' : '3px solid transparent', background: 'none', color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', transition: '0.2s' }}>
                                {t.label} <span className="badge muted" style={{ marginLeft: 4 }}>{t.count}</span>
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, fontSize: 13 }} />
                            <select className="form-select" style={{ width: 180 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">Tất cả loại</option>
                                {(tab === 'ncc' ? SUPPLIER_TYPES : CONTRACTOR_TYPES).map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-ghost" onClick={() => openPaste(tab === 'ncc' ? 'ncc' : 'tp')}>📋 Dán Excel</button>
                            <button className="btn btn-primary" onClick={tab === 'ncc' ? openCreateSup : openCreateCon}>
                                + Thêm {tab === 'ncc' ? 'NCC' : 'Thầu phụ'}
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : tab === 'ncc' ? (
                    /* ========== NCC Table ========== */
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead><tr>
                                <th>Mã</th><th>Tên NCC</th><th>Loại</th><th>Liên hệ</th><th>SĐT</th><th>Ngân hàng</th><th>Đánh giá</th><th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>{filteredSup.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có dữ liệu</td></tr>
                            ) : filteredSup.map(s => (
                                <tr key={s.id}>
                                    <td className="accent">{s.code}</td>
                                    <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEditSup(s)}>{s.name}</td>
                                    <td><span className="badge info">{s.type}</span></td>
                                    <td style={{ fontSize: 12 }}>{s.contact || '—'}</td>
                                    <td>{s.phone || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{s.bankAccount ? `${s.bankName} - ${s.bankAccount}` : '—'}</td>
                                    <td>{'⭐'.repeat(s.rating)}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEditSup(s)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => delSup(s.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : (
                    /* ========== Thầu phụ Table ========== */
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead><tr>
                                <th>Mã</th><th>Tên thầu phụ</th><th>Loại</th><th>SĐT</th><th>Tổng HĐ</th><th>Đã TT</th><th>Công nợ</th><th>Đánh giá</th><th style={{ width: 80 }}></th>
                            </tr></thead>
                            <tbody>{filteredCon.length === 0 ? (
                                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có dữ liệu</td></tr>
                            ) : filteredCon.map(c => {
                                const contractAmt = c.payments?.reduce((t, p) => t + p.contractAmount, 0) || 0;
                                const paidAmt = c.payments?.reduce((t, p) => t + p.paidAmount, 0) || 0;
                                const debt = contractAmt - paidAmt;
                                return (
                                    <tr key={c.id}>
                                        <td className="accent">{c.code}</td>
                                        <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEditCon(c)}>{c.name}</td>
                                        <td><span className="badge warning">{c.type}</span></td>
                                        <td>{c.phone || '—'}</td>
                                        <td className="amount">{fmt(contractAmt)}</td>
                                        <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(paidAmt)}</td>
                                        <td style={{ color: debt > 0 ? 'var(--status-danger)' : 'var(--text-muted)', fontWeight: 600 }}>{fmt(debt)}</td>
                                        <td>{'⭐'.repeat(c.rating)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => openEditCon(c)}>✏️</button>
                                                <button className="btn btn-ghost btn-sm" onClick={() => delCon(c.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Paste Modal — step 1: input */}
            {showPasteModal && !pastePreview.length && (
                <div className="modal-overlay" onClick={closePaste}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div className="modal-header">
                            <h3>📋 Dán {showPasteModal === 'ncc' ? 'nhà cung cấp' : 'thầu phụ'} từ Excel</h3>
                            <button className="modal-close" onClick={closePaste}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                                Copy các hàng từ Excel (không cần tiêu đề) và dán vào đây.<br />
                                {showPasteModal === 'ncc'
                                    ? <><strong>Thứ tự cột:</strong> Tên* | Loại | SĐT | Địa chỉ | MST | STK ngân hàng | Tên ngân hàng | Người liên hệ | Email</>
                                    : <><strong>Thứ tự cột:</strong> Tên* | Loại | SĐT | Địa chỉ | MST | STK ngân hàng | Tên ngân hàng</>}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                <strong>Giá trị Loại hợp lệ:</strong> {(showPasteModal === 'ncc' ? SUPPLIER_TYPES : CONTRACTOR_TYPES).join(', ')}
                            </p>
                            <textarea className="form-input" rows={10} style={{ fontFamily: 'monospace', fontSize: 12 }}
                                placeholder="Dán dữ liệu Excel vào đây..."
                                value={pasteText} onChange={e => setPasteText(e.target.value)} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={closePaste}>Hủy</button>
                            <button className="btn btn-primary" onClick={parsePaste} disabled={!pasteText.trim()}>Xem trước</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Paste Modal — step 2: preview */}
            {pastePreview.length > 0 && (
                <div className="modal-overlay" onClick={() => setPastePreview([])}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 820 }}>
                        <div className="modal-header">
                            <h3>Xem trước — {pastePreview.length} {showPasteModal === 'ncc' ? 'NCC' : 'thầu phụ'}</h3>
                            <button className="modal-close" onClick={() => setPastePreview([])}>×</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 420, overflowY: 'auto' }}>
                            <table className="data-table">
                                <thead><tr>
                                    <th>Tên</th><th>Loại</th><th>SĐT</th><th>Địa chỉ</th><th>Ngân hàng</th>
                                    {showPasteModal === 'ncc' && <th>Liên hệ</th>}
                                </tr></thead>
                                <tbody>{pastePreview.map((r, i) => (
                                    <tr key={i} style={{ background: r._isDup ? 'rgba(255,165,0,0.08)' : '' }}>
                                        <td>{r.name} {r._isDup && <span style={{ fontSize: 11, color: 'orange', fontWeight: 600 }}>trùng</span>}</td>
                                        <td><span className={`badge ${showPasteModal === 'ncc' ? 'info' : 'warning'}`}>{r.type}</span></td>
                                        <td>{r.phone || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{r.address || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{r.bankAccount ? `${r.bankName} - ${r.bankAccount}` : '—'}</td>
                                        {showPasteModal === 'ncc' && <td style={{ fontSize: 12 }}>{r.contact || '—'}</td>}
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setPastePreview([])}>← Sửa lại</button>
                            <button className="btn btn-primary" onClick={confirmPaste} disabled={importing}>
                                {importing ? 'Đang nhập...' : `✅ Nhập ${pastePreview.length} ${showPasteModal === 'ncc' ? 'NCC' : 'thầu phụ'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal NCC */}
            {showModal === 'ncc' && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa nhà cung cấp' : '+ Thêm nhà cung cấp'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên NCC *</label>
                                <input className="form-input" value={supForm.name} onChange={e => setSupForm({ ...supForm, name: e.target.value })} placeholder="VD: An Cường, Bosch..." /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={supForm.type} onChange={e => setSupForm({ ...supForm, type: e.target.value })}>
                                        {SUPPLIER_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">Người liên hệ</label>
                                    <input className="form-input" value={supForm.contact} onChange={e => setSupForm({ ...supForm, contact: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">SĐT</label>
                                    <input className="form-input" value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Email</label>
                                    <input className="form-input" value={supForm.email} onChange={e => setSupForm({ ...supForm, email: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ</label>
                                <input className="form-input" value={supForm.address} onChange={e => setSupForm({ ...supForm, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Mã số thuế</label>
                                    <input className="form-input" value={supForm.taxCode} onChange={e => setSupForm({ ...supForm, taxCode: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Đánh giá</label>
                                    <select className="form-select" value={supForm.rating} onChange={e => setSupForm({ ...supForm, rating: Number(e.target.value) })}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} {n}</option>)}
                                    </select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">STK ngân hàng</label>
                                    <input className="form-input" value={supForm.bankAccount} onChange={e => setSupForm({ ...supForm, bankAccount: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân hàng</label>
                                    <input className="form-input" value={supForm.bankName} onChange={e => setSupForm({ ...supForm, bankName: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={supForm.notes} onChange={e => setSupForm({ ...supForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submitSup}>{editing ? 'Cập nhật' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Thầu phụ */}
            {showModal === 'tp' && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa thầu phụ' : '+ Thêm thầu phụ'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên thầu phụ *</label>
                                <input className="form-input" value={conForm.name} onChange={e => setConForm({ ...conForm, name: e.target.value })} placeholder="VD: Anh Tuấn - Thợ mộc..." /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={conForm.type} onChange={e => setConForm({ ...conForm, type: e.target.value })}>
                                        {CONTRACTOR_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">SĐT</label>
                                    <input className="form-input" value={conForm.phone} onChange={e => setConForm({ ...conForm, phone: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ</label>
                                <input className="form-input" value={conForm.address} onChange={e => setConForm({ ...conForm, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Mã số thuế</label>
                                    <input className="form-input" value={conForm.taxCode} onChange={e => setConForm({ ...conForm, taxCode: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Đánh giá</label>
                                    <select className="form-select" value={conForm.rating} onChange={e => setConForm({ ...conForm, rating: Number(e.target.value) })}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} {n}</option>)}
                                    </select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">STK ngân hàng</label>
                                    <input className="form-input" value={conForm.bankAccount} onChange={e => setConForm({ ...conForm, bankAccount: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân hàng</label>
                                    <input className="form-input" value={conForm.bankName} onChange={e => setConForm({ ...conForm, bankName: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={conForm.notes} onChange={e => setConForm({ ...conForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={submitCon}>{editing ? 'Cập nhật' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
