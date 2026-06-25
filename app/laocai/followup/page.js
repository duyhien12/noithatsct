'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };
const STAGE_COLOR = { 'Tư vấn':'#3b82f6','Báo giá':'#8b5cf6','Ký HĐ':'#10b981','Thi công':'#f59e0b','Hoàn thành':'#64748b' };

function getStatus(nextFollowUp) {
    if (!nextFollowUp) return null;
    const now = new Date(); const d = new Date(nextFollowUp);
    const diff = Math.ceil((d - now) / (1000*60*60*24));
    if (diff < 0) return { label:'Quá hạn', color:'#ef4444', bg:'#fef2f2' };
    if (diff === 0) return { label:'Hôm nay', color:'#f97316', bg:'#fff7ed' };
    if (diff <= 3) return { label:`${diff} ngày`, color:'#f59e0b', bg:'#fffbeb' };
    return { label:`${diff} ngày`, color:'#0f766e', bg:'#f0fdfa' };
}

export default function LcFollowup() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);
    const [newDate, setNewDate] = useState('');
    const [newNotes, setNewNotes] = useState('');
    const [newStage, setNewStage] = useState('');
    const [saving, setSaving] = useState(false);
    const [showAll, setShowAll] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/laocai/followup${showAll?'?all=1':''}`);
            if (res.ok) { const d = await res.json(); setCustomers(d.customers||[]); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, [showAll]);

    useEffect(() => { load(); }, [load]);

    function openDone(c) {
        setSelected(c);
        setNewDate('');
        setNewNotes(c.notes||'');
        setNewStage(c.pipelineStage||'Tư vấn');
    }

    async function save() {
        if (!selected) return;
        setSaving(true);
        try {
            await fetch(`/api/laocai/followup/${selected.id}`, {
                method:'PUT', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ nextFollowUp:newDate||null, pipelineStage:newStage, notes:newNotes }),
            });
            setSelected(null); load();
        } finally { setSaving(false); }
    }

    const overdue = customers.filter(c => c.nextFollowUp && new Date(c.nextFollowUp) < new Date()).length;

    return (
        <LcShell title="Follow-up">
            <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
                {overdue>0 && <div style={{ padding:'6px 14px', borderRadius:20, background:'#fef2f2', border:'1px solid #fecaca', color:'#ef4444', fontSize:12, fontWeight:700 }}>⚠️ {overdue} quá hạn</div>}
                <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                    <button onClick={()=>setShowAll(!showAll)} style={{ padding:'7px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:showAll?C.primary:C.white, color:showAll?'#fff':C.gray, fontSize:12, cursor:'pointer', fontWeight:showAll?700:400 }}>
                        {showAll ? '📋 Tất cả KH' : '📅 Có lịch hẹn'}
                    </button>
                    <button onClick={load} style={{ padding:'7px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:12, color:C.gray, cursor:'pointer' }}>↻</button>
                </div>
            </div>

            <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ background:'#f8fafc' }}>
                                {['Khách hàng','SĐT','Pipeline','Sales','Ngày follow-up','Ghi chú',''].map(h=>(
                                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.gray, letterSpacing:0.5, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [1,2,3,4].map(i=>(
                                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                                    {[1,2,3,4,5,6,7].map(j=><td key={j} style={{ padding:'11px 14px' }}><div style={{ height:13, background:'#e2e8f0', borderRadius:4 }}/></td>)}
                                </tr>
                            )) : customers.length===0 ? (
                                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:13 }}>
                                    {showAll ? 'Chưa có khách hàng nào' : 'Không có lịch follow-up — bấm "Tất cả KH" để xem và thêm lịch'}
                                </td></tr>
                            ) : customers.map((c,i) => {
                                const st = getStatus(c.nextFollowUp);
                                return (
                                    <tr key={c.id} style={{ borderTop:`1px solid ${C.border}`, background:st?.bg||( i%2===0?C.white:'#fafafa') }}>
                                        <td style={{ padding:'10px 14px' }}>
                                            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{c.name}</div>
                                            <div style={{ fontSize:11, color:C.textMuted }}>{c.code}</div>
                                        </td>
                                        <td style={{ padding:'10px 14px', fontSize:12, color:C.gray, whiteSpace:'nowrap' }}>{c.phone}</td>
                                        <td style={{ padding:'10px 14px' }}>
                                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${STAGE_COLOR[c.pipelineStage]||C.primary}18`, color:STAGE_COLOR[c.pipelineStage]||C.primary }}>{c.pipelineStage||'—'}</span>
                                        </td>
                                        <td style={{ padding:'10px 14px', fontSize:12, color:C.gray }}>{c.salesPerson||'—'}</td>
                                        <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                                            {c.nextFollowUp ? (
                                                <span style={{ fontSize:12, fontWeight:700, color:st?.color, padding:'3px 9px', borderRadius:20, background:`${st?.color}18` }}>
                                                    {st?.label} — {new Date(c.nextFollowUp).toLocaleDateString('vi-VN')}
                                                </span>
                                            ) : <span style={{ fontSize:11, color:C.textMuted }}>Chưa có</span>}
                                        </td>
                                        <td style={{ padding:'10px 14px', fontSize:12, color:C.gray, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.notes||''}</td>
                                        <td style={{ padding:'10px 14px' }}>
                                            <button onClick={()=>openDone(c)} style={{ padding:'5px 11px', borderRadius:7, border:`1px solid ${C.primary}`, background:'none', fontSize:11, cursor:'pointer', color:C.primary, fontWeight:600, whiteSpace:'nowrap' }}>✓ Xử lý</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal xử lý */}
            {selected && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={()=>setSelected(null)}>
                    <div style={{ background:C.white, borderRadius:16, width:'100%', maxWidth:420 }} onClick={e=>e.stopPropagation()}>
                        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${C.border}` }}>
                            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>Xử lý follow-up: {selected.name}</h3>
                        </div>
                        <div style={{ padding:'16px 20px' }}>
                            <div style={{ marginBottom:12 }}>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Lịch follow-up tiếp theo</label>
                                <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>Để trống nếu không cần follow-up nữa</div>
                            </div>
                            <div style={{ marginBottom:12 }}>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Cập nhật giai đoạn</label>
                                <select value={newStage} onChange={e=>setNewStage(e.target.value)} style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, background:C.white, boxSizing:'border-box' }}>
                                    {['Tư vấn','Báo giá','Ký HĐ','Thi công','Hoàn thành'].map(s=><option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Ghi chú</label>
                                <textarea value={newNotes} onChange={e=>setNewNotes(e.target.value)} rows={3} placeholder="Kết quả cuộc gặp, yêu cầu mới..." style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none', resize:'vertical' }} />
                            </div>
                        </div>
                        <div style={{ padding:'12px 20px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
                            <button onClick={()=>setSelected(null)} style={{ padding:'8px 16px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:13, cursor:'pointer' }}>Hủy</button>
                            <button onClick={save} disabled={saving} style={{ padding:'8px 20px', borderRadius:9, border:'none', background:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>{saving?'Lưu...':'💾 Lưu'}</button>
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}
