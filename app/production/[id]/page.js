'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    Factory, ArrowLeft, Plus, Trash2, ChevronDown,
    BarChart2, Filter, X, Edit3, Check, Circle, ChevronUp, ListChecks, GitBranch
} from 'lucide-react';
import ProductionPlanPanel from './ProductionPlanPanel';

// ── helpers ────────────────────────────────────────────────────
function getStatus(item) {
    if (item.stepSiteInstall)      return 'Hoàn thành';
    if (item.stepTransport)        return 'Đã ra công trình';
    if (item.stepWorkshopAssembly) return 'Sẵn sàng vận chuyển';
    if (item.stepCNC || item.stepColdProcess) return 'Đang sản xuất';
    return 'Chưa làm';
}

const STATUS_STYLE = {
    'Chưa làm':             { color: '#6b7280', bg: '#f3f4f6' },
    'Đang sản xuất':        { color: '#d97706', bg: '#fef3c7' },
    'Sẵn sàng vận chuyển':  { color: '#2563eb', bg: '#dbeafe' },
    'Đã ra công trình':     { color: '#7c3aed', bg: '#ede9fe' },
    'Hoàn thành':           { color: '#16a34a', bg: '#dcfce7' },
};

const STEPS = [
    { key: 'stepCNC',              label: 'Vẽ CNC',        short: 'CNC'   },
    { key: 'stepColdProcess',      label: 'Gia công nguội', short: 'Nguội' },
    { key: 'stepWorkshopAssembly', label: 'Lắp xưởng',     short: 'Lắp X' },
    { key: 'stepTransport',        label: 'Vận chuyển',    short: 'VC'    },
    { key: 'stepSiteInstall',      label: 'Lắp CT',        short: 'Lắp CT'},
];

const STATUS_ALL = ['Chưa làm', 'Đang sản xuất', 'Sẵn sàng vận chuyển', 'Đã ra công trình', 'Hoàn thành'];
const STEP_COLORS = ['#0891b2','#7c3aed','#d97706','#2563eb','#16a34a'];

// ── sub-components ─────────────────────────────────────────────
function StepCheckbox({ checked, onChange, disabled, label, short, isMobile }) {
    if (isMobile) {
        return (
            <button
                onClick={onChange}
                disabled={disabled}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    flex: 1, padding: '6px 2px', borderRadius: 8, border: 'none',
                    background: checked ? '#dcfce7' : '#f9fafb',
                    cursor: disabled ? 'default' : 'pointer', transition: 'all 0.15s',
                    minWidth: 52,
                }}
            >
                <div style={{
                    width: 26, height: 26, borderRadius: 6,
                    background: checked ? '#16a34a' : '#e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {checked
                        ? <Check size={14} color="white" strokeWidth={2.5} />
                        : <Circle size={12} color="#9ca3af" />}
                </div>
                <span style={{ fontSize: 10, fontWeight: 500, color: checked ? '#16a34a' : '#6b7280', whiteSpace: 'nowrap' }}>{short}</span>
            </button>
        );
    }
    return (
        <button
            onClick={onChange}
            disabled={disabled}
            style={{
                width: 28, height: 28, borderRadius: 6, border: 'none', cursor: disabled ? 'default' : 'pointer',
                background: checked ? '#16a34a' : '#f3f4f6', color: checked ? 'white' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
            }}
        >
            {checked ? <Check size={15} strokeWidth={2.5} /> : <Circle size={13} />}
        </button>
    );
}

function InlineEdit({ value, onSave, placeholder, style = {} }) {
    const [editing, setEditing] = useState(false);
    const [v, setV] = useState(value);
    if (!editing) return (
        <span onClick={() => { setV(value); setEditing(true); }}
            style={{ cursor: 'text', borderBottom: '1px dashed #d1d5db', ...style }}>
            {value || <span style={{ color: '#9ca3af' }}>{placeholder}</span>}
        </span>
    );
    return (
        <input autoFocus value={v} onChange={e => setV(e.target.value)}
            onBlur={() => { setEditing(false); if (v !== value) onSave(v); }}
            onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); if (v !== value) onSave(v); } if (e.key === 'Escape') setEditing(false); }}
            style={{ fontSize: 'inherit', border: '1px solid #93c5fd', borderRadius: 4, padding: '2px 6px', width: 140, ...style }}
        />
    );
}

