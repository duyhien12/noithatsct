'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Plus, Trash2, ChevronRight, BarChart2, CheckCircle, Clock, Truck, Package, AlertCircle } from 'lucide-react';

function getItemStatus(item) {
    if (item.stepSiteInstall) return 'Hoàn thành';
    if (item.stepTransport) return 'Đã ra công trình';
    if (item.stepWorkshopAssembly) return 'Sẵn sàng vận chuyển';
    if (item.stepCNC || item.stepColdProcess) return 'Đang sản xuất';
    return 'Chưa làm';
}

function calcOrderStats(order) {
    const allItems = order.floors.flatMap(f => f.rooms.flatMap(r => r.items));
    const total = allItems.length;
    const counts = { 'Chưa làm': 0, 'Đang sản xuất': 0, 'Sẵn sàng vận chuyển': 0, 'Đã ra công trình': 0, 'Hoàn thành': 0 };
    allItems.forEach(i => counts[getItemStatus(i)]++);
    const done = counts['Hoàn thành'];
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, counts, pct };
}

const STATUS_STYLE = {
    'Chưa làm':             { color: '#6b7280', bg: '#f3f4f6' },
    'Đang sản xuất':        { color: '#d97706', bg: '#fef3c7' },
    'Sẵn sàng vận chuyển':  { color: '#2563eb', bg: '#dbeafe' },
    'Đã ra công trình':     { color: '#7c3aed', bg: '#ede9fe' },
    'Hoàn thành':           { color: '#16a34a', bg: '#dcfce7' },
};

export default function ProductionListPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showNewForm, setShowNewForm] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [oRes, pRes] = await Promise.all([
            fetch('/api/production'),
            fetch('/api/projects?limit=200'),
        ]);
        const [oData, pData] = await Promise.all([oRes.json(), pRes.json()]);
        setOrders(Array.isArray(oData) ? oData : []);
        setProjects(pData?.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const usedProjectIds = new Set(orders.map(o => o.projectId));
    const availableProjects = projects.filter(p => !usedProjectIds.has(p.id));

    async function handleCreate() {
        if (!selectedProjectId) return;
        setCreating(true);
        await fetch('/api/production', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: selectedProjectId })
        });
        setShowNewForm(false);
        setSelectedProjectId('');
        setCreating(false);
        fetchAll();
    }

    async function handleSeed() {
        if (!confirm('Tạo dữ liệu mẫu cho dự án đầu tiên chưa có đơn sản xuất?')) return;
        setSeeding(true);
        const res = await fetch('/api/production/seed', { method: 'POST' });
        const data = await res.json();
        setSeeding(false);
        if (data.error) { alert(data.error); return; }
        alert(`Đã tạo dữ liệu mẫu cho: ${data.projectName}`);
        fetchAll();
    }

    async function handleDelete(orderId, projectName) {
        if (!confirm(`Xoá đơn sản xuất của "${projectName}"? Tất cả dữ liệu tầng/phòng/sản phẩm sẽ bị xoá.`)) return;
        await fetch(`/api/production/${orderId}`, { method: 'DELETE' });
        fetchAll();
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: '#6b7280' }}>Đang tải...</span>
        </div>
    );

    return (
        <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Factory size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>Quản lý sản xuất đơn hàng</h1>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{orders.length} đơn sản xuất đang theo dõi</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleSeed}
                        disabled={seeding}
                        style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                    >
                        {seeding ? 'Đang tạo...' : '+ Dữ liệu mẫu'}
                    </button>
                    <button
                        onClick={() => setShowNewForm(true)}
                        style={{ padding: '8px 14px', borderRadius: 8, background: '#2563eb', color: 'white', fontSize: 13, border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                        <Plus size={15} /> Thêm đơn sản xuất
                    </button>
                </div>
            </div>

            {/* New order form */}
            {showNewForm && (
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 20, marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#0c4a6e' }}>Tạo đơn sản xuất mới</h3>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <select
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                            style={{ flex: 1, minWidth: 240, padding: '8px 12px', borderRadius: 8, border: '1px solid #7dd3fc', fontSize: 13, background: 'white' }}
                        >
                            <option value="">-- Chọn dự án --</option>
                            {availableProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleCreate}
                            disabled={!selectedProjectId || creating}
                            style={{ padding: '8px 18px', borderRadius: 8, background: selectedProjectId ? '#2563eb' : '#93c5fd', color: 'white', border: 'none', cursor: selectedProjectId ? 'pointer' : 'default', fontWeight: 600, fontSize: 13 }}
                        >
                            {creating ? 'Đang tạo...' : 'Tạo'}
                        </button>
                        <button
                            onClick={() => { setShowNewForm(false); setSelectedProjectId(''); }}
                            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer' }}
                        >
                            Huỷ
                        </button>
                    </div>
                    {availableProjects.length === 0 && (
                        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>Tất cả dự án đã có đơn sản xuất.</p>
                    )}
                </div>
            )}

            {/* Orders grid */}
            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                    <Factory size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ fontSize: 15, marginBottom: 4 }}>Chưa có đơn sản xuất nào</p>
                    <p style={{ fontSize: 13 }}>Nhấn "+ Dữ liệu mẫu" để tạo demo, hoặc "+ Thêm đơn sản xuất" để bắt đầu.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {orders.map(order => {
                        const { total, counts, pct } = calcOrderStats(order);
                        return (
                            <div key={order.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                {/* Card header */}
                                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 2 }}>{order.project.code}</div>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{order.project.name}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(order.id, order.project.name)}
                                            style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    {/* Progress bar */}
                                    <div style={{ marginTop: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, color: '#6b7280' }}>{total} sản phẩm</span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#16a34a' : '#2563eb' }}>{pct}%</span>
                                        </div>
                                        <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#3b82f6', borderRadius: 3, transition: 'width 0.4s' }} />
                                        </div>
                                    </div>
                                </div>
                                {/* Status breakdown */}
                                <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {Object.entries(counts).filter(([, v]) => v > 0).map(([status, count]) => (
                                        <span key={status} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: STATUS_STYLE[status]?.bg, color: STATUS_STYLE[status]?.color }}>
                                            {status}: {count}
                                        </span>
                                    ))}
                                </div>
                                {/* Floor summary */}
                                <div style={{ padding: '6px 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {order.floors.map(f => (
                                        <span key={f.id} style={{ fontSize: 11, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 7px' }}>{f.name}</span>
                                    ))}
                                </div>
                                {/* Action */}
                                <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6' }}>
                                    <button
                                        onClick={() => router.push(`/production/${order.id}`)}
                                        style={{ width: '100%', padding: '9px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                    >
                                        Quản lý sản xuất <ChevronRight size={15} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
