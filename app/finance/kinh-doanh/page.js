'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

const fmtVnd = (n) => {
    if (!n && n !== 0) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
    if (abs >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' tr';
    return new Intl.NumberFormat('vi-VN').format(Math.round(n));
};
const fmtFull = (n) => n || n === 0 ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '—';
const pct = (a, b) => (b && b !== 0) ? ((a / b) * 100).toFixed(1) + '%' : '—';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MONTH_LABELS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

// ── Row definitions ──────────────────────────────────────────────────────────
const ROW_DEFS = [
    { key: 'sec1', label: 'I. TÍNH LỢI NHUẬN GỘP = Doanh thu − Chi phí trực tiếp', type: 'section' },

    { key: 'grp_rev', label: 'A. DOANH THU', type: 'group' },
    { key: 'rev_design',    label: 'Doanh thu nhận thiết kế',       type: 'input', indent: 2 },
    { key: 'rev_furniture', label: 'Doanh thu hợp đồng nội thất',   type: 'input', indent: 2 },
    { key: 'rev_other',     label: 'Doanh thu khác',                 type: 'input', indent: 2 },
    { key: 'total_rev', label: 'TỔNG DOANH THU', type: 'subtotal', indent: 1,
      formula: ['rev_design', 'rev_furniture', 'rev_other'] },

    { key: 'grp_direct', label: 'B. CÁC CHI PHÍ TRỰC TIẾP', type: 'group' },
    { key: 'grp_labor', label: 'B1. Nhân công', type: 'subgroup', indent: 1 },
    { key: 'labor_salary',    label: 'Chi phí tiền lương sale',              type: 'input', indent: 2 },
    { key: 'labor_insurance', label: 'Bảo hiểm xã hội, bảo hiểm y tế',      type: 'input', indent: 2 },
    { key: 'labor_bonus',     label: 'Thưởng và các chế độ phúc lợi khác',  type: 'input', indent: 2 },
    { key: 'total_labor', label: 'Tổng nhân công', type: 'subtotal', indent: 2,
      formula: ['labor_salary', 'labor_insurance', 'labor_bonus'] },

    { key: 'grp_direct_order', label: 'B2. Chi phí trực tiếp đơn hàng', type: 'subgroup', indent: 1 },
    { key: 'direct_design_dept', label: 'Trả Phòng Thiết kế',                    type: 'input', indent: 2 },
    { key: 'direct_factory',     label: 'Trả xưởng sản xuất',                    type: 'input', indent: 2 },
    { key: 'direct_order_other', label: 'Chi phí đặt hàng khác',                 type: 'input', indent: 2 },
    { key: 'direct_contractor',  label: 'Chi A, dẫn việc',                       type: 'input', indent: 2 },
    { key: 'direct_entertain',   label: 'Chi phí tiếp khác và chi khác',         type: 'input', indent: 2 },
    { key: 'direct_supplies',    label: 'Chi phí văn phòng phẩm (% sản lượng)', type: 'input', indent: 2 },
    { key: 'total_direct_order', label: 'Tổng chi phí trực tiếp đơn hàng', type: 'subtotal', indent: 2,
      formula: ['direct_design_dept', 'direct_factory', 'direct_order_other', 'direct_contractor', 'direct_entertain', 'direct_supplies'] },

    { key: 'company_fee', label: 'B3. Chi phí % nộp Công ty', type: 'input', indent: 1 },
    { key: 'total_direct', label: 'TỔNG CHI PHÍ TRỰC TIẾP', type: 'subtotal', indent: 0,
      formula: ['total_labor', 'total_direct_order', 'company_fee'] },
    { key: 'gross_profit', label: 'LỢI NHUẬN GỘP = Doanh thu − Chi phí trực tiếp', type: 'profit',
      add: ['total_rev'], sub: ['total_direct'] },

    { key: 'sec2', label: 'II. TÍNH LỢI NHUẬN DÒNG = Lợi nhuận gộp − Chi phí gián tiếp', type: 'section' },
    { key: 'grp_indirect', label: 'C. CHI PHÍ GIÁN TIẾP', type: 'group' },
    { key: 'grp_mgmt', label: 'C1. Chi phí quản lý', type: 'subgroup', indent: 1 },
    { key: 'mgmt_salary', label: 'Lương nhân viên quản lý', type: 'input', indent: 2 },
    { key: 'mgmt_bonus',  label: 'Thưởng doanh số',         type: 'input', indent: 2 },
    { key: 'total_mgmt', label: 'Tổng chi phí quản lý', type: 'subtotal', indent: 2,
      formula: ['mgmt_salary', 'mgmt_bonus'] },

    { key: 'indirect_marketing',    label: 'C2. Marketing',                    type: 'input', indent: 1 },
    { key: 'indirect_general',      label: 'C3. Chi phí chung',                type: 'input', indent: 1 },
    { key: 'indirect_equipment',    label: 'C4. Mua sắm, máy móc thiết bị',   type: 'input', indent: 1 },
    { key: 'indirect_renovation',   label: 'C5. Sửa chữa, nâng cấp showroom', type: 'input', indent: 1 },
    { key: 'indirect_depreciation', label: 'C6. Chi phí khấu hao',             type: 'input', indent: 1 },
    { key: 'indirect_other',        label: 'C7. Chi phí khác',                 type: 'input', indent: 1 },
    { key: 'total_indirect', label: 'TỔNG CHI PHÍ GIÁN TIẾP', type: 'subtotal', indent: 0,
      formula: ['total_mgmt', 'indirect_marketing', 'indirect_general', 'indirect_equipment', 'indirect_renovation', 'indirect_depreciation', 'indirect_other'] },
    { key: 'net_profit', label: 'LỢI NHUẬN DÒNG = Lợi nhuận gộp − Chi phí gián tiếp', type: 'profit',
      add: ['gross_profit'], sub: ['total_indirect'] },
];

function computeVal(key, month, data) {
    const def = ROW_DEFS.find(r => r.key === key);
    if (!def) return 0;
    if (def.type === 'input') return data[key]?.[month] || 0;
    if (def.type === 'subtotal')
        return (def.formula || []).reduce((s, k) => s + computeVal(k, month, data), 0);
    if (def.type === 'profit') {
        const a = (def.add || []).reduce((s, k) => s + computeVal(k, month, data), 0);
        const b = (def.sub || []).reduce((s, k) => s + computeVal(k, month, data), 0);
        return a - b;
    }
    return 0;
}

function yearTotal(key, data) {
    return MONTHS.reduce((s, m) => s + computeVal(key, m, data), 0);
}

// Metadata for sync modal (rows that can be auto-synced)
const SYNC_ROW_META = [
    { key: 'rev_design',    label: 'Doanh thu nhận thiết kế',              section: 'A. Doanh thu' },
    { key: 'rev_furniture', label: 'Doanh thu hợp đồng nội thất',          section: 'A. Doanh thu' },
    { key: 'rev_other',     label: 'Doanh thu khác',                        section: 'A. Doanh thu' },
    { key: 'labor_salary',    label: 'Chi phí tiền lương sale',             section: 'B1. Nhân công' },
    { key: 'labor_insurance', label: 'Bảo hiểm xã hội, bảo hiểm y tế',    section: 'B1. Nhân công' },
    { key: 'labor_bonus',     label: 'Thưởng và các chế độ phúc lợi',      section: 'B1. Nhân công' },
    { key: 'direct_design_dept', label: 'Trả Phòng Thiết kế',               section: 'B2. CP trực tiếp đơn hàng' },
    { key: 'direct_factory',     label: 'Trả xưởng sản xuất',              section: 'B2. CP trực tiếp đơn hàng' },
    { key: 'direct_order_other', label: 'Chi phí đặt hàng khác',           section: 'B2. CP trực tiếp đơn hàng' },
    { key: 'direct_entertain',   label: 'Chi phí tiếp khách và chi khác',  section: 'B2. CP trực tiếp đơn hàng' },
    { key: 'direct_supplies',    label: 'Chi phí văn phòng phẩm',          section: 'B2. CP trực tiếp đơn hàng' },
    { key: 'mgmt_salary',  label: 'Lương nhân viên quản lý',               section: 'C1. CP quản lý' },
    { key: 'mgmt_bonus',   label: 'Thưởng doanh số',                       section: 'C1. CP quản lý' },
    { key: 'indirect_marketing',    label: 'Marketing',                     section: 'C. CP gián tiếp' },
    { key: 'indirect_general',      label: 'Chi phí chung',                section: 'C. CP gián tiếp' },
    { key: 'indirect_equipment',    label: 'Mua sắm, máy móc thiết bị',    section: 'C. CP gián tiếp' },
    { key: 'indirect_renovation',   label: 'Sửa chữa, nâng cấp showroom', section: 'C. CP gián tiếp' },
    { key: 'indirect_other',        label: 'Chi phí khác',                 section: 'C. CP gián tiếp' },
];

function buildDataMap(entries) {
    const map = {};
    for (const e of entries) {
        if (!map[e.rowKey]) map[e.rowKey] = {};
        map[e.rowKey][e.month] = e.amount;
    }
    return map;
}

// ── Mini bar chart (SVG) ─────────────────────────────────────────────────────
function MiniBarChart({ data, year }) {
    const W = 560, H = 80, PAD = 4;
    const bars = MONTHS.map(m => ({
        m,
        rev: computeVal('total_rev', m, data),
        cost: computeVal('total_direct', m, data) + computeVal('total_indirect', m, data),
        profit: computeVal('net_profit', m, data),
    }));
    const maxVal = Math.max(...bars.map(b => Math.max(b.rev, b.cost, 1)));
    const bw = (W - PAD * (MONTHS.length + 1)) / MONTHS.length / 2;

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block' }}>
            {bars.map((b, i) => {
                const x = PAD + i * ((W - PAD) / MONTHS.length);
                const revH = Math.max(1, (b.rev / maxVal) * H);
                const costH = Math.max(1, (b.cost / maxVal) * H);
                const netPos = b.profit >= 0;
                return (
                    <g key={b.m}>
                        <rect x={x} y={H - revH} width={bw} height={revH} fill="#3b82f6" opacity={0.75} rx={2} />
                        <rect x={x + bw + 1} y={H - costH} width={bw} height={costH} fill="#f87171" opacity={0.75} rx={2} />
                        <text x={x + bw} y={H + 14} textAnchor="middle" fontSize={8} fill="#9ca3af">T{b.m}</text>
                    </g>
                );
            })}
            {/* Legend */}
            <rect x={0} y={H + 2} width={8} height={8} fill="#3b82f6" opacity={0.75} rx={1} />
            <text x={10} y={H + 10} fontSize={7} fill="#6b7280">Doanh thu</text>
            <rect x={55} y={H + 2} width={8} height={8} fill="#f87171" opacity={0.75} rx={1} />
            <text x={65} y={H + 10} fontSize={7} fill="#6b7280">Chi phí</text>
        </svg>
    );
}

