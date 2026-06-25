'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };
const STAGES = [
    { key:'Khách chăm sóc',  color:'#3b82f6', bg:'#eff6ff' },
    { key:'Khách ưu tiên',   color:'#f59e0b', bg:'#fffbeb' },
    { key:'Khách hợp đồng',  color:'#10b981', bg:'#ecfdf5' },
    { key:'Khách hoàn thành',color:'#64748b', bg:'#f8fafc' },
];

function fmt(n) { if (!n) return ''; if (n>=1e9) return (n/1e9).toFixed(1)+'tỷ'; if (n>=1e6) return Math.round(n/1e6)+'tr'; return n.toLocaleString('vi-VN'); }

export default function LcPipeline() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [editStage, setEditStage] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editFollowUp, setEditFollowUp] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/laocai/customers');
            if (res.ok) { const d = await res.json(); setCustomers(d.customers||[]); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    function openCard(c) {
        setSelected(c);
        setEditStage(c.pipelineStage||'Khách chăm sóc');
        setEditNotes(c.notes||'');
        setEditFollowUp(c.nextFollowUp?new Date(c.nextFollowUp).toISOString().split('T')[0]:'');
    }

    async function saveCard() {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/laocai/customers/${selected.id}`, {
                method:'PUT', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ pipelineStage:editStage, notes:editNotes, nextFollowUp:editFollowUp||null }),
            });
            if (res.ok) { setSelected(null); load(); }
        } finally { setSaving(false); }
    }

    return (
        <LcShell title="Pipeline Khách Hàng">
            {/* Summary */}
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
                {STAGES.map(s => {
                    const cnt = customers.filter(c=>c.pipelineStage===s.key).length;
                    const val = customers.filter(c=>c.pipelineStage===s.key).reduce((a,c)=>a+(c.estimatedValue||0),0);
                    return (
                        <div key={s.key} style={{ flex:'1 1 120px', padding:'11px 14px', borderRadius:12, background:s.bg, border:`1px solid ${s.color}33` }}>
                            <div style={{ fontSize:11, color:s.color, fontWeight:700 }}>{s.key}</div>
                            <div style={{ fontSize:20, fontWeight:800, color:C.text, marginTop:3 }}>{cnt}</div>
                            {val>0 && <div style={{ fontSize:11, color:s.color, marginTop:2 }}>{fmt(val)}</div>}
                        </div>
                    );
                })}
            </div>

            {/* Kanban */}
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${STAGES.length}, minmax(200px, 1fr))`, gap:12, overflowX:'auto' }}>
                {STAGES.map(stage => {
                    const cards = customers.filter(c=>c.pipelineStage===stage.key);
                    return (
                        <div key={stage.key} style={{ minWidth:190 }}>
                            <div style={{ padding:'9px 12px', borderRadius:'10px 10px 0 0', background:stage.color, color:'#fff', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                                <span style={{ fontWeight:700, fontSize:13 }}>{stage.key}</span>
                                <span style={{ fontSize:12, background:'rgba(255,255,255,0.25)', padding:'1px 7px', borderRadius:20 }}>{cards.length}</span>
                            </div>
                            <div style={{ background:stage.bg, borderRadius:'0 0 10px 10px', padding:'8px 6px', minHeight:200, border:`1px solid ${stage.color}33`, borderTop:'none' }}>
                                {loading ? [1,2].map(i=><div key={i} style={{ height:72, background:'#e2e8f0', borderRadius:9, marginBottom:7 }}/>) :
                                cards.length===0 ? <div style={{ textAlign:'center', color:'#cbd5e1', fontSize:12, padding:'20px 0' }}>Không có</div> :
                                cards.map(c=>(
                                    <div key={c.id} onClick={()=>openCard(c)} style={{ background:C.white, borderRadius:9, padding:'10px 12px', marginBottom:7, cursor:'pointer', border:`1px solid ${C.border}`, boxShadow:'0 1px 3px rgba(0,0,0,0.05)', transition:'box-shadow 0.15s' }}
                                        onMouseEnter={e=>e.currentTarget.style.boxShadow='0 3px 10px rgba(0,0,0,0.1)'}
                                        onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'}>
                                        <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:3 }}>{c.name}</div>
                                        <div style={{ fontSize:11, color:C.gray }}>{c.phone}</div>
                                        {c.salesPerson && <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>NV: {c.salesPerson}</div>}
                                        {c.estimatedValue>0 && <div style={{ fontSize:11, color:stage.color, fontWeight:700, marginTop:4 }}>{fmt(c.estimatedValue)}</div>}
                                        {c.nextFollowUp && <div style={{ fontSize:10, color:'#f59e0b', marginTop:3 }}>📅 {new Date(c.nextFollowUp).toLocaleDateString('vi-VN')}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit modal */}
            {selected && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={()=>setSelected(null)}>
                    <div style={{ background:C.white, borderRadius:16, width:'100%', maxWidth:440 }} onClick={e=>e.stopPropagation()}>
                        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div>
                                <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>{selected.name}</h3>
                                <div style={{ fontSize:12, color:C.gray, marginTop:2 }}>{selected.phone} • {selected.code}</div>
                            </div>
                            <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.gray }}>×</button>
                        </div>
                        <div style={{ padding:'16px 20px' }}>
                            <div style={{ marginBottom:12 }}>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Chuyển giai đoạn</label>
                                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                    {STAGES.map(s=>(
                                        <button key={s.key} onClick={()=>setEditStage(s.key)} style={{ padding:'5px 12px', borderRadius:20, border:`2px solid ${editStage===s.key?s.color:C.border}`, background:editStage===s.key?s.bg:C.white, color:editStage===s.key?s.color:C.gray, fontSize:12, fontWeight:editStage===s.key?700:400, cursor:'pointer' }}>{s.key}</button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom:12 }}>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Follow-up</label>
                                <input type="date" value={editFollowUp} onChange={e=>setEditFollowUp(e.target.value)} style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Ghi chú</label>
                                <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} rows={3} style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none', resize:'vertical' }} />
                            </div>
                        </div>
                        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
                            <button onClick={()=>setSelected(null)} style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:13, cursor:'pointer' }}>Hủy</button>
                            <button onClick={saveCard} disabled={saving} style={{ padding:'8px 20px', borderRadius:9, border:'none', background:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>{saving?'Lưu...':'💾 Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}
