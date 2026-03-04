'use client';
import { useState } from 'react';

function TreeNode({ cat, activeCatId, onSelect, onRename, onDelete, onAdd, depth = 0 }) {
    const [open, setOpen] = useState(true);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(cat.name);
    const active = activeCatId === cat.id;
    const count = (cat._count?.products || 0) + (cat.children || []).reduce((s, c) => s + (c._count?.products || 0), 0);

    const save = () => {
        if (name.trim() && name !== cat.name) onRename(cat.id, name.trim());
        setEditing(false);
    };

    return (
        <div>
            <div
                onClick={() => onSelect(active ? null : cat.id)}
                style={{
                    padding: '7px 12px', paddingLeft: 12 + depth * 16, cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 6, borderRadius: 6, margin: '1px 4px',
                    background: active ? 'var(--accent-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-primary)',
                    fontWeight: active ? 700 : 400, transition: 'all 0.12s',
                }}
            >
                {cat.children?.length > 0 && (
                    <span onClick={e => { e.stopPropagation(); setOpen(!open); }}
                        style={{ fontSize: 10, opacity: 0.5, cursor: 'pointer', width: 14, textAlign: 'center' }}>
                        {open ? '▼' : '▶'}
                    </span>
                )}
                {editing ? (
                    <input autoFocus value={name} onChange={e => setName(e.target.value)}
                        onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                        onClick={e => e.stopPropagation()}
                        style={{ flex: 1, fontSize: 12, padding: '2px 6px', border: '1px solid var(--accent-primary)', borderRadius: 4, background: 'var(--bg)', outline: 'none' }} />
                ) : (
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onDoubleClick={e => { e.stopPropagation(); setEditing(true); }}>
                        {cat.children?.length > 0 ? '📁' : '📄'} {cat.name}
                    </span>
                )}
                <span style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}>{count}</span>
                {active && !editing && (
                    <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => onAdd(cat.id)} title="Thêm con"
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>+</button>
                        <button onClick={() => setEditing(true)} title="Đổi tên"
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>✏️</button>
                        <button onClick={() => onDelete(cat.id)} title="Xóa"
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 11, padding: '0 2px' }}>🗑</button>
                    </div>
                )}
            </div>
            {open && cat.children?.map(child => (
                <TreeNode key={child.id} cat={child} activeCatId={activeCatId} onSelect={onSelect}
                    onRename={onRename} onDelete={onDelete} onAdd={onAdd} depth={depth + 1} />
            ))}
        </div>
    );
}

export default function CategorySidebar({ categories, activeCatId, onSelect, totalCount, onRefresh }) {
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');

    const createCat = async (parentId = null) => {
        const name = parentId ? prompt('Tên danh mục con:') : newName.trim();
        if (!name) return;
        await fetch('/api/product-categories', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, parentId }),
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
        if (!confirm('Xóa danh mục? Sản phẩm sẽ được chuyển lên danh mục cha.')) return;
        await fetch(`/api/product-categories/${id}`, { method: 'DELETE' });
        if (activeCatId === id) onSelect(null);
        onRefresh();
    };

    return (
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-alt)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8 }}>DANH MỤC</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                <div onClick={() => onSelect(null)}
                    style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: !activeCatId ? 'var(--accent-primary)' : 'transparent', color: !activeCatId ? '#fff' : 'var(--text-primary)', fontWeight: !activeCatId ? 700 : 400, borderRadius: 6, margin: '0 4px' }}>
                    <span>Tất cả</span>
                    <span style={{ fontSize: 11, opacity: 0.75 }}>{totalCount}</span>
                </div>
                {categories.map(cat => (
                    <TreeNode key={cat.id} cat={cat} activeCatId={activeCatId} onSelect={onSelect}
                        onRename={renameCat} onDelete={deleteCat} onAdd={(parentId) => createCat(parentId)} />
                ))}
            </div>
            <div style={{ padding: 8, borderTop: '1px solid var(--border-color)' }}>
                {adding ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') createCat(); if (e.key === 'Escape') setAdding(false); }}
                            placeholder="Tên danh mục..." style={{ flex: 1, fontSize: 12, padding: '5px 8px', border: '1px solid var(--accent-primary)', borderRadius: 6, background: 'var(--bg)' }} />
                        <button onClick={() => createCat()} className="btn btn-primary btn-sm" style={{ fontSize: 11 }}>✓</button>
                    </div>
                ) : (
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 12 }} onClick={() => setAdding(true)}>+ Thêm danh mục</button>
                )}
            </div>
        </div>
    );
}
