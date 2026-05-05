'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { TrendingUp, TrendingDown, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, Download, CheckSquare, Square, AlertCircle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : '0.0');
const currentMonth = () => new Date().toISOString().slice(0, 7);

// ── Entry type definitions ──────────────────────────────────────────────────
const ENTRY_TYPES = {
    REVENUE_INTERNAL:        { label: 'Doanh thu nội bộ',            group: 'revenue' },
    REVENUE_EXTERNAL:        { label: 'Doanh thu ngoài',              group: 'revenue' },
    DIRECT_MATERIAL:         { label: 'Vật tư',                       group: 'direct' },
    DIRECT_LABOR_SALARY:     { label: 'Lương nhân công trực tiếp',    group: 'direct' },
    DIRECT_LABOR_INSURANCE:  { label: 'BHXH/BHYT nhân công',          group: 'direct' },
    DIRECT_LABOR_BONUS:      { label: 'Thưởng & phúc lợi NV',        group: 'direct' },
    DIRECT_LABOR_MEAL:       { label: 'Chi phí ăn (NV trực tiếp)',    group: 'direct' },
    DIRECT_OUTSOURCE:        { label: 'Thuê ngoài, vận chuyển',       group: 'direct' },
    INDIRECT_MGMT_SALARY:    { label: 'Lương quản lý',                group: 'indirect' },
    INDIRECT_MGMT_INSURANCE: { label: 'BHXH/BHYT quản lý',            group: 'indirect' },
    INDIRECT_MGMT_BONUS:     { label: 'Thưởng quản lý',               group: 'indirect' },
    INDIRECT_MGMT_MEAL:      { label: 'Chi phí ăn (quản lý)',         group: 'indirect' },
    INDIRECT_OFFICE_MACHINE: { label: 'Chi phí máy văn phòng',        group: 'indirect' },
    INDIRECT_OFFICE_TOOLS:   { label: 'Công cụ dụng cụ VP',           group: 'indirect' },
    INDIRECT_ELECTRIC:       { label: 'Điện',                         group: 'indirect' },
    INDIRECT_EQUIPMENT:      { label: 'Mua sắm máy móc thiết bị',     group: 'indirect' },
    INDIRECT_MAINTENANCE:    { label: 'Sửa chữa, nâng cấp hạ tầng',  group: 'indirect' },
    INDIRECT_DEPRECIATION:   { label: 'Khấu hao',                     group: 'indirect' },
    INDIRECT_OTHER:          { label: 'Chi phí khác',                  group: 'indirect' },
};

const TYPE_OPTIONS_BY_GROUP = {
    revenue:  ['REVENUE_INTERNAL', 'REVENUE_EXTERNAL'],
    direct:   ['DIRECT_MATERIAL', 'DIRECT_LABOR_SALARY', 'DIRECT_LABOR_INSURANCE', 'DIRECT_LABOR_BONUS', 'DIRECT_LABOR_MEAL', 'DIRECT_OUTSOURCE'],
    indirect: ['INDIRECT_MGMT_SALARY', 'INDIRECT_MGMT_INSURANCE', 'INDIRECT_MGMT_BONUS', 'INDIRECT_MGMT_MEAL', 'INDIRECT_OFFICE_MACHINE', 'INDIRECT_OFFICE_TOOLS', 'INDIRECT_ELECTRIC', 'INDIRECT_EQUIPMENT', 'INDIRECT_MAINTENANCE', 'INDIRECT_DEPRECIATION', 'INDIRECT_OTHER'],
};

const GROUP_LABELS = { revenue: 'Doanh thu', direct: 'Chi phí trực tiếp', indirect: 'Chi phí gián tiếp' };

function computeSummary(entries) {
    const sumGroup = (g) => entries.filter(e => ENTRY_TYPES[e.entryType]?.group === g).reduce((a, e) => a + e.amount, 0);
    const sumType  = (t) => entries.filter(e => e.entryType === t).reduce((a, e) => a + e.amount, 0);
    const revenue      = sumGroup('revenue');
    const directCosts  = sumGroup('direct');
    const grossProfit  = revenue - directCosts;
    const indirectCosts= sumGroup('indirect');
    const netProfit    = grossProfit - indirectCosts;
    return { revenue, directCosts, grossProfit, indirectCosts, netProfit, sumType };
}

