'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, Plus, Check, Users } from 'lucide-react';
import { PageHeader, Button, Modal, Field, Input, Select, Textarea, Checkbox, useToast } from '@/components/ui';
import { rangesOverlap, sumMembers, TEAM_KINDS } from '@/lib/installTeams';
import { splitList, joinList } from '@/lib/schedule/mapping';
import { ScheduleRunModal, ScheduleSettingsModal, TeamTimeline } from './ScheduleRunModal';
import s from './plan.module.css';

// Kế hoạch lắp đặt tại công trình: Gantt theo công trình, mỗi dòng là một đợt
// lắp đặt gán cho các đội thi công. Dữ liệu riêng ở bảng InstallPlan (/api/workshop/install-plans),
// không liên quan hạng mục tiến độ (ScheduleTask).

// Công trình = khách hàng Phòng Kinh doanh ở cột "Khách hợp đồng" và "Khách ưu tiên"
// (pipelineStage, khớp PIPELINE trong app/customers/page.js)
const CUSTOMER_STAGES = [
    { key: 'Thi công', label: 'Hợp đồng' },
    { key: 'Báo giá', label: 'Ưu tiên' },
];
const STAGE_LABEL = Object.fromEntries(CUSTOMER_STAGES.map(x => [x.key, x.label]));
const DEFAULT_NAME = 'Lắp đặt tại công trình';
const STATUSES = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành'];
const DAY_MS = 86400000;
const ROW_H = 44;
const GROUP_H = 56; // đủ chỗ cho tên công trình dài xuống 2 dòng
const BAR_H = 24;
const SOON_DAYS = 3; // "Sắp đến hạn" = hạn trong 3 ngày tới
const DRAG_PX = 4; // kéo dưới ngưỡng này coi như bấm (mở form sửa)
const HANDLE_MIN_W = 28; // thanh hẹp hơn thì chỉ kéo di chuyển, không co giãn

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

// Ngày mới khi kéo: move = dời cả thanh, start/end = kéo mép trái/phải để co giãn
function draggedRange(p, mode, delta) {
    let st = startOfDay(p.startDate);
    let en = startOfDay(p.endDate);
    if (mode === 'move') { st = addDays(st, delta); en = addDays(en, delta); }
    if (mode === 'start') st = addDays(st, Math.min(delta, diffDays(st, en)));
    if (mode === 'end') en = addDays(en, Math.max(delta, -diffDays(st, en)));
    return { startDate: st, endDate: en };
}

// Trạng thái hiển thị: done | late | doing | todo
function visualState(p, today) {
    if (p.status === 'Hoàn thành') return 'done';
    if (startOfDay(p.endDate) < today) return 'late';
    if (p.status === 'Đang thực hiện') return 'doing';
    return 'todo';
}