function ProgressBar({ items, label }) {
    const total = items.length;
    if (!total) return null;
    const done = items.filter(i => i.stepSiteInstall).length;
    const pct  = Math.round((done / total) * 100);
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#16a34a' : '#2563eb' }}>{done}/{total} ({pct}%)</span>
            </div>
            <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: '#f3f4f6', gap: 1 }}>
                {STEPS.map((s, idx) => {
                    const sp = Math.round((items.filter(i => i[s.key]).length / total) * 100);
                    return <div key={s.key} style={{ flex: 1, background: sp === 100 ? STEP_COLORS[idx] : '#e5e7eb' }} />;
                })}
            </div>
        </div>
    );
}

// Mobile card for one item
function ItemCard({ item, floor, room, onToggle, onDelete, updatingId }) {
    const status = getStatus(item);
    const busy = updatingId === item.id;
    return (
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '12px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{floor.name} › {room.name}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{item.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap', background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].color }}>{status}</span>
                    <button onClick={() => onDelete(item.id)} style={{ padding: '3px 4px', border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}><Trash2 size={13} /></button>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
                {STEPS.map(s => (
                    <StepCheckbox key={s.key} checked={item[s.key]} onChange={() => onToggle(item.id, s.key, item[s.key])} disabled={busy} label={s.label} short={s.short} isMobile />
                ))}
            </div>
        </div>
    );
}

