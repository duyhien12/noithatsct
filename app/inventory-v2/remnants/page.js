'use client';
import { useEffect, useState, useCallback } from 'react';

const STATUS_LABEL = { USABLE: 'Có thể dùng', HELD: 'Đã giữ', USED: 'Đã sử dụng', PENDING_REVIEW: 'Chờ xử lý', SCRAP: 'Phế liệu' };
const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN');

export default function RemnantsPage() {
    const [remnants, setRemnants] = useState([]);
    const [parentMaterials, setParentMaterials] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [status, setStatus] = useState('USABLE');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ parentMaterialId: '', warehouseId: '', length: '', width: '', thickness: '', value: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchRemnants = useCallback(async () => {
        const p = new URLSearchParams(); if (status) p.set('status', status);
        const res = await fetch(`/api/inventory-v2/remnants?${p}`);
        const d = await res.json();
        setRemnants(d.data || []);
    }, [status]);

    useEffect(() => { fetchRemnants(); }, [fetchRemnants]);
    useEffect(() => {
        fetch('/api/inventory-v2/materials?limit=1000').then(r => r.json()).then(d => setParentMaterials(d.data || []));
        fetch('/api/inventory-v2/warehouses').then(r => r.json()).then(d => setWarehouses(d.data || []));
    }, []);

    const handleSave = async () => {
        setError('');
        if (!form.parentMaterialId || !form.warehouseId || !form.length || !form.width) { setError('Thiếu loại ván gốc, kho hoặc kích thước'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/inventory-v2/remnants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi lưu ván thừa');
            setShowModal(false); setForm({ parentMaterialId: '', warehouseId: '', length: '', width: '', thickness: '', value: '' }); fetchRemnants();
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ margin: 0 }}>Ván thừa & vật tư thừa</h3>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nhập ván thừa</button>
            </div>
            <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">Tất cả</option>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 12 }}>
                {remnants.map(r => (
                    <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>{r.remnantCode}</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>{r.parentMaterial?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.parentMaterial?.brand} · {r.parentMaterial?.colorCode}</div>
                        <div style={{ fontSize: 13, marginTop: 6 }}>{r.length} × {r.width} mm · {r.usableAreaM2?.toFixed(2)} m²</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>🏭 {r.warehouse?.name} · 📅 {fmtDate(r.returnedAt)}</div>
                        {r.sourceProject && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🗂 {r.sourceProject.name}</div>}
                        <span className="badge badge-info" style={{ marginTop: 8 }}>{STATUS_LABEL[r.status]}</span>
                    </div>
                ))}
                {remnants.length === 0 && <div style={{ padding: 24, color: 'var(--text-muted)' }}>Chưa có ván thừa</div>}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header"><h3>Nhập ván thừa vào kho</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Loại ván gốc *</label>
                                <select className="form-select" value={form.parentMaterialId} onChange={e => setForm(f => ({ ...f, parentMaterialId: e.target.value }))}>
                                    <option value="">— Chọn —</option>
                                    {parentMaterials.map(m => <option key={m.id} value={m.id}>{m.sku} — {m.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kho *</label>
                                <select className="form-select" value={form.warehouseId} onChange={e => setForm(f => ({ ...f, warehouseId: e.target.value }))}>
                                    <option value="">— Chọn —</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Dài còn lại (mm) *</label><input className="form-input" type="number" value={form.length} onChange={e => setForm(f => ({ ...f, length: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">Rộng còn lại (mm) *</label><input className="form-input" type="number" value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Giá trị ước tính (đ)</label><input className="form-input" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
                        </div>
                        {error && <div style={{ padding: '6px 20px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
