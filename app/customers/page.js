'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtShort = (n) => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + ' tr';
    return fmt(n);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

const PIPELINE = [
    { key: 'Tư vấn', label: 'Khách chăm sóc', color: '#3b82f6', bg: '#dbeafe' },
    { key: 'Báo giá', label: 'Khách ưu tiên', color: '#8b5cf6', bg: '#ede9fe' },
    { key: 'Thi công', label: 'Khách hợp đồng', color: '#f97316', bg: '#ffedd5' },
    { key: 'Khách huỷ', label: 'Khách huỷ', color: '#6b7280', bg: '#f3f4f6' },
];

const SOURCES = ['Facebook', 'Zalo', 'Website', 'Instagram', 'Giới thiệu', 'Đối tác'];

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [customersXD, setCustomersXD] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [view, setView] = useState('kanban');
    const [showModal, setShowModal] = useState(false);
    const [showXDBoard, setShowXDBoard] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', type: 'Cá nhân', pipelineStage: 'Khách nội thất', taxCode: '', representative: '', source: '', notes: '', gender: 'Nam', birthday: '', salesPerson: '', designer: '', projectAddress: '', projectName: '', contactPerson2: '', phone2: '', estimatedValue: 0 });
    const [dragId, setDragId] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const isDragging = useRef(false);
    const router = useRouter();
    const { role } = useRole();

    const visiblePipeline = PIPELINE;

    const fetchCustomers = async () => {
        setLoading(true);
        const [r1, r2] = await Promise.all([
            fetch('/api/customers?dept=kinh_doanh&limit=1000'),
            fetch('/api/customers?dept=xay_dung&limit=1000'),
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        setCustomers(d1.data || []);
        setCustomersXD(d2.data || []);
        setLoading(false);
    };
    useEffect(() => { fetchCustomers(); }, []);

    const applyFilter = (list) => list.filter(c => {
        if (filterSource && c.source !== filterSource) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.code || '').toLowerCase().includes(search.toLowerCase()) && !(c.phone || '').includes(search)) return false;
        return true;
    });

    const filtered = applyFilter(customers);
    const filteredXD = applyFilter(customersXD);

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('Vui lòng nhập tên khách hàng');
        if (!form.phone.trim()) return alert('Vui lòng nhập số điện thoại');
        const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: 'Khách hàng' }) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo khách hàng'); }
        setShowModal(false);
        setForm({ name: '', phone: '', email: '', address: '', type: 'Cá nhân', pipelineStage: 'Khách nội thất', taxCode: '', representative: '', source: '', notes: '', gender: 'Nam', birthday: '', salesPerson: '', designer: '', projectAddress: '', projectName: '', contactPerson2: '', phone2: '', estimatedValue: 0 });
        fetchCustomers();
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa khách hàng này?')) return;
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (!res.ok) { const err = await res.json().catch(() => ({})); return alert(err.error || 'Lỗi xóa khách hàng'); }
        fetchCustomers();
    };

    const moveTo = async (id, stage) => {
        await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pipelineStage: stage, status: 'Khách hàng' }) });
        fetchCustomers();
    };

    const moveToDept = async (id, stage, dept) => {
        await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pipelineStage: stage, status: 'Khách hàng', createdByRole: dept }) });
        fetchCustomers();
    };

    const onDragStart = (e, id) => { isDragging.current = true; setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };
    const onDragEnd = () => { setTimeout(() => { isDragging.current = false; }, 100); setDragId(null); setDragOver(null); };
    const onDragOver = (e, stageKey) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(stageKey); };
    const onDragLeave = () => { setDragOver(null); };
    const onDrop = (e, stage) => { e.preventDefault(); setDragOver(null); const droppedId = e.dataTransfer.getData('text/plain') || dragId; if (droppedId) { moveTo(droppedId, stage); setDragId(null); } };

    const allCustomers = [...customers, ...customersXD];
    const stats = {
        total: allCustomers.length,
        leads: allCustomers.filter(c => c.pipelineStage === 'Tư vấn').length,
        active: allCustomers.filter(c => ['Tư vấn', 'Báo giá', 'Thi công'].includes(c.pipelineStage)).length,
        totalValue: allCustomers.reduce((s, c) => s + (c.estimatedValue || 0), 0),
        revenue: allCustomers.reduce((s, c) => s + (c.totalRevenue || 0), 0),
    };

    return (
        <div>
            {/* Stats - auto-fit responsive grid */}
            <div className="stats-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card"><div className="stat-icon">👥</div><div><div className="stat-value">{stats.total}</div><div className="stat-label">Tổng KH</div></div></div>
                <div className="stat-card"><div className="stat-icon">🎯</div><div><div className="stat-value">{stats.leads}</div><div className="stat-label">Tiềm năng</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔥</div><div><div className="stat-value">{stats.active}</div><div className="stat-label">Đang xử lý</div></div></div>
                <div className="stat-card"><div className="stat-icon">💎</div><div><div className="stat-value">{fmtShort(stats.totalValue)}</div><div className="stat-label">Giá trị deal</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmtShort(stats.revenue)}</div><div className="stat-label">Doanh thu</div></div></div>
            </div>

            {/* Toolbar */}
            <div className="card" style={{ marginBottom: 16, padding: '10px 14px' }}>
                <div className="toolbar-mobile">
                    {/* Row 1: Search + filters */}
                    <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                        <input type="text" className="form-input" placeholder="🔍 Tìm tên, mã, SĐT..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                        <select className="form-select" value={filterSource} onChange={e => setFilterSource(e.target.value)} style={{ minWidth: 0, flex: '0 0 auto', width: 'auto' }}>
                            <option value="">Tất cả nguồn</option>
                            {SOURCES.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    {/* Row 2: View toggle (desktop only) + Add button */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div className="desktop-table-view" style={{ background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                            <button onClick={() => setView('kanban')} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: view === 'kanban' ? 'var(--primary)' : 'transparent', color: view === 'kanban' ? '#fff' : 'var(--text-secondary)', transition: 'all .15s', minHeight: 36 }}>📋 Kanban</button>
                            <button onClick={() => setView('table')} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', background: view === 'table' ? 'var(--primary)' : 'transparent', color: view === 'table' ? '#fff' : 'var(--text-secondary)', transition: 'all .15s', minHeight: 36 }}>📊 Bảng</button>
                        </div>
                        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ whiteSpace: 'nowrap' }}>+ Thêm KH</button>
                    </div>
                </div>
            </div>

            {loading ? <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (<>
                {/* ========= KANBAN VIEW - desktop only ========= */}
                {view === 'kanban' && (<>
                {/* --- Bảng Phòng Xây Dựng (ẩn mặc định) --- */}
                <div className="desktop-table-view" style={{ marginBottom: 8 }}>
                    <button
                        onClick={() => setShowXDBoard(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: '100%' }}>
                        <span style={{ transition: 'transform .2s', display: 'inline-block', transform: showXDBoard ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                        🏗️ Khách hàng Phòng Xây Dựng
                        <span style={{ background: '#e8f4fd', color: '#2980b9', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8 }}>{filteredXD.length}</span>
                    </button>
                    {showXDBoard && (
                    <div style={{ display: 'flex', flexDirection: 'row', gap: 6, paddingTop: 10, paddingBottom: 12, minHeight: 200, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        {PIPELINE.filter(p => p.key !== 'Khách nội thất').map(stage => {
                            const cards = filteredXD.filter(c => (c.pipelineStage || 'Tư vấn') === stage.key);
                            const stageValue = cards.reduce((s, c) => s + (c.estimatedValue || 0), 0);
                            const isOverXD = dragOver === ('xd_' + stage.key);
                            return (
                                <div key={stage.key}
                                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver('xd_' + stage.key); }}
                                    onDragLeave={onDragLeave}
                                    onDrop={e => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) { moveToDept(id, stage.key, 'xay_dung'); setDragId(null); } }}
                                    style={{ flex: '1 0 0', minWidth: 180, display: 'flex', flexDirection: 'column', background: isOverXD ? stage.bg : 'var(--bg-secondary)', borderRadius: 10, border: isOverXD ? `2px dashed ${stage.color}` : '1px solid var(--border-light)', transition: 'all .2s' }}>
                                    <div style={{ padding: '10px 10px 6px', borderBottom: '2px solid ' + stage.color }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                                            <span style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{stage.label}</span>
                                            <span style={{ background: stage.bg, color: stage.color, fontSize: 10, fontWeight: 700, padding: '0 6px', borderRadius: 8 }}>{cards.length}</span>
                                        </div>
                                        {stageValue > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fmtShort(stageValue)}</div>}
                                    </div>
                                    <div style={{ flex: 1, padding: 6, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {cards.map(c => (
                                            <div key={c.id}
                                                draggable
                                                onDragStart={e => onDragStart(e, c.id)}
                                                onDragEnd={onDragEnd}
                                                onClick={() => { if (!isDragging.current) router.push(`/customers/${c.id}`); }}
                                                style={{ background: dragId === c.id ? stage.bg : 'var(--bg-card)', borderRadius: 8, padding: '8px 10px', cursor: 'grab', border: '1px solid var(--border-light)', boxShadow: '0 1px 2px rgba(0,0,0,.05)', transition: 'all .15s', opacity: dragId === c.id ? 0.5 : 1, WebkitTapHighlightColor: 'transparent' }}>
                                                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone && <div>📱 {c.phone}</div>}</div>
                                                {(c.estimatedValue > 0 || c.projects?.length > 0) && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border-light)', fontSize: 10 }}>
                                                    {c.estimatedValue > 0 ? <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmtShort(c.estimatedValue)}</span> : <span />}
                                                    {c.projects?.length > 0 && <span style={{ background: 'var(--bg-primary)', padding: '0 4px', borderRadius: 4 }}>🏗️{c.projects.length}</span>}
                                                </div>}
                                            </div>
                                        ))}
                                        {cards.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 16, opacity: 0.5 }}>Kéo thả vào đây</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    )}
                </div>

                {/* --- Bảng Phòng Kinh Doanh --- */}
                <div className="desktop-table-view" style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)' }}>💼 Khách hàng Phòng Kinh Doanh</span>
                        <span style={{ background: '#fde8d0', color: '#e67e22', fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 8 }}>{filtered.length}</span>
                    </div>
                </div>
                <div className="desktop-table-view kanban-board" style={{ gap: 6, paddingBottom: 20, minHeight: 400, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {visiblePipeline.map(stage => {
                        const cards = filtered.filter(c => (c.pipelineStage || c.status || 'Khách nội thất') === stage.key);
                        const stageValue = cards.reduce((s, c) => s + (c.estimatedValue || 0), 0);
                        const isOver = dragOver === stage.key;
                        return (
                            <div key={stage.key}
                                className="kanban-column"
                                onDragOver={e => onDragOver(e, stage.key)}
                                onDragLeave={onDragLeave}
                                onDrop={e => { e.preventDefault(); setDragOver(null); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) { moveToDept(id, stage.key, 'kinh_doanh'); setDragId(null); } }}
                                style={{ flex: '1 0 0', minWidth: 0, display: 'flex', flexDirection: 'column', background: isOver ? stage.bg : 'var(--bg-secondary)', borderRadius: 10, border: isOver ? `2px dashed ${stage.color}` : '1px solid var(--border-light)', transition: 'all .2s' }}>
                                <div style={{ padding: '10px 10px 6px', borderBottom: '2px solid ' + stage.color }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                                        <span style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stage.label}</span>
                                        <span style={{ background: stage.bg, color: stage.color, fontSize: 10, fontWeight: 700, padding: '0 6px', borderRadius: 8, flexShrink: 0 }}>{cards.length}</span>
                                    </div>
                                    {stageValue > 0 && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtShort(stageValue)}</div>}
                                </div>
                                <div style={{ flex: 1, padding: 6, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {cards.map(c => (
                                        <div key={c.id}
                                            draggable
                                            onDragStart={e => onDragStart(e, c.id)}
                                            onDragEnd={onDragEnd}
                                            onClick={() => { if (!isDragging.current) router.push(`/customers/${c.id}`); }}
                                            style={{ background: dragId === c.id ? stage.bg : 'var(--bg-card)', borderRadius: 8, padding: '8px 10px', cursor: 'grab', border: '1px solid var(--border-light)', boxShadow: '0 1px 2px rgba(0,0,0,.05)', transition: 'all .15s', opacity: dragId === c.id ? 0.5 : 1, WebkitTapHighlightColor: 'transparent' }}>
                                            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {c.phone && <div>📱 {c.phone}</div>}
                                            </div>
                                            {(c.estimatedValue > 0 || c.projects?.length > 0) && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border-light)', fontSize: 10 }}>
                                                {c.estimatedValue > 0 ? <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmtShort(c.estimatedValue)}</span> : <span />}
                                                {c.projects?.length > 0 && <span style={{ background: 'var(--bg-primary)', padding: '0 4px', borderRadius: 4 }}>🏗️{c.projects.length}</span>}
                                            </div>}
                                        </div>
                                    ))}
                                    {cards.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: 16, opacity: 0.5 }}>Kéo thả vào đây</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
                </>)}

                {/* ========= TABLE VIEW (Desktop when selected) + Card list (Mobile always) ========= */}
                <div className="card" style={view === 'kanban' ? {} : {}}>
                    {/* Desktop table - only when table view selected */}
                    {view === 'table' && (
                    <div className="desktop-table-view">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã</th><th>Tên KH</th><th>SĐT</th><th>Giai đoạn KD</th><th>Nguồn</th><th>Giá trị deal</th><th>Doanh thu</th><th>DA</th><th></th></tr></thead>
                            <tbody>{filtered.map(c => {
                                const stage = PIPELINE.find(p => p.key === (c.pipelineStage || 'Khách nội thất')) || PIPELINE[0];
                                return (
                                    <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} style={{ cursor: 'pointer' }}>
                                        <td className="accent">{c.code}</td>
                                        <td className="primary">{c.name}</td>
                                        <td>{c.phone}</td>
                                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 12, background: stage.bg, color: stage.color }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color }} />{stage.label}</span></td>
                                        <td style={{ fontSize: 12 }}>{c.source || '-'}</td>
                                        <td style={{ fontWeight: 600 }}>{c.estimatedValue > 0 ? fmtShort(c.estimatedValue) : '-'}</td>
                                        <td style={{ fontWeight: 600 }}>{c.totalRevenue > 0 ? fmtShort(c.totalRevenue) : '-'}</td>
                                        <td>{c.projects?.length || 0}</td>
                                        <td><button className="btn btn-ghost" onClick={e => { e.stopPropagation(); handleDelete(c.id); }}>🗑️</button></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table></div>
                    </div>
                    )}

                    {/* Mobile card list - always rendered, CSS shows only on mobile */}
                    <div className="mobile-card-list">
                        {filtered.map(c => {
                            const stage = PIPELINE.find(p => p.key === (c.pipelineStage || 'Khách nội thất')) || PIPELINE[0];
                            return (
                                <div key={c.id} className="mobile-card-item" onClick={() => router.push(`/customers/${c.id}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                            <div className="card-subtitle">{c.code} · {c.phone}</div>
                                        </div>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: stage.bg, color: stage.color, flexShrink: 0 }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: stage.color }} />{stage.label}
                                        </span>
                                    </div>
                                    {(c.estimatedValue > 0 || c.totalRevenue > 0 || c.source) && (
                                        <div className="card-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-light)', fontSize: 12 }}>
                                            {c.source && <span style={{ color: 'var(--text-muted)' }}>{c.source}</span>}
                                            <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                                                {c.estimatedValue > 0 && <span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{fmtShort(c.estimatedValue)}</span>}
                                                {c.totalRevenue > 0 && <span style={{ fontWeight: 600, color: 'var(--status-success)' }}>{fmtShort(c.totalRevenue)}</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {filtered.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Không có dữ liệu</div>}
                </div>
            </>)}

            {/* Modal thêm KH */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>➕ Thêm khách hàng mới</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>

                            {/* Section 1: Thông tin cơ bản */}
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    👤 Thông tin cơ bản
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'none' }}>Tên khách hàng *</label>
                                        <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" style={{ textTransform: 'none' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Số điện thoại *</label>
                                        <input className="form-input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0901 234 567" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Email</label>
                                        <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Giới tính</label>
                                        <select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                            <option>Nam</option><option>Nữ</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Loại khách hàng</label>
                                        <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                            <option>Cá nhân</option><option>Doanh nghiệp</option>
                                        </select>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Địa chỉ</label>
                                        <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: CRM */}
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    🎯 Thông tin CRM
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Giai đoạn KD</label>
                                        <select className="form-select" value={form.pipelineStage} onChange={e => setForm({ ...form, pipelineStage: e.target.value })}>
                                            {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Nguồn khách</label>
                                        <select className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                            <option value="">— Chọn nguồn —</option>
                                            {SOURCES.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Giá trị deal dự kiến</label>
                                        <input className="form-input" type="number" inputMode="numeric" value={form.estimatedValue || ''} onChange={e => setForm({ ...form, estimatedValue: parseFloat(e.target.value) || 0 })} placeholder="0 đ" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Mã số thuế</label>
                                        <input className="form-input" value={form.taxCode} onChange={e => setForm({ ...form, taxCode: e.target.value })} placeholder="MST (nếu có)" />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Người đại diện</label>
                                        <input className="form-input" value={form.representative} onChange={e => setForm({ ...form, representative: e.target.value })} placeholder="Tên người đại diện (nếu là doanh nghiệp)" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Dự án */}
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 12 }}>🏠 Thông tin dự án</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>NV kinh doanh</label>
                                        <input className="form-input" value={form.salesPerson} onChange={e => setForm({ ...form, salesPerson: e.target.value })} placeholder="Tên nhân viên KD" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>NV thiết kế</label>
                                        <input className="form-input" value={form.designer} onChange={e => setForm({ ...form, designer: e.target.value })} placeholder="Tên nhân viên TK" />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Tên dự án</label>
                                        <input className="form-input" value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} placeholder="VD: Biệt thự anh Minh, Q.7" />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Địa chỉ dự án</label>
                                        <input className="form-input" value={form.projectAddress} onChange={e => setForm({ ...form, projectAddress: e.target.value })} placeholder="Địa chỉ công trình" />
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Liên hệ phụ + Ghi chú */}
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 12 }}>📞 Liên hệ phụ & Ghi chú</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Người liên hệ 2</label>
                                        <input className="form-input" value={form.contactPerson2} onChange={e => setForm({ ...form, contactPerson2: e.target.value })} placeholder="Họ tên" />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>SĐT 2</label>
                                        <input className="form-input" type="tel" value={form.phone2} onChange={e => setForm({ ...form, phone2: e.target.value })} placeholder="0901 234 567" />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Ghi chú</label>
                                        <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Ghi chú thêm về khách hàng..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>💾 Lưu khách hàng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
