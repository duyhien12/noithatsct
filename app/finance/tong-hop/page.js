'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const fmtVnd = (n) => {
    if (!n && n !== 0) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1).replace('.0', '') + ' tỷ';
    if (abs >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' tr';
    if (abs === 0) return '—';
    return new Intl.NumberFormat('vi-VN').format(Math.round(n));
};
const fmtFull = (n) => (n || n === 0) ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '—';
const pct = (a, b) => (b && b !== 0) ? ((a / b) * 100).toFixed(1) + '%' : '—';
const MONTHS = [1,2,3,4,5,6,7,8,9,10,11,12];

// ── Định nghĩa các dòng bảng chi tiết ────────────────────────────────────────
const ROW_DEFS = [
    { key: 'sec_rev', label: 'I. DOANH THU', type: 'section' },
    { key: 'w_rev_external',  label: 'Doanh thu ngoài (Xưởng)',         type: 'data', dept: 'workshop', field: 'revenue_external',  indent: 1 },
    { key: 'w_rev_internal',  label: 'Doanh thu nội bộ (Xưởng → KD)',  type: 'elim', dept: 'workshop', field: 'revenue_internal',   indent: 1, elimNote: 'Loại trừ nội bộ' },
    { key: 'kd_rev_design',   label: 'Doanh thu thiết kế (KD)',         type: 'data', dept: 'kd',       field: 'rev_design',         indent: 1 },
    { key: 'kd_rev_furniture',label: 'Doanh thu thi công / nội thất (KD)',type:'data',dept: 'kd',       field: 'rev_furniture',       indent: 1 },
    { key: 'kd_rev_other',    label: 'Doanh thu khác (KD)',             type: 'data', dept: 'kd',       field: 'rev_other',          indent: 1 },
    { key: 'total_rev',       label: 'TỔNG DOANH THU HỢP NHẤT',        type: 'total_rev' },

    { key: 'sec_direct', label: 'II. CHI PHÍ TRỰC TIẾP', type: 'section' },
    { key: 'grp_w_direct', label: 'A. Chi phí xưởng sản xuất', type: 'group' },
    { key: 'w_direct_material',  label: 'Vật tư',           type: 'data', dept: 'workshop', field: 'direct_material',  indent: 2 },
    { key: 'w_direct_labor',     label: 'Nhân công',         type: 'data', dept: 'workshop', field: 'direct_labor',     indent: 2 },
    { key: 'w_direct_outsource', label: 'Thuê ngoài',        type: 'data', dept: 'workshop', field: 'direct_outsource', indent: 2 },

    { key: 'grp_kd_direct', label: 'B. Chi phí trực tiếp KD', type: 'group' },
    { key: 'kd_labor_salary',   label: 'Lương sale',                 type: 'data', dept: 'kd', field: 'labor_salary',       indent: 2 },
    { key: 'kd_labor_ins',      label: 'BHXH / BHYT',                type: 'data', dept: 'kd', field: 'labor_insurance',    indent: 2 },
    { key: 'kd_labor_bonus',    label: 'Thưởng & phúc lợi',          type: 'data', dept: 'kd', field: 'labor_bonus',        indent: 2 },
    { key: 'kd_direct_design',  label: 'Trả phòng Thiết kế',         type: 'data', dept: 'kd', field: 'direct_design_dept', indent: 2 },
    { key: 'kd_direct_factory', label: 'Trả xưởng sản xuất (KD)',    type: 'elim', dept: 'kd', field: 'direct_factory',     indent: 2, elimNote: 'Loại trừ nội bộ' },
    { key: 'kd_direct_other',   label: 'Chi phí đặt hàng khác',      type: 'data', dept: 'kd', field: 'direct_order_other', indent: 2 },
    { key: 'kd_direct_contr',   label: 'Chi A, dẫn việc',            type: 'data', dept: 'kd', field: 'direct_contractor',  indent: 2 },
    { key: 'kd_direct_ent',     label: 'Tiếp khách & chi khác',      type: 'data', dept: 'kd', field: 'direct_entertain',   indent: 2 },
    { key: 'kd_direct_sup',     label: 'Văn phòng phẩm',             type: 'data', dept: 'kd', field: 'direct_supplies',    indent: 2 },
    { key: 'kd_company_fee',    label: 'Chi phí % nộp Công ty',      type: 'data', dept: 'kd', field: 'company_fee',        indent: 2 },

    { key: 'total_direct', label: 'TỔNG CHI PHÍ TRỰC TIẾP HỢP NHẤT', type: 'total_direct' },
    { key: 'gross_profit', label: 'LỢI NHUẬN GỘP', type: 'profit_gross' },

    { key: 'sec_indirect', label: 'III. CHI PHÍ GIÁN TIẾP', type: 'section' },
    { key: 'grp_w_indirect', label: 'A. Chi phí gián tiếp xưởng', type: 'group' },
    { key: 'w_indirect_elec',  label: 'Điện nước',    type: 'data', dept: 'workshop', field: 'indirect_electric',     indent: 2 },
    { key: 'w_indirect_equip', label: 'Thiết bị',     type: 'data', dept: 'workshop', field: 'indirect_equipment',    indent: 2 },
    { key: 'w_indirect_dep',   label: 'Khấu hao',     type: 'data', dept: 'workshop', field: 'indirect_depreciation', indent: 2 },
    { key: 'w_indirect_other', label: 'Khác',          type: 'data', dept: 'workshop', field: 'indirect_other',        indent: 2 },

    { key: 'grp_kd_indirect', label: 'B. Chi phí gián tiếp KD', type: 'group' },
    { key: 'kd_mgmt_salary',    label: 'Lương nhân viên quản lý', type: 'data', dept: 'kd', field: 'mgmt_salary',          indent: 2 },
    { key: 'kd_mgmt_bonus',     label: 'Thưởng doanh số',         type: 'data', dept: 'kd', field: 'mgmt_bonus',           indent: 2 },
    { key: 'kd_indirect_mkt',   label: 'Marketing',               type: 'data', dept: 'kd', field: 'indirect_marketing',   indent: 2 },
    { key: 'kd_indirect_gen',   label: 'Chi phí chung',           type: 'data', dept: 'kd', field: 'indirect_general',     indent: 2 },
    { key: 'kd_indirect_equip', label: 'Máy móc, thiết bị',       type: 'data', dept: 'kd', field: 'indirect_equipment',   indent: 2 },
    { key: 'kd_indirect_renov', label: 'Sửa chữa showroom',       type: 'data', dept: 'kd', field: 'indirect_renovation',  indent: 2 },
    { key: 'kd_indirect_dep',   label: 'Khấu hao',                type: 'data', dept: 'kd', field: 'indirect_depreciation',indent: 2 },
    { key: 'kd_indirect_other', label: 'Chi phí khác',            type: 'data', dept: 'kd', field: 'indirect_other',       indent: 2 },

    { key: 'total_indirect', label: 'TỔNG CHI PHÍ GIÁN TIẾP HỢP NHẤT', type: 'total_indirect' },
    { key: 'net_profit',     label: 'LỢI NHUẬN DÒNG',                   type: 'profit_net' },
];

