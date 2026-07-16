'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { LayoutGrid, Lock } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { getMfgPermissions } from '@/lib/manufacturing/permissions';
import { KANBAN_COLUMNS } from '@/lib/manufacturing/constants';
import { useToast } from '@/components/ui/Toast';
import ItemDetailDrawer from '@/components/manufacturing/ItemDetailDrawer';

// Cột chỉ được cập nhật qua quy trình chuyên biệt (QC/Đóng gói/Vận chuyển) — không cho kéo thả trực tiếp
const LOCKED_COLUMN_KEYS = ['PASSED_QC', 'PACKED', 'DELIVERED', 'INSTALLED'];
const DRAG_ALLOWED_STATUSES = ['NOT_STARTED', 'WAITING_DRAWING', 'WAITING_MATERIAL', 'READY', 'IN_PROGRESS', 'PAUSED'];

export default function ManufacturingKanbanPage() {
    const toast = useToast();
    const { role, email, department } = useRole();
    const perms = getMfgPermissions({ role, email, department });

    const [items, setItems] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectId, setProjectId] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeItemId, setActiveItemId] = useState(null);
    const dragItem = useRef(null);
    const [dragOverCol, setDragOverCol] = useState(null);

    const load = useCallback(() => {
        setLoading(true);
        const qs = new URLSearchParams({ limit: '500' });
        if (projectId) qs.set('projectId', projectId);
        fetch(`/api/manufacturing/items?${qs}`).then(r => r.json()).then(d => { setItems(d.data || []); setLoading(false); }).catch(() => setLoading(false));
    }, [projectId]);

    useEffect(load, [load]);
    useEffect(() => { fetch('/api/projects?limit=300').then(r => r.json()).then(d => setProjects(d?.data || [])); }, []);

    const columns = useMemo(() => KANBAN_COLUMNS.map(col => ({
        ...col,
        items: items.filter(it => col.statuses.includes(it.status)),
        locked: LOCKED_COLUMN_KEYS.includes(col.key),
    })), [items]);

    async function moveItem(itemId, toStatus) {
        if (!DRAG_ALLOWED_STATUSES.includes(toStatus)) return;
        if (!perms.assign && !perms.create && !perms.start) { toast.error('Bạn không có quyền đổi trạng thái'); return; }
        // optimistic update
        setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: toStatus } : it));
        const res = await fetch('/api/manufacturing/items/bulk-assign', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemIds: [itemId], status: toStatus }),
        });
        if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            toast.error(d.error || 'Lỗi cập nhật trạng thái');
            load();
        }
    }

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <LayoutGrid size={20} color="#2563eb" />
                <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Kanban sản xuất</h1>
                <select className="form-input" style={{ width: 260, marginLeft: 'auto' }} value={projectId} onChange={e => setProjectId(e.target.value)}>
                    <option value="">Tất cả dự án</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
                    {columns.map(col => (
                        <div key={col.key}
                            onDragOver={e => { if (!col.locked) { e.preventDefault(); setDragOverCol(col.key); } }}
                            onDragLeave={() => setDragOverCol(null)}
                            onDrop={e => { e.preventDefault(); setDragOverCol(null); if (!col.locked && dragItem.current) moveItem(dragItem.current, col.statuses[0]); }}
                            style={{
                                minWidth: 240, width: 240, flexShrink: 0, background: dragOverCol === col.key ? '#eff6ff' : '#f8fafc',
                                borderRadius: 10, border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 180px)',
                            }}>
                            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{col.label}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                    {col.locked && <Lock size={10} />} {col.items.length}
                                </span>
                            </div>
                            <div style={{ padding: 8, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {col.items.map(it => (
                                    <div key={it.id}
                                        draggable={!col.locked && DRAG_ALLOWED_STATUSES.includes(it.status)}
                                        onDragStart={() => { dragItem.current = it.id; }}
                                        onClick={() => setActiveItemId(it.id)}
                                        style={{ background: 'white', borderRadius: 8, padding: 10, fontSize: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', cursor: 'pointer', border: '1px solid #f1f5f9' }}>
                                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{it.code}</div>
                                        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{it.name}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{it.mfgOrder?.code}</span>
                                            <span style={{ fontWeight: 700, color: it.progressPercent === 100 ? '#16a34a' : '#2563eb' }}>{it.progressPercent}%</span>
                                        </div>
                                        {it._count?.qualityIssues > 0 && <div style={{ marginTop: 4 }}><span className="badge danger" style={{ fontSize: 10 }}>{it._count.qualityIssues} lỗi</span></div>}
                                    </div>
                                ))}
                                {col.items.length === 0 && <div style={{ textAlign: 'center', color: '#cbd5e1', fontSize: 11, padding: 12 }}>Trống</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeItemId && <ItemDetailDrawer itemId={activeItemId} onClose={() => setActiveItemId(null)} onChanged={load} canUpdateStage={perms.start || perms.create} />}
        </div>
    );
}
