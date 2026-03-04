'use client';
import { useState } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

const STATUS_MAP = {
    pending_technical: { label: 'Chờ KT xác nhận', color: '#f59e0b', icon: '🔧' },
    pending_accounting: { label: 'Chờ đối soát', color: '#3b82f6', icon: '📋' },
    approved: { label: 'Đã duyệt', color: '#8b5cf6', icon: '✅' },
    paid: { label: 'Đã thanh toán', color: '#10b981', icon: '💰' },
    rejected: { label: 'Từ chối', color: '#ef4444', icon: '❌' },
};

export default function MeasurementSheet({ projectId, contractorId, contractorName, onSaved, onClose }) {
    const [phase, setPhase] = useState('');
    const [description, setDescription] = useState('');
    const [items, setItems] = useState([{ description: '', unit: '', quantity: 0, unitPrice: 0, amount: 0, notes: '' }]);
    const [saving, setSaving] = useState(false);

    const updateItem = (i, field, value) => {
        setItems(prev => {
            const next = [...prev];
            next[i] = { ...next[i], [field]: value };
            if (field === 'quantity' || field === 'unitPrice') {
                next[i].amount = (parseFloat(next[i].quantity) || 0) * (parseFloat(next[i].unitPrice) || 0);
            }
            return next;
        });
    };

    const addRow = () => setItems(prev => [...prev, { description: '', unit: '', quantity: 0, unitPrice: 0, amount: 0, notes: '' }]);
    const removeRow = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

    const total = items.reduce((s, i) => s + (i.amount || 0), 0);

    const handleSave = async () => {
        const validItems = items.filter(i => i.description?.trim() && i.quantity > 0);
        if (validItems.length === 0) return alert('Cần ít nhất 1 dòng hợp lệ');
        setSaving(true);
        try {
            const res = await fetch('/api/contractor-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractorId,
                    projectId,
                    contractAmount: total,
                    netAmount: total,
                    phase,
                    description,
                    status: 'pending_technical',
                    items: validItems.map(i => ({
                        description: i.description,
                        unit: i.unit,
                        quantity: parseFloat(i.quantity) || 0,
                        unitPrice: parseFloat(i.unitPrice) || 0,
                        amount: (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
                        notes: i.notes || '',
                    })),
                }),
            });
            if (res.ok) {
                onSaved?.();
                onClose?.();
            } else {
                const err = await res.json();
                alert(err.error || 'Lỗi lưu');
            }
        } catch { alert('Lỗi kết nối'); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 900, maxHeight: '90vh', overflow: 'auto' }}>
                <div className="modal-header">
                    <h3 style={{ margin: 0, fontSize: 16 }}>📋 Lập Phiếu Nghiệm Thu — {contractorName}</h3>
                    <button className="btn btn-ghost" onClick={onClose}>✕</button>
                </div>
                <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <input className="form-input" placeholder="Giai đoạn (VD: Đợt 1, Tuần 3)" value={phase}
                            onChange={e => setPhase(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
                        <input className="form-input" placeholder="Mô tả" value={description}
                            onChange={e => setDescription(e.target.value)} style={{ flex: 2, fontSize: 13 }} />
                    </div>

                    {/* Grid table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ fontSize: 12, width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ width: 30 }}>#</th>
                                    <th style={{ textAlign: 'left', minWidth: 200 }}>Nội dung</th>
                                    <th style={{ width: 80 }}>ĐVT</th>
                                    <th style={{ width: 100, textAlign: 'right' }}>KL nghiệm thu</th>
                                    <th style={{ width: 120, textAlign: 'right' }}>Đơn giá</th>
                                    <th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th>
                                    <th style={{ width: 40 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => (
                                    <tr key={i}>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{i + 1}</td>
                                        <td><input className="form-input-compact" value={item.description}
                                            onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Công việc..." style={{ width: '100%' }} /></td>
                                        <td><input className="form-input-compact" value={item.unit}
                                            onChange={e => updateItem(i, 'unit', e.target.value)} placeholder="m²" style={{ width: '100%', textAlign: 'center' }} /></td>
                                        <td><input className="form-input-compact" type="number" value={item.quantity || ''}
                                            onChange={e => updateItem(i, 'quantity', e.target.value)} style={{ width: '100%', textAlign: 'right' }} /></td>
                                        <td><input className="form-input-compact" type="number" value={item.unitPrice || ''}
                                            onChange={e => updateItem(i, 'unitPrice', e.target.value)} style={{ width: '100%', textAlign: 'right' }} /></td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(item.amount)}</td>
                                        <td>
                                            {items.length > 1 && (
                                                <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 4px', color: 'var(--status-danger)' }}
                                                    onClick={() => removeRow(i)}>✕</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <button className="btn btn-ghost btn-sm" onClick={addRow}>+ Thêm dòng</button>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng cộng</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}>{fmt(total)}đ</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                        <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? '⏳ Đang lưu...' : '💾 Lưu phiếu nghiệm thu'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Mini component for approval actions
export function MeasurementActions({ payment, onAction }) {
    const [loading, setLoading] = useState(false);

    const handleApprove = async (action) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/contractor-payments/${payment.id}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, approvedBy: 'Admin' }),
            });
            if (res.ok) onAction?.();
            else {
                const err = await res.json();
                alert(err.error || 'Lỗi');
            }
        } catch { alert('Lỗi kết nối'); }
        setLoading(false);
    };

    const st = STATUS_MAP[payment.status] || { label: payment.status, color: '#888' };

    return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span className="badge" style={{ background: st.color, color: '#fff', fontSize: 10 }}>{st.icon} {st.label}</span>
            {!loading && payment.status === 'pending_technical' && (
                <button className="btn btn-success btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={() => handleApprove('approve_technical')}>KT Duyệt</button>
            )}
            {!loading && payment.status === 'pending_accounting' && (
                <button className="btn btn-info btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={() => handleApprove('approve_accounting')}>KT Đối soát</button>
            )}
            {!loading && payment.status === 'approved' && (
                <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}
                    onClick={() => handleApprove('mark_paid')}>Đã TT</button>
            )}
            {!loading && ['pending_technical', 'pending_accounting'].includes(payment.status) && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px', color: '#ef4444' }}
                    onClick={() => handleApprove('reject')}>Từ chối</button>
            )}
        </div>
    );
}
