'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Edit3, Check, X, RefreshCw } from 'lucide-react';

const fmt = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '—';
const toNum = (v) => Number(v) || 0;

const FIELDS = [
    { key: 'electric', label: 'Điện' },
    { key: 'water', label: 'Nước' },
    { key: 'rent', label: 'Thuê xưởng' },
    { key: 'management', label: 'QL xưởng' },
    { key: 'maintenance', label: 'Bảo trì máy' },
    { key: 'tools', label: 'Dụng cụ TH' },
    { key: 'other', label: 'Khác' },
    { key: 'machineDepreciation', label: 'Khấu hao máy' },
];

const blank = { month: '', electric: '', water: '', rent: '', management: '', maintenance: '', tools: '', other: '', machineDepreciation: '', capacitySqm: '800', machineHours: '160' };

function calcTotal(vals) {
    return FIELDS.reduce((s, f) => s + toNum(vals[f.key]), 0);
}

export default function MonthlyPage() {
    const router = useRouter();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(blank);

    function openForm() {
        setForm(f => ({ ...f, machineDepreciation: f.machineDepreciation || totalMachineDepr || '' }));
        setShowForm(true);
    }
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [machines, setMachines] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        const [mRes, machRes] = await Promise.all([
            fetch('/api/cost-mgmt/monthly'),
            fetch('/api/workshop/assets?assetType=Máy móc - Thiết bị'),
        ]);
        setRows(await mRes.json());
        setMachines(await machRes.json());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const totalMachineDepr = machines.filter(m => m.status === 'Đang dùng')
        .reduce((s, m) => s + Math.round(toNum(m.originalCost) * toNum(m.depreciationRate) / 12), 0);

    async function syncDepreciation(row) {
        await fetch(`/api/cost-mgmt/monthly/${row.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...row, machineDepreciation: 0 }) // 0 → backend tự lấy từ máy
        });
        load();
    }

    async function create() {
        if (!form.month) return;
        setSaving(true);
        await fetch('/api/cost-mgmt/monthly', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        setForm(blank); setShowForm(false); setSaving(false); load();
    }

    async function update(id) {
        await fetch(`/api/cost-mgmt/monthly/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
        setEditId(null); load();
    }

    async function del(id) {
        if (!confirm('Xoá tháng này?')) return;
        await fetch(`/api/cost-mgmt/monthly/${id}`, { method: 'DELETE' });
        load();
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={() => router.push('/cost-management')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                    <ArrowLeft size={14} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Chi phí vận hành xưởng theo tháng</h1>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
                        Khấu hao máy hiện tại (tự động): <strong style={{ color: '#7c3aed' }}>{fmt(totalMachineDepr)}đ/tháng</strong>
                    </p>
                </div>
                <button onClick={openForm} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f97316', color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                    <Plus size={14} /> Thêm tháng
                </button>
            </div>

            {showForm && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 10 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Tháng *</label>
                            <input type="month" value={form.month} onChange={e => setForm(v => ({ ...v, month: e.target.value }))}
                                style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, boxSizing: 'border-box' }} />
                        </div>
                        {FIELDS.map(f => (
                            <div key={f.key}>
                                <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>{f.label} (đ)</label>
                                <input type="number" value={form[f.key]}
                                    placeholder={f.key === 'machineDepreciation' ? (totalMachineDepr ? String(totalMachineDepr) : 'Tự động') : ''}
                                    onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                                    style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, boxSizing: 'border-box', textAlign: 'right' }} />
                            </div>
                        ))}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Năng lực (m²)</label>
                            <input type="number" value={form.capacitySqm} onChange={e => setForm(v => ({ ...v, capacitySqm: e.target.value }))}
                                style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 12, boxSizing: 'border-box', textAlign: 'right' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>Tổng CP xưởng</label>
                            <div style={{ padding: '7px 9px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#f3f4f6', fontSize: 12, fontWeight: 700, color: '#d97706', textAlign: 'right' }}>
                                {fmt(calcTotal({ ...form, machineDepreciation: toNum(form.machineDepreciation) || totalMachineDepr }))}đ
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>ĐG/m² (tự tính)</label>
                            <div style={{ padding: '7px 9px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#f3f4f6', fontSize: 12, fontWeight: 700, color: '#2563eb', textAlign: 'right' }}>
                                {form.capacitySqm ? fmt(Math.round((calcTotal({ ...form, machineDepreciation: toNum(form.machineDepreciation) || totalMachineDepr }) - (toNum(form.machineDepreciation) || totalMachineDepr)) / toNum(form.capacitySqm))) + 'đ' : '—'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={create} disabled={saving} style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Thêm</button>
                        <button onClick={() => setShowForm(false)} style={{ padding: '8px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 13 }}>Huỷ</button>
                    </div>
                </div>
            )}

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ padding: '9px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Tháng</th>
                                {FIELDS.map(f => <th key={f.key} style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{f.label}</th>)}
                                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Tổng CP</th>
                                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Năng lực (m²)</th>
                                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>ĐG/m²</th>
                                <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>ĐG KH/m²</th>
                                <th style={{ padding: '9px 8px', width: 70 }} />
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={15} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Đang tải...</td></tr>}
                            {!loading && rows.length === 0 && <tr><td colSpan={15} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Chưa có tháng nào.</td></tr>}
                            {rows.map(r => {
                                const factoryCost = r.totalCost - toNum(r.machineDepreciation);
                                const dgSqm = r.capacitySqm > 0 ? Math.round(factoryCost / r.capacitySqm) : 0;
                                const dgKhSqm = r.capacitySqm > 0 ? Math.round(toNum(r.machineDepreciation) / r.capacitySqm) : 0;
                                return editId === r.id ? (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6', background: '#f0fdf4' }}>
                                        <td style={{ padding: '6px 10px' }}>
                                            <input type="month" value={editForm.month} onChange={e => setEditForm(f => ({ ...f, month: e.target.value }))}
                                                style={{ padding: '4px 7px', borderRadius: 5, border: '1px solid #e5e7eb', fontSize: 12 }} />
                                        </td>
                                        {FIELDS.map(f => (
                                            <td key={f.key} style={{ padding: '6px 6px' }}>
                                                <input type="number" value={editForm[f.key]} onChange={e => setEditForm(ef => ({ ...ef, [f.key]: e.target.value }))}
                                                    style={{ width: 90, padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12, textAlign: 'right' }} />
                                            </td>
                                        ))}
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>{fmt(calcTotal(editForm))}đ</td>
                                        <td style={{ padding: '6px 6px' }}>
                                            <input type="number" value={editForm.capacitySqm} onChange={e => setEditForm(f => ({ ...f, capacitySqm: e.target.value }))}
                                                style={{ width: 70, padding: '4px 6px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12, textAlign: 'right' }} />
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#2563eb', fontWeight: 700, fontSize: 11 }}>
                                            {editForm.capacitySqm ? fmt(Math.round((calcTotal(editForm) - toNum(editForm.machineDepreciation)) / toNum(editForm.capacitySqm))) + 'đ' : '—'}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#7c3aed', fontWeight: 700, fontSize: 11 }}>
                                            {editForm.capacitySqm ? fmt(Math.round(toNum(editForm.machineDepreciation) / toNum(editForm.capacitySqm))) + 'đ' : '—'}
                                        </td>
                                        <td style={{ padding: '6px 8px' }}>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                <button onClick={() => update(r.id)} style={{ padding: '4px 7px', borderRadius: 5, border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer' }}><Check size={12} /></button>
                                                <button onClick={() => setEditId(null)} style={{ padding: '4px 7px', borderRadius: 5, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}><X size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '9px 14px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>{r.month}</td>
                                        {FIELDS.map(f => <td key={f.key} style={{ padding: '9px 10px', textAlign: 'right', color: '#374151' }}>{fmt(r[f.key])}</td>)}
                                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>{fmt(r.totalCost)}đ</td>
                                        <td style={{ padding: '9px 10px', textAlign: 'right', color: '#6b7280' }}>{fmt(r.capacitySqm)}</td>
                                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>{fmt(dgSqm)}đ</td>
                                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#7c3aed' }}>{fmt(dgKhSqm)}đ</td>
                                        <td style={{ padding: '9px 8px' }}>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                <button onClick={() => syncDepreciation(r)} title="Sync khấu hao từ máy" style={{ padding: '4px 7px', borderRadius: 5, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#7c3aed' }}><RefreshCw size={12} /></button>
                                                <button onClick={() => { setEditId(r.id); setEditForm({ ...r }); }} style={{ padding: '4px 7px', borderRadius: 5, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#6b7280' }}><Edit3 size={12} /></button>
                                                <button onClick={() => del(r.id)} style={{ padding: '4px 7px', borderRadius: 5, border: 'none', background: '#fef2f2', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={12} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
