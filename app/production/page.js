'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, Plus, Trash2, ChevronRight, Search, X } from 'lucide-react';

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
    let overallStatus = 'Chưa làm';
    if (pct === 100 && total > 0) overallStatus = 'Hoàn thành';
    else if (counts['Đã ra công trình'] > 0 || counts['Sẵn sàng vận chuyển'] > 0) overallStatus = 'Sẵn sàng vận chuyển';
    else if (counts['Đang sản xuất'] > 0) overallStatus = 'Đang sản xuất';
    return { total, counts, pct, overallStatus };
}

const STATUS_STYLE = {
    'Chưa làm':             { color: '#6b7280', bg: '#f3f4f6' },
    'Đang sản xuất':        { color: '#d97706', bg: '#fef3c7' },
    'Sẵn sàng vận chuyển':  { color: '#2563eb', bg: '#dbeafe' },
    'Đã ra công trình':     { color: '#7c3aed', bg: '#ede9fe' },
    'Hoàn thành':           { color: '#16a34a', bg: '#dcfce7' },
};

const STATUS_FILTERS = ['Chưa làm', 'Đang sản xuất', 'Sẵn sàng vận chuyển', 'Hoàn thành'];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

function OrdersTable({ orders, router, handleDelete }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [overdueOnly, setOverdueOnly] = useState(false);

    const rows = useMemo(() => {
        return orders
            .map(order => ({ order, stats: calcOrderStats(order) }))
            .filter(({ order, stats }) => {
                if (search) {
                    const q = search.trim().toLowerCase();
                    const hay = `${order.project.code} ${order.project.name}`.toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                if (statusFilter && stats.overallStatus !== statusFilter) return false;
                if (overdueOnly && !order.nearestDeadline?.overdue) return false;
                return true;
            });
    }, [orders, search, statusFilter, overdueOnly]);

    const hasFilter = search || statusFilter || overdueOnly;

    return (
        <>
            {/* Filters */}
            {orders.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                        <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm theo mã hoặc tên nhà..."
                            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: 'white' }}
                    >
                        <option value="">Tất cả trạng thái</option>
                        {STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: overdueOnly ? '#fef2f2' : 'white' }}>
                        <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
                        Chỉ deadline quá hạn
                    </label>
                    {hasFilter && (
                        <button onClick={() => { setSearch(''); setStatusFilter(''); setOverdueOnly(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer' }}>
                            <X size={13} /> Xoá lọc
                        </button>
                    )}
                </div>
            )}

            {/* Orders table */}
            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                    <Factory size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p style={{ fontSize: 15, marginBottom: 4 }}>Chưa có đơn sản xuất nào</p>
                    <p style={{ fontSize: 13 }}>Nhấn &quot;+ Dữ liệu mẫu&quot; để tạo demo, hoặc &quot;+ Thêm đơn sản xuất&quot; để bắt đầu.</p>
                </div>
            ) : (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Mã</th>
                                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', minWidth: 180 }}>Tên nhà</th>
                                    <th style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>SP</th>
                                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', minWidth: 140 }}>Tiến độ</th>
                                    <th style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Trạng thái</th>
                                    <th style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Số tầng</th>
                                    <th style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Deadline gần nhất</th>
                                    <th style={{ padding: '11px 8px', width: 80 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.length === 0 && (
                                    <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Không có đơn sản xuất phù hợp.</td></tr>
                                )}
                                {rows.map(({ order, stats }) => (
                                    <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                        <td style={{ padding: '10px 14px', color: '#6b7280', fontWeight: 500, whiteSpace: 'nowrap' }}>{order.project.code}</td>
                                        <td style={{ padding: '10px 14px', color: '#111827', fontWeight: 600 }}>{order.project.name}</td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#374151' }}>{stats.total}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                                                    <div style={{ height: '100%', width: `${stats.pct}%`, background: stats.pct === 100 ? '#16a34a' : '#3b82f6', borderRadius: 3 }} />
                                                </div>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: stats.pct === 100 ? '#16a34a' : '#2563eb', flexShrink: 0 }}>{stats.pct}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap', background: STATUS_STYLE[stats.overallStatus]?.bg, color: STATUS_STYLE[stats.overallStatus]?.color }}>
                                                {stats.overallStatus}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#374151' }}>{order.floors.length}</td>
                                        <td style={{ padding: '10px 14px' }}>
                                            {order.nearestDeadline ? (
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: order.nearestDeadline.overdue ? '#dc2626' : '#b45309' }}>
                                                        {order.nearestDeadline.overdue ? 'Quá hạn' : fmtDate(order.nearestDeadline.deadline)}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                                        {order.nearestDeadline.stepName}
                                                    </div>
                                                </div>
                                            ) : <span style={{ color: '#d1d5db' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                                <button onClick={() => router.push(`/production/${order.id}`)}
                                                    style={{ padding: '5px 10px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                                                    Xem <ChevronRight size={13} />
                                                </button>
                                                <button onClick={() => handleDelete(order.id, order.project.name)}
                                                    style={{ padding: '5px 6px', borderRadius: 6, border: 'none', background: 'transparent', color: '#d1d5db', cursor: 'pointer' }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

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
        <div style={{ padding: '24px', maxWidth: 1300, margin: '0 auto' }}>
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

            <OrdersTable orders={orders} router={router} handleDelete={handleDelete} />
        </div>
    );
}
