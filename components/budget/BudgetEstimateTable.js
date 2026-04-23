'use client';
import { useState, useEffect, useRef } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const STYLES = {
    cell: { border: '1px solid #c0c0c0', padding: '5px 7px' },
    header: { background: '#1e3a5f', color: 'white', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', fontSize: 11 },
    group1: { background: '#fde68a', fontWeight: 700, fontSize: 13 },
    group2: { background: '#fce4d6', fontWeight: 600, fontSize: 12 },
    item: { background: '#ffffff', fontSize: 12 },
    total: { background: '#1e3a5f', color: 'white', fontWeight: 700, fontSize: 13 },
};

const profitColor = (val) => val > 0 ? '#16a34a' : val < 0 ? '#dc2626' : '#6b7280';

// ─── Detect báo giá format (có cột HẠNG MỤC thay vì TÊN HẠNG MỤC) ──────────
function detectQuotationFormat(XLSX, ws) {
    if (!ws || !ws['!ref']) return false;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 0; r <= Math.min(8, range.e.r); r++) {
        for (let c = 0; c <= Math.min(6, range.e.c); c++) {
            const cell = ws[XLSX.utils.encode_cell({ r, c })];
            if (cell && String(cell.v || '').trim() === 'HẠNG MỤC') return true;
        }
    }
    return false;
}

// ─── Parse báo giá nội thất (Tầng → Phòng → Hạng mục → Phụ kiện) ───────────
function parseQuotationFormat(XLSX, ws) {
    if (!ws || !ws['!ref']) return [];
    const range = XLSX.utils.decode_range(ws['!ref']);

    const gc = (r, c) => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        return cell ? String(cell.v ?? '').trim() : '';
    };
    const gn = (r, c) => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        return cell ? (Number(cell.v) || 0) : 0;
    };

    // Tìm hàng header để xác định vị trí cột
    let dataStart = 6;
    let cName = 1, cMat = 2, cDvt = 7, cQty = 8, cPrice = 9;

    for (let r = 0; r <= Math.min(8, range.e.r); r++) {
        for (let c = 0; c <= range.e.c; c++) {
            if (gc(r, c) === 'HẠNG MỤC') {
                cName = c;
                dataStart = r + 2; // bỏ qua header + sub-header (Dài/Sâu/Cao)
                for (let cc = 0; cc <= range.e.c; cc++) {
                    const h = gc(r, cc).toUpperCase();
                    if (h === 'CHẤT LIỆU') cMat = cc;
                    else if (h === 'ĐVT') cDvt = cc;
                    else if (h.includes('KHỐI LƯỢNG')) cQty = cc;
                    else if (h.includes('ĐƠN GIÁ')) cPrice = cc;
                }
                break;
            }
        }
    }

    const rows = [];
    let g1 = '', g2 = '';

    for (let r = dataStart; r <= range.e.r; r++) {
        const stt  = gc(r, 0);
        const col1 = gc(r, cName).replace(/^\s+/, ''); // HẠNG MỤC (bỏ indent)
        const col2 = gc(r, cMat);                       // CHẤT LIỆU (dùng làm tên phụ kiện)
        const dvt  = gc(r, cDvt);
        const qty  = gn(r, cQty);
        const price = gn(r, cPrice);

        if (!stt && !col1 && !col2) continue;

        const textAll = (col1 + col2).toUpperCase();
        if (
            textAll.includes('TỔNG CỘNG') ||
            textAll.includes('THUẾ') ||
            textAll.includes('BÁO GIÁ') ||
            textAll.includes('KÍNH GỬI') ||
            textAll.includes('CÔNG TY') ||
            textAll.includes('KÍCH THƯỚC') ||
            textAll.includes('ĐƠN VỊ M')
        ) continue;

        // Tầng: STT là A, B, C...
        if (/^[A-Z]$/.test(stt)) {
            g1 = col2 || col1;
            g2 = '';
            continue;
        }

        // Phòng / khu vực: STT là Roman (I, II, II.1...)
        const romanBase = stt.split('.')[0].toUpperCase();
        if (ROMAN.includes(romanBase) && isNaN(Number(stt))) {
            g2 = col1 || col2;
            continue;
        }

        // Bỏ qua hàng không có giá hoặc không có số lượng
        if (price <= 0 || qty <= 0) continue;

        // Hạng mục hoặc phụ kiện
        const name = col1 || col2;
        if (!name) continue;

        rows.push({
            name,
            unit: dvt || 'cái',
            qty,
            salePrice: price,
            price: Math.round(price * 0.65),
            group1: g1,
            group2: g2,
            costType: 'Vật tư',
            productId: '',
            customName: name,
            isQuotationItem: true,
            _key: Math.random(),
        });
    }

    return rows;
}

