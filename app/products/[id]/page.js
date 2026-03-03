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
import { CUSTOM_FURNITURE_CAT } from '@/lib/quotation-constants';

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

    // Biến thể (Attributes)
    const [attributes, setAttributes] = useState([]);
    const [attrForm, setAttrForm] = useState({ name: '', inputType: 'select', required: true });
    const [showAttrForm, setShowAttrForm] = useState(false);
    const [optionForms, setOptionForms] = useState({});
    const [showOptionForm, setShowOptionForm] = useState({});
    const [variantTemplates, setVariantTemplates] = useState([]);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);

    // Dynamic categories from DB
    const [allCats, setAllCats] = useState([CUSTOM_FURNITURE_CAT]);
    useEffect(() => {
        fetch('/api/products?limit=1000').then(r => r.json()).then(d => {
            const cats = [...new Set((d.data || []).map(p => p.category).filter(Boolean)), CUSTOM_FURNITURE_CAT].sort();
            setAllCats([...new Set(cats)]);
        }).catch(() => { });
    }, []);

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

    const fetchAttributes = async () => {
        const res = await fetch(`/api/products/${id}/attributes`);
        setAttributes(await res.json());
    };

    useEffect(() => { fetchProduct(); }, [id]);
    useEffect(() => {
        if (tab === 'bom') {
            fetchBom();
            fetch('/api/products?limit=1000').then(r => r.json()).then(d => setAllProducts(d.data || []));
        }
        if (tab === 'inventory') fetchTx();
        if (tab === 'attributes') {
            fetchAttributes();
            fetch('/api/variant-templates').then(r => r.json()).then(setVariantTemplates).catch(() => { });
        }
    }, [tab]);

    const addAttribute = async () => {
        if (!attrForm.name.trim()) return alert('Nhập tên thuộc tính');
        const res = await fetch(`/api/products/${id}/attributes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attrForm),
        });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi'); }
        setShowAttrForm(false);
        setAttrForm({ name: '', inputType: 'select', required: true });
        fetchAttributes();
    };

    const deleteAttribute = async (attrId) => {
        if (!confirm('Xóa thuộc tính và tất cả tùy chọn?')) return;
        await fetch(`/api/products/${id}/attributes/${attrId}`, { method: 'DELETE' });
        fetchAttributes();
    };

    const addOption = async (attrId) => {
        const form = optionForms[attrId] || {};
        if (!form.label?.trim()) return alert('Nhập nhãn tùy chọn');
        const res = await fetch(`/api/products/${id}/attributes/${attrId}/options`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: form.label, priceAddon: Number(form.priceAddon) || 0 }),
        });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi'); }
        setOptionForms(prev => ({ ...prev, [attrId]: { label: '', priceAddon: 0 } }));
        fetchAttributes();
    };

    const deleteOption = async (attrId, optionId) => {
        if (!confirm('Xóa tùy chọn này?')) return;
        await fetch(`/api/products/${id}/attributes/${attrId}/options/${optionId}`, { method: 'DELETE' });
        fetchAttributes();
    };

    const applyTemplate = async (templateId) => {
        const res = await fetch(`/api/products/${id}/attributes`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId }),
        });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi'); }
        fetchAttributes();
        setShowTemplateMenu(false);
    };

    const saveAsTemplate = async (attr) => {
        const res = await fetch('/api/variant-templates', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: attr.name,
                inputType: attr.inputType,
                required: attr.required,
                options: attr.options.map(o => ({ label: o.label, priceAddon: o.priceAddon })),
            }),
        });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi'); }
        alert(`Đã lưu "${attr.name}" thành mẫu!`);
        fetch('/api/variant-templates').then(r => r.json()).then(setVariantTemplates).catch(() => { });
    };

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
                    ...(normalizeSupply(product.supplyType) === 'Sản xuất nội bộ' ? [['bom', '🔩 Định mức BOM'], ['attributes', '🎛 Biến thể']] : []),
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
                                    {allCats.map(c => <option key={c}>{c}</option>)}
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

            {/* ===== TAB BIẾN THỂ ===== */}
            {tab === 'attributes' && (
                <div>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>🎛 Cấu hình biến thể</h3>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Khai báo các tùy chọn (Loại thùng, Loại cánh, Mã màu...) cho: <strong>{product.name}</strong></div>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowAttrForm(v => !v)}>+ Thêm thuộc tính</button>
                            <div style={{ position: 'relative' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowTemplateMenu(v => !v)}>📦 Áp dụng mẫu</button>
                                {showTemplateMenu && (
                                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 220, padding: 4 }}>
                                        {variantTemplates.length === 0 ? (
                                            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Chưa có mẫu nào. Lưu thuộc tính hiện có thành mẫu trước.</div>
                                        ) : variantTemplates.map(t => (
                                            <div key={t.id} onClick={() => applyTemplate(t.id)}
                                                style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 6, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                onMouseOut={e => e.currentTarget.style.background = ''}>
                                                <span style={{ fontWeight: 500 }}>{t.name}</span>
                                                <span style={{ fontSize: 11, opacity: 0.5 }}>{t.options?.length || 0} options</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {showAttrForm && (
                            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-hover)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ flex: 2, minWidth: 160, margin: 0 }}>
                                    <label className="form-label">Tên thuộc tính *</label>
                                    <input className="form-input" placeholder="VD: Loại thùng, Mã màu..." value={attrForm.name} onChange={e => setAttrForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Loại nhập</label>
                                    <select className="form-select" value={attrForm.inputType} onChange={e => setAttrForm(f => ({ ...f, inputType: e.target.value }))}>
                                        <option value="select">Chọn từ danh sách</option>
                                        <option value="text">Nhập văn bản tự do</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 2 }}>
                                    <input type="checkbox" id="attr-req" checked={attrForm.required} onChange={e => setAttrForm(f => ({ ...f, required: e.target.checked }))} />
                                    <label htmlFor="attr-req" style={{ fontSize: 13 }}>Bắt buộc</label>
                                </div>
                                <button className="btn btn-primary btn-sm" onClick={addAttribute}>Thêm</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAttrForm(false)}>Hủy</button>
                            </div>
                        )}
                    </div>

                    {attributes.length === 0 && !showAttrForm && (
                        <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 8 }}>
                            Chưa có thuộc tính nào — bấm "+ Thêm thuộc tính" để khai báo biến thể
                        </div>
                    )}

                    {attributes.map(attr => (
                        <div key={attr.id} className="card" style={{ marginBottom: 12 }}>
                            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{attr.name}</span>
                                    <span className={`badge ${attr.inputType === 'select' ? 'info' : 'muted'}`} style={{ fontSize: 11 }}>{attr.inputType === 'select' ? 'Chọn' : 'Văn bản'}</span>
                                    <span className={`badge ${attr.required ? 'warning' : 'muted'}`} style={{ fontSize: 11 }}>{attr.required ? 'Bắt buộc' : 'Tùy chọn'}</span>
                                </div>
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => deleteAttribute(attr.id)}>🗑 Xóa</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => saveAsTemplate(attr)} title="Lưu thành mẫu">💾 Lưu mẫu</button>
                            </div>

                            {attr.inputType === 'select' ? (
                                <div style={{ padding: '12px 16px' }}>
                                    {attr.options.length > 0 ? (
                                        <table className="data-table" style={{ marginBottom: 12 }}>
                                            <thead><tr><th>#</th><th>Nhãn tùy chọn</th><th>+Giá thêm/đơn vị</th><th></th></tr></thead>
                                            <tbody>{attr.options.map((opt, i) => (
                                                <tr key={opt.id}>
                                                    <td style={{ width: 32, color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                                                    <td style={{ fontWeight: 500 }}>{opt.label}</td>
                                                    <td style={{ color: opt.priceAddon > 0 ? 'var(--status-success)' : 'var(--text-muted)' }}>
                                                        {opt.priceAddon > 0 ? `+${fmtCur(opt.priceAddon)}` : '—'}
                                                    </td>
                                                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)', fontSize: 11 }} onClick={() => deleteOption(attr.id, opt.id)}>🗑</button></td>
                                                </tr>
                                            ))}</tbody>
                                        </table>
                                    ) : (
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>Chưa có tùy chọn nào</div>
                                    )}

                                    {showOptionForm[attr.id] ? (
                                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', padding: '10px 0' }}>
                                            <div className="form-group" style={{ flex: 2, minWidth: 160, margin: 0 }}>
                                                <label className="form-label">Nhãn *</label>
                                                <input className="form-input" placeholder="VD: Gỗ nhựa Picomat" value={optionForms[attr.id]?.label || ''} onChange={e => setOptionForms(p => ({ ...p, [attr.id]: { ...p[attr.id], label: e.target.value } }))} autoFocus />
                                            </div>
                                            <div className="form-group" style={{ width: 160, margin: 0 }}>
                                                <label className="form-label">+Giá thêm (VNĐ)</label>
                                                <input type="number" className="form-input" step="1000" value={optionForms[attr.id]?.priceAddon || 0} onChange={e => setOptionForms(p => ({ ...p, [attr.id]: { ...p[attr.id], priceAddon: e.target.value } }))} />
                                            </div>
                                            <button className="btn btn-primary btn-sm" onClick={() => addOption(attr.id)}>Thêm</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => setShowOptionForm(p => ({ ...p, [attr.id]: false }))}>Đóng</button>
                                        </div>
                                    ) : (
                                        <button className="btn btn-ghost btn-sm" onClick={() => setShowOptionForm(p => ({ ...p, [attr.id]: true }))}>+ Tùy chọn</button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    Người dùng sẽ nhập văn bản tự do khi cấu hình trong báo giá
                                </div>
                            )}
                        </div>
                    ))}
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
