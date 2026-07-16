'use client';
import { useState } from 'react';
import { Plus, Package } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function OrderPackingTab({ order, perms, onChanged }) {
    const toast = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState({}); // itemId -> quantity
    const [packageType, setPackageType] = useState('');
    const [note, setNote] = useState('');

    const packableItems = (order.items || []).filter(it => it.status === 'PASSED_QC');
    const records = order.packingRecords || [];

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
        if (items.length === 0) { toast.error('Chọn ít nhất 1 sản phẩm đạt QC để đóng gói'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/manufacturing/packing', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mfgOrderId: order.id, packageType, note, items }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi đóng gói');
            toast.success(`Đã tạo kiện đóng gói ${d.code}`);
            setShowCreate(false); setSelected({}); setPackageType(''); setNote('');
            onChanged();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '14px 18px' }}>
                <span className="card-title">Đóng gói ({records.length})</span>
                {perms.pack && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Đóng gói</button>}
            </div>
            {records.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Package size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                    <p>Chưa có kiện đóng gói nào.</p>
                    {packableItems.length === 0 && <p style={{ fontSize: 12 }}>Cần có sản phẩm đạt QC trước khi đóng gói.</p>}
                </div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Mã kiện</th><th>Loại kiện</th><th>Số sản phẩm</th><th>SL</th><th>Đóng gói lúc</th></tr></thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 600 }}>{r.code}</td>
                                    <td>{r.packageType || '—'}</td>
                                    <td>{r.items?.map(i => i.item?.code).join(', ')}</td>
                                    <td>{r.quantity}</td>
                                    <td>{new Date(r.packedAt).toLocaleString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Đóng gói sản phẩm">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {packableItems.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có sản phẩm nào đạt QC để đóng gói.</div>
                    ) : (
                        <div>
                            <label className="form-label">Chọn sản phẩm đạt QC</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, padding: 8 }}>
                                {packableItems.map(it => (
                                    <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                        <input type="checkbox" checked={selected[it.id] !== undefined} onChange={() => toggleItem(it)} />
                                        {it.code} — {it.name} ({it.quantity} {it.unit})
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="form-group"><label className="form-label">Loại kiện</label><input className="form-input" value={packageType} onChange={e => setPackageType(e.target.value)} placeholder="VD: Thùng carton, kiện gỗ..." /></div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Đang lưu...' : 'Xác nhận đóng gói'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
