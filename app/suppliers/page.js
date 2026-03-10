'use client';
import { useState, useEffect } from 'react';

const SUPPLIER_TYPES = ['Vật tư xây dựng', 'Thiết bị vệ sinh', 'Thiết bị điện', 'Nội thất', 'Sắt thép', 'Gạch ốp lát', 'Sơn', 'Nhôm kính', 'Cơ khí', 'Khác'];

const emptyForm = { name: '', type: 'Vật tư xây dựng', contact: '', phone: '', email: '', address: '', taxCode: '', bankAccount: '', bankName: '', rating: 3, notes: '' };

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([]);
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

    const fetchData = () => { setLoading(true); fetch('/api/suppliers?limit=1000').then(r => r.json()).then(d => { setSuppliers(d.data || []); setLoading(false); }); };
    useEffect(fetchData, []);

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
    const openEdit = (s) => { setEditing(s); setForm({ name: s.name, type: s.type, contact: s.contact, phone: s.phone, email: s.email, address: s.address, taxCode: s.taxCode, bankAccount: s.bankAccount, bankName: s.bankName, rating: s.rating, notes: s.notes }); setShowModal(true); };

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('Nhập tên NCC!');
        if (editing) {
            await fetch(`/api/suppliers/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        } else {
            await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        }
        setShowModal(false);
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa nhà cung cấp này?')) return;
        const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
        if (res.ok) setSuppliers(prev => prev.filter(s => s.id !== id)); else fetchData();
    };

    const parsePasteS = () => {
        const existingNames = new Set(suppliers.map(s => s.name.toLowerCase().trim()));
        const rows = pasteText.trim().split('\n').map(row => {
            const c = row.split('\t');
            const name = c[0]?.trim() || '';
            return {
                name,
                type: SUPPLIER_TYPES.includes(c[1]?.trim()) ? c[1].trim() : 'Vật tư xây dựng',
                phone: c[2]?.trim() || '',
                address: c[3]?.trim() || '',
                taxCode: c[4]?.trim() || '',
                bankAccount: c[5]?.trim() || '',
                bankName: c[6]?.trim() || '',
                contact: c[7]?.trim() || '',
                email: c[8]?.trim() || '',
                _isDup: existingNames.has(name.toLowerCase()),
            };
        }).filter(r => r.name);
        setPastePreview(rows);
    };

    const confirmPasteS = async () => {
        if (!pastePreview.length) return;
        setImporting(true);
        const payload = pastePreview.map(({ _isDup, ...s }) => s);
        await fetch('/api/suppliers/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setImporting(false);
        setPastePreview([]);
        setShowPasteModal(false);
        setPasteText('');
        fetchData();
    };

    const filtered = suppliers.filter(s => {
        if (filterType && s.type !== filterType) return false;
        if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.code?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">🏭</div><div><div className="stat-value">{suppliers.length}</div><div className="stat-label">Nhà cung cấp</div></div></div>
                <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value">{[...new Set(suppliers.map(s => s.type))].length}</div><div className="stat-label">Loại NCC</div></div></div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header">
                    <h3 style={{ margin: 0 }}>NCC</h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost" onClick={() => setShowPasteModal(true)} title="Dán nhiều NCC từ Excel">📋 Excel</button>
                        <button className="btn btn-primary" onClick={openCreate}>+ Thêm NCC</button>
                    </div>
                </div>
                <div className="filter-bar">
                    <input className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">Tất cả loại</option>
                        {SUPPLIER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                </div>
                {loading ? <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> : (
                    <table className="data-table">
                        <thead><tr>
                            <th>Mã</th><th>Tên NCC</th><th>Loại</th><th>Liên hệ</th><th>SĐT</th><th>Ngân hàng</th><th>Đánh giá</th><th style={{ width: 80 }}></th>
                        </tr></thead>
                        <tbody>{filtered.map(s => (
                            <tr key={s.id}>
                                <td className="accent">{s.code}</td>
                                <td className="primary" style={{ cursor: 'pointer' }} onClick={() => openEdit(s)}>{s.name}</td>
                                <td><span className="badge info">{s.type}</span></td>
                                <td style={{ fontSize: 12 }}>{s.contact || '—'}</td>
                                <td>{s.phone || '—'}</td>
                                <td style={{ fontSize: 12 }}>{s.bankAccount ? `${s.bankName} - ${s.bankAccount}` : '—'}</td>
                                <td>{'⭐'.repeat(s.rating)}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>✏️</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}</tbody>
                    </table>
                )}
            </div>

            {/* Paste from Excel — textarea */}
            {showPasteModal && !pastePreview.length && (
                <div className="modal-overlay" onClick={() => { setShowPasteModal(false); setPasteText(''); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
                        <div className="modal-header">
                            <h3>📋 Dán dữ liệu từ Excel</h3>
                            <button className="modal-close" onClick={() => { setShowPasteModal(false); setPasteText(''); }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 6, lineHeight: 1.7 }}>
                                Copy từ Excel rồi Ctrl+V vào ô bên dưới. <strong>Thứ tự cột:</strong><br />
                                <code style={{ fontSize: 11 }}>Tên NCC* | Loại | SĐT | Địa chỉ | MST | STK ngân hàng | Tên ngân hàng | Người liên hệ | Email</code>
                                <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>💡 Loại phải khớp: {SUPPLIER_TYPES.join(' · ')}</div>
                            </div>
                            <textarea
                                className="form-input"
                                rows={10}
                                placeholder="Ctrl+V để dán từ Excel..."
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                autoFocus
                                style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                            />
                            {pasteText.trim() && (() => {
                                const count = pasteText.trim().split('\n').filter(r => r.split('\t')[0]?.trim()).length;
                                return <div style={{ marginTop: 6, fontSize: 12, color: 'var(--status-success)' }}>✅ Đọc được <strong>{count}</strong> dòng</div>;
                            })()}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { setShowPasteModal(false); setPasteText(''); }}>Hủy</button>
                            <button className="btn btn-primary" onClick={parsePasteS} disabled={!pasteText.trim()}>Xem trước →</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Paste preview — confirm */}
            {pastePreview.length > 0 && (
                <div className="modal-overlay" onClick={() => setPastePreview([])}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h3>📋 Xem trước — {pastePreview.length} nhà cung cấp{pastePreview.filter(s => s._isDup).length > 0 && <span style={{ marginLeft: 8, fontSize: 12, color: '#ea580c', fontWeight: 400 }}>⚠️ {pastePreview.filter(s => s._isDup).length} trùng tên</span>}</h3>
                            <button className="modal-close" onClick={() => setPastePreview([])}>×</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '55vh', overflowY: 'auto', padding: 0 }}>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>#</th><th>Tên NCC</th><th>Loại</th><th>SĐT</th><th>Liên hệ</th><th>MST</th><th>STK / NH</th></tr></thead>
                                <tbody>{pastePreview.map((s, i) => (
                                    <tr key={i} style={{ background: s._isDup ? 'rgba(234,88,12,0.06)' : '' }}>
                                        <td style={{ opacity: 0.4 }}>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            {s.name}
                                            {s._isDup && <span style={{ marginLeft: 6, fontSize: 10, background: '#ea580c', color: '#fff', borderRadius: 3, padding: '1px 5px' }}>trùng</span>}
                                        </td>
                                        <td><span className="badge info">{s.type}</span></td>
                                        <td>{s.phone || '—'}</td>
                                        <td style={{ fontSize: 11 }}>{s.contact || '—'}{s.email ? <div style={{ opacity: 0.6 }}>{s.email}</div> : null}</td>
                                        <td>{s.taxCode || '—'}</td>
                                        <td>{s.bankAccount ? `${s.bankAccount} / ${s.bankName}` : '—'}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setPastePreview([])}>← Sửa lại</button>
                            <button className="btn btn-primary" onClick={confirmPasteS} disabled={importing}>
                                {importing ? '⏳ Đang nhập...' : `✅ Nhập ${pastePreview.length} NCC`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>{editing ? '✏️ Sửa nhà cung cấp' : '+ Thêm nhà cung cấp'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên NCC *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: An Cường, Bosch..." /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {SUPPLIER_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select></div>
                                <div className="form-group"><label className="form-label">Người liên hệ</label>
                                    <input className="form-input" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Email</label>
                                    <input className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
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
