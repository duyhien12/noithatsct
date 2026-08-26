'use client';
import { useEffect, useState, useCallback } from 'react';

function SimpleCrudTab({ endpoint, fields, columns }) {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchItems = useCallback(async () => {
        const res = await fetch(endpoint);
        const d = await res.json();
        setItems(d.data || []);
    }, [endpoint]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    const handleAdd = async () => {
        setSaving(true);
        try {
            const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            setForm({}); fetchItems();
        } catch (err) { alert(err.message); }
        finally { setSaving(false); }
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, padding: 16, flexWrap: 'wrap' }}>
                {fields.map(f => (
                    <input key={f.key} className="form-input" placeholder={f.label} style={{ width: 160 }}
                        value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                ))}
                <button className="btn btn-primary" disabled={saving} onClick={handleAdd}>+ Thêm</button>
            </div>
            <div className="table-container">
                <table className="data-table">
                    <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
                    <tbody>
                        {items.map(it => (
                            <tr key={it.id}>{columns.map(c => <td key={c.key}>{c.render ? c.render(it) : it[c.key]}</td>)}</tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const TABS = {
    warehouses: {
        label: '🏭 Kho',
        endpoint: '/api/inventory-v2/warehouses',
        fields: [{ key: 'name', label: 'Tên kho' }, { key: 'address', label: 'Địa chỉ' }],
        columns: [{ key: 'code', label: 'Mã' }, { key: 'name', label: 'Tên kho' }, { key: 'address', label: 'Địa chỉ' }, { key: '_count', label: 'Vị trí', render: it => it._count?.locations ?? 0 }],
    },
    units: {
        label: '📏 Đơn vị tính',
        endpoint: '/api/inventory-v2/units',
        fields: [{ key: 'code', label: 'Mã (vd: cái, hộp)' }, { key: 'name', label: 'Tên đầy đủ' }],
        columns: [{ key: 'code', label: 'Mã' }, { key: 'name', label: 'Tên' }],
    },
    categories: {
        label: '🗂 Nhóm vật tư',
        endpoint: '/api/inventory-v2/categories',
        fields: [{ key: 'code', label: 'Mã nhóm' }, { key: 'name', label: 'Tên nhóm' }, { key: 'skuPrefix', label: 'Prefix SKU' }],
        columns: [{ key: 'code', label: 'Mã' }, { key: 'name', label: 'Tên nhóm' }, { key: 'skuPrefix', label: 'Prefix SKU' }, { key: '_count', label: 'Số vật tư', render: it => it._count?.materials ?? 0 }],
    },
};

export default function SettingsPage() {
    const [tab, setTab] = useState('warehouses');
    const active = TABS[tab];
    return (
        <div className="card">
            <div className="card-header">
                <div className="tab-bar">
                    {Object.entries(TABS).map(([k, t]) => (
                        <button key={k} className={`tab-item ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{t.label}</button>
                    ))}
                </div>
            </div>
            <SimpleCrudTab key={tab} endpoint={active.endpoint} fields={active.fields} columns={active.columns} />
        </div>
    );
}