function prevMonth(period) {
    const [y, m] = period.split('-').map(Number);
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
function nextMonth(period) {
    const [y, m] = period.split('-').map(Number);
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
function displayPeriod(p) {
    const [y, m] = p.split('-');
    return `Tháng ${m}/${y}`;
}

const emptyForm = { entryType: 'REVENUE_INTERNAL', description: '', amount: '', assignedTo: '', notes: '' };

// ── P&L Report tree ──────────────────────────────────────────────────────────
function PLReport({ entries }) {
    const { revenue, directCosts, grossProfit, indirectCosts, netProfit, sumType } = useMemo(() => computeSummary(entries), [entries]);

    const Row = ({ label, amount, level = 0, bold = false, highlight, subLabel }) => {
        const pl = level === 0 ? 0 : level === 1 ? 20 : 40;
        return (
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: `6px 16px 6px ${16 + pl}px`,
                background: highlight || 'transparent',
                borderTop: bold && level === 0 ? '2px solid #e5e7eb' : undefined,
                marginTop: bold && level === 0 ? 4 : 0,
            }}>
                <span style={{ fontSize: level === 0 ? 13 : 12, fontWeight: bold ? 700 : 400, color: level === 2 ? '#6b7280' : '#111' }}>
                    {level > 0 && <span style={{ color: '#d1d5db', marginRight: 6 }}>{level === 1 ? '•' : '–'}</span>}
                    {label}
                    {subLabel && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>{subLabel}</span>}
                </span>
                <span style={{ fontSize: level === 0 ? 13 : 12, fontWeight: bold ? 700 : 500, color: amount < 0 ? '#dc2626' : bold ? '#111' : '#374151', minWidth: 140, textAlign: 'right' }}>
                    {fmt(amount)}
                </span>
            </div>
        );
    };

    const SectionHeader = ({ label, color }) => (
        <div style={{ padding: '8px 16px 4px', background: color, borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>{label}</span>
        </div>
    );

    const ProfitLine = ({ label, amount, pctVal, color }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: color, borderTop: '2px solid #e5e7eb' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{label}</span>
            <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{fmt(amount)}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>Biên lợi nhuận: {pctVal}%</div>
            </div>
        </div>
    );

    if (entries.length === 0) {
        return <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Chưa có dữ liệu cho kỳ này. Hãy thêm bút toán.</div>;
    }

    return (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
            {/* Revenue */}
            <SectionHeader label="Doanh thu" color="#2563eb" />
            <Row label="Doanh thu nội bộ" amount={sumType('REVENUE_INTERNAL')} level={1} />
            <Row label="Doanh thu ngoài"  amount={sumType('REVENUE_EXTERNAL')}  level={1} />
            <Row label="Tổng doanh thu"   amount={revenue}  bold />

            {/* Direct Costs */}
            <SectionHeader label="Chi phí trực tiếp" color="#ea580c" />
            <Row label="Vật tư"                  amount={sumType('DIRECT_MATERIAL')}        level={1} />
            <Row label="Nhân công"               amount={
                ['DIRECT_LABOR_SALARY','DIRECT_LABOR_INSURANCE','DIRECT_LABOR_BONUS','DIRECT_LABOR_MEAL']
                    .reduce((a,t) => a + sumType(t), 0)
            } level={1} />
            <Row label="Tiền lương"              amount={sumType('DIRECT_LABOR_SALARY')}    level={2} />
            <Row label="BHXH/BHYT"               amount={sumType('DIRECT_LABOR_INSURANCE')} level={2} />
            <Row label="Thưởng & phúc lợi"       amount={sumType('DIRECT_LABOR_BONUS')}    level={2} />
            <Row label="Chi phí ăn"              amount={sumType('DIRECT_LABOR_MEAL')}      level={2} />
            <Row label="Thuê ngoài, vận chuyển"  amount={sumType('DIRECT_OUTSOURCE')}       level={1} />
            <Row label="Tổng chi phí trực tiếp"  amount={directCosts} bold />

            {/* Gross Profit */}
            <ProfitLine
                label="= LỢI NHUẬN GỘP"
                amount={grossProfit}
                pctVal={pct(grossProfit, revenue)}
                color={grossProfit >= 0 ? '#16a34a' : '#dc2626'}
            />

            {/* Indirect Costs */}
            <SectionHeader label="Chi phí gián tiếp" color="#7c3aed" />
            <Row label="Chi phí quản lý" amount={
                ['INDIRECT_MGMT_SALARY','INDIRECT_MGMT_INSURANCE','INDIRECT_MGMT_BONUS','INDIRECT_MGMT_MEAL']
                    .reduce((a,t) => a + sumType(t), 0)
            } level={1} />
            <Row label="Lương quản lý"          amount={sumType('INDIRECT_MGMT_SALARY')}    level={2} />
            <Row label="BHXH/BHYT quản lý"      amount={sumType('INDIRECT_MGMT_INSURANCE')} level={2} />
            <Row label="Thưởng quản lý"         amount={sumType('INDIRECT_MGMT_BONUS')}    level={2} />
            <Row label="Chi phí ăn (quản lý)"   amount={sumType('INDIRECT_MGMT_MEAL')}      level={2} />
            <Row label="Chi phí chung" amount={
                ['INDIRECT_OFFICE_MACHINE','INDIRECT_OFFICE_TOOLS','INDIRECT_ELECTRIC']
                    .reduce((a,t) => a + sumType(t), 0)
            } level={1} />
            <Row label="Chi phí máy văn phòng"  amount={sumType('INDIRECT_OFFICE_MACHINE')} level={2} />
            <Row label="Công cụ dụng cụ VP"     amount={sumType('INDIRECT_OFFICE_TOOLS')}   level={2} />
            <Row label="Điện"                   amount={sumType('INDIRECT_ELECTRIC')}        level={2} />
            <Row label="Mua sắm máy móc thiết bị"      amount={sumType('INDIRECT_EQUIPMENT')}    level={1} />
            <Row label="Sửa chữa, nâng cấp hạ tầng"   amount={sumType('INDIRECT_MAINTENANCE')}  level={1} />
            <Row label="Khấu hao"               amount={sumType('INDIRECT_DEPRECIATION')}    level={1} />
            <Row label="Chi phí khác"           amount={sumType('INDIRECT_OTHER')}            level={1} />
            <Row label="Tổng chi phí gián tiếp" amount={indirectCosts} bold />

            {/* Net Profit */}
            <ProfitLine
                label="= LỢI NHUẬN DÒNG"
                amount={netProfit}
                pctVal={pct(netProfit, revenue)}
                color={netProfit >= 0 ? '#0f766e' : '#dc2626'}
            />
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function WorkshopPLPage() {
    const { data: session } = useSession();
    const canEdit = ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt', 'xuong'].includes(session?.user?.role);

    const [period, setPeriod]           = useState(currentMonth);
    const [entries, setEntries]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [activeTab, setActiveTab]     = useState('report');
    const [filterGroup, setFilterGroup] = useState('all');
    const [showModal, setShowModal]     = useState(false);
    const [editing, setEditing]         = useState(null);
    const [form, setForm]               = useState(emptyForm);
    const [saving, setSaving]           = useState(false);
    const [deleting, setDeleting]       = useState(null);

    // Pull data states
    const [pulling, setPulling]         = useState(false);
    const [showPullModal, setShowPullModal] = useState(false);
    const [pullSuggestions, setPullSuggestions] = useState([]);
    const [selected, setSelected]       = useState(new Set());
    const [importing, setImporting]     = useState(false);

    const { revenue, directCosts, grossProfit, indirectCosts, netProfit } = useMemo(() => computeSummary(entries), [entries]);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(`/api/workshop/pl?period=${period}`);
            const data = await res.json();
            setEntries(data.entries || []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, [period]);

    function openAdd() {
        setEditing(null);
        setForm(emptyForm);
        setShowModal(true);
    }

    function openEdit(entry) {
        setEditing(entry);
        setForm({ entryType: entry.entryType, description: entry.description, amount: String(entry.amount), assignedTo: entry.assignedTo || '', notes: entry.notes || '' });
        setShowModal(true);
    }

    async function handleSave() {
        if (!form.description.trim() || !form.amount) return;
        setSaving(true);
        try {
            const url    = editing ? `/api/workshop/pl/${editing.id}` : '/api/workshop/pl';
            const method = editing ? 'PUT' : 'POST';
            const body   = editing ? form : { ...form, period };
            const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (res.ok) { setShowModal(false); load(); }
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Xóa bút toán này?')) return;
        setDeleting(id);
        try {
            await fetch(`/api/workshop/pl/${id}`, { method: 'DELETE' });
            load();
        } finally {
            setDeleting(null);
        }
    }

    async function handlePull() {
        setPulling(true);
        try {
            const res = await fetch(`/api/workshop/pl/pull?period=${period}`);
            const data = await res.json();
            setPullSuggestions(data.suggestions || []);
            setSelected(new Set((data.suggestions || []).map((_, i) => i)));
            setShowPullModal(true);
        } finally {
            setPulling(false);
        }
    }

    async function handleImport() {
        const toCreate = pullSuggestions
            .filter((_, i) => selected.has(i))
            .map(s => ({ period, entryType: s.entryType, description: s.description, amount: s.amount, notes: s.notes || null }));
        if (!toCreate.length) return;
        setImporting(true);
        try {
            const res = await fetch('/api/workshop/pl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toCreate),
            });
            if (res.ok) { setShowPullModal(false); load(); }
        } finally {
            setImporting(false);
        }
    }

    function toggleSelect(i) {
        setSelected(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
    }
    function toggleAll() {
        setSelected(prev => prev.size === pullSuggestions.length ? new Set() : new Set(pullSuggestions.map((_, i) => i)));
    }

    const displayEntries = filterGroup === 'all' ? entries : entries.filter(e => ENTRY_TYPES[e.entryType]?.group === filterGroup);

    const SummaryCard = ({ label, value, sub, color, textColor = '#fff' }) => (
        <div style={{ background: color, borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: textColor }}>{fmt(value)}</div>
            {sub != null && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 3 }}>{sub}</div>}
        </div>
    );

    return (
        <div style={{ padding: '24px', maxWidth: 960, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>P&L Xưởng Nội Thất</h1>
                    <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>Trung tâm tài chính — Lợi nhuận gộp & lợi nhuận dòng</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Period selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: '4px 8px' }}>
                        <button onClick={() => setPeriod(prevMonth(period))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#374151' }}>
                            <ChevronLeft size={16} />
                        </button>
                        <input
                            type="month"
                            value={period}
                            onChange={e => setPeriod(e.target.value)}
                            style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: 14, color: '#111', cursor: 'pointer' }}
                        />
                        <button onClick={() => setPeriod(nextMonth(period))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#374151' }}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    {canEdit && (<>
                        <button onClick={handlePull} disabled={pulling} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: pulling ? 0.7 : 1 }}>
                            <Download size={15} /> {pulling ? 'Đang kéo...' : 'Kéo dữ liệu'}
                        </button>
                        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#F47920', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                            <Plus size={15} /> Thêm bút toán
                        </button>
                    </>)}
                </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <SummaryCard label="Doanh thu" value={revenue} color="#2563eb" />
                <SummaryCard label="Chi phí trực tiếp" value={directCosts} color="#ea580c" />
                <SummaryCard label="Lợi nhuận gộp" value={grossProfit} sub={`Biên: ${pct(grossProfit, revenue)}%`} color={grossProfit >= 0 ? '#16a34a' : '#dc2626'} />
                <SummaryCard label="Chi phí gián tiếp" value={indirectCosts} color="#7c3aed" />
                <SummaryCard label="Lợi nhuận dòng" value={netProfit} sub={`Biên: ${pct(netProfit, revenue)}%`} color={netProfit >= 0 ? '#0f766e' : '#dc2626'} />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
                {[{ key: 'report', label: 'Báo cáo P&L' }, { key: 'entries', label: `Danh sách bút toán (${entries.length})` }].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: activeTab === t.key ? 700 : 400, fontSize: 13, color: activeTab === t.key ? '#F47920' : '#6b7280', borderBottom: activeTab === t.key ? '2px solid #F47920' : '2px solid transparent', marginBottom: -2 }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Đang tải...</div>
            ) : activeTab === 'report' ? (
                <PLReport entries={entries} />
            ) : (
                /* Entries table */
                <div>
                    {/* Filter */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        {[{ key: 'all', label: 'Tất cả' }, { key: 'revenue', label: 'Doanh thu' }, { key: 'direct', label: 'Chi phí TT' }, { key: 'indirect', label: 'Chi phí GT' }].map(f => (
                            <button key={f.key} onClick={() => setFilterGroup(f.key)} style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12, cursor: 'pointer', fontWeight: filterGroup === f.key ? 600 : 400, background: filterGroup === f.key ? '#F47920' : '#fff', color: filterGroup === f.key ? '#fff' : '#374151', borderColor: filterGroup === f.key ? '#F47920' : '#d1d5db' }}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    {displayEntries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Không có dữ liệu</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                    {['Loại', 'Mô tả', 'Người liên quan', 'Số tiền', 'Ghi chú', canEdit ? '' : null].filter(Boolean).map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayEntries.map((e, i) => {
                                    const typeInfo = ENTRY_TYPES[e.entryType];
                                    const groupColor = { revenue: '#dbeafe', direct: '#ffedd5', indirect: '#ede9fe' }[typeInfo?.group] || '#f3f4f6';
                                    const groupText  = { revenue: '#1d4ed8', direct: '#c2410c', indirect: '#6d28d9' }[typeInfo?.group] || '#374151';
                                    return (
                                        <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: groupColor, color: groupText, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {typeInfo?.label || e.entryType}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', maxWidth: 220 }}>{e.description}</td>
                                            <td style={{ padding: '10px 12px', color: '#6b7280' }}>{e.assignedTo || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 600, color: typeInfo?.group === 'revenue' ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                                                {typeInfo?.group === 'revenue' ? '+' : '-'}{fmt(e.amount)}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</td>
                                            {canEdit && (
                                                <td style={{ padding: '10px 12px' }}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => openEdit(e)} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#374151' }}><Pencil size={13} /></button>
                                                        <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id} style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={13} /></button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Modal kéo dữ liệu */}
            {showPullModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 600, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Kéo dữ liệu từ hệ thống</h3>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{displayPeriod(period)} — {pullSuggestions.length} mục tìm thấy</p>
                            </div>
                            <button onClick={() => setShowPullModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                        </div>

                        {/* Warning if entries exist */}
                        {entries.length > 0 && (
                            <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: '#fef3c7', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <AlertCircle size={15} style={{ color: '#92400e', marginTop: 1, flexShrink: 0 }} />
                                <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                                    Đã có <strong>{entries.length} bút toán</strong> trong kỳ này. Nhập thêm sẽ không xóa dữ liệu cũ — hãy kiểm tra để tránh trùng lặp.
                                </p>
                            </div>
                        )}

                        {/* Select all */}
                        {pullSuggestions.length > 0 && (
                            <div style={{ padding: '10px 20px 4px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#374151', fontSize: 12, fontWeight: 600, padding: 0 }}>
                                    {selected.size === pullSuggestions.length ? <CheckSquare size={15} color="#F47920" /> : <Square size={15} />}
                                    {selected.size === pullSuggestions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                                </button>
                                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
                                    Đã chọn {selected.size}/{pullSuggestions.length} •{' '}
                                    {fmt(pullSuggestions.filter((_, i) => selected.has(i)).reduce((a, s) => a + (ENTRY_TYPES[s.entryType]?.group === 'revenue' ? s.amount : -s.amount), 0))}
                                </span>
                            </div>
                        )}

                        {/* Suggestions list */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {pullSuggestions.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                    Không tìm thấy dữ liệu nào trong kỳ {displayPeriod(period)}.<br />
                                    <span style={{ fontSize: 12 }}>Thử nhập thủ công hoặc kiểm tra dữ liệu trong các module.</span>
                                </div>
                            ) : (
                                Object.entries({ revenue: 'Doanh thu', direct: 'Chi phí trực tiếp', indirect: 'Chi phí gián tiếp' }).map(([group, groupLabel]) => {
                                    const items = pullSuggestions.map((s, i) => ({ ...s, idx: i })).filter(s => ENTRY_TYPES[s.entryType]?.group === group);
                                    if (!items.length) return null;
                                    const groupColor = { revenue: '#2563eb', direct: '#ea580c', indirect: '#7c3aed' }[group];
                                    return (
                                        <div key={group}>
                                            <div style={{ padding: '8px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: groupColor }}>{groupLabel}</span>
                                                <span style={{ fontSize: 11, color: '#6b7280' }}>{items.length} mục — {fmt(items.reduce((a, s) => a + s.amount, 0))}</span>
                                            </div>
                                            {items.map(s => {
                                                const isSelected = selected.has(s.idx);
                                                const typeInfo = ENTRY_TYPES[s.entryType];
                                                const badgeBg = { revenue: '#dbeafe', direct: '#ffedd5', indirect: '#ede9fe' }[group];
                                                const badgeColor = { revenue: '#1d4ed8', direct: '#c2410c', indirect: '#6d28d9' }[group];
                                                return (
                                                    <div key={s.idx} onClick={() => toggleSelect(s.idx)}
                                                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 20px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: isSelected ? '#fafafa' : '#fff', opacity: isSelected ? 1 : 0.5 }}>
                                                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                                                            {isSelected ? <CheckSquare size={16} color="#F47920" /> : <Square size={16} color="#9ca3af" />}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                                                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 10, background: badgeBg, color: badgeColor, fontWeight: 600, whiteSpace: 'nowrap' }}>{typeInfo?.label}</span>
                                                                <span style={{ fontSize: 10, color: '#9ca3af' }}>từ {s.source}</span>
                                                            </div>
                                                            <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{s.description}</div>
                                                            {s.notes && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.notes}</div>}
                                                        </div>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: group === 'revenue' ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                            {group === 'revenue' ? '+' : '-'}{fmt(s.amount)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        {pullSuggestions.length > 0 && (
                            <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: '#6b7280', marginRight: 'auto' }}>
                                    Nhập <strong>{selected.size}</strong> mục được chọn
                                </span>
                                <button onClick={() => setShowPullModal(false)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
                                <button onClick={handleImport} disabled={importing || selected.size === 0}
                                    style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: selected.size === 0 ? '#d1d5db' : '#F47920', color: '#fff', fontWeight: 600, cursor: selected.size === 0 ? 'default' : 'pointer', fontSize: 13, opacity: importing ? 0.7 : 1 }}>
                                    {importing ? 'Đang nhập...' : `Nhập ${selected.size} mục`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal add/edit */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{editing ? 'Sửa bút toán' : `Thêm bút toán — ${displayPeriod(period)}`}</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                        </div>
                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Group selector → then type */}
                            <div>
                                <label style={labelStyle}>Nhóm khoản mục</label>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    {Object.entries(GROUP_LABELS).map(([g, l]) => (
                                        <button key={g}
                                            onClick={() => setForm(f => ({ ...f, entryType: TYPE_OPTIONS_BY_GROUP[g][0] }))}
                                            style={{ flex: 1, padding: '7px 4px', border: '1px solid', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: ENTRY_TYPES[form.entryType]?.group === g ? 700 : 400, background: ENTRY_TYPES[form.entryType]?.group === g ? '#F47920' : '#f9fafb', color: ENTRY_TYPES[form.entryType]?.group === g ? '#fff' : '#374151', borderColor: ENTRY_TYPES[form.entryType]?.group === g ? '#F47920' : '#d1d5db' }}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Loại khoản mục *</label>
                                <select value={form.entryType} onChange={e => setForm(f => ({ ...f, entryType: e.target.value }))} style={inputStyle}>
                                    {(TYPE_OPTIONS_BY_GROUP[ENTRY_TYPES[form.entryType]?.group] || TYPE_OPTIONS_BY_GROUP.revenue).map(t => (
                                        <option key={t} value={t}>{ENTRY_TYPES[t]?.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Mô tả *</label>
                                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Mô tả chi tiết" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Số tiền (VNĐ) *</label>
                                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" style={inputStyle} min={0} />
                            </div>
                            <div>
                                <label style={labelStyle}>Người liên quan</label>
                                <input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="VD: Vương, Hương..." style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Ghi chú</label>
                                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú thêm..." style={{ ...inputStyle, height: 72, resize: 'vertical' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                                <button onClick={() => setShowModal(false)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
                                <button onClick={handleSave} disabled={saving || !form.description.trim() || !form.amount} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#F47920', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
