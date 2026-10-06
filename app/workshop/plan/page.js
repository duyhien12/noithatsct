'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, Plus, Check, Users } from 'lucide-react';
import { PageHeader, Button, Modal, Field, Input, Select, Textarea, useToast } from '@/components/ui';
import s from './plan.module.css';

// Kế hoạch lắp đặt tại công trình: Gantt theo công trình, mỗi dòng là một đợt
// lắp đặt kèm số người. Dữ liệu riêng ở bảng InstallPlan (/api/workshop/install-plans),
// không liên quan hạng mục tiến độ (ScheduleTask).

const PROJECT_TYPE = 'Thi công nội thất';
const DEFAULT_NAME = 'Lắp đặt tại công trình';
const STATUSES = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành'];
const DAY_MS = 86400000;
const ROW_H = 44;
const GROUP_H = 36;
const BAR_H = 24;
const SOON_DAYS = 3; // "Sắp đến hạn" = hạn trong 3 ngày tới

const VIEWS = [
    { key: 'day', label: 'Ngày' },
    { key: 'week', label: 'Tuần' },
    { key: 'month', label: 'Tháng' },
    { key: 'quarter', label: 'Quý' },
];

const pad = (n) => String(n).padStart(2, '0');
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diffDays = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
const fmtDM = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const toInput = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

// Trạng thái hiển thị: done | late | doing | todo
function visualState(p, today) {
    if (p.status === 'Hoàn thành') return 'done';
    if (startOfDay(p.endDate) < today) return 'late';
    if (p.status === 'Đang thực hiện') return 'doing';
    return 'todo';
}

