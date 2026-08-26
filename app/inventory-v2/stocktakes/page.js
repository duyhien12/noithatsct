'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const STATUS_LABEL = { DRAFT: 'Nháp', COUNTING: 'Đang đếm', PENDING_APPROVAL: 'Chờ duyệt', APPROVED: 'Đã duyệt', CANCELLED: 'Đã hủy' };

export default function StocktakesPage() {
    const [stocktakes, setStocktakes] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [warehouseId, setWarehouseId] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchList = useCallback(async () => {
        const res = await fetch('/api/inventory-v2/stocktakes');
        const d = await res.json();
        setStocktakes(d.data || []);
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);
    useEffect(() => { fetch('/api/inventory-v2/warehouses').then(r => r.json()).then(d => setWarehouses(d.data || [])); }, []);

    const handleCreate = async () => {
        if (!warehouseId) return;
        setSaving(true);
        try {
            const res = await fetch('/api/inventory-v2/stocktakes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ warehouseId }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error);
            setShowModal(false); fetchList();
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ margin: 0 }}>Kiểm kê kho</h3>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tạo phiếu kiểm kê</button>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead><tr><th>Số phiếu</th><th>Kho</th><th>Số dòng</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                        {stocktakes.map(s => (
                            <tr key={s.id}>
                                <td className="accent"><Link href={`/inventory-v2/stocktakes/${s.id}`}>{s.code}</Link></td>
                                <td>{s.warehouse?.name}</td>
                                <td style={{ textAlign: 'center' }}>{s._count?.lines ?? 0}</td>
                                <td><span className="badge badge-info">{STATUS_LABEL[s.status]}</span></td>
                            </tr>
                        ))}
                        {stocktakes.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chưa có phiếu kiểm kê</td></tr>}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header"><h3>Tạo phiếu kiểm kê</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Kho *</label>
                                <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                                    <option value="">— Chọn kho —</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" disabled={saving} onClick={handleCreate}>Tạo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
