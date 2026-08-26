'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

const EMPTY_FORM = {
    name: '', categoryId: '', brand: '', colorCode: '', specNote: '',
    length: '', width: '', thickness: '',
    purchaseUnitId: '', stockUnitId: '', issueUnitId: '',
    purchaseToStockRatio: 1, issueToStockRatio: 1,
    minStock: '', maxStock: '', notes: '',
};

export default function MaterialsPage() {
    const [materials, setMaterials] = useState([]);
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editing, setEditing] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const importRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [importReport, setImportReport] = useState(null);

    const fetchMaterials = useCallback(async () => {
        setLoading(true);
        const p = new URLSearchParams({ limit: 500 });
        if (q) p.set('q', q);
        if (categoryId) p.set('categoryId', categoryId);
        const res = await fetch(`/api/inventory-v2/materials?${p}`);
        const d = await res.json();
        setMaterials(d.data || []);
        setLoading(false);
    }, [q, categoryId]);

    useEffect(() => { fetchMaterials(); }, [fetchMaterials]);
    useEffect(() => {
        fetch('/api/inventory-v2/categories').then(r => r.json()).then(d => setCategories(d.data || []));
        fetch('/api/inventory-v2/units').then(r => r.json()).then(d => setUnits(d.data || []));
    }, []);

    const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setWarnings([]); setError(''); setShowModal(true); };
    const openEdit = (m) => {
        setEditing(m);
        setForm({
            name: m.name, categoryId: m.categoryId, brand: m.brand, colorCode: m.colorCode, specNote: m.specNote,
            length: m.length, width: m.width, thickness: m.thickness,
            purchaseUnitId: m.purchaseUnitId, stockUnitId: m.stockUnitId, issueUnitId: m.issueUnitId,
            purchaseToStockRatio: m.purchaseToStockRatio, issueToStockRatio: m.issueToStockRatio,
            minStock: m.minStock, maxStock: m.maxStock, notes: m.notes,
        });
        setWarnings([]); setError(''); setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.categoryId || !form.purchaseUnitId || !form.stockUnitId || !form.issueUnitId) {
            setError('Vui lòng nhập tên, nhóm vật tư và đủ 3 đơn vị nhập/tồn/xuất'); return;
        }
        setSaving(true); setError('');
        try {
            const url = editing ? `/api/inventory-v2/materials/${editing.id}` : '/api/inventory-v2/materials';
            const res = await fetch(url, {
                method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi lưu vật tư');
            setWarnings(d.warnings || []);
            if (!d.warnings || d.warnings.length === 0) { setShowModal(false); fetchMaterials(); }
            else { fetchMaterials(); }
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    const handleImportFile = async (file) => {
        if (!file) return;
        setImporting(true); setImportReport(null);
        try {
            const XLSX = await import('xlsx');
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { raw: false });
            const res = await fetch('/api/inventory-v2/materials/import', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }),
            });
            const d = await res.json();
            setImportReport(d);
            fetchMaterials();
        } catch (err) { setImportReport({ errors: [{ row: '-', message: err.message }] }); }
        finally { setImporting(false); }
    };

    const exportExcel = async () => {
        const XLSX = await import('xlsx');
        const rows = materials.map(m => ({
            'Mã SKU': m.sku, 'Tên vật tư': m.name, 'Nhóm vật tư': m.category?.name, 'Hãng/NSX': m.brand,
            'Mã màu': m.colorCode, 'Dài': m.length, 'Rộng': m.width, 'Dày': m.thickness,
            'Đơn vị tồn': m.stockUnit?.code, 'Tồn tối thiểu': m.minStock, 'Tồn tối đa': m.maxStock,
            'Giá vốn bình quân': m.avgCost, 'Trạng thái': m.status,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Vật tư');
        XLSX.writeFile(wb, `danh-muc-vat-tu-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 style={{ margin: 0 }}>Danh mục vật tư</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => importRef.current?.click()} disabled={importing}>{importing ? 'Đang import...' : '📤 Import Excel'}</button>
                    <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { handleImportFile(e.target.files[0]); e.target.value = ''; }} />
                    <button className="btn btn-ghost" onClick={exportExcel}>📥 Export Excel</button>
                    <button className="btn btn-primary" onClick={openCreate}>+ Thêm vật tư</button>
                </div>
            </div>

            {importReport && (
                <div style={{ padding: '10px 16px', background: importReport.errors?.length ? '#fef2f2' : '#f0fdf4', fontSize: 13 }}>
                    Import: {importReport.success ?? 0}/{importReport.total ?? 0} dòng thành công.
                    {importReport.errors?.length > 0 && (
                        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                            {importReport.errors.slice(0, 10).map((e, i) => <li key={i}>Dòng {e.row}: {e.message}</li>)}
                        </ul>
                    )}
                </div>
            )}

            <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)', gap: 8 }}>
                <input className="form-input" placeholder="🔍 Tìm mã, tên, mã màu..." value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1 }} />
                <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ minWidth: 200 }}>
                    <option value="">Tất cả nhóm</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr><th>SKU</th><th>Tên vật tư</th><th>Nhóm</th><th>ĐVT</th><th style={{ textAlign: 'right' }}>Tồn tối thiểu</th><th>Trạng thái</th><th></th></tr>
                        </thead>
                        <tbody>
                            {materials.map(m => (
                                <tr key={m.id}>
                                    <td className="accent">{m.sku}</td>
                                    <td className="primary">
                                        {m.name}
                                        {m.colorCode && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> · {m.colorCode}</span>}
                                        {Number(m.thickness) > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> · Dày {m.thickness}mm</span>}
                                    </td>
                                    <td style={{ fontSize: 13 }}>{m.category?.name}</td>
                                    <td style={{ fontSize: 12 }}>{m.stockUnit?.code}</td>
                                    <td style={{ textAlign: 'right' }}>{m.minStock}</td>
                                    <td><span className={`badge ${m.status === 'Đang sử dụng' ? 'badge-success' : 'badge-warning'}`}>{m.status}</span></td>
                                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        <a href={`/api/inventory-v2/materials/${m.id}/qr`} target="_blank" rel="noreferrer" style={{ marginRight: 8 }} title="Mã QR">🔳</a>
                                        <button onClick={() => openEdit(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }} title="Sửa">✏️</button>
                                    </td>
                                </tr>
                            ))}
                            {materials.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chưa có vật tư</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>{editing ? `Sửa vật tư ${editing.sku}` : 'Thêm vật tư mới'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Tên vật tư *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Nhóm vật tư *</label>
                                    <select className="form-select" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                                        <option value="">— Chọn nhóm —</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hãng/NSX</label>
                                    <input className="form-input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Mã màu/vân</label>
                                    <input className="form-input" value={form.colorCode} onChange={e => setForm(f => ({ ...f, colorCode: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ghi chú quy cách</label>
                                    <input className="form-input" value={form.specNote} onChange={e => setForm(f => ({ ...f, specNote: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Dài (mm)</label><input className="form-input" type="number" value={form.length} onChange={e => setForm(f => ({ ...f, length: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">Rộng (mm)</label><input className="form-input" type="number" value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">Dày (mm)</label><input className="form-input" type="number" value={form.thickness} onChange={e => setForm(f => ({ ...f, thickness: e.target.value }))} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Đơn vị tồn (chuẩn) *</label>
                                    <select className="form-select" value={form.stockUnitId} onChange={e => setForm(f => ({ ...f, stockUnitId: e.target.value }))}>
                                        <option value="">— Chọn —</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.code}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn vị nhập *</label>
                                    <select className="form-select" value={form.purchaseUnitId} onChange={e => setForm(f => ({ ...f, purchaseUnitId: e.target.value }))}>
                                        <option value="">— Chọn —</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.code}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn vị xuất *</label>
                                    <select className="form-select" value={form.issueUnitId} onChange={e => setForm(f => ({ ...f, issueUnitId: e.target.value }))}>
                                        <option value="">— Chọn —</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.code}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">1 đơn vị nhập = ? đơn vị tồn</label>
                                    <input className="form-input" type="number" step="0.0001" value={form.purchaseToStockRatio} onChange={e => setForm(f => ({ ...f, purchaseToStockRatio: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">1 đơn vị xuất = ? đơn vị tồn</label>
                                    <input className="form-input" type="number" step="0.0001" value={form.issueToStockRatio} onChange={e => setForm(f => ({ ...f, issueToStockRatio: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Tồn tối thiểu</label><input className="form-input" type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} /></div>
                                <div className="form-group"><label className="form-label">Tồn tối đa</label><input className="form-input" type="number" value={form.maxStock} onChange={e => setForm(f => ({ ...f, maxStock: e.target.value }))} /></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>

                            {warnings.length > 0 && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, fontSize: 12, color: '#92400e' }}>
                                    ⚠️ Có thể trùng với vật tư khác — vẫn có thể lưu nếu chắc chắn đây là mã mới:
                                    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                                        {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
                                    </ul>
                                </div>
                            )}
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