// ── main page ──────────────────────────────────────────────────
export default function ProductionDetailPage() {
    const router = useRouter();
    const { id }  = useParams();
    const [order, setOrder]           = useState(null);
    const [loading, setLoading]       = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [isMobile, setIsMobile]     = useState(false);
    const [filterFloor, setFilterFloor]   = useState('');
    const [filterRoom, setFilterRoom]     = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showStats, setShowStats]       = useState(false);
    const [showFilters, setShowFilters]   = useState(false);
    const [showMgmt, setShowMgmt]         = useState(false);
    const [showAddFloor, setShowAddFloor] = useState(false);
    const [newFloorName, setNewFloorName] = useState('');
    const [addingRoomFloor, setAddingRoomFloor] = useState(null);
    const [newRoomName, setNewRoomName]   = useState('');
    const [addingItemRoom, setAddingItemRoom]   = useState(null);
    const [newItemName, setNewItemName]   = useState('');
    const [tab, setTab] = useState('checklist');

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 680);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const fetchOrder = useCallback(async () => {
        const res  = await fetch(`/api/production/${id}`);
        const data = await res.json();
        setOrder(data);
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchOrder(); }, [fetchOrder]);

    async function toggleStep(itemId, stepKey, current) {
        setUpdatingId(itemId);
        setOrder(o => ({
            ...o,
            floors: o.floors.map(f => ({
                ...f,
                rooms: f.rooms.map(r => ({
                    ...r,
                    items: r.items.map(i => i.id === itemId ? { ...i, [stepKey]: !current } : i)
                }))
            }))
        }));
        await fetch(`/api/production/items/${itemId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [stepKey]: !current })
        });
        setUpdatingId(null);
    }

    async function deleteItem(itemId) {
        setOrder(o => ({
            ...o,
            floors: o.floors.map(f => ({
                ...f, rooms: f.rooms.map(r => ({ ...r, items: r.items.filter(i => i.id !== itemId) }))
            }))
        }));
        await fetch(`/api/production/items/${itemId}`, { method: 'DELETE' });
    }

    async function deleteRoom(roomId) {
        if (!confirm('Xoá phòng này? Tất cả sản phẩm sẽ bị xoá.')) return;
        await fetch(`/api/production/rooms/${roomId}`, { method: 'DELETE' });
        fetchOrder();
    }

    async function deleteFloor(floorId) {
        if (!confirm('Xoá tầng này? Tất cả phòng và sản phẩm sẽ bị xoá.')) return;
        await fetch(`/api/production/floors/${floorId}`, { method: 'DELETE' });
        fetchOrder();
    }

    async function addFloor() {
        if (!newFloorName.trim()) return;
        await fetch('/api/production/floors', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: id, name: newFloorName.trim(), sortOrder: order.floors.length })
        });
        setNewFloorName(''); setShowAddFloor(false); fetchOrder();
    }

    async function addRoom(floorId) {
        if (!newRoomName.trim()) return;
        const floor = order.floors.find(f => f.id === floorId);
        await fetch('/api/production/rooms', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ floorId, name: newRoomName.trim(), sortOrder: floor?.rooms?.length || 0 })
        });
        setNewRoomName(''); setAddingRoomFloor(null); fetchOrder();
    }

    async function addItem(roomId) {
        if (!newItemName.trim()) return;
        const room = order.floors.flatMap(f => f.rooms).find(r => r.id === roomId);
        await fetch('/api/production/items', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, name: newItemName.trim(), sortOrder: room?.items?.length || 0 })
        });
        setNewItemName(''); setAddingItemRoom(null); fetchOrder();
    }

    async function renameFloor(floorId, name) {
        await fetch(`/api/production/floors/${floorId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        fetchOrder();
    }

    async function renameRoom(roomId, name) {
        await fetch(`/api/production/rooms/${roomId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        fetchOrder();
    }

    async function renameItem(itemId, name) {
        await fetch(`/api/production/items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
        fetchOrder();
    }

    // ── render ─────────────────────────────────────────────────
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#6b7280', fontSize: 13 }}>Đang tải...</span>
        </div>
    );
    if (!order || order.error) return (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Không tìm thấy đơn sản xuất.</div>
    );

    // flat rows + filter
    const allRows = order.floors.flatMap(f => f.rooms.flatMap(r => r.items.map(item => ({ floor: f, room: r, item }))));
    const filtered = allRows.filter(({ floor, room, item }) => {
        if (filterFloor && floor.id !== filterFloor) return false;
        if (filterRoom  && room.id  !== filterRoom)  return false;
        if (filterStatus && getStatus(item) !== filterStatus) return false;
        return true;
    });

    // stats
    const allItems = order.floors.flatMap(f => f.rooms.flatMap(r => r.items));
    const total = allItems.length;
    const statCounts = {};
    STATUS_ALL.forEach(s => { statCounts[s] = 0; });
    allItems.forEach(i => { statCounts[getStatus(i)]++; });
    const totalDone = statCounts['Hoàn thành'];
    const overallPct = total ? Math.round((totalDone / total) * 100) : 0;

    const floorRooms = filterFloor
        ? (order.floors.find(f => f.id === filterFloor)?.rooms || [])
        : order.floors.flatMap(f => f.rooms);

    const hasFilter = filterFloor || filterRoom || filterStatus;
    const pad = isMobile ? '12px' : '20px';

    return (
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: isMobile ? '12px 10px 80px' : '20px' }}>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <button onClick={() => router.push('/production')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                    <ArrowLeft size={14} /> {isMobile ? '' : 'Danh sách'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Factory size={17} color="white" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{order.project.code}</div>
                        <h1 style={{ fontSize: isMobile ? 14 : 17, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.project.name}</h1>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: overallPct === 100 ? '#16a34a' : '#2563eb' }}>{overallPct}%</div>
                    <div style={{ width: 60, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct === 100 ? '#16a34a' : '#3b82f6', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{totalDone}/{total}</span>
                </div>
            </div>

            {/* ── Tab switcher ── */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                <button onClick={() => setTab('checklist')} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    background: tab === 'checklist' ? '#2563eb' : '#f3f4f6',
                    color: tab === 'checklist' ? 'white' : '#6b7280',
                }}>
                    <ListChecks size={14} /> Checklist sản phẩm
                </button>
                <button onClick={() => setTab('plan')} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600,
                    background: tab === 'plan' ? '#2563eb' : '#f3f4f6',
                    color: tab === 'plan' ? 'white' : '#6b7280',
                }}>
                    <GitBranch size={14} /> Kế hoạch BC sản xuất
                </button>
            </div>

            {tab === 'plan' && <ProductionPlanPanel projectId={order.project.id} />}

            {tab === 'checklist' && <>

            {/* ── Stats collapsible ── */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                <button onClick={() => setShowStats(v => !v)}
                    style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}><BarChart2 size={14} /> Thống kê tiến độ</span>
                    {showStats ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
                </button>
                {showStats && (
                    <div style={{ padding: '0 14px 14px' }}>
                        {/* Status counts */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                            {STATUS_ALL.map(s => (
                                <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                                    style={{ padding: '6px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: STATUS_STYLE[s].bg, color: STATUS_STYLE[s].color, fontWeight: 600, fontSize: 12, boxShadow: filterStatus === s ? `0 0 0 2px ${STATUS_STYLE[s].color}` : 'none' }}>
                                    {s} <strong>{statCounts[s]}</strong>
                                </button>
                            ))}
                        </div>
                        {/* Per-floor progress */}
                        {order.floors.map(floor => {
                            const fi = floor.rooms.flatMap(r => r.items);
                            return (
                                <div key={floor.id} style={{ marginBottom: 10 }}>
                                    <ProgressBar items={fi} label={floor.name} />
                                    {floor.rooms.map(room => (
                                        <div key={room.id} style={{ paddingLeft: 12 }}>
                                            <ProgressBar items={room.items} label={`└ ${room.name}`} />
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Filters collapsible ── */}
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                <button onClick={() => setShowFilters(v => !v)}
                    style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: hasFilter ? '#2563eb' : '#374151' }}>
                        <Filter size={13} /> Bộ lọc {hasFilter && <span style={{ background: '#2563eb', color: 'white', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>!</span>}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>{filtered.length}/{total} sp</span>
                        {showFilters ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
                    </span>
                </button>
                {showFilters && (
                    <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <select value={filterFloor} onChange={e => { setFilterFloor(e.target.value); setFilterRoom(''); }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: 'white' }}>
                            <option value="">Tất cả tầng</option>
                            {order.floors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: 'white' }}>
                            <option value="">Tất cả phòng</option>
                            {floorRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: 'white' }}>
                            <option value="">Tất cả trạng thái</option>
                            {STATUS_ALL.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {hasFilter && (
                            <button onClick={() => { setFilterFloor(''); setFilterRoom(''); setFilterStatus(''); }}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                                <X size={13} /> Xoá bộ lọc
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Content: mobile card / desktop table ── */}
            {isMobile ? (
                /* ── MOBILE: card list ── */
                <div>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: 13 }}>Không có sản phẩm phù hợp.</div>
                    ) : (
                        filtered.map(({ floor, room, item }) => (
                            <ItemCard key={item.id} item={item} floor={floor} room={room}
                                onToggle={toggleStep} onDelete={deleteItem} updatingId={updatingId} />
                        ))
                    )}
                </div>
            ) : (
                /* ── DESKTOP: table ── */
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Tầng</th>
                                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Phòng</th>
                                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', minWidth: 150 }}>Sản phẩm</th>
                                    {STEPS.map(s => (
                                        <th key={s.key} style={{ padding: '11px 10px', textAlign: 'center', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', minWidth: 90 }}>{s.label}</th>
                                    ))}
                                    <th style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Trạng thái</th>
                                    <th style={{ padding: '11px 8px', width: 32 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Không có sản phẩm phù hợp.</td></tr>
                                )}
                                {filtered.map(({ floor, room, item }, idx) => {
                                    const prev = idx > 0 ? filtered[idx - 1] : null;
                                    const sameFloor = prev?.floor.id === floor.id;
                                    const sameRoom  = sameFloor && prev?.room.id === room.id;
                                    const status = getStatus(item);
                                    return (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                            <td style={{ padding: '9px 14px', color: '#374151', fontWeight: 600, opacity: sameFloor ? 0 : 1, whiteSpace: 'nowrap' }}>{!sameFloor && floor.name}</td>
                                            <td style={{ padding: '9px 14px', color: '#6b7280', opacity: sameRoom ? 0 : 1, whiteSpace: 'nowrap' }}>{!sameRoom && room.name}</td>
                                            <td style={{ padding: '9px 14px', color: '#111827', fontWeight: 500 }}>
                                                <InlineEdit value={item.name} onSave={name => renameItem(item.id, name)} placeholder="Tên SP" />
                                            </td>
                                            {STEPS.map(s => (
                                                <td key={s.key} style={{ padding: '9px 10px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        <StepCheckbox checked={item[s.key]} onChange={() => toggleStep(item.id, s.key, item[s.key])} disabled={updatingId === item.id} />
                                                    </div>
                                                </td>
                                            ))}
                                            <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                                                <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap', background: STATUS_STYLE[status].bg, color: STATUS_STYLE[status].color }}>{status}</span>
                                            </td>
                                            <td style={{ padding: '9px 8px' }}>
                                                <button onClick={() => deleteItem(item.id)} style={{ padding: '3px 5px', border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer', borderRadius: 4 }}><Trash2 size={13} /></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Management section (collapsible) ── */}
            <div style={{ marginTop: 16 }}>
                <button onClick={() => setShowMgmt(v => !v)}
                    style={{ width: '100%', padding: '12px 14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showMgmt ? 12 : 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}><Edit3 size={14} /> Quản lý cấu trúc</span>
                    {showMgmt ? <ChevronUp size={14} color="#9ca3af" /> : <ChevronDown size={14} color="#9ca3af" />}
                </button>

                {showMgmt && (
                    <>
                        {order.floors.map(floor => (
                            <div key={floor.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                                <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                                        <InlineEdit value={floor.name} onSave={name => renameFloor(floor.id, name)} placeholder="Tên tầng" style={{ fontWeight: 700, fontSize: 14, color: '#111827' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => { setAddingRoomFloor(floor.id); setNewRoomName(''); }}
                                            style={{ padding: '4px 10px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                                            <Plus size={12} /> Phòng
                                        </button>
                                        <button onClick={() => deleteFloor(floor.id)}
                                            style={{ padding: '4px 8px', borderRadius: 6, background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                {addingRoomFloor === floor.id && (
                                    <div style={{ padding: '10px 14px', background: '#f0f9ff', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: 7 }}>
                                        <input autoFocus value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') addRoom(floor.id); if (e.key === 'Escape') setAddingRoomFloor(null); }}
                                            placeholder="Tên phòng..." style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid #7dd3fc', fontSize: 13 }} />
                                        <button onClick={() => addRoom(floor.id)} style={{ padding: '7px 14px', borderRadius: 7, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Thêm</button>
                                        <button onClick={() => setAddingRoomFloor(null)} style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>Huỷ</button>
                                    </div>
                                )}

                                {floor.rooms.map(room => (
                                    <div key={room.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <div style={{ padding: '8px 14px 8px 26px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#6b7280', flexShrink: 0 }} />
                                                <InlineEdit value={room.name} onSave={name => renameRoom(room.id, name)} placeholder="Tên phòng" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }} />
                                                <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>({room.items.length})</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                                <button onClick={() => { setAddingItemRoom(room.id); setNewItemName(''); }}
                                                    style={{ padding: '3px 8px', borderRadius: 5, background: '#f0fdf4', color: '#16a34a', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <Plus size={11} /> SP
                                                </button>
                                                <button onClick={() => deleteRoom(room.id)}
                                                    style={{ padding: '3px 6px', borderRadius: 5, background: '#fef2f2', color: '#dc2626', border: 'none', cursor: 'pointer' }}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        {addingItemRoom === room.id && (
                                            <div style={{ padding: '8px 14px 8px 36px', background: '#f0fdf4', display: 'flex', gap: 7 }}>
                                                <input autoFocus value={newItemName} onChange={e => setNewItemName(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') addItem(room.id); if (e.key === 'Escape') setAddingItemRoom(null); }}
                                                    placeholder="Tên sản phẩm..." style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #86efac', fontSize: 12 }} />
                                                <button onClick={() => addItem(room.id)} style={{ padding: '6px 12px', borderRadius: 6, background: '#16a34a', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Thêm</button>
                                                <button onClick={() => setAddingItemRoom(null)} style={{ padding: '6px 9px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>Huỷ</button>
                                            </div>
                                        )}

                                        {room.items.length > 0 && (
                                            <div style={{ padding: '6px 14px 6px 36px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                                {room.items.map(item => {
                                                    const st = getStatus(item);
                                                    return (
                                                        <span key={item.id} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: STATUS_STYLE[st].bg, color: STATUS_STYLE[st].color, fontWeight: 500 }}>
                                                            {item.name}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {floor.rooms.length === 0 && (
                                            <div style={{ padding: '12px 26px', fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Chưa có phòng nào.</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}

                        {showAddFloor ? (
                            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 7 }}>
                                <input autoFocus value={newFloorName} onChange={e => setNewFloorName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') addFloor(); if (e.key === 'Escape') { setShowAddFloor(false); setNewFloorName(''); } }}
                                    placeholder="Tên tầng (vd: Tầng 1...)" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #93c5fd', fontSize: 13 }} />
                                <button onClick={addFloor} style={{ padding: '9px 16px', borderRadius: 8, background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Thêm</button>
                                <button onClick={() => { setShowAddFloor(false); setNewFloorName(''); }} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>Huỷ</button>
                            </div>
                        ) : (
                            <button onClick={() => setShowAddFloor(true)}
                                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed #d1d5db', background: 'transparent', color: '#6b7280', cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                <Plus size={15} /> Thêm tầng
                            </button>
                        )}
                    </>
                )}
            </div>
            </>}
        </div>
    );
}
