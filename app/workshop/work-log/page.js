'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const STATUS_COLOR = {
    'Chờ làm':  { color: '#6b7280', bg: '#f3f4f6' },
    'Đang làm': { color: '#d97706', bg: '#fef3c7' },
    'Hoàn thành': { color: '#16a34a', bg: '#dcfce7' },
    'Tạm dừng': { color: '#dc2626', bg: '#fee2e2' },
};

const fmtDate = (str) => {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const todayStr = () => new Date().toISOString().split('T')[0];

export default function WorkLogPage() {
    const router = useRouter();
    const { role } = useRole();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterWorker, setFilterWorker] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/');
            return;
        }
        fetchTasks();
    }, [role]);

    const fetchTasks = async () => {
        setLoading(true);
        const res = await fetch('/api/workshop/tasks');
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    // Derive unique worker names and project names for filter dropdowns
    const allWorkerNames = [...new Set(
        tasks.flatMap(t => t.workers?.map(tw => tw.worker?.name).filter(Boolean) || [])
    )].sort();

    const allProjects = [...new Map(
        tasks.filter(t => t.project).map(t => [t.project.id, t.project])
    ).values()];

    const filtered = tasks.filter(t => {
        if (filterStatus && t.status !== filterStatus) return false;
        if (filterProject && t.projectId !== filterProject) return false;
        if (filterWorker && !t.workers?.some(tw => tw.worker?.name === filterWorker)) return false;
        if (dateFrom && t.createdAt && t.createdAt.slice(0, 10) < dateFrom) return false;
        if (dateTo && t.createdAt && t.createdAt.slice(0, 10) > dateTo) return false;
        return true;
    });

    // Stats
    const totalTasks = filtered.length;
    const doneTasks = filtered.filter(t => t.status === 'Hoàn thành').length;
    const inProgressTasks = filtered.filter(t => t.status === 'Đang làm').length;
    const pendingTasks = filtered.filter(t => t.status === 'Chờ làm').length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #2563eb' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📋 Tổng công việc</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#2563eb' }}>{totalTasks}</div>
                </div>
                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #d97706' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>⚙️ Đang thực hiện</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#d97706' }}>{inProgressTasks}</div>
                </div>
                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>✅ Hoàn thành</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>{doneTasks}</div>
                </div>
                <div className="card" style={{ padding: '14px 18px', borderLeft: '4px solid #6b7280' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>🕐 Chờ làm</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#6b7280' }}>{pendingTasks}</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>📒 Nhật ký công việc xưởng</h3>
                    <button className="btn btn-ghost btn-sm" onClick={fetchTasks}>🔄 Làm mới</button>
                </div>

                {/* Filters */}
                <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                    <select className="form-select" style={{ flex: '1 1 150px', minWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        {Object.keys(STATUS_COLOR).map(s => <option key={s}>{s}</option>)}
                    </select>
                    <select className="form-select" style={{ flex: '1 1 160px', minWidth: 130 }} value={filterWorker} onChange={e => setFilterWorker(e.target.value)}>
                        <option value="">Tất cả nhân công</option>
                        {allWorkerNames.map(n => <option key={n}>{n}</option>)}
                    </select>
                    <select className="form-select" style={{ flex: '1 1 180px', minWidth: 140 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                        <option value="">Tất cả dự án</option>
                        {allProjects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                    </select>
                    <input type="date" className="form-input" style={{ flex: '0 0 140px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Từ ngày" />
                    <input type="date" className="form-input" style={{ flex: '0 0 140px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} title="Đến ngày" />
                    {(filterStatus || filterWorker || filterProject || dateFrom || dateTo) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterWorker(''); setFilterProject(''); setDateFrom(''); setDateTo(''); }}>
                            ✕ Xóa lọc
                        </button>
                    )}
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                    {/* Desktop */}
                    <div className="desktop-table-view">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: 200 }}>Công việc</th>
                                        <th>Dự án</th>
                                        <th>Nhân công</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: 'center' }}>Tiến độ</th>
                                        <th>Ngày tạo</th>
                                        <th>Hạn chót</th>
                                        <th>Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(t => {
                                        const sc = STATUS_COLOR[t.status] || { color: '#6b7280', bg: '#f3f4f6' };
                                        const isExpanded = expandedId === t.id;
                                        const isOverdue = t.deadline && t.status !== 'Hoàn thành' && new Date(t.deadline) < new Date();
                                        return (
                                            <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                                                    {t.description && isExpanded && (
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{t.description}</div>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: 12 }}>
                                                    {t.project ? (
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 12 }}>{t.project.code}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.project.name}</div>
                                                        </div>
                                                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                                </td>
                                                <td>
                                                    {t.workers?.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            {t.workers.map(tw => (
                                                                <span key={tw.workerId} style={{ fontSize: 12, padding: '1px 6px', borderRadius: 8, background: '#f0fdf4', color: '#15803d', whiteSpace: 'nowrap' }}>
                                                                    {tw.worker?.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chưa giao</span>}
                                                </td>
                                                <td>
                                                    <span style={{ padding: '3px 9px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden', minWidth: 50 }}>
                                                            <div style={{ width: `${t.progress || 0}%`, height: '100%', background: t.progress >= 100 ? '#16a34a' : '#2563eb', borderRadius: 3 }} />
                                                        </div>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 28 }}>{t.progress || 0}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{fmtDate(t.createdAt)}</td>
                                                <td style={{ fontSize: 12, color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>
                                                    {fmtDate(t.deadline)}{isOverdue && ' ⚠️'}
                                                </td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {t.notes || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>Không có công việc nào</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile */}
                    <div className="mobile-card-list">
                        {filtered.map(t => {
                            const sc = STATUS_COLOR[t.status] || { color: '#6b7280', bg: '#f3f4f6' };
                            const isOverdue = t.deadline && t.status !== 'Hoàn thành' && new Date(t.deadline) < new Date();
                            return (
                                <div key={t.id} className="mobile-card-item">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14, flex: 1, marginRight: 8 }}>{t.title}</div>
                                        <span style={{ padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{t.status}</span>
                                    </div>
                                    {t.project && (
                                        <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 4 }}>{t.project.code} · {t.project.name}</div>
                                    )}
                                    {t.workers?.length > 0 && (
                                        <div style={{ fontSize: 12, color: '#15803d', marginBottom: 6 }}>
                                            👷 {t.workers.map(tw => tw.worker?.name).filter(Boolean).join(', ')}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'hidden' }}>
                                            <div style={{ width: `${t.progress || 0}%`, height: '100%', background: t.progress >= 100 ? '#16a34a' : '#2563eb', borderRadius: 3 }} />
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.progress || 0}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                        <span>Tạo: {fmtDate(t.createdAt)}</span>
                                        {t.deadline && <span style={{ color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? 700 : 400 }}>Hạn: {fmtDate(t.deadline)}{isOverdue && ' ⚠️'}</span>}
                                    </div>
                                    {t.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>{t.notes}</div>}
                                </div>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>Không có công việc nào</div>
                        )}
                    </div>
                    </>
                )}
            </div>
        </div>
    );
}
