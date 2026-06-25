'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };
const STAGES = [
    { key:'Tư vấn', color:'#3b82f6' },
    { key:'Báo giá', color:'#8b5cf6' },
    { key:'Ký HĐ', color:'#10b981' },
    { key:'Thi công', color:'#f59e0b' },
    { key:'Hoàn thành', color:'#64748b' },
];

function fmt(n) { if (!n) return '0'; if (n>=1e9) return (n/1e9).toFixed(1)+' tỷ'; if (n>=1e6) return (n/1e6).toFixed(1)+' tr'; return n.toLocaleString('vi-VN'); }

function StatCard({ label, value, sub, icon, color }) {
    return (
        <div style={{ background:C.white, borderRadius:14, padding:'18px 22px', border:`1px solid ${C.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:13, background:`${color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{icon}</div>
            <div>
                <div style={{ fontSize:22, fontWeight:800, color:C.text }}>{value}</div>
                <div style={{ fontSize:12, color:C.gray, marginTop:2 }}>{label}</div>
                {sub && <div style={{ fontSize:11, color, fontWeight:600, marginTop:2 }}>{sub}</div>}
            </div>
        </div>
    );
}

export default function LcReports() {
    const [data, setData] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [dashRes, custRes] = await Promise.all([
                fetch('/api/laocai/dashboard'),
                fetch('/api/laocai/customers'),
            ]);
            if (dashRes.ok) setData(await dashRes.json());
            if (custRes.ok) { const d = await custRes.json(); setCustomers(d.customers||[]); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const stats = data?.stats || {};
    const pipelineMap = {};
    (data?.pipelineGroups || []).forEach(g => { pipelineMap[g.pipelineStage] = g._count; });

    const topByValue = [...customers]
        .filter(c => c.estimatedValue > 0)
        .sort((a,b) => b.estimatedValue - a.estimatedValue)
        .slice(0, 8);

    const stageData = STAGES.map(s => ({
        ...s,
        count: pipelineMap[s.key] || 0,
        value: customers.filter(c=>c.pipelineStage===s.key).reduce((a,c)=>a+(c.estimatedValue||0),0),
    }));
    const maxStageCount = Math.max(1, ...stageData.map(s=>s.count));

    return (
        <LcShell title="Báo Cáo">
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:18 }}>
                <button onClick={load} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:C.white, fontSize:12, color:C.gray, cursor:'pointer' }}>↻ Tải lại</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:20 }}>
                <StatCard label="Tổng khách hàng LC" value={loading?'…':stats.totalCustomers??0} sub={`+${stats.newCustomersThisMonth||0} tháng này`} icon="👥" color={C.primary} />
                <StatCard label="Báo giá năm nay" value={loading?'…':stats.totalQuotations??0} sub={fmt(stats.quotationValue||0)+' đ'} icon="📋" color="#7c3aed" />
                <StatCard label="Hợp đồng năm nay" value={loading?'…':stats.totalContracts??0} sub={fmt(stats.contractValue||0)+' đ'} icon="📝" color="#0369a1" />
                <StatCard label="Tiềm năng pipeline" value={loading?'…':fmt(customers.reduce((a,c)=>a+(c.estimatedValue||0),0))} sub="Tổng giá trị ước tính" icon="💰" color="#d97706" />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
                <div style={{ background:C.white, borderRadius:14, padding:22, border:`1px solid ${C.border}` }}>
                    <h2 style={{ margin:'0 0 18px', fontSize:14, fontWeight:700, color:C.text }}>Pipeline khách hàng</h2>
                    {loading ? [1,2,3,4,5].map(i=><div key={i} style={{ height:36, background:'#e2e8f0', borderRadius:8, marginBottom:10 }}/>) :
                    stageData.every(s=>s.count===0) ? (
                        <div style={{ textAlign:'center', color:C.textMuted, fontSize:13, padding:'30px 0' }}>Chưa có dữ liệu</div>
                    ) : stageData.map(s=>(
                        <div key={s.key} style={{ marginBottom:12 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, alignItems:'center' }}>
                                <span style={{ fontSize:12, color:C.text, fontWeight:500 }}>{s.key}</span>
                                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                                    {s.value>0 && <span style={{ fontSize:11, color:s.color, fontWeight:600 }}>{fmt(s.value)}</span>}
                                    <span style={{ fontSize:12, fontWeight:700, color:s.color, minWidth:20, textAlign:'right' }}>{s.count}</span>
                                </div>
                            </div>
                            <div style={{ height:8, background:'#f1f5f9', borderRadius:4, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${Math.round((s.count/maxStageCount)*100)}%`, background:s.color, borderRadius:4, transition:'width 0.6s' }} />
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ background:C.white, borderRadius:14, padding:22, border:`1px solid ${C.border}` }}>
                    <h2 style={{ margin:'0 0 18px', fontSize:14, fontWeight:700, color:C.text }}>Top khách hàng tiềm năng</h2>
                    {loading ? [1,2,3,4].map(i=><div key={i} style={{ height:44, background:'#e2e8f0', borderRadius:9, marginBottom:8 }}/>) :
                    topByValue.length===0 ? (
                        <div style={{ textAlign:'center', color:C.textMuted, fontSize:13, padding:'30px 0' }}>Chưa có dữ liệu giá trị ước tính</div>
                    ) : topByValue.map((c, i)=>(
                        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'9px 12px', borderRadius:10, background:i===0?'#f0fdfa':'#fafafa', border:`1px solid ${i===0?C.primary+'33':C.border}` }}>
                            <div style={{ width:26, height:26, borderRadius:8, background:i===0?C.primary:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', color:i===0?'#fff':C.gray, fontWeight:700, fontSize:12, flexShrink:0 }}>{i+1}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</div>
                                <div style={{ fontSize:11, color:C.textMuted }}>{c.pipelineStage||'—'} • {c.salesPerson||'—'}</div>
                            </div>
                            <div style={{ fontSize:13, fontWeight:700, color:C.primary, flexShrink:0 }}>{fmt(c.estimatedValue)}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ background:C.white, borderRadius:14, padding:22, border:`1px solid ${C.border}` }}>
                <h2 style={{ margin:'0 0 16px', fontSize:14, fontWeight:700, color:C.text }}>Tóm tắt chuyển đổi</h2>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
                    {[
                        { label:'Lead → Tư vấn', from:'Lead', to:'Tư vấn', color:'#3b82f6' },
                        { label:'Tư vấn → Báo giá', from:'Tư vấn', to:'Báo giá', color:'#8b5cf6' },
                        { label:'Báo giá → Ký HĐ', from:'Báo giá', to:'Ký HĐ', color:'#10b981' },
                        { label:'Ký HĐ → Hoàn thành', from:'Ký HĐ', to:'Hoàn thành', color:'#64748b' },
                    ].map(step => {
                        const fromCount = pipelineMap[step.from] || 0;
                        const toCount = pipelineMap[step.to] || 0;
                        const rate = fromCount > 0 ? Math.round((toCount/fromCount)*100) : 0;
                        return (
                            <div key={step.label} style={{ padding:'12px 16px', borderRadius:10, background:'#f8fafc', border:`1px solid ${C.border}` }}>
                                <div style={{ fontSize:11, color:C.textMuted, marginBottom:4 }}>{step.label}</div>
                                <div style={{ fontSize:20, fontWeight:800, color:step.color }}>{loading?'…':rate}%</div>
                                <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>{loading?'…':`${fromCount} → ${toCount}`}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </LcShell>
    );
}
