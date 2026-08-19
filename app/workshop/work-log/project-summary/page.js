'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRole } from '@/contexts/RoleContext';
import { RefreshCw, Clock, BarChart2, Users, Calendar, TrendingUp } from 'lucide-react';

const REFRESH_INTERVAL = 30;

function parseWorkersWithHours(json) {
    try {
        const v = JSON.parse(json);
        if (!Array.isArray(v)) return [];
        return v.map(item => typeof item === 'string' ? { name: item, hours: null } : item).filter(i => i?.name);
    } catch { return []; }
}

function fmtDate(d) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function fmtCong(n) {
    if (n === 0) return '0';
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

function getWeekLabel(date) {
    const d = new Date(date);
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return `T${String(mon.getDate()).padStart(2,'0')}/${String(mon.getMonth()+1).padStart(2,'0')} – T${String(sun.getDate()).padStart(2,'0')}/${String(sun.getMonth()+1).padStart(2,'0')}`;
}

function getMonthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getWeekKey(date) {
    const d = new Date(date);
    const day = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
}

function computeSummary(entries, workerMap) {
    const workerData = {};

    entries.forEach(entry => {
        if (entry.category === 'Việc khác' || entry.category === 'Nhân công nghỉ') return;
        const dateKey = new Date(entry.date).toDateString();
        const shift = entry.shift || 'Sáng';
        const weekKey = getWeekKey(entry.date);
        const monthKey = getMonthKey(entry.date);

        const allWorkers = [
            ...parseWorkersWithHours(entry.mainWorkers).map(w => ({ ...w, src: 'main' })),
            ...parseWorkersWithHours(entry.subWorkers).map(w => ({ ...w, src: 'sub' })),
        ];

        allWorkers.forEach(({ name, hours, src }) => {
            const wType = workerMap[name] || (src === 'sub' ? 'Thợ phụ' : 'Thợ chính');
            if (!workerData[name]) {
                workerData[name] = { name, type: wType, dateShifts: {}, totalHours: 0, weeks: {}, months: {}, categories: {} };
            }
            const wd = workerData[name];

            if (hours) {
                wd.totalHours += hours;
                wd.weeks[weekKey] = (wd.weeks[weekKey] || 0) + hours / 8;
                wd.months[monthKey] = (wd.months[monthKey] || 0) + hours / 8;
            } else {
                if (!wd.dateShifts[dateKey]) wd.dateShifts[dateKey] = new Set();
                wd.dateShifts[dateKey].add(shift);

                const shiftCong = Math.min(wd.dateShifts[dateKey].size * 0.5, 1);
                const prevShiftCong = wd.dateShifts[dateKey].size > 1
                    ? Math.min((wd.dateShifts[dateKey].size - 1) * 0.5, 1)
                    : 0;
                const delta = shiftCong - prevShiftCong;
                wd.weeks[weekKey] = (wd.weeks[weekKey] || 0) + delta;
                wd.months[monthKey] = (wd.months[monthKey] || 0) + delta;
            }

            wd.categories[entry.category] = (wd.categories[entry.category] || 0);
        });
    });

    const calcCong = (wd) => {
        if (wd.totalHours > 0) return Math.round(wd.totalHours / 8 * 10) / 10;
        return Object.values(wd.dateShifts).reduce((sum, shifts) => sum + Math.min(shifts.size * 0.5, 1), 0);
    };

    return Object.values(workerData).map(wd => ({
        name: wd.name,
        type: wd.type,
        totalCong: Math.round(calcCong(wd) * 10) / 10,
        weeks: Object.entries(wd.weeks).map(([k, v]) => ({ key: k, cong: Math.round(v * 10) / 10 })).sort((a, b) => a.key.localeCompare(b.key)),
        months: Object.entries(wd.months).map(([k, v]) => ({ key: k, cong: Math.round(v * 10) / 10 })).sort((a, b) => a.key.localeCompare(b.key)),
    })).sort((a, b) => b.totalCong - a.totalCong);
}

function computeWeeklyTotals(entries, workerMap) {
    const weeks = {};

    entries.forEach(entry => {
        if (entry.category === 'Việc khác' || entry.category === 'Nhân công nghỉ') return;
        const dateKey = new Date(entry.date).toDateString();
        const shift = entry.shift || 'Sáng';
        const weekKey = getWeekKey(entry.date);
        if (!weeks[weekKey]) weeks[weekKey] = { mainMap: {}, subMap: {} };

        const allWorkers = [
            ...parseWorkersWithHours(entry.mainWorkers).map(w => ({ ...w, src: 'main' })),
            ...parseWorkersWithHours(entry.subWorkers).map(w => ({ ...w, src: 'sub' })),
        ];

        allWorkers.forEach(({ name, hours, src }) => {
            const wType = workerMap[name] || (src === 'sub' ? 'Thợ phụ' : 'Thợ chính');
            const bucket = wType === 'Thợ phụ' ? weeks[weekKey].subMap : weeks[weekKey].mainMap;
            if (!bucket[name]) bucket[name] = { dateShifts: {}, totalHours: 0 };
            if (hours) {
                bucket[name].totalHours += hours;
            } else {
                if (!bucket[name].dateShifts[dateKey]) bucket[name].dateShifts[dateKey] = new Set();
                bucket[name].dateShifts[dateKey].add(shift);
            }
        });
    });

    const calcBucket = (map) => {
        let total = 0;
        Object.values(map).forEach(wd => {
            if (wd.totalHours > 0) total += wd.totalHours / 8;
            else total += Object.values(wd.dateShifts).reduce((s, sh) => s + Math.min(sh.size * 0.5, 1), 0);
        });
        return Math.round(total * 10) / 10;
    };

    return Object.entries(weeks)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, data]) => ({
            key,
            label: getWeekLabel(key),
            main: calcBucket(data.mainMap),
            sub: calcBucket(data.subMap),
        }));
}

