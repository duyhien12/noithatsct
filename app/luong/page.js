'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Roles thuộc phòng xây dựng / thiết kế kiến trúc
const DESIGN_ROLES = ['xay_dung', 'thiet_ke', 'ky_thuat'];

const ALLOWED_EMAIL = 'ngocbinh@kientrucsct.com';

const STAGES = [
    { key: 'ks_do_dac',       label: 'KS đo đạc biên trạng',              pct: 2  },
    { key: 'len_pa_mb',       label: 'Lên PA MB kiến trúc',               pct: 4  },
    { key: 'duyet_kh',        label: 'Duyệt KH',                          pct: 3  },
    { key: 'bao_gia_ky_hd',   label: 'Báo giá & ký HĐ',                  pct: 3  },
    { key: 'dinh_huong',      label: 'Định hướng phong cách kiến trúc',   pct: 4  },
    { key: 'chot_kh',         label: 'Chốt khách hàng',                   pct: 2  },
    { key: 'chot_pa',         label: 'Chốt PA thiết kế',                  pct: 3  },
    { key: 'thiet_ke_3d',     label: 'Thiết kế 3D',                       pct: 13 },
    { key: 'duyet_3d_nb',     label: 'Duyệt 3D nội bộ',                   pct: 5  },
    { key: 'chot_3d_kh',      label: 'Chốt 3D khách hàng',               pct: 2  },
    { key: 'bo_ban_ve',       label: 'Bổ bản vẽ kiến trúc',               pct: 15 },
    { key: 'ket_cau',         label: 'Thiết kế kết cấu',                  pct: 32 },
    { key: 'dien_nuoc',       label: 'Thiết kế điện nước',                pct: 10 },
    { key: 'kiem_soat_hs',    label: 'Kiểm soát hồ sơ',                   pct: 2  },
    { key: 'in_ban_ve',       label: 'In bản vẽ & bàn giao hồ sơ',       pct: 1  },
];

const STATUS_LABELS = {
    'Đang thi công': { color: '#2563eb' },
    'Đang thiết kế': { color: '#7c3aed' },
    'Hoàn thành':    { color: '#16a34a' },
    'Tạm dừng':      { color: '#d97706' },
    'Hủy':           { color: '#dc2626' },
};

const AVATAR_COLORS = ['#2563eb','#7c3aed','#16a34a','#d97706','#dc2626','#0891b2','#be185d','#65a30d'];

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const parseJSON = (raw) => { try { return JSON.parse(raw || '{}'); } catch { return {}; } };

const initials = (name) => name ? name.trim().split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() : '?';
const avatarColor = (name) => AVATAR_COLORS[(name || '').length % AVATAR_COLORS.length];

// ───────── Hook lấy danh sách nhân viên phòng xây dựng ─────────
function useDesignUsers() {
    const [users, setUsers] = useState([]);
    useEffect(() => {
        fetch('/api/users')
            .then(r => r.json())
            .then(list => {
                const filtered = (Array.isArray(list) ? list : [])
                    .filter(u => u.active && DESIGN_ROLES.includes(u.role))
                    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
                setUsers(filtered);
            })
            .catch(() => {});
    }, []);
    return users;
}

