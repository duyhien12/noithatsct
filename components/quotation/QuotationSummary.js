'use client';
import { fmt } from '@/lib/quotation-constants';

export default function QuotationSummary({ hook }) {
    const {
        form, setForm,
        directCost, managementFee, adjustmentAmount, total,
        discountAmount, vatAmount, grandTotal,
    } = hook;

    const isInterior = (form.type || '').includes('Nội thất') || (form.type || '').includes('nội thất');

    return (
        <div className="card">
            <div className="card-header"><h3>Tổng kết báo giá</h3></div>
            <div className="card-body">
                <div className="quotation-summary-grid">
                    {/* Chi phí trực tiếp - always show */}
                    <div className="quotation-summary-row">
                        <span>{isInterior ? 'Tổng sản phẩm nội thất' : 'Chi phí trực tiếp'}</span>
                        <span className="quotation-summary-value">{fmt(directCost)} đ</span>
                    </div>

                    {/* Phí quản lý - show for construction types */}
                    <div className="quotation-summary-row">
                        <span>Phí quản lý <input className="form-input form-input-compact" type="number"
                            value={form.managementFeeRate || ''} onChange={e => setForm({ ...form, managementFeeRate: parseFloat(e.target.value) || 0 })}
                            style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                        <span className="quotation-summary-value">{fmt(managementFee)} đ</span>
                    </div>

                    {/* Chi phí vận chuyển, lắp đặt (was: Chi phí khác) */}
                    <div className="quotation-summary-row">
                        <span>Chi phí vận chuyển, lắp đặt <input className="form-input form-input-compact" type="number"
                            value={form.otherFee || ''} onChange={e => setForm({ ...form, otherFee: parseFloat(e.target.value) || 0 })}
                            style={{ width: 100, display: 'inline-block', marginLeft: 6 }} /></span>
                        <span className="quotation-summary-value">{fmt(form.otherFee)} đ</span>
                    </div>

                    {/* Điều chỉnh giá */}
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
                            {form.adjustmentType === 'percent' && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>tính theo %</span>}
                        </span>
                        <span className="quotation-summary-value" style={{ color: adjustmentAmount > 0 ? 'var(--status-success)' : adjustmentAmount < 0 ? 'var(--status-danger)' : '' }}>
                            {adjustmentAmount >= 0 ? '+' : ''}{fmt(adjustmentAmount)} đ
                        </span>
                    </div>

                    {/* Tổng cộng */}
                    <div className="quotation-summary-row quotation-summary-subtotal">
                        <span>Tổng cộng</span><span className="quotation-summary-value">{fmt(total)} đ</span>
                    </div>

                    {/* Chiết khấu */}
                    <div className="quotation-summary-row">
                        <span>Chiết khấu <input className="form-input form-input-compact" type="number"
                            value={form.discount || ''} onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                            style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%</span>
                        <span className="quotation-summary-value" style={{ color: 'var(--status-danger)' }}>-{fmt(discountAmount)} đ</span>
                    </div>

                    {/* VAT */}
                    <div className="quotation-summary-row">
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            VAT <input className="form-input form-input-compact" type="number"
                                value={form.vat || ''} onChange={e => setForm({ ...form, vat: parseFloat(e.target.value) || 0 })}
                                style={{ width: 50, display: 'inline-block', margin: '0 4px' }} />%
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>(Đơn giá đã bao gồm VAT)</span>
                        </span>
                        <span className="quotation-summary-value">{fmt(vatAmount)} đ</span>
                    </div>

                    {/* TỔNG */}
                    <div className="quotation-summary-row quotation-summary-grand">
                        <span>TỔNG GIÁ TRỊ BÁO GIÁ</span><span className="quotation-summary-value">{fmt(grandTotal)} đ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
