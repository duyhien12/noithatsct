'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/contexts/RoleContext';
import { getTemplateList } from '@/lib/supervisionChecklistTemplates';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const STATUS_STYLE = {
    'Đang thực hiện': { color: '#2563eb', bg: '#dbeafe' },
    'Hoàn thành':      { color: '#16a34a', bg: '#dcfce7' },
};

const TEMPLATES = getTemplateList();

export default function SupervisionListPage() {
    const router = useRouter();
    const { role } = useRole();
    const [checklists, setChecklists] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterProject, setFilterProject] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createProjectId, setCreateProjectId] = useState('');
    const [createTemplateKeys, setCreateTemplateKeys] = useState([]);
    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterProject) params.set('projectId', filterProject);
        if (filterStatus) params.set('status', filterStatus);
        const [cRes, pRes] = await Promise.all([
            fetch(`/api/supervision/checklists?${params}`),
            fetch('/api/projects?limit=200'),
        ]);
        const [c, p] = await Promise.all([cRes.json(), pRes.json()]);
        setChecklists(Array.isArray(c) ? c : []);
        setProjects(p?.data || []);
        setLoading(false);
    }, [filterProject, filterStatus]);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/');
            return;
        }
        fetchAll();
    }, [role, fetchAll]);

    const toggleTemplate = (key) => {
        setCreateTemplateKeys(keys => keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]);
    };

    const toggleAllTemplates = () => {
        setCreateTemplateKeys(keys => keys.length === TEMPLATES.length ? [] : TEMPLATES.map(t => t.key));
    };

    const handleCreate = async () => {
        if (!createProjectId || createTemplateKeys.length === 0) return;
        setCreating(true);
        try {
            const created = [];
            for (const templateKey of createTemplateKeys) {
                const res = await fetch('/api/supervision/checklists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: createProjectId, templateKey }),
                });
                if (res.ok) created.push(await res.json());
            }
            setShowCreate(false);
            setCreateTemplateKeys([]);
            setCreateProjectId('');
            if (created.length === 1) {
                router.push(`/workshop/supervision/${created[0].id}`);
            } else {
                fetchAll();
            }
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (e, checklistId) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Xóa checklist này? Toàn bộ dữ liệu kiểm tra và ảnh đính kèm sẽ không còn hiển thị.')) return;
        setDeletingId(checklistId);
        try {
            await fetch(`/api/supervision/checklists/${checklistId}`, { method: 'DELETE' });
            setChecklists(list => list.filter(c => c.id !== checklistId));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
                <div className="card-header">
                    <h3>📋 Checklist giám sát công trình</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => { setCreateProjectId(filterProject || ''); setCreateTemplateKeys([]); setShowCreate(true); }}>+ Tạo checklist</button>
                </div>
                <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)' }}>
                    <select className="form-select" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                        <option value="">Tất cả dự án</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                    </select>
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="Đang thực hiện">Đang thực hiện</option>
                        <option value="Hoàn thành">Hoàn thành</option>
                    </select>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : checklists.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có checklist nào. Nhấn &quot;+ Tạo checklist&quot; để bắt đầu.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, padding: 16 }}>
                        {checklists.map(c => {
                            const pct = c.total > 0 ? Math.round((c.checked / c.total) * 100) : 0;
                            const style = STATUS_STYLE[c.status] || STATUS_STYLE['Đang thực hiện'];
                            return (
                                <Link key={c.id} href={`/workshop/supervision/${c.id}`} className="card"
                                    style={{ padding: 16, display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid var(--border)', position: 'relative' }}>
                                    <button type="button" onClick={(e) => handleDelete(e, c.id)} disabled={deletingId === c.id}
                                        title="Xóa checklist"
                                        style={{
                                            position: 'absolute', top: 10, right: 10, width: 24, height: 24, borderRadius: 6,
                                            border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                                        {deletingId === c.id ? '…' : '🗑️'}
                                    </button>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8, paddingRight: 24 }}>
                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.templateName}</div>
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, whiteSpace: 'nowrap', ...style }}>
                                            {c.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                                        {c.project?.code} · {c.project?.name}
                                    </div>
                                    <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden', marginBottom: 6 }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: c.fail > 0 ? '#dc2626' : '#16a34a', transition: 'width .2s' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                                        <span>{c.checked}/{c.total} đã kiểm tra {c.fail > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>· {c.fail} lỗi</span>}</span>
                                        <span>{fmtDate(c.createdAt)}</span>
                                    </div>
                                    {c.createdBy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>👤 {c.createdBy}</div>}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                        <div className="modal-header">
                            <h3>Tạo checklist giám sát</h3>
                            <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div className="form-group">
                                <label className="form-label">Dự án</label>
                                <select className="form-select" value={createProjectId}
                                    onChange={e => setCreateProjectId(e.target.value)}>
                                    <option value="">— Chọn dự án —</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="form-label" style={{ margin: 0 }}>Mẫu checklist</label>
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={toggleAllTemplates}>
                                        {createTemplateKeys.length === TEMPLATES.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                                    {TEMPLATES.map(t => {
                                        const checked = createTemplateKeys.includes(t.key);
                                        return (
                                            <label key={t.key}
                                                style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                                                    border: '2px solid', borderColor: checked ? '#2563eb' : 'var(--border)',
                                                    background: checked ? '#dbeafe' : 'transparent',
                                                }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13 }}>
                                                    <input type="checkbox" checked={checked} onChange={() => toggleTemplate(t.key)} />
                                                    {t.icon} {t.name}
                                                </span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.itemCount} mục</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Hủy</button>
                            <button className="btn btn-primary" disabled={creating || !createProjectId || createTemplateKeys.length === 0}
                                onClick={handleCreate}>
                                {creating ? 'Đang tạo...' : `Tạo ${createTemplateKeys.length > 1 ? `${createTemplateKeys.length} checklist` : 'checklist'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
