'use client';
import { useState, useEffect, useRef } from 'react';

const fmtN = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '';
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// ─── Parse sheet Excel (format "theo doi san xuất") ──────────────────────────
function parseProductionExcel(XLSX, ws) {
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

    // Tìm dòng header (có chứa "STT" ở cột 0 hoặc "Tên vật liệu")
    let dataStart = 0;
    let cName = 1, cMaSP = 2, cKT = 3, cDVT = 4, cSL = 5;
    let cDai = 7, cRong = 8, cCao = 9, cTong = 10;
    let cDonGia = 11, cThanhTien = 12, cGiaBan = 14;

    for (let r = 0; r <= Math.min(10, range.e.r); r++) {
        const v = gc(r, 0).toUpperCase();
        if (v === 'STT') {
            dataStart = r + 2; // bỏ qua header + sub-header
            // Detect column positions from sub-header row
            for (let c = 0; c <= Math.min(20, range.e.c); c++) {
                const h = gc(r + 1, c).toUpperCase();
                if (h === 'MÃ SP') cMaSP = c;
                else if (h === 'KT') cKT = c;
                else if (h.startsWith('DÀI') || h === 'DAI') cDai = c;
                else if (h.startsWith('RỘNG') || h === 'RONG') cRong = c;
                else if (h.startsWith('CAO')) cCao = c;
                else if (h === 'TỔNG' || h === 'TONG') cTong = c;
            }
            break;
        }
    }

    const items = [];
    let currentGroup = '';
    let groupOrder = 0;
    let sortOrder = 0;

    for (let r = dataStart; r <= range.e.r; r++) {
        const stt = gc(r, 0);
        const name = gc(r, cName);
        if (!stt && !name) continue;

        const textAll = (stt + name).toUpperCase();
        if (textAll.includes('TỔNG CỘNG') || textAll.includes('TỔNG HỢP') || textAll.includes('GHI CHÚ')) continue;

        // Nhóm: STT là Roman numeral
        if (ROMAN.includes(stt.split('.')[0])) {
            currentGroup = name;
            groupOrder = ROMAN.indexOf(stt.split('.')[0]) + 1;
            sortOrder = 0;
            continue;
        }

        // Item: STT là số
        if (!name) continue;
        const qty = gn(r, cSL);
        const unitPrice = gn(r, cDonGia);
        const productionAmount = gn(r, cThanhTien) || qty * unitPrice;

        items.push({
            groupName: currentGroup,
            groupOrder,
            sortOrder: ++sortOrder,
            name,
            productCode: gc(r, cMaSP),
            spec: gc(r, cKT),
            unit: gc(r, cDVT),
            quantity: qty,
            dimLength: gn(r, cDai),
            dimWidth: gn(r, cRong),
            dimHeight: gn(r, cCao),
            dimTotal: gn(r, cTong),
            unitPrice,
            productionAmount,
            salePrice: gn(r, cGiaBan),
            _key: Math.random(),
        });
    }

    return items;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductionCostTable({ projectId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importModal, setImportModal] = useState(false);
    const [importRows, setImportRows] = useState([]);
    const [importing, setImporting] = useState(false);
    const [sheetNames, setSheetNames] = useState([]);
    const [activeSheet, setActiveSheet] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const [editValue, setEditValue] = useState('');
    const xlsxWbRef = useRef(null);
    const fileRef = useRef(null);
    const printRef = useRef(null);

    const load = () => {
        setLoading(true);
        fetch(`/api/production-costs?projectId=${projectId}`)
            .then(r => r.json()).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
    };
    useEffect(load, [projectId]);

    // ─── Build groups ──────────────────────────────────────────────────────
    const groups = {};
    items.forEach(item => {
        const key = `${item.groupOrder}__${item.groupName}`;
        if (!groups[key]) groups[key] = { name: item.groupName, order: item.groupOrder, items: [] };
        groups[key].items.push(item);
    });
    const sortedGroups = Object.values(groups).sort((a, b) => a.order - b.order);
    const grandTotal = items.reduce((s, i) => s + (Number(i.productionAmount) || 0), 0);

    // ─── Parse Excel file ──────────────────────────────────────────────────
    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const mod = await import('xlsx');
            const XLSX = mod.default || mod;
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf);
            xlsxWbRef.current = wb;

            const validSheets = wb.SheetNames.filter(n => wb.Sheets[n]?.['!ref']);
            setSheetNames(validSheets);

            // Auto-chọn sheet hợp lệ nhất (có chứa STT header)
            let best = validSheets[0];
            for (const sn of validSheets) {
                const ws = wb.Sheets[sn];
                const range = XLSX.utils.decode_range(ws['!ref']);
                for (let r = 0; r <= Math.min(10, range.e.r); r++) {
                    const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
                    if (cell && String(cell.v).trim().toUpperCase() === 'STT') { best = sn; break; }
                }
                if (best !== validSheets[0]) break;
            }
            setActiveSheet(best);

            const rows = parseProductionExcel(XLSX, wb.Sheets[best]);
            setImportRows(rows);
            if (rows.length > 0) setImportModal(true);
            else alert('Không đọc được dữ liệu. Kiểm tra định dạng file.');
        } catch (err) { alert('Lỗi đọc file: ' + err.message); }
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleSheetChange = async (sn) => {
        if (!xlsxWbRef.current || sn === activeSheet) return;
        setActiveSheet(sn);
        const mod = await import('xlsx');
        const XLSX = mod.default || mod;
        const rows = parseProductionExcel(XLSX, xlsxWbRef.current.Sheets[sn]);
        setImportRows(rows);
    };

    // ─── Confirm import ────────────────────────────────────────────────────
    const handleConfirmImport = async () => {
        setImporting(true);
        try {
            const res = await fetch('/api/production-costs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, items: importRows }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Lỗi');
            setImportModal(false);
            setImportRows([]);
            xlsxWbRef.current = null;
            load();
        } catch (err) { alert('Lỗi: ' + err.message); }
        setImporting(false);
    };

    // ─── Inline edit ───────────────────────────────────────────────────────
    const startEdit = (id, field, val) => { setEditingCell({ id, field }); setEditValue(String(val || '')); };
    const saveEdit = async () => {
        if (!editingCell) return;
        const { id, field } = editingCell;
        setEditingCell(null);
        const numVal = parseFloat(String(editValue).replace(/[^\d.]/g, '')) || 0;
        const item = items.find(i => i.id === id);
        if (!item) return;
        const updated = { ...item, [field]: numVal };
        if (field === 'quantity' || field === 'unitPrice') {
            updated.productionAmount = (field === 'quantity' ? numVal : item.quantity) * (field === 'unitPrice' ? numVal : item.unitPrice);
        }
        await fetch(`/api/production-costs/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
        });
        load();
    };

    const editCell = (id, field, value) => {
        if (editingCell?.id === id && editingCell?.field === field) {
            return (
                <input autoFocus type="number" value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                    style={{ width: '100%', border: '1px solid #2563eb', borderRadius: 3, padding: '1px 3px', fontSize: 11, textAlign: 'right', boxSizing: 'border-box' }}
                />
            );
        }
        return (
            <span onClick={() => startEdit(id, field, value)} title="Nhấn để sửa"
                style={{ cursor: 'pointer', display: 'block', textAlign: 'right', textDecoration: 'underline dotted #bbb' }}>
                {value ? fmtN(value) : <span style={{ color: '#bbb', fontSize: 10 }}>—</span>}
            </span>
        );
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa dòng này?')) return;
        await fetch(`/api/production-costs/${id}`, { method: 'DELETE' });
        load();
    };

    const handleDeleteAll = async () => {
        if (!items.length || !confirm(`Xóa toàn bộ ${items.length} dòng? Không thể hoàn tác.`)) return;
        setDeleting(true);
        await fetch(`/api/production-costs?projectId=${projectId}`, { method: 'DELETE' });
        load();
        setDeleting(false);
    };

    // ─── Print ─────────────────────────────────────────────────────────────
    const handlePrint = () => {
        const content = printRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank');
        win.document.write(`<html><head><title>Bảng tính giá sản xuất</title>
            <style>body{font-family:'Times New Roman',serif;margin:20px;font-size:11px}
            table{width:100%;border-collapse:collapse}th,td{border:1px solid #888;padding:3px 5px}
            .ghead{background:#fde68a;font-weight:bold}.no-print{display:none!important}
            @media print{body{margin:8px}}</style>
            </head><body>${content}</body></html>`);
        win.document.close(); win.print();
    };

    const C = { border: '1px solid #c0c0c0', padding: '3px 6px', fontSize: 11 };
    const TH = { ...C, background: '#1e3a5f', color: '#fff', fontWeight: 700, textAlign: 'center', fontSize: 10 };
    const GH = { ...C, background: '#fde68a', fontWeight: 700 };

    if (loading) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>;

    return (
        <div>
            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {items.length ? <>{items.length} dòng · Tổng sản xuất: <strong style={{ color: '#1e3a5f' }}>{fmtN(grandTotal)}đ</strong></> : 'Chưa có dữ liệu'}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} id="prod-excel-upload" />
                    <label htmlFor="prod-excel-upload"
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #2563eb', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: 5 }}>
                        📊 Nhập từ Excel
                    </label>
                    {!!items.length && <button onClick={handlePrint}
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        🖨️ In / PDF
                    </button>}
                    {!!items.length && <button onClick={handleDeleteAll} disabled={deleting}
                        style={{ padding: '7px 14px', fontSize: 13, fontWeight: 600, border: '1px solid #ef4444', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#ef4444', opacity: deleting ? 0.6 : 1 }}>
                        {deleting ? '⏳' : '🗑'} Xóa tất cả
                    </button>}
                </div>
            </div>

            {/* Table */}
            {!items.length ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border-light)', borderRadius: 10, fontSize: 13 }}>
                    Chưa có dữ liệu. Nhập từ file Excel theo dõi sản xuất.
                </div>
            ) : (
                <div ref={printRef} style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                        <thead>
                            {/* Row 1 */}
                            <tr>
                                <th rowSpan={2} style={{ ...TH, width: 36 }}>STT</th>
                                <th rowSpan={2} style={{ ...TH, minWidth: 160 }}>Tên vật liệu<br />(Phụ kiện)</th>
                                <th colSpan={2} style={TH}>Chi tiết</th>
                                <th rowSpan={2} style={{ ...TH, width: 46 }}>ĐVT</th>
                                <th rowSpan={2} style={{ ...TH, width: 46 }}>SL</th>
                                <th colSpan={4} style={TH}>Kích thước</th>
                                <th rowSpan={2} style={{ ...TH, width: 90 }}>Đơn giá</th>
                                <th rowSpan={2} style={{ ...TH, width: 100 }}>Thanh tiền<br />Sản xuất</th>
                                <th rowSpan={2} style={{ ...TH, width: 60 }}>Tỉ xuất %</th>
                                <th rowSpan={2} style={{ ...TH, width: 90 }}>GIÁ BÁN</th>
                                <th rowSpan={2} style={{ ...TH, width: 32 }} className="no-print" />
                            </tr>
                            <tr>
                                <th style={{ ...TH, width: 60 }}>Mã SP</th>
                                <th style={{ ...TH, width: 60 }}>KT</th>
                                <th style={{ ...TH, width: 46 }}>Dài</th>
                                <th style={{ ...TH, width: 46 }}>Rộng</th>
                                <th style={{ ...TH, width: 46 }}>Cao</th>
                                <th style={{ ...TH, width: 46 }}>Tổng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedGroups.map((g, gi) => {
                                const groupTotal = g.items.reduce((s, i) => s + (Number(i.productionAmount) || 0), 0);
                                const pct = grandTotal > 0 ? ((groupTotal / grandTotal) * 100).toFixed(1) : '0';
                                return [
                                    /* group header row */
                                    <tr key={`g-${gi}`} style={GH}>
                                        <td style={{ ...GH, textAlign: 'center', fontWeight: 700 }}>{ROMAN[g.order - 1] || g.order}</td>
                                        <td style={{ ...GH, fontWeight: 700, textTransform: 'uppercase' }} colSpan={5}>{g.name}</td>
                                        <td style={GH} colSpan={4} />
                                        <td style={GH} />
                                        <td style={{ ...GH, textAlign: 'right', fontWeight: 700 }}>{fmtN(groupTotal)}</td>
                                        <td style={{ ...GH, textAlign: 'center', fontWeight: 700 }}>{pct}%</td>
                                        <td style={GH} />
                                        <td style={{ ...C, background: '#fde68a' }} className="no-print" />
                                    </tr>,
                                    /* item rows */
                                    ...g.items.map((item, ii) => (
                                        <tr key={item.id} style={{ background: ii % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ ...C, textAlign: 'center', color: '#666' }}>{item.sortOrder || ii + 1}</td>
                                            <td style={{ ...C, paddingLeft: 12 }}>{item.name}</td>
                                            <td style={{ ...C, textAlign: 'center' }}>{item.productCode}</td>
                                            <td style={{ ...C, textAlign: 'center' }}>{item.spec}</td>
                                            <td style={{ ...C, textAlign: 'center' }}>{item.unit}</td>
                                            <td style={{ ...C, padding: '2px 4px' }}>{editCell(item.id, 'quantity', item.quantity)}</td>
                                            <td style={{ ...C, textAlign: 'right' }}>{fmtN(item.dimLength) || ''}</td>
                                            <td style={{ ...C, textAlign: 'right' }}>{fmtN(item.dimWidth) || ''}</td>
                                            <td style={{ ...C, textAlign: 'right' }}>{fmtN(item.dimHeight) || ''}</td>
                                            <td style={{ ...C, textAlign: 'right' }}>{fmtN(item.dimTotal) || ''}</td>
                                            <td style={{ ...C, padding: '2px 4px' }}>{editCell(item.id, 'unitPrice', item.unitPrice)}</td>
                                            <td style={{ ...C, textAlign: 'right', fontWeight: 600 }}>{fmtN(item.productionAmount)}</td>
                                            <td style={{ ...C, textAlign: 'center', color: '#9ca3af', fontSize: 10 }} />
                                            <td style={{ ...C, padding: '2px 4px' }}>{editCell(item.id, 'salePrice', item.salePrice)}</td>
                                            <td style={{ ...C, textAlign: 'center', padding: 2 }} className="no-print">
                                                <button onClick={() => handleDelete(item.id)} title="Xóa"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: '1px 4px' }}>🗑</button>
                                            </td>
                                        </tr>
                                    )),
                                ];
                            })}
                            {/* Total row */}
                            <tr style={{ background: '#1e3a5f', color: '#fff', fontWeight: 700 }}>
                                <td colSpan={6} style={{ ...C, textAlign: 'center', letterSpacing: 1, color: '#fff', background: '#1e3a5f', fontSize: 12 }}>TỔNG CỘNG</td>
                                <td colSpan={4} style={{ ...C, background: '#1e3a5f' }} />
                                <td style={{ ...C, background: '#1e3a5f' }} />
                                <td style={{ ...C, textAlign: 'right', color: '#fff', background: '#1e3a5f', fontSize: 13 }}>{fmtN(grandTotal)}</td>
                                <td style={{ ...C, textAlign: 'center', color: '#fff', background: '#1e3a5f' }}>100%</td>
                                <td style={{ ...C, background: '#1e3a5f' }} />
                                <td style={{ ...C, background: '#1e3a5f' }} className="no-print" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Import modal */}
            {importModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={() => setImportModal(false)}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 14, width: '100%', maxWidth: 1000, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>

                        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 15 }}>📊 Nhập bảng tính giá sản xuất từ Excel</h3>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{importRows.length} dòng · {[...new Set(importRows.map(r => r.groupName).filter(Boolean))].join(', ')}</div>
                            </div>
                            <button onClick={() => setImportModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                        </div>

                        {/* Sheet selector */}
                        {sheetNames.length > 1 && (
                            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 4 }}>Sheet:</span>
                                {sheetNames.map(sn => (
                                    <button key={sn} onClick={() => handleSheetChange(sn)}
                                        style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid', fontSize: 12, cursor: 'pointer',
                                            background: sn === activeSheet ? '#1e3a5f' : '#fff',
                                            color: sn === activeSheet ? '#fff' : 'var(--text-primary)',
                                            borderColor: sn === activeSheet ? '#1e3a5f' : 'var(--border-light)', fontWeight: sn === activeSheet ? 700 : 400 }}>
                                        {sn}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Preview */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginTop: 10 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                        {['Nhóm', 'Tên vật liệu', 'Mã SP', 'KT', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền'].map(h => (
                                            <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {importRows.map((row, idx) => (
                                        <tr key={row._key} style={{ borderBottom: '1px solid var(--border-light)', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ padding: '4px 8px', fontSize: 11, color: '#9ca3af' }}>{row.groupName}</td>
                                            <td style={{ padding: '4px 8px', fontWeight: 500 }}>{row.name}</td>
                                            <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>{row.productCode}</td>
                                            <td style={{ padding: '4px 8px', color: 'var(--text-muted)' }}>{row.spec}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>{row.unit}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>{row.quantity}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right' }}>{fmtN(row.unitPrice)}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtN(row.productionAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                            <button onClick={() => setImportModal(false)}
                                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border-light)', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
                            <button onClick={handleConfirmImport} disabled={importing || importRows.length === 0}
                                style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: importing ? 0.7 : 1 }}>
                                {importing ? '⏳ Đang lưu...' : `✅ Import ${importRows.length} dòng`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
