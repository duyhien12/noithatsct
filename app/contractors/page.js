'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const CONTRACTOR_TYPES = ['Thầu xây dựng', 'CTV thiết kế kiến trúc', 'CTV Kết cấu', 'CTV 3D', 'Thầu mộc', 'Thầu điện', 'Thầu nước', 'Thầu sơn', 'Thầu đá', 'Thầu cơ khí', 'Thầu nhôm kính', 'Thầu trần thạch cao', 'Khác'];

const emptyForm = { name: '', type: 'Thầu xây dựng', phone: '', address: '', taxCode: '', bankAccount: '', bankName: '', rating: 3, notes: '' };

export default function ContractorsPage() {
    const [contractors, setContractors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [pastePreview, setPastePreview] = useState([]);
    const [importing, setImporting] = useState(false);

    const fetchData = () => { setLoading(true); fetch('/api/contractors?limit=1000').then(r => r.json()).then(d => { setContractors(d.data || []); setLoading(false); }); };
    useEffect(fetchData, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (c) => {
        setEditing(c);
        setForm({ name: c.name, type: c.type, phone: c.phone, address: c.address, taxCode: c.taxCode, bankAccount: c.bankAccount, bankName: c.bankName, rating: c.rating, notes: c.notes });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('Nhập tên thầu phụ!');
        if (editing) {
            await fetch(`/api/contractors/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        } else {
            await fetch('/api/contractors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id) => { if (!confirm('Xóa thầu phụ này?')) return; await fetch(`/api/contractors/${id}`, { method: 'DELETE' }); fetchData(); };

    const parsePasteC = () => {
        const existingNames = new Set(contractors.map(c => c.name.toLowerCase().trim()));
        const rows = pasteText.trim().split('\n').map(row => {
            const c = row.split('\t');
            const name = c[0]?.trim() || '';
            return {
                name,
                type: CONTRACTOR_TYPES.includes(c[1]?.trim()) ? c[1].trim() : 'Thầu xây dựng',
                phone: c[2]?.trim() || '',
                address: c[3]?.trim() || '',
                taxCode: c[4]?.trim() || '',
                bankAccount: c[5]?.trim() || '',
                bankName: c[6]?.trim() || '',
                _isDup: existingNames.has(name.toLowerCase()),
            };
        }).filter(r => r.name);
        setPastePreview(rows);
    };

    const confirmPasteC = async () => {
        if (!pastePreview.length) return;
        setImporting(true);
        const payload = pastePreview.map(({ _isDup, ...c }) => c);
        await fetch('/api/contractors/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setImporting(false);
        setPastePreview([]);
        setShowPasteModal(false);
        setPasteText('');
        fetchData();
    };

    const filtered = contractors.filter(c => {
        if (filterType && c.type !== filterType) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const totalContract = contractors.reduce((s, c) => s + c.payments.reduce((t, p) => t + p.contractAmount, 0), 0);
    const totalPaid = contractors.reduce((s, c) => s + c.payments.reduce((t, p) => t + p.paidAmount, 0), 0);

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">👷</div><div><div className="stat-value">{contractors.length}</div><div className="stat-label">Thầu phụ</div></div></div>
                <div className="stat-card"><div className="stat-icon">📝</div><div><div className="stat-value">{fmt(totalContract)}</div><div className="stat-label">Tổng HĐ thầu</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmt(totalPaid)}</div><div className="stat-label">Đã thanh toán</div></div></div>
                <div className="stat-card"><div className="stat-icon">⚠️</div><div><div className="stat-value" style={{ color: 'var(--status-danger)' }}>{fmt(totalContract - totalPaid)}</div><div className="stat-label">Còn nợ thầu</div></div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3 style={{ margin: 0 }}>Thầu phụ</h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => setShowPasteModal(true)} title="Dán nhiều thầu phụ từ Excel">📋 Excel</button>
                        <button className="btn btn-primary" onClick={openCreate}>+ Thêm TP</button>
                    </div>
                </div>
                <div className="filter-bar">
                    <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">Tất cả loại</option>
                        {CONTRACTOR_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                    <div className="table-container"><table className="data-table">
                        <thead><tr>
                            <th>Mã</th><th>Tên</th><th>Loại</th><th>SĐT</th><th>Ngân hàng</th><th>Đánh giá</th><th>HĐ thầu</th><th>Đã TT</th><th>Nợ</th><th style={{ width: 80 }}></th>
                        </tr></thead>
                        <tbody>{filtered.map(c => {
                            const ct = c.payments.reduce((s, p) => s + p.contractAmount, 0);
                            const pd = c.payments.reduce((s, p) => s + p.paidAmount, 0);
                            return (
                                <tr key={c.id}>
                                    <td className="accent">{c.code}</td>
                                    <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>{c.name}</td>
                                    <td><span className="badge badge-default">{c.type}</span></td>
                                    <td>{c.phone || '—'}</td>
                                    <td style={{ fontSize: 12 }}>{c.bankAccount ? `${c.bankName} - ${c.bankAccount}` : '—'}</td>
                                    <td>{'⭐'.repeat(c.rating)}</td>
                                    <td>{ct > 0 ? fmt(ct) : '—'}</td>
                                    <td style={{ color: 'var(--status-success)' }}>{pd > 0 ? fmt(pd) : '—'}</td>
                                    <td style={{ fontWeight: 700, color: ct - pd > 0 ? 'var(--status-danger)' : '' }}>{ct - pd > 0 ? fmt(ct - pd) : '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table></div>
                )}
            </div>

            {showPasteModal && !pastePreview.length && (
                <div className="modal-overlay" onClick={() => { setShowPasteModal(false); setPasteText(''); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div className="modal-header">
                            <h3>📋 Dán danh sách thầu phụ từ Excel</h3>
                            <button className="modal-close" onClick={() => { setShowPasteModal(false); setPasteText(''); }}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                                Copy các hàng từ Excel (không cần tiêu đề) và dán vào đây.<br />
                                <strong>Thứ tự cột:</strong> Tên* | Loại | SĐT | Địa chỉ | MST | STK ngân hàng | Tên ngân hàng
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                                <strong>Giá trị Loại hợp lệ:</strong> {CONTRACTOR_TYPES.join(', ')}
                            </p>
                            <textarea className="form-input" rows={10} style={{ fontFamily: 'monospace', fontSize: 12 }}
                                placeholder="Dán dữ liệu Excel vào đây..."
                                value={pasteText} onChange={e => setPasteText(e.target.value)} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { setShowPasteModal(false); setPasteText(''); }}>Hủy</button>
                            <button className="btn btn-primary" onClick={parsePasteC} disabled={!pasteText.trim()}>Xem trước</button>
                        </div>
                    </div>
                </div>
            )}

            {pastePreview.length > 0 && (
                <div className="modal-overlay" onClick={() => setPastePreview([])}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 820 }}>
                        <div className="modal-header">
                            <h3>Xem trước — {pastePreview.length} thầu phụ</h3>
                            <button className="modal-close" onClick={() => setPastePreview([])}>×</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead><tr><th>Tên</th><th>Loại</th><th>SĐT</th><th>Địa chỉ</th><th>Ngân hàng</th></tr></thead>
                                <tbody>{pastePreview.map((r, i) => (
                                    <tr key={i} style={{ background: r._isDup ? 'rgba(255,165,0,0.08)' : '' }}>
                                        <td>{r.name} {r._isDup && <span style={{ fontSize: 11, color: 'orange', fontWeight: 600 }}>trùng</span>}</td>
                                        <td><span className="badge badge-default">{r.type}</span></td>
                                        <td>{r.phone || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{r.address || '—'}</td>
                                        <td style={{ fontSize: 12 }}>{r.bankAccount ? `${r.bankName} - ${r.bankAccount}` : '—'}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setPastePreview([])}>← Sửa lại</button>
                            <button className="btn btn-primary" onClick={confirmPasteC} disabled={importing}>
                                {importing ? 'Đang nhập...' : `✅ Nhập ${pastePreview.length} thầu phụ`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa thầu phụ' : '+ Thêm thầu phụ'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên thầu phụ *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {CONTRACTOR_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ</label>
                                <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Mã số thuế</label>
                                    <input className="form-input" value={form.taxCode} onChange={e => setForm({ ...form, taxCode: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Đánh giá</label>
                                    <select className="form-select" value={form.rating} onChange={e => setForm({ ...form, rating: Number(e.target.value) })}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'⭐'.repeat(n)} {n}</option>)}
                                    </select></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">STK ngân hàng</label>
                                    <input className="form-input" value={form.bankAccount} onChange={e => setForm({ ...form, bankAccount: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân hàng</label>
                                    <input className="form-input" value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>{editing ? 'Cập nhật' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
