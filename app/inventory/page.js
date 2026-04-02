'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');

const EMPTY_FORM = {
    type: 'Nhập', productId: '', warehouseId: '', quantity: '',
    unit: '', note: '', projectId: '', date: new Date().toISOString().split('T')[0],
};

export default function InventoryPage() {
    const { data: session } = useSession();
    const isXayDung = session?.user?.role === 'xay_dung';
    const [activeTab, setActiveTab] = useState('stock');
    const [txData, setTxData] = useState({ transactions: [], warehouses: [] });
    const [stockData, setStockData] = useState({ products: [], lowStock: 0 });
    const [workItems, setWorkItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [stockSearch, setStockSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM, _workItemId: '' });
    const [projects, setProjects] = useState([]);
    const [saving, setSaving] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [showProductDrop, setShowProductDrop] = useState(false);

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
        const res = await fetch('/api/inventory/stock');
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
    }, []);

    useEffect(() => {
        if (!isXayDung) return;
        fetch('/api/work-item-library?limit=500').then(r => r.json()).then(d => setWorkItems(d.data || d.items || []));
    }, [isXayDung]);

    const openModal = () => {
        setForm({ ...EMPTY_FORM, _workItemId: '', warehouseId: txData.warehouses[0]?.id || '' });
        setProductSearch('');
        setShowProductDrop(false);
        setShowModal(true);
    };

    const handleProductSelect = (val) => {
        if (val.startsWith('wi__')) {
            const wiId = val.slice(4);
            const wi = workItems.find(w => w.id === wiId);
            setForm(f => ({ ...f, productId: '', _workItemId: wiId, unit: wi?.unit || '' }));
        } else {
            const p = stockData.products.find(p => p.id === val);
            setForm(f => ({ ...f, productId: val, _workItemId: '', unit: p?.unit || '' }));
        }
    };

    const handleSubmit = async () => {
        if ((!form.productId && !form._workItemId) || !form.warehouseId || !form.quantity) return;
        setSaving(true);

        let productId = form.productId;

        // Auto-create Product from WorkItemLibrary if needed
        if (form._workItemId) {
            const wi = workItems.find(w => w.id === form._workItemId);
            const code = `HMTC_${form._workItemId.slice(0, 8)}`;
            const res = await fetch('/api/products/ensure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, name: wi?.name || '', unit: wi?.unit || '', supplier: 'Hạng mục thi công' }),
            });
            const d = await res.json();
            productId = d.id;
        }

        await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, productId, quantity: Number(form.quantity) }),
        });
        setSaving(false);
        setShowModal(false);
        fetchStock();
        if (activeTab === 'history') fetchTx();
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
                                            <th>Mã</th><th>Tên sản phẩm</th><th>Danh mục</th>
                                            <th style={{ textAlign: 'right' }}>Tồn kho</th>
                                            <th style={{ textAlign: 'right' }}>Tồn tối thiểu</th>
                                            <th style={{ textAlign: 'right' }}>Đơn giá nhập</th>
                                            <th style={{ textAlign: 'right' }}>Giá trị tồn</th>
                                            <th>TT</th>
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
                                                    <td><span className="badge badge-info" style={{ fontSize: 11 }}>{p.category}</span></td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: isOut ? 'var(--status-danger)' : isLow ? 'var(--status-warning)' : undefined }}>
                                                        {p.stock} {p.unit}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13 }}>
                                                        {p.minStock > 0 ? `${p.minStock} ${p.unit}` : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 13 }}>{fmt(p.importPrice)}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt((p.stock || 0) * (p.importPrice || 0))}</td>
                                                    <td>
                                                        {isOut && <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--status-danger)', fontSize: 10 }}>Hết hàng</span>}
                                                        {isLow && !isOut && <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--status-warning)', fontSize: 10 }}>Sắp hết</span>}
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
                                                <td />
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
                                        <tr><th>Mã PK</th><th>Loại</th><th>Sản phẩm</th><th>SL</th><th>Kho</th><th>Dự án</th><th>Ghi chú</th><th>Ngày</th></tr>
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
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        <option value="Nhập">Nhập kho</option>
                                        <option value="Xuất">Xuất kho</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày</label>
                                    <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
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
                                            : stockData.products.find(p => p.id === form.productId)?.name}
                                    </div>
                                )}
                                {showProductDrop && (() => {
                                    const q = productSearch.toLowerCase();
                                    const filteredProducts = stockData.products.filter(p =>
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
                                    <input className="form-input" type="number" min="0.01" step="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn vị</label>
                                    <input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Kho *</label>
                                    <select className="form-select" value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                                        <option value="">— Chọn kho —</option>
                                        {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dự án (tuỳ chọn)</label>
                                    <select className="form-select" value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}>
                                        <option value="">— Không gắn DA —</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={saving || !form.productId || !form.warehouseId || !form.quantity}
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
