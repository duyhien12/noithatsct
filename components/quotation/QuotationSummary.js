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
        paymentSchedule, setPaymentSchedule,
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
                    {grandTotal >= 999999 && (
                        <div className="quotation-summary-row quotation-summary-grand" style={{ marginTop: 4, opacity: 0.85 }}>
                            <span>TỔNG GIÁ TRỊ BÁO GIÁ LÀM TRÒN</span>
                            <span className="quotation-summary-value">{fmt(Math.floor(grandTotal / 1000000) * 1000000)} đ</span>
                        </div>
                    )}
                </div>

                {/* ====== LỊCH THANH TOÁN ====== */}
                <div style={{ marginTop: 20, borderTop: '2px solid var(--border-color)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>LỊCH THANH TOÁN</div>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                            onClick={() => setPaymentSchedule([...paymentSchedule, { desc: 'Đợt thanh toán mới', pct: 0 }])}>
                            + Thêm đợt
                        </button>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                                <th style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600 }}>Nội dung</th>
                                <th style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, width: 80 }}>Tỷ lệ</th>
                                <th style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, width: 130 }}>Thành tiền</th>
                                <th style={{ width: 30 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentSchedule.map((row, i) => {
                                const amount = grandTotal * row.pct / 100;
                                return (
                                    <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-alt, #f8fafc)' : '' }}>
                                        <td style={{ padding: '5px 8px' }}>
                                            <input className="form-input form-input-compact" value={row.desc}
                                                onChange={e => {
                                                    const updated = [...paymentSchedule];
                                                    updated[i] = { ...updated[i], desc: e.target.value };
                                                    setPaymentSchedule(updated);
                                                }}
                                                style={{ width: '100%', fontSize: 12 }} />
                                        </td>
                                        <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                                <input className="form-input form-input-compact" type="number" min="0" max="100"
                                                    value={row.pct}
                                                    onChange={e => {
                                                        const updated = [...paymentSchedule];
                                                        updated[i] = { ...updated[i], pct: parseFloat(e.target.value) || 0 };
                                                        setPaymentSchedule(updated);
                                                    }}
                                                    style={{ width: 55, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--primary)' }} />
                                                <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                            {fmt(amount)} đ
                                        </td>
                                        <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                            <button type="button" className="btn btn-ghost" style={{ padding: '1px 5px', fontSize: 11 }}
                                                onClick={() => setPaymentSchedule(paymentSchedule.filter((_, j) => j !== i))}>
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr style={{ background: 'var(--primary)', color: '#fff', fontWeight: 700 }}>
                                <td style={{ padding: '7px 10px' }}>TỔNG CỘNG</td>
                                <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                    {paymentSchedule.reduce((s, r) => s + r.pct, 0)}%
                                </td>
                                <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmt(grandTotal)} đ</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
