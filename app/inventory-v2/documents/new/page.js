'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

/** Ô chọn vật tư gõ-để-lọc (theo mã SKU/tên/mã màu/quy cách), thay cho <select> liệt kê hết. */
function MaterialCombobox({ materials, value, onSelect }) {
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const selected = materials.find(m => m.id === value);
    const displayText = open ? text : (selected ? `${selected.sku} — ${selected.name}` : '');

    const q = text.trim().toLowerCase();
    const filtered = q
        ? materials.filter(m => [m.sku, m.name, m.colorCode, m.specNote, m.brand, Number(m.thickness) > 0 ? String(m.thickness) : ''].some(f => (f || '').toLowerCase().includes(q)))
        : materials;

    return (
        <div style={{ position: 'relative', flex: 2 }}>
            <input
                className="form-input" style={{ width: '100%' }}
                placeholder="🔍 Gõ mã, tên hoặc mã màu..."
                value={displayText}
                onChange={e => { setText(e.target.value); setOpen(true); }}
                onFocus={() => { setText(''); setOpen(true); }}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                autoComplete="off"
            />
            {open && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: 260, overflowY: 'auto' }}>
                    {filtered.length === 0 && <div style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)' }}>Không tìm thấy vật tư</div>}
                    {filtered.slice(0, 100).map(m => (
                        <div key={m.id} onMouseDown={() => { onSelect(m.id); setText(''); setOpen(false); }}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light, #f3f4f6)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, #f0fdf4)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{m.sku}</span> — {m.name}
                            {m.colorCode && <span style={{ color: 'var(--text-muted)' }}> · mã màu {m.colorCode}</span>}
                            {Number(m.thickness) > 0 && <span style={{ color: 'var(--text-muted)' }}> · Dày {m.thickness}mm</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const DOC_TYPES = [
    { group: 'Nhập kho', options: [
        ['IMPORT_OPENING_BALANCE', '⭐ Nhập tồn đầu kỳ (khởi tạo tồn kho ban đầu)'],
        ['IMPORT_PURCHASE', 'Nhập mua từ nhà cung cấp'],
        ['IMPORT_CUSTOMER_SUPPLIED', 'Nhập vật tư khách hàng cấp'],
        ['IMPORT_RETURN_PROJECT', 'Nhập hoàn trả từ công trình'],
        ['IMPORT_RETURN_PRODUCTION', 'Nhập hoàn trả từ lệnh sản xuất'],
        ['IMPORT_SEMI_FINISHED', 'Nhập bán thành phẩm'],
        ['IMPORT_FINISHED', 'Nhập thành phẩm'],
    ] },
    { group: 'Xuất kho', options: [
        ['EXPORT_PRODUCTION', 'Xuất cho lệnh sản xuất'],
        ['EXPORT_PROJECT', 'Xuất cho công trình'],
        ['EXPORT_DEPARTMENT', 'Xuất cho phòng ban/nhân viên'],
        ['EXPORT_RETURN_SUPPLIER', 'Xuất trả nhà cung cấp'],
        ['EXPORT_SALE', 'Xuất bán'],
        ['EXPORT_SCRAP', 'Xuất hủy/phế liệu'],
    ] },
    { group: 'Điều chuyển & hoàn trả', options: [
        ['TRANSFER_WAREHOUSE', 'Điều chuyển kho'],
        ['TRANSFER_LOCATION', 'Điều chuyển vị trí/kệ'],
        ['RETURN_TO_WAREHOUSE', 'Hoàn trả vật tư về kho'],
    ] },
    { group: 'Giữ vật tư', options: [
        ['HOLD', 'Giữ vật tư cho công trình'],
        ['RELEASE_HOLD', 'Hủy giữ vật tư'],
    ] },
];

const NEEDS_TARGET_WAREHOUSE = ['TRANSFER_WAREHOUSE'];
const NEEDS_PROJECT_CONTEXT = ['HOLD', 'RELEASE_HOLD', 'EXPORT_PROJECT', 'IMPORT_RETURN_PROJECT'];

export default function NewDocumentPage() {
    const router = useRouter();
    const [docType, setDocType] = useState('IMPORT_PURCHASE');
    const [warehouseId, setWarehouseId] = useState('');
    const [targetWarehouseId, setTargetWarehouseId] = useState('');
    const [projectId, setProjectId] = useState('');
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [warehouses, setWarehouses] = useState([]);
    const [projects, setProjects] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [lines, setLines] = useState([{ materialId: '', enteredQuantity: '', enteredUnitId: '', unitPrice: '' }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const importRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [importReport, setImportReport] = useState(null);

    useEffect(() => {
        fetch('/api/inventory-v2/warehouses').then(r => r.json()).then(d => { setWarehouses(d.data || []); if (d.data?.[0]) setWarehouseId(d.data[0].id); });
        fetch('/api/inventory-v2/materials?limit=1000').then(r => r.json()).then(d => setMaterials(d.data || []));
        fetch('/api/projects?limit=500').then(r => r.json()).then(d => setProjects(d.data || [])).catch(() => {});
    }, []);

    const materialOptions = (materialId) => {
        const m = materials.find(x => x.id === materialId);
        if (!m) return [];
        return [m.stockUnit, m.purchaseUnit, m.issueUnit].filter((u, i, arr) => u && arr.findIndex(x => x.id === u.id) === i);
    };

    const updateLine = (i, patch) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
    const addLine = () => setLines(ls => [...ls, { materialId: '', enteredQuantity: '', enteredUnitId: '', unitPrice: '' }]);
    const removeLine = (i) => setLines(ls => ls.filter((_, idx) => idx !== i));

    const handleMaterialSelect = (i, materialId) => {
        const m = materials.find(x => x.id === materialId);
        updateLine(i, { materialId, enteredUnitId: m?.stockUnitId || '' });
    };

    /** Xuất mẫu Excel toàn bộ danh mục vật tư để điền nhanh Số lượng/Đơn giá, dùng cho nhập tồn hàng loạt. */
    const handleExportTemplate = async () => {
        const XLSX = await import('xlsx');
        const rows = materials.map(m => ({
            'Mã SKU': m.sku, 'Tên vật tư': m.name, 'Mã màu': m.colorCode || '', 'ĐVT': m.stockUnit?.code || '',
            'Số lượng': '', 'Đơn giá': '', 'Ghi chú': '',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Nhap ton');
        XLSX.writeFile(wb, `mau-nhap-ton-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    /** Import Excel (Mã SKU, Số lượng, Đơn giá, Ghi chú) → khớp với danh mục vật tư đã tải, thay thế các dòng hiện có. */
    const handleImportFile = async (file) => {
        if (!file) return;
        setImporting(true); setImportReport(null);
        try {
            const XLSX = await import('xlsx');
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { raw: false });
            const materialBySku = new Map(materials.map(m => [m.sku.trim().toLowerCase(), m]));

            const newLines = [];
            const errors = [];
            rows.forEach((row, idx) => {
                const rowNo = idx + 2;
                const sku = String(row['Mã SKU'] || '').trim();
                const qty = Number(row['Số lượng']);
                if (!sku && !qty) return; // dòng trống, bỏ qua
                if (!sku) { errors.push({ row: rowNo, message: 'Thiếu mã SKU' }); return; }
                const material = materialBySku.get(sku.toLowerCase());
                if (!material) { errors.push({ row: rowNo, message: `Không tìm thấy vật tư "${sku}"` }); return; }
                if (!(qty > 0)) return; // không nhập số lượng, bỏ qua dòng này
                newLines.push({
                    materialId: material.id, enteredQuantity: String(qty), enteredUnitId: material.stockUnitId,
                    unitPrice: row['Đơn giá'] ? String(Number(row['Đơn giá']) || 0) : '',
                });
            });

            if (newLines.length > 0) setLines(newLines);
            setImportReport({ success: newLines.length, total: rows.length, errors });
        } catch (err) { setImportReport({ errors: [{ row: '-', message: err.message }] }); }
        finally { setImporting(false); }
    };

    const handleSubmit = async () => {
        setError('');
        const validLines = lines.filter(l => l.materialId && Number(l.enteredQuantity) > 0);
        if (validLines.length === 0) { setError('Cần ít nhất 1 dòng vật tư hợp lệ'); return; }
        if (!warehouseId) { setError('Vui lòng chọn kho'); return; }
        if (NEEDS_TARGET_WAREHOUSE.includes(docType) && !targetWarehouseId) { setError('Vui lòng chọn kho đích'); return; }
        if (NEEDS_PROJECT_CONTEXT.includes(docType) && !projectId) { setError('Loại phiếu này cần gắn công trình'); return; }

        setSaving(true);
        try {
            const res = await fetch('/api/inventory-v2/documents', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docType, warehouseId, targetWarehouseId: targetWarehouseId || undefined, projectId: projectId || undefined, reason, notes, lines: validLines }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi tạo phiếu');
            router.push(`/inventory-v2/documents/${d.id}`);
        } catch (err) { setError(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="card">
            <div className="card-header"><h3 style={{ margin: 0 }}>Tạo phiếu kho</h3></div>
            <div className="modal-body" style={{ padding: 20 }}>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Loại phiếu *</label>
                        <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
                            {DOC_TYPES.map(g => (
                                <optgroup key={g.group} label={g.group}>
                                    {g.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Kho {NEEDS_TARGET_WAREHOUSE.includes(docType) ? 'nguồn' : ''} *</label>
                        <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                            <option value="">— Chọn kho —</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                </div>

                {NEEDS_TARGET_WAREHOUSE.includes(docType) && (
                    <div className="form-group">
                        <label className="form-label">Kho đích *</label>
                        <select className="form-select" value={targetWarehouseId} onChange={e => setTargetWarehouseId(e.target.value)}>
                            <option value="">— Chọn kho đích —</option>
                            {warehouses.filter(w => w.id !== warehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label">Công trình {NEEDS_PROJECT_CONTEXT.includes(docType) ? '*' : '(tuỳ chọn)'}</label>
                    <select className="form-select" value={projectId} onChange={e => setProjectId(e.target.value)}>
                        <option value="">— Không gắn công trình —</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>Dòng vật tư *</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-ghost" onClick={handleExportTemplate}>📥 Tải mẫu Excel</button>
                            <button type="button" className="btn btn-ghost" onClick={() => importRef.current?.click()} disabled={importing}>{importing ? 'Đang import...' : '📤 Import Excel'}</button>
                            <input ref={importRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { handleImportFile(e.target.files[0]); e.target.value = ''; }} />
                        </div>
                    </div>
                    {importReport && (
                        <div style={{ margin: '8px 0', padding: '8px 12px', borderRadius: 6, background: importReport.errors?.length ? '#fef2f2' : '#f0fdf4', fontSize: 13 }}>
                            Import: {importReport.success ?? 0}/{importReport.total ?? 0} dòng thành công.
                            {importReport.errors?.length > 0 && (
                                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                                    {importReport.errors.slice(0, 10).map((e, i) => <li key={i}>Dòng {e.row}: {e.message}</li>)}
                                </ul>
                            )}
                        </div>
                    )}
                    {lines.map((l, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                            <MaterialCombobox materials={materials} value={l.materialId} onSelect={(id) => handleMaterialSelect(i, id)} />
                            <input className="form-input" style={{ flex: 1 }} type="number" placeholder="SL" value={l.enteredQuantity} onChange={e => updateLine(i, { enteredQuantity: e.target.value })} />
                            <select className="form-select" style={{ flex: 1 }} value={l.enteredUnitId} onChange={e => updateLine(i, { enteredUnitId: e.target.value })}>
                                <option value="">ĐVT</option>
                                {materialOptions(l.materialId).map(u => <option key={u.id} value={u.id}>{u.code}</option>)}
                            </select>
                            <input className="form-input" style={{ flex: 1 }} type="number" placeholder="Đơn giá" value={l.unitPrice} onChange={e => updateLine(i, { unitPrice: e.target.value })} />
                            <button className="btn btn-ghost" onClick={() => removeLine(i)} style={{ padding: '6px 10px' }}>✕</button>
                        </div>
                    ))}
                    <button className="btn btn-ghost" onClick={addLine}>+ Thêm dòng</button>
                </div>

                <div className="form-row">
                    <div className="form-group"><label className="form-label">Lý do</label><input className="form-input" value={reason} onChange={e => setReason(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Ghi chú</label><input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} /></div>
                </div>
            </div>
            {error && <div style={{ padding: '6px 20px', color: '#dc2626', fontSize: 13 }}>{error}</div>}
            <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => router.back()}>Hủy</button>
                <button className="btn btn-primary" disabled={saving} onClick={handleSubmit}>{saving ? 'Đang lưu...' : 'Tạo phiếu (Nháp)'}</button>
            </div>
        </div>
    );
}
