'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');

const EMPTY_FORM = {
    type: 'Nhập', productId: '', warehouseId: '', quantity: '',
    unit: '', note: '', projectId: '', date: new Date().toISOString().split('T')[0],
    importPrice: '',
};

export default function InventoryPage() {
    const { data: session } = useSession();
    const isXayDung = session?.user?.role === 'xay_dung';
    const [activeTab, setActiveTab] = useState('stock');
    const [txData, setTxData] = useState({ transactions: [], warehouses: [] });
    const [stockData, setStockData] = useState({ products: [], lowStock: 0 });
    const [allProducts, setAllProducts] = useState([]); // dùng cho dropdown tìm SP trong modal
    const [workItems, setWorkItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [stockSearch, setStockSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM, _workItemId: '' });
    const formRef = useRef(form);
    const [projects, setProjects] = useState([]);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [showProductDrop, setShowProductDrop] = useState(false);
    const [editTx, setEditTx] = useState(null); // transaction being edited
    const [editForm, setEditForm] = useState({});
    const [editSaving, setEditSaving] = useState(false);

    const fetchTx = async () => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 200 });
        if (filterType) p.set('type', filterType);
        if (filterWarehouse) p.set('warehouseId', filterWarehouse);
        const res = await fetch(`/api/inventory?${p}`);
        const d = await res.json();
        setTxData({ transactions: d.data || [], warehouses: d.warehouses || [] });
        setLoading(false);
    };

    const fetchStock = async () => {
        setLoading(true);
        const res = await fetch(`/api/inventory/stock?t=${Date.now()}`);
        const d = await res.json();
        setStockData(d);
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'stock') fetchStock();
        else fetchTx();
    }, [activeTab, filterType, filterWarehouse]);

    useEffect(() => {
        fetch('/api/inventory/stock').then(r => r.json()).then(d => setStockData(d));
        fetch('/api/inventory?limit=1').then(r => r.json()).then(d => setTxData(t => ({ ...t, warehouses: d.warehouses || [] })));
        fetch('/api/projects?limit=500').then(r => r.json()).then(d => setProjects(d.data || []));
        fetch('/api/products?' + new URLSearchParams({ limit: 2000, supplier: 'Kho nội thất' })).then(r => r.json()).then(d => setAllProducts(d.data || []));
    }, []);

    useEffect(() => {
        if (!isXayDung) return;
        fetch('/api/work-item-library?limit=500').then(r => r.json()).then(d => setWorkItems(d.data || d.items || []));
    }, [isXayDung]);

    // Keep ref in sync so handleSubmit always reads latest form (avoids stale closure)
    const setFormSynced = (updater) => {
        setForm(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            formRef.current = next;
            return next;
        });
    };

    const openModal = () => {
        const initial = { ...EMPTY_FORM, _workItemId: '', warehouseId: txData.warehouses[0]?.id || '' };
        formRef.current = initial;
        setForm(initial);
        setSubmitError('');
        setProductSearch('');
        setShowProductDrop(false);
        setShowModal(true);
    };

    const handleProductSelect = (val) => {
        if (val.startsWith('wi__')) {
            const wiId = val.slice(4);
            const wi = workItems.find(w => w.id === wiId);
            const hmtcCode = `HMTC_${wiId.slice(0, 8)}`;
            const existingProduct = stockData.products.find(p => p.code === hmtcCode);
            setFormSynced(f => ({
                ...f, productId: '', _workItemId: wiId,
                unit: wi?.unit || '',
                importPrice: existingProduct?.importPrice || '',
            }));
        } else {
            const p = allProducts.find(p => p.id === val);
            setFormSynced(f => ({ ...f, productId: val, _workItemId: '', unit: p?.unit || '', importPrice: p?.importPrice || '' }));
        }
    };

    const handleSubmit = async () => {
        const f = formRef.current;
        setSubmitError('');
        if (!f.productId && !f._workItemId) { setSubmitError('Vui lòng chọn sản phẩm'); return; }
        if (!f.warehouseId) { setSubmitError('Vui lòng chọn kho'); return; }
        if (!f.quantity) { setSubmitError('Vui lòng nhập số lượng'); return; }
        setSaving(true);

        try {
            let productId = f.productId;

            if (f._workItemId) {
                const wi = workItems.find(w => w.id === f._workItemId);
                const code = `HMTC_${f._workItemId.slice(0, 8)}`;
                const res = await fetch('/api/products/ensure', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, name: wi?.name || '', unit: wi?.unit || '', supplier: 'Hạng mục thi công', importPrice: Number(f.importPrice) || 0 }),
                });
                const d = await res.json();
                if (!d.id) throw new Error('Không thể tạo sản phẩm: ' + (d.error || ''));
                productId = d.id;
            }

            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...f, productId, quantity: Number(f.quantity) }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi tạo phiếu'); }
            setSaving(false);
            setShowModal(false);
            fetchStock();
            fetchTx();
            setActiveTab('history');
        } catch (err) {
            setSaving(false);
            setSubmitError(err.message || 'Lỗi không xác định');
        }
    };

    const stockFiltered = stockData.products.filter(p =>
        !stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.code.toLowerCase().includes(stockSearch.toLowerCase())
    );

    const totalStockValue = stockData.products.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0);
    return (
        <div>
            {/* KPI */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div>
                        <div className="stat-value">{stockData.products.length}</div>
                        <div className="stat-label">Mã hàng (SKU)</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏭</div>
                    <div>
                        <div className="stat-value">{txData.warehouses.length}</div>
                        <div className="stat-label">Kho</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ color: stockData.lowStock > 0 ? 'var(--status-danger)' : undefined }}>⚠️</div>
                    <div>
                        <div className="stat-value" style={{ color: stockData.lowStock > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                            {stockData.lowStock}
                        </div>
                        <div className="stat-label">Sắp hết hàng</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div>
                        <div className="stat-value" style={{ fontSize: 15, color: 'var(--accent-primary)' }}>{fmt(totalStockValue)}</div>
                        <div className="stat-label">Giá trị tồn kho</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="tab-bar">
                        <button className={`tab-item ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
                            📊 Tồn kho hiện tại
                        </button>
                        <button className={`tab-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                            📋 Lịch sử nhập/xuất
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={openModal}>+ Nhập/Xuất kho</button>
                </div>

                {/* TAB: Tồn kho */}
                {activeTab === 'stock' && (
                    <>
                        <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                            <input
                                type="text" className="form-input" placeholder="🔍 Tìm sản phẩm..."
                                value={stockSearch} onChange={e => setStockSearch(e.target.value)}
                                style={{ flex: 1, minWidth: 0 }}
                            />
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mã</th><th>Tên SP</th><th>Thương hiệu</th>
                                            <th>ĐVT</th>
                                            <th style={{ textAlign: 'right' }}>SL</th>
                                            <th style={{ textAlign: 'right' }}>Đơn giá</th>
                                            <th style={{ textAlign: 'right' }}>Thành tiền</th>
                                            <th>Ghi chú</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockFiltered.map(p => {
                                            const isLow = p.minStock > 0 && p.stock <= p.minStock;
                                            const isOut = p.stock <= 0;
                                            return (
                                                <tr key={p.id} style={{ background: isOut ? 'rgba(239,68,68,0.04)' : isLow ? 'rgba(245,158,11,0.04)' : undefined }}>
                                                    <td className="accent">{p.code}</td>
                                                    <td className="primary">{p.name}</td>
                                                    <td style={{ fontSize: 13 }}>{p.category || '—'}</td>
                                                    <td style={{ fontSize: 13 }}>{p.unit}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: isOut ? 'var(--status-danger)' : isLow ? 'var(--status-warning)' : undefined }}>
                                                        {p.stock}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(p.importPrice)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt((p.stock || 0) * (p.importPrice || 0))}</td>
                                                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || '—'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(`Xóa "${p.name}" khỏi kho?`)) return;
                                                                await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
                                                                fetchStock();
                                                            }}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 15, padding: '2px 6px', borderRadius: 4 }}
                                                            title="Xóa">🗑</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {stockFiltered.length > 0 && (
                                        <tfoot>
                                            <tr>
                                                <td colSpan={6} style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {stockFiltered.length} mã hàng
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px' }}>
                                                    {fmt(stockFiltered.reduce((s, p) => s + (p.stock || 0) * (p.importPrice || 0), 0))}
                                                </td>
                                                <td /><td />
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* TAB: Lịch sử */}
                {activeTab === 'history' && (
                    <>
                        <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                            <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">Tất cả</option>
                                <option value="Nhập">Nhập kho</option>
                                <option value="Xuất">Xuất kho</option>
                            </select>
                            <select className="form-select" value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
                                <option value="">Tất cả kho</option>
                                {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Mã PK</th><th>Loại</th><th>Sản phẩm</th><th>SL</th><th>Kho</th><th>Dự án</th><th>Ghi chú</th><th>Ngày</th><th style={{ width: 40 }}></th></tr>
                                    </thead>
                                    <tbody>
                                        {txData.transactions.map(t => (
                                            <tr key={t.id}>
                                                <td className="accent">{t.code}</td>
                                                <td><span className={`badge ${t.type === 'Nhập' ? 'badge-success' : 'badge-warning'}`}>{t.type}</span></td>
                                                <td className="primary">{t.product?.name}</td>
                                                <td style={{ fontWeight: 600, color: t.type === 'Nhập' ? 'var(--status-success)' : 'var(--status-warning)' }}>
                                                    {t.type === 'Nhập' ? '+' : '-'}{t.quantity} {t.unit}
                                                </td>
                                                <td style={{ fontSize: 13 }}>{t.warehouse?.name}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.project?.name || '—'}</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.note}</td>
                                                <td style={{ fontSize: 12 }}>{fmtDate(t.date)}</td>
                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                    <button
                                                        onClick={() => {
                                                            setEditTx(t);
                                                            setEditForm({
                                                                type: t.type,
                                                                quantity: t.quantity,
                                                                unit: t.unit,
                                                                note: t.note || '',
                                                                date: new Date(t.date).toISOString().split('T')[0],
                                                                warehouseId: t.warehouse?.id || '',
                                                                projectId: t.project?.id || '',
                                                            });
                                                        }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 15, padding: '2px 6px', borderRadius: 4 }}
                                                        title="Chỉnh sửa">✏️</button>
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm(`Xóa phiếu ${t.code}? Tồn kho sẽ được hoàn tác.`)) return;
                                                            await fetch(`/api/inventory/${t.id}`, { method: 'DELETE' });
                                                            fetchTx();
                                                            fetchStock();
                                                        }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 15, padding: '2px 6px', borderRadius: 4 }}
                                                        title="Xóa phiếu">🗑</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {!loading && txData.transactions.length === 0 && (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có giao dịch kho</div>
                        )}
                    </>
                )}
            </div>

            {/* Modal chỉnh sửa phiếu */}
            {editTx && (
                <div className="modal-overlay" onClick={() => setEditTx(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                        <div className="modal-header">
                            <h3>Sửa phiếu {editTx.code}</h3>
                            <button className="modal-close" onClick={() => setEditTx(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Sản phẩm</label>
                                <input className="form-input" value={editTx.product?.name || ''} disabled style={{ background: '#f9fafb', color: '#6b7280' }} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Loại *</label>
                                    <select className="form-select" value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                                        <option value="Nhập">Nhập kho</option>
                                        <option value="Xuất">Xuất kho</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Số lượng *</label>
                                    <input className="form-input" type="number" min="0.01" step="0.01" value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn vị</label>
                                    <input className="form-input" value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Kho *</label>
                                    <select className="form-select" value={editForm.warehouseId} onChange={e => setEditForm(f => ({ ...f, warehouseId: e.target.value }))}>
                                        <option value="">— Chọn kho —</option>
                                        {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dự án</label>
                                    <select className="form-select" value={editForm.projectId} onChange={e => setEditForm(f => ({ ...f, projectId: e.target.value }))}>
                                        <option value="">— Không gắn DA —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditTx(null)}>Hủy</button>
                            <button
                                className="btn btn-primary"
                                disabled={editSaving || !editForm.quantity || !editForm.warehouseId}
                                onClick={async () => {
                                    setEditSaving(true);
                                    try {
                                        const res = await fetch(`/api/inventory/${editTx.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ ...editForm, quantity: Number(editForm.quantity) }),
                                        });
                                        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi cập nhật'); }
                                        setEditTx(null);
                                        fetchTx();
                                        fetchStock();
                                    } catch (err) {
                                        alert(err.message);
                                    } finally {
                                        setEditSaving(false);
                                    }
                                }}
                            >{editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nhập/xuất kho */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3>Phiếu nhập/xuất kho</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Loại *</label>
                                    <select className="form-select" value={form.type} onChange={e => setFormSynced(f => ({ ...f, type: e.target.value }))}>
                                        <option value="Nhập">Nhập kho</option>
                                        <option value="Xuất">Xuất kho</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={form.date} onChange={e => setFormSynced(f => ({ ...f, date: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label className="form-label">Sản phẩm *</label>
                                <input
                                    className="form-input"
                                    placeholder="🔍 Gõ để tìm sản phẩm..."
                                    value={productSearch}
                                    onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); }}
                                    onFocus={() => setShowProductDrop(true)}
                                    onBlur={() => setTimeout(() => setShowProductDrop(false), 180)}
                                    autoComplete="off"
                                />
                                {(form.productId || form._workItemId) && !showProductDrop && (
                                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3, fontWeight: 600 }}>
                                        ✓ {form._workItemId
                                            ? workItems.find(w => w.id === form._workItemId)?.name
                                            : allProducts.find(p => p.id === form.productId)?.name}
                                    </div>
                                )}
                                {showProductDrop && (() => {
                                    const q = productSearch.toLowerCase();
                                    const filteredProducts = allProducts.filter(p =>
                                        !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
                                    );
                                    const filteredWork = workItems.filter(w =>
                                        !q || w.name.toLowerCase().includes(q)
                                    );
                                    if (!filteredProducts.length && !filteredWork.length) return null;
                                    return (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.13)', zIndex: 200, maxHeight: 260, overflowY: 'auto' }}>
                                            {filteredProducts.length > 0 && <>
                                                <div style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>SẢN PHẨM</div>
                                                {filteredProducts.map(p => (
                                                    <div key={p.id} onMouseDown={() => { handleProductSelect(p.id); setProductSearch(p.name); setShowProductDrop(false); }}
                                                        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                        {p.name} <span style={{ color: '#9ca3af', fontSize: 11 }}>({p.code}) — tồn: {p.stock} {p.unit}</span>
                                                    </div>
                                                ))}
                                            </>}
                                            {filteredWork.length > 0 && <>
                                                <div style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>HẠNG MỤC THI CÔNG</div>
                                                {filteredWork.map(w => (
                                                    <div key={w.id} onMouseDown={() => { handleProductSelect(`wi__${w.id}`); setProductSearch(w.name); setShowProductDrop(false); }}
                                                        style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                        {w.name} <span style={{ color: '#9ca3af', fontSize: 11 }}>({w.unit})</span>
                                                    </div>
                                                ))}
                                            </>}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Số lượng *</label>
                                    <input className="form-input" type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => setFormSynced(f => ({ ...f, quantity: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn vị</label>
                                    <input className="form-input" value={form.unit} onChange={e => setFormSynced(f => ({ ...f, unit: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Giá nhập (đ)</label>
                                    <input className="form-input" type="number" min="0" step="1000" placeholder="0" value={form.importPrice} onChange={e => setFormSynced(f => ({ ...f, importPrice: e.target.value }))} />
                                </div>
                                <div className="form-group" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Kho *</label>
                                    <select className="form-select" value={form.warehouseId} onChange={e => setFormSynced(f => ({ ...f, warehouseId: e.target.value }))}>
                                        <option value="">— Chọn kho —</option>
                                        {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dự án (tuỳ chọn)</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setFormSynced(f => ({ ...f, projectId: e.target.value }))}>
                                        <option value="">— Không gắn DA —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.note} onChange={e => setFormSynced(f => ({ ...f, note: e.target.value }))} />
                            </div>
                        </div>
                        {submitError && <div style={{ padding: '6px 20px', color: '#dc2626', fontSize: 13 }}>{submitError}</div>}
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={saving || (!form.productId && !form._workItemId) || !form.warehouseId || !form.quantity}
                            >
                                {saving ? 'Đang lưu...' : `Tạo phiếu ${form.type}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
