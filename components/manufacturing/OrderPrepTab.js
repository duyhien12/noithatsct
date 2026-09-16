'use client';
import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { PREP_CHECKLIST_ITEMS, PREP_CHECKLIST_STATUS_LABELS } from '@/lib/manufacturing/constants';

function parseJsonArray(str) {
    try { const v = JSON.parse(str || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

function seedChecklist(saved) {
    const byLabel = Object.fromEntries(saved.map(i => [i.label, i]));
    return PREP_CHECKLIST_ITEMS.map(label => byLabel[label] || { label, status: 'pending', note: '' });
}

const STATUS_STYLE = {
    pending: { color: '#9ca3af', bg: '#f3f4f6' },
    passed: { color: '#16a34a', bg: '#dcfce7' },
    failed: { color: '#dc2626', bg: '#fee2e2' },
};

let rowSeq = 0;
const newCuttingRow = () => ({ id: `new-${++rowSeq}`, materialName: '', specification: '', quantity: '', unit: '', note: '' });

export default function OrderPrepTab({ order, perms, onChanged }) {
    const toast = useToast();
    const [checklist, setChecklist] = useState(() => seedChecklist(parseJsonArray(order.prepChecklist)));
    const [cuttingList, setCuttingList] = useState(() => {
        const rows = parseJsonArray(order.cuttingList);
        return rows.length > 0 ? rows : [newCuttingRow()];
    });
    const [saving, setSaving] = useState(false);
    const canEdit = !!perms.update;

    function setItemStatus(idx, status) {
        setChecklist(list => list.map((it, i) => i === idx ? { ...it, status } : it));
    }
    function setItemNote(idx, note) {
        setChecklist(list => list.map((it, i) => i === idx ? { ...it, note } : it));
    }
    function setCuttingField(idx, field, value) {
        setCuttingList(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
    }
    function addCuttingRow() { setCuttingList(rows => [...rows, newCuttingRow()]); }
    function removeCuttingRow(idx) { setCuttingList(rows => rows.filter((_, i) => i !== idx)); }

    async function handleSave() {
        setSaving(true);
        try {
            const cleanCutting = cuttingList
                .filter(r => r.materialName.trim() || r.specification.trim() || r.quantity)
                .map(({ id, materialName, specification, quantity, unit, note }) => ({
                    id, materialName, specification, unit, note,
                    quantity: Number(quantity) || 0,
                }));
            const res = await fetch(`/api/manufacturing/orders/${order.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prepChecklist: checklist.map(({ label, status, note }) => ({ label, status, note })),
                    cuttingList: cleanCutting,
                }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Lỗi lưu checklist');
            toast.success('Đã lưu checklist chuẩn bị sản xuất');
            onChanged();
        } catch (e) { toast.error(e.message); } finally { setSaving(false); }
    }

    const passedCount = checklist.filter(i => i.status === 'passed').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 18px' }}>
                    <span className="card-title">Checklist chuẩn bị trước khi sản xuất ({passedCount}/{checklist.length})</span>
                </div>
                <div style={{ padding: 8 }}>
                    {checklist.map((item, idx) => (
                        <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderBottom: idx < checklist.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13.5 }}>{item.label}</span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {['passed', 'failed'].map(s => (
                                        <button key={s} disabled={!canEdit}
                                            onClick={() => setItemStatus(idx, item.status === s ? 'pending' : s)}
                                            className="btn btn-sm"
                                            style={{
                                                background: item.status === s ? STATUS_STYLE[s].bg : 'transparent',
                                                color: item.status === s ? STATUS_STYLE[s].color : 'var(--text-muted)',
                                                border: `1px solid ${item.status === s ? STATUS_STYLE[s].color : 'var(--border)'}`,
                                            }}>
                                            {s === 'passed' ? 'Đạt' : 'Không đạt'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {canEdit && (
                                <input className="form-input" placeholder="Ghi chú (nếu có)..." value={item.note}
                                    onChange={e => setItemNote(idx, e.target.value)} style={{ fontSize: 12.5, padding: '5px 8px' }} />
                            )}
                            {!canEdit && item.note && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.note}</div>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="card-header" style={{ padding: '14px 18px' }}>
                    <span className="card-title">Bảng kê khai nguyên vật liệu cần cắt ({cuttingList.length})</span>
                    {canEdit && <button className="btn btn-secondary btn-sm" onClick={addCuttingRow}><Plus size={14} /> Thêm dòng</button>}
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Tên vật liệu</th><th>Quy cách / Kích thước</th><th style={{ width: 90 }}>Số lượng</th><th style={{ width: 90 }}>Đơn vị</th><th>Ghi chú</th>{canEdit && <th style={{ width: 40 }} />}</tr></thead>
                        <tbody>
                            {cuttingList.map((row, idx) => (
                                <tr key={row.id || idx}>
                                    {canEdit ? (
                                        <>
                                            <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 12.5 }} value={row.materialName} onChange={e => setCuttingField(idx, 'materialName', e.target.value)} /></td>
                                            <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 12.5 }} value={row.specification} onChange={e => setCuttingField(idx, 'specification', e.target.value)} placeholder="VD: 1200x600x18mm" /></td>
                                            <td><input type="number" className="form-input" style={{ padding: '4px 8px', fontSize: 12.5 }} value={row.quantity} onChange={e => setCuttingField(idx, 'quantity', e.target.value)} /></td>
                                            <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 12.5 }} value={row.unit} onChange={e => setCuttingField(idx, 'unit', e.target.value)} placeholder="tấm" /></td>
                                            <td><input className="form-input" style={{ padding: '4px 8px', fontSize: 12.5 }} value={row.note} onChange={e => setCuttingField(idx, 'note', e.target.value)} /></td>
                                            <td><button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }} onClick={() => removeCuttingRow(idx)}><Trash2 size={14} /></button></td>
                                        </>
                                    ) : (
                                        <>
                                            <td style={{ fontWeight: 600 }}>{row.materialName || '—'}</td>
                                            <td>{row.specification || '—'}</td>
                                            <td>{row.quantity || 0}</td>
                                            <td>{row.unit || '—'}</td>
                                            <td>{row.note || '—'}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {canEdit && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}><Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu checklist chuẩn bị'}</button>
                </div>
            )}
        </div>
    );
}
