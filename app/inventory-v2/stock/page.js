'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtNum = (n) => n == null ? '—' : new Intl.NumberFormat('vi-VN').format(n);

function StockPageInner() {
    const searchParams = useSearchParams();
    const [data, setData] = useState({ data: [] });
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState(searchParams.get('filter') || '');
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState('');

    const fetchStock = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams();
        if (q) p.set('q', q);
        if (filter) p.set('filter', filter);
        if (categoryId) p.set('categoryId', categoryId);
        const res = await fetch(`/api/inventory-v2/stock?${p}`);
        setData(await res.json());
        setLoading(false);
    }, [q, filter, categoryId]);

    useEffect(() => { fetchStock(); }, [fetchStock]);
    useEffect(() => { fetch('/api/inventory-v2/categories').then(r => r.json()).then(d => setCategories(d.data || [])); }, []);

    const rows = data.data || [];
    const canViewCost = rows.length === 0 || rows[0].stockValue !== undefined;

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ margin: 0 }}>Tồn kho hiện tại</h3>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {data.totalSku ?? rows.length} SKU {canViewCost && data.totalValue !== undefined && <>· {fmt(data.totalValue)}</>}
                    {data.reorderCount > 0 && <span style={{ color: '#dc2626', marginLeft: 8 }}>🚨 {data.reorderCount} cần đặt lại</span>}
                </div>
            </div>
            <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)', gap: 8, flexWrap: 'wrap' }}>
                <input className="form-input" placeholder="🔍 Mã, tên, mã màu..." value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
                <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ minWidth: 180 }}>
                    <option value="">Tất cả nhóm</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ minWidth: 160 }}>
                    <option value="">Tất cả</option>
                    <option value="reorder">🚨 Cần đặt lại</option>
                    <option value="low">⚠️ Sắp hết</option>
                    <option value="idle">🕒 Không phát sinh lâu</option>
                </select>
            </div>
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã</th><th>Tên SP</th><th>Nhóm</th><th>Kho</th><th>ĐVT</th>
                                <th style={{ textAlign: 'right' }}>Tồn thực tế</th><th style={{ textAlign: 'right' }}>Đã giữ</th>
                                <th style={{ textAlign: 'right' }}>Khả dụng</th><th style={{ textAlign: 'right' }}>Cần mua</th>
                                {canViewCost && <th style={{ textAlign: 'right' }}>Giá trị</th>}
                                <th style={{ textAlign: 'center' }}>Không phát sinh</th><th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={`${r.materialId}_${r.warehouseId}`} style={{ background: r.status === 'HET_HANG' ? 'rgba(239,68,68,0.05)' : r.needsReorder ? 'rgba(245,158,11,0.05)' : undefined }}>
                                    <td className="accent">{r.sku}</td>
                                    <td className="primary">{r.name}{r.colorCode && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {r.colorCode}</span>}</td>
                                    <td style={{ fontSize: 12 }}>{r.category?.name}</td>
                                    <td style={{ fontSize: 12 }}>{r.warehouse?.name}</td>
                                    <td style={{ fontSize: 12 }}>{r.unit?.code}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmtNum(r.onHandQty)}</td>
                                    <td style={{ textAlign: 'right', color: r.reservedQty > 0 ? '#2563eb' : '#9ca3af' }}>{fmtNum(r.reservedQty)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600, color: r.availableQty <= 0 ? '#dc2626' : '#16a34a' }}>{fmtNum(r.availableQty)}</td>
                                    <td style={{ textAlign: 'right', color: r.toPurchase > 0 ? '#dc2626' : undefined }}>{r.toPurchase > 0 ? fmtNum(r.toPurchase) : '—'}</td>
                                    {canViewCost && <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.stockValue)}</td>}
                                    <td style={{ textAlign: 'center', fontSize: 12 }}>{r.daysSinceLastMovement != null ? `${r.daysSinceLastMovement} ngày` : '—'}</td>
                                    <td>
                                        <span className={`badge ${r.status === 'HET_HANG' ? 'badge-danger' : r.needsReorder ? 'badge-warning' : 'badge-success'}`}>
                                            {r.status === 'HET_HANG' ? 'Hết hàng' : r.needsReorder ? 'Cần đặt lại' : 'Bình thường'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function StockPage() {
    return <Suspense fallback={null}><StockPageInner /></Suspense>;
}