// ───────── Bảng tổng hợp lương theo người ─────────
function SummaryTable({ items }) {
    // items: [{ stageKey, amount, assignee }]
    const map = {};
    items.forEach(({ assignee, amount }) => {
        const name = (assignee || '').trim();
        if (!name) return;
        map[name] = (map[name] || 0) + amount;
    });
    const rows = Object.entries(map).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return null;

    return (
        <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: 'var(--text-primary)' }}>
                Tổng hợp lương theo người thực hiện
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {rows.map(([name, total], i) => (
                    <div key={name} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', borderRadius: 10,
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        minWidth: 220,
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: avatarColor(name), color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>{initials(name)}</div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                            <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 700 }}>{fmt(total)}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ───────── Stage list với người thực hiện ─────────
function StageList({ base, stages, assignees, users, onToggle, onAssigneeChange }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {STAGES.map(stage => {
                const done = !!stages[stage.key];
                const amount = base * stage.pct / 100;
                const assignee = assignees[stage.key] || '';
                return (
                    <div
                        key={stage.key}
                        style={{
                            padding: '8px 12px', borderRadius: 8,
                            background: done ? 'rgba(22,163,74,0.07)' : 'var(--bg-secondary)',
                            border: `1px solid ${done ? '#16a34a44' : 'var(--border)'}`,
                            transition: 'all 0.15s',
                        }}
                    >
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={done}
                                onChange={() => onToggle(stage.key)}
                                style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: done ? '#15803d' : 'var(--text-primary)' }}>
                                    {stage.label}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {stage.pct}% → {fmt(amount)}
                                </div>
                            </div>
                            {done && <span style={{ fontSize: 14, color: '#16a34a' }}>✓</span>}
                        </label>

                        {/* Người thực hiện — dropdown */}
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {assignee && (
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: avatarColor(assignee), color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                                }}>{initials(assignee)}</div>
                            )}
                            <select
                                value={assignee}
                                onChange={e => onAssigneeChange(stage.key, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{
                                    flex: 1, padding: '3px 8px', borderRadius: 5, fontSize: 11,
                                    border: '1px solid var(--border)', background: 'var(--bg-primary)',
                                    color: assignee ? 'var(--text-primary)' : 'var(--text-muted)',
                                    outline: 'none', cursor: 'pointer',
                                }}
                            >
                                <option value="">— Người thực hiện —</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ───────── Modal sửa (Tab 1) ─────────
function EditModal({ project, onClose, onSaved }) {
    const sp = project.salaryProgress || {};
    const [contractValueOverride, setContractValueOverride] = useState(
        sp.contractValueOverride != null ? sp.contractValueOverride : (project.contractValue || '')
    );
    const [notes, setNotes]   = useState(sp.notes || '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        const res = await fetch(`/api/salary/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stages: parseJSON(sp.stages),
                assignees: parseJSON(sp.assignees),
                notes,
                contractValueOverride: contractValueOverride === '' ? null : parseFloat(contractValueOverride) || null,
            }),
        });
        onSaved(await res.json());
        setSaving(false);
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 24, width: 480, maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Chỉnh sửa — {project.code}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>{project.name}</div>
                <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        Giá trị HĐ dùng để tính lương
                        <span style={{ fontStyle: 'italic', marginLeft: 4 }}>— mặc định: {fmt(project.contractValue)}</span>
                    </label>
                    <input className="form-input" type="number" value={contractValueOverride} onChange={e => setContractValueOverride(e.target.value)} placeholder={`Để trống = ${fmt(project.contractValue)}`} />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ghi chú</label>
                    <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Hủy</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────── TAB 1: DỰ ÁN ───────────────────────────
function TabDuAn() {
    const users = useDesignUsers();
    const [projects, setProjects]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [expanded, setExpanded]       = useState({});
    const [statusFilter, setStatusFilter] = useState('all');
    const [editProject, setEditProject] = useState(null);
    const [deleting, setDeleting]       = useState({});
    // local assignees per project (để debounce save)
    const [localAssignees, setLocalAssignees] = useState({});
    const saveTimers = useRef({});

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/salary')
            .then(r => r.json())
            .then(d => {
                const list = d.data || [];
                setProjects(list);
                const init = {};
                list.forEach(p => { init[p.id] = parseJSON(p.salaryProgress?.assignees); });
                setLocalAssignees(init);
                setLoading(false);
            });
    }, []);

    useEffect(() => { load(); }, [load]);

    const getStages    = (p) => parseJSON(p.salaryProgress?.stages);
    const getAssignees = (p) => localAssignees[p.id] || parseJSON(p.salaryProgress?.assignees);

    const getContractValue = (p) =>
        p.salaryProgress?.contractValueOverride != null
            ? p.salaryProgress.contractValueOverride
            : (p.contractValue || 0);

    const saveFull = useCallback(async (project, newStages, newAssignees) => {
        await fetch(`/api/salary/${project.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                stages: newStages,
                assignees: newAssignees,
                notes: project.salaryProgress?.notes || '',
                contractValueOverride: project.salaryProgress?.contractValueOverride ?? null,
            }),
        });
    }, []);

    const toggleStage = async (project, stageKey) => {
        const current = getStages(project);
        const updated = { ...current, [stageKey]: !current[stageKey] };
        setProjects(prev => prev.map(p => p.id === project.id
            ? { ...p, salaryProgress: { ...(p.salaryProgress || {}), stages: JSON.stringify(updated) } }
            : p
        ));
        await saveFull(project, updated, getAssignees(project));
    };

    const handleAssigneeChange = (project, stageKey, value) => {
        const updated = { ...getAssignees(project), [stageKey]: value };
        setLocalAssignees(prev => ({ ...prev, [project.id]: updated }));
        // debounce save 800ms
        clearTimeout(saveTimers.current[project.id]);
        saveTimers.current[project.id] = setTimeout(() => {
            saveFull(project, getStages(project), updated);
        }, 800);
    };

    // Khi thu lại row: flush debounce và lưu ngay
    const toggleExpand = (project) => {
        const isOpen = expanded[project.id];
        if (isOpen) {
            // Đang mở → sắp đóng: flush save ngay
            clearTimeout(saveTimers.current[project.id]);
            saveFull(project, getStages(project), getAssignees(project));
        }
        setExpanded(e => ({ ...e, [project.id]: !e[project.id] }));
    };

    const handleSaved = (data) => {
        setProjects(prev => prev.map(p => p.id === data.projectId
            ? { ...p, salaryProgress: { ...p.salaryProgress, ...data } }
            : p
        ));
        setLocalAssignees(prev => ({ ...prev, [data.projectId]: parseJSON(data.assignees) }));
    };

    const deleteProgress = async (project) => {
        if (!confirm(`Xóa toàn bộ tiến độ lương của "${project.code}"?`)) return;
        setDeleting(d => ({ ...d, [project.id]: true }));
        await fetch(`/api/salary/${project.id}`, { method: 'DELETE' });
        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, salaryProgress: null } : p));
        setLocalAssignees(prev => ({ ...prev, [project.id]: {} }));
        setDeleting(d => ({ ...d, [project.id]: false }));
    };

    const getSalaryInfo = (project) => {
        const revenue = getContractValue(project);
        const base = revenue * 0.5;
        const stages = getStages(project);
        const earned = STAGES.reduce((sum, s) => sum + (stages[s.key] ? base * s.pct / 100 : 0), 0);
        const pctDone = STAGES.reduce((sum, s) => sum + (stages[s.key] ? s.pct : 0), 0);
        return { revenue, base, earned, pctDone };
    };

    const filtered = projects.filter(p => {
        const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totalEarned = filtered.reduce((s, p) => s + getSalaryInfo(p).earned, 0);
    const totalBase   = filtered.reduce((s, p) => s + getSalaryInfo(p).base, 0);

    // Tổng hợp lương tất cả dự án theo người
    const allItems = filtered.flatMap(p => {
        const base = getContractValue(p) * 0.5;
        const stages = getStages(p);
        const assignees = getAssignees(p);
        return STAGES
            .filter(s => stages[s.key])
            .map(s => ({ assignee: assignees[s.key] || '', amount: base * s.pct / 100 }));
    });

    return (
        <div>
            {editProject && <EditModal project={editProject} onClose={() => setEditProject(null)} onSaved={handleSaved} />}

            {/* KPI */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">📁</div><div><div className="stat-value">{filtered.length}</div><div className="stat-label">Tổng dự án</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{fmt(totalBase)}</div><div className="stat-label">Quỹ lương (50% DT)</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ fontSize: 14, color: 'var(--accent-primary)' }}>{fmt(totalEarned)}</div><div className="stat-label">Đã tích lũy</div></div></div>
            </div>

            {/* Bảng tổng hợp theo người */}
            <SummaryTable items={allItems} />

            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <input className="form-input" placeholder="🔍 Tìm dự án..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {['all', ...Object.keys(STATUS_LABELS)].map(st => (
                            <button key={st} onClick={() => setStatusFilter(st)} style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid',
                                background: statusFilter === st ? 'var(--accent-primary)' : 'transparent',
                                color: statusFilter === st ? '#fff' : 'var(--text-secondary)',
                                borderColor: statusFilter === st ? 'var(--accent-primary)' : 'var(--border)',
                            }}>{st === 'all' ? 'Tất cả' : st}</button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dự án</div>
                ) : (
                    <div style={{ padding: '0 0 16px' }}>
                        {filtered.map(project => {
                            const { revenue, base, earned, pctDone } = getSalaryInfo(project);
                            const stages = getStages(project);
                            const assignees = getAssignees(project);
                            const isExpanded = expanded[project.id];
                            const statusInfo = STATUS_LABELS[project.status] || {};
                            const hasOverride = project.salaryProgress?.contractValueOverride != null;

                            // Tổng hợp lương trong dự án này
                            const projectItems = STAGES
                                .filter(s => stages[s.key])
                                .map(s => ({ assignee: assignees[s.key] || '', amount: base * s.pct / 100 }));

                            return (
                                <div key={project.id} style={{ borderBottom: '1px solid var(--border)', margin: '0 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                                        <span style={{ fontSize: 16, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleExpand(project)}>{isExpanded ? '▾' : '▸'}</span>
                                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleExpand(project)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-primary)' }}>{project.code}</span>
                                                {project.status && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${statusInfo.color}22`, color: statusInfo.color, border: `1px solid ${statusInfo.color}44` }}>{project.status}</span>}
                                                {hasOverride && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f59e0b22', color: '#d97706', border: '1px solid #f59e0b44' }}>GT tùy chỉnh</span>}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</div>
                                            {project.salaryProgress?.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{project.salaryProgress.notes}</div>}
                                        </div>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Doanh thu</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(revenue)}</div></div>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quỹ lương (50%)</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(base)}</div></div>
                                        <div style={{ textAlign: 'right', minWidth: 130 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã tích lũy ({pctDone}%)</div><div style={{ fontSize: 13, fontWeight: 700, color: earned > 0 ? '#16a34a' : 'var(--text-muted)' }}>{fmt(earned)}</div></div>
                                        <div style={{ width: 70 }}><div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', background: '#16a34a', width: `${pctDone}%`, borderRadius: 3, transition: 'width 0.3s' }} /></div></div>
                                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                            <button onClick={e => { e.stopPropagation(); setEditProject(project); }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}>Sửa</button>
                                            <button onClick={e => { e.stopPropagation(); deleteProgress(project); }} disabled={deleting[project.id] || !project.salaryProgress} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', opacity: !project.salaryProgress ? 0.35 : 1 }}>{deleting[project.id] ? '...' : 'Xóa'}</button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '8px 0 16px 28px' }}>
                                            <StageList
                                                base={base}
                                                stages={stages}
                                                assignees={assignees}
                                                users={users}
                                                onToggle={(key) => toggleStage(project, key)}
                                                onAssigneeChange={(key, val) => handleAssigneeChange(project, key, val)}
                                            />
                                            {/* Mini bảng tổng hợp trong dự án */}
                                            <SummaryTable items={projectItems} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────── TAB 2: MỤC LƯƠNG THỦ CÔNG ───────────────────────
const EMPTY_FORM = { code: '', name: '', contractValue: '', notes: '' };

function TabThuCong() {
    const users = useDesignUsers();
    const [entries, setEntries]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [expanded, setExpanded] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [form, setForm]         = useState(EMPTY_FORM);
    const [editId, setEditId]     = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState({});
    const [localAssignees, setLocalAssignees] = useState({});
    const saveTimers = useRef({});

    const load = useCallback(() => {
        fetch('/api/salary/entries').then(r => r.json()).then(d => {
            const list = d.data || [];
            setEntries(list);
            const init = {};
            list.forEach(e => { init[e.id] = parseJSON(e.assignees); });
            setLocalAssignees(init);
            setLoading(false);
        });
    }, []);

    useEffect(() => { load(); }, [load]);

    const getStages    = (e) => parseJSON(e.stages);
    const getAssignees = (e) => localAssignees[e.id] || parseJSON(e.assignees);

    const getSalaryInfo = (entry) => {
        const revenue = entry.contractValue || 0;
        const base = revenue * 0.5;
        const stages = getStages(entry);
        const earned = STAGES.reduce((sum, s) => sum + (stages[s.key] ? base * s.pct / 100 : 0), 0);
        const pctDone = STAGES.reduce((sum, s) => sum + (stages[s.key] ? s.pct : 0), 0);
        return { revenue, base, earned, pctDone };
    };

    const saveFull = useCallback(async (entry, newStages, newAssignees) => {
        await fetch(`/api/salary/entries/${entry.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: entry.code, name: entry.name, contractValue: entry.contractValue, notes: entry.notes, stages: newStages, assignees: newAssignees }),
        });
    }, []);

    const toggleStage = async (entry, stageKey) => {
        const current = getStages(entry);
        const updated = { ...current, [stageKey]: !current[stageKey] };
        setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, stages: JSON.stringify(updated) } : e));
        await saveFull(entry, updated, getAssignees(entry));
    };

    const handleAssigneeChange = (entry, stageKey, value) => {
        const updated = { ...getAssignees(entry), [stageKey]: value };
        setLocalAssignees(prev => ({ ...prev, [entry.id]: updated }));
        clearTimeout(saveTimers.current[entry.id]);
        saveTimers.current[entry.id] = setTimeout(() => {
            saveFull(entry, getStages(entry), updated);
        }, 800);
    };

    // Khi thu lại row: flush debounce và lưu ngay
    const toggleExpand = (entry) => {
        const isOpen = expanded[entry.id];
        if (isOpen) {
            clearTimeout(saveTimers.current[entry.id]);
            saveFull(entry, getStages(entry), getAssignees(entry));
        }
        setExpanded(e => ({ ...e, [entry.id]: !e[entry.id] }));
    };

    const openEdit = (entry) => {
        setForm({ code: entry.code, name: entry.name, contractValue: entry.contractValue, notes: entry.notes || '' });
        setEditId(entry.id);
        setShowForm(true);
    };

    const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); setEditId(null); };

    const submit = async () => {
        if (!form.code || !form.name) return;
        setSubmitting(true);
        const body = { ...form, contractValue: parseFloat(form.contractValue) || 0 };
        if (editId) {
            const entry = entries.find(e => e.id === editId);
            body.stages = parseJSON(entry?.stages);
            body.assignees = getAssignees(entry || {});
            await fetch(`/api/salary/entries/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } else {
            await fetch('/api/salary/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
        setSubmitting(false);
        closeForm();
        load();
    };

    const deleteEntry = async (id) => {
        if (!confirm('Xóa mục này?')) return;
        setDeleting(d => ({ ...d, [id]: true }));
        await fetch(`/api/salary/entries/${id}`, { method: 'DELETE' });
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const totalEarned = entries.reduce((s, e) => s + getSalaryInfo(e).earned, 0);
    const totalBase   = entries.reduce((s, e) => s + getSalaryInfo(e).base, 0);

    const allItems = entries.flatMap(entry => {
        const base = (entry.contractValue || 0) * 0.5;
        const stages = getStages(entry);
        const assignees = getAssignees(entry);
        return STAGES.filter(s => stages[s.key]).map(s => ({ assignee: assignees[s.key] || '', amount: base * s.pct / 100 }));
    });

    return (
        <div>
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card"><div className="stat-icon">📋</div><div><div className="stat-value">{entries.length}</div><div className="stat-label">Mục thủ công</div></div></div>
                <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{fmt(totalBase)}</div><div className="stat-label">Quỹ lương (50% DT)</div></div></div>
                <div className="stat-card"><div className="stat-icon">✅</div><div><div className="stat-value" style={{ fontSize: 14, color: 'var(--accent-primary)' }}>{fmt(totalEarned)}</div><div className="stat-label">Đã tích lũy</div></div></div>
            </div>

            <SummaryTable items={allItems} />

            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}>+ Thêm mục</button>
                </div>

                {showForm && (
                    <div style={{ margin: '0 16px 16px', padding: 16, borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 12 }}>{editId ? 'Sửa mục lương' : 'Thêm mục lương'}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Mã *</div><input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="VD: HDB-01" /></div>
                            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Tên *</div><input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Tên dự án" /></div>
                            <div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Giá trị HĐ (VND)</div><input className="form-input" type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))} placeholder="0" /></div>
                        </div>
                        <div style={{ marginBottom: 10 }}><div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Ghi chú</div><input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." /></div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={closeForm}>Hủy</button>
                            <button className="btn btn-primary" onClick={submit} disabled={submitting || !form.code || !form.name}>{submitting ? 'Đang lưu...' : (editId ? 'Cập nhật' : 'Thêm')}</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : entries.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có mục lương thủ công</div>
                ) : (
                    <div style={{ padding: '0 0 16px' }}>
                        {entries.map(entry => {
                            const { revenue, base, earned, pctDone } = getSalaryInfo(entry);
                            const stages = getStages(entry);
                            const assignees = getAssignees(entry);
                            const isExpanded = expanded[entry.id];
                            const projectItems = STAGES.filter(s => stages[s.key]).map(s => ({ assignee: assignees[s.key] || '', amount: base * s.pct / 100 }));

                            return (
                                <div key={entry.id} style={{ borderBottom: '1px solid var(--border)', margin: '0 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                                        <span style={{ fontSize: 16, cursor: 'pointer' }} onClick={() => toggleExpand(entry)}>{isExpanded ? '▾' : '▸'}</span>
                                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => toggleExpand(entry)}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent-primary)' }}>{entry.code}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{entry.name}</div>
                                            {entry.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{entry.notes}</div>}
                                        </div>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Doanh thu</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(revenue)}</div></div>
                                        <div style={{ textAlign: 'right', minWidth: 110 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Quỹ lương (50%)</div><div style={{ fontSize: 12, fontWeight: 600 }}>{fmt(base)}</div></div>
                                        <div style={{ textAlign: 'right', minWidth: 130 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã tích lũy ({pctDone}%)</div><div style={{ fontSize: 13, fontWeight: 700, color: earned > 0 ? '#16a34a' : 'var(--text-muted)' }}>{fmt(earned)}</div></div>
                                        <div style={{ width: 70 }}><div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}><div style={{ height: '100%', background: '#16a34a', width: `${pctDone}%`, borderRadius: 3, transition: 'width 0.3s' }} /></div></div>
                                        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                                            <button onClick={() => openEdit(entry)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)' }}>Sửa</button>
                                            <button onClick={() => deleteEntry(entry.id)} disabled={deleting[entry.id]} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', border: '1px solid #dc2626', background: 'transparent', color: '#dc2626' }}>{deleting[entry.id] ? '...' : 'Xóa'}</button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ padding: '8px 0 16px 28px' }}>
                                            <StageList
                                                base={base}
                                                stages={stages}
                                                assignees={assignees}
                                                users={users}
                                                onToggle={(key) => toggleStage(entry, key)}
                                                onAssigneeChange={(key, val) => handleAssigneeChange(entry, key, val)}
                                            />
                                            <SummaryTable items={projectItems} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────── ROOT PAGE ───────────────────────────
export default function LuongPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [tab, setTab] = useState('du_an');

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated' || session?.user?.email !== ALLOWED_EMAIL) router.replace('/');
    }, [status, session, router]);

    if (status === 'loading' || session?.user?.email !== ALLOWED_EMAIL) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    }

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>Bảng tính lương — Phòng Thiết Kế Kiến Trúc</h1>
            </div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
                {[{ key: 'du_an', label: 'Dự án trong hệ thống' }, { key: 'thu_cong', label: 'Mục thủ công' }].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'none',
                        borderBottom: tab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                        color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        marginBottom: -2, transition: 'all 0.15s',
                    }}>{t.label}</button>
                ))}
            </div>
            {tab === 'du_an'    && <TabDuAn />}
            {tab === 'thu_cong' && <TabThuCong />}
        </div>
    );
}
