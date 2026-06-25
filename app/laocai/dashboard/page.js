'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = {
    primary: '#0f766e', white: '#ffffff', gray: '#64748b',
    grayLight: '#f8fafc', border: '#e2e8f0', text: '#1e293b', textMuted: '#94a3b8',
};

const PIPELINE_ORDER = [
    { label: 'Khách chăm sóc',  color: '#3b82f6' },
    { label: 'Khách ưu tiên',   color: '#f59e0b' },
    { label: 'Khách hợp đồng',  color: '#10b981' },
    { label: 'Khách hoàn thành',color: '#64748b' },
];

function fmt(num) {
    if (!num) return '0';
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + ' tỷ';
    if (num >= 1_000_000) return Math.round(num / 1_000_000) + ' tr';
    return num.toLocaleString('vi-VN');
}
function fmtDate(d) { if (!d) return ''; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}`; }
function fmtDateFull(d) { if (!d) return ''; const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; }

function KpiCard({ label, value, sub, icon, color, loading }) {
    return (
        <div style={{ background: C.white, borderRadius: 14, padding: '18px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 13, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{icon}</div>
            <div>
                {loading ? <div style={{ width: 56, height: 26, background: '#e2e8f0', borderRadius: 6, marginBottom: 5 }} /> : <div style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>}
                <div style={{ fontSize: 12, color: C.gray, marginTop: 3 }}>{label}</div>
                {loading ? <div style={{ width: 76, height: 13, background: '#e2e8f0', borderRadius: 4, marginTop: 4 }} /> : <div style={{ fontSize: 11, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
            </div>
        </div>
    );
}

function PipelineBar({ label, count, color, pct }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, width: 120, flexShrink: 0 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 12, color: C.text }}>{label}</span>
            </div>
            <div style={{ flex: 1, height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color, width: 20, textAlign: 'right', flexShrink: 0 }}>{count}</span>
        </div>
    );
}

const PIPELINE_COLOR = Object.fromEntries(PIPELINE_ORDER.map(p => [p.label, p.color]));

export default function LaoCaiDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/laocai/dashboard');
            if (res.ok) setData(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const stats = data?.stats;

    const pipelineMap = {};
    (data?.pipelineGroups || []).forEach(g => { pipelineMap[g.pipelineStage] = g._count; });
    const maxPipeline = Math.max(1, ...Object.values(pipelineMap));
    const pipelineBars = PIPELINE_ORDER
        .map(p => ({ ...p, count: pipelineMap[p.label] || 0, pct: Math.round(((pipelineMap[p.label] || 0) / maxPipeline) * 100) }))
        .filter(p => p.count > 0);

    const kpis = [
        { label: 'Tổng khách hàng', value: stats ? String(stats.totalCustomers) : '0', sub: `+${stats?.newCustomersThisMonth||0} tháng này`, icon: '👥', color: C.primary },
        { label: 'Báo giá (năm)',    value: stats ? String(stats.totalQuotations) : '0', sub: fmt(stats?.quotationValue||0) + ' VNĐ', icon: '📋', color: '#7c3aed' },
        { label: 'Hợp đồng (năm)',  value: stats ? String(stats.totalContracts) : '0',  sub: fmt(stats?.contractValue||0) + ' VNĐ', icon: '📝', color: '#0369a1' },
        { label: 'Follow-up sắp tới', value: String(data?.upcomingFollowUps?.length||0), sub: '7 ngày tới', icon: '🔔', color: '#b45309' },
    ];

    return (
        <LcShell title="Dashboard Kinh Doanh">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={fetchData} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, fontSize: 12, color: C.gray, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>↻ Tải lại</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
                {kpis.map(k => <KpiCard key={k.label} {...k} loading={loading} />)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div style={{ background: C.white, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.text }}>Pipeline khách hàng</h2>
                    {loading ? [1,2,3,4].map(i => <div key={i} style={{ height: 18, background: '#e2e8f0', borderRadius: 5, marginBottom: 12 }} />) :
                        pipelineBars.length > 0 ? pipelineBars.map(p => <PipelineBar key={p.label} {...p} />) :
                        <p style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Chưa có dữ liệu pipeline</p>}
                </div>

                <div style={{ background: C.white, borderRadius: 14, padding: 22, border: `1px solid ${C.border}` }}>
                    <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: C.text }}>Follow-up sắp tới</h2>
                    {loading ? [1,2,3].map(i => <div key={i} style={{ height: 52, background: '#e2e8f0', borderRadius: 9, marginBottom: 9 }} />) :
                        (data?.upcomingFollowUps||[]).length > 0
                        ? (data.upcomingFollowUps).map((f, i) => (
                            <div key={f.id} style={{ display: 'flex', gap: 10, marginBottom: 9, padding: 11, borderRadius: 9, background: i===0?'#fff7ed':'#f8fafc', border: `1px solid ${i===0?'#fed7aa':C.border}` }}>
                                <div style={{ width: 33, height: 33, borderRadius: 9, background: i===0?'#f97316':C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{f.name[0]}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{f.name}</div>
                                    <div style={{ fontSize: 11, color: C.gray }}>{f.pipelineStage} • {f.salesPerson||'—'}</div>
                                </div>
                                <div style={{ fontSize: 11, color: i===0?'#f97316':C.gray, fontWeight: 600, flexShrink: 0 }}>{fmtDate(f.nextFollowUp)}</div>
                            </div>
                        ))
                        : <p style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Không có follow-up sắp tới ✓</p>}
                </div>
            </div>

            <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>Khách hàng mới nhất</h2>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{data?.recentCustomers?.length||0} gần nhất</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                {['Mã KH','Khách hàng','SĐT','Pipeline','Sales','Giá trị','Ngày tạo'].map(h => (
                                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.gray, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [1,2,3,4,5].map(i => (
                                <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                                    {[1,2,3,4,5,6,7].map(j => <td key={j} style={{ padding: '11px 14px' }}><div style={{ height: 13, background: '#e2e8f0', borderRadius: 4 }} /></td>)}
                                </tr>
                            )) : (data?.recentCustomers||[]).length > 0 ? (data.recentCustomers).map((c, i) => (
                                <tr key={c.id} style={{ borderTop: `1px solid ${C.border}`, background: i%2===0?C.white:'#fafafa' }}
                                    onMouseEnter={e => e.currentTarget.style.background='#f0fdfa'}
                                    onMouseLeave={e => e.currentTarget.style.background=i%2===0?C.white:'#fafafa'}>
                                    <td style={{ padding: '11px 14px', fontSize: 11, color: C.primary, fontWeight: 700 }}>{c.code}</td>
                                    <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</td>
                                    <td style={{ padding: '11px 14px', fontSize: 12, color: C.gray }}>{c.phone}</td>
                                    <td style={{ padding: '11px 14px' }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: `${PIPELINE_COLOR[c.pipelineStage]||C.primary}18`, color: PIPELINE_COLOR[c.pipelineStage]||C.primary }}>{c.pipelineStage||'—'}</span>
                                    </td>
                                    <td style={{ padding: '11px 14px', fontSize: 12, color: C.gray }}>{c.salesPerson||'—'}</td>
                                    <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: C.text }}>{c.estimatedValue ? fmt(c.estimatedValue) : '—'}</td>
                                    <td style={{ padding: '11px 14px', fontSize: 11, color: C.textMuted }}>{fmtDateFull(c.createdAt)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                                    Chưa có khách hàng nào thuộc chi nhánh Lào Cai.<br/>
                                    <span style={{ fontSize: 12, color: C.primary }}>Thêm khách hàng mới và chọn Chi nhánh = Lào Cai để bắt đầu.</span>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </LcShell>
    );
}
