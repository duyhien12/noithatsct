'use client';
import { useState, useEffect, useRef } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const STYLES = {
    cell: { border: '1px solid #c0c0c0', padding: '6px 8px' },
    header: { background: '#1e3a5f', color: 'white', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', fontSize: 12 },
    group1: { background: '#fde68a', fontWeight: 700, fontSize: 13 },
    group2: { background: '#fce4d6', fontWeight: 600, fontSize: 12 },
    item: { background: '#ffffff', fontSize: 12 },
    total: { background: '#1e3a5f', color: 'white', fontWeight: 700, fontSize: 13 },
};

// Download template Excel
async function downloadTemplate() {
    const mod = await import('xlsx');
    const XLSX = mod.default || mod;

    const templateData = [
        // Header
        ['TÊN HẠNG MỤC', 'ĐVT', 'SL', 'ĐƠN GIÁ', 'GIAI ĐOẠN', 'KHÔNG GIAN', 'LOẠI CHI PHÍ', 'NCC'],
        // 3 example rows
        ['(VD) Đào xúc đất bể phốt', 'm3', 6, 450000, 'Phần thô', 'Tầng 1', 'Vật tư', ''],
        ['(VD) Nhân công xây thô', 'm2', 120, 85000, 'Phần thô', '', 'Nhân công', 'Thầu phụ cấp'],
        ['(VD) Gạch ốp lát 60x60', 'm2', 80, 250000, 'Phần hoàn thiện', 'Phòng khách', 'Vật tư', 'Công ty cấp'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Style header row
    ws['!cols'] = [
        { wch: 45 }, // TÊN HẠNG MỤC
        { wch: 8 },  // ĐVT
        { wch: 8 },  // SL
        { wch: 14 }, // ĐƠN GIÁ
        { wch: 22 }, // GIAI ĐOẠN
        { wch: 18 }, // KHÔNG GIAN
        { wch: 16 }, // LOẠI CHI PHÍ
        { wch: 16 }, // NCC
    ];

    // Add note rows
    const noteData = [
        [],
        ['--- HƯỚNG DẪN ---'],
        ['GIAI ĐOẠN: Phần thô | Phần hoàn thiện | Nội thất gỗ | M&E (Điện nước) | Ngoại thất'],
        ['KHÔNG GIAN: Tầng 1 | Tầng 2 | Phòng khách | Phòng ngủ | ... (để trống nếu không có)'],
        ['LOẠI CHI PHÍ: Vật tư | Nhân công | Thầu phụ | Khác'],
        ['NCC: Công ty cấp | Thầu phụ cấp | (để trống nếu không có)'],
        ['SL và ĐƠN GIÁ nhập số, không nhập dấu chấm/phẩy'],
    ];

    // Append notes below
    const endRow = templateData.length + 2;
    noteData.forEach((row, i) => {
        XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: endRow + i, c: 0 } });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dự trù kinh phí');
    XLSX.writeFile(wb, 'template_du_tru_kinh_phi.xlsx');
}

export default function BudgetEstimateTable({ projectId, refreshKey, onRefresh }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [importModal, setImportModal] = useState(false);
    const [importRows, setImportRows] = useState([]);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const printRef = useRef(null);
    const fileRef = useRef(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/budget/variance?projectId=${projectId}&planType=budget`)
            .then(r => r.json())
            .then(setData)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [projectId, refreshKey]);

    // Parse Excel file
    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportError('');

        try {
            const mod = await import('xlsx');
            const XLSX = mod.default || mod;
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(ws, { defval: '' });

            if (json.length === 0) {
                setImportError('File không có dữ liệu hoặc sai định dạng.');
                return;
            }

            // Fetch products for matching
            const prodRes = await fetch('/api/products?limit=1000');
            const prodJson = await prodRes.json();
            const products = prodJson.data || prodJson || [];

            const matchProduct = (name) => {
                if (!name) return null;
                const n = name.toLowerCase().trim();
                return products.find(p =>
                    p.name.toLowerCase() === n ||
                    p.name.toLowerCase().includes(n) ||
                    n.includes(p.name.toLowerCase())
                ) || null;
            };

            const rows = [];
            for (const row of json) {
                const name = String(row['TÊN HẠNG MỤC'] || row['Tên hạng mục'] || row['name'] || '').trim();
                const unit = String(row['ĐVT'] || row['Đơn vị'] || row['unit'] || '').trim();
                const qty = Number(row['SL'] || row['Số lượng'] || row['quantity'] || 0);
                const price = Number(row['ĐƠN GIÁ'] || row['Đơn giá'] || row['unitPrice'] || 0);
                const group1 = String(row['GIAI ĐOẠN'] || row['Giai đoạn'] || row['group1'] || '').trim();
                const group2 = String(row['KHÔNG GIAN'] || row['Không gian'] || row['group2'] || '').trim();
                const costType = String(row['LOẠI CHI PHÍ'] || row['Loại chi phí'] || row['costType'] || 'Vật tư').trim();
                const supplierTag = String(row['NCC'] || row['supplierTag'] || '').trim();

                if (!name || name.startsWith('---')) continue;

                const matched = matchProduct(name);
                rows.push({
                    name,
                    unit: matched?.unit || unit,
                    qty,
                    price: matched?.importPrice || price,
                    group1,
                    group2,
                    costType: ['Vật tư', 'Nhân công', 'Thầu phụ', 'Khác'].includes(costType) ? costType : 'Vật tư',
                    supplierTag,
                    productId: matched?.id || '',
                    matched: !!matched,
                    _key: Math.random(),
                });
            }

            if (rows.length === 0) {
                setImportError('Không tìm thấy dữ liệu hợp lệ. Kiểm tra lại tên cột theo template.');
                return;
            }

            setImportRows(rows);
            setImportModal(true);
        } catch (err) {
            setImportError('Lỗi đọc file: ' + err.message);
        }

        if (fileRef.current) fileRef.current.value = '';
    };

    const handleConfirmImport = async () => {
        const validRows = importRows.filter(r => r.productId && r.qty > 0);
        if (validRows.length === 0) {
            alert('Không có hàng nào khớp sản phẩm. Hãy kiểm tra tên hàng mục trong file.');
            return;
        }
        setImporting(true);
        try {
            const res = await fetch('/api/material-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    source: 'Import Excel dự trù',
                    items: validRows.map(r => ({
                        productId: r.productId,
                        quantity: r.qty,
                        unitPrice: r.price,
                        costType: r.costType,
                        group1: r.group1,
                        group2: r.group2,
                        supplierTag: r.supplierTag,
                        planType: 'budget',
                    })),
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Lỗi tạo');
            setImportModal(false);
            setImportRows([]);
            onRefresh?.();
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
        setImporting(false);
    };

    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank');
        win.document.write(`
            <html><head><title>Dự trù kinh phí</title>
            <style>
                body { font-family: 'Times New Roman', serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #888; padding: 6px 8px; }
                .g1 { background: #fde68a; font-weight: bold; }
                .g2 { background: #fce4d6; font-weight: 600; }
                .total-row td { background: #1e3a5f; color: white; font-weight: bold; }
                .header-row th { background: #1e3a5f; color: white; font-weight: bold; text-align: center; }
                @media print { body { margin: 10px; } }
            </style>
            </head><body>${content}</body></html>
        `);
        win.document.close();
        win.print();
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa hạng mục này khỏi dự toán?')) return;
        try {
            await fetch(`/api/material-plans/${id}`, { method: 'DELETE' });
            onRefresh?.();
        } catch { alert('Lỗi xóa'); }
    };

    const handleDeleteAll = async () => {
        if (!data?.items?.length) return;
        if (!confirm(`Xóa toàn bộ ${data.items.length} hạng mục trong bảng dự toán? Hành động không thể hoàn tác.`)) return;
        setDeleting(true);
        try {
            await Promise.all(data.items.map(item => fetch(`/api/material-plans/${item.id}`, { method: 'DELETE' })));
            onRefresh?.();
        } catch { alert('Lỗi xóa'); }
        setDeleting(false);
    };

    // Build table rows from data
    const buildRows = (items) => {
        const hierarchy = {};
        items.forEach(item => {
            const g1 = item.group1 || 'Chưa phân loại';
            const g2 = item.group2 || '';
            if (!hierarchy[g1]) hierarchy[g1] = { items: [], subgroups: {} };
            if (g2) {
                if (!hierarchy[g1].subgroups[g2]) hierarchy[g1].subgroups[g2] = [];
                hierarchy[g1].subgroups[g2].push(item);
            } else {
                hierarchy[g1].items.push(item);
            }
        });

        const rows = [];
        let grandTotal = 0;
        Object.entries(hierarchy).forEach(([g1Name, g1Data], g1Idx) => {
            const allItems = [...g1Data.items, ...Object.values(g1Data.subgroups).flat()];
            const g1Total = allItems.reduce((s, i) => s + i.budgetTotal, 0);
            grandTotal += g1Total;
            rows.push({ type: 'group1', stt: ALPHA[g1Idx], name: g1Name, total: g1Total });
            g1Data.items.forEach((item, i) => rows.push({ type: 'item', id: item.id, stt: i + 1, name: item.productName, unit: item.unit, qty: item.budgetQty, price: item.budgetUnitPrice, total: item.budgetTotal }));
            Object.entries(g1Data.subgroups).forEach(([g2Name, g2Items], g2Idx) => {
                const g2Total = g2Items.reduce((s, i) => s + i.budgetTotal, 0);
                rows.push({ type: 'group2', stt: ROMAN[g2Idx], name: g2Name, total: g2Total });
                g2Items.forEach((item, i) => rows.push({ type: 'item', id: item.id, stt: i + 1, name: item.productName, unit: item.unit, qty: item.budgetQty, price: item.budgetUnitPrice, total: item.budgetTotal }));
            });
        });
        return { rows, grandTotal };
    };

    const renderMainTable = (rows, grandTotal) => (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
                <tr className="header-row">
                    {['STT', 'TÊN HẠNG MỤC', 'ĐVT', 'SL', 'ĐƠN GIÁ', 'THÀNH TIỀN', ''].map((h, i) => (
                        <th key={i} style={{ ...STYLES.cell, ...STYLES.header, width: h === 'STT' ? 50 : h === 'ĐVT' ? 60 : h === 'SL' ? 60 : h === 'ĐƠN GIÁ' ? 110 : h === 'THÀNH TIỀN' ? 130 : h === '' ? 36 : 'auto' }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, idx) => {
                    if (row.type === 'group1') return (
                        <tr key={idx} className="g1" style={STYLES.group1}>
                            <td style={{ ...STYLES.cell, textAlign: 'center' }}>{row.stt}</td>
                            <td style={{ ...STYLES.cell, textTransform: 'uppercase' }}>{row.name}</td>
                            <td style={STYLES.cell} /><td style={STYLES.cell} /><td style={STYLES.cell} />
                            <td style={{ ...STYLES.cell, textAlign: 'right', fontWeight: 700 }}>{fmt(row.total)}</td>
                            <td style={STYLES.cell} />
                        </tr>
                    );
                    if (row.type === 'group2') return (
                        <tr key={idx} className="g2" style={STYLES.group2}>
                            <td style={{ ...STYLES.cell, textAlign: 'center' }}>{row.stt}</td>
                            <td style={{ ...STYLES.cell, paddingLeft: 20, fontStyle: 'italic' }}>{row.name}</td>
                            <td style={STYLES.cell} /><td style={STYLES.cell} /><td style={STYLES.cell} />
                            <td style={{ ...STYLES.cell, textAlign: 'right' }}>{fmt(row.total)}</td>
                            <td style={STYLES.cell} />
                        </tr>
                    );
                    return (
                        <tr key={idx} style={STYLES.item}>
                            <td style={{ ...STYLES.cell, textAlign: 'center', color: '#666' }}>{row.stt}</td>
                            <td style={{ ...STYLES.cell, paddingLeft: 28 }}>{row.name}</td>
                            <td style={{ ...STYLES.cell, textAlign: 'center' }}>{row.unit}</td>
                            <td style={{ ...STYLES.cell, textAlign: 'right' }}>{row.qty}</td>
                            <td style={{ ...STYLES.cell, textAlign: 'right' }}>{fmt(row.price)}</td>
                            <td style={{ ...STYLES.cell, textAlign: 'right', fontWeight: 600 }}>{fmt(row.total)}</td>
                            <td style={{ ...STYLES.cell, textAlign: 'center', padding: '4px' }} className="no-print">
                                <button onClick={() => handleDelete(row.id)}
                                    title="Xóa hạng mục"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}>🗑</button>
                            </td>
                        </tr>
                    );
                })}
                <tr className="total-row" style={STYLES.total}>
                    <td colSpan={6} style={{ ...STYLES.cell, textAlign: 'center', letterSpacing: 1 }}>TỔNG CỘNG</td>
                    <td style={{ ...STYLES.cell, textAlign: 'right', fontSize: 14 }}>{fmt(grandTotal)}</td>
                </tr>
            </tbody>
        </table>
    );

    const isEmpty = !data?.items?.length;
    const { rows: tableRows, grandTotal } = isEmpty ? { rows: [], grandTotal: 0 } : buildRows(data.items);
    const matchedCount = importRows.filter(r => r.matched).length;
    const unmatchedCount = importRows.filter(r => !r.matched).length;

    return (
        <div>
            {/* Actions bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {isEmpty ? 'Chưa có dữ liệu' : <>{data.items.length} hạng mục · <strong style={{ color: 'var(--accent-primary)' }}>{fmt(grandTotal)}đ</strong></>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {/* Template download */}
                    <button onClick={downloadTemplate}
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #16a34a', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📥 Tải template Excel
                    </button>
                    {/* Import Excel */}
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ display: 'none' }} id="budget-excel-upload" />
                    <label htmlFor="budget-excel-upload"
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #2563eb', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📊 Nhập từ Excel
                    </label>
                    {/* Print */}
                    {!isEmpty && (
                        <button onClick={handlePrint}
                            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                            🖨️ In / PDF
                        </button>
                    )}
                    {/* Delete all */}
                    {!isEmpty && (
                        <button onClick={handleDeleteAll} disabled={deleting}
                            style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #ef4444', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5, opacity: deleting ? 0.6 : 1 }}>
                            {deleting ? '⏳' : '🗑'} Xóa tất cả
                        </button>
                    )}
                </div>
            </div>

            {importError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#dc2626' }}>
                    ⚠️ {importError}
                </div>
            )}

            {/* Table or empty */}
            {isEmpty ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border-light)', borderRadius: 10 }}>
                    Chưa có dữ liệu dự toán.<br />
                    <span style={{ fontSize: 12 }}>Thêm dự toán vật tư hoặc nhập từ Excel bằng nút bên trên.</span>
                </div>
            ) : (
                <div ref={printRef} style={{ overflowX: 'auto' }}>
                    {renderMainTable(tableRows, grandTotal)}
                </div>
            )}

            {/* Import preview modal */}
            {importModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setImportModal(false)}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: 16 }}>📊 Xem trước dữ liệu import</h3>
                            <button onClick={() => setImportModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        {/* Summary */}
                        <div style={{ padding: '12px 20px', display: 'flex', gap: 16, borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13 }}>Tổng: <strong>{importRows.length} dòng</strong></span>
                            <span style={{ fontSize: 13, color: '#16a34a' }}>✅ Khớp SP: <strong>{matchedCount}</strong></span>
                            {unmatchedCount > 0 && <span style={{ fontSize: 13, color: '#d97706' }}>⚠️ Không khớp: <strong>{unmatchedCount}</strong> (sẽ bỏ qua)</span>}
                        </div>

                        {/* Preview table */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                        {['', 'Tên hạng mục', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền', 'Giai đoạn', 'Không gian', 'Loại CP'].map(h => (
                                            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {importRows.map((row, idx) => (
                                        <tr key={row._key} style={{ background: row.matched ? 'rgba(22,163,74,0.04)' : 'rgba(245,158,11,0.06)', borderBottom: '1px solid var(--border-light)' }}>
                                            <td style={{ padding: '6px', fontSize: 14 }}>{row.matched ? '✅' : '⚠️'}</td>
                                            <td style={{ padding: '6px', fontWeight: row.matched ? 500 : 400, color: row.matched ? 'var(--text-primary)' : '#d97706' }}>{row.name}</td>
                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.unit}</td>
                                            <td style={{ padding: '6px', textAlign: 'right' }}>{row.qty}</td>
                                            <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(row.price)}</td>
                                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>{fmt(row.qty * row.price)}</td>
                                            <td style={{ padding: '6px', fontSize: 11, color: 'var(--text-muted)' }}>{row.group1}</td>
                                            <td style={{ padding: '6px', fontSize: 11, color: 'var(--text-muted)' }}>{row.group2}</td>
                                            <td style={{ padding: '6px', fontSize: 11 }}>{row.costType}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {unmatchedCount > 0 && 'Các dòng ⚠️ không có trong danh mục sản phẩm sẽ bị bỏ qua.'}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setImportModal(false)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
                                <button onClick={handleConfirmImport} disabled={importing || matchedCount === 0}
                                    style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: matchedCount > 0 ? '#2563eb' : '#e5e7eb', color: matchedCount > 0 ? 'white' : '#9ca3af', cursor: matchedCount > 0 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}>
                                    {importing ? '⏳ Đang tạo...' : `✅ Tạo ${matchedCount} hạng mục`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
