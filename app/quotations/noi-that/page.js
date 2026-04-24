'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtN = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '';
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const toRoman = (i) => ROMAN[i] || `${i + 1}`;

function calcKL(row) {
    const dvt = (row.dvt || '').toLowerCase().trim();
    const d = parseFloat(row.dai) || 0;
    const s = parseFloat(row.sau) || 0;
    const c = parseFloat(row.cao) || 0;
    const sl = parseFloat(row.slCai) || 0;
    if (d && c) {
        if (dvt === 'm3' || dvt === 'm³') return Math.round(d * s * c * Math.max(sl, 1) * 1000) / 1000;
        return Math.round(d * c * Math.max(sl, 1) * 100) / 100;
    }
    if (d && (dvt === 'md' || dvt === 'mét' || dvt === 'm')) return Math.round(d * Math.max(sl, 1) * 100) / 100;
    return sl || 0;
}
const calcTT = (row) => Math.round(calcKL(row) * (parseFloat(row.donGia) || 0));

const emptyRow = () => ({
    _k: Math.random().toString(36).slice(2),
    hangMuc: '', chatLieu: '', dai: '', sau: '', cao: '', slCai: '', dvt: 'm²', donGia: '',
});
const emptyRoom = (name = '') => ({
    _k: Math.random().toString(36).slice(2),
    name,
    rows: [emptyRow(), emptyRow(), emptyRow()],
});
const emptySection = (name = '') => ({
    _k: Math.random().toString(36).slice(2),
    name,
    rooms: [emptyRoom('')],
});

// ── Column config ─────────────────────────────────────────────────────────────
const COLS = [
    { key: 'hangMuc',  label: 'HẠNG MỤC',  w: 110, align: 'left' },
    { key: 'chatLieu', label: 'CHẤT LIỆU',  grow: true, align: 'left', textarea: true },
    { key: 'dai',      label: 'Dài',         w: 56, num: true },
    { key: 'sau',      label: 'Sâu',         w: 56, num: true },
    { key: 'cao',      label: 'Cao',         w: 56, num: true },
    { key: 'slCai',    label: 'SL\nCÁI',    w: 50, num: true },
    { key: 'dvt',      label: 'ĐVT',         w: 52, align: 'center' },
    { key: 'donGia',   label: 'ĐƠN GIÁ',    w: 96, num: true },
];
const COL_KEYS = COLS.map(c => c.key);
const DRAFT_KEY = 'nt-quotation-draft';

