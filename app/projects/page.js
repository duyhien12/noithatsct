'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const ALL_PROJECT_TYPES = ['Thiết kế kiến trúc', 'Thiết kế nội thất', 'Thi công thô', 'Thi công hoàn thiện', 'Thi công nội thất'];

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => {
    if (!n && n !== 0) return '—';
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (abs >= 1e9) return sign + (abs / 1e9).toFixed(1) + ' tỷ';
    if (abs >= 1e6) return sign + Math.round(abs / 1e6) + ' tr';
    if (abs >= 1e3) return sign + Math.round(abs / 1e3) + 'k';
    return fmt(n);
};

// Health score color thresholds
const healthColor = (score) => score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
const healthBg    = (score) => score >= 80 ? 'rgba(22,163,74,0.1)' : score >= 50 ? 'rgba(217,119,6,0.1)' : 'rgba(220,38,38,0.1)';
const healthLabel = (score) => score >= 80 ? 'Tốt' : score >= 50 ? 'Chú ý' : 'Rủi ro';

// Risk badge
const RISK_STYLE = {
    overdue:    { bg: '#FFEBEE', color: '#C62828', border: '#EF5350' },
    delay:      { bg: '#FFF3E0', color: '#BF360C', border: '#FF9800' },
    slow:       { bg: '#FFF8E1', color: '#E65100', border: '#FFA726' },
    budget:     { bg: '#FFEBEE', color: '#B71C1C', border: '#EF5350' },
    nearBudget: { bg: '#FFF8E1', color: '#E65100', border: '#FFA726' },
};

const RiskBadge = ({ risk }) => {
    const s = RISK_STYLE[risk.type] || RISK_STYLE.slow;
    return (
        <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 700,
            padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap',
            background: s.bg, color: s.color, border: `1px solid ${s.border}`,
            marginRight: 3, marginBottom: 2,
        }}>{risk.label}</span>
    );
};

const HealthDot = ({ score }) => (
    <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        background: healthBg(score), color: healthColor(score),
        border: `1px solid ${healthColor(score)}44`,
        whiteSpace: 'nowrap',
    }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: healthColor(score), display: 'inline-block' }} />
        {score}
    </span>
);

