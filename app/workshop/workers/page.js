'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const todayStr = () => new Date().toISOString().split('T')[0];
const fmtDateVN = (str) => {
    if (!str) return '';
    const d = new Date(str);
    return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
};

const STATUS_OPTS = ['Hoạt động', 'Tạm nghỉ', 'Nghỉ việc'];
const STATUS_COLOR = { 'Hoạt động': '#16a34a', 'Tạm nghỉ': '#d97706', 'Nghỉ việc': '#6b7280' };
const STATUS_BG   = { 'Hoạt động': '#dcfce7', 'Tạm nghỉ': '#fef3c7', 'Nghỉ việc': '#f3f4f6' };

const WORKER_TYPES = ['Thợ chính', 'Thợ phụ'];
const WORKER_TYPE_COLOR = { 'Thợ chính': '#1d4ed8', 'Thợ phụ': '#6d28d9' };
const WORKER_TYPE_BG    = { 'Thợ chính': '#dbeafe', 'Thợ phụ': '#ede9fe' };
const EMPTY_FORM = { name: '', workerType: 'Thợ chính', skill: '', phone: '', hourlyRate: '', status: 'Hoạt động', notes: '', zaloUserId: '' };

export default function WorkersPage() {
    const router = useRouter();
    const { role } = useRole();
    const [workers, setWorkers] = useState([]);
    const [workerTasks, setWorkerTasks] = useState({});
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [attendTarget, setAttendTarget] = useState(null);
    const [attendForm, setAttendForm] = useState({ hoursWorked: 8, notes: '' });
    const [userList, setUserList] = useState([]);
    const [nameSuggest, setNameSuggest] = useState([]);
    const [showSuggest, setShowSuggest] = useState(false);
    const [allTasks, setAllTasks] = useState([]);
    const [currentWorkTarget, setCurrentWorkTarget] = useState(null);
    const [currentWorkTaskIds, setCurrentWorkTaskIds] = useState([]);
    const [savingCurrentWork, setSavingCurrentWork] = useState(false);
    const [projects, setProjects] = useState([]);
    const [showAddTask, setShowAddTask] = useState(false);
    const [newTaskForm, setNewTaskForm] = useState({ title: '', projectId: '', deadline: '', category: 'Lắp ghép tại xưởng' });

    // ── Tổng hợp tháng ───────────────────────────────────────────────────────
    const [showSummary, setShowSummary] = useState(false);
    const [summaryMonth, setSummaryMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [summaryAttendance, setSummaryAttendance] = useState([]);
    const [summaryOvertimes, setSummaryOvertimes] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);

    // ── Tăng ca ──────────────────────────────────────────────────────────────
    const [overtimes, setOvertimes] = useState([]);
    const [overtimeTarget, setOvertimeTarget] = useState(null);
    const [overtimeEditId, setOvertimeEditId] = useState(null);
    const [overtimeForm, setOvertimeForm] = useState({ hours: 2, rateMultiplier: 1.5, reason: '', notes: '' });
    const [savingOT, setSavingOT] = useState(false);
    const [showOvertimeList, setShowOvertimeList] = useState(false);
    const [overtimeMonth, setOvertimeMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [monthlyOvertimes, setMonthlyOvertimes] = useState([]);
    const [loadingOT, setLoadingOT] = useState(false);

    useEffect(() => {
        fetch('/api/users').then(r => r.json()).then(d => setUserList(Array.isArray(d) ? d : []));
        fetch('/api/projects?limit=200').then(r => r.json()).then(d => setProjects(Array.isArray(d?.data) ? d.data : []));
    }, []);

    const fetchWorkers = async () => {
        const [wRes, tRes] = await Promise.all([
            fetch('/api/workshop/workers'),
            fetch('/api/workshop/tasks?status=Đang làm'),
        ]);
        const [w, t] = await Promise.all([wRes.json(), tRes.json()]);
        setWorkers(Array.isArray(w) ? w : []);
        const taskMap = {};
        if (Array.isArray(t)) {
            setAllTasks(t);
            t.forEach(task => {
                task.workers?.forEach(tw => {
                    if (!taskMap[tw.workerId]) taskMap[tw.workerId] = [];
                    taskMap[tw.workerId].push(task);
                });
            });
        }
        setWorkerTasks(taskMap);
    };

    const fetchAttendance = async (date) => {
        const res = await fetch(`/api/workshop/attendance?date=${date}`);
        const data = await res.json();
        setAttendance(Array.isArray(data) ? data : []);
    };

    const fetchMonthlySummary = async (month) => {
        setLoadingSummary(true);
        const [attRes, otRes] = await Promise.all([
            fetch(`/api/workshop/attendance?month=${month}`),
            fetch(`/api/workshop/overtimes?month=${month}`),
        ]);
        const [attData, otData] = await Promise.all([attRes.json(), otRes.json()]);
        setSummaryAttendance(Array.isArray(attData) ? attData : []);
        setSummaryOvertimes(Array.isArray(otData) ? otData : []);
        setLoadingSummary(false);
    };

    const fetchOvertimes = async (date) => {
        const res = await fetch(`/api/workshop/overtimes?date=${date}`);
        const data = await res.json();
        setOvertimes(Array.isArray(data) ? data : []);
    };

    const fetchMonthlyOvertimes = async (month) => {
        setLoadingOT(true);
        const res = await fetch(`/api/workshop/overtimes?month=${month}`);
        const data = await res.json();
        setMonthlyOvertimes(Array.isArray(data) ? data : []);
        setLoadingOT(false);
    };

    useEffect(() => {
        if (showSummary) fetchMonthlySummary(summaryMonth);
    }, [summaryMonth, showSummary]);

    useEffect(() => {
        if (showOvertimeList) fetchMonthlyOvertimes(overtimeMonth);
    }, [overtimeMonth, showOvertimeList]);

    const fetchAll = async () => {
        setLoading(true);
        await Promise.all([fetchWorkers(), fetchAttendance(selectedDate), fetchOvertimes(selectedDate)]);
        setLoading(false);
    };

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/');
            return;
        }
        fetchAll();
    }, [role]);

    // Khi đổi ngày → refetch chấm công + tăng ca
    useEffect(() => {
        fetchAttendance(selectedDate);
        fetchOvertimes(selectedDate);
    }, [selectedDate]);

    const onNameChange = (val) => {
        setForm(f => ({ ...f, name: val }));
        if (val.trim().length >= 1) {
            const matches = userList.filter(u =>
                u.name.toLowerCase().includes(val.toLowerCase())
            );
            setNameSuggest(matches);
            setShowSuggest(matches.length > 0);
        } else {
            setShowSuggest(false);
        }
    };

    const selectUser = (u) => {
        setForm(f => ({
            ...f,
            name: u.name,
            skill: u.department || f.skill,
            phone: u.phone || f.phone,
        }));
        setShowSuggest(false);
    };

    const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setShowModal(true); setShowSuggest(false); };
    const openEdit = (w) => {
        setEditTarget(w);
        setForm({ name: w.name, workerType: w.workerType || 'Thợ chính', skill: w.skill, phone: w.phone, hourlyRate: w.hourlyRate, status: w.status, notes: w.notes, zaloUserId: w.zaloUserId || '' });
        setShowModal(true);
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            const payload = { ...form, hourlyRate: Number(form.hourlyRate) || 0 };
            const url = editTarget ? `/api/workshop/workers/${editTarget.id}` : '/api/workshop/workers';
            await fetch(url, { method: editTarget ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setShowModal(false);
            fetchAll();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        await fetch(`/api/workshop/workers/${deleteTarget.id}`, { method: 'DELETE' });
        setDeleteTarget(null);
        fetchAll();
    };

    const openAttend = (w) => {
        const existing = attendance.find(a => a.workerId === w.id);
        setAttendTarget(w);
        setAttendForm({ hoursWorked: existing?.hoursWorked ?? 8, notes: existing?.notes ?? '' });
    };

    const handleAttend = async () => {
        await fetch('/api/workshop/attendance', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerId: attendTarget.id, date: selectedDate, ...attendForm }),
        });
        setAttendTarget(null);
        fetchAttendance(selectedDate);
    };

    // Chấm công nhanh toàn bộ nhân công đang hoạt động với 8h
    const handleBulkAttend = async () => {
        const active = workers.filter(w => w.status === 'Hoạt động');
        if (!active.length) return;
        if (!confirm(`Chấm công ${active.length} nhân công với 8 giờ cho ngày ${fmtDateVN(selectedDate)}?`)) return;
        await Promise.all(active.map(w =>
            fetch('/api/workshop/attendance', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workerId: w.id, date: selectedDate, hoursWorked: 8, notes: '' }),
            })
        ));
        fetchAttendance(selectedDate);
    };

    const openCurrentWork = (w) => {
        const assigned = allTasks.filter(t => t.workers?.some(tw => tw.workerId === w.id)).map(t => t.id);
        setCurrentWorkTarget(w);
        setCurrentWorkTaskIds(assigned);
        setShowAddTask(false);
        setNewTaskForm({ title: '', projectId: '', deadline: '', category: 'Lắp ghép tại xưởng' });
    };

    const addNewTask = async () => {
        if (!newTaskForm.title.trim()) return;
        setSavingCurrentWork(true);
        try {
            const res = await fetch('/api/workshop/tasks', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTaskForm.title.trim(),
                    projectId: newTaskForm.projectId || null,
                    deadline: newTaskForm.deadline || null,
                    category: newTaskForm.category || 'Lắp ghép tại xưởng',
                    status: 'Đang làm',
                    workerIds: [currentWorkTarget.id],
                }),
            });
            const created = await res.json();
            setAllTasks(prev => [...prev, created]);
            setCurrentWorkTaskIds(prev => [...prev, created.id]);
            setShowAddTask(false);
            setNewTaskForm({ title: '', projectId: '', deadline: '', category: 'Lắp ghép tại xưởng' });
        } finally { setSavingCurrentWork(false); }
    };

    const toggleCurrentWorkTask = (taskId) => {
        setCurrentWorkTaskIds(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const saveCurrentWork = async () => {
        setSavingCurrentWork(true);
        try {
            const workerId = currentWorkTarget.id;
            const originalIds = allTasks.filter(t => t.workers?.some(tw => tw.workerId === workerId)).map(t => t.id);
            const added = currentWorkTaskIds.filter(id => !originalIds.includes(id));
            const removed = originalIds.filter(id => !currentWorkTaskIds.includes(id));
            const changed = [...new Set([...added, ...removed])];
            await Promise.all(changed.map(taskId => {
                const task = allTasks.find(t => t.id === taskId);
                const currentWorkerIds = task.workers?.map(tw => tw.workerId) || [];
                let newWorkerIds;
                if (currentWorkTaskIds.includes(taskId)) {
                    newWorkerIds = [...new Set([...currentWorkerIds, workerId])];
                } else {
                    newWorkerIds = currentWorkerIds.filter(id => id !== workerId);
                }
                return fetch(`/api/workshop/tasks/${taskId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workerIds: newWorkerIds }),
                });
            }));
            setCurrentWorkTarget(null);
            fetchWorkers();
        } finally { setSavingCurrentWork(false); }
    };

    // ── Tăng ca ──────────────────────────────────────────────────────────────
    const openOvertime = (w) => {
        setOvertimeTarget(w);
        setOvertimeEditId(null);
        setOvertimeForm({ hours: 2, rateMultiplier: 1.5, reason: '', notes: '' });
    };

    const openOvertimeEdit = (ot) => {
        const w = workers.find(x => x.id === ot.workerId) || { id: ot.workerId, name: ot.worker?.name || '', hourlyRate: ot.worker?.hourlyRate || 0 };
        setOvertimeTarget(w);
        setOvertimeEditId(ot.id);
        setOvertimeForm({ hours: ot.hours, rateMultiplier: ot.rateMultiplier, reason: ot.reason || '', notes: ot.notes || '' });
    };

    const handleSaveOvertime = async () => {
        setSavingOT(true);
        try {
            if (overtimeEditId) {
                await fetch(`/api/workshop/overtimes/${overtimeEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(overtimeForm),
                });
            } else {
                await fetch('/api/workshop/overtimes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ workerId: overtimeTarget.id, date: selectedDate, ...overtimeForm }),
                });
            }
            setOvertimeTarget(null);
            setOvertimeEditId(null);
            fetchOvertimes(selectedDate);
            if (showOvertimeList) fetchMonthlyOvertimes(overtimeMonth);
        } finally { setSavingOT(false); }
    };

    const handleDeleteOT = async (id) => {
        if (!confirm('Xóa bản ghi tăng ca này?')) return;
        await fetch(`/api/workshop/overtimes/${id}`, { method: 'DELETE' });
        fetchOvertimes(selectedDate);
        if (showOvertimeList) fetchMonthlyOvertimes(overtimeMonth);
    };

    const isToday = selectedDate === todayStr();
    const filtered = workers.filter(w =>
        !search || w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.skill?.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = workers.filter(w => w.status === 'Hoạt động').length;
    const attendedCount = attendance.length;
    const totalHours = attendance.reduce((s, a) => s + a.hoursWorked, 0);
    // dailyRate: hourlyRate field giờ lưu đơn giá/ngày
    const totalCost = attendance.reduce((s, a) => s + (a.hoursWorked / 8) * (a.worker?.hourlyRate || 0), 0);
    const monthlyPayroll = workers.filter(w => w.status === 'Hoạt động').reduce((s, w) => s + w.hourlyRate * 26, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>👷 Nhân công hoạt động</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{activeCount}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {workers.length} tổng cộng</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>✅ Chấm công{isToday ? ' hôm nay' : ''}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>{attendedCount}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalHours} giờ làm việc</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>💵 Chi phí{isToday ? ' hôm nay' : ''}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{new Intl.NumberFormat('vi-VN').format(Math.round(totalCost / 1000))}k</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Theo ngày × đơn giá</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>📅 Quỹ lương/tháng</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6' }}>{new Intl.NumberFormat('vi-VN').format(Math.round(monthlyPayroll / 1e6))}tr</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>× 26 ngày/tháng</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách nhân công</h3>
                    <button className="btn btn-primary" onClick={openAdd}>+ Thêm thợ</button>
                </div>
                <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                    <input className="form-input" placeholder="🔍 Tìm theo tên, tay nghề..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
                    {/* Bộ chọn ngày chấm công */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() - 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }}>◀</button>
                        <div style={{ position: 'relative' }}>
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                                style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', background: 'var(--bg-card)', cursor: 'pointer' }} />
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => {
                            const d = new Date(selectedDate);
                            d.setDate(d.getDate() + 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }}>▶</button>
                        {!isToday && (
                            <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb', fontWeight: 600 }} onClick={() => setSelectedDate(todayStr())}>
                                Hôm nay
                            </button>
                        )}
                    </div>
                    <button className="btn btn-sm" style={{ background: '#dcfce7', color: '#15803d', border: 'none', fontWeight: 600, flexShrink: 0 }} onClick={handleBulkAttend}>
                        ✅ Chấm tất cả 8h
                    </button>
                </div>

                {/* Tiêu đề ngày đang xem */}
                <div style={{ padding: '8px 16px', background: isToday ? '#eff6ff' : '#fef9c3', borderBottom: '1px solid var(--border-light)', fontSize: 12, color: isToday ? '#1d4ed8' : '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    📅 {isToday ? 'Hôm nay — ' : ''}{fmtDateVN(selectedDate)}
                    <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--text-muted)' }}>
                        {attendedCount}/{activeCount} đã chấm · {totalHours}h · {new Intl.NumberFormat('vi-VN').format(Math.round(totalCost / 1000))}k
                    </span>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <>
                    {/* Desktop table */}
                    <div className="desktop-table-view">
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Họ tên</th>
                                        <th>Tay nghề</th>
                                        <th>SĐT</th>
                                        <th>Đơn giá/ngày</th>
                                        <th>Việc hiện tại</th>
                                        <th>Chấm công</th>
                                        <th>Trạng thái</th>
                                        <th style={{ textAlign: 'right' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(w => {
                                        const rec = attendance.find(a => a.workerId === w.id);
                                        const currentTasks = workerTasks[w.id] || [];
                                        return (
                                            <tr key={w.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{w.name}</div>
                                                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: WORKER_TYPE_BG[w.workerType] || '#f3f4f6', color: WORKER_TYPE_COLOR[w.workerType] || '#374151', fontWeight: 600 }}>
                                                        {w.workerType || 'Thợ chính'}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12 }}>{w.skill || '—'}</td>
                                                <td style={{ fontSize: 12 }}>{w.phone || '—'}</td>
                                                <td style={{ fontWeight: 600, fontSize: 13 }}>
                                                    {w.hourlyRate > 0 ? `${new Intl.NumberFormat('vi-VN').format(w.hourlyRate)}đ/ngày` : '—'}
                                                </td>
                                                <td style={{ fontSize: 12 }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, cursor: 'pointer' }} onClick={() => openCurrentWork(w)} title="Nhấn để sửa việc hiện tại">
                                                        <div style={{ flex: 1 }}>
                                                            {currentTasks.length > 0
                                                                ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                    {currentTasks.slice(0, 2).map(t => (
                                                                        <span key={t.id} style={{ padding: '1px 6px', borderRadius: 8, background: '#dbeafe', color: '#1d4ed8', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{t.title}</span>
                                                                    ))}
                                                                    {currentTasks.length > 2 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{currentTasks.length - 2} việc</span>}
                                                                  </div>
                                                                : <span style={{ color: 'var(--text-muted)' }}>Rảnh</span>
                                                            }
                                                        </div>
                                                        <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0, marginTop: 1 }}>✏️</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                        {rec ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span style={{ padding: '2px 10px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontSize: 12, fontWeight: 700 }}>
                                                                    ✓ {rec.hoursWorked}h
                                                                </span>
                                                                {(rec.worker?.hourlyRate || w.hourlyRate) > 0 && (
                                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                        {new Intl.NumberFormat('vi-VN').format((rec.hoursWorked / 8) * (rec.worker?.hourlyRate || w.hourlyRate))}đ
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            w.status === 'Hoạt động'
                                                                ? <span style={{ color: '#dc2626', fontSize: 12 }}>Chưa chấm</span>
                                                                : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                                                        )}
                                                        {(() => {
                                                            const wOTs = overtimes.filter(o => o.workerId === w.id);
                                                            if (!wOTs.length) return null;
                                                            const totalH = wOTs.reduce((s, o) => s + o.hours, 0);
                                                            return (
                                                                <span style={{ padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700, width: 'fit-content' }}>
                                                                    ⏰ +{totalH}h OT
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ padding: '3px 9px', borderRadius: 20, background: STATUS_BG[w.status] || '#f3f4f6', color: STATUS_COLOR[w.status] || '#6b7280', fontSize: 12, fontWeight: 600 }}>
                                                        {w.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                        {w.status === 'Hoạt động' && (
                                                            <button className="btn btn-sm" style={{ background: rec ? '#dcfce7' : '#dbeafe', color: rec ? '#15803d' : '#1d4ed8', border: 'none', fontWeight: 600 }} onClick={() => openAttend(w)}>
                                                                {rec ? '✓ Sửa' : '+ Chấm'}
                                                            </button>
                                                        )}
                                                        {w.status === 'Hoạt động' && (
                                                            <button className="btn btn-sm" style={{ background: '#fef3c7', color: '#d97706', border: 'none', fontWeight: 600 }} onClick={() => openOvertime(w)} title="Ghi tăng ca">
                                                                ⏰ OT
                                                            </button>
                                                        )}
                                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}>✏️</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(w)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>Chưa có nhân công nào</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile */}
                    <div className="mobile-card-list">
                        {filtered.map(w => {
                            const rec = attendance.find(a => a.workerId === w.id);
                            const currentTasks = workerTasks[w.id] || [];
                            return (
                                <div key={w.id} className="mobile-card-item">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <div>
                                            <div className="card-title">{w.name}</div>
                                            <div className="card-subtitle">{w.skill || 'Chưa ghi tay nghề'} · {w.phone || '—'}</div>
                                        </div>
                                        <span style={{ padding: '3px 9px', borderRadius: 20, background: STATUS_BG[w.status], color: STATUS_COLOR[w.status], fontSize: 11, fontWeight: 600, height: 'fit-content' }}>
                                            {w.status}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{w.hourlyRate > 0 ? `${new Intl.NumberFormat('vi-VN').format(w.hourlyRate)}đ/ngày` : 'Chưa có đơn giá'}</span>
                                        {rec
                                            ? <span style={{ color: '#15803d', fontWeight: 600 }}>✓ {rec.hoursWorked}h · {new Intl.NumberFormat('vi-VN').format((rec.hoursWorked / 8) * (rec.worker?.hourlyRate || w.hourlyRate))}đ</span>
                                            : <span style={{ color: '#dc2626' }}>Chưa chấm công</span>}
                                    </div>
                                    {currentTasks.length > 0 && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                                            Đang làm: {currentTasks.map(t => t.title).join(', ')}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {w.status === 'Hoạt động' && <button className="btn btn-sm" onClick={() => openAttend(w)}>{rec ? '✓ Sửa' : '+ Chấm công'}</button>}
                                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}>✏️</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(w)} style={{ color: 'var(--status-danger)' }}>🗑️</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </>
                )}
            </div>

            {/* Nút toggle */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    className={`btn btn-sm ${showSummary ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontWeight: 600 }}
                    onClick={() => setShowSummary(v => !v)}
                >
                    📊 {showSummary ? 'Ẩn' : 'Xem'} bảng tổng hợp tháng
                </button>
                <button
                    className={`btn btn-sm ${showOvertimeList ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontWeight: 600, ...(showOvertimeList ? { background: '#f59e0b', borderColor: '#f59e0b' } : {}) }}
                    onClick={() => setShowOvertimeList(v => !v)}
                >
                    ⏰ {showOvertimeList ? 'Ẩn' : 'Xem'} danh sách tăng ca
                </button>
            </div>

            {/* Bảng tổng hợp tháng */}
            {showSummary && (() => {
                const [y, m] = summaryMonth.split('-').map(Number);
                const daysInMonth = new Date(y, m, 0).getDate();
                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                // attendance lookup: {workerId: {day: hoursWorked}}
                const byWorkerDay = {};
                summaryAttendance.forEach(a => {
                    if (!byWorkerDay[a.workerId]) byWorkerDay[a.workerId] = {};
                    const day = new Date(a.date).getUTCDate();
                    byWorkerDay[a.workerId][day] = a.hoursWorked;
                });

                // overtime lookup: {workerId: {day: totalOTHours}}
                const byWorkerDayOT = {};
                summaryOvertimes.forEach(o => {
                    if (!byWorkerDayOT[o.workerId]) byWorkerDayOT[o.workerId] = {};
                    const day = new Date(o.date).getUTCDate();
                    byWorkerDayOT[o.workerId][day] = (byWorkerDayOT[o.workerId][day] || 0) + o.hours;
                });

                // Only show workers who have any attendance OR are active
                const summaryWorkers = workers.filter(w =>
                    w.status !== 'Nghỉ việc' || byWorkerDay[w.id]
                );

                const cong = (h) => h / 8;
                const fmtCong = (h) => {
                    if (!h) return '';
                    const c = cong(h);
                    return c === Math.floor(c) ? String(c) : c.toFixed(1);
                };
                const cellBg = (h) => {
                    if (!h) return 'transparent';
                    const c = cong(h);
                    if (c >= 1) return '#dcfce7';
                    if (c >= 0.5) return '#fef9c3';
                    return '#fee2e2';
                };
                const cellColor = (h) => {
                    if (!h) return 'transparent';
                    const c = cong(h);
                    if (c >= 1) return '#15803d';
                    if (c >= 0.5) return '#92400e';
                    return '#dc2626';
                };

                // total per worker
                const workerTotal = (w) => {
                    const dayMap = byWorkerDay[w.id] || {};
                    const totalH = Object.values(dayMap).reduce((s, h) => s + h, 0);
                    const totalCong = Object.values(dayMap).reduce((s, h) => s + cong(h), 0);
                    const cost = Object.values(dayMap).reduce((s, h) => s + (cong(h) * w.hourlyRate), 0);
                    return { totalH, totalCong, cost };
                };

                const workerOTTotal = (w) => {
                    const wOTs = summaryOvertimes.filter(o => o.workerId === w.id);
                    const totalH = wOTs.reduce((s, o) => s + o.hours, 0);
                    const cost = wOTs.reduce((s, o) => s + o.totalPay, 0);
                    return { totalH, cost };
                };

                // total per day (all workers)
                const dayTotal = (day) => {
                    let total = 0;
                    summaryWorkers.forEach(w => {
                        const h = byWorkerDay[w.id]?.[day] || 0;
                        total += cong(h);
                    });
                    return total;
                };

                const dayOTTotal = (day) => summaryWorkers.reduce((s, w) => s + (byWorkerDayOT[w.id]?.[day] || 0), 0);

                const grandTotal = summaryWorkers.reduce((s, w) => {
                    const { totalCong, totalH, cost } = workerTotal(w);
                    return { cong: s.cong + totalCong, hours: s.hours + totalH, cost: s.cost + cost };
                }, { cong: 0, hours: 0, cost: 0 });

                const grandOTTotal = summaryWorkers.reduce((s, w) => {
                    const { totalH, cost } = workerOTTotal(w);
                    return { hours: s.hours + totalH, cost: s.cost + cost };
                }, { hours: 0, cost: 0 });

                const prevMonth = () => {
                    const d = new Date(y, m - 2, 1);
                    setSummaryMonth(d.toISOString().slice(0, 7));
                };
                const nextMonth = () => {
                    const d = new Date(y, m, 1);
                    setSummaryMonth(d.toISOString().slice(0, 7));
                };

                // day of week label (for weekends)
                const dayOfWeek = (day) => new Date(y, m - 1, day).getDay(); // 0=Sun, 6=Sat
                const isWeekend = (day) => { const d = dayOfWeek(day); return d === 0 || d === 6; };

                return (
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <h3 style={{ margin: 0 }}>📊 Bảng tổng hợp công tháng</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◀</button>
                                <input type="month" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)}
                                    style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600 }} />
                                <button className="btn btn-ghost btn-sm" onClick={nextMonth}>▶</button>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
                                    {daysInMonth} ngày · {summaryWorkers.length} người
                                </span>
                            </div>
                        </div>

                        {loadingSummary ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-secondary)' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2, whiteSpace: 'nowrap', minWidth: 130, borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                                                Họ tên
                                            </th>
                                            {days.map(d => (
                                                <th key={d} style={{
                                                    padding: '5px 3px', textAlign: 'center', minWidth: 28,
                                                    borderBottom: '2px solid var(--border)',
                                                    color: isWeekend(d) ? '#dc2626' : 'var(--text-secondary)',
                                                    background: isWeekend(d) ? '#fff5f5' : 'var(--bg-secondary)',
                                                    fontWeight: isWeekend(d) ? 700 : 400,
                                                }}>
                                                    {d}
                                                </th>
                                            ))}
                                            <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid var(--border)', borderLeft: '2px solid var(--border)', whiteSpace: 'nowrap', color: '#16a34a', background: 'var(--bg-secondary)' }}>Tổng công</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', color: '#2563eb', background: 'var(--bg-secondary)' }}>Giờ làm</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', color: '#d97706', background: 'var(--bg-secondary)' }}>Giờ OT</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', color: '#8b5cf6', background: 'var(--bg-secondary)' }}>Thành tiền</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', color: '#ea580c', background: 'var(--bg-secondary)' }}>Tiền OT</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', color: '#0f172a', fontWeight: 800, background: '#f0fdf4' }}>Tổng nhận</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryWorkers.map((w, idx) => {
                                            const { totalH, totalCong, cost } = workerTotal(w);
                                            return (
                                                <tr key={w.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                                                    <td style={{
                                                        padding: '6px 12px', position: 'sticky', left: 0, zIndex: 1,
                                                        background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                                                        borderRight: '1px solid var(--border)',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{w.name}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{w.skill || ''}</div>
                                                    </td>
                                                    {days.map(d => {
                                                        const h = byWorkerDay[w.id]?.[d];
                                                        const otH = byWorkerDayOT[w.id]?.[d];
                                                        return (
                                                            <td key={d} style={{
                                                                padding: '3px 2px', textAlign: 'center',
                                                                background: h ? cellBg(h) : (isWeekend(d) ? '#fff5f5' : 'transparent'),
                                                                fontWeight: h ? 700 : 400,
                                                                color: h ? cellColor(h) : '#d1d5db',
                                                                borderRight: '1px solid var(--border-light)',
                                                                lineHeight: 1.2,
                                                            }}>
                                                                {h ? fmtCong(h) : '—'}
                                                                {otH ? <div style={{ fontSize: 9, color: '#d97706', fontWeight: 700 }}>+{otH}h</div> : null}
                                                            </td>
                                                        );
                                                    })}
                                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a', borderLeft: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
                                                        {totalCong > 0 ? (totalCong % 1 === 0 ? totalCong : totalCong.toFixed(1)) : '—'}
                                                    </td>
                                                    <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap' }}>
                                                        {totalH > 0 ? `${totalH}h` : '—'}
                                                    </td>
                                                    {(() => { const ot = workerOTTotal(w); return (
                                                        <>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#d97706', whiteSpace: 'nowrap' }}>
                                                            {ot.totalH > 0 ? `${ot.totalH}h` : '—'}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#8b5cf6', whiteSpace: 'nowrap' }}>
                                                            {cost > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(cost / 1000))}k` : '—'}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#ea580c', whiteSpace: 'nowrap' }}>
                                                            {ot.cost > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(ot.cost / 1000))}k` : '—'}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap', background: '#f0fdf4' }}>
                                                            {(cost + ot.cost) > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round((cost + ot.cost) / 1000))}k` : '—'}
                                                        </td>
                                                        </>
                                                    ); })()}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#f1f5f9', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                                            <td style={{
                                                padding: '8px 12px', position: 'sticky', left: 0,
                                                background: '#f1f5f9', zIndex: 1, borderRight: '1px solid var(--border)',
                                                fontWeight: 700, color: 'var(--text-secondary)',
                                            }}>Tổng / ngày</td>
                                            {days.map(d => {
                                                const total = dayTotal(d);
                                                const otTotal = dayOTTotal(d);
                                                return (
                                                    <td key={d} style={{
                                                        padding: '5px 2px', textAlign: 'center', fontSize: 11,
                                                        fontWeight: total > 0 ? 700 : 400,
                                                        color: total > 0 ? '#1d4ed8' : '#d1d5db',
                                                        background: isWeekend(d) ? '#e9f0ff' : '#f1f5f9',
                                                        borderRight: '1px solid var(--border-light)',
                                                        lineHeight: 1.2,
                                                    }}>
                                                        {total > 0 ? (total % 1 === 0 ? total : total.toFixed(1)) : '—'}
                                                        {otTotal > 0 ? <div style={{ fontSize: 9, color: '#d97706', fontWeight: 700 }}>+{otTotal}h</div> : null}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', borderLeft: '2px solid var(--border)', whiteSpace: 'nowrap', fontSize: 13 }}>
                                                {grandTotal.cong > 0 ? (grandTotal.cong % 1 === 0 ? grandTotal.cong : grandTotal.cong.toFixed(1)) : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#2563eb', whiteSpace: 'nowrap', fontSize: 13 }}>
                                                {grandTotal.hours > 0 ? `${grandTotal.hours}h` : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#d97706', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 }}>
                                                {grandOTTotal.hours > 0 ? `${grandOTTotal.hours}h` : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b5cf6', whiteSpace: 'nowrap', fontSize: 13 }}>
                                                {grandTotal.cost > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(grandTotal.cost / 1000))}k` : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#ea580c', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 }}>
                                                {grandOTTotal.cost > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(grandOTTotal.cost / 1000))}k` : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 800, background: '#f0fdf4' }}>
                                                {(grandTotal.cost + grandOTTotal.cost) > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round((grandTotal.cost + grandOTTotal.cost) / 1000))}k` : '—'}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                                {summaryWorkers.length === 0 && (
                                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Không có dữ liệu chấm công trong tháng này
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Chú thích */}
                        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#dcfce7', marginRight: 4, verticalAlign: 'middle' }}></span>1 công (8h)</span>
                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#fef9c3', marginRight: 4, verticalAlign: 'middle' }}></span>Nửa công (4-7h)</span>
                            <span><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#fee2e2', marginRight: 4, verticalAlign: 'middle' }}></span>Dưới nửa công</span>
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>Đỏ = Cuối tuần</span>
                        </div>
                    </div>
                );
            })()}

            {/* Danh sách tăng ca */}
            {showOvertimeList && (() => {
                const [oy, om] = overtimeMonth.split('-').map(Number);
                const prevOTMonth = () => { const d = new Date(oy, om - 2, 1); setOvertimeMonth(d.toISOString().slice(0, 7)); };
                const nextOTMonth = () => { const d = new Date(oy, om, 1); setOvertimeMonth(d.toISOString().slice(0, 7)); };
                const totalOTPay = monthlyOvertimes.reduce((s, o) => s + o.totalPay, 0);
                return (
                    <div className="card">
                        <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <h3 style={{ margin: 0 }}>⏰ Danh sách tăng ca</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button className="btn btn-ghost btn-sm" onClick={prevOTMonth}>◀</button>
                                <input type="month" value={overtimeMonth} onChange={e => setOvertimeMonth(e.target.value)}
                                    style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600 }} />
                                <button className="btn btn-ghost btn-sm" onClick={nextOTMonth}>▶</button>
                            </div>
                        </div>

                        {loadingOT ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : monthlyOvertimes.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Không có tăng ca trong tháng này</div>
                        ) : (
                            <>
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Nhân công</th>
                                            <th>Ngày</th>
                                            <th>Giờ OT</th>
                                            <th>Hệ số</th>
                                            <th>Thành tiền</th>
                                            <th>Lý do</th>
                                            <th style={{ textAlign: 'right' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {monthlyOvertimes.map(ot => (
                                            <tr key={ot.id}>
                                                <td style={{ fontWeight: 600, fontSize: 13 }}>{ot.worker?.name || '—'}</td>
                                                <td style={{ fontSize: 12 }}>{new Date(ot.date).toLocaleDateString('vi-VN')}</td>
                                                <td style={{ fontWeight: 700, color: '#d97706' }}>{ot.hours}h</td>
                                                <td style={{ fontSize: 12 }}>×{ot.rateMultiplier}</td>
                                                <td style={{ fontWeight: 700, color: '#8b5cf6' }}>{new Intl.NumberFormat('vi-VN').format(Math.round(ot.totalPay))}đ</td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ot.reason || '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => openOvertimeEdit(ot)}>✏️</button>
                                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }} onClick={() => handleDeleteOT(ot.id)}>🗑️</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
                                <span>Tổng: <strong>{monthlyOvertimes.length}</strong> bản ghi</span>
                                <span style={{ color: '#d97706' }}>Tổng giờ OT: <strong>{monthlyOvertimes.reduce((s, o) => s + o.hours, 0)}h</strong></span>
                                <span style={{ color: '#8b5cf6' }}>Tổng tiền OT: <strong>{new Intl.NumberFormat('vi-VN').format(Math.round(totalOTPay / 1000))}k</strong></span>
                            </div>
                            </>
                        )}
                    </div>
                );
            })()}

            {/* Modal thêm/sửa nhân công */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3>{editTarget ? `Sửa — ${editTarget.name}` : 'Thêm nhân công'}</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label className="form-label">Họ tên *</label>
                                <input
                                    className="form-input"
                                    value={form.name}
                                    onChange={e => onNameChange(e.target.value)}
                                    onFocus={() => form.name && setShowSuggest(nameSuggest.length > 0)}
                                    onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                                    placeholder="Nhập tên hoặc chọn từ danh sách..."
                                    autoComplete="off"
                                />
                                {showSuggest && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                        maxHeight: 200, overflowY: 'auto', marginTop: 2,
                                    }}>
                                        {nameSuggest.map(u => (
                                            <div key={u.id} onMouseDown={() => selectUser(u)}
                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border-light)' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                                                    {u.name.split(' ').pop()[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email} · {u.department || u.role}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Loại thợ</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {WORKER_TYPES.map(t => (
                                            <button key={t} type="button"
                                                onClick={() => setForm(f => ({ ...f, workerType: t }))}
                                                style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `2px solid ${form.workerType === t ? WORKER_TYPE_COLOR[t] : 'var(--border)'}`, background: form.workerType === t ? WORKER_TYPE_BG[t] : 'var(--bg-card)', color: form.workerType === t ? WORKER_TYPE_COLOR[t] : 'var(--text-muted)', fontWeight: form.workerType === t ? 700 : 400, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Tay nghề</label>
                                    <input className="form-input" value={form.skill} onChange={e => setForm(f => ({ ...f, skill: e.target.value }))} placeholder="VD: Thợ mộc, Thợ sơn..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SĐT</label>
                                    <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Đơn giá / ngày (VND)</label>
                                    <input className="form-input" type="number" value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} placeholder="0" />
                                    {Number(form.hourlyRate) > 0 && (
                                        <div style={{ fontSize: 11, color: '#8b5cf6', marginTop: 3 }}>
                                            ≈ {new Intl.NumberFormat('vi-VN').format(Number(form.hourlyRate) * 26)}đ/tháng (26 ngày)
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    Zalo User ID
                                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>(để nhận thông báo công việc)</span>
                                </label>
                                <input className="form-input" value={form.zaloUserId} onChange={e => setForm(f => ({ ...f, zaloUserId: e.target.value }))} placeholder="VD: 1234567890" />
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Thợ cần nhắn tin vào Zalo OA của công ty để lấy ID</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.name.trim()}>
                                {saving ? 'Đang lưu...' : editTarget ? 'Cập nhật' : 'Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal chấm công */}
            {attendTarget && (
                <div className="modal-overlay" onClick={() => setAttendTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3>Chấm công — {attendTarget.name}</h3>
                            <button className="modal-close" onClick={() => setAttendTarget(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Ngày đã chọn từ bảng */}
                            <div style={{ padding: '8px 12px', borderRadius: 8, background: isToday ? '#eff6ff' : '#fef9c3', fontSize: 13, fontWeight: 600, color: isToday ? '#1d4ed8' : '#92400e' }}>
                                📅 {fmtDateVN(selectedDate)}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số giờ làm việc</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {[4, 6, 8, 10, 12].map(h => (
                                        <button key={h} type="button" onClick={() => setAttendForm(f => ({ ...f, hoursWorked: h }))}
                                            style={{ padding: '6px 16px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 600,
                                                borderColor: attendForm.hoursWorked === h ? '#2563eb' : 'var(--border)',
                                                background: attendForm.hoursWorked === h ? '#2563eb' : 'transparent',
                                                color: attendForm.hoursWorked === h ? '#fff' : 'inherit' }}>
                                            {h}h
                                        </button>
                                    ))}
                                    <input type="number" min={0} max={24} step={0.5} value={attendForm.hoursWorked}
                                        onChange={e => setAttendForm(f => ({ ...f, hoursWorked: Number(e.target.value) }))}
                                        style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                                </div>
                                {attendForm.hoursWorked === 0 ? (
                                    <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, padding: '6px 10px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                                        ⚠️ Nhập 0 giờ sẽ xóa chấm công ngày này
                                    </div>
                                ) : attendTarget.hourlyRate > 0 && (
                                    <div style={{ fontSize: 13, color: '#8b5cf6', fontWeight: 700 }}>
                                        Chi phí: {new Intl.NumberFormat('vi-VN').format((attendForm.hoursWorked / 8) * attendTarget.hourlyRate)}đ
                                        <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>({attendForm.hoursWorked}h / 8h × {new Intl.NumberFormat('vi-VN').format(attendTarget.hourlyRate)}đ/ngày)</span>
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={attendForm.notes} onChange={e => setAttendForm(f => ({ ...f, notes: e.target.value }))} placeholder="VD: Làm thêm giờ, nghỉ sớm..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setAttendTarget(null)}>Hủy</button>
                            <button className={`btn ${attendForm.hoursWorked === 0 ? 'btn-danger' : 'btn-primary'}`} onClick={handleAttend}>
                                {attendForm.hoursWorked === 0 ? '🗑️ Xóa chấm công' : '✅ Xác nhận chấm công'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal tăng ca */}
            {overtimeTarget && (
                <div className="modal-overlay" onClick={() => setOvertimeTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                        <div className="modal-header">
                            <h3>⏰ {overtimeEditId ? 'Sửa tăng ca' : 'Tăng ca'} — {overtimeTarget.name}</h3>
                            <button className="modal-close" onClick={() => { setOvertimeTarget(null); setOvertimeEditId(null); }}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#eff6ff', fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>
                                📅 {fmtDateVN(selectedDate)}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Số giờ tăng ca</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {[1, 2, 3, 4, 5].map(h => (
                                        <button key={h} type="button" onClick={() => setOvertimeForm(f => ({ ...f, hours: h }))}
                                            style={{ padding: '6px 16px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 600,
                                                borderColor: overtimeForm.hours === h ? '#f59e0b' : 'var(--border)',
                                                background: overtimeForm.hours === h ? '#f59e0b' : 'transparent',
                                                color: overtimeForm.hours === h ? '#fff' : 'inherit' }}>
                                            {h}h
                                        </button>
                                    ))}
                                    <input type="number" min={0.5} max={12} step={0.5} value={overtimeForm.hours}
                                        onChange={e => setOvertimeForm(f => ({ ...f, hours: Number(e.target.value) }))}
                                        style={{ width: 70, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hệ số tăng ca</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[{ v: 1.5, label: '×1.5 Thường' }, { v: 2, label: '×2 Ngày lễ' }, { v: 3, label: '×3 Tết' }].map(({ v, label }) => (
                                        <button key={v} type="button" onClick={() => setOvertimeForm(f => ({ ...f, rateMultiplier: v }))}
                                            style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `2px solid ${overtimeForm.rateMultiplier === v ? '#f59e0b' : 'var(--border)'}`, background: overtimeForm.rateMultiplier === v ? '#fef3c7' : 'var(--bg-card)', color: overtimeForm.rateMultiplier === v ? '#92400e' : 'var(--text-muted)', fontWeight: overtimeForm.rateMultiplier === v ? 700 : 400, fontSize: 12, cursor: 'pointer' }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {overtimeTarget.hourlyRate > 0 && overtimeForm.hours > 0 && (
                                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef9c3', border: '1px solid #fde68a' }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>
                                        💰 {new Intl.NumberFormat('vi-VN').format(Math.round(overtimeForm.hours * (overtimeTarget.hourlyRate / 8) * overtimeForm.rateMultiplier))}đ
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                        {overtimeForm.hours}h × {new Intl.NumberFormat('vi-VN').format(Math.round(overtimeTarget.hourlyRate / 8))}đ/h × {overtimeForm.rateMultiplier}
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Lý do tăng ca</label>
                                <input className="form-input" value={overtimeForm.reason} onChange={e => setOvertimeForm(f => ({ ...f, reason: e.target.value }))} placeholder="VD: Rush deadline, giao hàng gấp..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={overtimeForm.notes} onChange={e => setOvertimeForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { setOvertimeTarget(null); setOvertimeEditId(null); }}>Hủy</button>
                            <button className="btn btn-primary" style={{ background: '#f59e0b', borderColor: '#f59e0b' }} onClick={handleSaveOvertime} disabled={savingOT || !overtimeForm.hours}>
                                {savingOT ? 'Đang lưu...' : overtimeEditId ? '💾 Cập nhật' : '⏰ Ghi tăng ca'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal sửa việc hiện tại */}
            {currentWorkTarget && (
                <div className="modal-overlay" onClick={() => setCurrentWorkTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3>Việc hiện tại — {currentWorkTarget.name}</h3>
                            <button className="modal-close" onClick={() => setCurrentWorkTarget(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {allTasks.length === 0 && (
                                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
                                    Chưa có tác vụ nào đang thực hiện
                                </p>
                            )}
                            {allTasks.length > 0 && (
                                <>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                                        Chọn việc đang giao cho <strong>{currentWorkTarget.name}</strong>:
                                    </p>
                                    {allTasks.map(task => {
                                        const checked = currentWorkTaskIds.includes(task.id);
                                        return (
                                            <label key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `2px solid ${checked ? '#2563eb' : 'var(--border)'}`, background: checked ? '#eff6ff' : 'var(--bg-card)', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={checked} onChange={() => toggleCurrentWorkTask(task.id)} style={{ marginTop: 2, accentColor: '#2563eb', width: 16, height: 16, flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{task.title}</div>
                                                    {task.project && (
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                            {task.project.code} · {task.project.name}
                                                        </div>
                                                    )}
                                                    {task.workers?.length > 0 && (
                                                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                                            Thợ: {task.workers.map(tw => tw.worker?.name).filter(Boolean).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </>
                            )}

                            {/* Thêm việc mới */}
                            {showAddTask ? (
                                <div style={{ padding: '12px', borderRadius: 8, border: '2px dashed #2563eb', background: '#eff6ff', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1d4ed8', marginBottom: 2 }}>Thêm việc mới</div>
                                    <input
                                        className="form-input"
                                        placeholder="Tên công việc *"
                                        value={newTaskForm.title}
                                        onChange={e => setNewTaskForm(f => ({ ...f, title: e.target.value }))}
                                        autoFocus
                                        style={{ fontSize: 13 }}
                                    />
                                    <select className="form-select" value={newTaskForm.projectId} onChange={e => setNewTaskForm(f => ({ ...f, projectId: e.target.value }))} style={{ fontSize: 13 }}>
                                        <option value="">-- Dự án (tùy chọn) --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                                    </select>
                                    <select className="form-select" value={newTaskForm.category} onChange={e => setNewTaskForm(f => ({ ...f, category: e.target.value }))} style={{ fontSize: 13 }}>
                                        {['Gia công nguội','Lắp ghép tại xưởng','Lắp đặt tại công trình','Bảo dưỡng','Việc khác'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Hạn chót</label>
                                            <input type="date" className="form-input" value={newTaskForm.deadline} onChange={e => setNewTaskForm(f => ({ ...f, deadline: e.target.value }))} style={{ fontSize: 13 }} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => { setShowAddTask(false); setNewTaskForm({ title: '', projectId: '', deadline: '', category: 'Lắp ghép tại xưởng' }); }}>Hủy</button>
                                        <button className="btn btn-primary btn-sm" onClick={addNewTask} disabled={savingCurrentWork || !newTaskForm.title.trim()}>
                                            {savingCurrentWork ? 'Đang tạo...' : '+ Tạo & giao việc'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddTask(true)} style={{ alignSelf: 'flex-start', color: '#2563eb', fontWeight: 600, border: '1.5px dashed #93c5fd', borderRadius: 8, padding: '6px 14px' }}>
                                    + Thêm việc mới
                                </button>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setCurrentWorkTarget(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveCurrentWork} disabled={savingCurrentWork}>
                                {savingCurrentWork ? 'Đang lưu...' : '✅ Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm delete */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
                        <div className="modal-header"><h3>Xóa nhân công</h3><button className="modal-close" onClick={() => setDeleteTarget(null)}>×</button></div>
                        <div className="modal-body"><p style={{ fontSize: 14 }}>Xóa <strong>{deleteTarget.name}</strong>? Hành động không thể hoàn tác.</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Hủy</button>
                            <button className="btn btn-danger" onClick={handleDelete}>Xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
