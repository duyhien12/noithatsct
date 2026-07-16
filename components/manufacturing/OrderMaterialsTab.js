'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { MATERIAL_REQ_STATUSES, MATERIAL_REQ_STATUS_LABELS } from '@/lib/manufacturing/constants';

export default function OrderMaterialsTab({ order, perms, onChanged }) {
    const toast = useToast();
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ mfgItemId: '', materialName: '', specification: '', unit: '', estimatedQuantity: '', requiredDate: '' });

    async function handleCreate() {
        if (!form.materialName.trim()) { toast.error('Nhập tên vật tư'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/manufacturing/materials', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, mfgOrderId: order.id, mfgItemId: form.mfgItemId || undefined, estimatedQuantity: Number(form.estimatedQuantity) || 0 }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi thêm nhu cầu vật tư');
            toast.success('Đã thêm nhu cầu vật tư');
            setShowCreate(false);
            setForm({ mfgItemId: '', materialName: '', specification: '', unit: '', estimatedQuantity: '', requiredDate: '' });
            onChanged();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    async function updateStatus(id, status) {
        const res = await fetch(`/api/manufacturing/materials/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        const d = await res.json();
        if (!res.ok) { toast.error(d.error || 'Lỗi cập nhật'); return; }
        toast.success('Đã cập nhật trạng thái vật tư');
        onChanged();
    }

    const reqs = order.materialReqs || [];

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: '14px 18px' }}>
                <span className="card-title">Vật tư sản xuất ({reqs.length})</span>
                {perms.manage_material && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><Plus size={14} /> Thêm nhu cầu vật tư</button>}
            </div>
            {reqs.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có nhu cầu vật tư nào.</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Vật tư</th><th>Quy cách</th><th>SL cần</th><th>Đã cấp</th><th>Đã dùng</th><th>Thiếu</th><th>Trạng thái</th>{perms.manage_material && <th />}</tr></thead>
                        <tbody>
                            {reqs.map(r => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 600 }}>{r.materialName || r.product?.name}</td>
                                    <td>{r.specification}</td>
                                    <td>{r.estimatedQuantity} {r.unit}</td>
                                    <td>{r.issuedQuantity}</td>
                                    <td>{r.usedQuantity}</td>
                                    <td style={{ color: r.missingQuantity > 0 ? '#dc2626' : undefined }}>{r.missingQuantity || '—'}</td>
                                    <td><span className="badge">{MATERIAL_REQ_STATUS_LABELS[r.status] || r.status}</span></td>
                                    {perms.manage_material && (
                                        <td>
                                            <select className="form-input" style={{ padding: '4px 8px', fontSize: 12 }} value={r.status} onChange={e => updateStatus(r.id, e.target.value)}>
                                                {MATERIAL_REQ_STATUSES.map(s => <option key={s} value={s}>{MATERIAL_REQ_STATUS_LABELS[s]}</option>)}
                                            </select>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Thêm nhu cầu vật tư">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Sản phẩm liên quan</label>
                        <select className="form-input" value={form.mfgItemId} onChange={e => setForm(f => ({ ...f, mfgItemId: e.target.value }))}>
                            <option value="">-- Không gắn sản phẩm cụ thể --</option>
                            {(order.items || []).map(it => <option key={it.id} value={it.id}>{it.code} — {it.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Tên vật tư *</label><input className="form-input" value={form.materialName} onChange={e => setForm(f => ({ ...f, materialName: e.target.value }))} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group"><label className="form-label">Quy cách</label><input className="form-input" value={form.specification} onChange={e => setForm(f => ({ ...f, specification: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Đơn vị</label><input className="form-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Số lượng cần</label><input type="number" className="form-input" value={form.estimatedQuantity} onChange={e => setForm(f => ({ ...f, estimatedQuantity: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Ngày cần</label><input type="date" className="form-input" value={form.requiredDate} onChange={e => setForm(f => ({ ...f, requiredDate: e.target.value }))} /></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Hủy</button>
                        <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
