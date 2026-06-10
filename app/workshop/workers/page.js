'use client';
import { useState, useEffect, useRef } from 'react';
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
    const { role, isXuongNhanVien } = useRole();
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
    const [attendForm, setAttendForm] = useState({ hoursWorked: 8, mealsCount: 0, notes: '' });
    const [showMealSummary, setShowMealSummary] = useState(isXuongNhanVien);
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
    const [showSummary, setShowSummary] = useState(isXuongNhanVien);
    const [summaryMonth, setSummaryMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [summaryAttendance, setSummaryAttendance] = useState([]);
    const [summaryOvertimes, setSummaryOvertimes] = useState([]);
    const [salaryAdvances, setSalaryAdvances] = useState([]); // [{workerId, amount, notes}]
    const [editingAdvance, setEditingAdvance] = useState(null); // workerId being edited
    const [advanceInput, setAdvanceInput] = useState('');
    const [loadingSummary, setLoadingSummary] = useState(false);

    // ── Bảng thanh toán lương ────────────────────────────────────────────────
    const [showPayroll, setShowPayroll] = useState(false);
    const [payrollRows, setPayrollRows] = useState([]);
    const [payrollMonth, setPayrollMonth] = useState('');
    const [editingPayrollCell, setEditingPayrollCell] = useState(null); // {workerId, field}
    const [editingPayrollVal, setEditingPayrollVal] = useState('');

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
    const [monthlyAtt, setMonthlyAtt] = useState([]);
    const [filterIdle, setFilterIdle] = useState(() => typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('idle') === '1' : false);
    const intervalRef = useRef(null);

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
        const [attRes, otRes, advRes] = await Promise.all([
            fetch(`/api/workshop/attendance?month=${month}`),
            fetch(`/api/workshop/overtimes?month=${month}`),
            fetch(`/api/workshop/salary-advances?month=${month}`),
        ]);
        const [attData, otData, advData] = await Promise.all([attRes.json(), otRes.json(), advRes.json()]);
        setSummaryAttendance(Array.isArray(attData) ? attData : []);
        setSummaryOvertimes(Array.isArray(otData) ? otData : []);
        setSalaryAdvances(Array.isArray(advData) ? advData : []);
        setLoadingSummary(false);
    };

    const saveAdvance = async (workerId, amount) => {
        await fetch('/api/workshop/salary-advances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerId, month: summaryMonth, amount: Number(amount) || 0 }),
        });
        setSalaryAdvances(prev => {
            const existing = prev.find(a => a.workerId === workerId);
            if (existing) return prev.map(a => a.workerId === workerId ? { ...a, amount: Number(amount) || 0 } : a);
            return [...prev, { workerId, amount: Number(amount) || 0 }];
        });
    };

    const updatePayrollRow = (workerId, field, rawVal) => {
        const isDecimal = field === 'ngayCong';
        const value = isDecimal
            ? (parseFloat(String(rawVal).replace(/[^0-9.]/g, '')) || 0)
            : (parseInt(String(rawVal).replace(/[^0-9]/g, ''), 10) || 0);
        setPayrollRows(prev => prev.map(r => r.workerId === workerId ? { ...r, [field]: value } : r));
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
        if (showSummary || showPayroll || showMealSummary) fetchMonthlySummary(summaryMonth);
    }, [summaryMonth, showSummary, showPayroll, showMealSummary]);

    // Khởi tạo bảng thanh toán lương từ dữ liệu chấm công
    useEffect(() => {
        if (loadingSummary) return;
        // Chỉ bỏ qua khi đã có dữ liệu ngày công thực sự (không bỏ qua khi rows toàn 0)
        if (payrollMonth === summaryMonth && payrollRows.some(r => r.ngayCong > 0)) return;
        const congFn = (h) => h / 8;
        const byWorkerDay = {};
        summaryAttendance.forEach(a => {
            if (!byWorkerDay[a.workerId]) byWorkerDay[a.workerId] = {};
            byWorkerDay[a.workerId][new Date(a.date).getUTCDate()] = a.hoursWorked;
        });
        const activeWorkers = workers.filter(w => w.status !== 'Nghỉ việc' || byWorkerDay[w.id]);
        const rows = activeWorkers.map(w => {
            const dayMap = byWorkerDay[w.id] || {};
            const totalCong = Object.values(dayMap).reduce((s, h) => s + congFn(h), 0);
            const otCost = summaryOvertimes.filter(o => o.workerId === w.id).reduce((s, o) => s + o.totalPay, 0);
            const advance = salaryAdvances.find(a => a.workerId === w.id)?.amount || 0;
            return {
                workerId: w.id, name: w.name, skill: w.skill || '',
                mucLuong: Math.round(w.hourlyRate * 26),
                ngayLuong: Math.round(w.hourlyRate),
                ngayCong: totalCong,
                thuong: 0, phuCap: 0,
                luongOT: otCost,
                tamUng: advance, baoHiem: 0, cd: 0, daThanhToan: 0,
            };
        });
        setPayrollRows(rows);
        setPayrollMonth(summaryMonth);
    }, [loadingSummary, summaryMonth, summaryAttendance, summaryOvertimes, salaryAdvances, workers, payrollMonth]);

    useEffect(() => {
        if (showOvertimeList) fetchMonthlyOvertimes(overtimeMonth);
    }, [overtimeMonth, showOvertimeList]);

    const fetchAll = async () => {
        setLoading(true);
        const monthStr = new Date().toISOString().slice(0, 7);
        const [, , , mAttRes] = await Promise.all([
            fetchWorkers(),
            fetchAttendance(selectedDate),
            fetchOvertimes(selectedDate),
            fetch(`/api/workshop/attendance?month=${monthStr}`),
        ]);
        const mAttData = await mAttRes.json();
        setMonthlyAtt(Array.isArray(mAttData) ? mAttData : []);
        setLoading(false);
    };

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd', 'hanh_chinh_kt'].includes(role)) {
            router.replace('/');
            return;
        }
        fetchAll();
        intervalRef.current = setInterval(fetchWorkers, 30000);
        return () => clearInterval(intervalRef.current);
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
        setAttendForm({ hoursWorked: existing?.hoursWorked ?? 8, mealsCount: existing?.mealsCount ?? 0, notes: existing?.notes ?? '' });
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
    const idleSet = new Set(workers.filter(w => w.status === 'Hoạt động' && (!workerTasks[w.id] || workerTasks[w.id].length === 0)).map(w => w.id));
    const filtered = workers.filter(w => {
        if (filterIdle && !idleSet.has(w.id)) return false;
        return !search || w.name.toLowerCase().includes(search.toLowerCase()) || w.skill?.toLowerCase().includes(search.toLowerCase());
    });

    const activeCount = workers.filter(w => w.status === 'Hoạt động').length;
    const attendedCount = attendance.length;
    const totalHours = attendance.reduce((s, a) => s + a.hoursWorked, 0);
    // dailyRate: hourlyRate field giờ lưu đơn giá/ngày
    const totalCost = attendance.reduce((s, a) => s + (a.hoursWorked / 8) * (a.worker?.hourlyRate || 0), 0);
    const monthlyPayroll = workers.filter(w => w.status === 'Hoạt động').reduce((s, w) => s + w.hourlyRate * 26, 0);

    // ── Productivity & monthly cost helpers ──────────────────────────────────
    const workingDaysSoFar = (() => {
        const t = new Date();
        let c = 0;
        for (let d = 1; d <= t.getDate(); d++) {
            if (new Date(t.getFullYear(), t.getMonth(), d).getDay() !== 0) c++;
        }
        return c;
    })();

    const getWorkerMonthStats = (workerId, hourlyRate) => {
        const att = monthlyAtt.filter(a => a.workerId === workerId);
        const monthlyCost = att.reduce((s, a) => s + (a.hoursWorked / 8) * hourlyRate, 0);
        const productivity = workingDaysSoFar > 0 ? Math.min(100, Math.round((att.length / workingDaysSoFar) * 100)) : null;
        return { monthlyCost, productivity, attendedDays: att.length };
    };

    const renderHeatmap = (workerId) => {
        const today = new Date();
        const days = today.getDate();
        const workerDays = {};
        monthlyAtt.filter(a => a.workerId === workerId).forEach(a => {
            workerDays[new Date(a.date).getUTCDate()] = a.hoursWorked;
        });
        return (
            <div style={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', maxWidth: 116, marginTop: 4 }}>
                {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                    const h = workerDays[day];
                    const bg = h ? (h >= 8 ? '#16a34a' : '#86efac') : '#e5e7eb';
                    return (
                        <div key={day} title={`Ngày ${day}: ${h ? h + 'h' : 'Vắng'}`}
                            style={{ width: 7, height: 7, borderRadius: 1.5, background: bg, flexShrink: 0 }} />
                    );
                })}
            </div>
        );
    };

    const idleWorkers = workers.filter(w => idleSet.has(w.id));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* KPI */}
            {!isXuongNhanVien && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
                <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #2563eb' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>👷 Nhân công hoạt động</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{activeCount}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {workers.length} tổng cộng</div>
                    {idleWorkers.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: '#b45309' }}>⚠ {idleWorkers.length} đang rảnh</div>
                    )}
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
            </div>}

            {/* Idle alert */}
            {!isXuongNhanVien && idleWorkers.length > 0 && (
                <div style={{ padding: '10px 16px', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#b45309', fontSize: 13, flexShrink: 0 }}>
                        ⚠ {idleWorkers.length} thợ đang rảnh việc
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                        {idleWorkers.map(w => (
                            <span key={w.id} onClick={() => openCurrentWork(w)}
                                style={{ padding: '2px 10px', borderRadius: 20, background: '#fde68a', color: '#92400e', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #f59e0b' }}>
                                {w.name}
                            </span>
                        ))}
                    </div>
                    <span style={{ fontSize: 11, color: '#b45309', flexShrink: 0 }}>Click để giao việc</span>
                </div>
            )}

            {!isXuongNhanVien && <div className="card">
                <div className="card-header">
                    <h3>Danh sách nhân công</h3>
                    <button className="btn btn-primary" onClick={openAdd}>+ Thêm thợ</button>
                </div>
                <div className="filter-bar" style={{ borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                    <input className="form-input" placeholder="🔍 Tìm theo tên, tay nghề..."
                        value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
                    <button onClick={() => setFilterIdle(f => !f)}
                        className={filterIdle ? 'btn btn-warning btn-sm' : 'btn btn-ghost btn-sm'}
                        style={{ flexShrink: 0 }}>
                        ⚡ {filterIdle ? `Rảnh (${idleWorkers.length})` : `Xem thợ rảnh`}
                    </button>
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
                                                <td style={{ minWidth: 150 }}>
                                                    {(() => {
                                                        const { productivity } = getWorkerMonthStats(w.id, w.hourlyRate);
                                                        const isIdle = !!idleWorkers.find(x => x.id === w.id);
                                                        const col = productivity !== null ? (productivity >= 80 ? '#16a34a' : productivity >= 50 ? '#d97706' : '#dc2626') : null;
                                                        const bg  = productivity !== null ? (productivity >= 80 ? '#dcfce7' : productivity >= 50 ? '#fef3c7' : '#fee2e2') : null;
                                                        return (
                                                            <>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                                                                    <span style={{ fontWeight: 600, fontSize: 13, color: isIdle ? '#b45309' : 'var(--text-primary)' }}>{w.name}</span>
                                                                    {productivity !== null && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 20, background: bg, color: col, fontWeight: 700, flexShrink: 0 }}>{productivity}%</span>}
                                                                </div>
                                                                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: WORKER_TYPE_BG[w.workerType] || '#f3f4f6', color: WORKER_TYPE_COLOR[w.workerType] || '#374151', fontWeight: 600 }}>
                                                                    {w.workerType || 'Thợ chính'}
                                                                </span>
                                                                {monthlyAtt.length > 0 && renderHeatmap(w.id)}
                                                            </>
                                                        );
                                                    })()}
                                                </td>
                                                <td style={{ fontSize: 12 }}>{w.skill || '—'}</td>
                                                <td style={{ fontSize: 12 }}>{w.phone || '—'}</td>
                                                <td style={{ fontSize: 13 }}>
                                                    {w.hourlyRate > 0 ? (
                                                        <>
                                                            <div style={{ fontWeight: 600 }}>{new Intl.NumberFormat('vi-VN').format(w.hourlyRate)}đ/ngày</div>
                                                            {(() => {
                                                                const { monthlyCost } = getWorkerMonthStats(w.id, w.hourlyRate);
                                                                return monthlyCost > 0 ? (
                                                                    <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600 }}>
                                                                        {new Intl.NumberFormat('vi-VN').format(Math.round(monthlyCost / 1000))}k/tháng này
                                                                    </div>
                                                                ) : null;
                                                            })()}
                                                        </>
                                                    ) : '—'}
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
                                                                {rec.mealsCount > 0 && (
                                                                    <span style={{ padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#92400e', fontSize: 11, fontWeight: 700 }}>
                                                                        🍚 {rec.mealsCount}
                                                                    </span>
                                                                )}
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
            </div>}

            {/* Nút toggle */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    className={`btn btn-sm ${showSummary ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontWeight: 600 }}
                    onClick={() => setShowSummary(v => !v)}
                >
                    📊 {showSummary ? 'Ẩn' : 'Xem'} bảng tổng hợp tháng
                </button>
                {!isXuongNhanVien && <button
                    className={`btn btn-sm ${showOvertimeList ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontWeight: 600, ...(showOvertimeList ? { background: '#f59e0b', borderColor: '#f59e0b' } : {}) }}
                    onClick={() => setShowOvertimeList(v => !v)}
                >
                    ⏰ {showOvertimeList ? 'Ẩn' : 'Xem'} danh sách tăng ca
                </button>}
                {!isXuongNhanVien && <button
                    className={`btn btn-sm ${showPayroll ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontWeight: 600, ...(showPayroll ? { background: '#059669', borderColor: '#059669' } : {}) }}
                    onClick={() => setShowPayroll(v => !v)}
                >
                    📋 {showPayroll ? 'Ẩn' : 'Xem'} bảng thanh toán lương
                </button>}
                <button
                    className={`btn btn-sm ${showMealSummary ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontWeight: 600, ...(showMealSummary ? { background: '#d97706', borderColor: '#d97706' } : {}) }}
                    onClick={() => setShowMealSummary(v => !v)}
                >
                    🍚 {showMealSummary ? 'Ẩn' : 'Xem'} bảng chấm cơm tháng
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

                const getAdvance = (workerId) => salaryAdvances.find(a => a.workerId === workerId)?.amount || 0;

                const grandTotal = summaryWorkers.reduce((s, w) => {
                    const { totalCong, totalH, cost } = workerTotal(w);
                    return { cong: s.cong + totalCong, hours: s.hours + totalH, cost: s.cost + cost };
                }, { cong: 0, hours: 0, cost: 0 });

                const grandOTTotal = summaryWorkers.reduce((s, w) => {
                    const { totalH, cost } = workerOTTotal(w);
                    return { hours: s.hours + totalH, cost: s.cost + cost };
                }, { hours: 0, cost: 0 });

                const grandAdvanceTotal = summaryWorkers.reduce((s, w) => s + getAdvance(w.id), 0);

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

                const exportPayrollPDF = () => {
                    const monthStr = `${String(m).padStart(2, '0')}/${y}`;
                    const fmtN = (n) => n > 0 ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '';
                    const fmtC = (n) => n > 0 ? (n % 1 === 0 ? String(n) : n.toFixed(1)) : '';

                    const totalCongAll = summaryWorkers.reduce((s, w) => s + workerTotal(w).totalCong, 0);
                    const totalCostAll = grandTotal.cost;
                    const totalOTAll = grandOTTotal.cost;
                    const totalAdvAll = grandAdvanceTotal;
                    const totalTongTien = totalCostAll + totalOTAll;
                    const totalThanhTien = totalTongTien - totalAdvAll;

                    const rows = summaryWorkers.map((w, idx) => {
                        const { totalCong, cost } = workerTotal(w);
                        const { cost: otCost } = workerOTTotal(w);
                        const adv = getAdvance(w.id);
                        const mucLuong = Math.round(w.hourlyRate * 26);
                        const tongTien = cost + otCost;
                        const thanhTien = tongTien - adv;
                        return `<tr>
                            <td style="text-align:center">${idx + 1}</td>
                            <td>${w.name}</td>
                            <td style="text-align:right">${fmtN(mucLuong)}</td>
                            <td style="text-align:right">${fmtN(w.hourlyRate)}</td>
                            <td style="text-align:center">${fmtC(totalCong)}</td>
                            <td style="text-align:right">${fmtN(cost)}</td>
                            <td></td>
                            <td></td>
                            <td style="text-align:right">${fmtN(otCost)}</td>
                            <td style="text-align:right;font-weight:600">${fmtN(tongTien)}</td>
                            <td style="text-align:right">${fmtN(adv)}</td>
                            <td></td>
                            <td></td>
                            <td style="text-align:right">${fmtN(adv)}</td>
                            <td style="text-align:right;font-weight:600">${fmtN(thanhTien)}</td>
                            <td></td>
                            <td style="text-align:right;font-weight:700">${fmtN(thanhTien)}</td>
                            <td></td>
                        </tr>`;
                    }).join('');

                    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Bảng Thanh Toán Lương Tháng ${monthStr}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4 landscape;margin:8mm}
body{font-family:'Times New Roman',Times,serif;font-size:9pt;color:#000}
.hdr{margin-bottom:6px}
.hdr .co{font-size:10pt;font-weight:bold;text-transform:uppercase}
.title-wrap{text-align:center;margin-bottom:6px}
.title{font-size:11pt;font-weight:bold;text-transform:uppercase}
.date{text-align:right;font-size:8.5pt;font-style:italic;margin-bottom:6px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #000;padding:2px 3px;font-size:7.8pt;vertical-align:middle}
th{background:#fff;font-weight:bold;text-align:center;line-height:1.2}
.gtr{background:#f5f5f5}
tfoot td{font-weight:bold;background:#f5f5f5}
.sigs{margin-top:14px;display:flex;justify-content:space-between}
.sig{text-align:center;width:23%}
.sig-t{font-weight:bold;font-size:8.5pt}
.sig-n{margin-top:36px;font-size:8pt;font-style:italic}
</style>
</head>
<body>
<div class="hdr">
  <div class="co">Công ty TNHH kiến trúc đô thị SCT</div>
  <div>Xưởng Nội Thất</div>
</div>
<div class="title-wrap">
  <div class="title">Bảng thanh toán lương tháng ${monthStr} xưởng nội thất</div>
</div>
<div class="date">Lào Cai, ngày &nbsp;&nbsp;&nbsp; tháng ${String(m).padStart(2,'0')} năm ${y}</div>
<table>
<thead>
<tr>
  <th rowspan="3" style="width:24px">STT</th>
  <th rowspan="3" style="min-width:75px">Họ và tên</th>
  <th rowspan="3" style="width:56px">Mức lương</th>
  <th rowspan="3" style="width:52px">Ngày lương thỏa thuận (1)</th>
  <th rowspan="3" style="width:32px">Ngày công thực tế (2)</th>
  <th rowspan="3" style="width:58px">Tổng lương theo ngày công CT (3=2×1)</th>
  <th rowspan="3" style="width:46px">Thưởng phụ trách CT (4)</th>
  <th rowspan="3" style="width:46px">Phụ cấp XX/ĐT/BS (5)</th>
  <th rowspan="3" style="width:52px">Lương làm thêm giờ (6)</th>
  <th rowspan="3" style="width:58px">Tổng tiền (7=3+4+5+6)</th>
  <th colspan="4" class="gtr">Giảm trừ</th>
  <th rowspan="3" style="width:58px">Thành tiền (12=7-11)</th>
  <th rowspan="3" style="width:46px">Đã thanh toán (13)</th>
  <th rowspan="3" style="width:58px">Còn lại (14=12-13)</th>
  <th rowspan="3" style="width:40px">Ký nhận</th>
</tr>
<tr>
  <th style="width:52px" class="gtr">Tạm ứng (8)</th>
  <th style="width:46px" class="gtr">Bảo hiểm (9)</th>
  <th style="width:30px" class="gtr">CD (10)</th>
  <th style="width:52px" class="gtr">Cộng (11=8+9+10)</th>
</tr>
<tr>
  <th></th><th></th><th>1</th><th>2</th><th>3=2×1</th><th>4</th><th>5</th><th>6</th><th>7=3+4+5+6</th><th>8</th><th>9</th><th>10</th><th>11=8+9+10</th><th>12=7-11</th><th>13</th><th>14=12-13</th><th></th>
</tr>
</thead>
<tbody>${rows}</tbody>
<tfoot>
<tr>
  <td colspan="2" style="text-align:center">TỔNG CỘNG</td>
  <td></td>
  <td></td>
  <td style="text-align:center">${fmtC(totalCongAll)}</td>
  <td style="text-align:right">${fmtN(totalCostAll)}</td>
  <td></td>
  <td></td>
  <td style="text-align:right">${fmtN(totalOTAll)}</td>
  <td style="text-align:right">${fmtN(totalTongTien)}</td>
  <td style="text-align:right">${fmtN(totalAdvAll)}</td>
  <td></td>
  <td></td>
  <td style="text-align:right">${fmtN(totalAdvAll)}</td>
  <td style="text-align:right">${fmtN(totalThanhTien)}</td>
  <td></td>
  <td style="text-align:right">${fmtN(totalThanhTien)}</td>
  <td></td>
</tr>
</tfoot>
</table>
<div class="sigs">
  <div class="sig"><div class="sig-t">Phụ trách bộ phận</div><div class="sig-n">Ký tên</div></div>
  <div class="sig"><div class="sig-t">Người lập</div><div class="sig-n">Ký tên</div></div>
  <div class="sig"><div class="sig-t">Phòng hành chính - Kế toán</div><div class="sig-n">Ký tên</div></div>
  <div class="sig"><div class="sig-t">Giám đốc điều hành</div><div class="sig-n">Ký tên</div></div>
</div>
</body></html>`;

                    const pw = window.open('', '_blank', 'width=1100,height=800');
                    pw.document.write(html);
                    pw.document.close();
                    pw.focus();
                    setTimeout(() => pw.print(), 600);
                };

                return (
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <h3 style={{ margin: 0 }}>📊 Bảng tổng hợp công tháng</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◀</button>
                                <input type="month" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)}
                                    style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600 }} />
                                <button className="btn btn-ghost btn-sm" onClick={nextMonth}>▶</button>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
                                    {daysInMonth} ngày · {summaryWorkers.length} người
                                </span>
                                <button
                                    className="btn btn-sm"
                                    style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                    onClick={exportPayrollPDF}
                                    disabled={loadingSummary}
                                >
                                    🖨️ Xuất PDF
                                </button>
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
                                            <th style={{ padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap', color: '#dc2626', background: 'var(--bg-secondary)' }}>Ứng lương</th>
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
                                                    {(() => { const ot = workerOTTotal(w); const adv = getAdvance(w.id); const total = cost + ot.cost - adv; return (
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
                                                        <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap', cursor: 'pointer' }}
                                                            onClick={() => { setEditingAdvance(w.id); setAdvanceInput(adv > 0 ? String(adv) : ''); }}>
                                                            {editingAdvance === w.id ? (
                                                                <input
                                                                    autoFocus
                                                                    type="number"
                                                                    value={advanceInput}
                                                                    onChange={e => setAdvanceInput(e.target.value)}
                                                                    onBlur={() => { saveAdvance(w.id, advanceInput); setEditingAdvance(null); }}
                                                                    onKeyDown={e => { if (e.key === 'Enter') { saveAdvance(w.id, advanceInput); setEditingAdvance(null); } if (e.key === 'Escape') setEditingAdvance(null); }}
                                                                    style={{ width: 80, textAlign: 'right', fontSize: 12, padding: '2px 4px', border: '1px solid #dc2626', borderRadius: 4 }}
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                            ) : (
                                                                <span style={{ color: adv > 0 ? '#dc2626' : '#d1d5db', fontWeight: adv > 0 ? 700 : 400 }}>
                                                                    {adv > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(adv / 1000))}k` : '—'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, color: total > 0 ? '#15803d' : '#dc2626', whiteSpace: 'nowrap', background: '#f0fdf4' }}>
                                                            {(cost + ot.cost) > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(total / 1000))}k` : '—'}
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
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#dc2626', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 }}>
                                                {grandAdvanceTotal > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round(grandAdvanceTotal / 1000))}k` : '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#15803d', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 800, background: '#f0fdf4' }}>
                                                {(grandTotal.cost + grandOTTotal.cost) > 0 ? `${new Intl.NumberFormat('vi-VN').format(Math.round((grandTotal.cost + grandOTTotal.cost - grandAdvanceTotal) / 1000))}k` : '—'}
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

            {/* Bảng thanh toán lương */}
            {showPayroll && (() => {
                const [yw, mw] = summaryMonth.split('-').map(Number);
                const monthStr = `${String(mw).padStart(2,'0')}/${yw}`;
                const fmtN = (n) => n > 0 ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '';
                const fmtC = (n) => n > 0 ? (n % 1 === 0 ? String(n) : n.toFixed(1)) : '';

                const rows = payrollRows.map(r => {
                    const tongLuong = r.ngayCong * r.ngayLuong;
                    const tongTien = tongLuong + r.thuong + r.phuCap + r.luongOT;
                    const congGiamTru = r.tamUng + r.baoHiem + r.cd;
                    const thanhTien = tongTien - congGiamTru;
                    const conLai = thanhTien - r.daThanhToan;
                    return { ...r, tongLuong, tongTien, congGiamTru, thanhTien, conLai };
                });

                const totals = rows.reduce((s, r) => ({
                    ngayCong: s.ngayCong + r.ngayCong,
                    tongLuong: s.tongLuong + r.tongLuong,
                    thuong: s.thuong + r.thuong,
                    phuCap: s.phuCap + r.phuCap,
                    luongOT: s.luongOT + r.luongOT,
                    tongTien: s.tongTien + r.tongTien,
                    tamUng: s.tamUng + r.tamUng,
                    baoHiem: s.baoHiem + r.baoHiem,
                    cd: s.cd + r.cd,
                    congGiamTru: s.congGiamTru + r.congGiamTru,
                    thanhTien: s.thanhTien + r.thanhTien,
                    daThanhToan: s.daThanhToan + r.daThanhToan,
                    conLai: s.conLai + r.conLai,
                }), { ngayCong:0,tongLuong:0,thuong:0,phuCap:0,luongOT:0,tongTien:0,tamUng:0,baoHiem:0,cd:0,congGiamTru:0,thanhTien:0,daThanhToan:0,conLai:0 });

                // Styles
                const thBase = { padding: '5px 4px', textAlign: 'center', fontSize: 10, fontWeight: 700, border: '1px solid #94a3b8', background: '#f1f5f9', whiteSpace: 'nowrap', lineHeight: 1.3 };
                const tdBase = { padding: '3px 5px', fontSize: 11, border: '1px solid #e2e8f0', whiteSpace: 'nowrap', verticalAlign: 'middle' };
                const cTd = { ...tdBase, textAlign: 'right', background: '#f8fafc', color: '#1e293b', fontWeight: 600 };
                const greenTd = { ...cTd, background: '#f0fdf4', color: '#15803d', fontWeight: 700 };
                const blueTd = { ...cTd, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 };
                const redTd = { ...cTd, background: '#fff7ed', color: '#c2410c' };

                // Editable cell helper
                const eCell = (r, field, style, isDecimal) => {
                    const isEditing = editingPayrollCell?.workerId === r.workerId && editingPayrollCell?.field === field;
                    const val = r[field] || 0;
                    if (isEditing) return (
                        <td style={{ ...tdBase, padding: 0, border: '2px solid #3b82f6', background: '#eff6ff' }}>
                            <input autoFocus type="text" value={editingPayrollVal}
                                onChange={e => setEditingPayrollVal(e.target.value)}
                                onBlur={() => { updatePayrollRow(r.workerId, field, editingPayrollVal); setEditingPayrollCell(null); }}
                                onKeyDown={e => { if (e.key === 'Enter') { updatePayrollRow(r.workerId, field, editingPayrollVal); setEditingPayrollCell(null); } if (e.key === 'Escape') setEditingPayrollCell(null); }}
                                onClick={e => e.stopPropagation()}
                                style={{ width: '100%', minWidth: 60, textAlign: 'right', fontSize: 11, padding: '2px 5px', border: 'none', outline: 'none', background: 'transparent' }}
                            />
                        </td>
                    );
                    return (
                        <td style={{ ...tdBase, textAlign: 'right', cursor: 'pointer', ...style }}
                            title="Click để chỉnh sửa"
                            onClick={() => { setEditingPayrollCell({ workerId: r.workerId, field }); setEditingPayrollVal(val > 0 ? (isDecimal ? String(val) : String(Math.round(val))) : ''); }}>
                            <span style={{ color: val > 0 ? undefined : '#cbd5e1' }}>
                                {val > 0 ? (isDecimal ? fmtC(val) : fmtN(val)) : '—'}
                            </span>
                        </td>
                    );
                };

                const exportPDF = () => {
                    const v  = (val, cls='') => val > 0 ? `<span class="${cls}">${fmtN(val)}</span>` : `<span class="z">—</span>`;
                    const vc = (val, cls='') => val > 0 ? `<span class="${cls}">${fmtC(val)}</span>` : `<span class="z">—</span>`;
                    const pRows = rows.map((r, idx) => `<tr class="${idx%2===0?'r0':'r1'}">
                        <td class="tc sm">${idx+1}</td>
                        <td class="tl pl"><b>${r.name}</b>${r.skill?`<br><i class="sk">${r.skill}</i>`:''}</td>
                        <td class="tr">${v(r.mucLuong)}</td>
                        <td class="tr">${v(r.ngayLuong)}</td>
                        <td class="tc">${vc(r.ngayCong,'cb')}</td>
                        <td class="tr c3">${v(r.tongLuong,'cp')}</td>
                        <td class="tr">${v(r.thuong)}</td>
                        <td class="tr">${v(r.phuCap)}</td>
                        <td class="tr">${v(r.luongOT,'co')}</td>
                        <td class="tr c7 fw">${v(r.tongTien,'cg')}</td>
                        <td class="tr">${v(r.tamUng,'ca')}</td>
                        <td class="tr">${v(r.baoHiem,'cr')}</td>
                        <td class="tr">${v(r.cd,'cr')}</td>
                        <td class="tr c11 fw">${v(r.congGiamTru,'cr')}</td>
                        <td class="tr c12 fw">${v(r.thanhTien,'cg')}</td>
                        <td class="tr">${v(r.daThanhToan)}</td>
                        <td class="tr c14 fw">${v(r.conLai,'cb')}</td>
                        <td></td>
                    </tr>`).join('');

                    const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8">
<title>Bảng Thanh Toán Lương ${monthStr} — Xưởng Nội Thất SCT</title>
<style>
@page{size:A4 landscape;margin:7mm 6mm}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',Times,serif;font-size:8pt;color:#111;background:#fff}

/* PAGE HEADER */
.ph{display:flex;justify-content:space-between;align-items:center;padding-bottom:4px;margin-bottom:5px;border-bottom:2.5px solid #ea580c}
.co{font-size:9.5pt;font-weight:900;text-transform:uppercase;color:#ea580c;line-height:1.3}
.dept{font-size:7.5pt;color:#666}
.badge{background:#ea580c;color:#fff;font-size:11pt;font-weight:900;letter-spacing:2px;padding:3px 9px;border-radius:3px}

/* TITLE */
.ttl{text-align:center;font-size:11pt;font-weight:900;text-transform:uppercase;margin:3px 0 2px}
.dt{text-align:right;font-size:7.5pt;font-style:italic;color:#555;margin-bottom:4px}

/* TABLE */
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:.6px solid #aaa;padding:1.5px 2px;font-size:7pt;vertical-align:middle;line-height:1.2;overflow:hidden}
th{text-align:center;font-weight:700;line-height:1.15}

/* HEADER ROW 1 — orange */
thead tr:first-child th{background:#ea580c;color:#fff;border-color:#c04a08}
thead tr:first-child th.hg{background:#b91c1c;border-color:#991b1b}

/* HEADER ROW 2 — sub (Giảm trừ) */
thead tr:last-child th{background:#fff1e6;color:#9a3412;border-color:#fbc9a9}

/* COLUMN TINTS (data rows) */
.c3{background:#f9f5ff}.c7{background:#f0fdf4}.c11{background:#fff5f5}.c12{background:#f0fdf4}.c14{background:#eff6ff}
.r1 .c3{background:#f3eeff}.r1 .c7{background:#e7faee}.r1 .c11{background:#ffeaea}.r1 .c12{background:#e7faee}.r1 .c14{background:#e5f0ff}

/* TFOOT */
tfoot td{font-weight:700;background:#fff7ed;border-top:1.5px solid #ea580c;font-size:7pt}
tfoot .lbl{text-align:center;color:#ea580c;font-size:7.5pt}

/* UTILS */
.tc{text-align:center}.tr{text-align:right}.tl{text-align:left}.pl{padding-left:4px}
.fw{font-weight:700}.sm{color:#666;font-size:6.5pt}.sk{font-size:6pt;color:#888;font-weight:400}
.z{color:#ccc}.cp{color:#7c3aed}.cg{color:#15803d}.cb{color:#1d4ed8}.cr{color:#b91c1c}.ca{color:#b45309}.co{color:#c2410c}
.r0{background:#fff}.r1{background:#fafafa}

/* SIGS */
.sigs{margin-top:10px;display:flex;justify-content:space-between}
.sig{text-align:center;width:23%}
.sig-t{font-weight:700;font-size:8pt}
.sig-s{font-size:7pt;color:#666;font-style:italic;margin-top:1px}
.sig-l{margin-top:28px;border-top:1px dotted #aaa;padding-top:3px;font-size:7.5pt;font-style:italic;color:#666}

/* FOOTER */
.pf{margin-top:6px;padding-top:3px;border-top:.7px solid #ddd;display:flex;justify-content:space-between;font-size:6.5pt;color:#aaa;font-style:italic}
</style>
</head><body>

<div class="ph">
  <div><div class="co">Công ty TNHH Kiến Trúc Đô Thị SCT</div><div class="dept">Xưởng Nội Thất</div></div>
  <div class="badge">SCT</div>
</div>

<div class="ttl">Bảng thanh toán lương tháng ${monthStr} — Xưởng Nội Thất</div>
<div class="dt">Lào Cai, ngày &nbsp;&nbsp;&nbsp; tháng ${String(mw).padStart(2,'0')} năm ${yw}</div>

<table>
  <colgroup>
    <col style="width:6mm">  <!-- STT -->
    <col style="width:28mm"> <!-- Họ tên -->
    <col style="width:16mm"> <!-- Mức lương -->
    <col style="width:14mm"> <!-- Ngày lương TT (1) -->
    <col style="width:10mm"> <!-- Ngày công TT (2) -->
    <col style="width:17mm"> <!-- Tổng lương (3) -->
    <col style="width:13mm"> <!-- Thưởng PT (4) -->
    <col style="width:13mm"> <!-- Phụ cấp (5) -->
    <col style="width:14mm"> <!-- Lương OT (6) -->
    <col style="width:17mm"> <!-- Tổng tiền (7) -->
    <col style="width:14mm"> <!-- Tạm ứng (8) -->
    <col style="width:13mm"> <!-- Bảo hiểm (9) -->
    <col style="width:8mm">  <!-- CD (10) -->
    <col style="width:15mm"> <!-- Cộng (11) -->
    <col style="width:17mm"> <!-- Thành tiền (12) -->
    <col style="width:13mm"> <!-- Đã TT (13) -->
    <col style="width:17mm"> <!-- Còn lại (14) -->
    <col style="width:11mm"> <!-- Ký nhận -->
  </colgroup>
  <thead>
    <tr>
      <th rowspan="2">STT</th>
      <th rowspan="2" style="text-align:left;padding-left:4px">Họ và tên</th>
      <th rowspan="2">Mức lương</th>
      <th rowspan="2">Ngày lương thỏa thuận (1)</th>
      <th rowspan="2">Ngày công thực tế (2)</th>
      <th rowspan="2">Tổng lương theo ngày công (3=2×1)</th>
      <th rowspan="2">Thưởng phụ trách CT (4)</th>
      <th rowspan="2">Phụ cấp XX/ĐT/BS (5)</th>
      <th rowspan="2">Lương làm thêm giờ (6)</th>
      <th rowspan="2">Tổng tiền (7=3+4+5+6)</th>
      <th colspan="4" class="hg">Giảm trừ</th>
      <th rowspan="2">Thành tiền (12=7-11)</th>
      <th rowspan="2">Đã thanh toán (13)</th>
      <th rowspan="2">Còn lại (14=12-13)</th>
      <th rowspan="2">Ký nhận</th>
    </tr>
    <tr>
      <th>Tạm ứng (8)</th>
      <th>Bảo hiểm (9)</th>
      <th>CD (10)</th>
      <th>Cộng (11=8+9+10)</th>
    </tr>
  </thead>
  <tbody>${pRows}</tbody>
  <tfoot>
    <tr>
      <td colspan="2" class="lbl">TỔNG CỘNG</td>
      <td></td><td></td>
      <td class="tc fw cb">${fmtC(totals.ngayCong)}</td>
      <td class="tr fw cp c3">${fmtN(totals.tongLuong)}</td>
      <td class="tr">${fmtN(totals.thuong)}</td>
      <td class="tr">${fmtN(totals.phuCap)}</td>
      <td class="tr co">${fmtN(totals.luongOT)}</td>
      <td class="tr fw cg c7">${fmtN(totals.tongTien)}</td>
      <td class="tr ca">${fmtN(totals.tamUng)}</td>
      <td class="tr cr">${fmtN(totals.baoHiem)}</td>
      <td class="tr cr">${fmtN(totals.cd)}</td>
      <td class="tr fw cr c11">${fmtN(totals.congGiamTru)}</td>
      <td class="tr fw cg c12">${fmtN(totals.thanhTien)}</td>
      <td class="tr">${fmtN(totals.daThanhToan)}</td>
      <td class="tr fw cb c14">${fmtN(totals.conLai)}</td>
      <td></td>
    </tr>
  </tfoot>
</table>

<div class="sigs">
  <div class="sig"><div class="sig-t">Phụ trách bộ phận</div><div class="sig-s">Head of Department</div><div class="sig-l">Ký tên</div></div>
  <div class="sig"><div class="sig-t">Người lập</div><div class="sig-s">Prepared by</div><div class="sig-l">Ký tên</div></div>
  <div class="sig"><div class="sig-t">Phòng hành chính - Kế toán</div><div class="sig-s">Accounting &amp; HR</div><div class="sig-l">Ký tên</div></div>
  <div class="sig"><div class="sig-t">Giám đốc điều hành</div><div class="sig-s">Chief Executive Officer</div><div class="sig-l">Ký tên</div></div>
</div>

<div class="pf">
  <span>Tài liệu nội bộ — Công ty TNHH Kiến Trúc Đô Thị SCT</span>
  <span>Xưởng Nội Thất · Bảng lương tháng ${monthStr}</span>
</div>

</body></html>`;
                    const pw = window.open('', '_blank', 'width=1200,height=850');
                    pw.document.write(html); pw.document.close(); pw.focus();
                    setTimeout(() => pw.print(), 700);
                };

                return (
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <h3 style={{ margin: 0 }}>📋 Bảng thanh toán lương — Tháng {monthStr}</h3>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click ô để chỉnh sửa</span>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setPayrollMonth(''); }}
                                    title="Tải lại dữ liệu từ bảng chấm công">↺ Làm mới</button>
                                <button className="btn btn-sm"
                                    style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                    onClick={exportPDF}>🖨️ Xuất PDF</button>
                            </div>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: 1100 }}>
                                <thead>
                                    <tr>
                                        <th rowSpan={2} style={{ ...thBase, width: 30 }}>STT</th>
                                        <th rowSpan={2} style={{ ...thBase, minWidth: 110, textAlign: 'left', paddingLeft: 8, position: 'sticky', left: 0, zIndex: 2 }}>Họ và tên</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 70 }}>Mức lương</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 65 }}>Ngày lương TT (1)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 42 }}>Ngày công TT (2)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 70, background: '#ede9fe', color: '#6d28d9' }}>Tổng lương (3=2×1)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 58 }}>Thưởng PT (4)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 58 }}>Phụ cấp XX/ĐT/BS (5)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 65, background: '#fff7ed', color: '#c2410c' }}>Lương OT (6)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 72, background: '#dcfce7', color: '#15803d' }}>Tổng tiền (7=3+4+5+6)</th>
                                        <th colSpan={4} style={{ ...thBase, background: '#fee2e2', color: '#b91c1c' }}>Giảm trừ</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 72, background: '#dcfce7', color: '#166534', fontWeight: 800 }}>Thành tiền (12=7-11)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 65 }}>Đã thanh toán (13)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 72, background: '#dbeafe', color: '#1d4ed8', fontWeight: 800 }}>Còn lại (14=12-13)</th>
                                        <th rowSpan={2} style={{ ...thBase, width: 48 }}>Ký nhận</th>
                                    </tr>
                                    <tr>
                                        <th style={{ ...thBase, width: 65, background: '#fef9c3', color: '#b45309' }}>Tạm ứng (8)</th>
                                        <th style={{ ...thBase, width: 58, background: '#fee2e2', color: '#b91c1c' }}>Bảo hiểm (9)</th>
                                        <th style={{ ...thBase, width: 40, background: '#fee2e2', color: '#b91c1c' }}>CD (10)</th>
                                        <th style={{ ...thBase, width: 68, background: '#fee2e2', color: '#b91c1c' }}>Cộng (11=8+9+10)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, idx) => (
                                        <tr key={r.workerId} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                            <td style={{ ...tdBase, textAlign: 'center', color: '#6b7280' }}>{idx + 1}</td>
                                            <td style={{ ...tdBase, position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#f8fafc', zIndex: 1, fontWeight: 600 }}>
                                                <div style={{ fontSize: 11 }}>{r.name}</div>
                                                {r.skill && <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 400 }}>{r.skill}</div>}
                                            </td>
                                            {eCell(r, 'mucLuong')}
                                            {eCell(r, 'ngayLuong')}
                                            {eCell(r, 'ngayCong', {}, true)}
                                            <td style={{ ...cTd, color: '#6d28d9', background: '#faf5ff' }}>{fmtN(r.tongLuong)}</td>
                                            {eCell(r, 'thuong')}
                                            {eCell(r, 'phuCap')}
                                            {eCell(r, 'luongOT', { color: '#c2410c' })}
                                            <td style={{ ...greenTd }}>{fmtN(r.tongTien)}</td>
                                            {eCell(r, 'tamUng', { color: '#b45309', background: '#fffbeb' })}
                                            {eCell(r, 'baoHiem', { color: '#b91c1c' })}
                                            {eCell(r, 'cd', { color: '#b91c1c' })}
                                            <td style={{ ...redTd }}>{fmtN(r.congGiamTru)}</td>
                                            <td style={{ ...greenTd, fontWeight: 800 }}>{fmtN(r.thanhTien)}</td>
                                            {eCell(r, 'daThanhToan')}
                                            <td style={{ ...blueTd, fontWeight: 800 }}>{fmtN(r.conLai)}</td>
                                            <td style={{ ...tdBase }}></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #94a3b8' }}>
                                        <td colSpan={2} style={{ ...tdBase, textAlign: 'center', fontWeight: 800, position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 1 }}>TỔNG CỘNG</td>
                                        <td style={{ ...tdBase, textAlign: 'right', fontSize: 11 }}></td>
                                        <td style={{ ...tdBase, textAlign: 'right', fontSize: 11 }}></td>
                                        <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{fmtC(totals.ngayCong)}</td>
                                        <td style={{ ...cTd, color: '#6d28d9', background: '#faf5ff' }}>{fmtN(totals.tongLuong)}</td>
                                        <td style={{ ...tdBase, textAlign: 'right' }}>{fmtN(totals.thuong)}</td>
                                        <td style={{ ...tdBase, textAlign: 'right' }}>{fmtN(totals.phuCap)}</td>
                                        <td style={{ ...tdBase, textAlign: 'right', color: '#c2410c' }}>{fmtN(totals.luongOT)}</td>
                                        <td style={{ ...greenTd, fontWeight: 800 }}>{fmtN(totals.tongTien)}</td>
                                        <td style={{ ...tdBase, textAlign: 'right', color: '#b45309' }}>{fmtN(totals.tamUng)}</td>
                                        <td style={{ ...tdBase, textAlign: 'right', color: '#b91c1c' }}>{fmtN(totals.baoHiem)}</td>
                                        <td style={{ ...tdBase, textAlign: 'right', color: '#b91c1c' }}>{fmtN(totals.cd)}</td>
                                        <td style={{ ...redTd, fontWeight: 800 }}>{fmtN(totals.congGiamTru)}</td>
                                        <td style={{ ...greenTd, fontWeight: 800 }}>{fmtN(totals.thanhTien)}</td>
                                        <td style={{ ...tdBase, textAlign: 'right' }}>{fmtN(totals.daThanhToan)}</td>
                                        <td style={{ ...blueTd, fontWeight: 800 }}>{fmtN(totals.conLai)}</td>
                                        <td style={{ ...tdBase }}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        {payrollRows.length === 0 && (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                Mở bảng chấm công tháng để tải dữ liệu, hoặc nhấn ↺ Làm mới
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Bảng tổng hợp chấm cơm tháng */}
            {showMealSummary && (() => {
                const [y, m] = summaryMonth.split('-').map(Number);
                const daysInMonth = new Date(y, m, 0).getDate();
                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                const dayOfWeek = (day) => new Date(y, m - 1, day).getDay();
                const isWeekend = (day) => { const d = dayOfWeek(day); return d === 0 || d === 6; };

                // meal lookup: {workerId: {day: mealsCount}}
                const byWorkerDayMeal = {};
                summaryAttendance.forEach(a => {
                    if (!byWorkerDayMeal[a.workerId]) byWorkerDayMeal[a.workerId] = {};
                    const day = new Date(a.date).getUTCDate();
                    byWorkerDayMeal[a.workerId][day] = a.mealsCount || 0;
                });

                const summaryWorkers = workers.filter(w =>
                    w.status !== 'Nghỉ việc' || byWorkerDayMeal[w.id]
                );

                const workerMealTotal = (w) =>
                    Object.values(byWorkerDayMeal[w.id] || {}).reduce((s, n) => s + n, 0);

                const dayMealTotal = (day) =>
                    summaryWorkers.reduce((s, w) => s + (byWorkerDayMeal[w.id]?.[day] || 0), 0);

                const grandMealTotal = summaryWorkers.reduce((s, w) => s + workerMealTotal(w), 0);

                const prevMonth = () => { const d = new Date(y, m - 2, 1); setSummaryMonth(d.toISOString().slice(0, 7)); };
                const nextMonth = () => { const d = new Date(y, m, 1); setSummaryMonth(d.toISOString().slice(0, 7)); };

                const MEAL_LABEL = { 0: '', 1: '1', 2: '2' };
                const MEAL_BG = { 0: 'transparent', 1: '#fef9c3', 2: '#fef3c7' };
                const MEAL_COLOR = { 0: 'transparent', 1: '#92400e', 2: '#d97706' };

                const exportMealPDF = () => {
                    const monthStr = `${String(m).padStart(2, '0')}/${y}`;
                    const dayHeaders = days.map(d =>
                        `<th style="min-width:18px;font-size:7pt;${isWeekend(d) ? 'color:#dc2626;background:#fff5f5' : ''}">${d}</th>`
                    ).join('');

                    const bodyRows = summaryWorkers.map((w, idx) => {
                        const total = workerMealTotal(w);
                        const cells = days.map(d => {
                            const n = byWorkerDayMeal[w.id]?.[d] || 0;
                            const bg = n === 2 ? '#fef3c7' : n === 1 ? '#fef9c3' : '';
                            return `<td style="text-align:center;font-size:8pt;${bg ? `background:${bg}` : ''}">${n > 0 ? n : ''}</td>`;
                        }).join('');
                        return `<tr style="background:${idx % 2 === 0 ? '#fff' : '#fafafa'}">
                            <td style="text-align:center">${idx + 1}</td>
                            <td style="padding-left:6px;font-weight:600">${w.name}</td>
                            ${cells}
                            <td style="text-align:center;font-weight:700;background:#fef3c7;color:#d97706">${total > 0 ? total : ''}</td>
                        </tr>`;
                    }).join('');

                    const totalCells = days.map(d =>
                        `<td style="text-align:center;font-weight:700">${dayMealTotal(d) || ''}</td>`
                    ).join('');

                    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Bảng Chấm Cơm Tháng ${monthStr}</title>
<style>
@page{size:A4 landscape;margin:8mm}*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',Times,serif;font-size:9pt}
.hdr{margin-bottom:6px}.co{font-size:10pt;font-weight:bold;text-transform:uppercase}
.title{text-align:center;font-size:11pt;font-weight:bold;text-transform:uppercase;margin:4px 0}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #000;padding:2px 2px;vertical-align:middle}
th{background:#fef3c7;font-weight:bold;text-align:center}
tfoot td{font-weight:bold;background:#fef3c7}
</style></head><body>
<div class="hdr"><div class="co">Công ty TNHH kiến trúc đô thị SCT — Xưởng Nội Thất</div></div>
<div class="title">Bảng tổng hợp chấm cơm tháng ${monthStr}</div>
<table style="margin-top:8px">
<thead><tr>
  <th style="width:24px">STT</th>
  <th style="min-width:80px;text-align:left;padding-left:6px">Họ và tên</th>
  ${dayHeaders}
  <th style="min-width:30px;background:#d97706;color:#fff">Tổng</th>
</tr></thead>
<tbody>${bodyRows}</tbody>
<tfoot><tr>
  <td colspan="2" style="text-align:center">TỔNG</td>
  ${totalCells}
  <td style="text-align:center">${grandMealTotal || ''}</td>
</tr></tfoot>
</table></body></html>`;
                    const pw = window.open('', '_blank', 'width=1100,height=800');
                    pw.document.write(html); pw.document.close(); pw.focus();
                    setTimeout(() => pw.print(), 600);
                };

                return (
                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                            <h3 style={{ margin: 0 }}>🍚 Bảng tổng hợp chấm cơm tháng</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◀</button>
                                <input type="month" value={summaryMonth} onChange={e => setSummaryMonth(e.target.value)}
                                    style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 600 }} />
                                <button className="btn btn-ghost btn-sm" onClick={nextMonth}>▶</button>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    Tổng: <strong style={{ color: '#d97706' }}>{grandMealTotal} bữa</strong>
                                </span>
                                <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', border: 'none', fontWeight: 600 }}
                                    onClick={exportMealPDF} disabled={loadingSummary}>
                                    🖨️ Xuất PDF
                                </button>
                            </div>
                        </div>
                        {loadingSummary ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: '#fef3c7' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', position: 'sticky', left: 0, background: '#fef3c7', zIndex: 2, whiteSpace: 'nowrap', minWidth: 130, borderBottom: '2px solid #d97706', borderRight: '1px solid #d97706' }}>
                                                Họ tên
                                            </th>
                                            {days.map(d => (
                                                <th key={d} style={{
                                                    padding: '5px 3px', textAlign: 'center', minWidth: 24,
                                                    borderBottom: '2px solid #d97706',
                                                    color: isWeekend(d) ? '#dc2626' : '#92400e',
                                                    background: isWeekend(d) ? '#fff5f5' : '#fef3c7',
                                                    fontWeight: isWeekend(d) ? 700 : 400, fontSize: 11,
                                                }}>
                                                    {d}
                                                </th>
                                            ))}
                                            <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #d97706', borderLeft: '2px solid #d97706', whiteSpace: 'nowrap', color: '#d97706', fontWeight: 800, background: '#fef3c7' }}>Tổng bữa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryWorkers.map((w, idx) => {
                                            const mealMap = byWorkerDayMeal[w.id] || {};
                                            const total = workerMealTotal(w);
                                            return (
                                                <tr key={w.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fffbeb' }}>
                                                    <td style={{ padding: '6px 12px', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#fffbeb', zIndex: 1, fontWeight: 600, borderRight: '1px solid var(--border)' }}>
                                                        {w.name}
                                                    </td>
                                                    {days.map(d => {
                                                        const n = mealMap[d] || 0;
                                                        return (
                                                            <td key={d} style={{ textAlign: 'center', padding: '4px 2px', background: n > 0 ? MEAL_BG[n] : 'transparent', color: MEAL_COLOR[n], fontWeight: n > 0 ? 700 : 400, fontSize: 12 }}>
                                                                {n > 0 ? n : ''}
                                                            </td>
                                                        );
                                                    })}
                                                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#d97706', background: '#fef3c7', borderLeft: '2px solid #d97706', padding: '6px 10px' }}>
                                                        {total > 0 ? total : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#fff7ed', borderTop: '2px solid #d97706' }}>
                                            <td style={{ padding: '6px 12px', fontWeight: 700, position: 'sticky', left: 0, background: '#fff7ed', zIndex: 1, borderRight: '1px solid var(--border)' }}>
                                                Tổng mỗi ngày
                                            </td>
                                            {days.map(d => {
                                                const t = dayMealTotal(d);
                                                return (
                                                    <td key={d} style={{ textAlign: 'center', fontWeight: 700, color: t > 0 ? '#d97706' : 'var(--text-muted)', padding: '5px 2px' }}>
                                                        {t > 0 ? t : ''}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#d97706', background: '#fef3c7', borderLeft: '2px solid #d97706', padding: '6px 10px' }}>
                                                {grandMealTotal}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
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
                                <label className="form-label">🍚 Số bữa ăn</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {[0, 1, 2].map(n => (
                                        <button key={n} type="button"
                                            onClick={() => setAttendForm(f => ({ ...f, mealsCount: n }))}
                                            style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                                                borderColor: attendForm.mealsCount === n ? '#d97706' : 'var(--border)',
                                                background: attendForm.mealsCount === n ? '#fef3c7' : 'transparent',
                                                color: attendForm.mealsCount === n ? '#92400e' : 'var(--text-secondary)' }}>
                                            {n === 0 ? 'Không ăn' : n === 1 ? '🍚 1 bữa' : '🍚🍚 2 bữa'}
                                        </button>
                                    ))}
                                </div>
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
