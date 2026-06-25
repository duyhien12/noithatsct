'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };

const STAGES = [
    { key:'Khách tiềm năng', color:'#1d4ed8' },
    { key:'Khách chăm sóc',  color:'#3b82f6' },
    { key:'Khách ưu tiên',   color:'#7c3aed' },
    { key:'Khách hợp đồng',  color:'#f97316' },
    { key:'Khách hoàn thành',color:'#78716c' },
];

function fmt(n) {
    if (!n) return '';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
    if (n >= 1e6) return Math.round(n / 1e6) + ' tr';
    return n.toLocaleString('vi-VN');
}

function PhoneIcon() {
    return (
        <div style={{ width:14, height:14, background:'#3b82f6', borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                <path d="M2 1h2l1 2.5L3.5 5a7 7 0 003.5 3.5L8.5 7 11 8v2a1 1 0 01-1 1C4.477 11 0 6.523 0 2A1 1 0 011 1h1z" fill="white" transform="scale(0.8)"/>
            </svg>
        </div>
    );
}

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
            if (res.ok) { const d = await res.json(); setCustomers(d.customers || []); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

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
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipelineStage: editStage, notes: editNotes, nextFollowUp: editFollowUp || null }),
            });
            if (res.ok) { setSelected(null); load(); }
        } finally { setSaving(false); }
    }

    return (
        <LcShell title="Pipeline Khách Hàng">
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
                <button onClick={load} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:C.white, fontSize:12, color:C.gray, cursor:'pointer' }}>↻</button>
            </div>

            {/* Kanban board */}
            <div style={{ display:'flex', gap:0, overflowX:'auto', alignItems:'flex-start', minHeight:500, background:C.white, borderRadius:14, border:`1px solid ${C.border}` }}>
                {STAGES.map((stage, stageIdx) => {
                    const cards = customers.filter(c => c.pipelineStage === stage.key);
                    const totalVal = cards.reduce((a, c) => a + (c.estimatedValue || 0), 0);
                    const isLast = stageIdx === STAGES.length - 1;

                    return (
                        <div key={stage.key} style={{ flex: '1 1 0', minWidth: 200, borderRight: isLast ? 'none' : `1px solid ${C.border}`, display:'flex', flexDirection:'column' }}>
                            {/* Column header */}
                            <div style={{ padding: '14px 14px 10px', borderBottom: `2px solid ${stage.color}`, position:'sticky', top:0, background:C.white, zIndex:1 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                    <div style={{ width:9, height:9, borderRadius:'50%', background:stage.color, flexShrink:0 }} />
                                    <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{stage.key}</span>
                                    <span style={{ fontSize:12, color:C.gray, marginLeft:2 }}>{cards.length}</span>
                                </div>
                                {totalVal > 0 && (
                                    <div style={{ fontSize:12, color:C.gray, marginTop:4, paddingLeft:15 }}>{fmt(totalVal)}</div>
                                )}
                            </div>

                            {/* Cards */}
                            <div style={{ flex:1 }}>
                                {loading ? (
                                    [1,2,3].map(i => (
                                        <div key={i} style={{ padding:'12px 14px', borderBottom:`1px solid ${C.border}` }}>
                                            <div style={{ height:13, background:'#e2e8f0', borderRadius:4, marginBottom:8, width:'70%' }} />
                                            <div style={{ height:11, background:'#e2e8f0', borderRadius:4, width:'50%' }} />
                                        </div>
                                    ))
                                ) : cards.length === 0 ? (
                                    <div style={{ padding:'24px 14px', textAlign:'center', color:'#cbd5e1', fontSize:12 }}>Chưa có</div>
                                ) : (
                                    cards.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => openCard(c)}
                                            style={{ padding:'11px 14px', borderBottom:`1px solid ${C.border}`, cursor:'pointer', background:C.white, transition:'background 0.12s', position:'relative' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={e => e.currentTarget.style.background = C.white}
                                        >
                                            {/* Name */}
                                            <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:6, lineHeight:1.35, paddingRight: c.estimatedValue ? 0 : 0 }}>
                                                {c.name}
                                            </div>

                                            {/* Phone */}
                                            <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom: c.estimatedValue > 0 ? 5 : 0 }}>
                                                <PhoneIcon />
                                                <span style={{ fontSize:12, color:'#475569', letterSpacing:0.3 }}>{c.phone}</span>
                                            </div>

                                            {/* Value */}
                                            {c.estimatedValue > 0 && (
                                                <div style={{ fontSize:12, fontWeight:700, color:'#10b981', marginTop:2 }}>{fmt(c.estimatedValue)}</div>
                                            )}

                                            {/* Follow-up badge */}
                                            {c.nextFollowUp && (() => {
                                                const diff = Math.ceil((new Date(c.nextFollowUp) - new Date()) / 86400000);
                                                if (diff <= 3) return (
                                                    <div style={{ position:'absolute', top:10, right:10, width:18, height:18, borderRadius:4, background: diff < 0 ? '#ef4444' : '#f59e0b', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                                        <span style={{ fontSize:9, color:'#fff', fontWeight:700 }}>!</span>
                                                    </div>
                                                );
                                                return null;
                                            })()}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edit modal */}
            {selected && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={() => setSelected(null)}>
                    <div style={{ background:C.white, borderRadius:16, width:'100%', maxWidth:460 }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div>
                                <h3 style={{ margin:0, fontSize:15, fontWeight:700, color:C.text }}>{selected.name}</h3>
                                <div style={{ fontSize:12, color:C.gray, marginTop:2 }}>{selected.phone} • {selected.code}</div>
                            </div>
                            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.gray, lineHeight:1 }}>×</button>
                        </div>
                        <div style={{ padding:'16px 20px' }}>
                            <div style={{ marginBottom:14 }}>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Chuyển nhóm</label>
                                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                    {STAGES.map(s => (
                                        <button key={s.key} onClick={() => setEditStage(s.key)} style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 13px', borderRadius:9, border:`1.5px solid ${editStage === s.key ? s.color : C.border}`, background: editStage === s.key ? s.color + '12' : C.white, cursor:'pointer', textAlign:'left', transition:'all 0.12s' }}>
                                            <div style={{ width:9, height:9, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                                            <span style={{ fontSize:13, fontWeight: editStage === s.key ? 700 : 400, color: editStage === s.key ? s.color : C.text }}>{s.key}</span>
                                            {editStage === s.key && <span style={{ marginLeft:'auto', fontSize:14, color:s.color }}>✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ marginBottom:12 }}>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>Follow-up</label>
                                <input type="date" value={editFollowUp} onChange={e => setEditFollowUp(e.target.value)} style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>Ghi chú</label>
                                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3} style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none', resize:'vertical' }} />
                            </div>
                        </div>
                        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
                            <button onClick={() => setSelected(null)} style={{ padding:'8px 18px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:13, cursor:'pointer' }}>Hủy</button>
                            <button onClick={saveCard} disabled={saving} style={{ padding:'8px 22px', borderRadius:9, border:'none', background:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>{saving ? 'Lưu...' : '💾 Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}