// ─── Download template ────────────────────────────────────────────────────────
async function downloadTemplate() {
    const mod = await import('xlsx');
    const XLSX = mod.default || mod;
    const templateData = [
        ['TÊN HẠNG MỤC', 'ĐVT', 'SL', 'ĐG DT', 'ĐƠN GIÁ XƯỞNG', 'GIAI ĐOẠN', 'KHÔNG GIAN', 'LOẠI CHI PHÍ', 'NCC'],
        ['(VD) Tủ áo gỗ MFC 2 cánh', 'bộ', 2, 18000000, 12000000, 'Nội thất gỗ', 'Phòng ngủ', 'Vật tư', 'Công ty cấp'],
        ['(VD) Gạch ốp lát 60x60', 'm2', 80, 250000, 180000, 'Phần hoàn thiện', 'Phòng khách', 'Vật tư', ''],
        ['(VD) Nhân công lắp đặt', 'm2', 120, 85000, 60000, 'Phần hoàn thiện', '', 'Nhân công', 'Thầu phụ cấp'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [{ wch: 45 }, { wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
    const notes = [
        [], ['--- HƯỚNG DẪN ---'],
        ['ĐG DT: Đơn giá bán cho khách hàng'], ['ĐƠN GIÁ XƯỞNG: Đơn giá giao xưởng'],
        ['GIAI ĐOẠN: Phần thô | Phần hoàn thiện | Nội thất gỗ | M&E | Ngoại thất'],
        ['LOẠI CHI PHÍ: Vật tư | Nhân công | Thầu phụ | Khác'],
    ];
    notes.forEach((row, i) => XLSX.utils.sheet_add_aoa(ws, [row], { origin: { r: templateData.length + 2 + i, c: 0 } }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dự trù kinh phí');
    XLSX.writeFile(wb, 'template_du_tru_kinh_phi.xlsx');
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function BudgetEstimateTable({ projectId, refreshKey, onRefresh }) {
    const [data, setData]               = useState(null);
    const [loading, setLoading]         = useState(true);
    const [importModal, setImportModal] = useState(false);
    const [importRows, setImportRows]   = useState([]);
    const [importing, setImporting]     = useState(false);
    const [importError, setImportError] = useState('');
    const [deleting, setDeleting]       = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue]     = useState('');
    // Excel workbook state
    const xlsxWbRef                     = useRef(null);
    const [sheetNames, setSheetNames]   = useState([]);
    const [activeSheet, setActiveSheet] = useState('');
    const [importFormat, setImportFormat] = useState('standard'); // 'standard' | 'quotation'

    const printRef = useRef(null);
    const fileRef  = useRef(null);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/budget/variance?projectId=${projectId}&planType=budget`)
            .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
    }, [projectId, refreshKey]);

    // ─── Parse & hiển thị preview ──────────────────────────────────────────
    const parseAndPreview = async (XLSX, ws, format) => {
        if (format === 'quotation') {
            const rows = parseQuotationFormat(XLSX, ws);
            if (rows.length === 0) { setImportError('Không đọc được dữ liệu từ sheet này.'); return; }
            setImportRows(rows);
            setImportFormat('quotation');
            setImportModal(true);
        } else {
            // Standard template format — cần match sản phẩm DB
            const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
            if (json.length === 0) { setImportError('File không có dữ liệu hoặc sai định dạng.'); return; }

            const prodRes = await fetch('/api/products?limit=1000');
            const prodJson = await prodRes.json();
            const products = prodJson.data || prodJson || [];
            const matchProduct = (name) => {
                if (!name) return null;
                const n = name.toLowerCase().trim();
                return products.find(p => p.name.toLowerCase() === n || p.name.toLowerCase().includes(n) || n.includes(p.name.toLowerCase())) || null;
            };

            const rows = [];
            for (const row of json) {
                const name      = String(row['TÊN HẠNG MỤC'] || row['Tên hạng mục'] || row['name'] || '').trim();
                const unit      = String(row['ĐVT'] || row['unit'] || '').trim();
                const qty       = Number(row['SL'] || row['quantity'] || 0);
                const salePrice = Number(row['ĐG DT'] || row['salePrice'] || 0);
                const price     = Number(row['ĐƠN GIÁ XƯỞNG'] || row['ĐƠN GIÁ'] || row['unitPrice'] || 0);
                const group1    = String(row['GIAI ĐOẠN'] || row['group1'] || '').trim();
                const group2    = String(row['KHÔNG GIAN'] || row['group2'] || '').trim();
                const costType  = String(row['LOẠI CHI PHÍ'] || row['costType'] || 'Vật tư').trim();
                const supplierTag = String(row['NCC'] || row['supplierTag'] || '').trim();
                if (!name || name.startsWith('---')) continue;
                const matched = matchProduct(name);
                rows.push({
                    name, unit: matched?.unit || unit, qty,
                    price: matched?.importPrice || price, salePrice,
                    group1, group2,
                    costType: ['Vật tư', 'Nhân công', 'Thầu phụ', 'Khác'].includes(costType) ? costType : 'Vật tư',
                    supplierTag,
                    productId: matched?.id || '', matched: !!matched,
                    _key: Math.random(),
                });
            }
            if (rows.length === 0) { setImportError('Không tìm thấy dữ liệu hợp lệ. Kiểm tra tên cột theo template.'); return; }
            setImportRows(rows);
            setImportFormat('standard');
            setImportModal(true);
        }
    };

    // ─── Xử lý file Excel upload ────────────────────────────────────────────
    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportError('');
        try {
            const mod = await import('xlsx');
            const XLSX = mod.default || mod;
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf);
            xlsxWbRef.current = wb;

            const validSheets = wb.SheetNames.filter(n => wb.Sheets[n]?.['!ref']);
            setSheetNames(validSheets);

            // Auto-chọn sheet có nhiều dòng nhất
            let bestSheet = validSheets[0];
            let bestRows = 0;
            for (const name of validSheets) {
                const ws = wb.Sheets[name];
                if (!ws['!ref']) continue;
                const r = XLSX.utils.decode_range(ws['!ref']).e.r;
                if (r > bestRows) { bestRows = r; bestSheet = name; }
            }
            setActiveSheet(bestSheet);

            const ws = wb.Sheets[bestSheet];
            const fmt = detectQuotationFormat(XLSX, ws) ? 'quotation' : 'standard';
            await parseAndPreview(XLSX, ws, fmt);
        } catch (err) {
            setImportError('Lỗi đọc file: ' + err.message);
        }
        if (fileRef.current) fileRef.current.value = '';
    };

    // ─── Đổi sheet trong modal ──────────────────────────────────────────────
    const handleSheetChange = async (sheetName) => {
        if (!xlsxWbRef.current || sheetName === activeSheet) return;
        setActiveSheet(sheetName);
        const mod = await import('xlsx');
        const XLSX = mod.default || mod;
        const ws = xlsxWbRef.current.Sheets[sheetName];
        if (!ws || !ws['!ref']) { setImportError('Sheet này trống.'); return; }
        const fmt = detectQuotationFormat(XLSX, ws) ? 'quotation' : 'standard';
        await parseAndPreview(XLSX, ws, fmt);
    };

    // ─── Confirm import ─────────────────────────────────────────────────────
    const handleConfirmImport = async () => {
        const validRows = importFormat === 'quotation'
            ? importRows.filter(r => r.qty > 0 && r.salePrice > 0)
            : importRows.filter(r => r.productId && r.qty > 0);

        if (validRows.length === 0) {
            alert(importFormat === 'quotation'
                ? 'Không có hàng nào có giá hợp lệ.'
                : 'Không có hàng nào khớp sản phẩm. Kiểm tra tên hàng mục trong file.');
            return;
        }
        setImporting(true);
        try {
            const res = await fetch('/api/material-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    source: importFormat === 'quotation' ? 'Import Báo giá Excel' : 'Import Excel dự trù',
                    items: validRows.map(r => ({
                        productId:   r.productId || null,
                        customName:  r.customName || r.name,
                        quantity:    r.qty,
                        unitPrice:   r.price || 0,
                        salePrice:   r.salePrice || 0,
                        costType:    r.costType || 'Vật tư',
                        group1:      r.group1 || '',
                        group2:      r.group2 || '',
                        supplierTag: r.supplierTag || '',
                        unit:        r.unit || '',
                        planType:    'budget',
                    })),
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Lỗi tạo');
            setImportModal(false);
            setImportRows([]);
            xlsxWbRef.current = null;
            setSheetNames([]);
            onRefresh?.();
        } catch (err) { alert('Lỗi: ' + err.message); }
        setImporting(false);
    };

    // ─── Inline editable cell ───────────────────────────────────────────────
    const handleCellEdit = (id, field, val) => { setEditingCell({ id, field }); setEditValue(String(val || '0')); };

    const handleCellSave = async () => {
        if (!editingCell) return;
        const { id, field } = editingCell;
        setEditingCell(null);
        const numVal = parseFloat(String(editValue).replace(/[^\d.]/g, '')) || 0;
        try {
            await fetch(`/api/material-plans/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: numVal }),
            });
            onRefresh?.();
        } catch { alert('Lỗi lưu'); }
    };

    const renderEditCell = (id, field, value, tip) => {
        if (editingCell?.id === id && editingCell?.field === field) {
            return (
                <input autoFocus type="number" value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={handleCellSave}
                    onKeyDown={e => { if (e.key === 'Enter') handleCellSave(); if (e.key === 'Escape') setEditingCell(null); }}
                    style={{ width: '100%', border: '1px solid #2563eb', borderRadius: 4, padding: '2px 4px', fontSize: 12, textAlign: 'right', boxSizing: 'border-box' }}
                />
            );
        }
        return (
            <span onClick={() => handleCellEdit(id, field, value)} title={tip || 'Nhấn để sửa'}
                style={{ cursor: 'pointer', display: 'block', textAlign: 'right', textDecoration: 'underline dotted #bbb' }}>
                {value > 0 ? fmt(value) : <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: 11 }}>nhập...</span>}
            </span>
        );
    };

    // ─── Print ──────────────────────────────────────────────────────────────
    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Dự trù kinh phí</title>
            <style>body{font-family:'Times New Roman',serif;margin:20px}table{width:100%;border-collapse:collapse}
            th,td{border:1px solid #888;padding:5px 6px;font-size:10px}.g1{background:#fde68a;font-weight:bold}
            .g2{background:#fce4d6;font-weight:600}.total-row td{background:#1e3a5f;color:white;font-weight:bold}
            .header-row th{background:#1e3a5f;color:white;font-weight:bold;text-align:center}
            .no-print{display:none!important}@media print{body{margin:10px}}</style>
            </head><body>${content}</body></html>`);
        win.document.close(); win.print();
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa hạng mục này khỏi dự toán?')) return;
        try { await fetch(`/api/material-plans/${id}`, { method: 'DELETE' }); onRefresh?.(); } catch { alert('Lỗi xóa'); }
    };

    const handleDeleteAll = async () => {
        if (!data?.items?.length) return;
        if (!confirm(`Xóa toàn bộ ${data.items.length} hạng mục? Không thể hoàn tác.`)) return;
        setDeleting(true);
        try { await Promise.all(data.items.map(i => fetch(`/api/material-plans/${i.id}`, { method: 'DELETE' }))); onRefresh?.(); }
        catch { alert('Lỗi xóa'); }
        setDeleting(false);
    };

    // ─── Build rows ─────────────────────────────────────────────────────────
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
        let grandDT = 0, grandXuong = 0, grandActual = 0;

        const totals = (arr) => arr.reduce((a, i) => {
            const qty = Number(i.budgetQty) || 0;
            a.dt     += qty * (Number(i.salePrice) || 0);
            a.xuong  += qty * (Number(i.budgetUnitPrice) || 0);
            a.actual += Number(i.actualCost) || 0;
            return a;
        }, { dt: 0, xuong: 0, actual: 0 });

        Object.entries(hierarchy).forEach(([g1Name, g1Data], g1Idx) => {
            const allItems = [...g1Data.items, ...Object.values(g1Data.subgroups).flat()];
            const { dt, xuong, actual } = totals(allItems);
            grandDT += dt; grandXuong += xuong; grandActual += actual;

            rows.push({ type: 'group1', stt: ALPHA[g1Idx], name: g1Name, totalDT: dt, totalXuong: xuong, totalActual: actual });

            g1Data.items.forEach((item, i) => {
                const qty = Number(item.budgetQty) || 0;
                const sp = Number(item.salePrice) || 0;
                const wp = Number(item.budgetUnitPrice) || 0;
                const ac = Number(item.actualCost) || 0;
                rows.push({ type: 'item', id: item.id, stt: i + 1, name: item.productName, unit: item.unit, qty, salePrice: sp, workshopPrice: wp, actualCost: ac, totalDT: qty * sp, totalXuong: qty * wp });
            });

            Object.entries(g1Data.subgroups).forEach(([g2Name, g2Items], g2Idx) => {
                const { dt: d2, xuong: x2, actual: a2 } = totals(g2Items);
                rows.push({ type: 'group2', stt: ROMAN[g2Idx], name: g2Name, totalDT: d2, totalXuong: x2, totalActual: a2 });
                g2Items.forEach((item, i) => {
                    const qty = Number(item.budgetQty) || 0;
                    const sp = Number(item.salePrice) || 0;
                    const wp = Number(item.budgetUnitPrice) || 0;
                    const ac = Number(item.actualCost) || 0;
                    rows.push({ type: 'item', id: item.id, stt: i + 1, name: item.productName, unit: item.unit, qty, salePrice: sp, workshopPrice: wp, actualCost: ac, totalDT: qty * sp, totalXuong: qty * wp });
                });
            });
        });

        return { rows, grandDT, grandXuong, grandActual };
    };

    // ─── Summary panel ──────────────────────────────────────────────────────
    const renderSummary = (dt, xuong, actual) => {
        const laiKD = dt - xuong, laiXuong = xuong - actual, tongLN = dt - actual;
        const hasDT = dt > 0, hasActual = actual > 0;
        const card = (label, val, color, note) => (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '11px 15px', flex: 1, minWidth: 130 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                {note ? <div style={{ fontSize: 12, fontStyle: 'italic', color: '#9ca3af' }}>{note}</div>
                      : <div style={{ fontSize: 14, fontWeight: 700, color: color || 'var(--text-primary)' }}>{fmt(val)}đ</div>}
            </div>
        );
        return (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {card('Tổng doanh thu', dt, '#1e3a5f', !hasDT ? 'Chưa nhập ĐG DT' : null)}
                {card('Tổng giá xưởng', xuong, '#92400e')}
                {card('Tổng chi phí thực', actual, '#374151', !hasActual ? 'Chưa có chi phí' : null)}
                {card('Lợi nhuận KD', laiKD, hasDT ? profitColor(laiKD) : null, !hasDT ? 'Chưa nhập ĐG DT' : null)}
                {card('Lợi nhuận xưởng', laiXuong, hasActual ? profitColor(laiXuong) : null, !hasActual ? 'Chưa có chi phí' : null)}
                {card('Tổng lợi nhuận', tongLN, (hasDT && hasActual) ? profitColor(tongLN) : null, (!hasDT || !hasActual) ? 'Chưa đủ dữ liệu' : null)}
            </div>
        );
    };

    // ─── Main table ─────────────────────────────────────────────────────────
    const COL = { stt: 44, dvt: 52, sl: 48, price: 100, total: 110, profit: 100, del: 36 };

    const renderMainTable = (rows, dt, xuong, actual) => {
        const grandLaiKD = dt - xuong, grandLaiXuong = xuong - actual;
        const hasDT = dt > 0, hasActual = actual > 0;

        const groupCells = (row, paddingLeft) => {
            const laiKD = row.totalDT - row.totalXuong;
            const laiXuong = row.totalXuong - row.totalActual;
            const rHasDT = row.totalDT > 0, rHasActual = row.totalActual > 0;
            return (<>
                <td style={{ ...STYLES.cell, textAlign: 'center' }}>{row.stt}</td>
                <td style={{ ...STYLES.cell, paddingLeft, textTransform: paddingLeft ? undefined : 'uppercase', fontStyle: paddingLeft ? 'italic' : undefined }} colSpan={3}>{row.name}</td>
                <td style={STYLES.cell} />
                <td style={{ ...STYLES.cell, textAlign: 'right' }}>{rHasDT ? fmt(row.totalDT) : '—'}</td>
                <td style={STYLES.cell} />
                <td style={{ ...STYLES.cell, textAlign: 'right' }}>{fmt(row.totalXuong)}</td>
                <td style={{ ...STYLES.cell, textAlign: 'right' }}>{rHasActual ? fmt(row.totalActual) : '—'}</td>
                <td style={{ ...STYLES.cell, textAlign: 'right', color: rHasDT ? profitColor(laiKD) : '#9ca3af' }}>{rHasDT ? fmt(laiKD) : '—'}</td>
                <td style={{ ...STYLES.cell, textAlign: 'right', color: rHasActual ? profitColor(laiXuong) : '#9ca3af' }}>{rHasActual ? fmt(laiXuong) : '—'}</td>
                <td style={STYLES.cell} />
            </>);
        };

        return (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                    <tr className="header-row">
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.stt }}>STT</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header }}>TÊN HẠNG MỤC</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.dvt }}>ĐVT</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.sl }}>SL</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.price }} title="Đơn giá bán cho khách hàng">ĐG DT</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.total }}>Tổng DT</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.price }}>ĐG Xưởng</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.total }}>Tổng Xưởng</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.total }}>Chi phí thực</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.profit, cursor: 'help' }} title="Lãi KD = Doanh thu – Giá giao xưởng">Lãi KD ⓘ</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.profit, cursor: 'help' }} title="Lãi Xưởng = Giá xưởng – Chi phí thực">Lãi Xưởng ⓘ</th>
                        <th style={{ ...STYLES.cell, ...STYLES.header, width: COL.del }} />
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => {
                        if (row.type === 'group1') return <tr key={idx} className="g1" style={STYLES.group1}>{groupCells(row, undefined)}</tr>;
                        if (row.type === 'group2') return <tr key={idx} className="g2" style={STYLES.group2}>{groupCells(row, 20)}</tr>;

                        const laiKD = row.totalDT - row.totalXuong;
                        const laiXuong = row.totalXuong - row.actualCost;
                        const hasSP = row.salePrice > 0, hasWP = row.workshopPrice > 0, hasAC = row.actualCost > 0;

                        return (
                            <tr key={idx} style={STYLES.item}>
                                <td style={{ ...STYLES.cell, textAlign: 'center', color: '#666' }}>{row.stt}</td>
                                <td style={{ ...STYLES.cell, paddingLeft: 28 }}>{row.name}</td>
                                <td style={{ ...STYLES.cell, textAlign: 'center' }}>{row.unit}</td>
                                <td style={{ ...STYLES.cell, textAlign: 'right' }}>{row.qty}</td>
                                <td style={{ ...STYLES.cell, padding: '3px 6px' }}>{renderEditCell(row.id, 'salePrice', row.salePrice, 'Nhấn để sửa ĐG DT')}</td>
                                <td style={{ ...STYLES.cell, textAlign: 'right', fontWeight: 600 }}>
                                    {hasSP ? fmt(row.totalDT) : <span style={{ color: '#9ca3af', fontSize: 11, fontStyle: 'italic' }}>Chưa có giá DT</span>}
                                </td>
                                <td style={{ ...STYLES.cell, textAlign: 'right', color: hasWP ? 'inherit' : '#9ca3af', fontStyle: hasWP ? undefined : 'italic', fontSize: hasWP ? undefined : 11 }}>
                                    {hasWP ? fmt(row.workshopPrice) : 'Chưa có'}
                                </td>
                                <td style={{ ...STYLES.cell, textAlign: 'right', fontWeight: 600 }}>{fmt(row.totalXuong)}</td>
                                <td style={{ ...STYLES.cell, padding: '3px 6px' }}>{renderEditCell(row.id, 'actualCost', row.actualCost, 'Nhấn để sửa Chi phí thực')}</td>
                                <td style={{ ...STYLES.cell, textAlign: 'right', fontWeight: 600, color: hasSP ? profitColor(laiKD) : '#9ca3af' }}>
                                    {hasSP ? fmt(laiKD) : <span style={{ fontSize: 11, fontWeight: 400 }}>—</span>}
                                </td>
                                <td style={{ ...STYLES.cell, textAlign: 'right', fontWeight: 600, color: hasAC ? profitColor(laiXuong) : '#9ca3af' }}>
                                    {hasAC ? fmt(laiXuong) : <span style={{ fontSize: 11, fontWeight: 400 }}>—</span>}
                                </td>
                                <td style={{ ...STYLES.cell, textAlign: 'center', padding: '4px' }} className="no-print">
                                    <button onClick={() => handleDelete(row.id)} title="Xóa hạng mục"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}>🗑</button>
                                </td>
                            </tr>
                        );
                    })}
                    <tr className="total-row" style={STYLES.total}>
                        <td colSpan={4} style={{ ...STYLES.cell, textAlign: 'center', letterSpacing: 1 }}>TỔNG CỘNG</td>
                        <td style={STYLES.cell} />
                        <td style={{ ...STYLES.cell, textAlign: 'right', fontSize: 13 }}>{hasDT ? fmt(dt) : '—'}</td>
                        <td style={STYLES.cell} />
                        <td style={{ ...STYLES.cell, textAlign: 'right', fontSize: 13 }}>{fmt(xuong)}</td>
                        <td style={{ ...STYLES.cell, textAlign: 'right', fontSize: 13 }}>{hasActual ? fmt(actual) : '—'}</td>
                        <td style={{ ...STYLES.cell, textAlign: 'right', fontSize: 13, color: hasDT ? (grandLaiKD >= 0 ? '#86efac' : '#fca5a5') : '#9ca3af' }}>{hasDT ? fmt(grandLaiKD) : '—'}</td>
                        <td style={{ ...STYLES.cell, textAlign: 'right', fontSize: 13, color: hasActual ? (grandLaiXuong >= 0 ? '#86efac' : '#fca5a5') : '#9ca3af' }}>{hasActual ? fmt(grandLaiXuong) : '—'}</td>
                        <td style={STYLES.cell} />
                    </tr>
                </tbody>
            </table>
        );
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    const isEmpty = !data?.items?.length;
    const { rows: tableRows, grandDT, grandXuong, grandActual } = isEmpty
        ? { rows: [], grandDT: 0, grandXuong: 0, grandActual: 0 }
        : buildRows(data.items);

    // Stats for import modal
    const matchedCount   = importFormat === 'quotation' ? importRows.filter(r => r.qty > 0 && r.salePrice > 0).length : importRows.filter(r => r.matched).length;
    const unmatchedCount = importFormat === 'quotation' ? 0 : importRows.filter(r => !r.matched).length;

    return (
        <div>
            {/* Summary */}
            {!isEmpty && renderSummary(grandDT, grandXuong, grandActual)}

            {/* Actions bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {isEmpty ? 'Chưa có dữ liệu' : <>{data.items.length} hạng mục · Xưởng: <strong style={{ color: 'var(--accent-primary)' }}>{fmt(grandXuong)}đ</strong></>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={downloadTemplate}
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #16a34a', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📥 Template Excel
                    </button>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} style={{ display: 'none' }} id="budget-excel-upload" />
                    <label htmlFor="budget-excel-upload"
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #2563eb', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📊 Nhập từ Excel
                    </label>
                    {!isEmpty && <button onClick={handlePrint}
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        🖨️ In / PDF
                    </button>}
                    {!isEmpty && <button onClick={handleDeleteAll} disabled={deleting}
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #ef4444', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5, opacity: deleting ? 0.6 : 1 }}>
                        {deleting ? '⏳' : '🗑'} Xóa tất cả
                    </button>}
                </div>
            </div>

            {importError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#dc2626' }}>⚠️ {importError}</div>
            )}

            {isEmpty ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border-light)', borderRadius: 10 }}>
                    Chưa có dữ liệu dự toán.<br />
                    <span style={{ fontSize: 12 }}>Nhập từ Excel (cả file báo giá nội thất lẫn template chuẩn).</span>
                </div>
            ) : (
                <div ref={printRef} style={{ overflowX: 'auto' }}>
                    {renderMainTable(tableRows, grandDT, grandXuong, grandActual)}
                </div>
            )}

            {/* ── Import preview modal ─────────────────────────────────── */}
            {importModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setImportModal(false)}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 960, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16 }}>
                                    {importFormat === 'quotation' ? '📋 Nhập từ Báo giá nội thất' : '📊 Nhập từ template chuẩn'}
                                </h3>
                                {importFormat === 'quotation' && (
                                    <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                                        ✓ Nhận dạng file báo giá — ĐƠN GIÁ → ĐG DT, giá xưởng nhập sau
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setImportModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        {/* Sheet selector (nếu có nhiều sheet) */}
                        {sheetNames.length > 1 && (
                            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Sheet:</span>
                                {sheetNames.map(name => (
                                    <button key={name} onClick={() => handleSheetChange(name)}
                                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: name === activeSheet ? 700 : 400,
                                            background: name === activeSheet ? '#1e3a5f' : 'white',
                                            color: name === activeSheet ? 'white' : 'var(--text-primary)',
                                            borderColor: name === activeSheet ? '#1e3a5f' : 'var(--border-light)' }}>
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Summary stats */}
                        <div style={{ padding: '10px 20px', display: 'flex', gap: 16, borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 13 }}>Tổng: <strong>{importRows.length} hàng</strong></span>
                            <span style={{ fontSize: 13, color: '#16a34a' }}>✅ Sẽ import: <strong>{matchedCount}</strong></span>
                            {unmatchedCount > 0 && <span style={{ fontSize: 13, color: '#d97706' }}>⚠️ Không khớp SP: <strong>{unmatchedCount}</strong> (bỏ qua)</span>}
                            {importFormat === 'quotation' && (
                                <>
                                    <span style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 10px', color: '#15803d' }}>
                                        Tổng DT: {fmt(importRows.reduce((s, r) => s + r.qty * r.salePrice, 0))}đ
                                    </span>
                                    <span style={{ fontSize: 12, background: '#fef9f0', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 10px', color: '#92400e' }}>
                                        Tổng Xưởng (65%): {fmt(importRows.reduce((s, r) => s + r.qty * r.price, 0))}đ
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Preview table */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                        {(importFormat === 'quotation'
                                            ? ['#', 'Tên hạng mục', 'ĐVT', 'SL', 'ĐG DT', 'Tổng DT', 'ĐG Xưởng (65%)', 'Tổng Xưởng', 'Tầng', 'Phòng']
                                            : ['', 'Tên hạng mục', 'ĐVT', 'SL', 'ĐG DT', 'ĐG Xưởng', 'Tổng Xưởng', 'Giai đoạn', 'Loại CP']
                                        ).map(h => (
                                            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {importRows.map((row, idx) => importFormat === 'quotation' ? (
                                        <tr key={row._key} style={{ borderBottom: '1px solid var(--border-light)', background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                                            <td style={{ padding: '5px 6px', color: '#9ca3af', fontSize: 11, textAlign: 'right' }}>{idx + 1}</td>
                                            <td style={{ padding: '5px 6px', fontWeight: 500 }}>{row.name}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'center' }}>{row.unit}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right' }}>{row.qty}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', color: '#1e3a5f', fontWeight: 600 }}>{fmt(row.salePrice)}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(row.qty * row.salePrice)}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', color: '#92400e', fontWeight: 600 }}>{fmt(row.price)}</td>
                                            <td style={{ padding: '5px 6px', textAlign: 'right', fontWeight: 700, color: '#92400e' }}>{fmt(row.qty * row.price)}</td>
                                            <td style={{ padding: '5px 6px', fontSize: 11, color: 'var(--text-muted)' }}>{row.group1}</td>
                                            <td style={{ padding: '5px 6px', fontSize: 11, color: 'var(--text-muted)' }}>{row.group2}</td>
                                        </tr>
                                    ) : (
                                        <tr key={row._key} style={{ background: row.matched ? 'rgba(22,163,74,0.04)' : 'rgba(245,158,11,0.06)', borderBottom: '1px solid var(--border-light)' }}>
                                            <td style={{ padding: '6px', fontSize: 14 }}>{row.matched ? '✅' : '⚠️'}</td>
                                            <td style={{ padding: '6px', fontWeight: row.matched ? 500 : 400, color: row.matched ? 'var(--text-primary)' : '#d97706' }}>{row.name}</td>
                                            <td style={{ padding: '6px', textAlign: 'center' }}>{row.unit}</td>
                                            <td style={{ padding: '6px', textAlign: 'right' }}>{row.qty}</td>
                                            <td style={{ padding: '6px', textAlign: 'right', color: row.salePrice > 0 ? '#1e3a5f' : '#9ca3af' }}>{row.salePrice > 0 ? fmt(row.salePrice) : '—'}</td>
                                            <td style={{ padding: '6px', textAlign: 'right' }}>{fmt(row.price)}</td>
                                            <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>{fmt(row.qty * row.price)}</td>
                                            <td style={{ padding: '6px', fontSize: 11, color: 'var(--text-muted)' }}>{row.group1}</td>
                                            <td style={{ padding: '6px', fontSize: 11 }}>{row.costType}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {importFormat === 'standard' && unmatchedCount > 0 && 'Các dòng ⚠️ không có trong danh mục sản phẩm sẽ bị bỏ qua.'}
                                {importFormat === 'quotation' && 'ĐG Xưởng sẽ nhập sau trực tiếp trên bảng.'}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setImportModal(false)}
                                    style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'white', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
                                <button onClick={handleConfirmImport} disabled={importing || matchedCount === 0}
                                    style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: matchedCount > 0 ? '#2563eb' : '#e5e7eb', color: matchedCount > 0 ? 'white' : '#9ca3af', cursor: matchedCount > 0 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}>
                                    {importing ? '⏳ Đang tạo...' : `✅ Import ${matchedCount} hạng mục`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
