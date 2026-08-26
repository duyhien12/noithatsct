'use client';
import { useEffect, useState, useCallback } from 'react';

const fmtDate = (d) => new Date(d).toLocaleString('vi-VN');
const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

export default function ReportsPage() {
    const [rows, setRows] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [warehouseId, setWarehouseId] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 300 });
        if (warehouseId) p.set('warehouseId', warehouseId);
        const res = await fetch(`/api/inventory-v2/reports/ledger?${p}`);
        const d = await res.json();
        setRows(d.data || []);
        setLoading(false);
    }, [warehouseId]);

    useEffect(() => { fetchRows(); }, [fetchRows]);
    useEffect(() => { fetch('/api/inventory-v2/warehouses').then(r => r.json()).then(d => setWarehouses(d.data || [])); }, []);

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const data = rows.map(r => ({
            'Thời gian': fmtDate(r.postedAt), 'Phiếu': r.document?.code, 'Loại phiếu': r.document?.docType,
            'Vật tư': `${r.material?.sku} — ${r.material?.name}`, 'Kho': r.warehouse?.name,
            'Loại': r.direction === 'IN' ? 'Nhập' : 'Xuất', 'Số lượng': r.quantity,
            ...(r.unitCostAtPosting !== undefined ? { 'Đơn giá': r.unitCostAtPosting, 'Thành tiền': r.amount } : {}),
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'So kho');
        XLSX.writeFile(wb, `so-kho-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const canViewCost = rows.length === 0 || rows[0].unitCostAtPosting !== undefined;

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ margin: 0 }}>Báo cáo & lịch sử kho (sổ giao dịch kho)</h3>
                <button className="btn btn-ghost" onClick={exportExcel}>📥 Export Excel</button>
            </div>
            <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                    <option value="">Tất cả kho</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Thời gian</th><th>Phiếu</th><th>Vật tư</th><th>Kho</th><th>Loại</th><th style={{ textAlign: 'right' }}>SL</th>{canViewCost && <><th style={{ textAlign: 'right' }}>Đơn giá</th><th style={{ textAlign: 'right' }}>Thành tiền</th></>}<th style={{ textAlign: 'right' }}>Tồn sau GD</th></tr></thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id}>
                                    <td style={{ fontSize: 12 }}>{fmtDate(r.postedAt)}</td>
                                    <td className="accent" style={{ fontSize: 12 }}>{r.document?.code}</td>
                                    <td className="primary" style={{ fontSize: 13 }}>{r.material?.sku} — {r.material?.name}</td>
                                    <td style={{ fontSize: 12 }}>{r.warehouse?.name}</td>
                                    <td><span className={`badge ${r.direction === 'IN' ? 'badge-success' : 'badge-warning'}`}>{r.direction === 'IN' ? 'Nhập' : 'Xuất'}</span></td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.direction === 'IN' ? '+' : '-'}{fmtNum(r.quantity)}</td>
                                    {canViewCost && <><td style={{ textAlign: 'right' }}>{fmt(r.unitCostAtPosting)}</td><td style={{ textAlign: 'right' }}>{fmt(r.amount)}</td></>}
                                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{fmtNum(r.balanceQtyAfter)}</td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chưa có giao dịch</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