// ── Main component ────────────────────────────────────────────────────────────
export default function QuotationNoiThatPage() {
    const router = useRouter();
    const toast = useToast();

    const [sections, setSections] = useState([emptySection('Tầng 1')]);
    const [form, setForm] = useState({ customerId: '', projectId: '', vat: 10, discount: 0, notes: '' });
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [saving, setSaving] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const cellRefs = useRef({});

    // Load customers/projects + restore draft
    useEffect(() => {
        apiFetch('/api/customers?limit=500').then(d => setCustomers(d.data || [])).catch(() => {});
        apiFetch('/api/projects?limit=500').then(d => setProjects(d.data || [])).catch(() => {});
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (raw) {
                const { sections: s, form: f } = JSON.parse(raw);
                if (s?.length) { setSections(s); setForm(f || {}); }
            }
        } catch {}
    }, []);

    // Auto-save draft to localStorage (debounced 1.5s)
    useEffect(() => {
        const t = setTimeout(() => {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ sections, form }));
        }, 1500);
        return () => clearTimeout(t);
    }, [sections, form]);

    // ── Cell navigation helpers ───────────────────────────────────────────────
    const flatCells = useCallback(() => {
        const list = [];
        sections.forEach((sec, sIdx) => sec.rooms.forEach((rm, rmIdx) =>
            rm.rows.forEach((_, rIdx) => COL_KEYS.forEach((__, cIdx) =>
                list.push({ sIdx, rmIdx, rIdx, cIdx })
            ))
        ));
        return list;
    }, [sections]);

    const focusCell = useCallback((sIdx, rmIdx, rIdx, cIdx) => {
        const el = cellRefs.current[`${sIdx}-${rmIdx}-${rIdx}-${cIdx}`];
        if (el) { el.focus(); try { el.select(); } catch (_) {} }
    }, []);

    // ── Row operations ────────────────────────────────────────────────────────
    const updateRow = useCallback((sIdx, rmIdx, rIdx, key, val) => {
        setSections(prev => prev.map((sec, si) => si !== sIdx ? sec : {
            ...sec,
            rooms: sec.rooms.map((rm, ri) => ri !== rmIdx ? rm : {
                ...rm,
                rows: rm.rows.map((row, rii) => rii !== rIdx ? row : { ...row, [key]: val }),
            }),
        }));
    }, []);

    const addRow = useCallback((sIdx, rmIdx, afterIdx) => {
        setSections(prev => prev.map((sec, si) => si !== sIdx ? sec : {
            ...sec,
            rooms: sec.rooms.map((rm, ri) => {
                if (ri !== rmIdx) return rm;
                const rows = [...rm.rows];
                rows.splice(afterIdx + 1, 0, emptyRow());
                return { ...rm, rows };
            }),
        }));
        setTimeout(() => focusCell(sIdx, rmIdx, afterIdx + 1, 0), 30);
    }, [focusCell]);

    const removeRow = useCallback((sIdx, rmIdx, rIdx) => {
        setSections(prev => prev.map((sec, si) => si !== sIdx ? sec : {
            ...sec,
            rooms: sec.rooms.map((rm, ri) => {
                if (ri !== rmIdx) return rm;
                const rows = rm.rows.filter((_, i) => i !== rIdx);
                return { ...rm, rows: rows.length ? rows : [emptyRow()] };
            }),
        }));
    }, []);

    // ── Keyboard navigation ───────────────────────────────────────────────────
    const navigateTab = useCallback((refKey, shiftKey) => {
        const cells = flatCells();
        const idx = cells.findIndex(c => `${c.sIdx}-${c.rmIdx}-${c.rIdx}-${c.cIdx}` === refKey);
        const next = cells[idx + (shiftKey ? -1 : 1)];
        if (next) setTimeout(() => focusCell(next.sIdx, next.rmIdx, next.rIdx, next.cIdx), 0);
    }, [flatCells, focusCell]);

    const handleKeyDown = useCallback((e, sIdx, rmIdx, rIdx, cIdx) => {
        const rows = sections[sIdx]?.rooms[rmIdx]?.rows || [];
        const refKey = `${sIdx}-${rmIdx}-${rIdx}-${cIdx}`;
        if (e.key === 'Tab') {
            e.preventDefault();
            navigateTab(refKey, e.shiftKey);
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (rIdx + 1 < rows.length) focusCell(sIdx, rmIdx, rIdx + 1, cIdx);
            else addRow(sIdx, rmIdx, rIdx);
        } else if (e.key === 'ArrowDown' && e.altKey) {
            e.preventDefault();
            addRow(sIdx, rmIdx, rIdx);
        } else if (e.key === 'Delete' && e.ctrlKey) {
            e.preventDefault();
            removeRow(sIdx, rmIdx, rIdx);
            setTimeout(() => focusCell(sIdx, rmIdx, Math.max(0, rIdx - 1), cIdx), 30);
        }
    }, [sections, navigateTab, focusCell, addRow, removeRow]);

    // Textarea-specific key handler (Enter = newline, Ctrl+Enter = next row)
    const handleTextareaKey = useCallback((e, sIdx, rmIdx, rIdx, cIdx) => {
        const rows = sections[sIdx]?.rooms[rmIdx]?.rows || [];
        const refKey = `${sIdx}-${rmIdx}-${rIdx}-${cIdx}`;
        if (e.key === 'Tab') {
            e.preventDefault();
            navigateTab(refKey, e.shiftKey);
        } else if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (rIdx + 1 < rows.length) focusCell(sIdx, rmIdx, rIdx + 1, cIdx);
            else addRow(sIdx, rmIdx, rIdx);
        } else if (e.key === 'Delete' && e.ctrlKey) {
            e.preventDefault();
            removeRow(sIdx, rmIdx, rIdx);
            setTimeout(() => focusCell(sIdx, rmIdx, Math.max(0, rIdx - 1), cIdx), 30);
        }
        // Enter without modifier = natural newline in textarea
    }, [sections, navigateTab, focusCell, addRow, removeRow]);

    // ── Paste from Excel (TSV) ────────────────────────────────────────────────
    const handlePaste = useCallback((e, sIdx, rmIdx, startRow, startCol) => {
        const text = e.clipboardData.getData('text');
        if (!text.includes('\t') && !text.includes('\n')) return;
        e.preventDefault();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        setSections(prev => {
            const secs = [...prev];
            const sec = { ...secs[sIdx], rooms: [...secs[sIdx].rooms] };
            const rm = { ...sec.rooms[rmIdx], rows: [...sec.rooms[rmIdx].rows] };
            lines.forEach((line, li) => {
                const cells = line.split('\t');
                const rIdx = startRow + li;
                while (rm.rows.length <= rIdx) rm.rows.push(emptyRow());
                const row = { ...rm.rows[rIdx] };
                COL_KEYS.slice(startCol).forEach((key, ci) => {
                    if (ci < cells.length) row[key] = cells[ci].trim();
                });
                rm.rows[rIdx] = row;
            });
            sec.rooms[rmIdx] = rm;
            secs[sIdx] = sec;
            return secs;
        });
        toast.success(`Đã dán ${lines.length} dòng`);
    }, [toast]);

    // ── Totals ────────────────────────────────────────────────────────────────
    const roomTotals = sections.map(sec => sec.rooms.map(rm => rm.rows.reduce((s, r) => s + calcTT(r), 0)));
    const secTotals = roomTotals.map(rts => rts.reduce((a, b) => a + b, 0));
    const rawTotal = secTotals.reduce((a, b) => a + b, 0);
    const afterDiscount = rawTotal * (1 - (form.discount || 0) / 100);
    const vatAmt = afterDiscount * (form.vat || 0) / 100;
    const grandTotal = Math.round(afterDiscount + vatAmt);

    // ── Build API payload ─────────────────────────────────────────────────────
    const buildPayload = (status) => {
        const categories = [];
        sections.forEach((sec, si) => {
            sec.rooms.forEach((rm, ri) => {
                const items = rm.rows
                    .filter(r => r.hangMuc || r.chatLieu || r.donGia)
                    .map((row, idx) => ({
                        name: row.hangMuc || '(Hạng mục)',
                        description: row.chatLieu || '',
                        unit: row.dvt || 'm²',
                        length: parseFloat(row.dai) || 0,
                        width: parseFloat(row.sau) || 0,
                        height: parseFloat(row.cao) || 0,
                        quantity: parseFloat(row.slCai) || 1,
                        volume: calcKL(row),
                        unitPrice: parseFloat(row.donGia) || 0,
                        amount: calcTT(row),
                        order: idx,
                    }));
                if (items.length) {
                    categories.push({
                        group: sec.name || `Tầng ${si + 1}`,
                        name: rm.name || `Phòng ${toRoman(ri)}`,
                        subtotal: roomTotals[si][ri],
                        items,
                    });
                }
            });
        });
        return {
            type: 'Báo giá nội thất',
            status,
            customerId: form.customerId || null,
            projectId: form.projectId || null,
            vat: Number(form.vat) || 0,
            discount: Number(form.discount) || 0,
            notes: form.notes || '',
            total: rawTotal,
            grandTotal,
            categories,
        };
    };

    const handleSaveDraft = async () => {
        const payload = buildPayload('Nháp');
        if (!payload.categories.length) { toast.warning('Chưa có hạng mục nào!'); return; }
        setSavingDraft(true);
        try {
            await apiFetch('/api/quotations', { method: 'POST', body: JSON.stringify(payload) });
            toast.success('Đã lưu nháp vào hệ thống');
        } catch (err) { toast.error(err.message || 'Lỗi lưu nháp'); }
        setSavingDraft(false);
    };

    const handleSave = async () => {
        const payload = buildPayload('Mới');
        if (!payload.categories.length) { toast.warning('Chưa có hạng mục nào!'); return; }
        setSaving(true);
        try {
            const q = await apiFetch('/api/quotations', { method: 'POST', body: JSON.stringify(payload) });
            localStorage.removeItem(DRAFT_KEY);
            router.push(`/quotations/${q.id}/pdf`);
        } catch (err) { toast.error(err.message || 'Lỗi lưu báo giá'); }
        setSaving(false);
    };

    // ── Export Excel (HTML-based, supports colors) ────────────────────────────
    const handleExportExcel = () => {
        const customerName = customers.find(c => c.id === form.customerId)?.name || '';
        const projectName = projects.find(p => p.id === form.projectId)?.name || '';
        const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        let rows = ``;
        // Header rows
        rows += `<tr><td colspan="11" style="background:#1e3a5f;color:#fff;font-size:13pt;font-weight:bold;text-align:center;padding:8px;">BẢNG BÁO GIÁ NỘI THẤT</td></tr>`;
        if (customerName) rows += `<tr><td colspan="11" style="padding:4px 8px;">Khách hàng: <b>${esc(customerName)}</b></td></tr>`;
        if (projectName) rows += `<tr><td colspan="11" style="padding:4px 8px;">Công trình: <b>${esc(projectName)}</b></td></tr>`;
        rows += `<tr><td colspan="11"></td></tr>`;

        // Column headers
        rows += `<tr>
          <td style="${TH_S}width:30px;">STT</td>
          <td style="${TH_S}width:130px;">HẠNG MỤC</td>
          <td style="${TH_S}width:180px;">CHẤT LIỆU</td>
          <td style="${TH_S}width:45px;">Dài</td>
          <td style="${TH_S}width:45px;">Sâu</td>
          <td style="${TH_S}width:45px;">Cao</td>
          <td style="${TH_S}width:40px;">SL CÁI</td>
          <td style="${TH_S}width:40px;">ĐVT</td>
          <td style="${TH_S}width:65px;">KHỐI LƯỢNG</td>
          <td style="${TH_S}width:95px;">ĐƠN GIÁ</td>
          <td style="${TH_S}width:105px;">THÀNH TIỀN</td>
        </tr>`;

        let stt = 1;
        sections.forEach((sec, si) => {
            // Floor row (green)
            rows += `<tr><td colspan="11" style="background:#92D050;font-weight:bold;font-size:10pt;padding:5px 8px;border:1px solid #5a9c00;">
              ${String.fromCharCode(65 + si)}. ${esc(sec.name || `Tầng ${si + 1}`)}
            </td></tr>`;

            sec.rooms.forEach((rm, ri) => {
                // Room row (yellow)
                rows += `<tr><td colspan="11" style="background:#FFFF00;font-weight:bold;font-size:9.5pt;padding:4px 8px 4px 24px;border:1px solid #d4d400;">
                  ${String.fromCharCode(65 + si)}.${toRoman(ri)}. ${esc(rm.name || `Phòng ${toRoman(ri)}`)}
                </td></tr>`;

                rm.rows.filter(r => r.hangMuc || r.chatLieu || r.donGia).forEach((row) => {
                    const kl = calcKL(row);
                    const tt = calcTT(row);
                    const bg = stt % 2 === 0 ? 'background:#f9fafb;' : '';
                    rows += `<tr>
                      <td style="${CELL_S}${bg}text-align:center;">${stt++}</td>
                      <td style="${CELL_S}${bg}">${esc(row.hangMuc)}</td>
                      <td style="${CELL_S}${bg}white-space:pre-wrap;">${esc(row.chatLieu)}</td>
                      <td style="${CELL_S}${bg}text-align:right;">${esc(row.dai)}</td>
                      <td style="${CELL_S}${bg}text-align:right;">${esc(row.sau)}</td>
                      <td style="${CELL_S}${bg}text-align:right;">${esc(row.cao)}</td>
                      <td style="${CELL_S}${bg}text-align:right;">${esc(row.slCai)}</td>
                      <td style="${CELL_S}${bg}text-align:center;">${esc(row.dvt)}</td>
                      <td style="${CELL_S}${bg}text-align:right;">${kl || ''}</td>
                      <td style="${CELL_S}${bg}text-align:right;">${row.donGia ? fmtN(parseFloat(row.donGia)) : ''}</td>
                      <td style="${CELL_S}${bg}text-align:right;font-weight:bold;">${tt ? fmtN(tt) : ''}</td>
                    </tr>`;
                });

                // Room subtotal
                rows += `<tr>
                  <td colspan="10" style="${CELL_S}text-align:right;background:#fffde0;font-style:italic;">
                    Cộng ${esc(rm.name || `Phòng ${toRoman(ri)}`)}</td>
                  <td style="${CELL_S}text-align:right;background:#fffde0;font-weight:bold;">${fmtN(roomTotals[si][ri])}</td>
                </tr>`;
            });

            // Section subtotal
            rows += `<tr>
              <td colspan="10" style="${CELL_S}text-align:right;background:#e8f5d0;font-weight:bold;">
                Tổng ${esc(sec.name || `Tầng ${si + 1}`)}</td>
              <td style="${CELL_S}text-align:right;background:#e8f5d0;font-weight:bold;">${fmtN(secTotals[si])}</td>
            </tr>`;
        });

        // Summary
        rows += `<tr><td colspan="11" style="border:none;"></td></tr>`;
        rows += `<tr><td colspan="10" style="${CELL_S}text-align:right;background:#f0f4ff;">Tổng cộng:</td>
          <td style="${CELL_S}text-align:right;background:#f0f4ff;font-weight:bold;">${fmtN(rawTotal)}</td></tr>`;
        if (form.discount > 0) rows += `<tr><td colspan="10" style="${CELL_S}text-align:right;color:#dc2626;">Chiết khấu (${form.discount}%):</td>
          <td style="${CELL_S}text-align:right;color:#dc2626;">-${fmtN(rawTotal * form.discount / 100)}</td></tr>`;
        if (form.vat > 0) rows += `<tr><td colspan="10" style="${CELL_S}text-align:right;background:#f0f4ff;">VAT (${form.vat}%):</td>
          <td style="${CELL_S}text-align:right;background:#f0f4ff;">${fmtN(vatAmt)}</td></tr>`;
        rows += `<tr><td colspan="10" style="background:#1e3a5f;color:#fff;text-align:right;padding:8px;font-weight:bold;font-size:11pt;border:1px solid #0f2335;">
          TỔNG GIÁ TRỊ HỢP ĐỒNG:</td>
          <td style="background:#1e3a5f;color:#E05B0A;text-align:right;padding:8px;font-weight:bold;font-size:12pt;border:1px solid #0f2335;">${fmtN(grandTotal)}</td></tr>`;

        const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="UTF-8"><style>
  td { font-family: Arial, sans-serif; font-size: 9pt; vertical-align: middle; }
  table { border-collapse: collapse; }
</style></head>
<body><table>${rows}</table></body></html>`;

        const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = customerName ? `BG_NoiThat_${customerName.replace(/\s+/g, '_')}.xls` : 'BaoGia_NoiThat.xls';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    // Shared inline style strings for Excel export
    const TH_S = 'background:#1e3a5f;color:#fff;font-weight:bold;text-align:center;padding:5px 4px;border:1px solid #0f2335;';
    const CELL_S = 'border:1px solid #c8cbd0;padding:4px 5px;';

    // ── Cell/Table render styles ──────────────────────────────────────────────
    const TH = { background: '#1e3a5f', color: '#fff', fontSize: 9.5, fontWeight: 700, textAlign: 'center', whiteSpace: 'pre-line', padding: '5px 3px', border: '1px solid #0f2335', userSelect: 'none', lineHeight: 1.3 };
    const TD = { border: '1px solid #d1d5db', padding: 0 };
    const INPUT_S = { width: '100%', height: '100%', border: 'none', outline: 'none', padding: '5px', fontSize: 11.5, background: 'transparent', fontFamily: 'inherit', boxSizing: 'border-box' };
    const AUTO_TD = { ...TD, padding: '5px 6px', fontSize: 11.5, textAlign: 'right', fontWeight: 700, color: '#1e3a5f', background: '#eef2f7', whiteSpace: 'nowrap' };

    return (
        <div>
            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => router.push('/quotations')}>← Báo giá</button>
                <h2 style={{ margin: 0, fontSize: 17 }}>Báo giá nội thất</h2>
                <div style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>📊 Xuất Excel</button>
                <button className="btn btn-secondary btn-sm" onClick={handleSaveDraft} disabled={savingDraft}>
                    {savingDraft ? 'Đang lưu...' : '💾 Lưu nháp'}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }}
                    onClick={() => { localStorage.removeItem(DRAFT_KEY); setSections([emptySection('Tầng 1')]); setForm({ customerId: '', projectId: '', vat: 10, discount: 0, notes: '' }); }}
                    title="Xóa tất cả và làm mới">🗑 Làm mới</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Đang lưu...' : '📄 Lưu & Xuất PDF'}
                </button>
            </div>

            {/* ── Thông tin chung ─────────────────────────────────────────── */}
            <div className="card" style={{ padding: '12px 16px', marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Khách hàng</label>
                    <select className="form-select" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
                        <option value="">-- Chọn KH --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Dự án</label>
                    <select className="form-select" value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}>
                        <option value="">-- Chọn dự án --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">VAT (%)</label>
                    <input type="number" className="form-input" value={form.vat} onChange={e => setForm(f => ({ ...f, vat: +e.target.value }))} min={0} max={100} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Chiết khấu (%)</label>
                    <input type="number" className="form-input" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: +e.target.value }))} min={0} max={100} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Ghi chú</label>
                    <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." />
                </div>
            </div>

            {/* ── Keyboard hint ────────────────────────────────────────────── */}
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, padding: '5px 8px', background: '#f1f5f9', borderRadius: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <span>⌨️ <b>Tab</b>/<b>Shift+Tab</b> di chuyển ô</span>
                <span>↵ <b>Enter</b> xuống dòng</span>
                <span>⬇ <b>Alt+↓</b> thêm dòng</span>
                <span>✕ <b>Ctrl+Del</b> xóa dòng</span>
                <span>📋 <b>Ctrl+V</b> paste từ Excel</span>
                <span style={{ color: '#7c3aed' }}>💬 Chất liệu: <b>Enter</b> = xuống dòng, <b>Ctrl+Enter</b> = ô tiếp</span>
                <span>KL: Dài×Cao×SL (m²) | Dài×SL (md)</span>
            </div>

            {/* ── Sections (Tầng / Khu vực chính) ────────────────────────── */}
            {sections.map((sec, sIdx) => (
                <div key={sec._k} style={{ marginBottom: 20, border: '2px solid #92D050', borderRadius: 7, overflow: 'hidden' }}>

                    {/* Floor header – green (A-level) */}
                    <div style={{ background: '#92D050', display: 'flex', alignItems: 'center', padding: '7px 10px', gap: 8 }}>
                        <span style={{ fontWeight: 900, fontSize: 16, color: '#1a5c00', minWidth: 24 }}>
                            {String.fromCharCode(65 + sIdx)}.
                        </span>
                        <input
                            style={{ flex: 1, border: 'none', background: 'transparent', color: '#1a3500', fontWeight: 700, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                            value={sec.name}
                            onChange={e => setSections(p => p.map((s, i) => i === sIdx ? { ...s, name: e.target.value } : s))}
                            placeholder="Tên tầng / khu vực chính..."
                        />
                        <span style={{ fontWeight: 700, fontSize: 12, color: '#1a3500', whiteSpace: 'nowrap' }}>
                            {fmtN(secTotals[sIdx])} đ
                        </span>
                        {sections.length > 1 && (
                            <button onClick={() => setSections(p => p.filter((_, i) => i !== sIdx))}
                                style={{ background: 'none', border: 'none', color: '#3a7c00', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>✕</button>
                        )}
                    </div>

                    {/* Rooms (I-level) */}
                    {sec.rooms.map((rm, rmIdx) => (
                        <div key={rm._k} style={{ borderTop: rmIdx === 0 ? 'none' : '2px solid #92D050' }}>

                            {/* Room header – yellow */}
                            <div style={{ background: '#FFFF00', display: 'flex', alignItems: 'center', padding: '5px 10px 5px 28px', gap: 8, borderBottom: '1px solid #d4d400' }}>
                                <span style={{ fontWeight: 800, fontSize: 13, color: '#6b5800', minWidth: 40 }}>
                                    {String.fromCharCode(65 + sIdx)}.{toRoman(rmIdx)}.
                                </span>
                                <input
                                    style={{ flex: 1, border: 'none', background: 'transparent', color: '#4a3c00', fontWeight: 600, fontSize: 12.5, outline: 'none', fontFamily: 'inherit' }}
                                    value={rm.name}
                                    onChange={e => setSections(p => p.map((s, si) => si !== sIdx ? s : {
                                        ...s, rooms: s.rooms.map((r, ri) => ri !== rmIdx ? r : { ...r, name: e.target.value })
                                    }))}
                                    placeholder="Tên phòng / hạng mục (VD: Phòng khách)..."
                                />
                                <span style={{ fontWeight: 700, fontSize: 12, color: '#4a3c00', whiteSpace: 'nowrap' }}>
                                    {fmtN(roomTotals[sIdx][rmIdx])} đ
                                </span>
                                {sec.rooms.length > 1 && (
                                    <button onClick={() => setSections(p => p.map((s, si) => si !== sIdx ? s : {
                                        ...s, rooms: s.rooms.filter((_, ri) => ri !== rmIdx)
                                    }))}
                                        style={{ background: 'none', border: 'none', color: '#a09000', cursor: 'pointer', fontSize: 14 }}>✕</button>
                                )}
                            </div>

                            {/* Item table */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto', minWidth: 800 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...TH, width: 34 }}>#</th>
                                            {COLS.map(col => (
                                                <th key={col.key} style={{ ...TH, width: col.grow ? undefined : col.w, minWidth: col.grow ? 180 : undefined }}>
                                                    {col.label}
                                                </th>
                                            ))}
                                            <th style={{ ...TH, width: 68 }}>{'KHỐI\nLƯỢNG'}</th>
                                            <th style={{ ...TH, width: 106 }}>THÀNH TIỀN</th>
                                            <th style={{ ...TH, width: 26, background: '#0f2335' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rm.rows.map((row, rIdx) => {
                                            const kl = calcKL(row);
                                            const tt = calcTT(row);
                                            const evenBg = rIdx % 2 === 1 ? '#f9fafb' : '#fff';
                                            return (
                                                <tr key={row._k} style={{ background: evenBg }}>
                                                    <td style={{ ...TD, textAlign: 'center', fontSize: 10, color: '#9ca3af', background: '#f3f4f6', userSelect: 'none' }}>
                                                        {rIdx + 1}
                                                    </td>
                                                    {COLS.map((col, cIdx) => {
                                                        const refKey = `${sIdx}-${rmIdx}-${rIdx}-${cIdx}`;
                                                        return (
                                                            <td key={col.key} style={{ ...TD, background: evenBg, verticalAlign: col.textarea ? 'top' : 'middle' }}>
                                                                {col.textarea ? (
                                                                    <textarea
                                                                        ref={el => { cellRefs.current[refKey] = el; }}
                                                                        style={{ ...INPUT_S, resize: 'none', minHeight: 30, overflowY: 'hidden', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}
                                                                        value={row[col.key] || ''}
                                                                        rows={Math.max(1, (row[col.key] || '').split('\n').length)}
                                                                        onChange={e => {
                                                                            updateRow(sIdx, rmIdx, rIdx, col.key, e.target.value);
                                                                            e.target.style.height = 'auto';
                                                                            e.target.style.height = e.target.scrollHeight + 'px';
                                                                        }}
                                                                        onKeyDown={e => handleTextareaKey(e, sIdx, rmIdx, rIdx, cIdx)}
                                                                        onPaste={e => handlePaste(e, sIdx, rmIdx, rIdx, cIdx)}
                                                                        placeholder="Mô tả chất liệu..."
                                                                        tabIndex={0}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        ref={el => { cellRefs.current[refKey] = el; }}
                                                                        style={{ ...INPUT_S, textAlign: col.num ? 'right' : col.align || 'left' }}
                                                                        value={row[col.key] || ''}
                                                                        onChange={e => updateRow(sIdx, rmIdx, rIdx, col.key, e.target.value)}
                                                                        onKeyDown={e => handleKeyDown(e, sIdx, rmIdx, rIdx, cIdx)}
                                                                        onPaste={e => handlePaste(e, sIdx, rmIdx, rIdx, cIdx)}
                                                                        placeholder={cIdx === 0 ? 'Hạng mục...' : ''}
                                                                        tabIndex={0}
                                                                    />
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    {/* KL auto */}
                                                    <td style={{ ...AUTO_TD, background: evenBg === '#fff' ? '#eef2f7' : '#e8ecf2', color: kl ? '#1e3a5f' : '#ccc' }}>
                                                        {kl || ''}
                                                    </td>
                                                    {/* THÀNH TIỀN */}
                                                    <td style={{ ...AUTO_TD, background: evenBg === '#fff' ? '#eef2f7' : '#e8ecf2', color: tt ? '#1e3a5f' : '#ccc' }}>
                                                        {tt ? fmtN(tt) : ''}
                                                    </td>
                                                    {/* Delete row */}
                                                    <td style={{ ...TD, textAlign: 'center', background: '#f9fafb' }}>
                                                        <button onClick={() => removeRow(sIdx, rmIdx, rIdx)} title="Xóa dòng (Ctrl+Del)"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: '4px', lineHeight: 1 }}
                                                            onMouseEnter={e => e.target.style.color = '#ef4444'}
                                                            onMouseLeave={e => e.target.style.color = '#d1d5db'}>✕</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Room footer */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: '#fffde0', borderTop: '1px solid #e2e8f0' }}>
                                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => addRow(sIdx, rmIdx, rm.rows.length - 1)}>
                                    + Thêm dòng
                                </button>
                                <span style={{ fontSize: 12, color: '#475569' }}>
                                    Tổng phòng: <strong style={{ color: '#1e3a5f' }}>{fmtN(roomTotals[sIdx][rmIdx])} đ</strong>
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Add room inside section */}
                    <div style={{ padding: '6px 10px', background: '#f0ffe0', borderTop: '1px solid #b8e89b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: '#3a7c00' }}
                            onClick={() => setSections(p => p.map((s, si) => si !== sIdx ? s : { ...s, rooms: [...s.rooms, emptyRoom('')] }))}>
                            + Thêm phòng / hạng mục
                        </button>
                        <span style={{ fontSize: 12, color: '#3a7c00', fontWeight: 700 }}>
                            Tổng tầng: {fmtN(secTotals[sIdx])} đ
                        </span>
                    </div>
                </div>
            ))}

            {/* ── Add new floor section ────────────────────────────────────── */}
            <button className="btn btn-secondary" style={{ marginBottom: 20 }}
                onClick={() => setSections(p => [...p, emptySection('')])}>
                + Thêm tầng / khu vực mới
            </button>

            {/* ── Summary ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 40 }}>
                <div style={{ width: 320, border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#f8fafc', padding: '8px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid #e2e8f0' }}>
                        <span>Tổng cộng</span><strong>{fmtN(rawTotal)} đ</strong>
                    </div>
                    {form.discount > 0 && (
                        <div style={{ background: '#fff5f5', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#dc2626', borderBottom: '1px solid #e2e8f0' }}>
                            <span>Chiết khấu ({form.discount}%)</span>
                            <span>− {fmtN(rawTotal * form.discount / 100)} đ</span>
                        </div>
                    )}
                    {form.vat > 0 && (
                        <div style={{ background: '#f8fafc', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #e2e8f0' }}>
                            <span>VAT ({form.vat}%)</span><span>{fmtN(vatAmt)} đ</span>
                        </div>
                    )}
                    <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1a327a 100%)', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 13 }}>TỔNG GIÁ TRỊ</span>
                        <span style={{ color: '#E05B0A', fontWeight: 900, fontSize: 16 }}>{fmtN(grandTotal)} đ</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
