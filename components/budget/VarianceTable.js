'use client';
import { useState, useEffect, useCallback } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COST_TYPES = ['Tất cả', 'Vật tư', 'Nhân công', 'Thầu phụ', 'Khác'];

const thStyle = { background: '#1e3a5f', color: 'white', fontWeight: 700, textAlign: 'center', fontSize: 11, padding: '8px 6px', border: '1px solid #1e3a5f', whiteSpace: 'nowrap' };
const cellStyle = { border: '1px solid #d1d5db', padding: '5px 7px', fontSize: 12 };
const inpStyle = { width: '100%', padding: '3px 5px', fontSize: 11, border: '1px solid #93c5fd', borderRadius: 3, outline: 'none', background: '#eff6ff', boxSizing: 'border-box' };

const fmtDate = () => new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

function buildPrintHTML(project, items, summary) {
    const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

    // Build hierarchy
    const hierarchy = {};
    const g1Order = [];
    items.forEach(item => {
        const g1 = item.group1 || 'Chưa phân loại';
        const g2 = item.group2 || '';
        if (!hierarchy[g1]) { hierarchy[g1] = { subgroups: {}, g2Order: [], direct: [] }; g1Order.push(g1); }
        if (g2) {
            if (!hierarchy[g1].subgroups[g2]) { hierarchy[g1].subgroups[g2] = []; hierarchy[g1].g2Order.push(g2); }
            hierarchy[g1].subgroups[g2].push(item);
        } else { hierarchy[g1].direct.push(item); }
    });

    let rowsHTML = '';
    let globalStt = 0;

    g1Order.forEach((g1, gi) => {
        const d = hierarchy[g1];
        const allG1 = [...d.direct, ...Object.values(d.subgroups).flat()];
        const g1Budget = allG1.reduce((s, i) => s + (i.budgetTotal || 0), 0);
        const g1Actual = allG1.reduce((s, i) => s + (i.actualTotal || 0), 0);
        const g1Var = g1Budget - g1Actual;

        rowsHTML += `<tr class="g1-header"><td colspan="9">▌ ${g1} &nbsp;&nbsp; DT: ${fmt(g1Budget)} &nbsp;&nbsp; ${g1Actual > 0 ? (g1Var >= 0 ? '+' : '') + fmt(g1Var) : ''}</td></tr>`;

        const g2Keys = d.g2Order.filter((v, i, a) => a.indexOf(v) === i);
        const sections = [];
        if (d.direct.length) sections.push({ label: g1, items: d.direct, g2: '' });
        g2Keys.forEach(g2 => sections.push({ label: g2, items: d.subgroups[g2] || [], g2 }));

        sections.forEach(({ label, items: si }, si2) => {
            const sBudget = si.reduce((s, i) => s + (i.budgetTotal || 0), 0);
            const sActual = si.reduce((s, i) => s + (i.actualTotal || 0), 0);
            const sVar = sBudget - sActual;

            if (sections.length > 1 || label !== g1) {
                rowsHTML += `<tr class="g2-header"><td colspan="9">${ALPHA[si2]}. ${label}</td></tr>`;
            }

            si.forEach(item => {
                globalStt++;
                const ap = item.avgActualPrice || 0;
                const p = item.budgetUnitPrice || 0;
                const variance = (item.budgetTotal || 0) - (item.actualTotal || 0);
                rowsHTML += `<tr>
                    <td class="center">${globalStt}</td>
                    <td>${item.productName || ''}${item.productCode ? `<br><span class="sub">${item.productCode}</span>` : ''}</td>
                    <td class="center">${item.unit || ''}</td>
                    <td class="right">${item.budgetQty || 0}</td>
                    <td class="right">${fmt(p)}</td>
                    <td class="right blue">${fmt(item.budgetTotal || 0)}</td>
                    <td class="right ${ap > p ? 'red' : ap > 0 ? 'green' : 'gray'}">${ap > 0 ? fmt(ap) : '—'}</td>
                    <td class="right ${item.actualTotal > item.budgetTotal ? 'red' : item.actualTotal > 0 ? 'green' : 'gray'}">${item.actualTotal > 0 ? fmt(item.actualTotal) : '—'}</td>
                    <td class="right ${variance >= 0 ? 'green' : 'red'}">${item.actualTotal > 0 ? (variance >= 0 ? '+' : '') + fmt(variance) : '—'}</td>
                </tr>`;
            });

            rowsHTML += `<tr class="subtotal">
                <td colspan="5" class="right">Cộng ${label}:</td>
                <td class="right blue">${fmt(sBudget)}</td>
                <td></td>
                <td class="right ${sActual > sBudget ? 'red' : 'green'}">${sActual > 0 ? fmt(sActual) : '—'}</td>
                <td class="right ${sVar >= 0 ? 'green' : 'red'}">${sActual > 0 ? (sVar >= 0 ? '+' : '') + fmt(sVar) : '—'}</td>
            </tr>`;
        });
    });

    const totalVar = (summary?.totalBudget || 0) - (summary?.totalActual || 0);

    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Bảng theo dõi Chênh lệch Vật tư — ${project?.name || ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; }
  .page { max-width: 1000px; margin: 0 auto; padding: 24px 28px; }
  /* Header */
  .brand-bar { background: #f97316; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; border-radius: 8px 8px 0 0; }
  .brand-name { color: white; font-size: 18px; font-weight: 900; letter-spacing: 1px; }
  .brand-sub { color: rgba(255,255,255,0.85); font-size: 10px; margin-top: 2px; }
  .brand-date { color: rgba(255,255,255,0.9); font-size: 10px; text-align: right; }
  .doc-header { background: #1e3a5f; color: white; padding: 14px 20px; text-align: center; }
  .doc-title { font-size: 15px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
  .doc-sub { font-size: 10px; color: rgba(255,255,255,0.75); margin-top: 4px; }
  /* Project info */
  .project-info { padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .info-row { display: flex; gap: 6px; font-size: 11px; }
  .info-label { color: #6b7280; min-width: 90px; }
  .info-value { font-weight: 600; color: #1e3a5f; }
  /* Summary */
  .summary-bar { display: flex; gap: 0; margin: 16px 0 12px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  .sum-item { flex: 1; padding: 10px 16px; text-align: center; border-right: 1px solid #e2e8f0; }
  .sum-item:last-child { border-right: none; }
  .sum-label { font-size: 10px; color: #6b7280; margin-bottom: 3px; }
  .sum-value { font-size: 14px; font-weight: 800; }
  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1e3a5f; color: white; font-size: 10px; font-weight: 700; padding: 7px 5px; text-align: center; border: 1px solid #1e3a5f; white-space: nowrap; }
  td { border: 1px solid #d1d5db; padding: 5px 6px; font-size: 10.5px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f9fafb; }
  .g1-header td { background: #1e3a5f !important; color: white; font-weight: 700; font-size: 11px; padding: 7px 10px; }
  .g2-header td { background: #fde68a !important; color: #78350f; font-weight: 700; padding: 6px 12px; }
  .subtotal td { background: #fce4d6 !important; font-weight: 700; }
  .total-row td { background: #1e3a5f !important; color: white; font-weight: 700; font-size: 12px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .blue { color: #1d4ed8; font-weight: 600; }
  .green { color: #16a34a; font-weight: 600; }
  .red { color: #dc2626; font-weight: 600; }
  .gray { color: #9ca3af; }
  .sub { font-size: 9px; color: #9ca3af; }
  /* Footer */
  .footer { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #6b7280; border-top: 2px solid #f97316; padding-top: 12px; }
  .sign-box { text-align: center; }
  .sign-title { font-weight: 700; color: #1e3a5f; font-size: 11px; }
  .sign-line { border-bottom: 1px solid #d1d5db; width: 120px; margin: 40px auto 4px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 12px 16px; } }
</style></head><body>
<div class="page">
  <div class="brand-bar">
    <div><div class="brand-name">SCT</div><div class="brand-sub">CÔNG TY NỘI THẤT SCT</div></div>
    <div class="brand-date">Ngày in: ${fmtDate()}<br>Người lập: ${typeof window !== 'undefined' ? '' : ''}</div>
  </div>
  <div class="doc-header">
    <div class="doc-title">Bảng theo dõi chênh lệch vật tư</div>
    <div class="doc-sub">MATERIAL VARIANCE TRACKING REPORT</div>
  </div>
  <div class="project-info">
    <div class="info-row"><span class="info-label">Công trình:</span><span class="info-value">${project?.name || '—'}</span></div>
    <div class="info-row"><span class="info-label">Mã dự án:</span><span class="info-value">${project?.code || '—'}</span></div>
    <div class="info-row"><span class="info-label">Khách hàng:</span><span class="info-value">${project?.customer?.name || '—'}</span></div>
    <div class="info-row"><span class="info-label">Địa chỉ:</span><span class="info-value">${project?.address || '—'}</span></div>
  </div>
  <div class="summary-bar">
    <div class="sum-item"><div class="sum-label">Tổng Dự toán</div><div class="sum-value" style="color:#1d4ed8">${fmt(summary?.totalBudget || 0)}đ</div></div>
    <div class="sum-item"><div class="sum-label">Tổng Thực tế</div><div class="sum-value" style="color:#111">${fmt(summary?.totalActual || 0)}đ</div></div>
    <div class="sum-item"><div class="sum-label">Chênh lệch</div><div class="sum-value" style="color:${totalVar >= 0 ? '#16a34a' : '#dc2626'}">${totalVar >= 0 ? '+' : ''}${fmt(totalVar)}đ</div></div>
    <div class="sum-item"><div class="sum-label">CPI</div><div class="sum-value" style="color:${(summary?.overallCpi || 0) >= 1 ? '#16a34a' : '#dc2626'}">${summary?.overallCpi?.toFixed(2) || '—'}</div></div>
  </div>
  <table>
    <thead><tr>
      <th style="width:32px">#</th>
      <th>HẠNG MỤC / SẢN PHẨM</th>
      <th style="width:48px">ĐVT</th>
      <th style="width:52px">SL</th>
      <th style="width:90px">ĐG DT</th>
      <th style="width:100px">TỔNG DT</th>
      <th style="width:90px">ĐG TT</th>
      <th style="width:100px">TỔNG TT</th>
      <th style="width:100px">CHÊNH LỆCH</th>
    </tr></thead>
    <tbody>${rowsHTML}
      <tr class="total-row">
        <td colspan="5" class="right">TỔNG CỘNG:</td>
        <td class="right">${fmt(summary?.totalBudget || 0)}</td>
        <td></td>
        <td class="right">${summary?.totalActual > 0 ? fmt(summary.totalActual) : '—'}</td>
        <td class="right" style="color:${totalVar >= 0 ? '#86efac' : '#fca5a5'}">${summary?.totalActual > 0 ? (totalVar >= 0 ? '+' : '') + fmt(totalVar) : '—'}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">
    <div style="font-size:10px;color:#9ca3af">SCT — Hệ thống ERP Nội thất &nbsp;|&nbsp; Tài liệu nội bộ</div>
    <div style="display:flex;gap:48px">
      <div class="sign-box"><div class="sign-title">Lập bảng</div><div class="sign-line"></div><div>Ký tên</div></div>
      <div class="sign-box"><div class="sign-title">Giám đốc duyệt</div><div class="sign-line"></div><div>Ký tên</div></div>
    </div>
  </div>
</div>
</body></html>`;
}

export default function VarianceTable({ projectId, onTotalBudgetLoaded, project }) {
    const [items, setItems] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [costFilter, setCostFilter] = useState('Tất cả');
    const [activeTab, setActiveTab] = useState(0);
    const [collapsed, setCollapsed] = useState({});
    const [edits, setEdits] = useState({}); // { [id]: { qty, price, ap, name } }
    const [dirty, setDirty] = useState(false);
    const [allSaving, setAllSaving] = useState(false);
    const [addingTo, setAddingTo] = useState(null); // { g1, g2 }
    const [addForm, setAddForm] = useState({ name: '', unit: '', qty: 1, budgetUnitPrice: 0, actualUnitPrice: 0 });
    const [addingSubTo, setAddingSubTo] = useState(null);
    const [newSubName, setNewSubName] = useState('');
    const [addingG1, setAddingG1] = useState(false);
    const [newG1Name, setNewG1Name] = useState('');
    const [renamingSection, setRenamingSection] = useState(null); // { key, g1, g2, value }
    const [renamingTab, setRenamingTab] = useState(null); // { g1, value }
    const [newTabName, setNewTabName] = useState('');

    const exportPDF = () => {
        const html = buildPrintHTML(project, items, summary);
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 600);
    };

    const reload = useCallback(() => {
        setLoading(true);
        fetch(`/api/budget/variance?projectId=${projectId}&planType=tracking`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(d => {
                setItems(d.items || []);
                setSummary(d.summary || null);
                setEdits({});
                setDirty(false);
                if (d?.summary?.totalBudget !== undefined) onTotalBudgetLoaded?.(d.summary.totalBudget);
            })
            .catch((err) => {
                console.error('[VarianceTable] Lỗi tải dữ liệu:', err);
                setItems([]);
            })
            .finally(() => setLoading(false));
    }, [projectId]);

    useEffect(() => { reload(); }, [reload]);

    // Get current value (local edit override or original)
    const getVal = (item, field) => {
        const e = edits[item.id];
        if (e && e[field] !== undefined) return e[field];
        switch (field) {
            case 'qty': return item.budgetQty ?? 0;
            case 'price': return item.budgetUnitPrice ?? 0;
            case 'ap': return item.avgActualPrice ?? 0;
            case 'name': return item.productName || item.category || '';
            case 'unit': return item.unit || '';
        }
        return '';
    };

    const updateEdit = (id, field, val) => {
        setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));
        setDirty(true);
    };

    const saveAll = async () => {
        setAllSaving(true);
        try {
            const changed = Object.keys(edits);
            for (const id of changed) {
                const item = items.find(i => i.id === id);
                if (!item) continue;
                const e = edits[id];
                const qty = Number(e.qty ?? item.budgetQty) || 0;
                const price = Number(e.price ?? item.budgetUnitPrice) || 0;
                const ap = Number(e.ap ?? item.avgActualPrice) || 0;
                const body = { quantity: qty, budgetUnitPrice: price, actualCost: ap * qty };
                if (e.name !== undefined && !item.productCode) body.category = e.name;
                if (e.unit !== undefined) body.unit = e.unit;
                await fetch(`/api/material-plans/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
            }
            reload();
        } catch { alert('Lỗi lưu'); }
        finally { setAllSaving(false); }
    };

    const deleteItem = async (id) => {
        if (!confirm('Xóa dòng này?')) return;
        await fetch(`/api/material-plans/${id}`, { method: 'DELETE' });
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const submitAddItem = async (g1, g2) => {
        if (!addForm.name.trim()) return;
        const qty = Number(addForm.qty) || 0;
        const ap = Number(addForm.actualUnitPrice) || 0;
        const res = await fetch('/api/material-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{
                    customName: addForm.name,
                    unit: addForm.unit || '',
                    quantity: qty,
                    unitPrice: Number(addForm.budgetUnitPrice) || 0,
                    actualCost: ap * qty,
                    costType: 'Vật tư', group1: g1 || '', group2: g2 || '', planType: 'tracking',
                }],
                projectId,
            }),
        });
        if (res.ok) { setAddingTo(null); setAddForm({ name: '', unit: '', qty: 1, budgetUnitPrice: 0, actualUnitPrice: 0 }); reload(); }
    };

    const submitAddG1 = async () => {
        if (!newG1Name.trim()) return;
        await fetch('/api/material-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{ customName: 'Hạng mục mới', quantity: 0, unitPrice: 0, costType: 'Vật tư', group1: newG1Name.trim(), group2: '', planType: 'tracking' }],
                projectId,
            }),
        });
        setAddingG1(false); setNewG1Name(''); reload();
    };

    const submitRenameSection = async () => {
        if (!renamingSection) return;
        const { g1, g2, value } = renamingSection;
        const newName = value.trim();
        if (!newName) { setRenamingSection(null); return; }

        // Find all items in this section and update their group field
        const toUpdate = items.filter(i =>
            i.group1 === g1 && (g2 ? i.group2 === g2 : !i.group2)
        );
        const field = g2 ? 'group2' : 'group1';
        for (const item of toUpdate) {
            await fetch(`/api/material-plans/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: newName }),
            });
        }
        setRenamingSection(null);
        reload();
    };

    const submitRenameTab = async () => {
        if (!renamingTab) return;
        const { g1 } = renamingTab;
        const newName = newTabName.trim();
        if (!newName || newName === g1) { setRenamingTab(null); return; }

        const toUpdate = items.filter(i => i.group1 === g1);
        for (const item of toUpdate) {
            await fetch(`/api/material-plans/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group1: newName }),
            });
        }
        setRenamingTab(null);
        reload();
    };

    const submitAddSub = async (g1) => {
        if (!newSubName.trim()) return;
        await fetch('/api/material-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{ customName: 'Hạng mục mới', quantity: 1, unitPrice: 0, costType: 'Vật tư', group1: g1, group2: newSubName.trim(), planType: 'tracking' }],
                projectId,
            }),
        });
        setAddingSubTo(null); setNewSubName(''); reload();
    };

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Đang tải...</div>;

    const allItems = costFilter === 'Tất cả' ? items : items.filter(i => i.costType === costFilter);

    // Build hierarchy
    const hierarchy = {};
    const g1Order = [];
    allItems.forEach(item => {
        const g1 = item.group1 || 'Chưa phân loại';
        const g2 = item.group2 || '';
        if (!hierarchy[g1]) { hierarchy[g1] = { subgroups: {}, g2Order: [], direct: [] }; g1Order.push(g1); }
        if (g2) {
            if (!hierarchy[g1].subgroups[g2]) { hierarchy[g1].subgroups[g2] = []; hierarchy[g1].g2Order.push(g2); }
            hierarchy[g1].subgroups[g2].push(item);
        } else {
            hierarchy[g1].direct.push(item);
        }
    });

    const safeTab = Math.min(activeTab, g1Order.length - 1);
    const activeG1 = g1Order[safeTab];
    const activeData = hierarchy[activeG1] || { subgroups: {}, g2Order: [], direct: [] };

    const liveAgg = (sectionItems) => sectionItems.reduce((acc, item) => {
        const q = Number(getVal(item, 'qty')) || 0;
        const p = Number(getVal(item, 'price')) || 0;
        const ap = Number(getVal(item, 'ap')) || 0;
        acc.budget += q * p;
        acc.actual += ap * q;
        return acc;
    }, { budget: 0, actual: 0 });

    const renderRow = (item, stt) => {
        const q = Number(getVal(item, 'qty')) || 0;
        const p = Number(getVal(item, 'price')) || 0;
        const ap = Number(getVal(item, 'ap')) || 0;
        const name = getVal(item, 'name');
        const budgetTotal = q * p;
        const actualTotal = ap * q;
        const variance = budgetTotal - actualTotal;
        const isCustom = !item.productCode;
        const hasEdit = !!edits[item.id];
        const rowBg = hasEdit ? '#fffbeb' : stt % 2 === 0 ? '#f9fafb' : '#fff';

        return (
            <tr key={item.id} style={{ background: rowBg }}>
                <td style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af', fontSize: 11, width: 32 }}>{stt}</td>

                {/* HẠNG MỤC */}
                <td style={{ ...cellStyle, padding: '3px 4px' }}>
                    {isCustom ? (
                        <input style={{ ...inpStyle, textAlign: 'left' }}
                            value={name}
                            onChange={e => updateEdit(item.id, 'name', e.target.value)}
                            placeholder="Tên hạng mục..."
                        />
                    ) : (
                        <>
                            <div style={{ fontWeight: 500, fontSize: 12 }}>{name}</div>
                            {item.productCode && <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.productCode}</div>}
                        </>
                    )}
                </td>

                {/* ĐVT */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 70 }}>
                    <input style={{ ...inpStyle, textAlign: 'center' }}
                        value={getVal(item, 'unit')}
                        onChange={e => updateEdit(item.id, 'unit', e.target.value)}
                        placeholder="m², cái..." />
                </td>

                {/* SL */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 72 }}>
                    <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                        value={getVal(item, 'qty')}
                        onChange={e => updateEdit(item.id, 'qty', e.target.value)}
                        onFocus={e => e.target.select()} />
                </td>

                {/* ĐG DT */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 110 }}>
                    <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                        value={getVal(item, 'price')}
                        onChange={e => updateEdit(item.id, 'price', e.target.value)}
                        onFocus={e => e.target.select()} />
                </td>

                {/* TỔNG DT */}
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, color: '#2563eb', width: 105 }}>
                    {fmt(budgetTotal)}
                </td>

                {/* ĐG TT */}
                <td style={{ ...cellStyle, padding: '3px 4px', width: 110 }}>
                    <input style={{ ...inpStyle, textAlign: 'right', color: ap > p ? '#dc2626' : ap > 0 ? '#16a34a' : undefined }} type="number"
                        value={getVal(item, 'ap')}
                        onChange={e => updateEdit(item.id, 'ap', e.target.value)}
                        onFocus={e => e.target.select()} />
                </td>

                {/* TỔNG TT */}
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 600, width: 105,
                    color: actualTotal > budgetTotal ? '#dc2626' : actualTotal > 0 ? '#16a34a' : '#9ca3af' }}>
                    {actualTotal > 0 ? fmt(actualTotal) : '—'}
                </td>

                {/* CHÊNH LỆCH */}
                <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, width: 105,
                    color: variance >= 0 ? '#16a34a' : '#dc2626' }}>
                    {actualTotal > 0 ? `${variance >= 0 ? '+' : ''}${fmt(variance)}` : '—'}
                </td>

                {/* Actions */}
                <td style={{ ...cellStyle, textAlign: 'center', padding: '3px 4px', width: 36 }}>
                    <button onClick={() => deleteItem(item.id)} title="Xóa"
                        style={{ padding: '2px 7px', fontSize: 11, background: 'none', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', color: '#dc2626' }}>🗑</button>
                </td>
            </tr>
        );
    };

    const renderSection = (label, sttLetter, sectionItems, g1, g2, key) => {
        const isCollapsed = collapsed[key];
        const { budget, actual } = liveAgg(sectionItems);
        const variance = budget - actual;
        const isAdding = addingTo?.g1 === g1 && addingTo?.g2 === g2;

        const isRenaming = renamingSection?.key === key;

        return (
            <div key={key} style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ background: '#fde68a', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#78350f', cursor: 'pointer' }}
                        onClick={() => setCollapsed(p => ({ ...p, [key]: !p[key] }))}>
                        {isCollapsed ? '▶' : '▼'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#78350f', minWidth: 24 }}>{sttLetter}.</span>
                    {isRenaming ? (
                        <input
                            autoFocus
                            style={{ flex: 1, padding: '3px 8px', fontSize: 13, fontWeight: 700, border: '2px solid #92400e', borderRadius: 6, outline: 'none', background: '#fffbeb', color: '#92400e' }}
                            value={renamingSection.value}
                            onChange={e => setRenamingSection(r => ({ ...r, value: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') submitRenameSection(); if (e.key === 'Escape') setRenamingSection(null); }}
                            onBlur={submitRenameSection}
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            style={{ fontWeight: 600, fontSize: 13, color: '#92400e', flex: 1, cursor: 'pointer' }}
                            onClick={() => setCollapsed(p => ({ ...p, [key]: !p[key] }))}
                            onDoubleClick={e => { e.stopPropagation(); setRenamingSection({ key, g1, g2, value: label }); }}
                            title="Double-click để đổi tên">
                            {label}
                            <span style={{ marginLeft: 6, fontSize: 10, color: '#b45309', opacity: 0.6 }}>✏️</span>
                        </span>
                    )}
                    <span style={{ fontSize: 12, color: '#92400e' }}>DT: <strong>{fmt(budget)}</strong></span>
                    {actual > 0 && (
                        <span style={{ fontSize: 12, marginLeft: 8, color: variance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                            {variance >= 0 ? '+' : ''}{fmt(variance)}
                        </span>
                    )}
                </div>

                {!isCollapsed && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                                <tr>
                                    <th style={{ ...thStyle, width: 32 }}>#</th>
                                    <th style={{ ...thStyle }}>HẠNG MỤC</th>
                                    <th style={{ ...thStyle, width: 52 }}>ĐVT</th>
                                    <th style={{ ...thStyle, width: 62 }}>SL</th>
                                    <th style={{ ...thStyle, width: 105 }}>ĐG DT</th>
                                    <th style={{ ...thStyle, width: 105 }}>TỔNG DT</th>
                                    <th style={{ ...thStyle, width: 105 }}>ĐG TT</th>
                                    <th style={{ ...thStyle, width: 105 }}>TỔNG TT</th>
                                    <th style={{ ...thStyle, width: 105 }}>CHÊNH LỆCH</th>
                                    <th style={{ ...thStyle, width: 72 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sectionItems.map((item, i) => renderRow(item, i + 1))}
                                {/* Add row */}
                                {isAdding && (
                                    <tr style={{ background: '#f0fdf4' }}>
                                        <td style={{ ...cellStyle, textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>+</td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input autoFocus style={{ ...inpStyle, textAlign: 'left' }}
                                                placeholder="Tên hạng mục..."
                                                value={addForm.name}
                                                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') submitAddItem(g1, g2); if (e.key === 'Escape') setAddingTo(null); }}
                                            />
                                        </td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input style={{ ...inpStyle, textAlign: 'center' }}
                                                placeholder="ĐVT" value={addForm.unit || ''}
                                                onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} />
                                        </td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                                                placeholder="SL" value={addForm.qty || ''}
                                                onChange={e => setAddForm(f => ({ ...f, qty: e.target.value }))} />
                                        </td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input style={{ ...inpStyle, textAlign: 'right' }} type="number"
                                                placeholder="Đơn giá DT" value={addForm.budgetUnitPrice || ''}
                                                onChange={e => setAddForm(f => ({ ...f, budgetUnitPrice: e.target.value }))} />
                                        </td>
                                        <td style={{ ...cellStyle, textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>
                                            {fmt((Number(addForm.qty) || 0) * (Number(addForm.budgetUnitPrice) || 0))}
                                        </td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <input style={{ ...inpStyle, textAlign: 'right', color: '#16a34a' }} type="number"
                                                placeholder="Đơn giá TT" value={addForm.actualUnitPrice || ''}
                                                onChange={e => setAddForm(f => ({ ...f, actualUnitPrice: e.target.value }))} />
                                        </td>
                                        <td style={{ ...cellStyle, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                                            {fmt((Number(addForm.qty) || 0) * (Number(addForm.actualUnitPrice) || 0))}
                                        </td>
                                        <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#9ca3af' }}>—</td>
                                        <td style={{ ...cellStyle, padding: '3px 4px' }}>
                                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                                                <button onClick={() => submitAddItem(g1, g2)}
                                                    style={{ padding: '3px 9px', fontSize: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                                                <button onClick={() => setAddingTo(null)}
                                                    style={{ padding: '3px 7px', fontSize: 12, background: '#6b7280', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {/* Subtotal */}
                                <tr style={{ background: '#fce4d6' }}>
                                    <td colSpan={5} style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#92400e' }}>Cộng {label}:</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>{fmt(budget)}</td>
                                    <td style={cellStyle} />
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: actual > budget ? '#dc2626' : '#16a34a' }}>
                                        {actual > 0 ? fmt(actual) : '—'}
                                    </td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700, color: variance >= 0 ? '#16a34a' : '#dc2626' }}>
                                        {actual > 0 ? `${variance >= 0 ? '+' : ''}${fmt(variance)}` : '—'}
                                    </td>
                                    <td style={cellStyle} />
                                </tr>
                            </tbody>
                        </table>
                        <div style={{ padding: '8px 12px' }}>
                            <button onClick={() => { setAddingTo({ g1, g2 }); setAddForm({ name: '', qty: 1, budgetUnitPrice: 0 }); }}
                                style={{ fontSize: 12, color: '#2563eb', background: 'none', border: '1px dashed #93c5fd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                                + Thêm dòng
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const g2Keys = (activeData.g2Order || []).filter((v, i, a) => a.indexOf(v) === i);
    const sections = [];
    if (activeData.direct.length) sections.push({ label: activeG1, items: activeData.direct, g2: '' });
    g2Keys.forEach(g2 => sections.push({ label: g2, items: activeData.subgroups[g2] || [], g2 }));
    if (!sections.length) sections.push({ label: activeG1, items: [], g2: '' });

    const allTabItems = [...(activeData.direct || []), ...g2Keys.flatMap(g2 => activeData.subgroups[g2] || [])];
    const { budget: tabBudget, actual: tabActual } = liveAgg(allTabItems);

    if (!items.length) return (
        <div style={{ padding: 24 }}>
            <div style={{ textAlign: 'center', color: '#9ca3af', marginBottom: 20 }}>Chưa có dữ liệu. Tạo hạng mục đầu tiên để bắt đầu nhập.</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                {addingG1 ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input autoFocus
                            style={{ padding: '7px 14px', fontSize: 13, border: '1px solid #93c5fd', borderRadius: 8, outline: 'none', width: 200 }}
                            placeholder="Tên hạng mục chính..."
                            value={newG1Name}
                            onChange={e => setNewG1Name(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitAddG1(); if (e.key === 'Escape') setAddingG1(false); }}
                        />
                        <button onClick={submitAddG1}
                            style={{ padding: '7px 16px', fontSize: 13, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>✓ Thêm</button>
                        <button onClick={() => setAddingG1(false)}
                            style={{ padding: '7px 12px', fontSize: 13, background: 'none', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                    </div>
                ) : (
                    <button onClick={() => { setAddingG1(true); setNewG1Name(''); }}
                        style={{ padding: '9px 24px', fontSize: 14, border: '2px dashed #93c5fd', borderRadius: 10, background: 'transparent', cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}>
                        + Thêm hạng mục chính
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div>
            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                    {summary && [
                        { label: 'Tổng DT', value: fmt(summary.totalBudget) + 'đ', color: '#2563eb' },
                        { label: 'Tổng TT', value: fmt(summary.totalActual) + 'đ', color: '#111' },
                        { label: 'Chênh lệch', value: (summary.totalVariance <= 0 ? '+' : '') + fmt(-summary.totalVariance) + 'đ', color: summary.totalVariance <= 0 ? '#16a34a' : '#dc2626' },
                    ].map(s => (
                        <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{s.label}</span>
                            <span style={{ fontWeight: 700, fontSize: 14, color: s.color }}>{s.value}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={saveAll} disabled={allSaving}
                        style={{ padding: '7px 18px', fontSize: 13, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: dirty ? '#1e3a5f' : '#4b7ab5', color: 'white',
                            boxShadow: '0 2px 8px rgba(30,58,95,0.25)', display: 'flex', alignItems: 'center', gap: 6,
                            opacity: allSaving ? 0.7 : 1 }}>
                        💾 {allSaving ? 'Đang lưu...' : dirty ? 'Lưu *' : 'Lưu'}
                    </button>
                    <button onClick={exportPDF}
                        style={{ padding: '7px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: '#f97316', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                        📄 Xuất PDF
                    </button>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {COST_TYPES.map(ct => (
                        <button key={ct} onClick={() => setCostFilter(ct)}
                            style={{ padding: '4px 11px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid', cursor: 'pointer',
                                background: costFilter === ct ? '#1e3a5f' : 'white', color: costFilter === ct ? 'white' : '#6b7280',
                                borderColor: costFilter === ct ? '#1e3a5f' : '#d1d5db' }}>
                            {ct}
                        </button>
                    ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 8, alignItems: 'center' }}>
                {g1Order.map((g1, ti) => {
                    const d = hierarchy[g1];
                    const allG1 = [...d.direct, ...Object.values(d.subgroups).flat()];
                    const { budget, actual } = liveAgg(allG1);
                    const v = budget - actual;
                    const isActive = ti === safeTab;
                    const isRenamingThis = renamingTab?.g1 === g1;
                    return (
                        <div key={g1} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {isRenamingThis ? (
                                <>
                                    <input autoFocus
                                        style={{ padding: '5px 10px', fontSize: 13, border: '2px solid #2563eb', borderRadius: 8, outline: 'none', width: 180, fontWeight: 700 }}
                                        value={newTabName}
                                        onChange={e => setNewTabName(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') submitRenameTab(); if (e.key === 'Escape') setRenamingTab(null); }}
                                        onBlur={submitRenameTab}
                                    />
                                    <button onMouseDown={e => { e.preventDefault(); submitRenameTab(); }}
                                        style={{ padding: '4px 8px', fontSize: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                                    <button onMouseDown={e => { e.preventDefault(); setRenamingTab(null); }}
                                        style={{ padding: '4px 7px', fontSize: 12, background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setActiveTab(ti)}
                                        style={{ padding: '7px 16px', fontSize: 13, fontWeight: isActive ? 700 : 500, borderRadius: 8,
                                            border: isActive ? '2px solid #2563eb' : '1px solid #e5e7eb',
                                            background: isActive ? '#eff6ff' : 'var(--bg-card)', cursor: 'pointer',
                                            color: isActive ? '#2563eb' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                        {g1}
                                        {budget > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: isActive ? '#3b82f6' : '#9ca3af' }}>{fmt(budget)}</span>}
                                        {actual > 0 && <span style={{ marginLeft: 4, fontSize: 10, color: v >= 0 ? '#16a34a' : '#dc2626' }}>{v >= 0 ? '▲' : '▼'}</span>}
                                    </button>
                                    <button onClick={e => { e.stopPropagation(); setActiveTab(ti); setRenamingTab({ g1 }); setNewTabName(g1); }}
                                        title="Đổi tên"
                                        style={{ padding: '3px 6px', fontSize: 11, background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}>
                                        ✏️
                                    </button>
                                </>
                            )}
                        </div>
                    );
                })}
                {addingG1 ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input autoFocus
                            style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #93c5fd', borderRadius: 8, outline: 'none', width: 160 }}
                            placeholder="Tên hạng mục..."
                            value={newG1Name}
                            onChange={e => setNewG1Name(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitAddG1(); if (e.key === 'Escape') setAddingG1(false); }}
                        />
                        <button onClick={submitAddG1}
                            style={{ padding: '5px 12px', fontSize: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>✓</button>
                        <button onClick={() => setAddingG1(false)}
                            style={{ padding: '5px 9px', fontSize: 12, background: 'none', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                    </div>
                ) : (
                    <button onClick={() => { setAddingG1(true); setNewG1Name(''); }}
                        style={{ padding: '7px 14px', fontSize: 13, border: '1px dashed #93c5fd', borderRadius: 8, background: 'transparent', cursor: 'pointer', color: '#2563eb', fontWeight: 500 }}>
                        + Thêm
                    </button>
                )}
            </div>

            {/* Sections */}
            {sections.map(({ label, items: si, g2 }, idx) =>
                renderSection(label, ALPHA[idx], si, activeG1, g2, `s-${activeG1}-${g2 || idx}`)
            )}

            {/* Add subcategory */}
            <div style={{ marginBottom: 16 }}>
                {addingSubTo === activeG1 ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input autoFocus
                            style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #86efac', borderRadius: 8, outline: 'none', width: 200 }}
                            placeholder="Tên mục con..."
                            value={newSubName}
                            onChange={e => setNewSubName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitAddSub(activeG1); if (e.key === 'Escape') setAddingSubTo(null); }}
                        />
                        <button onClick={() => submitAddSub(activeG1)}
                            style={{ padding: '6px 14px', fontSize: 12, background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>✓ Thêm</button>
                        <button onClick={() => setAddingSubTo(null)}
                            style={{ padding: '6px 10px', fontSize: 12, background: 'none', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', color: '#6b7280' }}>✕</button>
                    </div>
                ) : (
                    <button onClick={() => { setAddingSubTo(activeG1); setNewSubName(''); }}
                        style={{ fontSize: 13, color: '#16a34a', background: 'none', border: '1px dashed #86efac', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>
                        + Thêm mục con
                    </button>
                )}
            </div>

            {/* Tab total */}
            <div style={{ background: '#1e3a5f', borderRadius: 8, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 13, letterSpacing: 0.5 }}>TỔNG — {activeG1}</span>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ color: '#93c5fd', fontSize: 13 }}>DT: <strong style={{ color: 'white' }}>{fmt(tabBudget)}</strong></span>
                    {tabActual > 0 && (
                        <span style={{ color: '#93c5fd', fontSize: 13 }}>TT: <strong style={{ color: tabActual > tabBudget ? '#fca5a5' : '#86efac' }}>{fmt(tabActual)}</strong></span>
                    )}
                    {tabActual > 0 && (() => {
                        const v = tabBudget - tabActual;
                        return <span style={{ fontSize: 13, fontWeight: 700, color: v >= 0 ? '#86efac' : '#fca5a5' }}>{v >= 0 ? '+' : ''}{fmt(v)}</span>;
                    })()}
                </div>
            </div>
        </div>
    );
}