function getVal(row, mData) {
    if (!mData) return { w: 0, kd: 0, elim: 0, cons: 0 };
    const { workshop: w, kd, elimination: elim, consolidated: cons } = mData;

    switch (row.type) {
        case 'data':
            return {
                w:    row.dept === 'workshop' ? (w[row.field] || 0) : 0,
                kd:   row.dept === 'kd'       ? (kd[row.field] || 0) : 0,
                elim: 0,
                cons: (row.dept === 'workshop' ? (w[row.field] || 0) : (kd[row.field] || 0)),
            };
        case 'elim':
            return {
                w:    row.dept === 'workshop' ? (w[row.field] || 0) : 0,
                kd:   row.dept === 'kd'       ? (kd[row.field] || 0) : 0,
                elim: row.dept === 'workshop' ? (elim.revenue || 0) : (elim.cost || 0),
                cons: 0,
            };
        case 'total_rev':
            return { w: w.total_rev, kd: kd.total_rev, elim: -(elim.revenue || 0), cons: cons.total_rev };
        case 'total_direct':
            return { w: w.total_direct, kd: kd.total_direct, elim: -(elim.cost || 0), cons: cons.total_direct };
        case 'total_indirect':
            return { w: w.total_indirect, kd: kd.total_indirect, elim: 0, cons: cons.total_indirect };
        case 'profit_gross':
            return { w: w.gross_profit, kd: kd.gross_profit, elim: 0, cons: cons.gross_profit };
        case 'profit_net':
            return { w: w.net_profit, kd: kd.net_profit, elim: 0, cons: cons.net_profit };
        default:
            return { w: 0, kd: 0, elim: 0, cons: 0 };
    }
}

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ values, color = '#3b82f6' }) {
    const max = Math.max(...values.map(Math.abs), 1);
    const W = 200, H = 36;
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v / max) * (H - 4) + 2);
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg width={W} height={H} style={{ display: 'block' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} />
            {values.map((v, i) => (
                <circle key={i} cx={(i / (values.length - 1)) * W} cy={H - ((v / max) * (H - 4) + 2)}
                    r={2} fill={v < 0 ? '#ef4444' : color} />
            ))}
        </svg>
    );
}

