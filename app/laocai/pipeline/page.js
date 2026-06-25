'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', muted:'#94a3b8', bg:'#f8fafc' };

const STAGES = [
    { key:'Khách tiềm năng', color:'#2563eb', light:'#eff6ff' },
    { key:'Khách chăm sóc',  color:'#0891b2', light:'#ecfeff' },
    { key:'Khách ưu tiên',   color:'#7c3aed', light:'#f5f3ff' },
    { key:'Khách hợp đồng',  color:'#ea580c', light:'#fff7ed' },
    { key:'Khách hoàn thành',color:'#64748b', light:'#f8fafc' },
];
const STAGE_COLOR = Object.fromEntries(STAGES.map(s=>[s.key, s.color]));

function fmt(n) { if (!n) return ''; if (n>=1e9) return (n/1e9).toFixed(1)+' tỷ'; if (n>=1e6) return Math.round(n/1e6)+' tr'; return n.toLocaleString('vi-VN'); }

function PhoneBadge({ phone }) {
    return (
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:15, height:15, borderRadius:4, background:'#3b82f6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ color:'#fff', fontSize:9, lineHeight:1 }}>✆</span>
            </div>
            <span style={{ fontSize:12, color:'#475569', letterSpacing:0.2 }}>{phone}</span>
        </div>
    );
}