// Dựng trục thời gian theo chế độ xem. `anchor` = ngày đầu tháng đang chọn.
// `fitW` = bề rộng còn trống của vùng timeline — giãn cột cho vừa khung, không để trống bên phải.
function buildScale(view, anchor, fitW = 0) {
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    let start, end, pxPerDay;
    if (view === 'day')     { start = new Date(y, m, 1);     end = new Date(y, m + 1, 1); pxPerDay = 32; }
    if (view === 'week')    { start = new Date(y, m - 1, 1); end = new Date(y, m + 2, 1); pxPerDay = 12; }
    if (view === 'month')   { start = new Date(y, m - 2, 1); end = new Date(y, m + 4, 1); pxPerDay = 6; }
    if (view === 'quarter') { start = new Date(y, 0, 1);     end = new Date(y + 1, 0, 1); pxPerDay = 3; }
    const totalDays = diffDays(start, end);
    pxPerDay = Math.max(pxPerDay, Math.floor((fitW / totalDays) * 100) / 100);
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

const EMPTY_FORM = {
    id: null, name: DEFAULT_NAME, customerId: '', customerName: '', teamIds: [], status: 'Chưa bắt đầu', startDate: '', endDate: '', notes: '',
    // Thông tin để bộ xếp lịch
    effortHours: '', doneHours: '0', priority: 3, deadline: '', startNotBefore: '', readyDate: '', siteReadyDate: '',
    skill: '', maxTeams: 1, travelDays: 0, allowOvertime: false, locked: false, dependsOn: [],
};

// Danh sách đội của một đợt (từ API: p.teams[].team)
const teamsOf = (p) => (p.teams || []).map(x => x.team).filter(Boolean);
const teamTip = (p) => {
    const list = teamsOf(p);
    if (!list.length) return 'Chưa gán đội';
    return `Đội: ${list.map(t => t.name).join(', ')} · ${sumMembers(list)} người`;
};

export default function WorkshopPlanPage() {
    const toast = useToast();
    const today = useMemo(() => startOfDay(new Date()), []);
    const [plans, setPlans] = useState([]);
    const [teams, setTeams] = useState([]);
    const [teamModal, setTeamModal] = useState(false);
    // Bộ xếp lịch: danh sách bản tính, bản đang xem, cấu hình giờ làm, chế độ xem
    const [runs, setRuns] = useState([]);
    const [runDetail, setRunDetail] = useState(null);
    const [runModal, setRunModal] = useState(false);
    const [settingsModal, setSettingsModal] = useState(false);
    const [settings, setSettings] = useState(null);
    const [scheduleBusy, setScheduleBusy] = useState(false);
    const [viewMode, setViewMode] = useState('plan'); // plan = theo công trình | team = theo đội
    const [quick, setQuick] = useState({ size: 2, days: 1, hours: 8 }); // nhập nhanh khối lượng: đội × ngày × giờ
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCustomer, setFilterCustomer] = useState('');
    const [filterState, setFilterState] = useState('');
    const [anchor, setAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [view, setView] = useState('day');
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [drag, setDrag] = useState(null); // { id, mode, x0, delta, moved }
    const dragRef = useRef(null);
    const scrollRef = useRef(null);
    const [fitW, setFitW] = useState(0);
    // useToast() không có provider sẽ trả object mới mỗi lần render — giữ qua ref
    const toastRef = useRef(toast);
    useEffect(() => { toastRef.current = toast; });

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [pl, tm, ...byStage] = await Promise.all([
                fetch('/api/workshop/install-plans').then(r => r.json()),
                fetch('/api/workshop/install-teams').then(r => r.json()),
                ...CUSTOMER_STAGES.map(st => fetch(`/api/customers?dept=kinh_doanh&pipelineStage=${encodeURIComponent(st.key)}&limit=500`).then(r => r.json())),
            ]);
            setPlans(Array.isArray(pl) ? pl : []);
            setTeams(Array.isArray(tm) ? tm : []);
            // Khách hợp đồng trước, khách ưu tiên sau
            setCustomers(byStage.flatMap(r => r?.data || []).filter(x => !x.deletedAt));
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

    const scale = useMemo(() => buildScale(view, anchor, fitW), [view, anchor, fitW]);

    // Kế hoạch giao với khoảng thời gian đang xem
    // Đã hoàn thành thì ẩn khỏi bảng (cả thanh lẫn nhóm công trình không còn việc nào)
    const visible = useMemo(() => plans.filter(p => {
        if (p.status === 'Hoàn thành') return false;
        if (filterCustomer && p.customerId !== filterCustomer) return false;
        return new Date(p.startDate) < scale.end && addDays(p.endDate, 1) > scale.start;
    }).map(p => ({ ...p, state: visualState(p, today) })), [plans, filterCustomer, scale, today]);

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
            // Công trình ghi tay (không có khách trong danh sách) nhóm theo tên gõ
            const key = p.customerId || `name:${p.customerName}`;
            if (!map.has(key)) map.set(key, { id: key, name: p.customer?.name || p.customerName || 'Không rõ công trình', items: [] });
            map.get(key).items.push(p);
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
            if (!collapsed.has(g.id)) g.items.forEach(p => out.push({ type: 'item', plan: p }));
        });
        return out;
    }, [groups, collapsed]);

    const bodyH = rows.reduce((h, r) => h + (r.type === 'group' ? GROUP_H : ROW_H), 0);

    // Tổng số người theo từng ngày (chỉ chế độ Ngày) — kế hoạch chưa hoàn thành
    const dailyPeople = useMemo(() => {
        if (view !== 'day') return null;
        return scale.units.map(u => shown.reduce((sum, p) => (
            p.state !== 'done' && startOfDay(p.startDate) <= u.date && startOfDay(p.endDate) >= u.date
                ? sum + p.workerCount : sum
        ), 0));
    }, [view, scale, shown]);

    // Tải theo đội: mỗi đội một dòng, các đợt đang còn việc trong khoảng đang xem.
    // Đợt nào trùng ngày với đợt khác của cùng đội thì đánh dấu clash (tô đỏ).
    const teamLoad = useMemo(() => {
        if (!teams.length) return [];
        const inView = plans
            .filter(p => p.status !== 'Hoàn thành' && new Date(p.startDate) < scale.end && addDays(new Date(p.endDate), 1) > scale.start)
            .map(p => ({ ...p, state: visualState(p, today) }));
        return teams
            .filter(t => t.active || inView.some(p => teamsOf(p).some(x => x.id === t.id)))
            .map(t => {
                const items = inView
                    .filter(p => teamsOf(p).some(x => x.id === t.id))
                    .map(p => ({ ...p, clash: false }));
                items.forEach((a, i) => items.forEach((b, j) => {
                    if (i !== j && rangesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) a.clash = true;
                }));
                return { team: t, items };
            });
    }, [teams, plans, scale, today]);

    const todayX = today >= scale.start && today < scale.end
        ? (diffDays(scale.start, today) + 0.5) * scale.pxPerDay
        : null;

    // Đo bề rộng vùng timeline để giãn cột cho kín khung
    const hasRows = rows.length > 0;
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const measure = () => {
            const leftW = el.querySelector('[data-left]')?.offsetWidth || 0;
            setFitW(Math.max(0, el.clientWidth - leftW));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [loading, hasRows]);

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

    // ---------- Bộ xếp lịch ----------
    const fetchRuns = useCallback(async () => {
        try {
            const r = await fetch('/api/workshop/schedule/runs').then(x => x.json());
            const list = Array.isArray(r) ? r : [];
            setRuns(list);
            return list;
        } catch {
            return [];
        }
    }, []);
    const loadRun = useCallback(async (id) => {
        const r = await fetch(`/api/workshop/schedule/runs/${id}`).then(x => x.json());
        if (r.error) throw new Error(r.error);
        setRunDetail(r);
        return r;
    }, []);
    // Mở trang: hiện bản đã chốt gần nhất (hoặc bản nháp gần nhất) để xem theo đội
    useEffect(() => {
        (async () => {
            const list = await fetchRuns();
            const pick = list.find(r => r.status === 'applied') || list.find(r => r.status === 'draft');
            if (pick) loadRun(pick.id).catch(() => null);
        })();
    }, [fetchRuns, loadRun]);

    const createRun = async (kind) => {
        setScheduleBusy(true);
        try {
            const res = await fetch('/api/workshop/schedule/runs', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }),
            });
            const data = await res.json();
            if (!res.ok) {
                const extra = data.violations?.[0]?.message ? `: ${data.violations[0].message}` : '';
                throw new Error((data.error || 'Không tính được lịch') + extra);
            }
            await fetchRuns();
            setRunDetail(data);
            setRunModal(true);
            const sum = data.summary || {};
            toast.success(`Kịp hạn ${sum.onTime ?? 0}/${sum.total ?? 0} công việc`, kind === 'recalc' ? 'Đã tính lại lịch (bản nháp)' : 'Đã xếp lịch (bản nháp)');
        } catch (e) {
            toast.error(e.message);
        } finally {
            setScheduleBusy(false);
        }
    };
    const openRunModal = async () => {
        setScheduleBusy(true);
        try {
            const list = await fetchRuns();
            const draft = list.find(r => r.status === 'draft');
            if (draft && runDetail?.id !== draft.id) await loadRun(draft.id);
            else if (!draft && !runDetail) { toast.error('Chưa có bản xếp lịch nào. Bấm “Tự động xếp lịch” trước.'); return; }
            setRunModal(true);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setScheduleBusy(false);
        }
    };
    const applyRun = async (id) => {
        setScheduleBusy(true);
        try {
            const res = await fetch(`/api/workshop/schedule/runs/${id}/apply`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Không chốt được kế hoạch');
            toast.success(`Đã cập nhật ${data.applied} công việc${data.skipped?.length ? `, ${data.skipped.length} việc giữ lịch cũ` : ''}`, 'Đã chốt kế hoạch');
            setRunModal(false);
            await fetchRuns();
            await loadRun(id);
            fetchData(true);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setScheduleBusy(false);
        }
    };
    const deleteDraft = async (id) => {
        try {
            const res = await fetch(`/api/workshop/schedule/runs/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Không xóa được');
            toast.success('', 'Đã xóa bản nháp');
            setRunModal(false);
            const list = await fetchRuns();
            setRunDetail(null);
            const pick = list.find(r => r.status === 'applied') || list.find(r => r.status === 'draft');
            if (pick) loadRun(pick.id).catch(() => null);
        } catch (e) {
            toast.error(e.message);
        }
    };
    const openSettings = async () => {
        try {
            const r = await fetch('/api/workshop/schedule/settings').then(x => x.json());
            if (r.error) throw new Error(r.error);
            setSettings(r);
            setSettingsModal(true);
        } catch (e) {
            toast.error(e.message);
        }
    };

    // ---------- Thêm / sửa ----------
    const openAdd = () => {
        setConfirmDelete(false);
        setForm({ ...EMPTY_FORM, customerId: filterCustomer || '', startDate: toInput(today), endDate: toInput(addDays(today, 2)) });
    };
    const openEdit = (p) => {
        setConfirmDelete(false);
        setForm({
            id: p.id, name: p.name, customerId: p.customerId || '', customerName: p.customer?.name || p.customerName || '',
            teamIds: (p.teams || []).map(x => x.teamId), status: p.status,
            startDate: toInput(p.startDate), endDate: toInput(p.endDate), notes: p.notes || '',
            effortHours: p.effortHours ?? '', doneHours: String(p.doneHours ?? 0), priority: p.priority ?? 3,
            deadline: p.deadline ? toInput(p.deadline) : '', startNotBefore: p.startNotBefore ? toInput(p.startNotBefore) : '',
            readyDate: p.readyDate ? toInput(p.readyDate) : '', siteReadyDate: p.siteReadyDate ? toInput(p.siteReadyDate) : '',
            skill: p.skill || '', maxTeams: p.maxTeams ?? 1, travelDays: p.travelDays ?? 0,
            allowOvertime: !!p.allowOvertime, locked: !!p.locked, dependsOn: splitList(p.dependsOn),
        });
    };
    const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

    // Đội đang chọn (kể cả đội đã ngừng dùng nhưng vẫn gắn với đợt này)
    const formTeams = form ? teams.filter(t => form.teamIds.includes(t.id)) : [];
    const formError = form && (
        !form.customerId && !form.customerName.trim() ? 'Chọn hoặc nhập tên công trình'
            : form.locked && form.teamIds.length === 0 ? 'Việc đã khóa phải có đội'
            : form.effortHours !== '' && (!Number.isFinite(Number(form.effortHours)) || Number(form.effortHours) < 0) ? 'Khối lượng (giờ-người) không hợp lệ'
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
                teamIds: form.teamIds,
                status: form.status,
                startDate: form.startDate,
                endDate: form.endDate,
                notes: form.notes,
                effortHours: form.effortHours === '' ? null : Number(form.effortHours),
                doneHours: Number(form.doneHours || 0),
                priority: Number(form.priority),
                deadline: form.deadline || null,
                startNotBefore: form.startNotBefore || null,
                readyDate: form.readyDate || null,
                siteReadyDate: form.siteReadyDate || null,
                skill: form.skill.trim(),
                maxTeams: Number(form.maxTeams),
                travelDays: Number(form.travelDays),
                allowOvertime: form.allowOvertime,
                locked: form.locked,
                dependsOn: form.dependsOn,
            };
            const res = form.id
                ? await fetch(`/api/workshop/install-plans/${form.id}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
                })
                : await fetch('/api/workshop/install-plans', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...body, customerId: form.customerId, customerName: form.customerName.trim() }),
                });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Lưu không thành công');
            // Kế hoạch nằm ngoài khoảng đang xem (VD thêm cho tháng sau) → chuyển sang tháng bắt đầu
            // và bỏ bộ lọc có thể che nó, để người dùng thấy ngay dòng vừa lưu.
            const [sy, sm, sd] = form.startDate.split('-').map(Number);
            const [ey, em, ed] = form.endDate.split('-').map(Number);
            const inView = new Date(sy, sm - 1, sd) < scale.end && new Date(ey, em - 1, ed + 1) > scale.start;
            if (!inView) setAnchor(new Date(sy, sm - 1, 1));
            if (filterCustomer && filterCustomer !== form.customerId) setFilterCustomer('');
            setFilterState('');
            setCollapsed(prev => { const next = new Set(prev); next.delete(form.customerId); return next; });
            toast.success(
                inView ? '' : `Đã chuyển sang Tháng ${pad(sm)}/${sy} để hiện kế hoạch`,
                form.id ? 'Đã cập nhật kế hoạch' : 'Đã thêm kế hoạch lắp đặt',
            );
            setForm(null);
            fetchData(true);
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    // ---------- Kéo thả thanh Gantt ----------
    const onBarPointerDown = (e, p) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const d = { id: p.id, mode: e.target.dataset.handle || 'move', x0: e.clientX, delta: 0, moved: false };
        dragRef.current = d;
        setDrag(d);
    };
    const onBarPointerMove = (e) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.x0;
        if (!d.moved && Math.abs(dx) < DRAG_PX) return;
        const delta = Math.round(dx / scale.pxPerDay);
        if (d.moved && delta === d.delta) return;
        dragRef.current = { ...d, moved: true, delta };
        setDrag(dragRef.current);
    };
    const onBarPointerUp = async (p) => {
        const d = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (!d) return;
        if (!d.moved) { openEdit(p); return; }
        if (!d.delta) return;
        const { startDate, endDate } = draggedRange(p, d.mode, d.delta);
        const body = { startDate: toInput(startDate), endDate: toInput(endDate) };
        // Cập nhật ngay trên giao diện (ngày lưu dạng UTC 0h như server trả về), lỗi thì tải lại
        setPlans(prev => prev.map(x => (x.id === p.id
            ? { ...x, startDate: `${body.startDate}T00:00:00.000Z`, endDate: `${body.endDate}T00:00:00.000Z` }
            : x)));
        try {
            const res = await fetch(`/api/workshop/install-plans/${p.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Dời lịch không thành công');
            toast.success(`${fmtDM(startDate)} - ${fmtDM(endDate)}`, d.mode === 'move' ? 'Đã dời kế hoạch' : 'Đã đổi thời gian');
        } catch (err) {
            toast.error(err.message);
        }
        fetchData(true);
    };
    const onBarPointerCancel = () => { dragRef.current = null; setDrag(null); };

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
                <Select className={s.toolSelect} value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} aria-label="Lọc công trình">
                    <option value="">Tất cả công trình</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                <Button variant="ghost" icon={Users} onClick={() => setTeamModal(true)}>Quản lý đội</Button>
                <Button variant="ghost" onClick={openSettings}>Cấu hình giờ</Button>
                <Button variant="primary" onClick={() => createRun('auto')} loading={scheduleBusy}>Tự động xếp lịch</Button>
                <Button variant="secondary" onClick={() => createRun('recalc')} disabled={scheduleBusy}>Tính lại lịch</Button>
                <Button variant="secondary" onClick={openRunModal} disabled={scheduleBusy}>Chốt kế hoạch</Button>
                <div className={s.segmented} role="group" aria-label="Kiểu xem bảng">
                    <button type="button" className={viewMode === 'plan' ? s.segActive : ''} aria-pressed={viewMode === 'plan'} onClick={() => setViewMode('plan')}>Theo công trình</button>
                    <button type="button" className={viewMode === 'team' ? s.segActive : ''} aria-pressed={viewMode === 'team'} onClick={() => setViewMode('team')}>Theo đội</button>
                </div>
                <div className={s.segmented} role="group" aria-label="Chế độ xem">
                    {VIEWS.map(v => (
                        <button key={v.key} type="button" className={view === v.key ? s.segActive : ''}
                            aria-pressed={view === v.key} onClick={() => setView(v.key)}>
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>

            {viewMode === 'team' ? (
            <div className={s.card}>
                <div className={s.legend}>
                    <span>
                        Đang xem: {runDetail ? `${runDetail.label} · ${runDetail.status === 'applied' ? 'đã chốt' : runDetail.status === 'draft' ? 'bản nháp' : 'đã thay thế'}` : 'chưa có bản xếp lịch'}
                    </span>
                </div>
                <TeamTimeline result={runDetail?.result} />
            </div>
            ) : (
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
                                    <div style={{ textAlign: 'center' }}>Số đội</div>
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
                                                        <span className={s.groupName} title={g.name}>
                                                            {g.name} <em>({g.items.length} công việc)</em>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={s.right} style={{ width: scale.width }} />
                                            </div>
                                        );
                                    }
                                    const p = r.plan;
                                    const dragging = drag?.id === p.id && drag.moved;
                                    const pv = dragging ? { ...p, ...draggedRange(p, drag.mode, drag.delta) } : p;
                                    const bar = barOf(pv);
                                    const st = new Date(pv.startDate);
                                    const en = new Date(pv.endDate);
                                    const range = `${fmtDM(st)} - ${fmtDM(en)}`;
                                    const lateDays = p.state === 'late' ? diffDays(en, today) : 0;
                                    const tip = `${p.name}\n${range}\n${teamTip(p)}\n${p.status}${lateDays ? ` · trễ ${lateDays} ngày` : ''}${p.notes ? `\n${p.notes}` : ''}`;
                                    return (
                                        <div key={p.id} className={s.row} style={{ height: ROW_H }}>
                                            <div className={s.left} style={{ height: ROW_H }}>
                                                <button type="button" className={`${s.taskName} ${p.state === 'late' ? s.taskLate : ''}`}
                                                    onClick={() => openEdit(p)} title={p.name}>
                                                    {p.name}
                                                </button>
                                                <div className={s.people} title={teamTip(p)}>
                                                    <Users size={14} aria-hidden="true" /> {teamsOf(p).length || '—'}
                                                </div>
                                            </div>
                                            <div className={s.right} style={{ width: scale.width }}>
                                                <div
                                                    className={`${s.bar} ${BAR_CLASS[p.state]} ${dragging ? s.barDragging : ''}`}
                                                    style={{ left: bar.x + 1, width: Math.max(bar.w - 2, 4), top: (ROW_H - BAR_H) / 2, height: BAR_H }}
                                                    title={drag ? undefined : `${tip}
(Kéo để dời lịch, kéo mép để đổi ngày)`}
                                                    onPointerDown={e => onBarPointerDown(e, p)}
                                                    onPointerMove={onBarPointerMove}
                                                    onPointerUp={() => onBarPointerUp(p)}
                                                    onPointerCancel={onBarPointerCancel}
                                                >
                                                    {bar.w >= HANDLE_MIN_W && <>
                                                        <span className={`${s.handle} ${s.handleStart}`} data-handle="start" aria-hidden="true" />
                                                        <span className={`${s.handle} ${s.handleEnd}`} data-handle="end" aria-hidden="true" />
                                                    </>}
                                                    {bar.w >= 84 && (
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

                            {teamLoad.length > 0 && (
                                <>
                                    <div className={`${s.row} ${s.groupRowLine}`} style={{ height: GROUP_H }}>
                                        <div className={s.left} style={{ height: GROUP_H }}>
                                            <div className={s.groupTitle}>
                                                <span className={s.groupName}>Tải theo đội <em>(thanh đỏ = đội bị trùng lịch)</em></span>
                                            </div>
                                        </div>
                                        <div className={s.right} style={{ width: scale.width }} />
                                    </div>
                                    {teamLoad.map(({ team, items }) => (
                                        <div key={`t-${team.id}`} className={s.row} style={{ height: ROW_H }}>
                                            <div className={s.left} style={{ height: ROW_H }}>
                                                <div className={s.teamName} title={team.name}>
                                                    {team.name}{!team.active && <em> (ngừng)</em>}
                                                </div>
                                                <div className={s.people} title={`${team.memberCount} người`}>
                                                    <Users size={14} aria-hidden="true" /> {team.memberCount}
                                                </div>
                                            </div>
                                            <div className={s.right} style={{ width: scale.width }}>
                                                {items.map(p => {
                                                    const bar = barOf(p);
                                                    const label = p.customer?.name || p.customerName || p.name;
                                                    const range = `${fmtDM(new Date(p.startDate))} - ${fmtDM(new Date(p.endDate))}`;
                                                    return (
                                                        <div key={p.id}
                                                            className={`${s.bar} ${p.clash ? s.barConflict : BAR_CLASS[p.state]}`}
                                                            style={{ left: bar.x + 1, width: Math.max(bar.w - 2, 4), top: (ROW_H - BAR_H) / 2, height: BAR_H, cursor: 'default' }}
                                                            title={`${label}\n${range}${p.clash ? '\nTRÙNG LỊCH với đợt khác của đội này' : ''}`}>
                                                            {bar.w >= 84 && <span className={s.barLabel}>{label}</span>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

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
                    <span><i style={{ background: 'var(--color-danger)', opacity: 0.6 }} />Quá hạn</span>
                    <span className={s.legendNote}>Bấm vào công việc để sửa · kéo thanh để dời lịch, kéo mép để đổi ngày</span>
                </div>
            </div>
            )}

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
                                <CustomerCombobox {...a} customers={customers} customerId={form.customerId}
                                    customerName={form.customerName} disabled={!!form.id}
                                    onPick={({ id, name }) => setForm(f => ({ ...f, customerId: id, customerName: name }))} />
                            )}
                        </Field>
                        <Field label="Công việc" className={s.full}>
                            {(a) => <Input {...a} value={form.name} onChange={setF('name')} placeholder={DEFAULT_NAME} />}
                        </Field>
                        <Field label="Đội thi công" hint="Để trống thì bộ xếp lịch sẽ gán đội. Việc đã khóa bắt buộc phải chọn đội." className={s.full}>
                            {() => (
                                <div className={s.teamPicks}>
                                    {teams.length === 0 && (
                                        <span className={s.teamHint}>Chưa có đội nào. Bấm “Quản lý đội” ở trang này để thêm.</span>
                                    )}
                                    {teams.map(t => {
                                        const on = form.teamIds.includes(t.id);
                                        return (
                                            <Checkbox key={t.id} label={`${t.name} · ${t.memberCount} người${t.kind === 'Xưởng' ? ' · xưởng' : ''}${t.active ? '' : ' (ngừng)'}`}
                                                checked={on}
                                                onChange={e => setForm(f => ({
                                                    ...f,
                                                    teamIds: e.target.checked ? [...f.teamIds, t.id] : f.teamIds.filter(x => x !== t.id),
                                                }))} />
                                        );
                                    })}
                                    <span className={s.teamHint}>
                                        {formTeams.length} đội · {sumMembers(formTeams)} người
                                    </span>
                                </div>
                            )}
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

                        <div className={`${s.full} ${s.schedHead}`}>Thông tin xếp lịch</div>
                        <Field label="Khối lượng (giờ-người)" hint="Ví dụ: 2 người × 5 ngày × 8 giờ = 80" className={s.full}>
                            {(a) => <Input {...a} type="number" min={0} step="0.5" numeric value={form.effortHours} onChange={setF('effortHours')} placeholder="Để trống nếu chưa biết" />}
                        </Field>
                        <div className={`${s.full} ${s.quickBox}`}>
                            <span>Nhập nhanh: 1 đội</span>
                            <Input type="number" min={1} numeric className={s.quickNum} value={quick.size} onChange={e => setQuick(q => ({ ...q, size: e.target.value }))} aria-label="Số người trong đội" />
                            <span>người làm</span>
                            <Input type="number" min={1} numeric className={s.quickNum} value={quick.days} onChange={e => setQuick(q => ({ ...q, days: e.target.value }))} aria-label="Số ngày" />
                            <span>ngày, mỗi ngày</span>
                            <Input type="number" min={1} max={12} numeric className={s.quickNum} value={quick.hours} onChange={e => setQuick(q => ({ ...q, hours: e.target.value }))} aria-label="Giờ mỗi ngày" />
                            <span>giờ</span>
                            <Button variant="secondary" onClick={() => setForm(f => ({ ...f, effortHours: String(Number(quick.size) * Number(quick.days) * Number(quick.hours)) }))}>Quy đổi</Button>
                        </div>
                        <Field label="Hạn bàn giao">
                            {(a) => <Input {...a} type="date" value={form.deadline} onChange={setF('deadline')} />}
                        </Field>
                        <Field label="Mức ưu tiên" hint="1 = cao nhất">
                            {(a) => (
                                <Select {...a} value={form.priority} onChange={setF('priority')}>
                                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                </Select>
                            )}
                        </Field>
                        <Field label="Không bắt đầu trước">
                            {(a) => <Input {...a} type="date" value={form.startNotBefore} onChange={setF('startNotBefore')} />}
                        </Field>
                        <Field label="Hàng sẵn sàng (ngày)">
                            {(a) => <Input {...a} type="date" value={form.readyDate} onChange={setF('readyDate')} />}
                        </Field>
                        <Field label="Mặt bằng sẵn sàng (ngày)">
                            {(a) => <Input {...a} type="date" value={form.siteReadyDate} onChange={setF('siteReadyDate')} />}
                        </Field>
                        <Field label="Chuyên môn yêu cầu" hint="Để trống nếu không cần">
                            {(a) => (
                                <>
                                    <Input {...a} list="schedule-skills" value={form.skill} onChange={setF('skill')} placeholder="ví dụ: tu_bep" />
                                    <datalist id="schedule-skills">
                                        {[...new Set(teams.flatMap(t => splitList(t.skills)))].map(k => <option key={k} value={k} />)}
                                    </datalist>
                                </>
                            )}
                        </Field>
                        <Field label="Số đội tối đa làm đồng thời">
                            {(a) => (
                                <Select {...a} value={form.maxTeams} onChange={setF('maxTeams')}>
                                    {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                                </Select>
                            )}
                        </Field>
                        <Field label="Ngày di chuyển tới công trình" hint="Đội đổi công trình phải đi trước bấm số ngày này">
                            {(a) => <Input {...a} type="number" min={0} max={30} numeric value={form.travelDays} onChange={setF('travelDays')} />}
                        </Field>
                        <Field label="Đã làm (giờ-người)" hint="Cập nhật khi tính lại lịch">
                            {(a) => <Input {...a} type="number" min={0} step="0.5" numeric value={form.doneHours} onChange={setF('doneHours')} />}
                        </Field>
                        <div className={s.full}>
                            <Checkbox label="Cho phép tăng ca (trong trần giờ/ngày, tháng, năm)" checked={form.allowOvertime} onChange={e => setForm(f => ({ ...f, allowOvertime: e.target.checked }))} />
                            <Checkbox label="Khóa phân công: giữ nguyên đội và ngày khi tính lại" checked={form.locked} onChange={e => setForm(f => ({ ...f, locked: e.target.checked }))} />
                        </div>
                        <Field label="Phải xong trước khi làm việc này" className={s.full}>
                            {() => (
                                <div className={s.depBox}>
                                    {plans.filter(p => p.id !== form.id && p.status !== 'Hoàn thành').slice(0, 60).map(p => (
                                        <Checkbox key={p.id}
                                            label={`${p.customer?.name || p.customerName || '—'} · ${p.name} (${fmtDM(new Date(p.startDate))} - ${fmtDM(new Date(p.endDate))})`}
                                            checked={form.dependsOn.includes(p.id)}
                                            onChange={e => setForm(f => ({
                                                ...f,
                                                dependsOn: e.target.checked ? [...f.dependsOn, p.id] : f.dependsOn.filter(x => x !== p.id),
                                            }))} />
                                    ))}
                                    {plans.filter(p => p.id !== form.id && p.status !== 'Hoàn thành').length === 0 && <span className={s.teamHint}>Chưa có công việc khác.</span>}
                                </div>
                            )}
                        </Field>
                    </div>
                )}
            </Modal>

            <TeamManagerModal
                isOpen={teamModal}
                onClose={() => setTeamModal(false)}
                teams={teams}
                onChanged={() => fetchData(true)}
            />

            <ScheduleRunModal
                isOpen={runModal}
                onClose={() => setRunModal(false)}
                run={runDetail}
                runs={runs}
                onSelectRun={async (id) => {
                    try { await loadRun(id); } catch (e) { toast.error(e.message); }
                }}
                onApply={applyRun}
                onDeleteDraft={deleteDraft}
                onRecalc={() => createRun('recalc')}
                busy={scheduleBusy}
            />
            <ScheduleSettingsModal
                isOpen={settingsModal}
                onClose={() => setSettingsModal(false)}
                settings={settings}
                onSaved={(r) => setSettings(r)}
            />
        </div>
    );
}

// Quản lý đội thi công: thêm đội, sửa tên/loại/số thành viên, ngừng dùng đội (không xóa để giữ lịch sử)
function TeamManagerModal({ isOpen, onClose, teams, onChanged }) {
    const toast = useToast();
    const toastRef = useRef(toast);
    useEffect(() => { toastRef.current = toast; });
    const [drafts, setDrafts] = useState({});
    const [busy, setBusy] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', kind: 'Lắp đặt', memberCount: 2 });

    const draftOf = (t) => drafts[t.id] || { name: t.name, kind: t.kind, memberCount: t.memberCount, active: t.active };
    const setDraft = (t, patch) => setDrafts(d => ({ ...d, [t.id]: { ...draftOf(t), ...patch } }));
    const changed = (t) => {
        const d = drafts[t.id];
        return !!d && (d.name !== t.name || d.kind !== t.kind || Number(d.memberCount) !== t.memberCount || d.active !== t.active);
    };

    const send = async (url, method, body) => {
        setBusy(true);
        try {
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Lưu không thành công');
            onChanged();
            return true;
        } catch (e) {
            toastRef.current.error(e.message);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const saveTeam = async (t) => {
        const d = draftOf(t);
        if (await send(`/api/workshop/install-teams/${t.id}`, 'PUT', d)) {
            setDrafts(x => { const n = { ...x }; delete n[t.id]; return n; });
            toastRef.current.success('', 'Đã lưu đội');
        }
    };

    const addTeam = async () => {
        if (!newTeam.name.trim()) { toastRef.current.error('Nhập tên đội'); return; }
        if (await send('/api/workshop/install-teams', 'POST', newTeam)) {
            setNewTeam({ name: '', kind: 'Lắp đặt', memberCount: 2 });
            toastRef.current.success('', 'Đã thêm đội');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quản lý đội thi công" maxWidth={720} closeOnOverlayClick={false}
            footer={<Button variant="primary" onClick={onClose}>Xong</Button>}>
            <div className={s.teamAdmin}>
                {teams.length === 0 && <div className={s.teamHint}>Chưa có đội nào.</div>}
                {teams.map(t => {
                    const d = draftOf(t);
                    return (
                        <div key={t.id} className={s.teamRow}>
                            <Input value={d.name} onChange={e => setDraft(t, { name: e.target.value })} aria-label="Tên đội" />
                            <Select value={d.kind} onChange={e => setDraft(t, { kind: e.target.value })} aria-label="Loại đội">
                                {TEAM_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                            </Select>
                            <Input type="number" min={1} max={50} numeric value={d.memberCount}
                                onChange={e => setDraft(t, { memberCount: e.target.value })} aria-label="Số thành viên" />
                            <Checkbox label="Đang dùng" checked={d.active} onChange={e => setDraft(t, { active: e.target.checked })} />
                            <Button variant="secondary" disabled={!changed(t) || busy} onClick={() => saveTeam(t)}>Lưu</Button>
                        </div>
                    );
                })}
                <div className={s.teamRow + ' ' + s.teamNew}>
                    <Input value={newTeam.name} placeholder="Tên đội mới" onChange={e => setNewTeam(x => ({ ...x, name: e.target.value }))} aria-label="Tên đội mới" />
                    <Select value={newTeam.kind} onChange={e => setNewTeam(x => ({ ...x, kind: e.target.value }))} aria-label="Loại đội mới">
                        {TEAM_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                    </Select>
                    <Input type="number" min={1} max={50} numeric value={newTeam.memberCount}
                        onChange={e => setNewTeam(x => ({ ...x, memberCount: e.target.value }))} aria-label="Số thành viên đội mới" />
                    <span />
                    <Button variant="primary" icon={Plus} disabled={busy} onClick={addTeam}>Thêm đội</Button>
                </div>
                <div className={s.teamHint}>Đội “Xưởng” là đội sản xuất có thể đi lắp đặt khi cần. Ngừng dùng thì đội không được gán cho đợt mới, nhưng lịch cũ vẫn giữ.</div>
            </div>
        </Modal>
    );
}

// Bỏ dấu tiếng Việt để gõ "ngoc hieu" vẫn tìm ra "Ngọc Hiếu"
const fold = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

// Ô gõ để tìm công trình (khách hợp đồng / ưu tiên) theo tên hoặc mã khách hàng.
function CustomerCombobox({ customers, customerId, customerName, onPick, disabled, id, ...aria }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [active, setActive] = useState(0);
    const wrapRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const selected = customers.find(c => c.id === customerId);
    const selectedLabel = selected ? selected.name : (customerName || '');
    const results = useMemo(() => {
        const words = fold(q).split(/\s+/).filter(Boolean);
        if (!words.length) return customers;
        return customers.filter(c => {
            const hay = fold(`${c.code} ${c.name}`);
            return words.every(w => hay.includes(w));
        });
    }, [customers, q]);

    // Tên gõ tay không trùng khách nào → cho chọn làm công trình ghi tay (không tạo khách hàng mới)
    const typed = q.trim();
    const freeName = typed && !results.some(c => fold(c.name) === fold(typed)) ? typed : null;
    const options = [
        ...results.map(c => ({ kind: 'customer', c })),
        ...(freeName ? [{ kind: 'free', name: freeName }] : []),
    ];

    useEffect(() => {
        listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    const pick = (o) => {
        onPick(o.kind === 'free' ? { id: '', name: o.name } : { id: o.c.id, name: o.c.name });
        setQ(''); setOpen(false);
    };
    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, options.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
        else if (e.key === 'Enter') { if (open && options[active]) { e.preventDefault(); pick(options[active]); } }
        else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); }
    };
    const listId = `${id}-list`;

    return (
        <div ref={wrapRef} className={s.combo}>
            <Input
                id={id}
                {...aria}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                autoComplete="off"
                disabled={disabled}
                placeholder="Gõ tên khách/mã để tìm, hoặc nhập tên mới…"
                value={open ? q : selectedLabel}
                onFocus={() => { setOpen(true); setQ(''); setActive(0); }}
                onChange={e => { setQ(e.target.value); setActive(0); setOpen(true); }}
                onKeyDown={onKeyDown}
            />
            {open && !disabled && (
                <ul className={s.comboList} id={listId} role="listbox" ref={listRef}>
                    {options.length === 0 && <li className={s.comboEmpty}>Gõ tên để nhập công trình mới</li>}
                    {options.map((o, i) => (o.kind === 'free' ? (
                        <li key="__free" role="option" aria-selected={false}
                            className={`${s.comboItem} ${i === active ? s.comboActive : ''}`}
                            onMouseEnter={() => setActive(i)}
                            onMouseDown={e => { e.preventDefault(); pick(o); }}>
                            <span>Dùng “{o.name}” (ngoài danh sách)</span>
                            <small>Nhập tay</small>
                        </li>
                    ) : (
                        <li key={o.c.id} role="option" aria-selected={o.c.id === customerId}
                            className={`${s.comboItem} ${i === active ? s.comboActive : ''}`}
                            onMouseEnter={() => setActive(i)}
                            onMouseDown={e => { e.preventDefault(); pick(o); }}>
                            <span>{o.c.name}</span>
                            <small>{STAGE_LABEL[o.c.pipelineStage] ? `${STAGE_LABEL[o.c.pipelineStage]} · ` : ''}{o.c.code}</small>
                        </li>
                    )))}
                </ul>
            )}
        </div>
    );
}