export default function TongHopPage() {
    const { data: session } = useSession();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [loading, setLoading] = useState(true);
    const [months, setMonths] = useState({});
    const [yearTotal, setYearTotal] = useState(null);
    const [viewMonth, setViewMonth] = useState(null); // null = cả năm

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/finance/consolidated?year=${year}`);
            const json = await res.json();
            setMonths(json.months || {});
            setYearTotal(json.yearTotal || null);
        } catch (_) {}
        setLoading(false);
    }, [year]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── KPI từ yearTotal ──────────────────────────────────────────────────────
    const cons = yearTotal?.consolidated || {};
    const grossPct = cons.total_rev > 0 ? (cons.gross_profit / cons.total_rev * 100) : 0;
    const netPct   = cons.total_rev > 0 ? (cons.net_profit   / cons.total_rev * 100) : 0;

    // Dữ liệu theo tháng cho sparkline
    const mData = (key) => MONTHS.map(m => months[m]?.consolidated?.[key] || 0);

    // Dữ liệu đang hiển thị (tháng hoặc cả năm)
    const activeData = viewMonth ? months[viewMonth] : null;
    const displayYearTotal = yearTotal ? {
        workshop: yearTotal.workshop,
        kd: yearTotal.kd,
        elimination: yearTotal.elimination,
        consolidated: yearTotal.consolidated,
    } : null;

    const rowStyle = (type) => {
        switch (type) {
            case 'section':      return { bg: '#1e3a5f', color: '#fff',    fw: 700, fs: 13 };
            case 'group':        return { bg: '#dbeafe', color: '#1e40af', fw: 600, fs: 12 };
            case 'total_rev':
            case 'total_direct':
            case 'total_indirect': return { bg: '#f0fdf4', color: '#166534', fw: 700, fs: 13 };
            case 'profit_gross':
            case 'profit_net':   return { bg: '#fef3c7', color: '#92400e', fw: 800, fs: 13 };
            case 'elim':         return { bg: '#fff7ed', color: '#c2410c', fw: 400, fs: 11 };
            default:             return { bg: 'transparent', color: 'var(--text-primary)', fw: 400, fs: 12 };
        }
    };

    return (
        <div style={{ padding: 16, minHeight: '100vh', background: 'var(--bg-primary)' }}>

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Báo Cáo Tổng Hợp 2 Phòng</h1>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Phòng Kế Toán — Xưởng & Kinh Doanh hợp nhất
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{ minWidth: 110 }}>
                        {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={fetchData} disabled={loading}>
                        {loading ? '⏳' : '↻'} Tải lại
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: 80, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
            ) : (
                <>
                    {/* ── KPI CARDS ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 12, marginBottom: 16 }}>
                        {[
                            { label: 'Doanh thu hợp nhất', value: cons.total_rev,      bg: '#dbeafe', color: '#1e40af', sub: `Cả năm ${year}` },
                            { label: 'Chi phí trực tiếp',  value: cons.total_direct,   bg: '#fef3c7', color: '#92400e', sub: pct(cons.total_direct, cons.total_rev) + ' DT' },
                            { label: 'Lợi nhuận gộp',      value: cons.gross_profit,   bg: cons.gross_profit >= 0 ? '#dcfce7' : '#fee2e2', color: cons.gross_profit >= 0 ? '#166534' : '#991b1b', sub: 'Biên: ' + grossPct.toFixed(1) + '%' },
                            { label: 'Chi phí gián tiếp',  value: cons.total_indirect, bg: '#f3e8ff', color: '#6b21a8', sub: pct(cons.total_indirect, cons.total_rev) + ' DT' },
                            { label: 'Lợi nhuận dòng',     value: cons.net_profit,     bg: cons.net_profit >= 0 ? '#d1fae5' : '#fee2e2', color: cons.net_profit >= 0 ? '#065f46' : '#991b1b', sub: 'Biên: ' + netPct.toFixed(1) + '%' },
                        ].map(k => (
                            <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: '12px 14px', border: `1px solid ${k.color}20` }}>
                                <div style={{ fontSize: 10, color: k.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
                                <div style={{ fontSize: 17, fontWeight: 800, color: k.color }}>{fmtVnd(k.value)}</div>
                                <div style={{ fontSize: 10, color: k.color, opacity: 0.7, marginTop: 4 }}>{k.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── BẢNG TÓM TẮT THEO THÁNG ── */}
                    <div style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, overflowX: 'auto' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Tổng hợp theo tháng — Năm {year}</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 900 }}>
                            <thead>
                                <tr style={{ background: '#f9fafb', borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, minWidth: 140 }}>Chỉ tiêu</th>
                                    {MONTHS.map(m => (
                                        <th key={m} style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, minWidth: 68 }}>T{m}</th>
                                    ))}
                                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#1e40af', fontWeight: 700, minWidth: 90 }}>Cả năm</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { key: 'total_rev',      label: 'Doanh thu',   color: '#1e40af', bg: '#f0f7ff' },
                                    { key: 'total_direct',   label: 'CP trực tiếp',color: '#92400e', bg: '#fffbeb' },
                                    { key: 'gross_profit',   label: 'LN gộp',      color: '#166534', bg: '#f0fdf4', bold: true },
                                    { key: 'total_indirect', label: 'CP gián tiếp',color: '#6b21a8', bg: '#faf5ff' },
                                    { key: 'net_profit',     label: 'LN dòng',     color: '#065f46', bg: '#d1fae5', bold: true },
                                ].map(row => {
                                    const rowYearVal = cons[row.key] || 0;
                                    return (
                                        <tr key={row.key} style={{ background: row.bg, borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '5px 8px', fontWeight: row.bold ? 700 : 500, color: row.color, whiteSpace: 'nowrap' }}>{row.label}</td>
                                            {MONTHS.map(m => {
                                                const v = months[m]?.consolidated?.[row.key] || 0;
                                                return (
                                                    <td key={m} style={{ padding: '5px 4px', textAlign: 'right', fontWeight: row.bold ? 700 : 400, color: v < 0 ? '#dc2626' : row.color }}>
                                                        {v === 0 ? <span style={{ color: '#d1d5db' }}>—</span> : fmtVnd(v)}
                                                    </td>
                                                );
                                            })}
                                            <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: rowYearVal < 0 ? '#dc2626' : row.color, borderLeft: '2px solid var(--border)' }}>
                                                {rowYearVal === 0 ? '—' : fmtVnd(rowYearVal)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── SO SÁNH 2 PHÒNG ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Doanh thu', wKey: 'total_rev',    kdKey: 'total_rev',    color: '#3b82f6' },
                            { label: 'Lợi nhuận dòng', wKey: 'net_profit', kdKey: 'net_profit', color: '#10b981' },
                        ].map(chart => {
                            const wVals  = MONTHS.map(m => months[m]?.workshop?.[chart.wKey]  || 0);
                            const kdVals = MONTHS.map(m => months[m]?.kd?.[chart.kdKey] || 0);
                            const wTotal  = yearTotal?.workshop?.[chart.wKey]  || 0;
                            const kdTotal = yearTotal?.kd?.[chart.kdKey] || 0;
                            return (
                                <div key={chart.label} style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: 'var(--text-primary)' }}>{chart.label} — So sánh 2 phòng</div>
                                    <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Xưởng</div>
                                            <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>{fmtVnd(wTotal)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Kinh doanh</div>
                                            <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 14 }}>{fmtVnd(kdTotal)}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 9, color: '#92400e', marginBottom: 2 }}>Xưởng</div>
                                            <Sparkline values={wVals} color="#f97316" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 9, color: '#1e40af', marginBottom: 2 }}>KD</div>
                                            <Sparkline values={kdVals} color="#3b82f6" />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 9, color: 'var(--text-muted)' }}>
                                        {MONTHS.map(m => <span key={m} style={{ flex: 1, textAlign: 'center' }}>T{m}</span>)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── BẢNG CHI TIẾT 4 CỘT ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Bảng chi tiết hợp nhất</h2>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 10, height: 10, background: '#fef3c7', border: '1px solid #f97316', borderRadius: 2, display: 'inline-block' }} />
                                Dòng loại trừ nội bộ
                            </span>
                            <span>4 cột: Xưởng | KD | Loại trừ | Hợp nhất</span>
                        </div>
                    </div>

                    {/* Month tabs */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                        <button onClick={() => setViewMonth(null)} style={{
                            padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: viewMonth === null ? 700 : 500,
                            border: '1px solid', cursor: 'pointer',
                            borderColor: viewMonth === null ? '#1e40af' : 'var(--border)',
                            background: viewMonth === null ? '#1e40af' : 'var(--bg-card, #fff)',
                            color: viewMonth === null ? '#fff' : 'var(--text-muted)',
                        }}>Cả năm</button>
                        {MONTHS.map(m => {
                            const hasData = (months[m]?.consolidated?.total_rev || 0) > 0 || (months[m]?.consolidated?.total_direct || 0) > 0;
                            return (
                                <button key={m} onClick={() => setViewMonth(m)} style={{
                                    padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: viewMonth === m ? 700 : 500,
                                    border: '1px solid', cursor: 'pointer',
                                    borderColor: viewMonth === m ? '#1e40af' : (hasData ? '#93c5fd' : 'var(--border)'),
                                    background: viewMonth === m ? '#1e40af' : (hasData ? '#eff6ff' : 'var(--bg-card, #fff)'),
                                    color: viewMonth === m ? '#fff' : (hasData ? '#1e40af' : 'var(--text-muted)'),
                                }}>T{m}</button>
                            );
                        })}
                    </div>

                    <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 20 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                            <thead>
                                <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                                    <th style={{ padding: '10px 14px', textAlign: 'left', minWidth: 260, fontWeight: 700, fontSize: 13, position: 'sticky', left: 0, background: '#1e3a5f', zIndex: 2 }}>
                                        Chỉ tiêu {viewMonth ? `— Tháng ${viewMonth}/${year}` : `— Cả năm ${year}`}
                                    </th>
                                    <th style={{ padding: '10px 10px', textAlign: 'right', minWidth: 120, fontWeight: 600, fontSize: 12, background: '#1a5276' }}>Xưởng</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'right', minWidth: 120, fontWeight: 600, fontSize: 12, background: '#154360' }}>Kinh doanh</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'right', minWidth: 110, fontWeight: 600, fontSize: 12, background: '#7e5109', color: '#fde68a' }}>Loại trừ</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'right', minWidth: 130, fontWeight: 700, fontSize: 13, background: '#0d5e3f' }}>Hợp nhất</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ROW_DEFS.map(def => {
                                    const rs = rowStyle(def.type);
                                    const isNonData = ['section', 'group'].includes(def.type);
                                    const srcData = viewMonth ? months[viewMonth] : displayYearTotal;
                                    const vals = isNonData ? null : getVal(def, srcData);
                                    const isNeg = (v) => v < 0;

                                    return (
                                        <tr key={def.key} style={{ borderBottom: '1px solid #e5e7eb', background: rs.bg }}>
                                            <td style={{
                                                padding: `8px 10px 8px ${10 + (def.indent || 0) * 14}px`,
                                                fontWeight: rs.fw, fontSize: rs.fs, color: rs.color,
                                                background: rs.bg, position: 'sticky', left: 0, zIndex: 1,
                                                borderRight: '1px solid #e5e7eb',
                                                whiteSpace: 'nowrap', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis',
                                            }}>
                                                {def.label}
                                                {def.elimNote && (
                                                    <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', background: '#fed7aa', color: '#c2410c', borderRadius: 4, fontWeight: 600 }}>
                                                        {def.elimNote}
                                                    </span>
                                                )}
                                            </td>
                                            {isNonData ? (
                                                <td colSpan={4} style={{ background: rs.bg }} />
                                            ) : (
                                                <>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: rs.fs, fontWeight: rs.fw, color: isNeg(vals.w) ? '#dc2626' : (rs.color || '#374151'), borderRight: '1px solid #f0f0f0' }}>
                                                        {vals.w === 0 ? <span style={{ color: '#d1d5db' }}>—</span> : fmtFull(vals.w)}
                                                    </td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: rs.fs, fontWeight: rs.fw, color: isNeg(vals.kd) ? '#dc2626' : (rs.color || '#374151'), borderRight: '1px solid #f0f0f0' }}>
                                                        {vals.kd === 0 ? <span style={{ color: '#d1d5db' }}>—</span> : fmtFull(vals.kd)}
                                                    </td>
                                                    <td style={{ padding: '7px 10px', textAlign: 'right', fontSize: 11, fontWeight: 600, color: vals.elim !== 0 ? '#c2410c' : '#d1d5db', background: vals.elim !== 0 ? '#fff7ed' : 'transparent', borderRight: '1px solid #f0f0f0' }}>
                                                        {vals.elim === 0 ? '—' : `(${fmtFull(Math.abs(vals.elim))})`}
                                                    </td>
                                                    <td style={{ padding: '7px 12px', textAlign: 'right', fontSize: rs.fs, fontWeight: 700, color: isNeg(vals.cons) ? '#dc2626' : (rs.color || '#065f46'), background: rs.bg || '#f9fafb', borderLeft: '2px solid #e5e7eb' }}>
                                                        {vals.cons === 0 ? <span style={{ color: '#d1d5db' }}>—</span> : fmtFull(vals.cons)}
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Ghi chú loại trừ */}
                    <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 11, color: '#92400e', marginBottom: 16 }}>
                        <strong>Lưu ý loại trừ nội bộ:</strong> Doanh thu nội bộ xưởng (thu từ KD) và chi phí &quot;Trả xưởng sản xuất&quot; của KD là <em>cùng 1 giao dịch</em> nhìn từ 2 phía.
                        Khi hợp nhất, cả 2 dòng này được loại trừ để tránh tính trùng. Số liệu cột &quot;Hợp nhất&quot; phản ánh doanh thu &amp; chi phí thực với khách hàng bên ngoài.
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                        Đơn vị: VNĐ &nbsp;|&nbsp; Năm {year} &nbsp;|&nbsp; Dữ liệu từ P&L Xưởng + Tổng hợp Chi phí KD
                    </div>
                </>
            )}
        </div>
    );
}