// Dựng trục thời gian theo chế độ xem. `anchor` = ngày đầu tháng đang chọn.
function buildScale(view, anchor) {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    let start, end, pxPerDay;
    if (view === 'day')     { start = new Date(y, m, 1);     end = new Date(y, m + 1, 1); pxPerDay = 32; }
    if (view === 'week')    { start = new Date(y, m - 1, 1); end = new Date(y, m + 2, 1); pxPerDay = 12; }
    if (view === 'month')   { start = new Date(y, m - 2, 1); end = new Date(y, m + 4, 1); pxPerDay = 6; }
    if (view === 'quarter') { start = new Date(y, 0, 1);     end = new Date(y + 1, 0, 1); pxPerDay = 3; }
    const totalDays = diffDays(start, end);
    const groups = [];
    const units = [];
    const seg = (from, to) => ({ startDay: diffDays(start, from), days: diffDays(from, to) });

    const months = [];
    for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) months.push(d);
    const monthEnd = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1);

    if (view === 'day') {
        // Tuần trong tháng: 1–7, 8–14, 15–21, 22–cuối tháng (tuần cuối gộp phần dư)
        const last = totalDays;
        [[1, 7], [8, 14], [15, 21], [22, last]].forEach(([a, b], i) => {
            groups.push({
                ...seg(new Date(y, m, a), new Date(y, m, b + 1)),
                label: `Tuần ${i + 1}`,
                sub: `${pad(a)} - ${pad(b)} Tháng ${m + 1}`,
            });
        });
        for (let i = 0; i < totalDays; i++) {
            const d = addDays(start, i);
            units.push({ startDay: i, days: 1, label: pad(d.getDate()), date: d, weekend: d.getDay() === 0 || d.getDay() === 6 });
        }
    } else if (view === 'week') {
        months.forEach(d => groups.push({ ...seg(d, monthEnd(d)), label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}` }));
        // Tuần bắt đầu từ thứ Hai, cắt theo biên phạm vi
        let ws = addDays(start, -((start.getDay() + 6) % 7));
        while (ws < end) {
            const we = addDays(ws, 7);
            const from = ws < start ? start : ws;
            const to = we > end ? end : we;
            units.push({ ...seg(from, to), label: fmtDM(ws), date: ws });
            ws = we;
        }
    } else if (view === 'month') {
        const years = [...new Set(months.map(d => d.getFullYear()))];
        years.forEach(yr => {
            const from = new Date(Math.max(start, new Date(yr, 0, 1)));
            const to = new Date(Math.min(end, new Date(yr + 1, 0, 1)));
            groups.push({ ...seg(from, to), label: `Năm ${yr}` });
        });
        months.forEach(d => units.push({ ...seg(d, monthEnd(d)), label: `Tháng ${d.getMonth() + 1}`, date: d }));
    } else {
        for (let q = 0; q < 4; q++) {
            groups.push({ ...seg(new Date(y, q * 3, 1), new Date(y, q * 3 + 3, 1)), label: `Quý ${q + 1}`, sub: `T${q * 3 + 1} - T${q * 3 + 3}/${y}` });
        }
        months.forEach(d => units.push({ ...seg(d, monthEnd(d)), label: `T${d.getMonth() + 1}`, date: d }));
    }
    return { start, end, pxPerDay, totalDays, width: totalDays * pxPerDay, groups, units };
}

const EMPTY_FORM = { id: null, name: DEFAULT_NAME, projectId: '', workerCount: 2, status: 'Chưa bắt đầu', startDate: '', endDate: '', notes: '' };

export default function WorkshopPlanPage() {
    const toast = useToast();
    const today = useMemo(() => startOfDay(new Date()), []);
    const [plans, setPlans] = useState([]);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterProject, setFilterProject] = useState('');
    const [filterState, setFilterState] = useState('');
    const [anchor, setAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [view, setView] = useState('day');
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const scrollRef = useRef(null);
    // useToast() không có provider sẽ trả object mới mỗi lần render — giữ qua ref
    const toastRef = useRef(toast);
    useEffect(() => { toastRef.current = toast; });

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [pl, pr] = await Promise.all([
                fetch('/api/workshop/install-plans').then(r => r.json()),
                fetch(`/api/projects?limit=500&type=${encodeURIComponent(PROJECT_TYPE)}`).then(r => r.json()),
            ]);
            setPlans(Array.isArray(pl) ? pl : []);
            setProjects((pr?.data || []).filter(x => !x.deletedAt));
        } catch {
            toastRef.current.error('Không tải được kế hoạch lắp đặt');
        }
        if (!silent) setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        const id = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(id);
    }, [fetchData]);

    const scale = useMemo(() => buildScale(view, anchor), [view, anchor]);

    // Kế hoạch giao với khoảng thời gian đang xem
    const visible = useMemo(() => plans.filter(p => {
        if (filterProject && p.projectId !== filterProject) return false;
        return new Date(p.startDate) < scale.end && addDays(p.endDate, 1) > scale.start;
    }).map(p => ({ ...p, state: visualState(p, today) })), [plans, filterProject, scale, today]);

    const isSoon = useCallback((p) => p.state !== 'done' && p.state !== 'late'
        && startOfDay(p.endDate) <= addDays(today, SOON_DAYS), [today]);

    const stats = useMemo(() => ({
        doing: visible.filter(p => p.state === 'doing').length,
        soon: visible.filter(isSoon).length,
        late: visible.filter(p => p.state === 'late').length,
    }), [visible, isSoon]);

    const shown = useMemo(() => {
        if (!filterState) return visible;
        if (filterState === 'soon') return visible.filter(isSoon);
        return visible.filter(p => p.state === filterState);
    }, [visible, filterState, isSoon]);

    // Nhóm theo công trình
    const groups = useMemo(() => {
        const map = new Map();
        shown.forEach(p => {
            if (!map.has(p.projectId)) map.set(p.projectId, { id: p.projectId, name: p.project?.name || 'Không rõ công trình', items: [] });
            map.get(p.projectId).items.push(p);
        });
        const list = [...map.values()];
        list.forEach(g => g.items.sort((a, b) => new Date(a.startDate) - new Date(b.startDate) || a.order - b.order));
        return list.sort((a, b) => new Date(a.items[0].startDate) - new Date(b.items[0].startDate));
    }, [shown]);

    const barOf = useCallback((p) => {
        const sd = Math.max(0, diffDays(scale.start, p.startDate));
        const ed = Math.min(scale.totalDays, diffDays(scale.start, p.endDate) + 1);
        return { x: sd * scale.pxPerDay, w: Math.max(ed - sd, 1) * scale.pxPerDay };
    }, [scale]);

    const rows = useMemo(() => {
        const out = [];
        groups.forEach(g => {
            out.push({ type: 'group', group: g });
            if (!collapsed.has(g.id)) g.items.forEach(p => out.push({ type: 'item', plan: p, bar: barOf(p) }));
        });
        return out;
    }, [groups, collapsed, barOf]);

    const bodyH = rows.reduce((h, r) => h + (r.type === 'group' ? GROUP_H : ROW_H), 0);

    // Tổng số người theo từng ngày (chỉ chế độ Ngày) — kế hoạch chưa hoàn thành
    const dailyPeople = useMemo(() => {
        if (view !== 'day') return null;
        return scale.units.map(u => shown.reduce((sum, p) => (
            p.state !== 'done' && startOfDay(p.startDate) <= u.date && startOfDay(p.endDate) >= u.date
                ? sum + p.workerCount : sum
        ), 0));
    }, [view, scale, shown]);

    const todayX = today >= scale.start && today < scale.end
        ? (diffDays(scale.start, today) + 0.5) * scale.pxPerDay
        : null;

    // Cuộn tới "Hôm nay" khi đổi chế độ xem/tháng
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || loading) return;
        if (todayX === null) { el.scrollLeft = 0; return; }
        const leftW = el.querySelector('[data-left]')?.offsetWidth || 0;
        el.scrollLeft = Math.max(0, todayX - (el.clientWidth - leftW) / 2);
    }, [todayX, loading, view, anchor]);

    const monthOptions = useMemo(() => {
        const list = [];
        for (let i = -12; i <= 12; i++) list.push(new Date(today.getFullYear(), today.getMonth() + i, 1));
        return list;
    }, [today]);

    const toggleGroup = (id) => setCollapsed(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    // ---------- Thêm / sửa ----------
    const openAdd = () => {
        setConfirmDelete(false);
        setForm({ ...EMPTY_FORM, projectId: filterProject || '', startDate: toInput(today), endDate: toInput(addDays(today, 2)) });
    };
    const openEdit = (p) => {
        setConfirmDelete(false);
        setForm({
            id: p.id, name: p.name, projectId: p.projectId, workerCount: p.workerCount, status: p.status,
            startDate: toInput(p.startDate), endDate: toInput(p.endDate), notes: p.notes || '',
        });
    };
    const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    const workerNum = form ? Number(form.workerCount) : 0;
    const formError = form && (
        !form.projectId ? 'Chọn công trình'
            : !Number.isInteger(workerNum) || workerNum < 1 ? 'Số người phải từ 1 trở lên'
            : !form.startDate || !form.endDate ? 'Chọn ngày bắt đầu và kết thúc'
            : form.endDate < form.startDate ? 'Ngày kết thúc phải sau ngày bắt đầu'
            : null
    );

    const save = async () => {
        if (formError) return;
        setSaving(true);
        try {
            const body = {
                name: form.name.trim() || DEFAULT_NAME,
                workerCount: workerNum,
                status: form.status,
                startDate: form.startDate,
                endDate: form.endDate,
                notes: form.notes,
            };
            const res = form.id
                ? await fetch(`/api/workshop/install-plans/${form.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                })
                : await fetch('/api/workshop/install-plans', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...body, projectId: form.projectId }),
                });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Lưu không thành công');
            toast.success(form.id ? 'Đã cập nhật kế hoạch' : 'Đã thêm kế hoạch lắp đặt');
            setForm(null);
            fetchData(true);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!confirmDelete) { setConfirmDelete(true); return; }
        setSaving(true);
        try {
            const res = await fetch(`/api/workshop/install-plans/${form.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Xóa không thành công');
            toast.success('Đã xóa kế hoạch');
            setForm(null);
            fetchData(true);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const STAT_CARDS = [
        { key: 'doing', label: 'Đang thực hiện', value: stats.doing, Icon: CheckCircle2, cls: s.statSuccess },
        { key: 'soon', label: 'Sắp đến hạn', value: stats.soon, Icon: Clock, cls: s.statWarning },
        { key: 'late', label: 'Chậm tiến độ', value: stats.late, Icon: AlertCircle, cls: s.statDanger },
    ];

    const BAR_CLASS = { todo: s.barTodo, doing: s.barDoing, done: s.barDone, late: s.barLate };

    return (
        <div className={s.page}>
            <PageHeader
                title="Kế hoạch & tiến độ"
                description="Kế hoạch lắp đặt tại công trình"
                actions={<Button variant="primary" icon={Plus} onClick={openAdd}>Thêm công việc</Button>}
            />

            <div className={s.stats}>
                {STAT_CARDS.map(({ key, label, value, Icon, cls }) => (
                    <button
                        key={key}
                        type="button"
                        className={`${s.stat} ${cls} ${filterState === key ? s.statActive : ''}`}
                        onClick={() => setFilterState(f => (f === key ? '' : key))}
                        aria-pressed={filterState === key}
                        title={filterState === key ? 'Bỏ lọc' : `Chỉ xem: ${label}`}
                    >
                        <Icon size={40} strokeWidth={2} className={s.statIcon} aria-hidden="true" />
                        <div>
                            <div className={s.statLabel}>{label}</div>
                            <div className={s.statValue}><b>{value}</b><span>công việc</span></div>
                        </div>
                    </button>
                ))}
            </div>

            <div className={s.toolbar}>
                <Select className={s.toolSelect} value={filterProject} onChange={e => setFilterProject(e.target.value)} aria-label="Lọc công trình">
                    <option value="">Tất cả công trình</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
                <Select
                    className={s.toolSelect}
                    value={`${anchor.getFullYear()}-${anchor.getMonth()}`}
                    onChange={e => { const [yy, mm] = e.target.value.split('-').map(Number); setAnchor(new Date(yy, mm, 1)); }}
                    aria-label="Chọn tháng"
                >
                    {monthOptions.map(d => (
                        <option key={d.getTime()} value={`${d.getFullYear()}-${d.getMonth()}`}>
                            Tháng {pad(d.getMonth() + 1)}/{d.getFullYear()}
                        </option>
                    ))}
                </Select>
                <div className={s.segmented} role="group" aria-label="Chế độ xem">
                    {VIEWS.map(v => (
                        <button key={v.key} type="button" className={view === v.key ? s.segActive : ''}
                            aria-pressed={view === v.key} onClick={() => setView(v.key)}>
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={s.card}>
                {loading ? (
                    <div className={s.empty}>Đang tải…</div>
                ) : groups.length === 0 ? (
                    <div className={s.empty}>
                        {filterState ? 'Không có công việc nào khớp bộ lọc.' : 'Chưa có kế hoạch lắp đặt nào trong khoảng thời gian này.'}
                    </div>
                ) : (
                    <div className={s.scroll} ref={scrollRef}>
                        <div className={s.inner} style={{ width: `calc(var(--left-w) + ${scale.width}px)` }}>
                            {/* Header */}
                            <div className={s.head}>
                                <div className={s.leftHead} data-left>
                                    <div>Công việc</div>
                                    <div style={{ textAlign: 'center' }}>Số người</div>
                                </div>
                                <div className={s.timeHead} style={{ width: scale.width }}>
                                    <div className={s.groupRow}>
                                        {scale.groups.map((g, i) => (
                                            <div key={i} className={s.groupCell} style={{ width: g.days * scale.pxPerDay }}>
                                                <b>{g.label}</b>
                                                {g.sub && <span>{g.sub}</span>}
                                            </div>
                                        ))}
                                    </div>
                                    <div className={s.unitRow}>
                                        {scale.units.map((u, i) => {
                                            const isToday = view === 'day' && diffDays(u.date, today) === 0;
                                            return (
                                                <div key={i}
                                                    className={`${s.unitCell} ${u.weekend ? s.unitWeekend : ''} ${isToday ? s.unitToday : ''}`}
                                                    style={{ width: u.days * scale.pxPerDay }}>
                                                    {u.label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {todayX !== null && <div className={s.todayTag} style={{ left: todayX }}>Hôm nay</div>}
                                </div>
                            </div>

                            {/* Body */}
                            <div className={s.body}>
                                <svg className={s.overlay} width={scale.width} height={bodyH} aria-hidden="true">
                                    {scale.units.map((u, i) => (
                                        <g key={i}>
                                            {u.weekend && <rect x={u.startDay * scale.pxPerDay} y={0} width={scale.pxPerDay} height={bodyH} fill="var(--color-surface-3)" opacity="0.6" />}
                                            <line x1={u.startDay * scale.pxPerDay} x2={u.startDay * scale.pxPerDay} y1={0} y2={bodyH}
                                                stroke="var(--color-border-subtle)" strokeWidth="1" />
                                        </g>
                                    ))}
                                    {todayX !== null && (
                                        <line x1={todayX} x2={todayX} y1={0} y2={bodyH}
                                            stroke="var(--color-primary-600)" strokeWidth="1.5" strokeDasharray="5 4" />
                                    )}
                                </svg>

                                {rows.map(r => {
                                    if (r.type === 'group') {
                                        const g = r.group;
                                        const isCollapsed = collapsed.has(g.id);
                                        return (
                                            <div key={`g-${g.id}`} className={`${s.row} ${s.groupRowLine}`} style={{ height: GROUP_H }}
                                                onClick={() => toggleGroup(g.id)} role="button" tabIndex={0}
                                                aria-expanded={!isCollapsed}
                                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroup(g.id); } }}>
                                                <div className={s.left} style={{ height: GROUP_H }}>
                                                    <div className={s.groupTitle}>
                                                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                                        <span className={s.groupName} title={g.name}>{g.name}</span>
                                                        <em>({g.items.length} công việc)</em>
                                                    </div>
                                                </div>
                                                <div className={s.right} style={{ width: scale.width }} />
                                            </div>
                                        );
                                    }
                                    const p = r.plan;
                                    const st = new Date(p.startDate);
                                    const en = new Date(p.endDate);
                                    const range = `${fmtDM(st)} - ${fmtDM(en)}`;
                                    const lateDays = p.state === 'late' ? diffDays(en, today) : 0;
                                    const tip = `${p.name}\n${range}\nSố người: ${p.workerCount}\n${p.status}${lateDays ? ` · trễ ${lateDays} ngày` : ''}${p.notes ? `\n${p.notes}` : ''}`;
                                    return (
                                        <div key={p.id} className={s.row} style={{ height: ROW_H }}>
                                            <div className={s.left} style={{ height: ROW_H }}>
                                                <button type="button" className={`${s.taskName} ${p.state === 'late' ? s.taskLate : ''}`}
                                                    onClick={() => openEdit(p)} title={p.name}>
                                                    {p.name}
                                                </button>
                                                <div className={s.people} title={`${p.workerCount} người`}>
                                                    <Users size={14} aria-hidden="true" /> {p.workerCount}
                                                </div>
                                            </div>
                                            <div className={s.right} style={{ width: scale.width }}>
                                                <div
                                                    className={`${s.bar} ${BAR_CLASS[p.state]}`}
                                                    style={{ left: r.bar.x + 1, width: Math.max(r.bar.w - 2, 4), top: (ROW_H - BAR_H) / 2, height: BAR_H }}
                                                    title={tip}
                                                    onClick={() => openEdit(p)}
                                                >
                                                    {r.bar.w >= 84 && (
                                                        <span className={s.barLabel}>
                                                            {range}
                                                            {p.state === 'done' && <Check size={14} strokeWidth={3} aria-hidden="true" />}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {dailyPeople && (
                                <div className={`${s.row} ${s.totalRow}`} style={{ height: ROW_H }}>
                                    <div className={s.left} style={{ height: ROW_H }}>
                                        <div className={s.totalLabel}>Tổng số người / ngày</div>
                                    </div>
                                    <div className={s.right} style={{ width: scale.width, display: 'flex' }}>
                                        {dailyPeople.map((n, i) => (
                                            <div key={i} className={s.totalCell} style={{ width: scale.pxPerDay }}>{n || ''}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className={s.legend}>
                    <span><i style={{ background: 'var(--color-neutral-br)' }} />Chưa bắt đầu</span>
                    <span><i style={{ background: 'var(--color-info)' }} />Đang thực hiện</span>
                    <span><i style={{ background: 'var(--color-success)' }} />Hoàn thành</span>
                    <span><i style={{ background: 'var(--color-danger)', opacity: 0.6 }} />Quá hạn</span>
                    <span className={s.legendNote}>Bấm vào công việc để sửa</span>
                </div>
            </div>

            <Modal
                isOpen={!!form}
                onClose={() => setForm(null)}
                title={form?.id ? 'Sửa kế hoạch lắp đặt' : 'Thêm kế hoạch lắp đặt'}
                maxWidth={620}
                closeOnOverlayClick={false}
                footer={form && (
                    <div className={s.footer}>
                        {form.id ? (
                            <Button variant={confirmDelete ? 'danger-solid' : 'danger'} onClick={remove} disabled={saving}>
                                {confirmDelete ? 'Bấm lần nữa để xóa' : 'Xóa'}
                            </Button>
                        ) : <span />}
                        <Button variant="ghost" onClick={() => setForm(null)}>Hủy</Button>
                        <Button variant="primary" onClick={save} loading={saving} disabled={!!formError}
                            title={formError || undefined}>
                            {form.id ? 'Lưu' : 'Thêm'}
                        </Button>
                    </div>
                )}
            >
                {form && (
                    <div className={s.formGrid}>
                        <Field label="Công trình" required className={s.full}>
                            {(a) => (
                                <Select {...a} value={form.projectId} disabled={!!form.id} onChange={setF('projectId')}>
                                    <option value="">— Chọn công trình —</option>
                                    {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.code ? `${pr.code} · ` : ''}{pr.name}</option>)}
                                </Select>
                            )}
                        </Field>
                        <Field label="Công việc" className={s.full}>
                            {(a) => <Input {...a} value={form.name} onChange={setF('name')} placeholder={DEFAULT_NAME} />}
                        </Field>
                        <Field label="Số người" required>
                            {(a) => <Input {...a} type="number" min={1} step={1} numeric value={form.workerCount} onChange={setF('workerCount')} />}
                        </Field>
                        <Field label="Trạng thái">
                            {(a) => (
                                <Select {...a} value={form.status} onChange={setF('status')}>
                                    {STATUSES.map(x => <option key={x} value={x}>{x}</option>)}
                                </Select>
                            )}
                        </Field>
                        <Field label="Ngày bắt đầu" required>
                            {(a) => <Input {...a} type="date" value={form.startDate} onChange={setF('startDate')} />}
                        </Field>
                        <Field label="Ngày kết thúc" required>
                            {(a) => <Input {...a} type="date" value={form.endDate} min={form.startDate} onChange={setF('endDate')} />}
                        </Field>
                        <Field label="Ghi chú" className={s.full}>
                            {(a) => <Textarea {...a} rows={2} value={form.notes} onChange={setF('notes')} />}
                        </Field>
                    </div>
                )}
            </Modal>
        </div>
    );
}