function KpiCard({ icon, value, label, color, lightBg }) {
    return (
        <div style={{ background:C.white, borderRadius:16, padding:'20px 22px', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:16, flex:'1 1 0', minWidth:150, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, borderRadius:'16px 16px 0 0' }} />
            <div style={{ width:50, height:50, borderRadius:14, background:lightBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{icon}</div>
            <div>
                <div style={{ fontSize:22, fontWeight:800, color:C.text, lineHeight:1.1 }}>{value}</div>
                <div style={{ fontSize:12, color:C.gray, marginTop:4, fontWeight:500 }}>{label}</div>
            </div>
        </div>
    );
}

export default function LcPipeline() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [search, setSearch]       = useState('');
    const [selected, setSelected]   = useState(null);
    const [editStage, setEditStage] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editFollowUp, setEditFollowUp] = useState('');
    const [saving, setSaving]       = useState(false);
    const [dragId, setDragId]       = useState(null);
    const [dragOverStage, setDragOverStage] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/laocai/customers');
            if (res.ok) { const d = await res.json(); setCustomers(d.customers||[]); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = search
        ? customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.code?.toLowerCase().includes(search.toLowerCase()))
        : customers;

    function openCard(c) {
        setSelected(c);
        setEditStage(c.pipelineStage || 'Khách tiềm năng');
        setEditNotes(c.notes || '');
        setEditFollowUp(c.nextFollowUp ? new Date(c.nextFollowUp).toISOString().split('T')[0] : '');
    }

    async function saveCard() {
        if (!selected) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/laocai/customers/${selected.id}`, {
                method: 'PUT', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ pipelineStage:editStage, notes:editNotes, nextFollowUp:editFollowUp||null }),
            });
            if (res.ok) { setSelected(null); load(); }
        } finally { setSaving(false); }
    }

    async function handleDrop(targetStage) {
        if (!dragId) return;
        const card = customers.find(c => c.id === dragId);
        setDragId(null); setDragOverStage(null);
        if (!card || card.pipelineStage === targetStage) return;
        setCustomers(prev => prev.map(c => c.id === dragId ? {...c, pipelineStage: targetStage} : c));
        try {
            await fetch(`/api/laocai/customers/${dragId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ pipelineStage: targetStage }) });
        } catch { load(); }
    }

    // KPI
    const totalVal   = customers.reduce((a,c)=>a+(c.estimatedValue||0),0);
    const potential  = customers.filter(c=>c.pipelineStage==='Khách tiềm năng').length;
    const contract   = customers.filter(c=>c.pipelineStage==='Khách hợp đồng').length;
    const overdue    = customers.filter(c=>c.nextFollowUp && new Date(c.nextFollowUp)<new Date()).length;

    return (
        <LcShell title="Pipeline Khách Hàng">

            {/* KPI */}
            <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
                <KpiCard icon="👥" value={loading?'…':customers.length}   label="Tổng khách hàng"  color="#0f766e" lightBg="#f0fdf4" />
                <KpiCard icon="🎯" value={loading?'…':potential}           label="Tiềm năng"        color="#2563eb" lightBg="#eff6ff" />
                <KpiCard icon="📝" value={loading?'…':contract}            label="Hợp đồng"         color="#ea580c" lightBg="#fff7ed" />
                <KpiCard icon="💎" value={loading?'…':(fmt(totalVal)||'0')} label="Tổng giá trị"    color="#7c3aed" lightBg="#f5f3ff" />
                <KpiCard icon="🔔" value={loading?'…':overdue}             label="Follow-up quá hạn" color="#dc2626" lightBg="#fef2f2" />
            </div>

            {/* Toolbar */}
            <div style={{ display:'flex', gap:10, marginBottom:18, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:220, position:'relative' }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.muted, fontSize:14, pointerEvents:'none' }}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tên, mã KH, SĐT..."
                        style={{ width:'100%', padding:'9px 12px 9px 36px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box', background:C.white }} />
                </div>
                <button onClick={load} style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, fontSize:13, color:C.gray, cursor:'pointer' }}>↻ Tải lại</button>
            </div>

            {/* Kanban */}
            <div style={{ display:'flex', gap:12, overflowX:'auto', alignItems:'flex-start', paddingBottom:8 }}>
                {STAGES.map(stage => {
                    const cards  = filtered.filter(c => c.pipelineStage === stage.key);
                    const colVal = cards.reduce((a,c) => a+(c.estimatedValue||0), 0);
                    const isOver = dragOverStage === stage.key && dragId;

                    return (
                        <div key={stage.key}
                            style={{ flex:'1 1 0', minWidth:220, maxWidth:300, display:'flex', flexDirection:'column', borderRadius:14, border:`2px solid ${isOver?stage.color:C.border}`, background:isOver?stage.light:C.bg, transition:'border-color 0.15s, background 0.15s' }}
                            onDragOver={e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; setDragOverStage(stage.key); }}
                            onDragLeave={e=>{ if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null); }}
                            onDrop={e=>{ e.preventDefault(); handleDrop(stage.key); }}>

                            {/* Header */}
                            <div style={{ padding:'12px 14px 10px', borderBottom:`1px solid ${C.border}` }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                                        <div style={{ width:10, height:10, borderRadius:'50%', background:stage.color }} />
                                        <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{stage.key}</span>
                                    </div>
                                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${stage.color}18`, color:stage.color }}>{cards.length}</span>
                                </div>
                                {colVal > 0 && (
                                    <div style={{ fontSize:12, color:stage.color, fontWeight:600, marginTop:6, paddingLeft:17 }}>{fmt(colVal)}</div>
                                )}
                            </div>

                            {/* Cards */}
                            <div style={{ flex:1, padding:'10px', display:'flex', flexDirection:'column', gap:8, minHeight:200 }}>
                                {loading ? [1,2,3].map(i=>(
                                    <div key={i} style={{ background:C.white, borderRadius:10, padding:'12px 14px', border:`1px solid ${C.border}` }}>
                                        <div style={{ height:13, background:'#e2e8f0', borderRadius:4, marginBottom:10, width:'75%' }} />
                                        <div style={{ height:11, background:'#e2e8f0', borderRadius:4, width:'55%' }} />
                                    </div>
                                )) : cards.length === 0 ? (
                                    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 14px', gap:8 }}>
                                        {isOver
                                            ? <div style={{ width:'100%', border:`2px dashed ${stage.color}`, borderRadius:10, height:64, opacity:0.5 }} />
                                            : <>
                                                <div style={{ fontSize:24, opacity:0.2 }}>📭</div>
                                                <span style={{ fontSize:12, color:C.muted }}>Chưa có</span>
                                              </>}
                                    </div>
                                ) : (
                                    <>
                                        {cards.map(c => {
                                            const isDragging = dragId === c.id;
                                            const followDiff = c.nextFollowUp ? Math.ceil((new Date(c.nextFollowUp)-new Date())/86400000) : null;
                                            const followBadge = followDiff !== null && followDiff <= 3;
                                            return (
                                                <div key={c.id}
                                                    draggable={true}
                                                    onDragStart={e=>{ setDragId(c.id); e.dataTransfer.effectAllowed='move'; }}
                                                    onDragEnd={()=>{ setDragId(null); setDragOverStage(null); }}
                                                    onClick={()=>{ if (!dragId) openCard(c); }}
                                                    style={{
                                                        background: isDragging ? '#f0fdfa' : C.white,
                                                        border: `1px solid ${isDragging ? C.primary : C.border}`,
                                                        borderRadius:10,
                                                        padding:'12px 13px',
                                                        cursor: isDragging ? 'grabbing' : 'grab',
                                                        opacity: isDragging ? 0.5 : 1,
                                                        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                                                        transition:'opacity 0.15s, box-shadow 0.15s, border-color 0.15s',
                                                        position:'relative',
                                                        userSelect:'none',
                                                    }}
                                                    onMouseEnter={e=>{ if(!isDragging){ e.currentTarget.style.boxShadow='0 3px 10px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor=stage.color; } }}
                                                    onMouseLeave={e=>{ if(!isDragging){ e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor=C.border; } }}>

                                                    {/* Follow-up badge */}
                                                    {followBadge && (
                                                        <div style={{ position:'absolute', top:10, right:10, padding:'2px 7px', borderRadius:6, background:followDiff<0?'#fef2f2':'#fffbeb', border:`1px solid ${followDiff<0?'#fecaca':'#fde68a'}`, fontSize:10, fontWeight:700, color:followDiff<0?'#ef4444':'#d97706' }}>
                                                            {followDiff<0?'Quá hạn':`${followDiff}d`}
                                                        </div>
                                                    )}

                                                    <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8, lineHeight:1.4, paddingRight:followBadge?52:0 }}>{c.name}</div>
                                                    <PhoneBadge phone={c.phone} />

                                                    {c.estimatedValue > 0 && (
                                                        <div style={{ marginTop:8, fontSize:13, fontWeight:800, color:'#10b981' }}>{fmt(c.estimatedValue)}</div>
                                                    )}

                                                    {c.salesPerson && (
                                                        <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:5 }}>
                                                            <div style={{ width:18, height:18, borderRadius:'50%', background:`${stage.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:stage.color, fontWeight:700 }}>
                                                                {c.salesPerson[0]}
                                                            </div>
                                                            <span style={{ fontSize:11, color:C.muted }}>{c.salesPerson}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {isOver && (
                                            <div style={{ border:`2px dashed ${stage.color}`, borderRadius:10, height:48, opacity:0.4 }} />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit modal */}
            {selected && (
                <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, backdropFilter:'blur(2px)' }}
                    onClick={()=>setSelected(null)}>
                    <div style={{ background:C.white, borderRadius:20, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
                        onClick={e=>e.stopPropagation()}>

                        {/* Modal header */}
                        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                                <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:C.text }}>{selected.name}</h3>
                                <div style={{ fontSize:12, color:C.muted, marginTop:3 }}>{selected.phone}{selected.code?` • ${selected.code}`:''}</div>
                            </div>
                            <button onClick={()=>setSelected(null)} style={{ width:32, height:32, borderRadius:8, background:C.bg, border:`1px solid ${C.border}`, fontSize:18, cursor:'pointer', color:C.gray, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>×</button>
                        </div>

                        <div style={{ padding:'20px 24px' }}>
                            {/* Stage selector */}
                            <div style={{ marginBottom:18 }}>
                                <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:'block', marginBottom:10, textTransform:'uppercase', letterSpacing:0.5 }}>Chuyển giai đoạn</label>
                                <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                                    {STAGES.map(s => {
                                        const active = editStage === s.key;
                                        return (
                                            <button key={s.key} onClick={()=>setEditStage(s.key)}
                                                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:`1.5px solid ${active?s.color:C.border}`, background:active?s.light:C.white, cursor:'pointer', textAlign:'left', transition:'all 0.12s' }}>
                                                <div style={{ width:10, height:10, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                                                <span style={{ fontSize:13, fontWeight:active?700:400, color:active?s.color:C.text, flex:1 }}>{s.key}</span>
                                                {active && <span style={{ fontSize:16, color:s.color }}>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div style={{ display:'grid', gap:14 }}>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Lịch follow-up</label>
                                    <input type="date" value={editFollowUp} onChange={e=>setEditFollowUp(e.target.value)}
                                        style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 }}>Ghi chú</label>
                                    <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} rows={3}
                                        placeholder="Kết quả cuộc gặp, yêu cầu mới..."
                                        style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none', resize:'vertical', fontFamily:'inherit' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:10, background:C.bg, borderRadius:'0 0 20px 20px' }}>
                            <button onClick={()=>setSelected(null)} style={{ padding:'10px 20px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, fontSize:13, cursor:'pointer', fontWeight:500 }}>Hủy</button>
                            <button onClick={saveCard} disabled={saving}
                                style={{ padding:'10px 24px', borderRadius:10, border:'none', background:saving?C.gray:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:saving?'not-allowed':'pointer', boxShadow:saving?'none':`0 2px 8px ${C.primary}55` }}>
                                {saving ? 'Đang lưu…' : '💾 Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}
