'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { fmt, UNIT_OPTIONS } from '@/lib/quotation-constants';
import { apiFetch } from '@/lib/fetchClient';
import { useRole } from '@/contexts/RoleContext';

// Inline product search for sub-item name field
function SubItemSearch({ value, onChange, onSelect, products }) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [show, setShow] = useState(false);
    const [focused, setFocused] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!focused || !search.trim()) { setResults([]); return; }
        const q = search.toLowerCase();
        setResults((products || []).filter(p => p.name.toLowerCase().includes(q)).slice(0, 8));
    }, [search, products, focused]);

    useEffect(() => {
        const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <input className="form-input form-input-compact" value={focused ? search : value}
                placeholder="Phụ kiện — gõ tìm SP..."
                style={{ fontSize: 12, fontStyle: 'italic' }}
                onFocus={() => { setFocused(true); setSearch(value || ''); setShow(true); }}
                onBlur={() => { setTimeout(() => { setFocused(false); setShow(false); }, 200); }}
                onChange={e => { setSearch(e.target.value); onChange(e.target.value); setShow(true); }} />
            {show && results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color)', borderRadius: 6, maxHeight: 180, overflow: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    {results.map(p => (
                        <div key={p.id} onMouseDown={() => { onSelect(p); setShow(false); setFocused(false); }}
                            style={{ padding: '5px 8px', cursor: 'pointer', fontSize: 11, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)' }}>
                            <span style={{ flex: 1 }}>{p.name}</span>
                            <span style={{ opacity: 0.5, whiteSpace: 'nowrap', marginLeft: 6 }}>{p.unit} · {fmt(p.salePrice)}đ</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Inline variant selector for product rows
function InlineVariants({ productId, basePrice, onPriceChange, onDescChange }) {
    const [attrs, setAttrs] = useState(null); // null=not loaded, []=no variants
    const [selections, setSelections] = useState({});
    const userChanged = useRef(false);

    useEffect(() => {
        if (!productId) return;
        apiFetch(`/api/products/${productId}/attributes`)
            .then(data => {
                setAttrs(data || []);
                const init = {};
                (data || []).forEach(a => {
                    if (a.inputType === 'select' && a.options.length > 0) init[a.id] = a.options[0].id;
                    else init[a.id] = '';
                });
                setSelections(init);
            })
            .catch(() => setAttrs([]));
    }, [productId]);

    useEffect(() => {
        if (!attrs || attrs.length === 0) return;
        if (!userChanged.current) return; // Don't override price on initial load
        let addon = 0;
        const descParts = [];
        attrs.forEach(a => {
            if (a.inputType === 'select') {
                const opt = a.options.find(o => o.id === selections[a.id]);
                if (opt) { addon += (opt.priceAddon || 0); descParts.push(`${a.name}: ${opt.label}`); }
            } else if (selections[a.id]?.trim()) {
                descParts.push(`${a.name}: ${selections[a.id]}`);
            }
        });
        onPriceChange(basePrice + addon);
        onDescChange(descParts.join(', '));
    }, [selections, attrs, basePrice, onPriceChange, onDescChange]);

    const handleChange = (attrId, value) => {
        userChanged.current = true;
        setSelections(s => ({ ...s, [attrId]: value }));
    };

    if (!productId || attrs === null || attrs.length === 0) return null;

    return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
            {attrs.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ fontSize: 10, opacity: 0.5, whiteSpace: 'nowrap' }}>{a.name}:</span>
                    {a.inputType === 'select' ? (
                        <select value={selections[a.id] || ''} onChange={e => handleChange(a.id, e.target.value)}
                            style={{ fontSize: 11, padding: '1px 2px', border: '1px solid var(--border-color)', borderRadius: 3, background: 'var(--bg-input)', maxWidth: 130 }}>
                            {!a.required && <option value="">—</option>}
                            {a.options.map(o => (
                                <option key={o.id} value={o.id}>
                                    {o.label}{o.priceAddon > 0 ? ` +${new Intl.NumberFormat('vi-VN').format(o.priceAddon)}` : o.priceAddon < 0 ? ` ${new Intl.NumberFormat('vi-VN').format(o.priceAddon)}` : ''}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input value={selections[a.id] || ''} onChange={e => handleChange(a.id, e.target.value)}
                            placeholder={a.name} style={{ fontSize: 11, padding: '1px 3px', border: '1px solid var(--border-color)', borderRadius: 3, width: 80 }} />
                    )}
                </div>
            ))}
        </div>
    );
}

function SubcategorySection({ sub, mi, si, hook, onImageClick, onSubcategoryImageClick, quotationType }) {
    const { updateSubcategoryName, removeSubcategory, updateItem, removeItem, addItem, addFromLibrary, addFromProduct, allSearchItems, mainCategories, setMainCategories, recalc, addSubItem, removeSubItem, updateSubItem, products, updateSubcategoryShared } = hook;
    const { role } = useRole();
    const isXayDung = role === 'xay_dung';
    const isDienNuoc = quotationType === 'Thi công điện nước';
    const isBaoGiaThietBiDien = quotationType === 'Báo giá thiết bị điện';
    const isTongHop = quotationType === 'Tổng hợp chi phí hoàn thiện';
    const isBaoGiaNhanThat = quotationType === 'Báo giá nội thất';

    // Auto-initialize shared fields when type switches to Thi công điện nước
    useEffect(() => {
        if (isDienNuoc && sub.sharedUnit === undefined) {
            updateSubcategoryShared(mi, si, 'sharedUnit', 'trọn gói');
        }
    }, [isDienNuoc]); // eslint-disable-line react-hooks/exhaustive-deps

    // Drag-and-drop state
    const dragIdxRef = useRef(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    const handleDragStart = (e, idx) => {
        dragIdxRef.current = idx;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, idx) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIdx(idx);
    };

    const handleDrop = (e, toIdx) => {
        e.preventDefault();
        const fromIdx = dragIdxRef.current;
        if (fromIdx === null || fromIdx === toIdx) { setDragOverIdx(null); return; }
        const newItems = [...sub.items];
        const [moved] = newItems.splice(fromIdx, 1);
        newItems.splice(toIdx, 0, moved);
        const updated = mainCategories.map((mc, mci) =>
            mci === mi ? {
                ...mc, subcategories: mc.subcategories.map((sc, sci) =>
                    sci === si ? { ...sc, items: newItems } : sc
                )
            } : mc
        );
        setMainCategories(recalc(updated));
        dragIdxRef.current = null;
        setDragOverIdx(null);
    };

    const handleDragEnd = () => {
        dragIdxRef.current = null;
        setDragOverIdx(null);
    };

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
        // Pass mi/si explicitly to avoid stale activeSubIdx state bug
        if (item._type === 'library') addFromLibrary(item, mi);
        else addFromProduct(item, mi, si);
        setQuickSearch('');
        setQuickResults([]);
        setShowQuickDrop(false);
        setTimeout(() => quickRef.current?.focus(), 50);
    }, [addFromLibrary, addFromProduct, mi, si]);

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
                            <span className="placeholder" style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.3 }}>🖼️<br />Kéo thả hoặc<br />Click tải ảnh</span>
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
            {isDienNuoc && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'rgba(35,64,147,0.05)', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>ĐVT / SL / ĐƠN GIÁ chung:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ fontSize: 11, opacity: 0.6 }}>ĐVT</label>
                        <input className="form-input form-input-compact" style={{ width: 70 }}
                            value={sub.sharedUnit ?? 'trọn gói'}
                            onChange={e => updateSubcategoryShared(mi, si, 'sharedUnit', e.target.value)}
                            placeholder="ĐVT" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ fontSize: 11, opacity: 0.6 }}>SL</label>
                        <input className="form-input form-input-compact" style={{ width: 70 }} type="number"
                            value={sub.sharedQuantity ?? 1}
                            onChange={e => updateSubcategoryShared(mi, si, 'sharedQuantity', e.target.value)}
                            placeholder="0" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ fontSize: 11, opacity: 0.6 }}>ĐƠN GIÁ</label>
                        <input className="form-input form-input-compact" style={{ width: 120 }} type="number"
                            value={sub.sharedUnitPrice ?? 0}
                            onChange={e => updateSubcategoryShared(mi, si, 'sharedUnitPrice', e.target.value)}
                            placeholder="0" />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', marginLeft: 'auto' }}>
                        = {fmt((sub.sharedQuantity ?? 1) * (sub.sharedUnitPrice ?? 0))} đ
                    </span>
                </div>
            )}
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table quotation-detail-table">
                    <thead>
                        <tr>
                            <th style={{ width: 24 }}></th>
                            <th style={{ width: 26 }}>#</th>
                            <th style={{ width: 36 }}></th>
                            <th style={{ minWidth: 180 }}>HẠNG MỤC / SẢN PHẨM</th>
                            {isBaoGiaThietBiDien && <th style={{ width: 90 }}>HÃNG SX</th>}
                            {isBaoGiaThietBiDien && <th style={{ width: 90 }}>MÃ SP</th>}
                            {isBaoGiaNhanThat && <th style={{ width: 60 }}>DÀI</th>}
                            {isBaoGiaNhanThat && <th style={{ width: 60 }}>SÂU</th>}
                            {isBaoGiaNhanThat && <th style={{ width: 60 }}>CAO</th>}
                            {!isDienNuoc && !isTongHop && <th style={{ width: 55 }}>ĐVT</th>}
                            {!isDienNuoc && !isTongHop && <th style={{ width: 55 }}>SL</th>}
                            {!isDienNuoc && !isTongHop && (isBaoGiaThietBiDien
                                ? <React.Fragment><th style={{ width: 100 }}>GIÁ NIÊM YẾT</th><th style={{ width: 90 }}>ĐG CK</th></React.Fragment>
                                : <th style={{ width: 90 }}>ĐƠN GIÁ</th>
                            )}
                            {!isDienNuoc && <th style={{ width: 100 }}>THÀNH TIỀN</th>}
                            <th style={{ width: 30 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sub.items.map((item, ii) => {
                            const isDragOver = dragOverIdx === ii;
                            return (
                                <React.Fragment key={item._key}>
                                    <tr
                                        draggable
                                        onDragStart={e => handleDragStart(e, ii)}
                                        onDragOver={e => handleDragOver(e, ii)}
                                        onDrop={e => handleDrop(e, ii)}
                                        onDragEnd={handleDragEnd}
                                        style={isDragOver ? { outline: '2px solid var(--primary)', outlineOffset: -1, background: 'rgba(35,64,147,0.05)' } : {}}
                                    >
                                        <td style={{ textAlign: 'center', cursor: 'grab', padding: '0 4px', opacity: 0.35, fontSize: 16, userSelect: 'none' }}
                                            title="Kéo để sắp xếp">⠿</td>
                                        <td style={{ textAlign: 'center', opacity: 0.4, fontSize: 11 }}>{ii + 1}</td>
                                        <td style={{ textAlign: 'center', padding: 2, cursor: onImageClick ? 'pointer' : 'default' }}
                                            onClick={() => onImageClick && onImageClick(mi, si, ii)}>
                                            {(() => {
                                                const productImage = item.productId ? products.find(p => p.id === item.productId)?.image : null;
                                                const imgSrc = item.image || productImage;
                                                return imgSrc ? (
                                                    <img src={imgSrc} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }}
                                                        onError={(e) => {
                                                            if (productImage && e.target.src !== productImage) {
                                                                e.target.src = productImage;
                                                            } else {
                                                                e.target.style.display = 'none';
                                                                e.target.nextSibling.style.display = 'flex';
                                                            }
                                                        }} />
                                                ) : null;
                                            })()}
                                            <div style={{ width: 28, height: 28, borderRadius: 4, border: '2px dashed var(--border-color)', display: (item.image || (item.productId && products.find(p => p.id === item.productId)?.image)) ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, opacity: 0.25 }}>
                                                {onImageClick ? '📷' : '🖼️'}
                                            </div>
                                        </td>
                                        <td>
                                            <input className="form-input form-input-compact" value={item.name} onChange={e => updateItem(mi, si, ii, 'name', e.target.value)} placeholder="Tên hạng mục / sản phẩm" />
                                            <input className="form-input form-input-compact" value={item.description} onChange={e => updateItem(mi, si, ii, 'description', e.target.value)}
                                                placeholder="Mô tả..." style={{ marginTop: 3, fontSize: 11, opacity: 0.7, fontStyle: 'italic' }} />
                                            <InlineVariants
                                                productId={item.productId}
                                                basePrice={item.mainMaterial || 0}
                                                onPriceChange={(price) => updateItem(mi, si, ii, 'unitPrice', price)}
                                                onDescChange={(desc) => updateItem(mi, si, ii, 'description', desc)}
                                            />
                                        </td>
                                        {isBaoGiaThietBiDien && <td><input className="form-input form-input-compact" value={item.brand || ''} onChange={e => updateItem(mi, si, ii, 'brand', e.target.value)} placeholder="Hãng SX" /></td>}
                                        {isBaoGiaThietBiDien && <td><input className="form-input form-input-compact" value={item.productCode || ''} onChange={e => updateItem(mi, si, ii, 'productCode', e.target.value)} placeholder="Mã SP" /></td>}
                                        {isBaoGiaNhanThat && <td><input className="form-input form-input-compact" type="number" value={item.dai || ''} onChange={e => updateItem(mi, si, ii, 'dai', e.target.value)} placeholder="0" /></td>}
                                        {isBaoGiaNhanThat && <td><input className="form-input form-input-compact" type="number" value={item.sau || ''} onChange={e => updateItem(mi, si, ii, 'sau', e.target.value)} placeholder="0" /></td>}
                                        {isBaoGiaNhanThat && <td><input className="form-input form-input-compact" type="number" value={item.cao || ''} onChange={e => updateItem(mi, si, ii, 'cao', e.target.value)} placeholder="0" /></td>}
                                        {!isDienNuoc && !isTongHop && <td>
                                            {isXayDung || isBaoGiaThietBiDien
                                                ? <input className="form-input form-input-compact" value={item.unit || ''} onChange={e => updateItem(mi, si, ii, 'unit', e.target.value)} placeholder="ĐVT" />
                                                : (() => {
                                                    const opts = UNIT_OPTIONS.includes(item.unit) ? UNIT_OPTIONS : [item.unit, ...UNIT_OPTIONS];
                                                    return (
                                                        <select className="form-select form-input-compact" value={item.unit} onChange={e => updateItem(mi, si, ii, 'unit', e.target.value)}>
                                                            {opts.map(u => <option key={u} value={u}>{u}</option>)}
                                                        </select>
                                                    );
                                                })()
                                            }
                                        </td>}
                                        {!isDienNuoc && !isTongHop && <td><input className="form-input form-input-compact" type="number" value={item.quantity || ''} onChange={e => updateItem(mi, si, ii, 'quantity', e.target.value)} placeholder="0" /></td>}
                                        {!isDienNuoc && isBaoGiaThietBiDien && <td><input className="form-input form-input-compact" type="number" value={item.listPrice || ''} onChange={e => updateItem(mi, si, ii, 'listPrice', e.target.value)} placeholder="0" /></td>}
                                        {!isDienNuoc && !isTongHop && <td><input className="form-input form-input-compact" type="number" value={item.unitPrice || ''} onChange={e => updateItem(mi, si, ii, 'unitPrice', e.target.value)} /></td>}
                                        {!isDienNuoc && (isTongHop
                                            ? <td><input className="form-input form-input-compact" type="number" value={item.amount || ''} onChange={e => updateItem(mi, si, ii, 'amount', e.target.value)} placeholder="0" style={{ fontWeight: 700, color: 'var(--accent-primary)' }} /></td>
                                            : <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 12 }}>{fmt(item.amount)}</td>
                                        )}
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <button className="btn btn-ghost" onClick={() => removeItem(mi, si, ii)} style={{ padding: '2px 4px', fontSize: 11 }}>✕</button>
                                                <button className="btn btn-ghost" onClick={() => addSubItem(mi, si, ii)} style={{ padding: '1px 3px', fontSize: 9, opacity: 0.5 }} title="Thêm phụ kiện">+PK</button>
                                            </div>
                                        </td>
                                    </tr>
                                    {/* Sub-items (phụ kiện) */}
                                    {(item.subItems || []).map((si_item, sii) => (
                                        <tr key={`sub-${item._key}-${sii}`} style={{ background: 'rgba(35,64,147,0.03)' }}>
                                            <td></td>
                                            <td></td>
                                            <td style={{ textAlign: 'center', opacity: 0.3, fontSize: 9 }}>↳</td>
                                            <td style={{ paddingLeft: 24 }}>
                                                <SubItemSearch
                                                    value={si_item.name}
                                                    products={products}
                                                    onChange={v => updateSubItem(mi, si, ii, sii, 'name', v)}
                                                    onSelect={p => {
                                                        updateSubItem(mi, si, ii, sii, 'name', p.name);
                                                        updateSubItem(mi, si, ii, sii, 'unit', p.unit || 'cái');
                                                        updateSubItem(mi, si, ii, sii, 'unitPrice', p.salePrice || 0);
                                                        updateSubItem(mi, si, ii, sii, 'productId', p.id);
                                                    }}
                                                />
                                                <input className="form-input form-input-compact" value={si_item.description || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'description', e.target.value)}
                                                    placeholder="Mô tả..." style={{ marginTop: 3, fontSize: 11, opacity: 0.7, fontStyle: 'italic' }} />
                                            </td>
                                            {isBaoGiaThietBiDien && <td></td>}
                                            {isBaoGiaThietBiDien && <td></td>}
                                            {isBaoGiaNhanThat && <td></td>}
                                            {isBaoGiaNhanThat && <td></td>}
                                            {isBaoGiaNhanThat && <td></td>}
                                            {!isDienNuoc && !isTongHop && <td>
                                                {isXayDung || isBaoGiaThietBiDien
                                                    ? <input className="form-input form-input-compact" value={si_item.unit || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'unit', e.target.value)} placeholder="ĐVT" />
                                                    : <select className="form-select form-input-compact" value={si_item.unit || 'cái'} onChange={e => updateSubItem(mi, si, ii, sii, 'unit', e.target.value)}>
                                                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                                    </select>
                                                }
                                            </td>}
                                            {!isDienNuoc && !isTongHop && <td><input className="form-input form-input-compact" type="number" value={si_item.quantity || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'quantity', e.target.value)} placeholder="0" /></td>}
                                            {!isDienNuoc && isBaoGiaThietBiDien && <td></td>}
                                            {!isDienNuoc && !isTongHop && <td><input className="form-input form-input-compact" type="number" value={si_item.unitPrice || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'unitPrice', e.target.value)} /></td>}
                                            {!isDienNuoc && (isTongHop
                                                ? <td><input className="form-input form-input-compact" type="number" value={si_item.amount || ''} onChange={e => updateSubItem(mi, si, ii, sii, 'amount', e.target.value)} placeholder="0" /></td>
                                                : <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 11, opacity: 0.7 }}>{fmt(si_item.amount || 0)}</td>
                                            )}
                                            <td><button className="btn btn-ghost" onClick={() => removeSubItem(mi, si, ii, sii)} style={{ padding: '2px 4px', fontSize: 10 }}>✕</button></td>
                                        </tr>
                                    ))}
                                </React.Fragment>
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

export default function CategoryTable({ mi, hook, onImageClick, onSubcategoryImageClick, quotationType }) {
    const { mainCategories, addSubcategory } = hook;
    const mc = mainCategories[mi];
    if (!mc) return null;

    return (
        <div>
            {mc.subcategories.map((sub, si) => (
                <SubcategorySection key={sub._key} sub={sub} mi={mi} si={si} hook={hook} onImageClick={onImageClick} onSubcategoryImageClick={onSubcategoryImageClick} quotationType={quotationType} />
            ))}
            <button className="btn btn-ghost" onClick={() => addSubcategory(mi)}
                style={{ width: '100%', padding: '10px', border: '2px dashed var(--border-color)', borderRadius: 8, fontSize: 13 }}>
                + Thêm khu vực mới
            </button>
        </div>
    );
}