function computeCategoryTotals(entries, workerMap) {
    const cats = {};

    entries.forEach(entry => {
        if (entry.category === 'Việc khác' || entry.category === 'Nhân công nghỉ') return;
        const cat = entry.category;
        if (!cats[cat]) cats[cat] = { mainMap: {}, subMap: {} };
        const dateKey = new Date(entry.date).toDateString();
        const shift = entry.shift || 'Sáng';

        const allWorkers = [
            ...parseWorkersWithHours(entry.mainWorkers).map(w => ({ ...w, src: 'main' })),
            ...parseWorkersWithHours(entry.subWorkers).map(w => ({ ...w, src: 'sub' })),
        ];

        allWorkers.forEach(({ name, hours, src }) => {
            const wType = workerMap[name] || (src === 'sub' ? 'Thợ phụ' : 'Thợ chính');
            const bucket = wType === 'Thợ phụ' ? cats[cat].subMap : cats[cat].mainMap;
            if (!bucket[name]) bucket[name] = { dateShifts: {}, totalHours: 0 };
            if (hours) bucket[name].totalHours += hours;
            else {
                if (!bucket[name].dateShifts[dateKey]) bucket[name].dateShifts[dateKey] = new Set();
                bucket[name].dateShifts[dateKey].add(shift);
            }
        });
    });

    const calcBucket = (map) => {
        let total = 0;
        Object.values(map).forEach(wd => {
            if (wd.totalHours > 0) total += wd.totalHours / 8;
            else total += Object.values(wd.dateShifts).reduce((s, sh) => s + Math.min(sh.size * 0.5, 1), 0);
        });
        return Math.round(total * 10) / 10;
    };

    return Object.entries(cats).map(([cat, data]) => ({
        cat,
        main: calcBucket(data.mainMap),
        sub: calcBucket(data.subMap),
    })).sort((a, b) => (b.main + b.sub) - (a.main + a.sub));
}

const CAT_COLORS = {
    'Gia công nguội': '#dbeafe',
    'Lắp ghép tại xưởng': '#fef9c3',
    'Lắp đặt tại công trình': '#dcfce7',
    'Bảo dưỡng': '#ffe4e6',
};

function ProjectSummaryContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { role } = useRole();

    const [projects, setProjects] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get('projectId') || '');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
    const [activeTab, setActiveTab] = useState('worker');
    const [projectSearch, setProjectSearch] = useState('');
    const [showProjectDrop, setShowProjectDrop] = useState(false);

    const countdownRef = useRef(null);
    const fetchRef = useRef(null);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/'); return;
        }
        fetch('/api/workshop/workers').then(r => r.json()).then(d => setWorkers(Array.isArray(d) ? d : []));
        fetch('/api/projects?limit=200').then(r => r.json()).then(d => {
            const list = Array.isArray(d?.data) ? d.data : [];
            setProjects(list);
            if (searchParams.get('projectId')) {
                const p = list.find(p => p.id === searchParams.get('projectId'));
                if (p) setProjectSearch(p.name);
            }
        });
    }, [role, router, searchParams]);

    const fetchEntries = useCallback(async () => {
        if (!selectedProjectId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/workshop/work-log?projectId=${selectedProjectId}`);
            const data = await res.json();
            setEntries(Array.isArray(data) ? data : []);
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
        }
    }, [selectedProjectId]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    useEffect(() => {
        if (!selectedProjectId) return;
        setCountdown(REFRESH_INTERVAL);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    fetchEntries();
                    return REFRESH_INTERVAL;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(countdownRef.current);
    }, [selectedProjectId, fetchEntries]);

    const workerMap = {};
    workers.forEach(w => { workerMap[w.name] = w.workerType || 'Thợ chính'; });

    const workerSummary = computeSummary(entries, workerMap);
    const weeklyTotals = computeWeeklyTotals(entries, workerMap);
    const categoryTotals = computeCategoryTotals(entries, workerMap);

    const totalMain = Math.round(workerSummary.filter(w => w.type !== 'Thợ phụ').reduce((s, w) => s + w.totalCong, 0) * 10) / 10;
    const totalSub = Math.round(workerSummary.filter(w => w.type === 'Thợ phụ').reduce((s, w) => s + w.totalCong, 0) * 10) / 10;
    const grandTotal = Math.round((totalMain + totalSub) * 10) / 10;
    const workDays = entries.length > 0
        ? new Set(entries.map(e => new Date(e.date).toDateString())).size
        : 0;

    const dateMin = entries.length > 0 ? new Date(Math.min(...entries.map(e => new Date(e.date)))) : null;
    const dateMax = entries.length > 0 ? new Date(Math.max(...entries.map(e => new Date(e.date)))) : null;

    const filteredProjects = projects.filter(p =>
        !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase()) || p.code?.toLowerCase().includes(projectSearch.toLowerCase())
    ).slice(0, 12);

    const thS = { padding: '8px 10px', border: '1px solid #2a4a8b', textAlign: 'center', fontWeight: 700, fontSize: 12, color: '#fff', background: '#1C3A6B' };
    const tdS = { padding: '7px 10px', border: '1px solid var(--border)', fontSize: 12, verticalAlign: 'middle' };

    return (
        <div style={{ padding: '20px', maxWidth: 1100, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1e3a5f', margin: 0 }}>Tổng hợp công theo công trình</h1>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>Tổng hợp toàn bộ công từ đầu đến nay · Tự động cập nhật mỗi 30 giây</p>
                </div>
                {selectedProjectId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {lastUpdated && (
                            <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={12} />
                                {lastUpdated.toLocaleTimeString('vi-VN')}
                                &nbsp;·&nbsp;
                                <span style={{ color: countdown <= 5 ? '#ef4444' : '#94a3b8' }}>làm mới sau {countdown}s</span>
                            </span>
                        )}
                        <button
                            onClick={() => { fetchEntries(); setCountdown(REFRESH_INTERVAL); }}
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', color: '#374151' }}
                        >
                            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                            Làm mới
                        </button>
                    </div>
                )}
            </div>

            {/* Project selector */}
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Chọn công trình</label>
                <div style={{ position: 'relative', maxWidth: 500 }}>
                    <input
                        type="text"
                        value={projectSearch}
                        onFocus={() => setShowProjectDrop(true)}
                        onBlur={() => setTimeout(() => setShowProjectDrop(false), 200)}
                        onChange={e => { setProjectSearch(e.target.value); setShowProjectDrop(true); }}
                        placeholder="Tìm theo tên hoặc mã công trình..."
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                    {showProjectDrop && filteredProjects.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 280, overflowY: 'auto', marginTop: 2 }}>
                            {filteredProjects.map(p => (
                                <div
                                    key={p.id}
                                    onMouseDown={() => { setSelectedProjectId(p.id); setProjectSearch(p.name); setShowProjectDrop(false); }}
                                    style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', background: selectedProjectId === p.id ? '#eff6ff' : 'transparent' }}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e3a5f' }}>{p.name}</div>
                                    {p.code && <div style={{ fontSize: 11, color: '#2563eb', marginTop: 1 }}>{p.code}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {!selectedProjectId ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <BarChart2 size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Chọn công trình để xem tổng hợp công</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Dữ liệu sẽ tự động cập nhật mỗi 30 giây</div>
                </div>
            ) : loading && entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <RefreshCw size={32} style={{ margin: '0 auto 12px', animation: 'spin 1s linear infinite', opacity: 0.5 }} />
                    <div style={{ fontSize: 14 }}>Đang tải dữ liệu...</div>
                </div>
            ) : entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <Calendar size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Chưa có dữ liệu nhật ký cho công trình này</div>
                </div>
            ) : (
                <>
                    {/* Project info */}
                    {selectedProject && (
                        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                            <span style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 14 }}>{selectedProject.name}</span>
                            {selectedProject.code && <span style={{ marginLeft: 10, fontSize: 12, color: '#2563eb', background: '#dbeafe', padding: '1px 8px', borderRadius: 10 }}>{selectedProject.code}</span>}
                            {dateMin && dateMax && (
                                <span style={{ marginLeft: 12, fontSize: 12, color: '#64748b' }}>
                                    {fmtDate(dateMin)} — {fmtDate(dateMax)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Tổng công', value: fmtCong(grandTotal), color: '#1e3a5f', bg: '#eff6ff', icon: <TrendingUp size={20} /> },
                            { label: 'Thợ chính', value: fmtCong(totalMain), color: '#1d4ed8', bg: '#dbeafe', icon: <Users size={20} /> },
                            { label: 'Thợ phụ', value: fmtCong(totalSub), color: '#6d28d9', bg: '#ede9fe', icon: <Users size={20} /> },
                            { label: 'Ngày làm việc', value: workDays, color: '#065f46', bg: '#dcfce7', icon: <Calendar size={20} /> },
                            { label: 'Số thợ', value: workerSummary.length, color: '#92400e', bg: '#fef3c7', icon: <Users size={20} /> },
                        ].map(c => (
                            <div key={c.label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, flexShrink: 0 }}>
                                    {c.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
                        {[
                            { key: 'worker', label: 'Theo thợ' },
                            { key: 'week', label: 'Theo tuần' },
                            { key: 'category', label: 'Theo loại việc' },
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                style={{ padding: '8px 18px', border: 'none', borderBottom: activeTab === t.key ? '2px solid #1d4ed8' : '2px solid transparent', background: 'transparent', fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? '#1d4ed8' : '#64748b', cursor: 'pointer', fontSize: 13, marginBottom: -2 }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab: Theo thợ */}
                    {activeTab === 'worker' && (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...thS, width: 40 }}>STT</th>
                                            <th style={{ ...thS, textAlign: 'left', minWidth: 150 }}>Tên thợ</th>
                                            <th style={{ ...thS, width: 100 }}>Loại</th>
                                            <th style={{ ...thS, width: 100 }}>Tổng công</th>
                                            <th style={{ ...thS, textAlign: 'left', minWidth: 280 }}>Theo tuần</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workerSummary.map((w, i) => (
                                            <tr key={w.name} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                <td style={{ ...tdS, textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                                                <td style={{ ...tdS, fontWeight: 700, color: '#1e3a5f' }}>{w.name}</td>
                                                <td style={{ ...tdS, textAlign: 'center' }}>
                                                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: w.type === 'Thợ phụ' ? '#ede9fe' : '#dbeafe', color: w.type === 'Thợ phụ' ? '#6d28d9' : '#1d4ed8' }}>
                                                        {w.type}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdS, textAlign: 'center', fontWeight: 900, fontSize: 20, color: w.type === 'Thợ phụ' ? '#6d28d9' : '#1d4ed8', background: w.type === 'Thợ phụ' ? '#f5f3ff' : '#eff6ff' }}>
                                                    {fmtCong(w.totalCong)}
                                                </td>
                                                <td style={tdS}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {w.weeks.map(wk => (
                                                            <span key={wk.key} style={{ fontSize: 11, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 7px', color: '#374151', whiteSpace: 'nowrap' }}>
                                                                <span style={{ color: '#94a3b8' }}>{getWeekLabel(wk.key)}</span>
                                                                <span style={{ fontWeight: 700, color: '#1e3a5f', marginLeft: 5 }}>{fmtCong(wk.cong)}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#1e3a5f' }}>
                                            <td colSpan={3} style={{ ...thS, textAlign: 'left', paddingLeft: 16 }}>TỔNG CỘNG</td>
                                            <td style={{ ...thS, fontSize: 20 }}>{fmtCong(grandTotal)}</td>
                                            <td style={thS} />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab: Theo tuần */}
                    {activeTab === 'week' && (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...thS, width: 40 }}>STT</th>
                                            <th style={{ ...thS, textAlign: 'left', minWidth: 200 }}>Tuần</th>
                                            <th style={{ ...thS, width: 110 }}>Thợ chính</th>
                                            <th style={{ ...thS, width: 110 }}>Thợ phụ</th>
                                            <th style={{ ...thS, width: 110 }}>Tổng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weeklyTotals.map((w, i) => (
                                            <tr key={w.key} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                                <td style={{ ...tdS, textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                                                <td style={{ ...tdS, fontWeight: 600, color: '#374151' }}>
                                                    <span style={{ fontSize: 11, background: '#f1f5f9', padding: '2px 8px', borderRadius: 5, color: '#64748b' }}>{w.label}</span>
                                                </td>
                                                <td style={{ ...tdS, textAlign: 'center', fontWeight: 800, fontSize: 18, color: '#1d4ed8', background: '#eff6ff' }}>{fmtCong(w.main)}</td>
                                                <td style={{ ...tdS, textAlign: 'center', fontWeight: 800, fontSize: 18, color: '#6d28d9', background: '#f5f3ff' }}>{fmtCong(w.sub)}</td>
                                                <td style={{ ...tdS, textAlign: 'center', fontWeight: 900, fontSize: 20, color: '#1e3a5f', background: '#f0f9ff' }}>{fmtCong(Math.round((w.main + w.sub) * 10) / 10)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#1e3a5f' }}>
                                            <td colSpan={2} style={{ ...thS, textAlign: 'left', paddingLeft: 16 }}>TỔNG CỘNG</td>
                                            <td style={{ ...thS, fontSize: 18 }}>{fmtCong(totalMain)}</td>
                                            <td style={{ ...thS, fontSize: 18 }}>{fmtCong(totalSub)}</td>
                                            <td style={{ ...thS, fontSize: 20 }}>{fmtCong(grandTotal)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab: Theo loại việc */}
                    {activeTab === 'category' && (
                        <div className="card" style={{ overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...thS, width: 40 }}>STT</th>
                                            <th style={{ ...thS, textAlign: 'left', minWidth: 200 }}>Loại công việc</th>
                                            <th style={{ ...thS, width: 110 }}>Thợ chính</th>
                                            <th style={{ ...thS, width: 110 }}>Thợ phụ</th>
                                            <th style={{ ...thS, width: 110 }}>Tổng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryTotals.map((c, i) => (
                                            <tr key={c.cat} style={{ background: CAT_COLORS[c.cat] || (i % 2 === 0 ? '#fff' : '#f8fafc') }}>
                                                <td style={{ ...tdS, textAlign: 'center', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                                                <td style={{ ...tdS, fontWeight: 600, color: '#1e3a5f' }}>{c.cat}</td>
                                                <td style={{ ...tdS, textAlign: 'center', fontWeight: 800, fontSize: 18, color: '#1d4ed8' }}>{fmtCong(c.main)}</td>
                                                <td style={{ ...tdS, textAlign: 'center', fontWeight: 800, fontSize: 18, color: '#6d28d9' }}>{fmtCong(c.sub)}</td>
                                                <td style={{ ...tdS, textAlign: 'center', fontWeight: 900, fontSize: 20, color: '#1e3a5f' }}>{fmtCong(Math.round((c.main + c.sub) * 10) / 10)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: '#1e3a5f' }}>
                                            <td colSpan={2} style={{ ...thS, textAlign: 'left', paddingLeft: 16 }}>TỔNG CỘNG</td>
                                            <td style={{ ...thS, fontSize: 18 }}>{fmtCong(totalMain)}</td>
                                            <td style={{ ...thS, fontSize: 18 }}>{fmtCong(totalSub)}</td>
                                            <td style={{ ...thS, fontSize: 20 }}>{fmtCong(grandTotal)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                        Ca sáng = 0.5 công · Ca chiều = 0.5 công · Cả 2 ca = 1 công · Có nhập giờ → giờ ÷ 8 = công
                    </div>
                </>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default function ProjectSummaryPage() {
    return (
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div>}>
            <ProjectSummaryContent />
        </Suspense>
    );
}
