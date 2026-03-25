'use client';
import { useState, useRef } from 'react';

function TreeNode({ cat, activeCatId, onSelect, onRename, onDelete, onAdd, onMove, onProductDrop, depth = 0, dragState, setDragState }) {
    const [open, setOpen] = useState(true);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(cat.name);
    const [hovered, setHovered] = useState(false);
    const [addingChild, setAddingChild] = useState(false);
    const [childName, setChildName] = useState('');
    const active = activeCatId === cat.id;
    const isFake = cat.id?.startsWith('__str__');
    const count = (cat._count?.products || 0) + (cat.children || []).reduce((s, c) => s + (c._count?.products || 0), 0);
    const isDragging = dragState?.dragId === cat.id && dragState?.type === 'category';
    const isDropTarget = dragState?.dropId === cat.id;
    const isProductDrag = dragState?.type === 'product';
    const isLeaf = !cat.children || cat.children.length === 0;
    const canAcceptProduct = isProductDrag && isLeaf;

    const save = () => {
        if (name.trim() && name !== cat.name) onRename(cat.id, name.trim());
        setEditing(false);
    };

    const submitChild = () => {
        if (childName.trim()) {
            onAdd(cat.id, childName.trim());
        }
        setChildName('');
        setAddingChild(false);
    };

    const handleDragStart = (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', cat.id);
        setDragState({ dragId: cat.id, dropId: null, type: 'category' });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragState?.type === 'product') {
            if (!isLeaf) return;
            e.dataTransfer.dropEffect = 'move';
            setDragState(prev => prev ? { ...prev, dropId: cat.id } : null);
            return;
        }
        if (dragState?.dragId === cat.id) return;
        if (isChildOf(cat, dragState?.dragId)) return;
        e.dataTransfer.dropEffect = 'move';
        setDragState(prev => prev ? { ...prev, dropId: cat.id } : null);
    };

    const handleDragLeave = (e) => {
        e.stopPropagation();
        if (dragState?.dropId === cat.id) {
            setDragState(prev => prev ? { ...prev, dropId: null } : null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dragState?.type === 'product') {
            if (isLeaf && onProductDrop) {
                const productIds = JSON.parse(e.dataTransfer.getData('application/product-ids') || '[]');
                if (productIds.length) onProductDrop(productIds, cat.id, cat.name);
            }
            setDragState(null);
            return;
        }
        const dragId = dragState?.dragId;
        if (dragId && dragId !== cat.id && !isChildOf(cat, dragId)) {
            onMove(dragId, cat.id);
        }
        setDragState(null);
    };

    function isChildOf(node, dragId) {
        if (!node.children) return false;
        for (const child of node.children) {
            if (child.id === dragId) return true;
            if (isChildOf(child, dragId)) return true;
        }
        return false;
    }

    const dropHighlight = isDropTarget && (dragState?.type === 'category' || canAcceptProduct);
    const showActions = (hovered || active) && !editing;

    return (
        <div>
            <div
                draggable={!editing && !addingChild}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={() => setDragState(null)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={() => onSelect(active ? null : cat.id)}
                style={{
                    padding: '7px 8px', paddingLeft: 8 + depth * 16, cursor: isDragging ? 'grabbing' : 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 5, borderRadius: 6, margin: '1px 4px',
                    background: dropHighlight ? (isProductDrag ? 'rgba(34,197,94,0.15)' : 'rgba(35,64,147,0.15)') : active ? 'var(--accent-primary)' : hovered ? 'rgba(35,64,147,0.07)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-primary)',
                    fontWeight: active ? 700 : 400, transition: 'all 0.12s',
                    opacity: isDragging ? 0.4 : 1,
                    border: dropHighlight ? `2px dashed ${isProductDrag ? '#22c55e' : 'var(--accent-primary)'}` : '2px solid transparent',
                }}
            >
                {cat.children?.length > 0 && (
                    <span onClick={e => { e.stopPropagation(); setOpen(!open); }}
                        style={{ fontSize: 10, opacity: 0.5, cursor: 'pointer', width: 14, textAlign: 'center', flexShrink: 0 }}>
                        {open ? '▼' : '▶'}
                    </span>
                )}
                {!cat.children?.length && <span style={{ width: 14, flexShrink: 0 }} />}
                {editing ? (
                    <input autoFocus value={name} onChange={e => setName(e.target.value)}
                        onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(cat.name); setEditing(false); } }}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, fontSize: 12, padding: '2px 6px', border: '1px solid var(--accent-primary)', borderRadius: 4, background: 'var(--bg)', outline: 'none', minWidth: 0 }} />
                ) : (
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}
                        onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}>
                        {cat.name}
                    </span>
                )}
                <span style={{ fontSize: 11, opacity: 0.55, flexShrink: 0, color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>{count}</span>
                {showActions && !isFake && (
                    <div style={{ display: 'flex', gap: 1, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setAddingChild(true); setOpen(true); }}
                            title="Thêm danh mục con"
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '1px 3px', borderRadius: 3,
                                color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                                lineHeight: 1,
                            }}>+</button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                            title="Đổi tên"
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 3px', borderRadius: 3,
                                color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                                lineHeight: 1,
                            }}>✏️</button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(cat.id); }}
                            title="Xóa danh mục"
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, padding: '1px 3px', borderRadius: 3,
                                color: active ? 'rgba(255,255,255,0.7)' : '#ef4444',
                                lineHeight: 1,
                            }}>🗑</button>
                    </div>
                )}
            </div>
            {/* Inline add child input */}
            {addingChild && (
                <div style={{ display: 'flex', gap: 4, padding: '4px 8px', paddingLeft: 8 + (depth + 1) * 16 }} onClick={e => e.stopPropagation()}>
                    <input
                        autoFocus
                        value={childName}
                        onChange={e => setChildName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') submitChild(); if (e.key === 'Escape') { setAddingChild(false); setChildName(''); } }}
                        placeholder="Tên danh mục con..."
                        style={{ flex: 1, fontSize: 12, padding: '4px 8px', border: '1px solid var(--accent-primary)', borderRadius: 6, background: 'var(--bg)', outline: 'none', minWidth: 0 }}
                    />
                    <button onClick={submitChild} style={{ background: 'var(--accent-primary)', border: 'none', color: '#fff', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✓</button>
                    <button onClick={() => { setAddingChild(false); setChildName(''); }} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✕</button>
                </div>
            )}
            {open && cat.children?.map(child => (
                <TreeNode key={child.id} cat={child} activeCatId={activeCatId} onSelect={onSelect}
                    onRename={onRename} onDelete={onDelete} onAdd={onAdd} onMove={onMove}
                    onProductDrop={onProductDrop} depth={depth + 1}
                    dragState={dragState} setDragState={setDragState} />
            ))}
        </div>
    );
}

export default function CategorySidebar({ categories, activeCatId, onSelect, totalCount, onRefresh, onProductDrop, dragState, setDragState: setDragStateProp, supplier }) {
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [localDragState, setLocalDragState] = useState(null);
    const [migrating, setMigrating] = useState(false);

    const hasFakeCategories = categories.some(c => c.id?.startsWith('__str__'));

    const ds = dragState || localDragState;
    const setDs = (v) => {
        if (setDragStateProp) setDragStateProp(v);
        setLocalDragState(v);
    };

    const createCat = async (parentId = null, name = null) => {
        const catName = name ?? newName.trim();
        if (!catName) return;
        await fetch('/api/product-categories', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: catName, parentId, supplier: supplier || '' }),
        });
        setNewName(''); setAdding(false);
        onRefresh();
    };

    const renameCat = async (id, name) => {
        await fetch(`/api/product-categories/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        onRefresh();
    };

    const deleteCat = async (id) => {
        if (id?.startsWith('__str__')) return;
        if (!confirm('Xóa danh mục? Sản phẩm sẽ được chuyển lên danh mục cha.')) return;
        const res = await fetch(`/api/product-categories/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert('Lỗi xóa danh mục: ' + (err.error || res.status));
        }
        if (activeCatId === id) onSelect(null);
        onRefresh();
    };

    const migrateCategories = async () => {
        setMigrating(true);
        try {
            // Fetch existing categories to avoid duplicates
            const existing = await fetch('/api/product-categories').then(r => r.json()).catch(() => []);
            const existingNames = new Set((existing || []).map(c => c.name));
            const fakeCats = categories.filter(c => c.id?.startsWith('__str__') && !existingNames.has(c.name));
            for (const cat of fakeCats) {
                await fetch('/api/product-categories', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: cat.name, parentId: null }),
                });
            }
        } finally {
            setMigrating(false);
            onRefresh();
        }
    };

    const moveCat = async (dragId, targetParentId) => {
        await fetch(`/api/product-categories/${dragId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentId: targetParentId }),
        });
        onRefresh();
    };

    const handleRootDragOver = (e) => {
        e.preventDefault();
        if (ds?.dragId && ds?.type === 'category') {
            setDs(prev => prev ? { ...prev, dropId: '__root__' } : null);
        }
    };

    const handleRootDrop = (e) => {
        e.preventDefault();
        if (ds?.type === 'category' && ds?.dragId) {
            moveCat(ds.dragId, null);
        }
        setDs(null);
    };

    return (
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-alt)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>DANH MỤC</span>
                <button
                    onClick={() => setAdding(true)}
                    title="Thêm danh mục"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px', borderRadius: 3 }}
                >+</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}
                onDragOver={handleRootDragOver}
                onDrop={handleRootDrop}
                onDragLeave={() => { if (ds?.dropId === '__root__') setDs(prev => prev ? { ...prev, dropId: null } : null); }}
            >
                {hasFakeCategories && (
                    <div style={{ margin: '4px 8px 2px', padding: '8px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, fontSize: 11, color: '#854d0e' }}>
                        <div style={{ marginBottom: 6 }}>⚠ Danh mục chưa được khởi tạo trong DB. Không thể xóa/sửa.</div>
                        <button
                            onClick={migrateCategories}
                            disabled={migrating}
                            style={{ width: '100%', padding: '4px 8px', background: '#854d0e', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
                        >{migrating ? 'Đang khởi tạo...' : '🚀 Khởi tạo danh mục'}</button>
                    </div>
                )}
                <div onClick={() => onSelect(null)}
                    style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: !activeCatId ? 'var(--accent-primary)' : 'transparent', color: !activeCatId ? '#fff' : 'var(--text-primary)', fontWeight: !activeCatId ? 700 : 400, borderRadius: 6, margin: '0 4px' }}>
                    <span>Tất cả</span>
                    <span style={{ fontSize: 11, opacity: 0.75 }}>{totalCount}</span>
                </div>
                {categories.map(cat => (
                    <TreeNode key={cat.id} cat={cat} activeCatId={activeCatId} onSelect={onSelect}
                        onRename={renameCat} onDelete={deleteCat}
                        onAdd={(parentId, name) => createCat(parentId, name)}
                        onMove={moveCat} onProductDrop={onProductDrop}
                        dragState={ds} setDragState={setDs} />
                ))}
                {ds?.type === 'category' && ds?.dragId && (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDs(prev => prev ? { ...prev, dropId: '__root__' } : null); }}
                        onDrop={(e) => { e.preventDefault(); moveCat(ds.dragId, null); setDs(null); }}
                        onDragLeave={() => setDs(prev => prev ? { ...prev, dropId: null } : null)}
                        style={{
                            margin: '8px 8px', padding: '10px 0', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
                            border: ds?.dropId === '__root__' ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                            borderRadius: 6, background: ds?.dropId === '__root__' ? 'rgba(35,64,147,0.08)' : 'transparent',
                            transition: 'all 0.15s',
                        }}
                    >
                        📤 Thả vào đây để chuyển lên gốc
                    </div>
                )}
            </div>
            <div style={{ padding: 8, borderTop: '1px solid var(--border-color)' }}>
                {adding ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') createCat(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
                            placeholder="Tên danh mục..." style={{ flex: 1, fontSize: 12, padding: '5px 8px', border: '1px solid var(--accent-primary)', borderRadius: 6, background: 'var(--bg)', outline: 'none' }} />
                        <button onClick={() => createCat()} style={{ background: 'var(--accent-primary)', border: 'none', color: '#fff', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✓</button>
                        <button onClick={() => { setAdding(false); setNewName(''); }} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: 4, padding: '4px 6px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                    </div>
                ) : (
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => setAdding(true)}>+ Thêm danh mục</button>
                )}
            </div>
        </div>
    );
}
