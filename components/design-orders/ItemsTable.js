'use client';
import { calcItemAmount, calcSubtotal } from '@/lib/designOrderCalc';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

export default function ItemsTable({ items, onChange, priceList = [] }) {
    const updateRow = (idx, field, value) => {
        onChange(items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
    };

    const addRow = () => {
        onChange([...items, { name: '', unit: '', quantity: 0, unitPrice: 0, note: '' }]);
    };

    const addFromPriceList = (priceItemId) => {
        const p = priceList.find(p => p.id === priceItemId);
        if (!p) return;
        onChange([...items, { name: p.name, unit: p.unit, quantity: 1, unitPrice: p.defaultUnitPrice || 0, note: '' }]);
    };

    const removeRow = (idx) => {
        onChange(items.filter((_, i) => i !== idx));
    };

    const subtotal = calcSubtotal(items);

    return (
        <div className="card-body" style={{ padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
                {priceList.length > 0 && (
                    <select className="form-select" style={{ maxWidth: 280 }} value="" onChange={e => e.target.value && addFromPriceList(e.target.value)}>
                        <option value="">➕ Thêm nhanh từ bảng đơn giá...</option>
                        {priceList.filter(p => p.active !== false).map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                        ))}
                    </select>
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addRow}>➕ Thêm dòng</button>
            </div>
            <table className="data-table" style={{ margin: 0 }}>
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>STT</th>
                        <th>Hạng mục công việc</th>
                        <th style={{ width: 90 }}>Đơn vị</th>
                        <th style={{ width: 100 }}>Khối lượng</th>
                        <th style={{ width: 130 }}>Đơn giá</th>
                        <th style={{ width: 140, textAlign: 'right' }}>Thành tiền</th>
                        <th>Ghi chú</th>
                        <th style={{ width: 40 }}></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((it, idx) => (
                        <tr key={idx}>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td>
                                <input className="form-input form-input-compact" value={it.name}
                                    onChange={e => updateRow(idx, 'name', e.target.value)}
                                    placeholder="Tên hạng mục" style={{ width: '100%' }} />
                            </td>
                            <td>
                                <input className="form-input form-input-compact" value={it.unit}
                                    onChange={e => updateRow(idx, 'unit', e.target.value)}
                                    placeholder="m2/lần..." style={{ width: '100%' }} />
                            </td>
                            <td>
                                <input className="form-input form-input-compact" type="number" min="0" value={it.quantity || ''}
                                    onChange={e => updateRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                    style={{ width: '100%', textAlign: 'right' }} />
                            </td>
                            <td>
                                <input className="form-input form-input-compact" type="number" min="0" value={it.unitPrice || ''}
                                    onChange={e => updateRow(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                    style={{ width: '100%', textAlign: 'right' }} />
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                {fmt(calcItemAmount(it.quantity, it.unitPrice))}
                            </td>
                            <td>
                                <input className="form-input form-input-compact" value={it.note}
                                    onChange={e => updateRow(idx, 'note', e.target.value)}
                                    placeholder="Ghi chú" style={{ width: '100%' }} />
                            </td>
                            <td>
                                <button type="button" className="btn btn-ghost" onClick={() => removeRow(idx)}
                                    style={{ padding: '2px 6px', fontSize: 11, color: 'var(--status-danger)' }}>✕</button>
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Chưa có hạng mục nào — bấm &quot;Thêm dòng&quot; để bắt đầu</td></tr>
                    )}
                    <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                        <td colSpan={5} style={{ textAlign: 'right' }}>Tổng trước giảm giá</td>
                        <td style={{ textAlign: 'right', color: 'var(--primary)' }}>{fmt(subtotal)}</td>
                        <td colSpan={2}></td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
