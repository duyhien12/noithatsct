'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const SUPPLY_TYPES = ['Mua ngoài', 'Sản xuất nội bộ', 'Dịch vụ'];
const SUPPLY_BADGE = { 'Sản xuất nội bộ': 'info', 'Mua ngoài': 'success', 'Dịch vụ': 'purple', 'Mua thương mại': 'success', 'Vật tư lưu kho': 'success' };
const normalizeSupply = (t) => (t === 'Mua thương mại' || t === 'Vật tư lưu kho') ? 'Mua ngoài' : (t || 'Mua ngoài');
const CORE_BOARD_TYPES = ['MDF thường', 'MDF chống ẩm', 'MFC', 'Gỗ tự nhiên', 'Nhựa', 'Kính', 'Khác'];
const PRODUCT_CATS = ['Nội thất thành phẩm', 'Gỗ tự nhiên', 'Gỗ công nghiệp', 'Đá & Gạch', 'Sơn & Keo', 'Phụ kiện nội thất', 'Thiết bị điện', 'Vật liệu xây dựng', 'Rèm cửa', 'Thiết bị vệ sinh', 'Điều hòa', 'Decor', 'Đồ rời', 'Phòng thờ'];

export default function ProductDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [tab, setTab] = useState('info');
    const [product, setProduct] = useState(null);
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);

    // BOM
    const [bom, setBom] = useState([]);
    const [loadingBom, setLoadingBom] = useState(false);
    const [allProducts, setAllProducts] = useState([]);
    const [bomSearch, setBomSearch] = useState('');
    const [showBomForm, setShowBomForm] = useState(false);
    const [bomForm, setBomForm] = useState({ componentId: '', quantity: 1, unit: '', notes: '' });

    // Kho
    const [txList, setTxList] = useState([]);
    const [loadingTx, setLoadingTx] = useState(false);

    const fetchProduct = async () => {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) { router.push('/products'); return; }
        const p = await res.json();
        setProduct(p);
        setForm({ ...p });
    };

    const fetchBom = async () => {
        setLoadingBom(true);
        const res = await fetch(`/api/products/${id}/bom`);
        setBom(await res.json());
        setLoadingBom(false);
    };

    const fetchTx = async () => {
        setLoadingTx(true);
        const res = await fetch(`/api/inventory?productId=${id}&limit=50`);
        const data = await res.json();
        setTxList(data.data || []);
        setLoadingTx(false);
    };

    useEffect(() => { fetchProduct(); }, [id]);
    useEffect(() => {
        if (tab === 'bom') {
            fetchBom();
            fetch('/api/products?limit=1000').then(r => r.json()).then(d => setAllProducts(d.data || []));
        }
        if (tab === 'inventory') fetchTx();
    }, [tab]);

    const saveInfo = async () => {
        setSaving(true);
        const { id: _id, code, createdAt, updatedAt, deletedAt, ...data } = form;
        await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        await fetchProduct();
        setSaving(false);
    };

    const addBomItem = async () => {
        if (!bomForm.componentId) return alert('Vui lòng chọn vật tư thành phần');
        const res = await fetch(`/api/products/${id}/bom`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bomForm),
        });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi'); }
        setShowBomForm(false);
        setBomForm({ componentId: '', quantity: 1, unit: '', notes: '' });
        setBomSearch('');
        fetchBom();
    };

    const deleteBomItem = async (bomId) => {
        if (!confirm('Xóa vật tư khỏi định mức?')) return;
        await fetch(`/api/products/${id}/bom/${bomId}`, { method: 'DELETE' });
        fetchBom();
    };

    const filteredComponents = allProducts.filter(p =>
        p.id !== id &&
        (!bomSearch || p.name.toLowerCase().includes(bomSearch.toLowerCase()) || p.code?.toLowerCase().includes(bomSearch.toLowerCase()))
    );

    if (!product) return <div style={{ padding: 60, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => router.push('/products')}>← Sản phẩm</button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{product.name}</h2>
                        <span className={`badge ${SUPPLY_BADGE[product.supplyType] || 'muted'}`}>{normalizeSupply(product.supplyType)}</span>
                        {product.status && <span className="badge muted">{product.status}</span>}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.5, fontFamily: 'monospace', marginTop: 2 }}>{product.code} · {product.category} · {product.unit}</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: 20 }}>
                {[
                    ['info', '📋 Thông tin'],
                    ...(normalizeSupply(product.supplyType) === 'Sản xuất nội bộ' ? [['bom', '🔩 Định mức BOM']] : []),
                    ...(normalizeSupply(product.supplyType) !== 'Dịch vụ' ? [['inventory', '📦 Lịch sử kho']] : []),
                ].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        style={{ padding: '9px 22px', border: 'none', borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', marginBottom: -2, fontSize: 13, fontWeight: tab === key ? 700 : 400, color: tab === key ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* ===== TAB THÔNG TIN ===== */}
            {tab === 'info' && form && (
                <div className="card" style={{ maxWidth: 700 }}>
                    <div className="card-header"><h3>Thông tin sản phẩm</h3></div>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Tên sản phẩm *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mã SP</label>
                                <input className="form-input" value={form.code} disabled style={{ opacity: 0.5 }} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Danh mục</label>
                                <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                    {PRODUCT_CATS.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">ĐVT</label>
                                <input className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nguồn cung</label>
                                <select className="form-select" value={normalizeSupply(form.supplyType)} onChange={e => setForm(f => ({ ...f, supplyType: e.target.value }))}>
                                    {SUPPLY_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Giá nhập</label>
                                <input className="form-input" type="number" value={form.importPrice} onChange={e => setForm(f => ({ ...f, importPrice: Number(e.target.value) }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Giá bán</label>
                                <input className="form-input" type="number" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: Number(e.target.value) }))} />
                            </div>
                        </div>
                        {normalizeSupply(form.supplyType) !== 'Dịch vụ' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Tồn kho</label>
                                    <input className="form-input" type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tồn kho tối thiểu</label>
                                    <input className="form-input" type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: Number(e.target.value) }))} />
                                </div>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Nhà cung cấp</label>
                                    <input className="form-input" value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
                                </div>
                            </div>
                        )}
                        {normalizeSupply(form.supplyType) === 'Sản xuất nội bộ' && (
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Chất liệu cốt</label>
                                    <select className="form-select" value={form.coreBoard || ''} onChange={e => setForm(f => ({ ...f, coreBoard: e.target.value }))}>
                                        <option value="">-- Chọn --</option>
                                        {CORE_BOARD_TYPES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mã bề mặt / Mã màu</label>
                                    <input className="form-input" value={form.surfaceCode || ''} onChange={e => setForm(f => ({ ...f, surfaceCode: e.target.value }))} placeholder="VD: 388EV, U5002..." />
                                </div>
                            </div>
                        )}
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label className="form-label">Kích thước</label>
                                <input className="form-input" value={form.dimensions || ''} onChange={e => setForm(f => ({ ...f, dimensions: e.target.value }))} placeholder="VD: 1200x600x750mm" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Thương hiệu</label>
                                <input className="form-input" value={form.brand || ''} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mô tả</label>
                            <textarea className="form-input" rows={3} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-ghost" onClick={() => setForm({ ...product })}>Hoàn tác</button>
                        <button className="btn btn-primary" onClick={saveInfo} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                    </div>
                </div>
            )}

            {/* ===== TAB BOM ===== */}
            {tab === 'bom' && (
                <div className="card">
                    <div className="card-header">
                        <div>
                            <h3 style={{ margin: 0 }}>Định mức vật tư (BOM)</h3>
                            <div style={{ fontSize: 12, opacity: 0.55, marginTop: 2 }}>Khai báo nguyên vật liệu cần dùng để sản xuất: <strong>{product.name}</strong></div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowBomForm(v => !v)}>
                            {showBomForm ? '✕ Đóng' : '+ Thêm thành phần'}
                        </button>
                    </div>

                    {showBomForm && (
                        <div style={{ padding: '14px 16px', background: 'rgba(35,64,147,0.04)', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2, minWidth: 200 }}>
                                    <label className="form-label">Tìm vật tư *</label>
                                    <input className="form-input" placeholder="Tìm theo tên hoặc mã..." value={bomSearch}
                                        onChange={e => { setBomSearch(e.target.value); setBomForm(f => ({ ...f, componentId: '' })); }} />
                                    {bomSearch && !bomForm.componentId && (
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', zIndex: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, top: 2, left: 0, right: 0, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                                                {filteredComponents.slice(0, 20).map(p => (
                                                    <div key={p.id} onClick={() => { setBomForm(f => ({ ...f, componentId: p.id, unit: p.unit })); setBomSearch(p.name); }}
                                                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-color)' }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                                                        onMouseOut={e => e.currentTarget.style.background = ''}>
                                                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                        <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{p.code} · {p.unit}</span>
                                                    </div>
                                                ))}
                                                {filteredComponents.length === 0 && <div style={{ padding: '10px 12px', opacity: 0.4, fontSize: 13 }}>Không tìm thấy</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div style={{ width: 90 }}>
                                    <label className="form-label">Số lượng</label>
                                    <input className="form-input" type="number" min="0.01" step="0.01" value={bomForm.quantity}
                                        onChange={e => setBomForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
                                </div>
                                <div style={{ width: 70 }}>
                                    <label className="form-label">ĐVT</label>
                                    <input className="form-input" value={bomForm.unit} onChange={e => setBomForm(f => ({ ...f, unit: e.target.value }))} />
                                </div>
                                <div style={{ flex: 1, minWidth: 120 }}>
                                    <label className="form-label">Ghi chú</label>
                                    <input className="form-input" value={bomForm.notes} onChange={e => setBomForm(f => ({ ...f, notes: e.target.value }))} placeholder="Mã màu, spec..." />
                                </div>
                                <button className="btn btn-primary btn-sm" onClick={addBomItem} style={{ marginBottom: 1 }}>Thêm</button>
                            </div>
                        </div>
                    )}

                    {loadingBom ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr>
                                    <th style={{ width: 44 }}>Ảnh</th>
                                    <th>Vật tư thành phần</th>
                                    <th>Danh mục</th>
                                    <th style={{ width: 80 }}>ĐVT</th>
                                    <th style={{ width: 80 }}>Số lượng</th>
                                    <th>Ghi chú</th>
                                    <th style={{ width: 50 }}></th>
                                </tr></thead>
                                <tbody>
                                    {bom.length === 0 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, opacity: 0.4, fontSize: 13 }}>
                                            Chưa có vật tư thành phần. Nhấn "+ Thêm thành phần" để khai báo định mức.
                                        </td></tr>
                                    )}
                                    {bom.map(item => (
                                        <tr key={item.id}>
                                            <td style={{ padding: 4 }}>
                                                {item.component.image
                                                    ? <img src={item.component.image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border-color)' }} />
                                                    : <div style={{ width: 36, height: 36, borderRadius: 5, border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3, fontSize: 14 }}>📦</div>
                                                }
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.component.name}</div>
                                                <div style={{ fontSize: 11, opacity: 0.45, fontFamily: 'monospace' }}>{item.component.code}</div>
                                            </td>
                                            <td><span className="badge badge-default">{item.component.category}</span></td>
                                            <td style={{ fontSize: 13 }}>{item.unit || item.component.unit}</td>
                                            <td style={{ fontWeight: 600, fontSize: 14 }}>{item.quantity}</td>
                                            <td style={{ fontSize: 12, opacity: 0.7 }}>{item.notes || '—'}</td>
                                            <td><button className="btn btn-ghost btn-sm" onClick={() => deleteBomItem(item.id)}>🗑️</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {bom.length > 0 && (
                        <div style={{ padding: '10px 16px', fontSize: 12, opacity: 0.6, borderTop: '1px solid var(--border-color)' }}>
                            Tổng: <strong>{bom.length}</strong> loại vật tư thành phần
                        </div>
                    )}
                </div>
            )}

            {/* ===== TAB LỊCH SỬ KHO ===== */}
            {tab === 'inventory' && (
                <div className="card">
                    <div className="card-header">
                        <h3>Lịch sử nhập/xuất kho</h3>
                        <div style={{ fontSize: 13, opacity: 0.6 }}>Tồn hiện tại: <strong style={{ fontSize: 15 }}>{fmt(product.stock)}</strong> {product.unit}</div>
                    </div>
                    {loadingTx ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr>
                                    <th>Mã phiếu</th>
                                    <th style={{ width: 80 }}>Loại</th>
                                    <th style={{ width: 80 }}>Số lượng</th>
                                    <th>Kho</th>
                                    <th>Dự án</th>
                                    <th>Ghi chú</th>
                                    <th style={{ width: 100 }}>Ngày</th>
                                </tr></thead>
                                <tbody>
                                    {txList.length === 0 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, opacity: 0.4, fontSize: 13 }}>Chưa có phiếu nhập/xuất kho nào</td></tr>
                                    )}
                                    {txList.map(tx => (
                                        <tr key={tx.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{tx.code}</td>
                                            <td><span className={`badge ${tx.type === 'Nhập' ? 'badge-success' : 'badge-warning'}`}>{tx.type}</span></td>
                                            <td style={{ fontWeight: 600, color: tx.type === 'Nhập' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                                {tx.type === 'Nhập' ? '+' : '-'}{fmt(tx.quantity)} {tx.unit}
                                            </td>
                                            <td style={{ fontSize: 12 }}>{tx.warehouse?.name || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{tx.project?.name || '—'}</td>
                                            <td style={{ fontSize: 12, opacity: 0.6 }}>{tx.note || '—'}</td>
                                            <td style={{ fontSize: 12 }}>{fmtDate(tx.date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
