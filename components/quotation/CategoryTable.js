'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { fmt, UNIT_OPTIONS } from '@/lib/quotation-constants';

function SubcategorySection({ sub, mi, si, hook, onImageClick, onSubcategoryImageClick }) {
    const { updateSubcategoryName, removeSubcategory, updateItem, removeItem, addItem, addFromLibrary, addFromProduct, allSearchItems, mainCategories } = hook;

    // Quick-add autocomplete state
    const [quickSearch, setQuickSearch] = useState('');
    const [quickResults, setQuickResults] = useState([]);
    const [quickFocusIdx, setQuickFocusIdx] = useState(-1);
    const [showQuickDrop, setShowQuickDrop] = useState(false);
    const quickRef = useRef(null);
    const dropRef = useRef(null);

    // Debounced search
    useEffect(() => {
        if (!quickSearch.trim()) { setQuickResults([]); return; }
        const timer = setTimeout(() => {
            const q = quickSearch.toLowerCase();
            const results = allSearchItems
                .filter(i => i._label.toLowerCase().includes(q) || i._sub.toLowerCase().includes(q))
                .slice(0, 12);
            setQuickResults(results);
            setQuickFocusIdx(-1);
        }, 150);
        return () => clearTimeout(timer);
    }, [quickSearch, allSearchItems]);

    // Close dropdown on outside click
    useEffect(() => {
        const handle = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target) && !quickRef.current?.contains(e.target)) {
                setShowQuickDrop(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    const handleQuickAdd = useCallback((item) => {
        // Temporarily set active indices to target this subcategory
        hook.setActiveMainIdx(mi);
        hook.setActiveSubIdx(si);
        setTimeout(() => {
            if (item._type === 'library') addFromLibrary(item);
            else addFromProduct(item);
        }, 0);
        setQuickSearch('');
        setQuickResults([]);
        setShowQuickDrop(false);
        setTimeout(() => quickRef.current?.focus(), 50);
    }, [addFromLibrary, addFromProduct, mi, si, hook]);

    const handleQuickKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setQuickFocusIdx(prev => Math.min(prev + 1, quickResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setQuickFocusIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && quickFocusIdx >= 0 && quickResults[quickFocusIdx]) {
            e.preventDefault();
            handleQuickAdd(quickResults[quickFocusIdx]);
        } else if (e.key === 'Escape') {
            setShowQuickDrop(false);
        }
    };

    const canRemoveSub = mainCategories[mi]?.subcategories.length > 1;

    return (
        <div className="card quotation-subcategory-card" style={{ marginBottom: 12 }}>
            <div className="subcategory-header">
                <span style={{ fontWeight: 700, fontSize: 13, opacity: 0.4 }}>#{si + 1}</span>
                {onSubcategoryImageClick && (
                    <div className="subcategory-image-thumb" onClick={() => onSubcategoryImageClick(mi, si)} title="Ảnh khu vực">
                        {sub.image ? (
                            <img src={sub.image} alt="" />
                        ) : (
                            <span className="placeholder">🖼️</span>
                        )}
                    </div>
                )}
                <input className="form-input" placeholder="Tên khu vực (VD: Sảnh, Phòng khách...)" value={sub.name}
                    onChange={e => updateSubcategoryName(mi, si, e.target.value)}
                    style={{ flex: 1, fontWeight: 600, fontSize: 14 }} />
                <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {fmt(sub.subtotal)} đ
                </span>
                {canRemoveSub && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeSubcategory(mi, si)}
                        title="Xóa khu vực này">🗑️</button>
                )}
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table quotation-detail-table">
                    <thead>
                        <tr>
                            <th style={{ width: 30 }}>#</th>
                            <th style={{ width: 36 }}></th>
                            <th style={{ minWidth: 160 }}>HẠNG MỤC / SẢN PHẨM</th>
                            <th style={{ width: 65 }}>DÀI (M)</th>
                            <th style={{ width: 65 }}>RỘNG (M)</th>
                            <th style={{ width: 65 }}>CAO (M)</th>
                            <th style={{ width: 65 }}>SL</th>
                            <th style={{ width: 55 }}>ĐVT</th>
                            <th style={{ width: 90 }}>ĐƠN GIÁ</th>
                            <th style={{ width: 100 }}>THÀNH TIỀN</th>
                            <th style={{ minWidth: 120 }}>MÔ TẢ</th>
                            <th style={{ width: 30 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sub.items.map((item, ii) => {
                            const isAutoQty = !!(item.length && item.width);
                            return (
                                <tr key={item._key}>
                                    <td style={{ textAlign: 'center', opacity: 0.4, fontSize: 11 }}>{ii + 1}</td>
                                    <td style={{ textAlign: 'center', padding: 2, cursor: onImageClick ? 'pointer' : 'default' }}
                                        onClick={() => onImageClick && onImageClick(mi, si, ii)}>
                                        {item.image ? (
                                            <img src={item.image} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                                        ) : (
                                            <div style={{ width: 28, height: 28, borderRadius: 4, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, opacity: 0.25 }}>
                                                {onImageClick ? '📷' : '🖼️'}
                                            </div>
                                        )}
                                    </td>
                                    <td><input className="form-input form-input-compact" value={item.name} onChange={e => updateItem(mi, si, ii, 'name', e.target.value)} placeholder="Tên" /></td>
                                    <td><input className="form-input form-input-compact" type="number" value={item.length || ''} onChange={e => updateItem(mi, si, ii, 'length', e.target.value)} placeholder="0" /></td>
                                    <td><input className="form-input form-input-compact" type="number" value={item.width || ''} onChange={e => updateItem(mi, si, ii, 'width', e.target.value)} placeholder="0" /></td>
                                    <td><input className="form-input form-input-compact" type="number" value={item.height || ''} onChange={e => updateItem(mi, si, ii, 'height', e.target.value)} placeholder="0" /></td>
                                    <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 500 }}>
                                        {isAutoQty ? (
                                            <span title="Tự động tính từ Dài × Rộng × Cao" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                                                {fmt(item.quantity)}
                                                <span style={{ fontSize: 9, background: 'var(--accent-primary)', color: '#fff', padding: '1px 4px', borderRadius: 3, lineHeight: 1 }}>auto</span>
                                            </span>
                                        ) : (
                                            <input className="form-input form-input-compact" type="number" value={item.quantity || ''} onChange={e => updateItem(mi, si, ii, 'quantity', e.target.value)} />
                                        )}
                                    </td>
                                    <td>
                                        <select className="form-select form-input-compact" value={item.unit} onChange={e => updateItem(mi, si, ii, 'unit', e.target.value)}>
                                            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </td>
                                    <td><input className="form-input form-input-compact" type="number" value={item.unitPrice || ''} onChange={e => updateItem(mi, si, ii, 'unitPrice', e.target.value)} /></td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 12 }}>{fmt(item.amount)}</td>
                                    <td><input className="form-input form-input-compact" value={item.description} onChange={e => updateItem(mi, si, ii, 'description', e.target.value)} /></td>
                                    <td><button className="btn btn-ghost" onClick={() => removeItem(mi, si, ii)} style={{ padding: '2px 4px', fontSize: 11 }}>✕</button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => addItem(mi, si)}>+ Thêm dòng trống</button>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <input
                        ref={quickRef}
                        className="form-input form-input-compact quick-add-input"
                        placeholder="⚡ Nhập nhanh: gõ tên hạng mục hoặc sản phẩm..."
                        value={quickSearch}
                        onChange={e => { setQuickSearch(e.target.value); setShowQuickDrop(true); }}
                        onFocus={() => { hook.setActiveMainIdx(mi); hook.setActiveSubIdx(si); quickResults.length > 0 && setShowQuickDrop(true); }}
                        onKeyDown={handleQuickKeyDown}
                    />
                    {showQuickDrop && quickResults.length > 0 && (
                        <div ref={dropRef} className="quick-add-dropdown">
                            {quickResults.map((r, idx) => (
                                <div key={r.id}
                                    className={`quick-add-option ${idx === quickFocusIdx ? 'quick-add-option-active' : ''}`}
                                    onClick={() => handleQuickAdd(r)}
                                    onMouseEnter={() => setQuickFocusIdx(idx)}>
                                    <span className="quick-add-type">{r._type === 'library' ? '🔨' : '📦'}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="quick-add-name">{r._label}</div>
                                        <div className="quick-add-sub">{r._sub}</div>
                                    </div>
                                    {r._price > 0 && <span className="quick-add-price">{fmt(r._price)}đ</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CategoryTable({ mi, hook, onImageClick, onSubcategoryImageClick }) {
    const { mainCategories, addSubcategory } = hook;
    const mc = mainCategories[mi];
    if (!mc) return null;

    return (
        <div>
            {mc.subcategories.map((sub, si) => (
                <SubcategorySection key={sub._key} sub={sub} mi={mi} si={si} hook={hook} onImageClick={onImageClick} onSubcategoryImageClick={onSubcategoryImageClick} />
            ))}
            <button className="btn btn-ghost" onClick={() => addSubcategory(mi)}
                style={{ width: '100%', padding: '10px', border: '2px dashed var(--border-color)', borderRadius: 8, fontSize: 13 }}>
                + Thêm khu vực mới
            </button>
        </div>
    );
}
