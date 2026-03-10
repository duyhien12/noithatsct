'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtShort = (n) => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
    if (n >= 1e6) return (n / 1e6).toFixed(0) + ' tr';
    return fmt(n);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

const PIPELINE = [
    { key: 'Lead', label: 'Lead', color: '#94a3b8', bg: '#f1f5f9' },
    { key: 'Prospect', label: 'Prospect', color: '#f59e0b', bg: '#fef3c7' },
    { key: 'Tư vấn', label: 'Tư vấn', color: '#3b82f6', bg: '#dbeafe' },
    { key: 'Báo giá', label: 'Báo giá', color: '#8b5cf6', bg: '#ede9fe' },
    { key: 'Ký HĐ', label: 'Ký HĐ', color: '#10b981', bg: '#d1fae5' },
    { key: 'Thi công', label: 'Thi công', color: '#f97316', bg: '#ffedd5' },
    { key: 'VIP', label: 'VIP', color: '#ec4899', bg: '#fce7f3' },
];

const SOURCES = ['Facebook', 'Zalo', 'Website', 'Instagram', 'Giới thiệu', 'Đối tác'];

export default function CustomersPage() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [view, setView] = useState('kanban');
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', type: 'Cá nhân', pipelineStage: 'Lead', taxCode: '', representative: '', source: '', notes: '', gender: 'Nam', birthday: '', salesPerson: '', designer: '', projectAddress: '', projectName: '', contactPerson2: '', phone2: '', estimatedValue: 0 });
    const [dragId, setDragId] = useState(null);
    const [dragOver, setDragOver] = useState(null);
    const isDragging = useRef(false);
    const router = useRouter();

    const fetchCustomers = async () => { setLoading(true); const r = await fetch('/api/customers?limit=1000'); const d = await r.json(); setCustomers(d.data || []); setLoading(false); };
    useEffect(() => { fetchCustomers(); }, []);

    const filtered = customers.filter(c => {
        if (filterSource && c.source !== filterSource) return false;
        if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !(c.code || '').toLowerCase().includes(search.toLowerCase()) && !(c.phone || '').includes(search)) return false;
        return true;
    });

    const handleSubmit = async () => {
        if (!form.name.trim()) return alert('Vui lòng nhập tên khách hàng');
        if (!form.phone.trim()) return alert('Vui lòng nhập số điện thoại');
        const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: form.pipelineStage === 'VIP' ? 'VIP' : form.pipelineStage === 'Lead' ? 'Lead' : form.pipelineStage === 'Prospect' ? 'Prospect' : 'Khách hàng' }) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo khách hàng'); }
        setShowModal(false);
        setForm({ name: '', phone: '', email: '', address: '', type: 'Cá nhân', pipelineStage: 'Lead', taxCode: '', representative: '', source: '', notes: '', gender: 'Nam', birthday: '', salesPerson: '', designer: '', projectAddress: '', projectName: '', contactPerson2: '', phone2: '', estimatedValue: 0 });
        fetchCustomers();
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa khách hàng này?')) return;
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (!res.ok) { const err = await res.json().catch(() => ({})); return alert(err.error || 'Lỗi xóa khách hàng'); }
        fetchCustomers();
    };

    const moveTo = async (id, stage) => {
        const status = stage === 'VIP' ? 'VIP' : stage === 'Lead' ? 'Lead' : stage === 'Prospect' ? 'Prospect' : 'Khách hàng';
        await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pipelineStage: stage, status }) });
        fetchCustomers();
    };

    const onDragStart = (e, id) => { isDragging.current = true; setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); };
    const onDragEnd = () => { setTimeout(() => { isDragging.current = false; }, 100); setDragId(null); setDragOver(null); };
    const onDragOver = (e, stageKey) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(stageKey); };
    const onDragLeave = () => { setDragOver(null); };
    const onDrop = (e, stage) => { e.preventDefault(); setDragOver(null); const droppedId = e.dataTransfer.getData('text/plain') || dragId; if (droppedId) { moveTo(droppedId, stage); setDragId(null); } };

    const stats = {
        total: customers.length,
        leads: customers.filter(c => c.pipelineStage === 'Lead' || c.pipelineStage === 'Prospect').length,
        active: customers.filter(c => ['Tư vấn', 'Báo giá', 'Ký HĐ', 'Thi công'].includes(c.pipelineStage)).length,
        vip: customers.filter(c => c.pipelineStage === 'VIP').length,
        totalValue: customers.reduce((s, c) => s + (c.estimatedValue || 0), 0),
        revenue: customers.reduce((s, c) => s + (c.totalRevenue || 0), 0),
    };

    return (
        <div>
            {/* Stats - auto-fit responsive grid */}
            <div className="stats-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card"><div className="stat-icon">👥</div><div><div className="stat-value">{stats.total}</div><div className="stat-label">Tổng KH</div></div></div>
                <div className="stat-card"><div className="stat-icon">🎯</div><div><div className="stat-value">{stats.leads}</div><div className="stat-label">Tiềm năng</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔥</div><div><div className="stat-value">{stats.active}</div><div className="stat-label">Đang xử lý</div></div></div>
                <div className="stat-card"><div className="stat-icon">⭐</div><div><div className="stat-value">{stats.vip}</div><div className="stat-label">VIP</div></div></div>
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
                {view === 'kanban' && (
                <div className="desktop-table-view kanban-board" style={{ gap: 6, paddingBottom: 20, minHeight: 400, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {PIPELINE.map(stage => {
                        const cards = filtered.filter(c => (c.pipelineStage || c.status || 'Lead') === stage.key);
                        const stageValue = cards.reduce((s, c) => s + (c.estimatedValue || 0), 0);
                        const isOver = dragOver === stage.key;
                        return (
                            <div key={stage.key}
                                className="kanban-column"
                                onDragOver={e => onDragOver(e, stage.key)}
                                onDragLeave={onDragLeave}
                                onDrop={e => onDrop(e, stage.key)}
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
                )}

                {/* ========= TABLE VIEW (Desktop when selected) + Card list (Mobile always) ========= */}
                <div className="card" style={view === 'kanban' ? {} : {}}>
                    {/* Desktop table - only when table view selected */}
                    {view === 'table' && (
                    <div className="desktop-table-view">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã</th><th>Tên KH</th><th>SĐT</th><th>Pipeline</th><th>Nguồn</th><th>Giá trị deal</th><th>Doanh thu</th><th>DA</th><th></th></tr></thead>
                            <tbody>{filtered.map(c => {
                                const stage = PIPELINE.find(p => p.key === (c.pipelineStage || 'Lead')) || PIPELINE[0];
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
                            const stage = PIPELINE.find(p => p.key === (c.pipelineStage || 'Lead')) || PIPELINE[0];
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

            {/* Modal thêm KH - uses CSS classes for mobile full-screen */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Thêm khách hàng mới</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="modal-body">
                            <h4 style={{ color: 'var(--text-accent)', fontSize: 13, marginBottom: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>👤 Thông tin cơ bản</h4>
                            <div className="form-group"><label className="form-label">Tên khách hàng *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">SĐT *</label><input className="form-input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Giới tính</label><select className="form-select" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option>Nam</option><option>Nữ</option></select></div>
                                <div className="form-group"><label className="form-label">Loại</label><select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option>Cá nhân</option><option>Doanh nghiệp</option></select></div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Pipeline</label>
                                    <select className="form-select" value={form.pipelineStage} onChange={e => setForm({ ...form, pipelineStage: e.target.value })}>
                                        {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Nguồn</label>
                                    <select className="form-select" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                        <option value="">Chọn...</option>
                                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Giá trị deal dự kiến</label><input className="form-input" type="number" inputMode="numeric" value={form.estimatedValue || ''} onChange={e => setForm({ ...form, estimatedValue: parseFloat(e.target.value) || 0 })} placeholder="VND" /></div>
                                <div className="form-group"><label className="form-label">MST</label><input className="form-input" value={form.taxCode} onChange={e => setForm({ ...form, taxCode: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Người đại diện</label><input className="form-input" value={form.representative} onChange={e => setForm({ ...form, representative: e.target.value })} /></div>

                            <h4 style={{ color: 'var(--text-accent)', fontSize: 13, margin: '20px 0 12px', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>🏠 Thông tin dự án</h4>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">NV kinh doanh</label><input className="form-input" value={form.salesPerson} onChange={e => setForm({ ...form, salesPerson: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">NV thiết kế</label><input className="form-input" value={form.designer} onChange={e => setForm({ ...form, designer: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Tên dự án</label><input className="form-input" value={form.projectName} onChange={e => setForm({ ...form, projectName: e.target.value })} placeholder="VD: Biệt thự anh Minh" /></div>
                            <div className="form-group"><label className="form-label">Địa chỉ dự án</label><input className="form-input" value={form.projectAddress} onChange={e => setForm({ ...form, projectAddress: e.target.value })} /></div>

                            <h4 style={{ color: 'var(--text-accent)', fontSize: 13, margin: '20px 0 12px', borderBottom: '1px solid var(--border-light)', paddingBottom: 6 }}>📞 Liên hệ phụ</h4>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Người liên hệ 2</label><input className="form-input" value={form.contactPerson2} onChange={e => setForm({ ...form, contactPerson2: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">SĐT 2</label><input className="form-input" type="tel" value={form.phone2} onChange={e => setForm({ ...form, phone2: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button><button className="btn btn-primary" onClick={handleSubmit}>Lưu</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
