'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const ALL_PROJECT_TYPES = ['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Thi công thô', 'Thi công hoàn thiện', 'Thi công nội thất'];

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export default function ProjectsPage() {
    const [projectsKD, setProjectsKD] = useState([]);
    const [projectsXD, setProjectsXD] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showXDTable, setShowXDTable] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [dragId, setDragId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null); // 'xay_dung' | 'kinh_doanh'
    const isDragging = useRef(false);
    const { role } = useRole();

    const visibleTypes = role === 'xuong'
        ? ['Thi công nội thất']
        : role === 'xay_dung'
            ? ALL_PROJECT_TYPES.filter(t => t !== 'Thi công nội thất')
            : ALL_PROJECT_TYPES;

    const [form, setForm] = useState({ name: '', type: visibleTypes[0] || 'Thiết kế kiến trúc', status: 'Khảo sát', address: '', area: '', floors: '', budget: '', customerId: '', designer: '', supervisor: '' });
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const router = useRouter();

    const fetchProjects = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filterStatus) params.set('status', filterStatus);
        if (filterType) params.set('type', filterType);
        Promise.all([
            fetch(`/api/projects?dept=kinh_doanh&${params}`).then(r => r.json()),
            fetch(`/api/projects?dept=xay_dung&${params}`).then(r => r.json()),
        ]).then(([d1, d2]) => {
            setProjectsKD(d1.data || []);
            setProjectsXD(d2.data || []);
            setLoading(false);
        });
    };

    useEffect(() => { fetch('/api/customers?limit=1000').then(r => r.json()).then(d => setCustomers(d.data || [])); }, []);
    useEffect(() => { fetchProjects(); }, [search, filterStatus, filterType]);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Xóa dự án này?')) return;
        await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        fetchProjects();
    };

    const handleCreate = async () => {
        if (!form.name.trim()) return alert('Vui lòng nhập tên dự án');
        if (!form.customerId) return alert('Vui lòng chọn khách hàng');
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        try {
            const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, area: Number(form.area) || 0, floors: Number(form.floors) || 1, budget: Number(form.budget) || 0 }) });
            if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo dự án'); }
            setShowModal(false);
            setForm({ name: '', type: 'Thiết kế kiến trúc', status: 'Khảo sát', address: '', area: '', floors: '', budget: '', customerId: '', designer: '', supervisor: '' });
            fetchProjects();
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const moveToDept = async (id, dept) => {
        await fetch(`/api/projects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ createdByRole: dept }) });
        fetchProjects();
    };

    const onDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); e.stopPropagation(); };
    const onDragEnd = () => { setDragId(null); setDropTarget(null); };

    const stColor = { 'Khảo sát': 'badge-default', 'Thiết kế': 'badge-info', 'Thi công': 'badge-warning', 'Nghiệm thu': 'badge-success', 'Bàn giao': 'badge-success' };

    const allProjects = [...projectsKD, ...projectsXD];
    const active = allProjects.filter(p => p.status === 'Thi công' || p.status === 'Đang thi công').length;
    const totalContract = allProjects.reduce((s, p) => s + (p.contractValue || 0), 0);
    const totalPaid = allProjects.reduce((s, p) => s + (p.paidAmount || 0), 0);

    const ProjectRow = ({ p }) => (
        <tr onClick={() => router.push(`/projects/${p.id}`)} style={{ cursor: 'pointer', opacity: dragId === p.id ? 0.4 : 1, transition: 'opacity .15s' }}>
            <td className="accent">{p.code}</td>
            <td className="primary">
                {p.name}
                {p.phase ? <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.phase}</div> : null}
                <div className="col-tablet-show" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'none' }}>{p.customer?.name}</div>
            </td>
            <td className="col-tablet-hide">{p.customer?.name}</td>
            <td className="col-laptop-hide"><span className="badge badge-default">{p.type}</span></td>
            <td>{fmt(p.contractValue || p.budget)}</td>
            <td className="col-laptop-hide" style={{ color: 'var(--status-success)' }}>{fmt(p.paidAmount || 0)}</td>
            <td className="col-tablet-hide"><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div><span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{p.progress}%</span></div></td>
            <td><span className={`badge ${stColor[p.status] || 'badge-default'}`}>{p.status}</span></td>
            <td style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                    draggable
                    onDragStart={e => onDragStart(e, p.id)}
                    onDragEnd={onDragEnd}
                    onClick={e => e.stopPropagation()}
                    title="Kéo để chuyển bảng"
                    style={{ cursor: 'grab', fontSize: 14, color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4, userSelect: 'none' }}>⠿</span>
                <button className="btn btn-ghost" onClick={(e) => handleDelete(p.id, e)}>🗑️</button>
            </td>
        </tr>
    );

    const ProjectCard = ({ p }) => (
        <div key={p.id} className="mobile-card-item" onClick={() => router.push(`/projects/${p.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div className="card-subtitle">{p.code} · {p.customer?.name}</div>
                </div>
                <span className={`badge ${stColor[p.status] || 'badge-default'}`} style={{ marginLeft: 8, flexShrink: 0 }}>{p.status}</span>
            </div>
            <div className="card-row">
                <div><span className="card-label">Giá trị HĐ</span><div className="card-value">{fmt(p.contractValue || p.budget)}</div></div>
                <div style={{ textAlign: 'right' }}><span className="card-label">Đã thu</span><div className="card-value" style={{ color: 'var(--status-success)' }}>{fmt(p.paidAmount || 0)}</div></div>
            </div>
            <div className="card-row">
                <div><span className="card-label">Loại</span><div style={{ fontSize: 12 }}>{p.type}</div></div>
                <div style={{ textAlign: 'right' }}><span className="card-label">Tiến độ</span><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ width: 60, height: 6 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div><span style={{ fontWeight: 600, fontSize: 12 }}>{p.progress}%</span></div></div>
            </div>
        </div>
    );

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">🏗️</div><div><div className="stat-value">{allProjects.length}</div><div className="stat-label">Tổng DA</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔨</div><div><div className="stat-value">{active}</div><div className="stat-label">Đang thi công</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value">{fmt(totalContract)}</div><div className="stat-label">Tổng giá trị HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div><div className="stat-value">{fmt(totalPaid)}</div><div className="stat-label">Đã thu</div></div></div>
                <div className="stat-card"><div className="stat-icon">⚠️</div><div><div className="stat-value" style={{ color: totalContract - totalPaid > 0 ? 'var(--status-danger)' : '' }}>{fmt(totalContract - totalPaid)}</div><div className="stat-label">Công nợ KH</div></div></div>
            </div>

            {/* Filter bar */}
            <div className="card" style={{ marginTop: 16, marginBottom: 16, padding: '10px 14px' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="text" className="form-input" placeholder="🔍 Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
                    <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="">Tất cả loại</option>
                        {visibleTypes.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả TT</option>
                        <option>Khảo sát</option><option>Thiết kế</option><option>Thi công</option><option>Nghiệm thu</option><option>Bàn giao</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => { setForm(f => ({ ...f, type: visibleTypes[0] || 'Thiết kế kiến trúc' })); setShowModal(true); }}>+ Thêm DA</button>
                </div>
            </div>

            {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div> : (<>

                {/* ===== Bảng Phòng Xây Dựng (ẩn với role xuong) ===== */}
                {role !== 'xuong' && <div className="card" style={{ marginBottom: 12 }}>
                    <button
                        onClick={() => setShowXDTable(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', padding: '12px 16px', width: '100%' }}>
                        <span style={{ transition: 'transform .2s', display: 'inline-block', transform: showXDTable ? 'rotate(90deg)' : 'rotate(0deg)', fontSize: 10 }}>▶</span>
                        🏗️ Dự án Phòng Xây Dựng
                        <span style={{ background: '#e8f4fd', color: '#2980b9', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 8 }}>{projectsXD.length}</span>
                    </button>
                    {showXDTable && (
                        <div
                            style={{ borderTop: '1px solid var(--border-light)', background: dropTarget === 'xay_dung' ? '#e8f4fd' : 'transparent', transition: 'background .2s' }}
                            onDragOver={e => { e.preventDefault(); setDropTarget('xay_dung'); }}
                            onDragLeave={() => setDropTarget(null)}
                            onDrop={e => { e.preventDefault(); setDropTarget(null); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) { moveToDept(id, 'xay_dung'); setDragId(null); } }}>
                            {dropTarget === 'xay_dung' && <div style={{ textAlign: 'center', padding: '8px', fontSize: 12, color: '#2980b9', fontWeight: 600 }}>↓ Thả vào đây để chuyển sang Xây Dựng</div>}
                            {/* Desktop table */}
                            <div className="desktop-table-view">
                                <div className="table-container"><table className="data-table projects-table">
                                    <thead><tr>
                                        <th>Mã</th><th>Dự án</th>
                                        <th className="col-tablet-hide">Khách hàng</th>
                                        <th className="col-laptop-hide">Loại</th>
                                        <th>Giá trị HĐ</th>
                                        <th className="col-laptop-hide">Đã thu</th>
                                        <th className="col-tablet-hide">Tiến độ</th>
                                        <th>TT</th><th></th>
                                    </tr></thead>
                                    <tbody>{projectsXD.length === 0
                                        ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có dự án</td></tr>
                                        : projectsXD.map(p => <ProjectRow key={p.id} p={p} />)
                                    }</tbody>
                                </table></div>
                            </div>
                            {/* Mobile cards */}
                            <div className="mobile-card-list">
                                {projectsXD.map(p => <ProjectCard key={p.id} p={p} />)}
                            </div>
                        </div>
                    )}
                </div>}

                {/* ===== Bảng Phòng Kinh Doanh ===== */}
                <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            💼 Dự án Phòng Kinh Doanh
                            <span style={{ background: '#fde8d0', color: '#e67e22', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 8 }}>{projectsKD.length}</span>
                        </h3>
                    </div>
                    <div
                        style={{ background: dropTarget === 'kinh_doanh' ? '#fff8f0' : 'transparent', transition: 'background .2s' }}
                        onDragOver={e => { e.preventDefault(); setDropTarget('kinh_doanh'); }}
                        onDragLeave={() => setDropTarget(null)}
                        onDrop={e => { e.preventDefault(); setDropTarget(null); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) { moveToDept(id, 'kinh_doanh'); setDragId(null); } }}>
                        {dropTarget === 'kinh_doanh' && <div style={{ textAlign: 'center', padding: '8px', fontSize: 12, color: '#e67e22', fontWeight: 600 }}>↓ Thả vào đây để chuyển sang Kinh Doanh</div>}
                        {/* Desktop table */}
                        <div className="desktop-table-view">
                            <div className="table-container"><table className="data-table projects-table">
                                <thead><tr>
                                    <th>Mã</th><th>Dự án</th>
                                    <th className="col-tablet-hide">Khách hàng</th>
                                    <th className="col-laptop-hide">Loại</th>
                                    <th>Giá trị HĐ</th>
                                    <th className="col-laptop-hide">Đã thu</th>
                                    <th className="col-tablet-hide">Tiến độ</th>
                                    <th>TT</th><th></th>
                                </tr></thead>
                                <tbody>{projectsKD.length === 0
                                    ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có dự án</td></tr>
                                    : projectsKD.map(p => <ProjectRow key={p.id} p={p} />)
                                }</tbody>
                            </table></div>
                        </div>
                        {/* Mobile cards */}
                        <div className="mobile-card-list">
                            {projectsKD.map(p => <ProjectCard key={p.id} p={p} />)}
                        </div>
                    </div>
                </div>
            </>)}

            {/* Modal tạo dự án */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>Thêm dự án mới</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên dự án *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Biệt thự anh Minh - Vinhomes" /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Khách hàng *</label>
                                    <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
                                        <option value="">Chọn khách hàng...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Loại</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {visibleTypes.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ công trình</label><input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Diện tích (m²)</label><input className="form-input" type="number" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Số tầng</label><input className="form-input" type="number" value={form.floors} onChange={e => setForm({ ...form, floors: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân sách dự kiến</label><input className="form-input" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Thiết kế viên</label><input className="form-input" value={form.designer} onChange={e => setForm({ ...form, designer: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Giám sát</label><input className="form-input" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Trạng thái ban đầu</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option>Khảo sát</option><option>Thiết kế</option><option>Chuẩn bị thi công</option><option>Đang thi công</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button><button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Đang tạo...' : 'Tạo dự án'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