const stColor = { 'Khảo sát': 'badge-default', 'Thiết kế': 'badge-info', 'Thi công': 'badge-warning', 'Đang thi công': 'badge-warning', 'Chuẩn bị thi công': 'badge-warning', 'Nghiệm thu': 'badge-success', 'Bàn giao': 'badge-success', 'Hoàn thành': 'badge-success' };

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
    const [dropTarget, setDropTarget] = useState(null);
    const isDragging = useRef(false);
    const { role, email } = useRole();
    const canSeeXD = role !== 'xuong' || email === 'buihoa@kientrucsct.com';

    useEffect(() => { if (email === 'buihoa@kientrucsct.com') setShowXDTable(true); }, [email]);

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
        params.set('limit', '200');
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
    const onDragEnd   = () => { setDragId(null); setDropTarget(null); };

    const allProjects    = [...projectsKD, ...projectsXD];
    const activeCount    = allProjects.filter(p => ['Thi công', 'Đang thi công', 'Chuẩn bị thi công'].includes(p.status)).length;
    const totalContract  = allProjects.reduce((s, p) => s + (p.contractValue || 0), 0);
    const totalPaid      = allProjects.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const totalProfit    = allProjects.reduce((s, p) => s + (p.profit || 0), 0);
    const atRiskCount    = allProjects.filter(p => p.risks?.length > 0).length;

    // Project row for desktop table
    const ProjectRow = ({ p, dept }) => {
        const hasRisks   = p.risks?.length > 0;
        const rowBg      = hasRisks && p.healthScore < 35
            ? 'rgba(220,38,38,0.025)'
            : hasRisks ? 'rgba(217,119,6,0.02)' : undefined;

        return (
            <tr
                onClick={() => router.push(`/projects/${p.id}`)}
                style={{ cursor: 'pointer', opacity: dragId === p.id ? 0.4 : 1, transition: 'opacity .15s, background .1s', background: rowBg }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = rowBg || 'transparent'}
            >
                {/* Mã */}
                <td className="accent" style={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{p.code}</td>

                {/* Dự án + Loại + KH (tablet sub) */}
                <td className="primary" style={{ maxWidth: 200 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                        <span style={{ background: 'var(--bg-secondary)', padding: '1px 5px', borderRadius: 4, marginRight: 4 }}>{p.type}</span>
                        <span className="col-tablet-show">{p.customer?.name}</span>
                    </div>
                </td>

                {/* KH */}
                <td className="col-tablet-hide" style={{ fontSize: 12 }}>{p.customer?.name}</td>

                {/* Giá trị HĐ + Đã thu (stacked) */}
                <td style={{ minWidth: 110 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{fmtShort(p.contractValue)}</div>
                    <div style={{ fontSize: 11, color: p.paidAmount > 0 ? 'var(--status-success)' : 'var(--text-muted)', marginTop: 1 }}>
                        Thu: {fmtShort(p.paidAmount)}
                    </div>
                </td>

                {/* Chi phí + Lợi nhuận (stacked) */}
                <td className="col-laptop-hide" style={{ minWidth: 110 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Chi: {fmtShort(p.spent)}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: (p.profit || 0) >= 0 ? 'var(--status-success)' : '#dc2626', marginTop: 1 }}>
                        LN: {fmtShort(p.profit)}
                        {p.margin !== null && (
                            <span style={{
                                fontSize: 10, marginLeft: 4,
                                color: p.margin < 0 ? '#dc2626' : p.margin < 10 ? '#d97706' : '#16a34a',
                            }}>({p.margin}%)</span>
                        )}
                    </div>
                </td>

                {/* Health Score */}
                <td className="col-laptop-hide" style={{ minWidth: 80 }}>
                    {<HealthDot score={p.healthScore ?? 100} />}
                </td>

                {/* Risk badges */}
                <td className="col-laptop-hide" style={{ minWidth: 110 }}>
                    {p.risks?.length > 0
                        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {p.risks.map((r, i) => <RiskBadge key={i} risk={r} />)}
                          </div>
                        : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                    }
                </td>

                {/* Tiến độ */}
                <td className="col-tablet-hide" style={{ minWidth: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                            <div className="progress-fill" style={{
                                width: `${p.progress}%`,
                                background: healthColor(p.healthScore ?? 100),
                            }} />
                        </div>
                        <span style={{ fontSize: 11, whiteSpace: 'nowrap', fontWeight: 600, color: healthColor(p.healthScore ?? 100) }}>{p.progress}%</span>
                    </div>
                    {p.wsProgress !== null && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>Xưởng: {p.wsProgress}%</div>
                    )}
                </td>

                {/* Trạng thái */}
                <td>
                    <span className={`badge ${stColor[p.status] || 'badge-default'}`} style={{ fontSize: 11 }}>{p.status}</span>
                </td>

                {/* Actions */}
                <td onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'nowrap' }}>
                    {dept === 'kinh_doanh' && (
                        <button
                            className="btn btn-sm"
                            title="Chuyển sang Phòng Xây Dựng"
                            onClick={() => moveToDept(p.id, 'xay_dung')}
                            style={{ fontSize: 10, padding: '3px 7px', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', whiteSpace: 'nowrap', borderRadius: 6 }}
                        >→ XD</button>
                    )}
                    {dept === 'xay_dung' && (
                        <button
                            className="btn btn-sm"
                            title="Chuyển sang Phòng Kinh Doanh"
                            onClick={() => moveToDept(p.id, 'kinh_doanh')}
                            style={{ fontSize: 10, padding: '3px 7px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', whiteSpace: 'nowrap', borderRadius: 6 }}
                        >→ KD</button>
                    )}
                    <span
                        draggable
                        onDragStart={e => onDragStart(e, p.id)}
                        onDragEnd={onDragEnd}
                        title="Kéo để chuyển bảng"
                        style={{ cursor: 'grab', fontSize: 14, color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4, userSelect: 'none' }}>⠿</span>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => handleDelete(p.id, e)}>🗑️</button>
                </td>
            </tr>
        );
    };

    const ProjectCard = ({ p, dept }) => (
        <div key={p.id} className="mobile-card-item" onClick={() => router.push(`/projects/${p.id}`)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div className="card-subtitle">{p.code} · {p.customer?.name}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                    <span className={`badge ${stColor[p.status] || 'badge-default'}`} style={{ fontSize: 10 }}>{p.status}</span>
                    <HealthDot score={p.healthScore ?? 100} />
                    {dept === 'kinh_doanh' && (
                        <button onClick={e => { e.stopPropagation(); moveToDept(p.id, 'xay_dung'); }}
                            style={{ fontSize: 10, padding: '2px 8px', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 6, cursor: 'pointer', marginTop: 2 }}>
                            → Xây Dựng
                        </button>
                    )}
                    {dept === 'xay_dung' && (
                        <button onClick={e => { e.stopPropagation(); moveToDept(p.id, 'kinh_doanh'); }}
                            style={{ fontSize: 10, padding: '2px 8px', background: '#fff7ed', color: '#c2410c', border: '1px solid #fdba74', borderRadius: 6, cursor: 'pointer', marginTop: 2 }}>
                            → Kinh Doanh
                        </button>
                    )}
                </div>
            </div>
            {p.risks?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
                    {p.risks.map((r, i) => <RiskBadge key={i} risk={r} />)}
                </div>
            )}
            <div className="card-row">
                <div><span className="card-label">Giá trị HĐ</span><div className="card-value">{fmtShort(p.contractValue)}</div></div>
                <div style={{ textAlign: 'right' }}><span className="card-label">Đã thu</span><div className="card-value" style={{ color: 'var(--status-success)' }}>{fmtShort(p.paidAmount)}</div></div>
            </div>
            <div className="card-row">
                <div>
                    <span className="card-label">Lợi nhuận</span>
                    <div style={{ fontSize: 12, fontWeight: 700, color: (p.profit || 0) >= 0 ? 'var(--status-success)' : '#dc2626' }}>
                        {fmtShort(p.profit)}{p.margin !== null ? ` (${p.margin}%)` : ''}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span className="card-label">Tiến độ</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                        <div className="progress-bar" style={{ width: 50, height: 5 }}>
                            <div className="progress-fill" style={{ width: `${p.progress}%`, background: healthColor(p.healthScore ?? 100) }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 12, color: healthColor(p.healthScore ?? 100) }}>{p.progress}%</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const TableSection = ({ projects, dept }) => (
        <div
            style={{ borderTop: '1px solid var(--border-light)', background: dropTarget === dept ? (dept === 'xay_dung' ? '#e8f4fd' : '#fff8f0') : 'transparent', transition: 'background .2s' }}
            onDragOver={e => { e.preventDefault(); setDropTarget(dept); }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={e => { e.preventDefault(); setDropTarget(null); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) { moveToDept(id, dept); setDragId(null); } }}>
            {dropTarget === dept && (
                <div style={{ textAlign: 'center', padding: '8px', fontSize: 12, color: dept === 'xay_dung' ? '#2980b9' : '#e67e22', fontWeight: 600 }}>
                    ↓ Thả vào đây để chuyển sang {dept === 'xay_dung' ? 'Xây Dựng' : 'Kinh Doanh'}
                </div>
            )}
            {/* Desktop */}
            <div className="desktop-table-view">
                <div className="table-container">
                    <table className="data-table projects-table">
                        <thead>
                            <tr>
                                <th style={{ minWidth: 60 }}>Mã</th>
                                <th style={{ minWidth: 160 }}>Dự án</th>
                                <th className="col-tablet-hide">Khách hàng</th>
                                <th style={{ minWidth: 110 }}>HĐ / Đã thu</th>
                                <th className="col-laptop-hide" style={{ minWidth: 110 }}>Chi phí / LN</th>
                                <th className="col-laptop-hide" style={{ minWidth: 80 }}>Health</th>
                                <th className="col-laptop-hide" style={{ minWidth: 110 }}>Rủi ro</th>
                                <th className="col-tablet-hide" style={{ minWidth: 100 }}>Tiến độ</th>
                                <th>TT</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {projects.length === 0
                                ? <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có dự án</td></tr>
                                : projects.map(p => <ProjectRow key={p.id} p={p} dept={dept} />)
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Mobile */}
            <div className="mobile-card-list">
                {projects.map(p => <ProjectCard key={p.id} p={p} dept={dept} />)}
            </div>
        </div>
    );

    return (
        <div>
            {/* Stats — realtime từ contract + expense data */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">🏗️</div>
                    <div><div className="stat-value">{allProjects.length}</div><div className="stat-label">Tổng DA</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🔨</div>
                    <div><div className="stat-value">{activeCount}</div><div className="stat-label">Đang thi công</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div><div className="stat-value" style={{ fontSize: 16 }}>{fmtShort(totalContract)}</div><div className="stat-label">Tổng giá trị HĐ</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💵</div>
                    <div><div className="stat-value" style={{ fontSize: 16, color: 'var(--status-success)' }}>{fmtShort(totalPaid)}</div><div className="stat-label">Đã thu</div></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📈</div>
                    <div>
                        <div className="stat-value" style={{ fontSize: 16, color: totalProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmtShort(totalProfit)}</div>
                        <div className="stat-label">Lợi nhuận</div>
                    </div>
                </div>
                {atRiskCount > 0 && (
                    <div className="stat-card" style={{ borderColor: 'rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.03)' }}>
                        <div className="stat-icon">⚠️</div>
                        <div>
                            <div className="stat-value" style={{ color: 'var(--status-danger)' }}>{atRiskCount}</div>
                            <div className="stat-label">Có rủi ro</div>
                        </div>
                    </div>
                )}
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
                        <option>Khảo sát</option><option>Thiết kế</option><option>Chuẩn bị thi công</option>
                        <option>Đang thi công</option><option>Thi công</option>
                        <option>Nghiệm thu</option><option>Bàn giao</option><option>Hoàn thành</option>
                    </select>
                    <button className="btn btn-primary" onClick={() => { setForm(f => ({ ...f, type: visibleTypes[0] || 'Thiết kế kiến trúc' })); setShowModal(true); }}>+ Thêm DA</button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (<>

                {/* Bảng Phòng Xây Dựng */}
                {canSeeXD && (
                    <div className="card" style={{ marginBottom: 12 }}>
                        <button
                            onClick={() => setShowXDTable(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', padding: '12px 16px', width: '100%' }}>
                            <span style={{ transition: 'transform .2s', display: 'inline-block', transform: showXDTable ? 'rotate(90deg)' : 'rotate(0deg)', fontSize: 10 }}>▶</span>
                            🏗️ Dự án Phòng Xây Dựng
                            <span style={{ background: '#e8f4fd', color: '#2980b9', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 8 }}>{projectsXD.length}</span>
                            {projectsXD.some(p => p.risks?.length > 0) && (
                                <span style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 8 }}>
                                    ⚠ {projectsXD.filter(p => p.risks?.length > 0).length} rủi ro
                                </span>
                            )}
                        </button>
                        {showXDTable && <TableSection projects={projectsXD} dept="xay_dung" />}
                    </div>
                )}

                {/* Bảng Phòng Kinh Doanh */}
                {role !== 'xay_dung' && <div className="card">
                    <div className="card-header">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            💼 Phòng kinh doanh đặt hàng xưởng nội thất
                            <span style={{ background: '#fde8d0', color: '#e67e22', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 8 }}>{projectsKD.length}</span>
                            {projectsKD.some(p => p.risks?.length > 0) && (
                                <span style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 8 }}>
                                    ⚠ {projectsKD.filter(p => p.risks?.length > 0).length} rủi ro
                                </span>
                            )}
                        </h3>
                    </div>
                    <TableSection projects={projectsKD} dept="kinh_doanh" />
                </div>}
            </>)}

            {/* Modal tạo dự án */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>Thêm dự án mới</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Tên dự án *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Biệt thự anh Minh - Vinhomes" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Khách hàng *</label>
                                    <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })}>
                                        <option value="">Chọn khách hàng...</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Loại</label>
                                    <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                        {visibleTypes.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Địa chỉ công trình</label>
                                <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Diện tích (m²)</label><input className="form-input" type="number" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Số tầng</label><input className="form-input" type="number" value={form.floors} onChange={e => setForm({ ...form, floors: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Ngân sách dự kiến</label><input className="form-input" type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Thiết kế viên</label><input className="form-input" value={form.designer} onChange={e => setForm({ ...form, designer: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Giám sát</label><input className="form-input" value={form.supervisor} onChange={e => setForm({ ...form, supervisor: e.target.value })} /></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái ban đầu</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option>Khảo sát</option><option>Thiết kế</option><option>Chuẩn bị thi công</option><option>Đang thi công</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Đang tạo...' : 'Tạo dự án'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
