'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtNum = (n) => n == null ? '—' : new Intl.NumberFormat('vi-VN').format(n);
/** Phần đuôi tên vật tư: "-mã màu-độ dày", VD AC-333-17. */
const nameSuffix = (r) => [r.colorCode, r.thickness > 0 ? r.thickness : ''].filter(Boolean).map(x => `-${x}`).join('');

/** Hộp thoại Xuất nhanh 1 vật tư: chọn mục đích, số lượng, công trình → ghi sổ ngay (nếu có quyền duyệt). */
function QuickExportModal({ row, projects, onClose, onDone }) {
    const [docType, setDocType] = useState('EXPORT_PROJECT');
    const [docDate, setDocDate] = useState(() => new Date().toLocaleDateString('en-CA'));
    const [quantity, setQuantity] = useState('');
    const [projectId, setProjectId] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        setError('');
        const qty = Number(quantity);
        if (!(qty > 0)) { setError('Nhập số lượng lớn hơn 0'); return; }
        if (qty > row.onHandQty) { setError(`Kho chỉ còn ${fmtNum(row.onHandQty)} ${row.unit?.code || ''}`); return; }
        if (docType === 'EXPORT_PROJECT' && !projectId) { setError('Vui lòng chọn công trình'); return; }
        if (!docDate) { setError('Vui lòng chọn ngày xuất'); return; }
        setSaving(true);
        try {
            const res = await fetch('/api/inventory-v2/quick-export', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docType, materialId: row.materialId, warehouseId: row.warehouseId, quantity: qty, docDate, projectId: projectId || undefined, notes }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi xuất kho');
            onDone(d);
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header"><h3>Xuất kho nhanh</h3><button className="modal-close" onClick={onClose}>×</button></div>
                <div className="modal-body">
                    <div style={{ padding: '10px 12px', background: 'var(--bg-secondary, #f9fafb)', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                        <div><b style={{ color: 'var(--accent-primary)' }}>{row.sku}</b> — {row.name}{nameSuffix(row)}</div>
                        <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{row.warehouse?.name} · Còn trong kho: <b>{fmtNum(row.onHandQty)}</b> {row.unit?.code}</div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Xuất để làm gì?</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[['EXPORT_PROJECT', '🏠 Mang ra công trình'], ['EXPORT_PRODUCTION', '🔨 Xưởng sản xuất']].map(([k, label]) => (
                                <button key={k} type="button" className={`btn ${docType === k ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setDocType(k)}>{label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Số lượng ({row.unit?.code}) *</label>
                            <input className="form-input" type="number" min="0" step="any" autoFocus value={quantity} onChange={e => setQuantity(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày xuất *</label>
                            <input className="form-input" type="date" value={docDate} onChange={e => setDocDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Công trình{docType === 'EXPORT_PROJECT' ? ' *' : ' (nếu có)'}</label>
                        <select className="form-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
                            <option value="">— Chọn công trình —</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <input className="form-input" placeholder="VD: người nhận, hạng mục..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    {error && <div style={{ color: '#dc2626', fontSize: 13 }}>{error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
                    <button className="btn btn-primary" disabled={saving} onClick={handleSubmit}>{saving ? 'Đang xuất...' : 'Xuất kho'}</button>
                </div>
            </div>
        </div>
    );
}

function StockPageInner() {
    const searchParams = useSearchParams();
    const [data, setData] = useState({ data: [] });
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState(searchParams.get('filter') || '');
    const [categories, setCategories] = useState([]);
    const [categoryId, setCategoryId] = useState('');
    const [exportRow, setExportRow] = useState(null);
    const [projects, setProjects] = useState(null);
    const [notice, setNotice] = useState('');

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

    const openQuickExport = (row) => {
        setExportRow(row);
        if (!projects) fetch('/api/projects?limit=500').then(r => r.json()).then(d => setProjects(d.data || [])).catch(() => setProjects([]));
    };

    const handleExported = (doc) => {
        setExportRow(null);
        setNotice(doc.status === 'APPROVED'
            ? `✅ Đã xuất kho — phiếu ${doc.code}. Số tồn đã được trừ.`
            : `📨 Đã tạo phiếu ${doc.code}, đang chờ quản lý duyệt. Tồn kho sẽ trừ sau khi duyệt.`);
        fetchStock();
    };

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
            {notice && (
                <div style={{ padding: '10px 20px', fontSize: 13, background: 'rgba(22,163,74,0.08)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{notice}</span>
                    <button className="btn btn-ghost" style={{ padding: '0 8px' }} onClick={() => setNotice('')}>×</button>
                </div>
            )}
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
                                <th style={{ textAlign: 'center' }}>Không phát sinh</th><th>Trạng thái</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={`${r.materialId}_${r.warehouseId}`} style={{ background: r.status === 'HET_HANG' ? 'rgba(239,68,68,0.05)' : r.needsReorder ? 'rgba(245,158,11,0.05)' : undefined }}>
                                    <td className="accent">{r.sku}</td>
                                    <td className="primary">{r.name}<span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{nameSuffix(r)}</span></td>
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
                                    <td>
                                        {r.onHandQty > 0 && <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12, whiteSpace: 'nowrap' }} onClick={() => openQuickExport(r)}>📤 Xuất</button>}
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && <tr><td colSpan={13} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
            {exportRow && <QuickExportModal row={exportRow} projects={projects || []} onClose={() => setExportRow(null)} onDone={handleExported} />}
        </div>
    );
}

export default function StockPage() {
    return <Suspense fallback={null}><StockPageInner /></Suspense>;
}
