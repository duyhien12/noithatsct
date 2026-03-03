'use client';
import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function ProductConfigurator({ product, onConfirm, onCancel }) {
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selections, setSelections] = useState({});
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        apiFetch(`/api/products/${product.id}/attributes`)
            .then(data => {
                const init = {};
                data.forEach(attr => {
                    if (attr.inputType === 'select' && attr.options.length > 0) {
                        init[attr.id] = attr.options[0].id;
                    } else {
                        init[attr.id] = '';
                    }
                });
                setAttributes(data);
                setSelections(init);
                setLoading(false);
            })
            .catch(() => { setError('Không tải được tùy chọn sản phẩm'); setLoading(false); });
    }, [product.id]);

    const calculatedPrice = useMemo(() => {
        let price = product.salePrice || 0;
        attributes.forEach(attr => {
            if (attr.inputType === 'select') {
                const opt = attr.options.find(o => o.id === selections[attr.id]);
                if (opt) price += opt.priceAddon;
            }
        });
        return price;
    }, [product.salePrice, attributes, selections]);

    const buildDescription = () => {
        return attributes.map(attr => {
            if (attr.inputType === 'select') {
                const opt = attr.options.find(o => o.id === selections[attr.id]);
                return opt ? `${attr.name} ${opt.label}` : null;
            }
            return selections[attr.id]?.trim() ? `${attr.name} ${selections[attr.id]}` : null;
        }).filter(Boolean).join(', ');
    };

    const handleConfirm = async () => {
        for (const attr of attributes) {
            if (!attr.required) continue;
            if (attr.inputType === 'select' && !selections[attr.id]) {
                alert(`Vui lòng chọn "${attr.name}"`);
                return;
            }
            if (attr.inputType === 'text' && !selections[attr.id]?.trim()) {
                alert(`Vui lòng nhập "${attr.name}"`);
                return;
            }
        }
        const qty = Number(quantity) || 0;
        // Fetch BOM to populate sub-items (phụ kiện)
        let subItems = [];
        if (product.id) {
            try {
                const bom = await apiFetch(`/api/products/${product.id}/bom`);
                if (bom && bom.length > 0) {
                    subItems = bom.map(b => ({
                        _key: Date.now() + Math.random(),
                        name: b.component?.name || b.notes || '',
                        unit: b.unit || b.component?.unit || 'cái',
                        quantity: b.quantity || 0,
                        unitPrice: b.component?.salePrice || 0,
                        amount: (b.quantity || 0) * (b.component?.salePrice || 0),
                        description: b.notes || '',
                        image: b.component?.image || '',
                        productId: b.component?.id || null,
                        length: 0, width: 0, height: 0, volume: 0,
                        mainMaterial: 0, auxMaterial: 0, labor: 0,
                    }));
                }
            } catch { /* no BOM, that's fine */ }
        }
        onConfirm({
            _key: Date.now() + Math.random(),
            name: product.name,
            unit: product.unit || 'cái',
            quantity: qty,
            mainMaterial: calculatedPrice,
            auxMaterial: 0,
            labor: 0,
            unitPrice: calculatedPrice,
            amount: calculatedPrice * qty,
            description: buildDescription(),
            image: product.image || '',
            length: 0, width: 0, height: 0,
            productId: product.id,
            subItems,
        });
    };

    if (loading) return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
                <div className="modal-body" style={{ padding: 40, color: 'var(--text-muted)' }}>
                    Đang tải cấu hình...
                </div>
            </div>
        </div>
    );

    if (error) return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, textAlign: 'center' }}>
                <div className="modal-body">
                    <div style={{ color: 'var(--status-danger)', marginBottom: 12 }}>⚠ {error}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={() => { setError(null); setLoading(true); }}>Thử lại</button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <div>
                        <h3 style={{ margin: 0 }}>🎛 Cấu hình sản phẩm</h3>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{product.name} · {product.unit}</div>
                    </div>
                    <button className="modal-close" onClick={onCancel}>×</button>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Base price info */}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                        Giá cơ bản: <strong>{fmt(product.salePrice)}</strong>
                        {attributes.length === 0 && (
                            <span style={{ marginLeft: 8, opacity: 0.65 }}>· Chưa có biến thể — vào trang sản phẩm để cấu hình</span>
                        )}
                    </div>

                    {/* Attribute selectors */}
                    {attributes.map(attr => (
                        <div key={attr.id} className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">
                                {attr.name}
                                {attr.required && <span style={{ color: 'red', marginLeft: 3 }}>*</span>}
                                {attr.inputType === 'text' && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>văn bản</span>}
                            </label>
                            {attr.inputType === 'select' ? (
                                <select className="form-select" value={selections[attr.id] || ''} onChange={e => setSelections(s => ({ ...s, [attr.id]: e.target.value }))}>
                                    {!attr.required && <option value="">— Không chọn —</option>}
                                    {attr.options.map(opt => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.label}{opt.priceAddon > 0 ? ` (+${new Intl.NumberFormat('vi-VN').format(opt.priceAddon)}đ)` : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input className="form-input" placeholder={`Nhập ${attr.name.toLowerCase()}...`} value={selections[attr.id] || ''} onChange={e => setSelections(s => ({ ...s, [attr.id]: e.target.value }))} />
                            )}
                        </div>
                    ))}

                    {/* Quantity */}
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Số lượng ({product.unit || 'cái'})</label>
                        <input type="number" className="form-input" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: 140 }} />
                    </div>

                    {/* Live price */}
                    <div style={{ padding: '10px 14px', background: 'rgba(35,64,147,0.06)', borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13 }}>Đơn giá:</span>
                            <strong style={{ color: 'var(--primary)', fontSize: 14 }}>{fmt(calculatedPrice)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13 }}>Thành tiền:</span>
                            <strong style={{ color: 'var(--accent-primary)', fontSize: 15 }}>{fmt(calculatedPrice * (Number(quantity) || 0))}</strong>
                        </div>
                    </div>

                    {/* Description preview */}
                    {buildDescription() && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 6 }}>
                            📝 {buildDescription()}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onCancel}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleConfirm}>+ Thêm vào báo giá</button>
                </div>
            </div>
        </div>
    );
}
