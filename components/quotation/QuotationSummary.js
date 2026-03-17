'use client';
import { useState, useRef, useEffect } from 'react';
import { fmt } from '@/lib/quotation-constants';

const DEDUCTION_PRESETS = [
    'Chi phí thiết kế 3D',
    'Chi phí thiết kế kiến trúc',
];

export default function QuotationSummary({ hook }) {
    const {
        form, setForm,
        directCost, adjustmentAmount, total,
        discountAmount, afterDiscount, vatAmount, totalDeductions, grandTotal,
        deductions, addDeduction, removeDeduction, updateDeduction,
        products,
    } = hook;

    const isInterior = (form.type || '').includes('nội thất') || (form.type || '').includes('Nội thất');

    // Product search for khuyến mại
    const [promoSearch, setPromoSearch] = useState('');
    const [promoResults, setPromoResults] = useState([]);
    const [promoIdx, setPromoIdx] = useState(null); // which deduction index is searching
    const promoRef = useRef(null);

    useEffect(() => {
        if (!promoSearch.trim()) { setPromoResults([]); return; }
        const q = promoSearch.toLowerCase();
        setPromoResults((products || []).filter(p => p.name.toLowerCase().includes(q)).slice(0, 8));
    }, [promoSearch, products]);

    const selectPromoProduct = (product, idx) => {
        updateDeduction(idx, 'name', product.name);
        updateDeduction(idx, 'amount', product.salePrice || 0);
        updateDeduction(idx, 'productId', product.id);
        setPromoSearch('');
        setPromoResults([]);
        setPromoIdx(null);
    };

    return (
        <div className="card">
            <div className="card-header"><h3>Tổng kết báo giá</h3></div>
            <div className="card-body">
                <div className="quotation-summary-grid">

                    <div className="quotation-summary-row">
                        <span>Chi phí vận chuyển, lắp đặt <input className="form-input form-input-compact" type="number"
                            value={form.otherFee || ''} onChange={e => setForm({ ...form, otherFee: parseFloat(e.target.value) || 0 })}
                            style={{ width: 100, display: 'inline-block', marginLeft: 6 }} /></span>
                        <span className="quotation-summary-value">{fmt(form.otherFee)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>Điều chỉnh giá
                            <input className="form-input form-input-compact" type="number"
                                value={form.adjustment || ''} onChange={e => setForm({ ...form, adjustment: parseFloat(e.target.value) || 0 })}
                                style={{ width: 100, display: 'inline-block' }} placeholder="+tăng / -giảm" />
                            <div style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-light)', fontSize: 11 }}>
                                <button type="button" onClick={() => setForm({ ...form, adjustmentType: 'amount' })}
                                    style={{ padding: '2px 8px', border: 'none', cursor: 'pointer', background: form.adjustmentType === 'amount' ? 'var(--primary)' : 'transparent', color: form.adjustmentType === 'amount' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}>đ</button>
                                <button type="button" onClick={() => setForm({ ...form, adjustmentType: 'percent' })}
                                    style={{ padding: '2px 8px', border: 'none', cursor: 'pointer', background: form.adjustmentType === 'percent' ? 'var(--primary)' : 'transparent', color: form.adjustmentType === 'percent' ? '#fff' : 'var(--text-secondary)', fontWeight: 600 }}>%</button>
                            </div>
                        </span>
                        <span className="quotation-summary-value" style={{ color: adjustmentAmount > 0 ? 'var(--status-success)' : adjustmentAmount < 0 ? 'var(--status-danger)' : '' }}>
                            {adjustmentAmount >= 0 ? '+' : ''}{fmt(adjustmentAmount)} đ
                        </span>
                    </div>
                    <div className="quotation-summary-row quotation-summary-subtotal">
                        <span>Tổng cộng</span><span className="quotation-summary-value">{fmt(total)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span>Chiết khấu <input className="form-input form-input-compact" type="number"
                            value={form.discount || ''} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                            style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                        <span className="quotation-summary-value" style={{ color: 'var(--status-danger)' }}>-{fmt(discountAmount)} đ</span>
                    </div>
                    <div className="quotation-summary-row">
                        <span>Thuế VAT <input className="form-input form-input-compact" type="number"
                            value={form.vat ?? ''} onChange={e => setForm({ ...form, vat: parseFloat(e.target.value) || 0 })}
                            style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                        <span className="quotation-summary-value" style={{ color: 'var(--status-success)' }}>+{fmt(vatAmount)} đ</span>
                    </div>

                    {/* ====== DEDUCTIONS / PROMOTIONS ====== */}
                    {deductions.length > 0 && (
                        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '8px 0', paddingTop: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--primary)' }}>🎁 Ưu đãi & Giảm trừ</div>
                            {deductions.map((d, idx) => (
                                <div key={d._key || idx} className="quotation-summary-row" style={{ alignItems: 'center' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, fontWeight: 600, background: d.type === 'khuyến mại' ? 'rgba(22,163,74,0.1)' : 'rgba(234,179,8,0.1)', color: d.type === 'khuyến mại' ? '#16a34a' : '#b45309' }}>
                                            {d.type === 'khuyến mại' ? '🎁 KM' : '📉 GT'}
                                        </span>
                                        {d.type === 'giảm trừ' ? (
                                            <select className="form-select form-input-compact" value={d.name}
                                                onChange={e => updateDeduction(idx, 'name', e.target.value)}
                                                style={{ flex: 1, fontSize: 12 }}>
                                                <option value="">-- Chọn --</option>
                                                {DEDUCTION_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                                                <option value="__custom">Tùy chỉnh...</option>
                                            </select>
                                        ) : (
                                            <div style={{ flex: 1, position: 'relative' }}>
                                                <input className="form-input form-input-compact" value={promoIdx === idx ? promoSearch : d.name}
                                                    placeholder="Tìm sản phẩm..."
                                                    ref={promoIdx === idx ? promoRef : null}
                                                    onFocus={() => { setPromoIdx(idx); setPromoSearch(d.name || ''); }}
                                                    onChange={e => { setPromoSearch(e.target.value); setPromoIdx(idx); }}
                                                    style={{ fontSize: 12 }} />
                                                {promoIdx === idx && promoResults.length > 0 && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 6, maxHeight: 200, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                                        {promoResults.map(p => (
                                                            <div key={p.id} onClick={() => selectPromoProduct(p, idx)}
                                                                style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                                <span>{p.name}</span>
                                                                <span style={{ opacity: 0.5 }}>{fmt(p.salePrice)}đ</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <input className="form-input form-input-compact" type="number" value={d.amount || ''}
                                            onChange={e => updateDeduction(idx, 'amount', parseFloat(e.target.value) || 0)}
                                            style={{ width: 100, fontSize: 12 }} placeholder="Số tiền" />
                                        <button className="btn btn-ghost" onClick={() => removeDeduction(idx)} style={{ padding: '2px 6px', fontSize: 11 }}>✕</button>
                                    </span>
                                    <span className="quotation-summary-value" style={{ color: 'var(--status-danger)' }}>-{fmt(d.amount)} đ</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addDeduction('khuyến mại')} style={{ fontSize: 11 }}>🎁 + Khuyến mại SP</button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => addDeduction('giảm trừ')} style={{ fontSize: 11 }}>📉 + Giảm trừ</button>
                    </div>

                    {totalDeductions > 0 && (
                        <div className="quotation-summary-row" style={{ marginTop: 4 }}>
                            <span style={{ fontStyle: 'italic', fontSize: 12 }}>Tổng ưu đãi</span>
                            <span className="quotation-summary-value" style={{ color: 'var(--status-danger)' }}>-{fmt(totalDeductions)} đ</span>
                        </div>
                    )}

                    <div className="quotation-summary-row quotation-summary-grand">
                        <span>TỔNG GIÁ TRỊ BÁO GIÁ</span><span className="quotation-summary-value">{fmt(grandTotal)} đ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
