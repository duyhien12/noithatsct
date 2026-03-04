'use client';
import { useState } from 'react';

export default function BulkActionsBar({ selectedIds, onDone, categories }) {
    const [mode, setMode] = useState(null); // 'price' | 'status' | 'category'
    const [priceMode, setPriceMode] = useState('percent');
    const [priceValue, setPriceValue] = useState('');
    const [status, setStatus] = useState('');
    const [catId, setCatId] = useState('');
    const [loading, setLoading] = useState(false);
    const count = selectedIds.size;

    const exec = async (action, extra) => {
        setLoading(true);
        await fetch('/api/products', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ids: [...selectedIds], ...extra }),
        });
        setLoading(false); setMode(null);
        onDone();
    };

    if (!count) return null;

    return (
        <div style={{ padding: '8px 16px', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>✅ {count} đã chọn</span>
            <div style={{ width: 1, height: 18, background: 'var(--border-color)' }} />

            {!mode && <>
                <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={() => setMode('price')}>💰 Cập nhật giá</button>
                <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={() => setMode('status')}>🏷️ Đổi trạng thái</button>
                <button className="btn btn-sm" style={{ fontSize: 12 }} onClick={() => setMode('category')}>📁 Gán danh mục</button>
            </>}

            {mode === 'price' && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select value={priceMode} onChange={e => setPriceMode(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                        <option value="percent">Theo %</option>
                        <option value="fixed">Giá cố định</option>
                    </select>
                    <input type="number" value={priceValue} onChange={e => setPriceValue(e.target.value)}
                        placeholder={priceMode === 'percent' ? 'VD: 10 (tăng 10%)' : 'Nhập giá mới'}
                        style={{ width: 160, fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                    <button className="btn btn-primary btn-sm" disabled={loading || !priceValue}
                        onClick={() => exec('bulkPrice', { mode: priceMode, value: Number(priceValue) })}>
                        {loading ? '⏳' : 'Áp dụng'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>✕</button>
                </div>
            )}

            {mode === 'status' && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select value={status} onChange={e => setStatus(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                        <option value="">-- Chọn --</option>
                        <option>Đang bán</option>
                        <option>Ngừng kinh doanh</option>
                        <option>Hết hàng</option>
                    </select>
                    <button className="btn btn-primary btn-sm" disabled={loading || !status}
                        onClick={() => exec('bulkStatus', { status })}>
                        {loading ? '⏳' : 'Áp dụng'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>✕</button>
                </div>
            )}

            {mode === 'category' && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select value={catId} onChange={e => setCatId(e.target.value)} style={{ fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                        <option value="">-- Chọn danh mục --</option>
                        {(categories || []).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary btn-sm" disabled={loading || !catId}
                        onClick={() => {
                            const cat = categories.find(c => c.id === catId);
                            exec('bulkCategory', { categoryId: catId, category: cat?.name });
                        }}>
                        {loading ? '⏳' : 'Áp dụng'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>✕</button>
                </div>
            )}
        </div>
    );
}