export default function KinhDoanhCostPage() {
    const { data: session } = useSession();
    const role = session?.user?.role || '';
    const canEdit = ['giam_doc', 'pho_gd', 'ban_gd', 'ke_toan', 'hanh_chinh_kt', 'kinh_doanh'].includes(role);

    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState({});
    const [editCell, setEditCell] = useState(null);
    const [editVal, setEditVal] = useState('');
    const inputRef = useRef();
    const saveTimerRef = useRef();

    // ── Sync state ───────────────────────────────────────────────────────────
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncStep, setSyncStep] = useState('');
    const [syncModal, setSyncModal] = useState(false);
    const [syncResults, setSyncResults] = useState(null);
    const [syncSelected, setSyncSelected] = useState({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/finance/kd-cost?year=${year}`);
        const json = await res.json();
        setData(buildDataMap(json.entries || []));
        setDirty({});
        setLoading(false);
    }, [year]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { if (editCell && inputRef.current) inputRef.current.focus(); }, [editCell]);

    const startEdit = (rowKey, month) => {
        if (!canEdit) return;
        const cur = data[rowKey]?.[month] || 0;
        setEditCell({ rowKey, month });
        setEditVal(cur === 0 ? '' : String(cur));
    };

    const commitEdit = () => {
        if (!editCell) return;
        const { rowKey, month } = editCell;
        const num = parseFloat(editVal.replace(/[^0-9.-]/g, '')) || 0;
        setData(prev => ({ ...prev, [rowKey]: { ...(prev[rowKey] || {}), [month]: num } }));
        setDirty(prev => ({ ...prev, [`${rowKey}__${month}`]: true }));
        setEditCell(null);
        setEditVal('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); commitEdit(); }
        if (e.key === 'Escape') { setEditCell(null); setEditVal(''); }
    };

    useEffect(() => {
        const dirtyKeys = Object.keys(dirty);
        if (dirtyKeys.length === 0) return;
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            setSaving(true);
            const entries = dirtyKeys.map(k => {
                const [rowKey, month] = k.split('__');
                return { rowKey, month: Number(month), amount: data[rowKey]?.[Number(month)] || 0 };
            });
            await fetch('/api/finance/kd-cost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, entries }),
            });
            setDirty({});
            setSaving(false);
        }, 1500);
        return () => clearTimeout(saveTimerRef.current);
    }, [dirty, data, year]);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    // ── Sync handlers ─────────────────────────────────────────────────────────
    const openSync = async () => {
        setSyncLoading(true);
        setSyncModal(true);
        setSyncResults(null);
        setSyncStep('Đang tổng hợp số liệu từ hệ thống...');

        try {
            const res  = await fetch(`/api/finance/kd-cost/sync?year=${year}`);
            const json = await res.json();
            const results = json.results || {};
            setSyncResults(results);

            const sel = {};
            for (const [key, val] of Object.entries(results)) {
                sel[key] = val.total > 0;
            }
            setSyncSelected(sel);
            setSyncStep('');
        } catch (err) {
            setSyncStep('❌ Lỗi: ' + err.message);
        } finally {
            setSyncLoading(false);
        }
    };

    const applySync = async () => {
        if (!syncResults) return;
        const entries = [];
        for (const [rowKey, checked] of Object.entries(syncSelected)) {
            if (!checked) continue;
            const months = syncResults[rowKey]?.months || {};
            for (const [month, amount] of Object.entries(months)) {
                entries.push({ rowKey, month: Number(month), amount });
            }
        }
        if (entries.length === 0) return;
        await fetch('/api/finance/kd-cost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, entries }),
        });
        setSyncModal(false);
        fetchData();
    };

    // ── Computed KPIs ────────────────────────────────────────────────────────
    const rev        = yearTotal('total_rev', data);
    const directCost = yearTotal('total_direct', data);
    const grossP     = yearTotal('gross_profit', data);
    const indirectCost = yearTotal('total_indirect', data);
    const netP       = yearTotal('net_profit', data);
    const grossPct   = rev > 0 ? (grossP / rev * 100) : 0;
    const netPct     = rev > 0 ? (netP / rev * 100) : 0;

    // Monthly net profit for sparkline
    const monthlyGross = MONTHS.map(m => computeVal('gross_profit', m, data));
    const monthlyNet   = MONTHS.map(m => computeVal('net_profit', m, data));

    // ── Row rendering helpers ────────────────────────────────────────────────
    const rowStyle = (def) => {
        switch (def.type) {
            case 'section':  return { background: '#1e3a5f', color: '#fff', fontWeight: 700, fontSize: 13 };
            case 'group':    return { background: '#dbeafe', color: '#1e40af', fontWeight: 700, fontSize: 13 };
            case 'subgroup': return { background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: 12 };
            case 'subtotal': return { background: '#f0fdf4', color: '#166534', fontWeight: 700, fontSize: 12 };
            case 'profit':   return { background: '#fef3c7', color: '#92400e', fontWeight: 800, fontSize: 13 };
            default:         return { background: 'transparent', fontWeight: 400, fontSize: 12 };
        }
    };

    const totalForRow = (def) => {
        if (['section', 'group', 'subgroup'].includes(def.type)) return null;
        return MONTHS.reduce((s, m) => s + computeVal(def.key, m, data), 0);
    };

    return (
        <div style={{ padding: '16px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <style>{`
              @media (max-width: 768px) {
                .kd-charts-row { grid-template-columns: 1fr !important; }
                .kd-controls { margin-left: 0 !important; width: 100%; }
                .kd-sync-modal { max-height: 95vh !important; }
                .kd-legend-area { display: none !important; }
              }
              @media (max-width: 480px) {
                .kd-kpi-grid { grid-template-columns: 1fr 1fr !important; }
              }
            `}</style>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Bảng Tổng Hợp Chi Phí</h1>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Trung tâm tài chính — Phòng Kinh Doanh</div>
                </div>
                <div className="kd-controls" style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="form-select" value={year} onChange={e => { setYear(Number(e.target.value)); }} style={{ minWidth: 110 }}>
                        {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                    {canEdit && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={openSync}
                            disabled={syncLoading}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        >
                            {syncLoading ? '⏳' : '🔄'} Đồng bộ từ hệ thống
                        </button>
                    )}
                    {saving
                        ? <span style={{ fontSize: 12, color: '#f59e0b' }}>Đang lưu...</span>
                        : <span style={{ fontSize: 12, color: '#16a34a' }}>✓ Đã lưu</span>
                    }
                </div>
            </div>

            {/* ── DASHBOARD KPI ── */}
            {!loading && (
                <>
                    {/* KPI Cards row 1 */}
                    <div className="kd-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
                        {[
                            { label: 'Doanh thu', value: rev, icon: '📈', color: '#1e40af', bg: '#dbeafe', sub: `${pct(rev, rev)} năm ${year}` },
                            { label: 'Chi phí trực tiếp', value: directCost, icon: '📦', color: '#92400e', bg: '#fef3c7', sub: `${pct(directCost, rev)} DT` },
                            { label: 'Lợi nhuận gộp', value: grossP, icon: '💹', color: grossP >= 0 ? '#166534' : '#991b1b', bg: grossP >= 0 ? '#dcfce7' : '#fee2e2', sub: `Biên: ${pct(grossP, rev)}` },
                            { label: 'Chi phí gián tiếp', value: indirectCost, icon: '🏢', color: '#6b21a8', bg: '#f3e8ff', sub: `${pct(indirectCost, rev)} DT` },
                            { label: 'Lợi nhuận dòng', value: netP, icon: '💰', color: netP >= 0 ? '#065f46' : '#991b1b', bg: netP >= 0 ? '#d1fae5' : '#fee2e2', sub: `Biên: ${pct(netP, rev)}` },
                        ].map(k => (
                            <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '14px 16px', border: `1px solid ${k.color}20` }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, color: k.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</span>
                                    <span style={{ fontSize: 18 }}>{k.icon}</span>
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: k.color, marginBottom: 4 }}>{fmtVnd(k.value)}</div>
                                <div style={{ fontSize: 10, color: k.color, opacity: 0.7 }}>{k.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Progress bars + Chart */}
                    <div className="kd-charts-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>

                        {/* Cơ cấu chi phí */}
                        <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>Cơ cấu chi phí / Doanh thu</div>
                            {[
                                { label: 'Chi phí trực tiếp', val: directCost, color: '#f87171' },
                                { label: 'Chi phí gián tiếp', val: indirectCost, color: '#c084fc' },
                                { label: 'Lợi nhuận dòng', val: Math.max(0, netP), color: '#34d399' },
                            ].map(bar => {
                                const barPct = rev > 0 ? Math.min(100, Math.max(0, (bar.val / rev) * 100)) : 0;
                                return (
                                    <div key={bar.label} style={{ marginBottom: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, color: 'var(--text-muted)' }}>
                                            <span>{bar.label}</span>
                                            <span style={{ fontWeight: 600 }}>{fmtVnd(bar.val)} ({barPct.toFixed(1)}%)</span>
                                        </div>
                                        <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${barPct}%`, background: bar.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                                        </div>
                                    </div>
                                );
                            })}
                            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Biên LN gộp: <strong style={{ color: grossP >= 0 ? '#16a34a' : '#dc2626' }}>{grossPct.toFixed(1)}%</strong>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Biên LN dòng: <strong style={{ color: netP >= 0 ? '#16a34a' : '#dc2626' }}>{netPct.toFixed(1)}%</strong>
                                </div>
                            </div>
                        </div>

                        {/* Biểu đồ theo tháng */}
                        <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-primary)' }}>Doanh thu & Chi phí theo tháng</div>
                            <MiniBarChart data={data} year={year} />
                            {/* Monthly LN gộp row */}
                            <div style={{ marginTop: 8, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {MONTHS.map((m, i) => {
                                    const v = monthlyNet[i];
                                    return (
                                        <div key={m} style={{ flex: '1 1 0', textAlign: 'center', fontSize: 9 }}>
                                            <div style={{
                                                height: 4, borderRadius: 2,
                                                background: v > 0 ? '#34d399' : v < 0 ? '#f87171' : '#e5e7eb',
                                                marginBottom: 2,
                                            }} />
                                            <span style={{ color: 'var(--text-muted)' }}>T{m}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ marginTop: 4, fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>
                                LN dòng theo tháng: <span style={{ color: '#34d399' }}>■ dương</span> <span style={{ color: '#f87171' }}>■ âm</span>
                            </div>
                        </div>
                    </div>

                    {/* Summary tháng hiện tại */}
                    <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, overflowX: 'auto' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text-primary)' }}>Tổng hợp theo tháng — Năm {year}</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 800 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 130 }}>Chỉ tiêu</th>
                                    {MONTH_LABELS.map(l => (
                                        <th key={l} style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, minWidth: 70 }}>{l}</th>
                                    ))}
                                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1e40af', fontWeight: 700, minWidth: 90 }}>Cả năm</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { key: 'total_rev',    label: 'Doanh thu', color: '#1e40af', bg: '#f0f7ff' },
                                    { key: 'total_direct', label: 'CP trực tiếp', color: '#92400e', bg: '#fffbeb' },
                                    { key: 'gross_profit', label: 'LN gộp', color: '#166534', bg: '#f0fdf4', bold: true },
                                    { key: 'total_indirect', label: 'CP gián tiếp', color: '#6b21a8', bg: '#faf5ff' },
                                    { key: 'net_profit', label: 'LN dòng', color: '#065f46', bg: '#d1fae5', bold: true },
                                ].map(row => {
                                    const rowTotal = yearTotal(row.key, data);
                                    return (
                                        <tr key={row.key} style={{ background: row.bg, borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '6px 8px', fontWeight: row.bold ? 700 : 500, color: row.color, whiteSpace: 'nowrap' }}>{row.label}</td>
                                            {MONTHS.map(m => {
                                                const v = computeVal(row.key, m, data);
                                                return (
                                                    <td key={m} style={{ padding: '6px 4px', textAlign: 'right', fontWeight: row.bold ? 700 : 400, color: v < 0 ? '#dc2626' : row.color }}>
                                                        {v === 0 ? <span style={{ color: '#d1d5db' }}>—</span> : fmtVnd(v)}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: rowTotal < 0 ? '#dc2626' : row.color, borderLeft: '2px solid var(--border)' }}>
                                                {rowTotal === 0 ? '—' : fmtVnd(rowTotal)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ── BẢNG CHI TIẾT ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Bảng chi tiết</h2>
                <div className="kd-legend-area" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
                    {[
                        { bg: '#dbeafe', color: '#1e40af', label: 'Nhóm' },
                        { bg: '#eff6ff', color: '#1d4ed8', label: 'Tiểu nhóm' },
                        { bg: '#f0fdf4', color: '#166534', label: 'Tổng cộng' },
                        { bg: '#fef3c7', color: '#92400e', label: 'Lợi nhuận' },
                    ].map(l => (
                        <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: l.bg, display: 'inline-block', border: `1px solid ${l.color}40` }} />
                            <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
                        </span>
                    ))}
                    {canEdit && <span style={{ color: 'var(--text-muted)' }}>• Click ô trắng để nhập (VNĐ)</span>}
                </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 16 }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
                        <thead>
                            <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                                <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: 280, fontWeight: 700, fontSize: 13, position: 'sticky', left: 0, background: '#1e3a5f', zIndex: 2 }}>
                                    Chỉ tiêu
                                </th>
                                {MONTHS.map(m => (
                                    <th key={m} style={{ padding: '10px 6px', textAlign: 'right', minWidth: 88, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>T{m}</th>
                                ))}
                                <th style={{ padding: '10px 10px', textAlign: 'right', minWidth: 110, fontWeight: 700, fontSize: 12, background: '#16325c', whiteSpace: 'nowrap' }}>
                                    Tổng năm
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {ROW_DEFS.map((def) => {
                                const rs = rowStyle(def);
                                const isNonData = ['section', 'group', 'subgroup'].includes(def.type);
                                const total = totalForRow(def);
                                const isNegTotal = total !== null && total < 0;

                                return (
                                    <tr key={def.key} style={{ borderBottom: '1px solid #e5e7eb', ...rs }}>
                                        <td style={{
                                            padding: `8px 10px 8px ${10 + (def.indent || 0) * 14}px`,
                                            fontWeight: rs.fontWeight, fontSize: rs.fontSize,
                                            color: rs.color || 'var(--text-primary)',
                                            background: rs.background,
                                            position: 'sticky', left: 0, zIndex: 1,
                                            borderRight: '1px solid #e5e7eb',
                                            whiteSpace: 'nowrap', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis',
                                        }}>
                                            {def.label}
                                        </td>

                                        {MONTHS.map(m => {
                                            const isEditing = editCell?.rowKey === def.key && editCell?.month === m;
                                            const val = isNonData ? null : computeVal(def.key, m, data);
                                            const isNeg = val !== null && val < 0;
                                            const isDirty = !!dirty[`${def.key}__${m}`];

                                            return (
                                                <td key={m}
                                                    onClick={() => def.type === 'input' && startEdit(def.key, m)}
                                                    style={{
                                                        padding: '6px',
                                                        textAlign: 'right',
                                                        fontSize: rs.fontSize,
                                                        fontWeight: rs.fontWeight,
                                                        color: isNeg ? '#dc2626' : (rs.color || 'var(--text-primary)'),
                                                        background: isNonData ? rs.background : (isDirty ? '#fffbeb' : isEditing ? '#fff7ed' : isNeg && def.type === 'profit' ? '#fee2e2' : 'transparent'),
                                                        cursor: def.type === 'input' && canEdit ? 'pointer' : 'default',
                                                        borderRight: '1px solid #f0f0f0',
                                                    }}
                                                >
                                                    {isEditing ? (
                                                        <input
                                                            ref={inputRef}
                                                            value={editVal}
                                                            onChange={e => setEditVal(e.target.value)}
                                                            onBlur={commitEdit}
                                                            onKeyDown={handleKeyDown}
                                                            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#1e40af' }}
                                                            placeholder="0"
                                                        />
                                                    ) : isNonData ? null : (
                                                        <span style={{ color: isNeg ? '#dc2626' : val === 0 ? '#d1d5db' : undefined }}>
                                                            {val === 0 ? '—' : fmtFull(val)}
                                                        </span>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td style={{
                                            padding: '6px 10px',
                                            textAlign: 'right',
                                            fontSize: rs.fontSize,
                                            fontWeight: 700,
                                            color: isNegTotal ? '#dc2626' : (rs.color || 'var(--text-primary)'),
                                            background: isNonData ? rs.background : (isNegTotal ? '#fee2e2' : rs.background || '#f9fafb'),
                                            borderLeft: '2px solid #e5e7eb',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {isNonData ? null : total === 0 ? '—' : fmtFull(total)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                Đơn vị: VNĐ &nbsp;|&nbsp; Năm {year} &nbsp;|&nbsp; Dữ liệu tự động lưu
            </div>

            {/* ── SYNC MODAL ── */}
            {syncModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                    onClick={e => { if (e.target === e.currentTarget) setSyncModal(false); }}
                >
                    <div className="kd-sync-modal" style={{ background: 'var(--bg-card, #fff)', borderRadius: 12, width: '100%', maxWidth: 720, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        {/* Modal header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>🔄</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>Đồng bộ từ hệ thống — Năm {year}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Tổng hợp số liệu từ hợp đồng, chi phí và lương đã nhập</div>
                            </div>
                            <button onClick={() => setSyncModal(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
                        </div>

                        {/* Modal body */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
                            {syncLoading ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                    <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
                                    <div style={{ fontSize: 13, color: '#1e40af', fontWeight: 500 }}>
                                        {syncStep || 'Đang tổng hợp số liệu...'}
                                    </div>
                                </div>
                            ) : syncStep.startsWith('❌') ? (
                                <div style={{ padding: 40, textAlign: 'center' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
                                    <div style={{ color: '#dc2626', fontWeight: 600 }}>{syncStep}</div>
                                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={() => setSyncModal(false)}>Đóng</button>
                                </div>
                            ) : syncResults ? (
                                <>
                                    {/* Select all / none */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => {
                                            const sel = {};
                                            for (const k of Object.keys(syncResults)) sel[k] = syncResults[k].total > 0;
                                            setSyncSelected(sel);
                                        }}>Chọn tất cả có dữ liệu</button>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setSyncSelected({})}>Bỏ chọn tất cả</button>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                            {Object.values(syncSelected).filter(Boolean).length} chỉ tiêu được chọn
                                        </span>
                                    </div>

                                    {/* Rows table */}
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                        <thead>
                                            <tr style={{ background: '#f9fafb', borderBottom: '2px solid var(--border)' }}>
                                                <th style={{ padding: '7px 10px', textAlign: 'left', width: 36 }}></th>
                                                <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Chỉ tiêu</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Nguồn dữ liệu</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Tổng năm</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Bản ghi</th>
                                                <th style={{ padding: '7px 10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Hiện có</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {SYNC_ROW_META.map(({ key, label, section }) => {
                                                const r = syncResults[key];
                                                if (!r) return null;
                                                const existingTotal = yearTotal(key, data);
                                                const hasExisting = existingTotal > 0;
                                                const hasNew = r.total > 0;
                                                const checked = !!syncSelected[key];

                                                return (
                                                    <tr key={key} style={{ borderBottom: '1px solid var(--border)', opacity: hasNew ? 1 : 0.45 }}>
                                                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                disabled={!hasNew}
                                                                onChange={e => setSyncSelected(prev => ({ ...prev, [key]: e.target.checked }))}
                                                                style={{ cursor: hasNew ? 'pointer' : 'default', width: 15, height: 15 }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '7px 10px' }}>
                                                            <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 1 }}>{section}</div>
                                                            <div style={{ fontWeight: 500 }}>{label}</div>
                                                        </td>
                                                        <td style={{ padding: '7px 10px', fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {r.source}
                                                        </td>
                                                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: hasNew ? '#1e40af' : '#d1d5db', whiteSpace: 'nowrap' }}>
                                                            {hasNew ? fmtVnd(r.total) : '—'}
                                                        </td>
                                                        <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>
                                                            {r.count > 0 ? r.count : '—'}
                                                        </td>
                                                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                                            {hasExisting ? (
                                                                <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 10, fontSize: 10, background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                                                                    {fmtVnd(existingTotal)}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, fontSize: 11, color: '#92400e' }}>
                                        ⚠️ Áp dụng sẽ <strong>ghi đè</strong> dữ liệu đang có (cột "Hiện có"). Dữ liệu nhập tay sẽ bị thay thế.
                                        Các tháng không có dữ liệu từ hệ thống sẽ giữ nguyên.
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Modal footer */}
                        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setSyncModal(false)}>Hủy</button>
                            <button
                                className="btn btn-primary"
                                onClick={applySync}
                                disabled={syncLoading || !syncResults || Object.values(syncSelected).every(v => !v)}
                                style={{ fontWeight: 700 }}
                            >
                                ✅ Áp dụng đồng bộ ({Object.values(syncSelected).filter(Boolean).length} chỉ tiêu)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
