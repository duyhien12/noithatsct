'use client';
import { useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function OrderDeliveryTab({ order, perms, onChanged }) {
    const toast = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState({}); // itemId -> quantity
    const [form, setForm] = useState({ vehicleNumber: '', driverName: '', driverPhone: '', deliveryContactName: '', deliveryContactPhone: '', note: '' });

    const deliverableItems = (order.items || []).filter(it => it.status === 'PACKED');
    const records = order.deliveryRecords || [];

    function toggleItem(item) {
        setSelected(prev => {
            const next = { ...prev };
            if (next[item.id] !== undefined) delete next[item.id];
            else next[item.id] = item.quantity;
            return next;
        });
    }

    async function handleCreate() {
        const items = Object.entries(selected).map(([mfgItemId, quantity]) => ({ mfgItemId, quantity: Number(quantity) || 1 }));
        if (items.length === 0) { toast.error('Chọn ít nhất 1 sản phẩm đã đóng gói'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/manufacturing/delivery', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mfgOrderId: order.id, ...form, items }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi lập chuyến giao hàng');
            toast.success(`Đã tạo chuyến giao ${d.code}`);
            setShowCreate(false); setSelected({}); setForm({ vehicleNumber: '', driverName: '', driverPhone: '', deliveryContactName: '', deliveryContactPhone: '', note: '' });
            onChanged();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '14px 18px' }}>
                <span className="card-title">Vận chuyển ({records.length})</span>
                {perms.deliver && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Lập chuyến giao hàng</button>}
            </div>
            {records.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Truck size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p>Chưa có chuyến giao hàng nào.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Mã chuyến</th><th>Xe</th><th>Tài xế</th><th>Trạng thái</th><th>Ngày giao</th></tr></thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 600 }}>{r.code}</td>
                                    <td>{r.vehicleNumber || '—'}</td>
                                    <td>{r.driverName || '—'}</td>
                                    <td><span className="badge">{r.status}</span></td>
                                    <td>{new Date(r.deliveryDate).toLocaleDateString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Lập chuyến giao hàng">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {deliverableItems.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có sản phẩm nào đã đóng gói để giao.</div>
                    ) : (
                        <div>
                            <label className="form-label">Chọn sản phẩm đã đóng gói</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, padding: 8 }}>
                                {deliverableItems.map(it => (
                                    <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                        <input type="checkbox" checked={selected[it.id] !== undefined} onChange={() => toggleItem(it)} />
                                        {it.code} — {it.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group"><label className="form-label">Biển số xe</label><input className="form-input" value={form.vehicleNumber} onChange={e => setForm(f => ({ ...f, vehicleNumber: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Tài xế</label><input className="form-input" value={form.driverName} onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">SĐT tài xế</label><input className="form-input" value={form.driverPhone} onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Người nhận tại công trình</label><input className="form-input" value={form.deliveryContactName} onChange={e => setForm(f => ({ ...f, deliveryContactName: e.target.value }))} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Đang lưu...' : 'Xác nhận giao hàng'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
