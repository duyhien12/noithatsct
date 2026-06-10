'use client';
import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useSession } from 'next-auth/react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtNum = (n, dec = 1) => n == null ? '—' : Number(n).toFixed(dec).replace(/\.0$/, '');
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');

// Detect mobile viewport (≤768px) — toggles bảng ↔ thẻ
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        const onChange = () => setIsMobile(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);
    return isMobile;
}

const EMPTY_FORM = {
    type: 'Nhập', productId: '', warehouseId: '', quantity: '',
    unit: '', note: '', projectId: '', date: new Date().toISOString().split('T')[0],
    importPrice: '', images: [], _freeText: '',
};

function PhotoStrip({ images, onChange }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const list = Array.isArray(images) ? images : (() => { try { return JSON.parse(images || '[]'); } catch { return []; } })();

    const handleFile = async (file) => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload?type=proofs', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.url) onChange([...list, data.url]);
        setUploading(false);
    };

    return (
        <div>
            <label className="form-label">Ảnh đính kèm</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                {list.map((url, i) => (
                    <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                        <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer' }}
                            onClick={() => window.open(url, '_blank')} />
                        <button onClick={() => onChange(list.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                ))}
                <button onClick={() => inputRef.current?.click()}
                    style={{ width: 72, height: 72, borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--bg-secondary)', cursor: uploading ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    {uploading ? '⏳' : '📷'}
                    <span>{uploading ? 'Đang tải' : 'Thêm ảnh'}</span>
                </button>
                <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
            </div>
        </div>
    );
}

// Days-to-stockout color
function daysColor(d) {
    if (d == null) return '#9ca3af';
    if (d <= 7)  return '#dc2626';
    if (d <= 14) return '#ea580c';
    if (d <= 30) return '#d97706';
    return '#16a34a';
}

function TrendBadge({ trend, c30, cp30 }) {
    if (c30 === 0 && cp30 === 0) return <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>;
    const icons = { up: '↑', down: '↓', stable: '→' };
    const colors = { up: '#dc2626', down: '#16a34a', stable: '#6b7280' };
    const pct = cp30 > 0 ? Math.round((c30 - cp30) / cp30 * 100) : null;
    return (
        <span style={{ fontWeight: 700, fontSize: 12, color: colors[trend] }}>
            {icons[trend]}{pct != null ? ` ${pct > 0 ? '+' : ''}${pct}%` : ''}
        </span>
    );
}

// ─── Allocation Tab ────────────────────────────────────────────────────────────
function AllocationTab() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState({});

    useEffect(() => {
        fetch('/api/inventory/allocations').then(r => r.json()).then(d => {
            setData(d);
            setLoading(false);
        });
    }, []);

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    const filtered = (data?.allocations || []).filter(a =>
        !search ||
        a.projectName.toLowerCase().includes(search.toLowerCase()) ||
        a.projectCode.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                <input type="text" className="form-input" placeholder="🔍 Tìm dự án..." value={search}
                    onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
            </div>
            {filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Chưa có phiếu xuất kho gắn dự án
                </div>
            ) : (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(a => {
                        const isOpen = expanded[a.projectId];
                        return (
                            <div key={a.projectId} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                <div onClick={() => setExpanded(p => ({ ...p, [a.projectId]: !isOpen }))}
                                    style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'var(--bg-hover)' }}>
                                    <span style={{ fontSize: 14 }}>{isOpen ? '▾' : '▸'}</span>
                                    <div style={{ flex: 1 }}>
                                        <span className="badge info" style={{ marginRight: 8 }}>{a.projectCode}</span>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{a.projectName}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                                        {a.consumed.length > 0 && <span>🔴 Đã xuất: {a.consumed.length} loại</span>}
                                        {a.reserved.length > 0 && <span>🔵 Đặt trước: {a.reserved.length} loại</span>}
                                    </div>
                                </div>
                                {isOpen && (
                                    <div style={{ padding: '0 16px 12px' }}>
                                        {a.consumed.length > 0 && (
                                            <>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    Đã xuất kho
                                                </div>
                                                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>Mã</th>
                                                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>Tên vật tư</th>
                                                            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>SL đã xuất</th>
                                                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>ĐVT</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {a.consumed.map(item => (
                                                            <tr key={item.productId} style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td style={{ padding: '5px 8px', color: 'var(--primary)' }}>{item.productCode}</td>
                                                                <td style={{ padding: '5px 8px' }}>{item.productName}</td>
                                                                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmtNum(item.qty, 2)}</td>
                                                                <td style={{ padding: '5px 8px', color: 'var(--text-muted)' }}>{item.unit}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </>
                                        )}
                                        {a.reserved.length > 0 && (
                                            <>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    Đặt trước (task đang làm)
                                                </div>
                                                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>Mã</th>
                                                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>Tên vật tư</th>
                                                            <th style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 500 }}>SL đặt trước</th>
                                                            <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 500 }}>ĐVT</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {a.reserved.map(item => (
                                                            <tr key={item.productId} style={{ borderBottom: '1px solid var(--border)' }}>
                                                                <td style={{ padding: '5px 8px', color: 'var(--primary)' }}>{item.productCode}</td>
                                                                <td style={{ padding: '5px 8px' }}>{item.productName}</td>
                                                                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>{fmtNum(item.qty, 2)}</td>
                                                                <td style={{ padding: '5px 8px', color: 'var(--text-muted)' }}>{item.unit}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
    const { data: session } = useSession();
    const isXayDung = session?.user?.role === 'xay_dung';
    const isMobile = useIsMobile();

    const [activeTab, setActiveTab] = useState('stock');
    const [txData, setTxData] = useState({ transactions: [], warehouses: [] });
    const [stockData, setStockData] = useState({ products: [], lowStock: 0, reorderAlerts: 0, totalReserved: 0 });
    const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [workItems, setWorkItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [stockSearch, setStockSearch] = useState('');
    const [stockFilter, setStockFilter] = useState(''); // '' | 'reorder' | 'low'
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM, _workItemId: '' });
    const formRef = useRef(form);
    const [projects, setProjects] = useState([]);
    const [saving, setSaving] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [showProductDrop, setShowProductDrop] = useState(false);
    const [editTx, setEditTx] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editSaving, setEditSaving] = useState(false);

    const fetchStock = useCallback(async (withAnalytics = false) => {
        setLoading(true);
        const url = `/api/inventory/stock?t=${Date.now()}${withAnalytics ? '&analytics=1' : ''}`;
        const res = await fetch(url);
        const d = await res.json();
        setStockData(d);
        if (withAnalytics) setAnalyticsLoaded(true);
        setLoading(false);
    }, []);

    const fetchTx = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 500 });
        if (filterType) p.set('type', filterType);
        if (filterWarehouse) p.set('warehouseId', filterWarehouse);
        if (filterDateFrom) p.set('dateFrom', filterDateFrom);
        if (filterDateTo) p.set('dateTo', filterDateTo);
        const res = await fetch(`/api/inventory?${p}`);
        const d = await res.json();
        setTxData({ transactions: d.data || [], warehouses: d.warehouses || [] });
        setLoading(false);
    }, [filterType, filterWarehouse, filterDateFrom, filterDateTo]);

    useEffect(() => {
        if (activeTab === 'stock') fetchStock(true);
        else if (activeTab === 'history') fetchTx();
    }, [activeTab, filterType, filterWarehouse, filterDateFrom, filterDateTo]);

    useEffect(() => {
        fetch('/api/inventory/stock').then(r => r.json()).then(d => setStockData(d));
        fetch('/api/inventory?limit=1').then(r => r.json()).then(d => setTxData(t => ({ ...t, warehouses: d.warehouses || [] })));
        fetch('/api/projects?limit=500').then(r => r.json()).then(d => setProjects(d.data || []));
        fetch('/api/products?' + new URLSearchParams({ limit: 2000, supplier: 'Kho nội thất' }))
            .then(r => r.json()).then(d => setAllProducts(d.data || []));
    }, []);

    useEffect(() => {
        if (!isXayDung) return;
        fetch('/api/work-item-library?limit=500').then(r => r.json()).then(d => setWorkItems(d.data || d.items || []));
    }, [isXayDung]);

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
        if (val === '__free__') {
            setFormSynced(f => ({ ...f, productId: '', _workItemId: '', _freeText: productSearch.trim() }));
        } else if (val.startsWith('wi__')) {
            const wiId = val.slice(4);
            const wi = workItems.find(w => w.id === wiId);
            const hmtcCode = `HMTC_${wiId.slice(0, 8)}`;
            const existingProduct = stockData.products.find(p => p.code === hmtcCode);
            setFormSynced(f => ({ ...f, productId: '', _workItemId: wiId, _freeText: '', unit: wi?.unit || '', importPrice: existingProduct?.importPrice || '' }));
        } else {
            const p = allProducts.find(p => p.id === val);
            setFormSynced(f => ({ ...f, productId: val, _workItemId: '', _freeText: '', unit: p?.unit || '', importPrice: p?.importPrice || '' }));
        }
    };

    const handleSubmit = async () => {
        const f = formRef.current;
        setSubmitError('');
        if (!f.productId && !f._workItemId && !f._freeText) { setSubmitError('Vui lòng chọn hoặc nhập tên sản phẩm'); return; }
        if (!f.warehouseId) { setSubmitError('Vui lòng chọn kho'); return; }
        if (!f.quantity) { setSubmitError('Vui lòng nhập số lượng'); return; }
        setSaving(true);
        try {
            let productId = f.productId;
            if (f._freeText) {
                const slug = f._freeText.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20);
                const code = `EXT_${slug}`;
                const res = await fetch('/api/products/ensure', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, name: f._freeText.trim(), unit: f.unit || '', supplier: 'Bên ngoài', importPrice: Number(f.importPrice) || 0 }),
                });
                const d = await res.json();
                if (!d.id) throw new Error('Không thể tạo sản phẩm: ' + (d.error || ''));
                productId = d.id;
            } else if (f._workItemId) {
                const wi = workItems.find(w => w.id === f._workItemId);
                const code = `HMTC_${f._workItemId.slice(0, 8)}`;
                const res = await fetch('/api/products/ensure', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, name: wi?.name || '', unit: wi?.unit || '', supplier: 'Hạng mục thi công', importPrice: Number(f.importPrice) || 0 }),
                });
                const d = await res.json();
                if (!d.id) throw new Error('Không thể tạo sản phẩm: ' + (d.error || ''));
                productId = d.id;
            }
            const res = await fetch('/api/inventory', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...f, productId, quantity: Number(f.quantity), images: f.images || [] }),
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi tạo phiếu'); }
            setSaving(false); setShowModal(false);
            fetchStock(true); fetchTx(); setActiveTab('history');
        } catch (err) {
            setSaving(false); setSubmitError(err.message || 'Lỗi không xác định');
        }
    };

    // Derived values
    const totalStockValue = stockData.products.reduce((s, p) =>
        s + (p.stock || 0) * (p.salePrice > 0 ? p.salePrice : Math.round((p.importPrice || 0) * 1.08)), 0);

    const stockFiltered = stockData.products.filter(p => {
        if (stockSearch && !p.name.toLowerCase().includes(stockSearch.toLowerCase()) && !p.code.toLowerCase().includes(stockSearch.toLowerCase())) return false;
        if (stockFilter === 'reorder') return p.needsReorder;
        if (stockFilter === 'low') return p.minStock > 0 && p.stock <= p.minStock;
        return true;
    });

    const reorderList = stockData.products.filter(p => p.needsReorder);

    // Chỉ cho gắn dự án đang sản xuất (KD dept, phase đang sản xuất)
    const contractProjects = projects.filter(p => p.createdByRole !== 'xay_dung' && (p.phase || 'Đơn hàng đang sản xuất') === 'Đơn hàng đang sản xuất');

    return (
        <div>
            {/* ── KPI Cards ── */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
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
                    <div className="stat-icon">🔵</div>
                    <div>
                        <div className="stat-value" style={{ color: '#2563eb' }}>{fmtNum(stockData.totalReserved || 0, 0)}</div>
                        <div className="stat-label">Đang đặt trước</div>
                    </div>
                </div>
                <div className="stat-card" style={{ cursor: stockData.reorderAlerts > 0 ? 'pointer' : undefined }}
                    onClick={() => { if (stockData.reorderAlerts > 0) { setActiveTab('stock'); setStockFilter('reorder'); } }}>
                    <div className="stat-icon" style={{ color: stockData.reorderAlerts > 0 ? '#dc2626' : undefined }}>🚨</div>
                    <div>
                        <div className="stat-value" style={{ color: stockData.reorderAlerts > 0 ? '#dc2626' : 'var(--status-success)' }}>
                            {stockData.reorderAlerts || 0}
                        </div>
                        <div className="stat-label">Cần đặt hàng</div>
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

            {/* ── Reorder Alert Banner ── */}
            {reorderList.length > 0 && analyticsLoaded && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>🚨</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#991b1b' }}>
                            {reorderList.length} mặt hàng cần đặt lại
                        </span>
                        <button onClick={() => { setActiveTab('stock'); setStockFilter('reorder'); }}
                            style={{ marginLeft: 'auto', fontSize: 12, color: '#dc2626', background: 'none', border: '1px solid #dc2626', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                            Xem tất cả
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {reorderList.slice(0, 5).map(p => (
                            <span key={p.id} style={{ fontSize: 12, background: '#fff', border: '1px solid #fca5a5', borderRadius: 20, padding: '2px 10px', color: '#7f1d1d' }}>
                                {p.code} · tồn {p.stock} {p.unit}
                                {p.daysToStockout != null && <> · hết sau {p.daysToStockout}ng</>}
                            </span>
                        ))}
                        {reorderList.length > 5 && <span style={{ fontSize: 12, color: '#9ca3af', padding: '2px 4px' }}>+{reorderList.length - 5} khác</span>}
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <div className="tab-bar">
                        <button className={`tab-item ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
                            📊 Tồn kho
                        </button>
                        <button className={`tab-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                            📋 Lịch sử nhập/xuất
                        </button>
                        <button className={`tab-item ${activeTab === 'allocations' ? 'active' : ''}`} onClick={() => setActiveTab('allocations')}>
                            🗂 Phân bổ dự án
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={openModal}>+ Nhập/Xuất kho</button>
                </div>

                {/* ── TAB: Tồn kho ── */}
                {activeTab === 'stock' && (
                    <>
                        <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)', gap: 8 }}>
                            <input type="text" className="form-input" placeholder="🔍 Tìm sản phẩm..."
                                value={stockSearch} onChange={e => setStockSearch(e.target.value)}
                                style={{ flex: 1, minWidth: 0 }} />
                            <select className="form-select" value={stockFilter} onChange={e => setStockFilter(e.target.value)} style={{ minWidth: 140 }}>
                                <option value="">Tất cả</option>
                                <option value="reorder">🚨 Cần đặt lại ({stockData.reorderAlerts || 0})</option>
                                <option value="low">⚠️ Sắp hết ({stockData.lowStock || 0})</option>
                            </select>
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : isMobile ? (
                            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {stockFiltered.length === 0 && (
                                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Không có mã hàng</div>
                                )}
                                {stockFiltered.map(p => {
                                    const isOut = p.stock <= 0;
                                    const isLow = p.minStock > 0 && p.stock <= p.minStock;
                                    const needsReorder = p.needsReorder;
                                    const price = p.salePrice > 0 ? p.salePrice : Math.round((p.importPrice || 0) * 1.08);
                                    return (
                                        <div key={p.id} style={{
                                            border: '1px solid var(--border-color)', borderRadius: 10, padding: 12,
                                            borderLeft: `4px solid ${needsReorder || isOut ? '#dc2626' : isLow ? '#d97706' : '#16a34a'}`,
                                            background: 'var(--bg-card)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 600 }}>
                                                        {needsReorder && '🚨 '}{p.code}
                                                    </div>
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{p.name}</div>
                                                </div>
                                                <button onClick={async () => {
                                                    if (!confirm(`Xóa "${p.name}" khỏi kho?`)) return;
                                                    await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
                                                    fetchStock(true);
                                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: 4, flexShrink: 0 }} title="Xóa">🗑</button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
                                                <div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tồn kho</div>
                                                    <div style={{ fontWeight: 700, fontSize: 15, color: isOut ? '#dc2626' : isLow ? '#d97706' : 'var(--text-primary)' }}>{p.stock} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{p.unit}</span></div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Đặt trước</div>
                                                    <div style={{ fontWeight: 600, fontSize: 15, color: (p.reservedQty > 0) ? '#2563eb' : 'var(--text-muted)' }}>{analyticsLoaded ? (p.reservedQty > 0 ? fmtNum(p.reservedQty, 1) : '—') : '…'}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Khả dụng</div>
                                                    <div style={{ fontWeight: 600, fontSize: 15, color: (p.availableQty !== undefined && p.availableQty <= 0) ? '#dc2626' : '#16a34a' }}>{analyticsLoaded ? fmtNum(p.availableQty ?? p.stock, 1) : '…'}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border-light)', fontSize: 12 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    {analyticsLoaded && p.daysToStockout != null && (
                                                        <span style={{ color: daysColor(p.daysToStockout), fontWeight: 600 }}>Hết sau {p.daysToStockout} ngày </span>
                                                    )}
                                                    {analyticsLoaded && <TrendBadge trend={p.trend || 'stable'} c30={p.consumption30d || 0} cp30={p.consumptionPrev30d || 0} />}
                                                </span>
                                                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt((p.stock || 0) * price)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {stockFiltered.length > 0 && (
                                    <div style={{ padding: '4px 4px 0', fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                                        {stockFiltered.length} mã · Tổng {fmt(stockFiltered.reduce((s, p) => {
                                            const price = p.salePrice > 0 ? p.salePrice : Math.round((p.importPrice || 0) * 1.08);
                                            return s + (p.stock || 0) * price;
                                        }, 0))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Mã</th>
                                            <th>Tên SP</th>
                                            <th>ĐVT</th>
                                            <th style={{ textAlign: 'right' }}>Tồn kho</th>
                                            <th style={{ textAlign: 'right' }}>Đặt trước</th>
                                            <th style={{ textAlign: 'right' }}>Khả dụng</th>
                                            <th style={{ textAlign: 'right' }}>TT/30ng</th>
                                            <th style={{ textAlign: 'center' }}>Hết kho sau</th>
                                            <th style={{ textAlign: 'center' }}>Xu hướng</th>
                                            <th style={{ textAlign: 'right' }}>Giá trị</th>
                                            <th style={{ width: 36 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockFiltered.map(p => {
                                            const isOut = p.stock <= 0;
                                            const isLow = p.minStock > 0 && p.stock <= p.minStock;
                                            const needsReorder = p.needsReorder;
                                            const price = p.salePrice > 0 ? p.salePrice : Math.round((p.importPrice || 0) * 1.08);
                                            const rowBg = isOut ? 'rgba(239,68,68,0.04)' : needsReorder ? 'rgba(239,68,68,0.03)' : isLow ? 'rgba(245,158,11,0.04)' : undefined;
                                            return (
                                                <tr key={p.id} style={{ background: rowBg }}>
                                                    <td className="accent" style={{ whiteSpace: 'nowrap' }}>
                                                        {needsReorder && <span title="Cần đặt hàng" style={{ marginRight: 4, fontSize: 11 }}>🚨</span>}
                                                        {p.code}
                                                    </td>
                                                    <td className="primary" style={{ maxWidth: 220 }}>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                                        {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>{p.unit}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: isOut ? '#dc2626' : isLow ? '#d97706' : undefined }}>
                                                        {p.stock}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 13, color: (p.reservedQty > 0) ? '#2563eb' : '#9ca3af' }}>
                                                        {analyticsLoaded ? (p.reservedQty > 0 ? fmtNum(p.reservedQty, 1) : '—') : '…'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: (p.availableQty !== undefined && p.availableQty <= 0) ? '#dc2626' : '#16a34a' }}>
                                                        {analyticsLoaded ? fmtNum(p.availableQty ?? p.stock, 1) : '…'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontSize: 12, color: '#6b7280' }}>
                                                        {analyticsLoaded ? (p.consumption30d > 0 ? fmtNum(p.consumption30d, 1) : '—') : '…'}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {!analyticsLoaded ? <span style={{ color: '#9ca3af', fontSize: 12 }}>…</span>
                                                            : p.daysToStockout == null ? <span style={{ color: '#9ca3af', fontSize: 12 }}>∞</span>
                                                                : (
                                                                    <span style={{ fontWeight: 700, fontSize: 13, color: daysColor(p.daysToStockout) }}>
                                                                        {p.daysToStockout}ng
                                                                    </span>
                                                                )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {analyticsLoaded
                                                            ? <TrendBadge trend={p.trend || 'stable'} c30={p.consumption30d || 0} cp30={p.consumptionPrev30d || 0} />
                                                            : <span style={{ color: '#9ca3af', fontSize: 12 }}>…</span>}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                                        {fmt((p.stock || 0) * price)}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button onClick={async () => {
                                                            if (!confirm(`Xóa "${p.name}" khỏi kho?`)) return;
                                                            await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
                                                            fetchStock(true);
                                                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '2px 5px' }} title="Xóa">🗑</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {stockFiltered.length > 0 && (
                                        <tfoot>
                                            <tr>
                                                <td colSpan={9} style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {stockFiltered.length} mã hàng
                                                    {analyticsLoaded && stockData.reorderAlerts > 0 && (
                                                        <span style={{ marginLeft: 12, color: '#dc2626', fontWeight: 600 }}>
                                                            · 🚨 {stockData.reorderAlerts} cần đặt lại
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, padding: '8px 16px' }}>
                                                    {fmt(stockFiltered.reduce((s, p) => {
                                                        const price = p.salePrice > 0 ? p.salePrice : Math.round((p.importPrice || 0) * 1.08);
                                                        return s + (p.stock || 0) * price;
                                                    }, 0))}
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

                {/* ── TAB: Lịch sử ── */}
                {activeTab === 'history' && (
                    <>
                        <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                            <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ minWidth: 120 }}>
                                <option value="">Tất cả loại</option>
                                <option value="Nhập">Nhập kho</option>
                                <option value="Xuất">Xuất kho</option>
                            </select>
                            <select className="form-select" value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)} style={{ minWidth: 130 }}>
                                <option value="">Tất cả kho</option>
                                {txData.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Từ</span>
                                <input type="date" className="form-input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={{ width: 140 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Đến</span>
                                <input type="date" className="form-input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={{ width: 140 }} />
                            </div>
                            {(filterDateFrom || filterDateTo) && (
                                <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                                    style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    ✕ Xóa ngày
                                </button>
                            )}
                        </div>
                        {loading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : txData.transactions.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có giao dịch kho</div>
                        ) : (() => {
                            // Group by date
                            const groups = [];
                            const seen = {};
                            txData.transactions.forEach(t => {
                                const dk = new Date(t.date).toDateString();
                                if (!seen[dk]) { seen[dk] = true; groups.push({ dateKey: dk, date: t.date, items: [] }); }
                                groups[groups.length - 1].items.push(t);
                            });

                            const openEdit = (t) => {
                                setEditTx(t);
                                setEditForm({
                                    type: t.type, quantity: t.quantity, unit: t.unit, note: t.note || '',
                                    date: new Date(t.date).toISOString().split('T')[0],
                                    warehouseId: t.warehouse?.id || '', projectId: t.project?.id || '',
                                    images: (() => { try { return JSON.parse(t.images || '[]'); } catch { return []; } })(),
                                });
                            };
                            const doDelete = async (t) => {
                                if (!confirm(`Xóa phiếu ${t.code}? Tồn kho sẽ được hoàn tác.`)) return;
                                await fetch(`/api/inventory/${t.id}`, { method: 'DELETE' });
                                fetchTx(); fetchStock(true);
                            };

                            if (isMobile) {
                                return (
                                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
                                        {groups.map(g => (
                                            <div key={g.dateKey}>
                                                <div style={{ padding: '10px 4px 6px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.3, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ flex: 1, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                                                        📅 {fmtDate(g.date)}
                                                        <span style={{ fontWeight: 400, marginLeft: 6 }}>({g.items.length} phiếu)</span>
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                                                    {g.items.map(t => {
                                                        const isImport = t.type === 'Nhập';
                                                        return (
                                                            <div key={t.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 12, borderLeft: `4px solid ${isImport ? 'var(--status-success)' : 'var(--status-warning)'}`, background: 'var(--bg-card)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                            <span className="accent" style={{ fontSize: 12, fontWeight: 600 }}>{t.code}</span>
                                                                            <span className={`badge ${isImport ? 'success' : 'warning'}`} style={{ fontSize: 11 }}>{t.type}</span>
                                                                        </div>
                                                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginTop: 4, wordBreak: 'break-word' }}>{t.product?.name}</div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                                                        <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 16, padding: 4 }} title="Sửa">✏️</button>
                                                                        <button onClick={() => doDelete(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: 4 }} title="Xóa">🗑</button>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                                    <span style={{ fontWeight: 700, fontSize: 16, color: isImport ? 'var(--status-success)' : 'var(--status-warning)' }}>
                                                                        {isImport ? '+' : '-'}{t.quantity} {t.unit}
                                                                    </span>
                                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🏭 {t.warehouse?.name || '—'}</span>
                                                                </div>
                                                                {(t.project?.name || t.note) && (
                                                                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                        {t.project?.name && <span>🗂 {t.project.name}</span>}
                                                                        {t.note && <span>📝 {t.note}</span>}
                                                                    </div>
                                                                )}
                                                                {(() => { try { const imgs = JSON.parse(t.images || '[]'); return imgs.length > 0 ? <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>{imgs.map((url, i) => <img key={i} src={url} alt="" onClick={() => window.open(url, '_blank')} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }} />)}</div> : null; } catch { return null; } })()}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }

                            return (
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Mã PK</th><th>Loại</th><th>Sản phẩm</th><th>SL</th><th>Kho</th><th>Dự án</th><th>Ghi chú</th><th>Ảnh</th><th style={{ width: 64 }}></th></tr>
                                        </thead>
                                        <tbody>
                                            {groups.map(g => (
                                                <Fragment key={g.dateKey}>
                                                    <tr>
                                                        <td colSpan={9} style={{ padding: '10px 16px 6px', background: 'var(--bg-hover)', borderTop: '2px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                                                            <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', letterSpacing: 0.3 }}>
                                                                📅 {fmtDate(g.date)}
                                                            </span>
                                                            <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{g.items.length} phiếu</span>
                                                        </td>
                                                    </tr>
                                                    {g.items.map(t => (
                                                        <tr key={t.id}>
                                                            <td className="accent">{t.code}</td>
                                                            <td><span className={`badge ${t.type === 'Nhập' ? 'badge-success' : 'badge-warning'}`}>{t.type}</span></td>
                                                            <td className="primary">{t.product?.name}</td>
                                                            <td style={{ fontWeight: 600, color: t.type === 'Nhập' ? 'var(--status-success)' : 'var(--status-warning)' }}>
                                                                {t.type === 'Nhập' ? '+' : '-'}{t.quantity} {t.unit}
                                                            </td>
                                                            <td style={{ fontSize: 13 }}>{t.warehouse?.name}</td>
                                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.project?.name || '—'}</td>
                                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.note || '—'}</td>
                                                            <td>
                                                                {(() => { try { const imgs = JSON.parse(t.images || '[]'); return imgs.length > 0 ? <div style={{ display: 'flex', gap: 3 }}>{imgs.slice(0, 3).map((url, i) => <img key={i} src={url} alt="" onClick={() => window.open(url, '_blank')} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)', cursor: 'pointer' }} />)}{imgs.length > 3 && <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>+{imgs.length - 3}</span>}</div> : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>; } catch { return null; } })()}
                                                            </td>
                                                            <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 14, padding: '2px 5px' }} title="Sửa">✏️</button>
                                                                <button onClick={() => doDelete(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: '2px 5px' }} title="Xóa">🗑</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </Fragment>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </>
                )}

                {/* ── TAB: Phân bổ dự án ── */}
                {activeTab === 'allocations' && <AllocationTab />}
            </div>

            {/* ── Modal sửa phiếu ── */}
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
                                        {(editForm.projectId && !contractProjects.some(p => p.id === editForm.projectId)
                                            ? [...contractProjects, projects.find(p => p.id === editForm.projectId)].filter(Boolean)
                                            : contractProjects
                                        ).map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <PhotoStrip images={editForm.images || []} onChange={imgs => setEditForm(f => ({ ...f, images: imgs }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditTx(null)}>Hủy</button>
                            <button className="btn btn-primary" disabled={editSaving || !editForm.quantity || !editForm.warehouseId}
                                onClick={async () => {
                                    setEditSaving(true);
                                    try {
                                        const res = await fetch(`/api/inventory/${editTx.id}`, {
                                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ ...editForm, quantity: Number(editForm.quantity) }),
                                        });
                                        if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Lỗi cập nhật'); }
                                        setEditTx(null); fetchTx(); fetchStock(true);
                                    } catch (err) { alert(err.message); }
                                    finally { setEditSaving(false); }
                                }}>{editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal nhập/xuất kho ── */}
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
                                <input className="form-input" placeholder="🔍 Gõ để tìm sản phẩm..."
                                    value={productSearch}
                                    onChange={e => { setProductSearch(e.target.value); setShowProductDrop(true); if (!e.target.value) setFormSynced(f => ({ ...f, productId: '', _workItemId: '', _freeText: '' })); }}
                                    onFocus={() => setShowProductDrop(true)}
                                    onBlur={() => setTimeout(() => setShowProductDrop(false), 180)}
                                    autoComplete="off" />
                                {(form.productId || form._workItemId || form._freeText) && !showProductDrop && (
                                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 3, fontWeight: 600 }}>
                                        ✓ {form._freeText
                                            ? <span>{form._freeText} <span style={{ fontWeight: 400, color: '#6b7280' }}>(sản phẩm mới)</span></span>
                                            : form._workItemId
                                                ? workItems.find(w => w.id === form._workItemId)?.name
                                                : allProducts.find(p => p.id === form.productId)?.name}
                                    </div>
                                )}
                                {showProductDrop && (() => {
                                    const q = productSearch.toLowerCase();
                                    const filteredProducts = allProducts.filter(p => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
                                    const filteredWork = workItems.filter(w => !q || w.name.toLowerCase().includes(q));
                                    const hasAny = filteredProducts.length > 0 || filteredWork.length > 0;
                                    if (!hasAny && !productSearch.trim()) return null;
                                    return (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.13)', zIndex: 200, maxHeight: 260, overflowY: 'auto' }}>
                                            {filteredProducts.length > 0 && <>
                                                <div style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#6b7280', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>SẢN PHẨM TRONG KHO</div>
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
                                            {productSearch.trim() && (
                                                <div onMouseDown={() => { handleProductSelect('__free__'); setShowProductDrop(false); }}
                                                    style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, borderTop: hasAny ? '1px solid #e5e7eb' : 'none', background: '#fffbeb', display: 'flex', alignItems: 'center', gap: 8 }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
                                                    onMouseLeave={e => e.currentTarget.style.background = '#fffbeb'}>
                                                    <span style={{ fontSize: 16 }}>➕</span>
                                                    <span>Dùng tên: <strong>"{productSearch.trim()}"</strong></span>
                                                    <span style={{ marginLeft: 'auto', fontSize: 11, color: '#92400e', background: '#fde68a', borderRadius: 4, padding: '1px 6px' }}>Sản phẩm mới</span>
                                                </div>
                                            )}
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
                                        {contractProjects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.note} onChange={e => setFormSynced(f => ({ ...f, note: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <PhotoStrip images={form.images || []} onChange={imgs => setFormSynced(f => ({ ...f, images: imgs }))} />
                            </div>
                        </div>
                        {submitError && <div style={{ padding: '6px 20px', color: '#dc2626', fontSize: 13 }}>{submitError}</div>}
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit}
                                disabled={saving || (!form.productId && !form._workItemId && !form._freeText) || !form.warehouseId || !form.quantity}>
                                {saving ? 'Đang lưu...' : `Tạo phiếu ${form.type}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
