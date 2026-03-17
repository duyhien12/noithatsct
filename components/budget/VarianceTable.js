'use client';
import { useState, useEffect } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COST_TYPES = ['Tất cả', 'Vật tư', 'Nhân công', 'Thầu phụ', 'Khác'];
const EDIT_COST_TYPES = ['Vật tư', 'Nhân công', 'Thầu phụ', 'Khác'];

const C = {
    cell:   { border: '1px solid #d1d5db', padding: '6px 8px', fontSize: 12 },
    header: { background: '#1e3a5f', color: 'white', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', fontSize: 11, padding: '8px 6px', border: '1px solid #1e3a5f', whiteSpace: 'nowrap' },
    g1:     { background: '#fde68a', fontWeight: 700, fontSize: 13 },
    g2:     { background: '#fce4d6', fontWeight: 600, fontSize: 12 },
    item:   { background: '#ffffff', fontSize: 12 },
    total:  { background: '#1e3a5f', color: 'white', fontWeight: 700, fontSize: 13 },
};

const statusColor = { green: '#16a34a', yellow: '#d97706', red: '#dc2626' };
const cpiColor = (v) => !v ? '#9ca3af' : v >= 1 ? '#16a34a' : v >= 0.95 ? '#d97706' : '#dc2626';

export default function VarianceTable({ projectId, onTotalBudgetLoaded }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [costFilter, setCostFilter] = useState('Tất cả');
    const [collapsed, setCollapsed] = useState({});
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);

    const reload = () => {
        setLoading(true);
        fetch(`/api/budget/variance?projectId=${projectId}&planType=tracking`)
            .then(r => r.json())
            .then(d => {
                setData(d);
                if (d?.summary?.totalBudget !== undefined) {
                    onTotalBudgetLoaded?.(d.summary.totalBudget);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { reload(); }, [projectId]);

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({
            budgetQty: item.budgetQty ?? 0,
            budgetUnitPrice: item.budgetUnitPrice ?? 0,
            actualUnitPrice: item.avgActualPrice ?? 0,
            costType: item.costType || 'Vật tư',
            group1: item.group1 || '',
            group2: item.group2 || '',
        });
    };

    const cancelEdit = () => { setEditingId(null); setEditForm({}); };

    const deleteItem = async (id) => {
        if (!confirm('Xóa dòng này khỏi dự toán?')) return;
        await fetch(`/api/material-plans/${id}`, { method: 'DELETE' });
        reload();
    };

    const saveEdit = async (id) => {
        setSaving(true);
        try {
            const qty = Number(editForm.budgetQty) || 0;
            const price = Number(editForm.budgetUnitPrice) || 0;
            const actualUnitPrice = Number(editForm.actualUnitPrice) || 0;
            const res = await fetch(`/api/material-plans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quantity: qty,
                    budgetUnitPrice: price,
                    actualCost: actualUnitPrice * qty,
                    costType: editForm.costType,
                    group1: editForm.group1,
                    group2: editForm.group2,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || 'Lỗi lưu dữ liệu');
                return;
            }
            setEditingId(null);
            reload();
        } catch (e) {
            alert('Lỗi kết nối: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Đang tải...</div>;
    if (!data?.items?.length) return <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Chưa có dữ liệu dự toán</div>;

    const allItems = costFilter === 'Tất cả' ? data.items : data.items.filter(i => i.costType === costFilter);
    const { totalBudget, totalActual, totalVariance, overallCpi } = data.summary;

    // Build hierarchy
    const hierarchy = {};
    allItems.forEach(item => {
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

    const toggle = (key) => setCollapsed(p => ({ ...p, [key]: !p[key] }));

    // Aggregate variance for a set of items
    const agg = (items) => {
        const budgetTotal = items.reduce((s, i) => s + i.budgetTotal, 0);
        const actualTotal = items.reduce((s, i) => s + i.actualTotal, 0);
        const variance = actualTotal - budgetTotal;
        const cpi = actualTotal > 0 ? Math.round((budgetTotal / actualTotal) * 100) / 100 : null;
        return { budgetTotal, actualTotal, variance, cpi };
    };

    const inputStyle = { width: '100%', padding: '3px 5px', fontSize: 11, border: '1px solid #93c5fd', borderRadius: 3, textAlign: 'right', outline: 'none' };

    const renderItemRow = (item, stt, indent) => {
        const isEditing = editingId === item.id;
        const dgTT = isEditing ? (Number(editForm.actualUnitPrice) || 0) : item.avgActualPrice;
        const tongTT = isEditing ? (Number(editForm.actualUnitPrice) || 0) * (Number(editForm.budgetQty) || 0) : item.actualTotal;
        return (
            <tr key={item.id} style={{ ...C.item, borderLeft: `3px solid ${statusColor[item.status] || '#d1d5db'}`, background: isEditing ? '#eff6ff' : '#ffffff' }}>
                <td style={{ ...C.cell, textAlign: 'center', color: '#6b7280' }}>{stt}</td>
                <td style={{ ...C.cell, paddingLeft: indent }}>
                    <div style={{ fontWeight: 500 }}>{item.productName}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        {item.productCode && <span>{item.productCode}</span>}
                        {item.costType && item.costType !== 'Vật tư' && (
                            <span style={{ padding: '1px 5px', borderRadius: 3, background: item.costType === 'Nhân công' ? '#ede9fe' : item.costType === 'Thầu phụ' ? '#fff7ed' : '#f1f5f9', color: item.costType === 'Nhân công' ? '#7c3aed' : item.costType === 'Thầu phụ' ? '#ea580c' : '#475569', fontSize: 9 }}>{item.costType}</span>
                        )}
                        {item.supplierTag && <span style={{ color: item.supplierTag === 'Thầu phụ cấp' ? '#ea580c' : '#2563eb' }}>• {item.supplierTag}</span>}
                    </div>
                </td>
                <td style={{ ...C.cell, textAlign: 'center' }}>{item.unit}</td>
                <td style={{ ...C.cell, textAlign: 'right', padding: isEditing ? '4px' : undefined }}>
                    {isEditing
                        ? <input style={inputStyle} type="number" value={editForm.budgetQty} onChange={e => setEditForm(f => ({ ...f, budgetQty: e.target.value }))} />
                        : item.budgetQty}
                </td>
                <td style={{ ...C.cell, textAlign: 'right', padding: isEditing ? '4px' : undefined }}>
                    {isEditing
                        ? <input style={inputStyle} type="number" value={editForm.budgetUnitPrice} onChange={e => setEditForm(f => ({ ...f, budgetUnitPrice: e.target.value }))} />
                        : fmt(item.budgetUnitPrice)}
                </td>
                <td style={{ ...C.cell, textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                    {fmt(isEditing ? (Number(editForm.budgetQty) || 0) * (Number(editForm.budgetUnitPrice) || 0) : item.budgetTotal)}
                </td>
                <td style={{ ...C.cell, textAlign: 'right', padding: isEditing ? '4px' : undefined, color: dgTT > item.budgetUnitPrice ? '#dc2626' : dgTT > 0 ? '#16a34a' : '#9ca3af', fontWeight: dgTT > item.budgetUnitPrice ? 700 : 400 }}>
                    {isEditing
                        ? <input style={{ ...inputStyle, borderColor: '#fca5a5' }} type="number" value={editForm.actualUnitPrice} onChange={e => setEditForm(f => ({ ...f, actualUnitPrice: e.target.value }))} />
                        : (dgTT > 0 ? fmt(dgTT) : '—')}
                </td>
                <td style={{ ...C.cell, textAlign: 'right', color: tongTT > item.budgetTotal ? '#dc2626' : tongTT > 0 ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                    {tongTT > 0 ? fmt(tongTT) : '—'}
                </td>
                <td style={{ ...C.cell, textAlign: 'right', color: (isEditing ? (Number(editForm.budgetQty) || 0) * (Number(editForm.budgetUnitPrice) || 0) - tongTT : item.budgetTotal - item.actualTotal) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    {(() => {
                        const budgetT = isEditing ? (Number(editForm.budgetQty) || 0) * (Number(editForm.budgetUnitPrice) || 0) : item.budgetTotal;
                        const diff = budgetT - tongTT;
                        return tongTT > 0 ? `${diff >= 0 ? '+' : ''}${fmt(diff)}` : '—';
                    })()}
                </td>
                <td style={{ ...C.cell, textAlign: 'center', padding: '4px' }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            <button onClick={() => saveEdit(item.id)} disabled={saving}
                                style={{ padding: '3px 7px', fontSize: 13, background: '#16a34a', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✓</button>
                            <button onClick={cancelEdit}
                                style={{ padding: '3px 7px', fontSize: 13, background: '#6b7280', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✕</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                            <button onClick={() => startEdit(item)}
                                style={{ padding: '2px 6px', fontSize: 11, background: 'none', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', color: '#6b7280' }}>✏️</button>
                            <button onClick={() => deleteItem(item.id)}
                                style={{ padding: '2px 6px', fontSize: 11, background: 'none', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', color: '#dc2626' }}>🗑️</button>
                        </div>
                    )}
                </td>
            </tr>
        );
    };

    const renderGroupRow = (stt, name, items, level, gKey) => {
        const { budgetTotal, actualTotal, variance, cpi } = agg(items);
        const isCollapsed = collapsed[gKey];
        const bg = level === 1 ? C.g1 : C.g2;
        const indent = level === 1 ? 8 : 20;
        return (
            <tr key={gKey} style={{ ...bg, cursor: 'pointer' }} onClick={() => toggle(gKey)}>
                <td style={{ ...C.cell, textAlign: 'center', fontWeight: 700 }}>{stt}</td>
                <td style={{ ...C.cell, paddingLeft: indent, textTransform: level === 1 ? 'uppercase' : 'none', fontStyle: level === 2 ? 'italic' : 'normal' }}>
                    <span style={{ marginRight: 6, fontSize: 10, color: '#6b7280' }}>{isCollapsed ? '▶' : '▼'}</span>
                    {name}
                </td>
                <td style={C.cell} /><td style={C.cell} /><td style={C.cell} />
                <td style={{ ...C.cell, textAlign: 'right', fontWeight: 700, color: '#1e3a5f' }}>{fmt(budgetTotal)}</td>
                <td style={C.cell} />
                <td style={{ ...C.cell, textAlign: 'right', color: actualTotal > 0 ? (actualTotal > budgetTotal ? '#dc2626' : '#16a34a') : '#9ca3af', fontWeight: 600 }}>
                    {actualTotal > 0 ? fmt(actualTotal) : '—'}
                </td>
                <td style={{ ...C.cell, textAlign: 'right', color: variance <= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                    {actualTotal > 0 ? `${variance <= 0 ? '+' : ''}${fmt(-variance)}` : '—'}
                </td>
            </tr>
        );
    };

    // Flatten rows
    const rows = [];
    Object.entries(hierarchy).forEach(([g1Name, g1Data], g1Idx) => {
        const allG1 = [...g1Data.items, ...Object.values(g1Data.subgroups).flat()];
        const g1Key = `g1-${g1Name}`;
        rows.push({ type: 'g1', stt: ALPHA[g1Idx], name: g1Name, items: allG1, key: g1Key });

        if (!collapsed[g1Key]) {
            g1Data.items.forEach((item, i) => rows.push({ type: 'item', item, stt: i + 1, indent: 20 }));
            Object.entries(g1Data.subgroups).forEach(([g2Name, g2Items], g2Idx) => {
                const g2Key = `g2-${g1Name}-${g2Name}`;
                rows.push({ type: 'g2', stt: ROMAN[g2Idx], name: g2Name, items: g2Items, key: g2Key });
                if (!collapsed[g2Key]) {
                    g2Items.forEach((item, i) => rows.push({ type: 'item', item, stt: i + 1, indent: 32 }));
                }
            });
        }
    });

    return (
        <div>
            {/* Summary + Filter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Tổng DT', value: fmt(totalBudget) + 'đ', color: '#2563eb' },
                        { label: 'Tổng thực tế', value: fmt(totalActual) + 'đ', color: '#111' },
                        { label: 'Chênh lệch', value: (totalVariance <= 0 ? '+' : '') + fmt(-totalVariance) + 'đ', color: totalVariance <= 0 ? '#16a34a' : '#dc2626' },
                        ...(overallCpi !== null ? [{ label: 'CPI', value: overallCpi.toFixed(2), color: cpiColor(overallCpi), big: true }] : []),
                    ].map(s => (
                        <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{s.label}</span>
                            <span style={{ fontWeight: 700, fontSize: s.big ? 18 : 14, color: s.color }}>{s.value}</span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {COST_TYPES.map(ct => (
                        <button key={ct} onClick={() => setCostFilter(ct)}
                            style={{ padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: '1px solid', cursor: 'pointer', background: costFilter === ct ? '#1e3a5f' : 'white', color: costFilter === ct ? 'white' : '#6b7280', borderColor: costFilter === ct ? '#1e3a5f' : '#d1d5db' }}>
                            {ct}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {[
                                { label: 'STT', w: 40 },
                                { label: 'TÊN HẠNG MỤC', w: 'auto' },
                                { label: 'ĐVT', w: 55 },
                                { label: 'SL', w: 65 },
                                { label: 'ĐG', w: 100 },
                                { label: 'Tổng DT', w: 110 },
                                { label: 'ĐG TT', w: 100 },
                                { label: 'Tổng TT', w: 110 },
                                { label: 'Chênh lệch', w: 110 },
                                { label: '', w: 60 },
                            ].map(h => (
                                <th key={h.label} style={{ ...C.header, width: h.w }}>{h.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            if (row.type === 'g1') return renderGroupRow(row.stt, row.name, row.items, 1, row.key);
                            if (row.type === 'g2') return renderGroupRow(row.stt, row.name, row.items, 2, row.key);
                            return renderItemRow(row.item, row.stt, row.indent);
                        })}
                        {/* Grand total */}
                        <tr style={C.total}>
                            <td colSpan={5} style={{ ...C.cell, textAlign: 'center', letterSpacing: 1, border: '1px solid #374151', color: 'white' }}>TỔNG CỘNG</td>
                            <td style={{ ...C.cell, textAlign: 'right', border: '1px solid #374151', color: 'white', fontSize: 13 }}>{fmt(totalBudget)}</td>
                            <td style={{ border: '1px solid #374151' }} />
                            <td style={{ ...C.cell, textAlign: 'right', border: '1px solid #374151', color: totalActual > 0 ? (totalActual > totalBudget ? '#fca5a5' : '#86efac') : '#9ca3af' }}>
                                {totalActual > 0 ? fmt(totalActual) : '—'}
                            </td>
                            <td style={{ ...C.cell, textAlign: 'right', border: '1px solid #374151', color: totalVariance <= 0 ? '#86efac' : '#fca5a5', fontWeight: 700 }}>
                                {totalActual > 0 ? `${totalVariance <= 0 ? '+' : ''}${fmt(-totalVariance)}` : '—'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
