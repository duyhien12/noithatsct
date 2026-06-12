'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Edit3, Check, X, TrendingUp, TrendingDown } from 'lucide-react';

const fmt = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '—';
const fmtPct = (n) => `${((n || 0) * 100).toFixed(1)}%`;
const toNum = (v) => Number(v) || 0;
const C = { padding: '8px 10px', border: '1px solid transparent', borderRadius: 4, whiteSpace: 'nowrap', fontSize: 12 };
const TARGET = 0.18;

// ─── inline input cell ────────────────────────────────────────────
function EditCell({ value, onChange, type = 'text', style = {} }) {
    return (
        <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
            style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12, background: 'white', boxSizing: 'border-box', ...style }} />
    );
}

// ─── Vật tư tab ───────────────────────────────────────────────────
function MaterialsTab({ projectId, rows, onReload }) {
    const blank = { grp: '', name: '', detail: '', unit: '', qty: '', unitPrice: '', wastePct: '' };
    const [draft, setDraft] = useState(blank);
    const [saving, setSaving] = useState(false);

    async function add() {
        if (!draft.name.trim()) return;
        setSaving(true);
        await fetch(`/api/cost-mgmt/projects/${projectId}/materials`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft)
        });
        setDraft(blank); setSaving(false); onReload();
    }

    async function del(rowId) {
        await fetch(`/api/cost-mgmt/projects/${projectId}/materials?rowId=${rowId}`, { method: 'DELETE' });
        onReload();
    }

    async function update(row, field, value) {
        const updated = { ...row, [field]: value };
        await fetch(`/api/cost-mgmt/projects/${projectId}/materials`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
        });
        onReload();
    }

    const groups = [...new Set(rows.map(r => r.grp).filter(Boolean))];

    return (
        <div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                            {['Nhóm','Tên vật tư','Chi tiết/Màu','ĐVT','SL','Đơn giá','Hao hụt %','Thành tiền',''].map((h, i) => (
                                <th key={i} style={{ padding: '9px 10px', textAlign: i >= 4 ? 'right' : 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={C}><EditCell value={r.grp} onChange={v => update(r, 'grp', v)} /></td>
                                <td style={C}><EditCell value={r.name} onChange={v => update(r, 'name', v)} /></td>
                                <td style={C}><EditCell value={r.detail} onChange={v => update(r, 'detail', v)} /></td>
                                <td style={C}><EditCell value={r.unit} onChange={v => update(r, 'unit', v)} style={{ width: 60 }} /></td>
                                <td style={C}><EditCell value={r.qty} type="number" onChange={v => update(r, 'qty', v)} style={{ width: 70, textAlign: 'right' }} /></td>
                                <td style={C}><EditCell value={r.unitPrice} type="number" onChange={v => update(r, 'unitPrice', v)} style={{ width: 100, textAlign: 'right' }} /></td>
                                <td style={C}><EditCell value={r.wastePct} type="number" onChange={v => update(r, 'wastePct', v)} style={{ width: 60, textAlign: 'right' }} /></td>
                                <td style={{ ...C, textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>{fmt(toNum(r.qty) * toNum(r.unitPrice) * (1 + toNum(r.wastePct)))}đ</td>
                                <td style={C}><button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={13} /></button></td>
                            </tr>
                        ))}
                        {/* Add row */}
                        <tr style={{ background: '#f0fdf4', borderTop: '2px dashed #86efac' }}>
                            <td style={C}><EditCell value={draft.grp} onChange={v => setDraft(d => ({ ...d, grp: v }))} placeholder="Nhóm" /></td>
                            <td style={C}><EditCell value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} placeholder="Tên vật tư *" /></td>
                            <td style={C}><EditCell value={draft.detail} onChange={v => setDraft(d => ({ ...d, detail: v }))} placeholder="Chi tiết" /></td>
                            <td style={C}><EditCell value={draft.unit} onChange={v => setDraft(d => ({ ...d, unit: v }))} style={{ width: 60 }} placeholder="ĐVT" /></td>
                            <td style={C}><EditCell value={draft.qty} type="number" onChange={v => setDraft(d => ({ ...d, qty: v }))} style={{ width: 70, textAlign: 'right' }} /></td>
                            <td style={C}><EditCell value={draft.unitPrice} type="number" onChange={v => setDraft(d => ({ ...d, unitPrice: v }))} style={{ width: 100, textAlign: 'right' }} /></td>
                            <td style={C}><EditCell value={draft.wastePct} type="number" onChange={v => setDraft(d => ({ ...d, wastePct: v }))} style={{ width: 60, textAlign: 'right' }} placeholder="0" /></td>
                            <td style={{ ...C, textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                                {draft.qty && draft.unitPrice ? fmt(toNum(draft.qty) * toNum(draft.unitPrice) * (1 + toNum(draft.wastePct))) + 'đ' : '—'}
                            </td>
                            <td style={C}>
                                <button onClick={add} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                    <Plus size={11} /> Thêm
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={{ marginTop: 10, textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
                Tổng vật tư: <strong style={{ color: '#111827' }}>{fmt(rows.reduce((s, r) => s + toNum(r.qty) * toNum(r.unitPrice) * (1 + toNum(r.wastePct)), 0))}đ</strong>
            </div>
        </div>
    );
}

// ─── Nhân công tab ────────────────────────────────────────────────
function LaborTab({ projectId, rows, onReload }) {
    const blank = { category: '', type: '', unit: 'Công', qty: '', unitPrice: '' };
    const [draft, setDraft] = useState(blank);
    const [saving, setSaving] = useState(false);

    async function add() {
        if (!draft.type.trim()) return;
        setSaving(true);
        await fetch(`/api/cost-mgmt/projects/${projectId}/labor`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft)
        });
        setDraft(blank); setSaving(false); onReload();
    }

    async function del(rowId) {
        await fetch(`/api/cost-mgmt/projects/${projectId}/labor?rowId=${rowId}`, { method: 'DELETE' });
        onReload();
    }

    async function update(row, field, value) {
        const updated = { ...row, [field]: value };
        await fetch(`/api/cost-mgmt/projects/${projectId}/labor`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
        });
        onReload();
    }

    return (
        <div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                            {['Hạng mục/Đội thợ','Loại công','ĐVT','Số lượng','Đơn giá','Thành tiền',''].map((h, i) => (
                                <th key={i} style={{ padding: '9px 10px', textAlign: i >= 3 ? 'right' : 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={C}><EditCell value={r.category} onChange={v => update(r, 'category', v)} placeholder="Gia công xưởng..." /></td>
                                <td style={C}><EditCell value={r.type} onChange={v => update(r, 'type', v)} /></td>
                                <td style={C}><EditCell value={r.unit} onChange={v => update(r, 'unit', v)} style={{ width: 70 }} /></td>
                                <td style={C}><EditCell value={r.qty} type="number" onChange={v => update(r, 'qty', v)} style={{ width: 80, textAlign: 'right' }} /></td>
                                <td style={C}><EditCell value={r.unitPrice} type="number" onChange={v => update(r, 'unitPrice', v)} style={{ width: 100, textAlign: 'right' }} /></td>
                                <td style={{ ...C, textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>{fmt(toNum(r.qty) * toNum(r.unitPrice))}đ</td>
                                <td style={C}><button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={13} /></button></td>
                            </tr>
                        ))}
                        <tr style={{ background: '#eff6ff', borderTop: '2px dashed #93c5fd' }}>
                            <td style={C}><EditCell value={draft.category} onChange={v => setDraft(d => ({ ...d, category: v }))} placeholder="Hạng mục" /></td>
                            <td style={C}><EditCell value={draft.type} onChange={v => setDraft(d => ({ ...d, type: v }))} placeholder="Loại công *" /></td>
                            <td style={C}><EditCell value={draft.unit} onChange={v => setDraft(d => ({ ...d, unit: v }))} style={{ width: 70 }} /></td>
                            <td style={C}><EditCell value={draft.qty} type="number" onChange={v => setDraft(d => ({ ...d, qty: v }))} style={{ width: 80, textAlign: 'right' }} /></td>
                            <td style={C}><EditCell value={draft.unitPrice} type="number" onChange={v => setDraft(d => ({ ...d, unitPrice: v }))} style={{ width: 100, textAlign: 'right' }} /></td>
                            <td style={{ ...C, textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>{draft.qty && draft.unitPrice ? fmt(toNum(draft.qty) * toNum(draft.unitPrice)) + 'đ' : '—'}</td>
                            <td style={C}>
                                <button onClick={add} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                    <Plus size={11} /> Thêm
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={{ marginTop: 10, textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
                Tổng nhân công: <strong style={{ color: '#111827' }}>{fmt(rows.reduce((s, r) => s + toNum(r.qty) * toNum(r.unitPrice), 0))}đ</strong>
            </div>
        </div>
    );
}

// ─── Chi phí khác tab ─────────────────────────────────────────────
function OtherTab({ projectId, rows, onReload }) {
    const blank = { name: '', unit: '', qty: '', unitPrice: '' };
    const [draft, setDraft] = useState(blank);
    const [saving, setSaving] = useState(false);

    async function add() {
        if (!draft.name.trim()) return;
        setSaving(true);
        await fetch(`/api/cost-mgmt/projects/${projectId}/other`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft)
        });
        setDraft(blank); setSaving(false); onReload();
    }

    async function del(rowId) {
        await fetch(`/api/cost-mgmt/projects/${projectId}/other?rowId=${rowId}`, { method: 'DELETE' });
        onReload();
    }

    async function update(row, field, value) {
        const updated = { ...row, [field]: value };
        await fetch(`/api/cost-mgmt/projects/${projectId}/other`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
        });
        onReload();
    }

    return (
        <div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                            {['Khoản mục','ĐVT','Số lượng','Đơn giá','Thành tiền',''].map((h, i) => (
                                <th key={i} style={{ padding: '9px 10px', textAlign: i >= 2 ? 'right' : 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={C}><EditCell value={r.name} onChange={v => update(r, 'name', v)} /></td>
                                <td style={C}><EditCell value={r.unit} onChange={v => update(r, 'unit', v)} style={{ width: 80 }} /></td>
                                <td style={C}><EditCell value={r.qty} type="number" onChange={v => update(r, 'qty', v)} style={{ width: 80, textAlign: 'right' }} /></td>
                                <td style={C}><EditCell value={r.unitPrice} type="number" onChange={v => update(r, 'unitPrice', v)} style={{ width: 100, textAlign: 'right' }} /></td>
                                <td style={{ ...C, textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>{fmt(toNum(r.qty) * toNum(r.unitPrice))}đ</td>
                                <td style={C}><button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={13} /></button></td>
                            </tr>
                        ))}
                        <tr style={{ background: '#fef3c7', borderTop: '2px dashed #fcd34d' }}>
                            <td style={C}><EditCell value={draft.name} onChange={v => setDraft(d => ({ ...d, name: v }))} placeholder="Khoản mục *" /></td>
                            <td style={C}><EditCell value={draft.unit} onChange={v => setDraft(d => ({ ...d, unit: v }))} style={{ width: 80 }} /></td>
                            <td style={C}><EditCell value={draft.qty} type="number" onChange={v => setDraft(d => ({ ...d, qty: v }))} style={{ width: 80, textAlign: 'right' }} /></td>
                            <td style={C}><EditCell value={draft.unitPrice} type="number" onChange={v => setDraft(d => ({ ...d, unitPrice: v }))} style={{ width: 100, textAlign: 'right' }} /></td>
                            <td style={{ ...C, textAlign: 'right', color: '#d97706', fontWeight: 600 }}>{draft.qty && draft.unitPrice ? fmt(toNum(draft.qty) * toNum(draft.unitPrice)) + 'đ' : '—'}</td>
                            <td style={C}>
                                <button onClick={add} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#d97706', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                    <Plus size={11} /> Thêm
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={{ marginTop: 10, textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
                Tổng chi phí khác: <strong style={{ color: '#111827' }}>{fmt(rows.reduce((s, r) => s + toNum(r.qty) * toNum(r.unitPrice), 0))}đ</strong>
            </div>
        </div>
    );
}

// ─── Phân bổ tab ─────────────────────────────────────────────────
function AllocationTab({ projectId, rows, onReload }) {
    const [draft, setDraft] = useState({ month: '', basis: 'Theo m²', qty: '', type: 'Chi phí xưởng', note: '' });
    const [saving, setSaving] = useState(false);

    async function add() {
        if (!draft.month || !draft.qty) return;
        setSaving(true);
        await fetch(`/api/cost-mgmt/projects/${projectId}/allocations`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft)
        });
        setDraft({ month: '', basis: 'Theo m²', qty: '', type: 'Chi phí xưởng', note: '' });
        setSaving(false); onReload();
    }

    async function del(rowId) {
        await fetch(`/api/cost-mgmt/projects/${projectId}/allocations?rowId=${rowId}`, { method: 'DELETE' });
        onReload();
    }

    return (
        <div>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Nhập khối lượng (m²); đơn giá tự lấy từ chi phí tháng tương ứng.</p>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                            {['Tháng','Tiêu thức','Loại CP','Khối lượng (m²)','ĐG tự động','Thành tiền','Ghi chú',''].map((h, i) => (
                                <th key={i} style={{ padding: '9px 10px', textAlign: i >= 3 ? 'right' : 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ ...C, color: '#374151' }}>{r.month}</td>
                                <td style={{ ...C, color: '#6b7280' }}>{r.basis}</td>
                                <td style={C}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: r.type === 'Khấu hao' ? '#ede9fe' : '#dbeafe', color: r.type === 'Khấu hao' ? '#7c3aed' : '#2563eb', fontWeight: 600 }}>{r.type}</span></td>
                                <td style={{ ...C, textAlign: 'right' }}>{fmt(r.qty)} m²</td>
                                <td style={{ ...C, textAlign: 'right', color: '#6b7280' }}>{fmt(r.unitPrice)}đ/m²</td>
                                <td style={{ ...C, textAlign: 'right', fontWeight: 600, color: '#1e3a5f' }}>{fmt(toNum(r.qty) * toNum(r.unitPrice))}đ</td>
                                <td style={{ ...C, color: '#9ca3af' }}>{r.note}</td>
                                <td style={C}><button onClick={() => del(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={13} /></button></td>
                            </tr>
                        ))}
                        <tr style={{ background: '#f5f3ff', borderTop: '2px dashed #c4b5fd' }}>
                            <td style={C}>
                                <input type="month" value={draft.month} onChange={e => setDraft(d => ({ ...d, month: e.target.value }))}
                                    style={{ padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12 }} />
                            </td>
                            <td style={C}><span style={{ color: '#9ca3af' }}>Theo m²</span></td>
                            <td style={C}>
                                <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}
                                    style={{ padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12 }}>
                                    <option>Chi phí xưởng</option><option>Khấu hao</option>
                                </select>
                            </td>
                            <td style={C}>
                                <input type="number" value={draft.qty} onChange={e => setDraft(d => ({ ...d, qty: e.target.value }))} placeholder="m²"
                                    style={{ width: 80, padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12, textAlign: 'right' }} />
                            </td>
                            <td style={{ ...C, textAlign: 'right', color: '#9ca3af', fontSize: 11 }}>Tự động</td>
                            <td style={{ ...C, textAlign: 'right', color: '#7c3aed', fontWeight: 600 }}>—</td>
                            <td style={C}><input value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} placeholder="Ghi chú"
                                style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12 }} /></td>
                            <td style={C}>
                                <button onClick={add} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#7c3aed', color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                    <Plus size={11} /> Thêm
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Kết quả tab ─────────────────────────────────────────────────
function ResultTab({ project, totals }) {
    const { mat, lab, oth, allocFactory, allocDepr, cogsSx, commission, mgmt, cogsTotal, profit, profitPct } = totals;
    const rev = toNum(project.revenue);
    const isGood = profitPct >= TARGET;

    const rows = [
        { label: 'Doanh thu chưa VAT', value: rev, indent: 0, bold: true, color: '#2563eb' },
        { label: '─ Vật tư trực tiếp', value: mat, indent: 1, pct: rev > 0 ? mat / rev : 0 },
        { label: '─ Nhân công trực tiếp', value: lab, indent: 1, pct: rev > 0 ? lab / rev : 0 },
        { label: '─ Chi phí khác / vận chuyển', value: oth, indent: 1, pct: rev > 0 ? oth / rev : 0 },
        { label: '─ Khấu hao phân bổ', value: allocDepr, indent: 1, pct: rev > 0 ? allocDepr / rev : 0 },
        { label: '─ Chi phí xưởng phân bổ', value: allocFactory, indent: 1, pct: rev > 0 ? allocFactory / rev : 0 },
        { label: 'Giá vốn sản xuất', value: cogsSx, indent: 0, bold: true, color: '#d97706' },
        { label: '─ Hoa hồng / Dẫn việc', value: commission, indent: 1, pct: toNum(project.commissionPct), label2: `(${(toNum(project.commissionPct)*100).toFixed(0)}% DT)` },
        { label: '─ QLDN phân bổ', value: mgmt, indent: 1, pct: toNum(project.mgmtPct), label2: `(${(toNum(project.mgmtPct)*100).toFixed(0)}% DT)` },
        { label: 'Giá vốn hoàn chỉnh', value: cogsTotal, indent: 0, bold: true, color: '#dc2626' },
        { label: 'Lợi nhuận trước thuế', value: profit, indent: 0, bold: true, color: isGood ? '#16a34a' : '#dc2626' },
    ];

    return (
        <div style={{ maxWidth: 680 }}>
            {/* Profit banner */}
            <div style={{ background: isGood ? '#dcfce7' : '#fee2e2', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: 12, color: isGood ? '#16a34a' : '#dc2626', fontWeight: 500 }}>Tỷ suất lợi nhuận</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: isGood ? '#16a34a' : '#dc2626', letterSpacing: -1 }}>{fmtPct(profitPct)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Mục tiêu: ≥{fmtPct(TARGET)} {isGood ? '✓ Đạt' : '✗ Chưa đạt'}</div>
                </div>
                {isGood ? <TrendingUp size={40} color="#16a34a" /> : <TrendingDown size={40} color="#dc2626" />}
            </div>

            {/* Waterfall table */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                {rows.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: `${r.bold ? 12 : 9}px 16px`, paddingLeft: `${16 + (r.indent || 0) * 20}px`, borderBottom: '1px solid #f3f4f6', background: r.bold ? '#f8fafc' : 'white' }}>
                        <span style={{ flex: 1, fontSize: r.bold ? 13 : 12, fontWeight: r.bold ? 700 : 400, color: r.color || (r.indent ? '#6b7280' : '#111827') }}>
                            {r.label} {r.label2 && <span style={{ fontSize: 10, color: '#9ca3af' }}>{r.label2}</span>}
                        </span>
                        {r.pct !== undefined && (
                            <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 16, minWidth: 50, textAlign: 'right' }}>{fmtPct(r.pct)}</span>
                        )}
                        <span style={{ fontSize: r.bold ? 14 : 12, fontWeight: r.bold ? 800 : 500, color: r.color || '#374151', minWidth: 120, textAlign: 'right' }}>
                            {fmt(r.value)}đ
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────
export default function ProjectDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('materials');
    const [editProject, setEditProject] = useState(false);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const res = await fetch(`/api/cost-mgmt/projects/${id}`);
        const d = await res.json();
        setData(d);
        setForm(d.project || {});
        setLoading(false);
    }, [id]);

    useEffect(() => { load(); }, [load]);

    async function saveProject() {
        setSaving(true);
        await fetch(`/api/cost-mgmt/projects/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
        });
        setSaving(false);
        setEditProject(false);
        load();
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
    );

    const { project, materials = [], labor = [], other = [], allocations = [], totals = {} } = data || {};
    if (!project) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Không tìm thấy công trình.</div>;

    const TABS = [
        { key: 'materials', label: 'Vật tư', count: materials.length },
        { key: 'labor', label: 'Nhân công', count: labor.length },
        { key: 'other', label: 'CP khác', count: other.length },
        { key: 'allocations', label: 'Phân bổ', count: allocations.length },
        { key: 'result', label: 'Kết quả', count: null },
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <button onClick={() => router.push('/cost-management')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>
                    <ArrowLeft size={14} />
                </button>
                <div style={{ flex: 1 }}>
                    {editProject ? (
                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                                { key: 'code', label: 'Mã CT' }, { key: 'name', label: 'Tên công trình' },
                                { key: 'client', label: 'Chủ đầu tư' }, { key: 'signDate', label: 'Ngày ký', type: 'date' },
                                { key: 'revenue', label: 'Doanh thu chưa VAT', type: 'number' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{f.label}</label>
                                    <input type={f.type || 'text'} value={form[f.key] || ''}
                                        onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                                        style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
                                </div>
                            ))}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, gridColumn: '1 / -1' }}>
                                {[
                                    { key: 'vatPct', label: 'VAT %' }, { key: 'commissionPct', label: 'Hoa hồng %' }, { key: 'mgmtPct', label: 'QLDN %' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{f.label}</label>
                                        <input type="number" step="0.01" value={((toNum(form[f.key]) || 0) * 100).toFixed(1)}
                                            onChange={e => setForm(v => ({ ...v, [f.key]: Number(e.target.value) / 100 }))}
                                            style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
                                    </div>
                                ))}
                            </div>
                            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                                <button onClick={() => setEditProject(false)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13 }}>Huỷ</button>
                                <button onClick={saveProject} disabled={saving} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#f97316', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Lưu</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                                {project.code && <div style={{ fontSize: 11, color: '#6b7280' }}>{project.code}</div>}
                                <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>{project.name}</h1>
                                {project.client && <div style={{ fontSize: 12, color: '#9ca3af' }}>{project.client}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', alignItems: 'center' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>DT chưa VAT</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb' }}>{fmt(project.revenue)}đ</div>
                                </div>
                                <div style={{ width: 1, height: 30, background: '#e5e7eb' }} />
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: '#6b7280' }}>Lợi nhuận</div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: totals.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                                        {fmt(totals.profit)}đ <span style={{ fontSize: 12 }}>({fmtPct(totals.profitPct)})</span>
                                    </div>
                                </div>
                                <button onClick={() => setEditProject(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 12, color: '#6b7280' }}>
                                    <Edit3 size={13} /> Sửa
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4 }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                            background: tab === t.key ? '#f97316' : 'transparent', color: tab === t.key ? 'white' : '#6b7280' }}>
                        {t.label}{t.count !== null ? ` (${t.count})` : ''}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
                {tab === 'materials' && <MaterialsTab projectId={id} rows={materials} onReload={load} />}
                {tab === 'labor' && <LaborTab projectId={id} rows={labor} onReload={load} />}
                {tab === 'other' && <OtherTab projectId={id} rows={other} onReload={load} />}
                {tab === 'allocations' && <AllocationTab projectId={id} rows={allocations} onReload={load} />}
                {tab === 'result' && <ResultTab project={project} totals={totals} />}
            </div>
        </div>
    );
}
