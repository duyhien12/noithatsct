'use client';
import { useState, useRef, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

const COST_TYPES_DEFAULT = ['Tháo dỡ', 'Đào đất', 'Hoàn thiện xây lắp', 'Vật liệu'];
const SUPPLIER_TAGS = ['', 'Công ty cấp', 'Thầu phụ cấp'];
const GROUP1_PRESETS = ['Tháo dỡ', 'Đào đất', 'Hoàn thiện xây lắp', 'Vật liệu'];
const GROUP2_PRESETS = ['Phòng khách', 'Phòng ngủ 01', 'Phòng ngủ 02', 'Phòng bếp', 'Phòng tắm', 'Ban công', 'Tủ bếp', 'Tủ áo', 'Cầu thang', 'Sân vườn'];

const COST_TYPE_COLORS = {
    'Vật tư': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    'Nhân công': { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
    'Thầu phụ': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    'Khác': { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
};

const BUDGET_TEMPLATES = {
    'Nhà phố 3 tầng': [
        { name: 'Xi măng', unit: 'bao', qty: 800, category: 'Vật liệu thô', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Cát xây', unit: 'm³', qty: 40, category: 'Vật liệu thô', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Đá 1x2', unit: 'm³', qty: 30, category: 'Vật liệu thô', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø10', unit: 'kg', qty: 2000, category: 'Sắt thép', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø12', unit: 'kg', qty: 1500, category: 'Sắt thép', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø16', unit: 'kg', qty: 800, category: 'Sắt thép', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Gạch xây', unit: 'viên', qty: 25000, category: 'Vật liệu thô', costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Nhân công xây thô', unit: 'm²', qty: 350, costType: 'Nhân công', group1: 'Phần thô', supplierTag: 'Thầu phụ cấp' },
        { name: 'Gạch ốp lát 60x60', unit: 'm²', qty: 200, category: 'Hoàn thiện', costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Sơn nước ngoại thất', unit: 'thùng', qty: 15, category: 'Hoàn thiện', costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Sơn nước nội thất', unit: 'thùng', qty: 20, category: 'Hoàn thiện', costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Nhân công hoàn thiện', unit: 'm²', qty: 350, costType: 'Nhân công', group1: 'Phần hoàn thiện', supplierTag: 'Thầu phụ cấp' },
        { name: 'Ống nước PPR Ø25', unit: 'm', qty: 100, category: 'M&E', costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Dây điện 2.5mm²', unit: 'm', qty: 500, category: 'M&E', costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'CB 2P 20A', unit: 'cái', qty: 15, category: 'M&E', costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Nhân công M&E', unit: 'công', qty: 60, costType: 'Nhân công', group1: 'M&E (Điện nước)', supplierTag: 'Thầu phụ cấp' },
    ],
    'Biệt thự 2 tầng': [
        { name: 'Xi măng', unit: 'bao', qty: 1200, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Cát xây', unit: 'm³', qty: 60, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Đá 1x2', unit: 'm³', qty: 45, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø10', unit: 'kg', qty: 3000, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø12', unit: 'kg', qty: 2000, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø16', unit: 'kg', qty: 1200, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Thép Ø20', unit: 'kg', qty: 600, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Gạch xây', unit: 'viên', qty: 35000, costType: 'Vật tư', group1: 'Phần thô' },
        { name: 'Nhân công thô', unit: 'm²', qty: 500, costType: 'Nhân công', group1: 'Phần thô', supplierTag: 'Thầu phụ cấp' },
        { name: 'Gạch ốp lát 80x80', unit: 'm²', qty: 350, costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Đá granite mặt tiền', unit: 'm²', qty: 60, costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Sơn nước ngoại thất', unit: 'thùng', qty: 25, costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Sơn nước nội thất', unit: 'thùng', qty: 30, costType: 'Vật tư', group1: 'Phần hoàn thiện' },
        { name: 'Ống nước PPR Ø25', unit: 'm', qty: 200, costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Dây điện 2.5mm²', unit: 'm', qty: 800, costType: 'Vật tư', group1: 'M&E (Điện nước)' },
    ],
    'Nội thất căn hộ': [
        { name: 'Gỗ MDF chống ẩm', unit: 'm²', qty: 80, costType: 'Vật tư', group1: 'Nội thất gỗ', group2: 'Phòng khách' },
        { name: 'Vách phẳng MDF', unit: 'm²', qty: 40, costType: 'Vật tư', group1: 'Nội thất gỗ', group2: 'Phòng ngủ 01' },
        { name: 'Bản lề giảm chấn', unit: 'bộ', qty: 30, costType: 'Vật tư', group1: 'Nội thất gỗ' },
        { name: 'Ray trượt ngăn kéo', unit: 'bộ', qty: 20, costType: 'Vật tư', group1: 'Nội thất gỗ' },
        { name: 'Đèn LED panel', unit: 'cái', qty: 15, costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Đèn downlight spotlight', unit: 'cái', qty: 25, costType: 'Vật tư', group1: 'M&E (Điện nước)' },
        { name: 'Đá thạch anh countertop', unit: 'm dài', qty: 6, costType: 'Vật tư', group1: 'Nội thất gỗ', group2: 'Phòng bếp' },
        { name: 'Kính cường lực 10mm', unit: 'm²', qty: 10, costType: 'Vật tư', group1: 'Nội thất gỗ' },
        { name: 'Nhân công lắp đặt', unit: 'công', qty: 40, costType: 'Nhân công', group1: 'Nội thất gỗ', supplierTag: 'Thầu phụ cấp' },
    ],
};

function emptyRow() {
    return { productId: '', productName: '', unit: '', quantity: 1, unitPrice: 0, actualCost: 0, actualUnitPrice: 0, notes: '', category: '', costType: 'Tháo dỡ', group1: '', group2: '', supplierTag: '', _key: Date.now() + Math.random() };
}

export default function BudgetQuickAdd({ projectId, products, onDone, onClose, initialRows }) {
    const [mode, setMode] = useState('quick');
    const [rows, setRows] = useState(() => initialRows?.length ? initialRows : [emptyRow()]);
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [activeRowIdx, setActiveRowIdx] = useState(null);
    const [categoryOptions, setCategoryOptions] = useState(COST_TYPES_DEFAULT);
    const fileRef = useRef(null);

    useEffect(() => {
        fetch('/api/product-categories')
            .then(r => r.json())
            .then(tree => {
                const flatten = (nodes) => nodes.flatMap(n => [n.name, ...flatten(n.children || [])]);
                const names = flatten(tree).filter(Boolean);
                if (names.length > 0) {
                    setCategoryOptions([...new Set([...COST_TYPES_DEFAULT, ...names])]);
                }
            })
            .catch(() => {});
    }, []);

    const filteredProducts = productSearch.length >= 1
        ? products.filter(p =>
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.code.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 8)
        : [];

    const updateRow = (idx, field, value) => {
        setRows(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    };

    // When ĐG TT changes → auto-calc Tổng TT = ĐG TT × SL
    const updateDgTT = (idx, value) => {
        setRows(prev => {
            const updated = [...prev];
            const row = updated[idx];
            const dgTT = Number(value) || 0;
            const actualCost = dgTT * (Number(row.quantity) || 0);
            updated[idx] = { ...row, actualUnitPrice: dgTT, actualCost };
            return updated;
        });
    };

    // When Tổng TT changes → auto-calc ĐG TT = Tổng TT / SL
    const updateActualCost = (idx, value) => {
        setRows(prev => {
            const updated = [...prev];
            const row = updated[idx];
            const actualCost = Number(value) || 0;
            const qty = Number(row.quantity) || 0;
            const actualUnitPrice = qty > 0 ? actualCost / qty : 0;
            updated[idx] = { ...row, actualCost, actualUnitPrice };
            return updated;
        });
    };

    const selectProduct = (idx, product) => {
        setRows(prev => {
            const updated = [...prev];
            updated[idx] = {
                ...updated[idx],
                productId: product.id,
                productName: product.name,
                unit: product.unit,
                unitPrice: product.importPrice || product.salePrice || 0,
                costType: product.category || updated[idx].costType,
            };
            return updated;
        });
        setActiveRowIdx(null);
        setProductSearch('');
    };

    const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));
    const addRow = () => setRows(prev => [...prev, emptyRow()]);
    const batchSetGroup1 = (val) => setRows(prev => prev.map(r => ({ ...r, group1: val })));

    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const XLSX = (await import('xlsx')).default;
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        const imported = [];
        for (const row of json) {
            const name = row['Tên vật tư'] || row['Vật tư'] || row['name'] || row['Tên'] || '';
            const unit = row['ĐVT'] || row['Đơn vị'] || row['unit'] || '';
            const qty = Number(row['Số lượng'] || row['SL'] || row['quantity'] || row['Qty'] || 0);
            const price = Number(row['Đơn giá'] || row['unitPrice'] || row['Giá'] || 0);
            const category = row['Hạng mục'] || row['Loại'] || row['category'] || '';
            const costType = row['Loại chi phí'] || row['costType'] || 'Vật tư';
            const group1 = row['Giai đoạn'] || row['group1'] || '';
            const group2 = row['Không gian'] || row['group2'] || '';
            const supplierTag = row['NCC'] || row['supplierTag'] || '';
            if (!name || qty <= 0) continue;
            const match = products.find(p => p.name.toLowerCase() === name.toLowerCase() || p.code.toLowerCase() === name.toLowerCase());
            imported.push({
                productId: match?.id || '',
                productName: match?.name || name,
                unit: match?.unit || unit,
                quantity: qty,
                unitPrice: match?.importPrice || price,
                category, costType: costType || 'Tháo dỡ',
                group1, group2, supplierTag,
                _key: Date.now() + Math.random(),
            });
        }
        if (imported.length === 0) {
            alert('Không tìm thấy dữ liệu hợp lệ. Cần ít nhất cột "Tên vật tư" và "Số lượng"');
            return;
        }
        setRows(imported);
        setMode('quick');
        if (fileRef.current) fileRef.current.value = '';
    };

    const applyTemplate = (templateName) => {
        const template = BUDGET_TEMPLATES[templateName];
        if (!template) return;
        const newRows = template.map(t => {
            const match = products.find(p => p.name.toLowerCase().includes(t.name.toLowerCase()));
            return {
                productId: match?.id || '',
                productName: match?.name || t.name,
                unit: match?.unit || t.unit || '',
                quantity: t.qty,
                unitPrice: match?.importPrice || 0,
                category: t.category || '',
                costType: t.costType || 'Vật tư',
                group1: t.group1 || '',
                group2: t.group2 || '',
                supplierTag: t.supplierTag || '',
                _key: Date.now() + Math.random(),
            };
        });
        setRows(newRows);
        setMode('quick');
    };

    const isRowValid = (r) => (r.productId || (r.productName || '').trim()) && Number(r.quantity) > 0;

    const handleSaveAll = async () => {
        const validRows = rows.filter(isRowValid);
        if (validRows.length === 0) return;
        setSaving(true);
        try {
            const res = await fetch('/api/material-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    source: 'Dự toán nhanh',
                    items: validRows.map(r => ({
                        productId: r.productId || null,
                        customName: r.productId ? '' : (r.productName || '').trim(),
                        quantity: Number(r.quantity),
                        unitPrice: Number(r.unitPrice),
                        actualCost: (Number(r.actualUnitPrice) || 0) * (Number(r.quantity) || 0),
                        category: r.category,
                        costType: r.costType,
                        group1: r.group1,
                        group2: r.group2,
                        supplierTag: r.supplierTag,
                        planType: 'tracking',
                    })),
                }),
            });
            const result = await res.json();
            if (!res.ok) {
                alert(result.error || 'Lỗi tạo');
                setSaving(false);
                return;
            }
            // Close immediately and refresh
            onDone?.();
        } catch {
            alert('Lỗi kết nối');
            setSaving(false);
        }
    };

    const costTypes = [...new Set([...categoryOptions, ...(products || []).map(p => p.category).filter(Boolean)])];

    const totalAmount = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0);
    const validCount = rows.filter(isRowValid).length;
    const unmatchedCount = 0;

    const inputStyle = {
        padding: '7px 10px',
        fontSize: 13,
        border: '1px solid var(--border-light)',
        borderRadius: 6,
        background: 'var(--bg-main)',
        color: 'var(--text-primary)',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    };
    const selectStyle = { ...inputStyle, cursor: 'pointer' };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 1020, width: '97vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <h3 style={{ margin: 0, fontSize: 16 }}>📋 Dự toán vật tư</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
                </div>

                {/* Mode tabs */}
                <div style={{ display: 'flex', gap: 2, padding: '0 20px', borderBottom: '2px solid var(--border-light)' }}>
                    {[
                        { key: 'quick', label: '✏️ Nhập nhanh' },
                        { key: 'excel', label: '📊 Import Excel' },
                        { key: 'template', label: '📁 Template' },
                    ].map(m => (
                        <button key={m.key} onClick={() => setMode(m.key)}
                            style={{
                                padding: '10px 18px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                                borderRadius: '8px 8px 0 0', marginBottom: -2,
                                background: 'transparent',
                                color: mode === m.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                                borderBottom: mode === m.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            }}>
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Excel upload */}
                {mode === 'excel' && (
                    <div style={{ padding: 24 }}>
                        <div style={{ border: '2px dashed var(--border-light)', borderRadius: 12, padding: 48, textAlign: 'center', background: 'var(--bg-main)' }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Kéo thả file Excel hoặc bấm chọn</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                                Cột bắt buộc: <strong>Tên vật tư</strong> + <strong>Số lượng</strong><br />
                                Tùy chọn: ĐVT, Đơn giá, Hạng mục, Loại chi phí, Giai đoạn, Không gian, NCC
                            </div>
                            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ display: 'none' }} id="excel-upload" />
                            <label htmlFor="excel-upload" className="btn btn-primary" style={{ cursor: 'pointer', fontSize: 14, padding: '10px 24px' }}>
                                📁 Chọn file Excel
                            </label>
                        </div>
                    </div>
                )}

                {/* Template picker */}
                {mode === 'template' && (
                    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                        {Object.entries(BUDGET_TEMPLATES).map(([name, items]) => {
                            const costTypes = [...new Set(items.map(i => i.costType))];
                            const groups = [...new Set(items.map(i => i.group1).filter(Boolean))];
                            return (
                                <div key={name} onClick={() => applyTemplate(name)}
                                    style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 20, cursor: 'pointer', transition: 'all 0.15s', background: 'var(--bg-card)' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>🏗️ {name}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{items.length} hạng mục</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>📁 {groups.join(' · ')}</div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {costTypes.map(ct => {
                                            const c = COST_TYPE_COLORS[ct] || COST_TYPE_COLORS['Khác'];
                                            return <span key={ct} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{ct}</span>;
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Quick add rows */}
                {mode === 'quick' && (
                    <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>

                        {/* Batch set group1 */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Gán giai đoạn cho tất cả:</span>
                            {GROUP1_PRESETS.map(g => (
                                <button key={g} onClick={() => batchSetGroup1(g)}
                                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500 }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                                    {g}
                                </button>
                            ))}
                        </div>

                        {/* Table input */}
                        <datalist id="group1-list">{GROUP1_PRESETS.map(g => <option key={g} value={g} />)}</datalist>
                        <datalist id="group2-list">{GROUP2_PRESETS.map(g => <option key={g} value={g} />)}</datalist>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                                <thead>
                                    <tr>
                                        {[
                                            { label: 'STT', w: 36 },
                                            { label: 'TÊN HẠNG MỤC', w: 'auto' },
                                            { label: 'ĐVT', w: 60 },
                                            { label: 'SL', w: 70 },
                                            { label: 'ĐG', w: 110 },
                                            { label: 'Tổng DT', w: 110 },
                                            { label: 'ĐG TT', w: 90 },
                                            { label: 'Tổng TT', w: 110 },
                                            { label: 'Chênh lệch', w: 110 },
                                            { label: 'Loại CP', w: 100 },
                                            { label: 'Giai đoạn', w: 110 },
                                            { label: 'Không gian', w: 110 },
                                            { label: '', w: 32 },
                                        ].map(h => (
                                            <th key={h.label} style={{ background: '#1e3a5f', color: 'white', fontWeight: 700, textAlign: 'center', fontSize: 11, padding: '7px 6px', border: '1px solid #1e3a5f', whiteSpace: 'nowrap', width: h.w }}>{h.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, idx) => {
                                        const lineTotal = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
                                        const dgTT = Number(row.actualUnitPrice) || 0;
                                        const actualCost = dgTT * (Number(row.quantity) || 0);
                                        const chenhLech = lineTotal - actualCost;
                                        const isUnmatched = !row.productId && row.productName;
                                        const cellStyle = { border: '1px solid #e5e7eb', padding: '4px 6px', fontSize: 12 };
                                        return (
                                            <tr key={row._key} style={{ background: isUnmatched ? 'rgba(245,158,11,0.05)' : idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                                {/* STT */}
                                                <td style={{ ...cellStyle, textAlign: 'center', color: '#6b7280', fontWeight: 600 }}>{idx + 1}</td>

                                                {/* TÊN HẠNG MỤC */}
                                                <td style={{ ...cellStyle, position: 'relative', minWidth: 200 }}>
                                                    {row.productId ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <span style={{ fontWeight: 600, fontSize: 12, flex: 1 }}>{row.productName}</span>
                                                            <button onClick={() => updateRow(idx, 'productId', '')} style={{ background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: '#9ca3af', padding: 0, lineHeight: 1 }}>×</button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ position: 'relative' }}>
                                                            <input type="text"
                                                                placeholder="Nhập tên hoặc tìm sản phẩm..."
                                                                value={activeRowIdx === idx ? productSearch : (row.productName || '')}
                                                                onChange={e => { setProductSearch(e.target.value); setActiveRowIdx(idx); }}
                                                                onFocus={() => { setActiveRowIdx(idx); setProductSearch(row.productName || ''); }}
                                                                onBlur={() => setTimeout(() => {
                                                                    if (productSearch.trim()) updateRow(idx, 'productName', productSearch.trim());
                                                                    setActiveRowIdx(null);
                                                                    setProductSearch('');
                                                                }, 150)}
                                                                style={{ ...inputStyle, fontSize: 12, padding: '5px 8px', border: `1px solid ${row.productName && !row.productId ? '#10b981' : 'var(--border-light)'}` }} />
                                                            {activeRowIdx === idx && filteredProducts.length > 0 && (
                                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, maxHeight: 200, overflow: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 2 }}>
                                                                    {filteredProducts.map(p => (
                                                                        <div key={p.id} onClick={() => selectProduct(idx, p)}
                                                                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                                                                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{p.unit} · {fmt(p.importPrice || p.salePrice || 0)}đ</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* ĐVT */}
                                                <td style={cellStyle}>
                                                    <input type="text" placeholder="ĐVT" value={row.unit} onChange={e => updateRow(idx, 'unit', e.target.value)}
                                                        style={{ ...inputStyle, fontSize: 12, padding: '5px 6px', textAlign: 'center' }} />
                                                </td>

                                                {/* SL DT */}
                                                <td style={cellStyle}>
                                                    <input type="number" placeholder="0" value={row.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)}
                                                        style={{ ...inputStyle, fontSize: 12, padding: '5px 6px', textAlign: 'right' }} />
                                                </td>

                                                {/* ĐG DT */}
                                                <td style={cellStyle}>
                                                    <input type="number" placeholder="0" value={row.unitPrice} onChange={e => updateRow(idx, 'unitPrice', e.target.value)}
                                                        style={{ ...inputStyle, fontSize: 12, padding: '5px 6px', textAlign: 'right' }} />
                                                </td>

                                                {/* Tổng DT (computed) */}
                                                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: lineTotal > 0 ? '#2563eb' : '#9ca3af' }}>
                                                    {lineTotal > 0 ? fmt(lineTotal) : '—'}
                                                </td>

                                                {/* ĐG TT (nhập tay, tự tính Tổng TT) */}
                                                <td style={cellStyle}>
                                                    <input type="number" placeholder="0" value={row.actualUnitPrice || ''}
                                                        onChange={e => updateDgTT(idx, e.target.value)}
                                                        style={{ ...inputStyle, fontSize: 12, padding: '5px 6px', textAlign: 'right', borderColor: dgTT > Number(row.unitPrice) ? '#dc2626' : dgTT > 0 ? '#16a34a' : 'var(--border-light)', color: dgTT > Number(row.unitPrice) ? '#dc2626' : dgTT > 0 ? '#16a34a' : 'var(--text-primary)' }} />
                                                </td>

                                                {/* Tổng TT (computed: ĐG TT × SL DT) */}
                                                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: actualCost > 0 ? '#16a34a' : '#9ca3af' }}>
                                                    {actualCost > 0 ? fmt(actualCost) : '—'}
                                                </td>

                                                {/* Chênh lệch (computed: Tổng DT - Tổng TT) */}
                                                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: actualCost > 0 ? (chenhLech >= 0 ? '#16a34a' : '#dc2626') : '#9ca3af', fontSize: 12 }}>
                                                    {actualCost > 0 ? `${chenhLech >= 0 ? '+' : ''}${fmt(chenhLech)}` : '—'}
                                                </td>

                                                {/* Loại chi phí */}
                                                <td style={cellStyle}>
                                                    <select value={row.costType} onChange={e => updateRow(idx, 'costType', e.target.value)}
                                                        style={{ width: '100%', padding: '5px 4px', fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white', color: '#111' }}>
                                                        {costTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                                                    </select>
                                                </td>

                                                {/* Giai đoạn */}
                                                <td style={cellStyle}>
                                                    <input type="text" list="group1-list" placeholder="Phần thô..." value={row.group1}
                                                        onChange={e => updateRow(idx, 'group1', e.target.value)}
                                                        style={{ ...inputStyle, fontSize: 11, padding: '5px 6px' }} />
                                                </td>

                                                {/* Không gian */}
                                                <td style={cellStyle}>
                                                    <input type="text" list="group2-list" placeholder="P.Khách..." value={row.group2}
                                                        onChange={e => updateRow(idx, 'group2', e.target.value)}
                                                        style={{ ...inputStyle, fontSize: 11, padding: '5px 6px' }} />
                                                </td>

                                                {/* Delete */}
                                                <td style={{ ...cellStyle, textAlign: 'center' }}>
                                                    <button onClick={() => removeRow(idx)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 15, padding: 0, lineHeight: 1, opacity: rows.length === 1 ? 0.3 : 1 }}
                                                        disabled={rows.length === 1}>🗑</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <button onClick={addRow} style={{ marginTop: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, border: '1px dashed var(--border-light)', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: 'var(--accent-primary)', width: '100%' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            + Thêm dòng
                        </button>
                    </div>
                )}

                {/* Footer */}
                {mode === 'quick' && (
                    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                        <div style={{ fontSize: 14 }}>
                            <span style={{ color: 'var(--text-muted)' }}>{rows.length} dòng · </span>
                            <strong style={{ color: validCount > 0 ? 'var(--status-success)' : 'var(--text-muted)' }}>{validCount} hợp lệ</strong>
                            <span style={{ marginLeft: 12, fontWeight: 700, color: 'var(--accent-primary)', fontSize: 15 }}>{fmt(totalAmount)}đ</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary" onClick={onClose} style={{ padding: '8px 20px' }}>Hủy</button>
                            <button
                                onClick={handleSaveAll}
                                disabled={saving || validCount === 0}
                                style={{
                                    padding: '8px 24px', fontSize: 14, fontWeight: 700,
                                    background: validCount > 0 ? 'var(--accent-primary)' : 'var(--border-light)',
                                    color: validCount > 0 ? 'white' : 'var(--text-muted)',
                                    border: 'none', borderRadius: 8, cursor: validCount > 0 ? 'pointer' : 'not-allowed',
                                    opacity: saving ? 0.7 : 1,
                                    transition: 'all 0.15s',
                                }}>
                                {saving ? '⏳ Đang tạo...' : `✅ Tạo ${validCount} mục`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
