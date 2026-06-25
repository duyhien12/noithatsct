'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };
const STAGES = ['Khách tiềm năng','Khách chăm sóc','Khách ưu tiên','Khách hợp đồng','Khách hoàn thành'];
const STAGE_COLOR = { 'Khách tiềm năng':'#1d4ed8','Khách chăm sóc':'#3b82f6','Khách ưu tiên':'#7c3aed','Khách hợp đồng':'#f97316','Khách hoàn thành':'#78716c' };
const SOURCES = ['Facebook','Zalo','Giới thiệu','Tìm kiếm Google','TikTok','Khác'];

function fmt(n) { if (!n) return ''; if (n>=1e9) return (n/1e9).toFixed(1)+' tỷ'; if (n>=1e6) return Math.round(n/1e6)+' tr'; return n.toLocaleString('vi-VN'); }
function fmtDate(d) { if (!d) return '—'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; }

const EMPTY_FORM = { name:'',phone:'',email:'',address:'',source:'',salesPerson:'',pipelineStage:'Khách tiềm năng',estimatedValue:'',nextFollowUp:'',notes:'',gender:'Nam',type:'Cá nhân' };

function PhoneIcon() {
    return (
        <div style={{ width:14,height:14,background:'#3b82f6',borderRadius:2,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <span style={{ color:'#fff',fontSize:9,lineHeight:1 }}>✆</span>
        </div>
    );
}

function KpiCard({ icon, value, label, bg, iconBg }) {
    return (
        <div style={{ background:C.white, borderRadius:14, padding:'18px 20px', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:14, flex:'1 1 0', minWidth:140, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ width:52, height:52, borderRadius:13, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{icon}</div>
            <div>
                <div style={{ fontSize:24, fontWeight:800, color:C.text, lineHeight:1.1 }}>{value}</div>
                <div style={{ fontSize:12, color:C.gray, marginTop:3 }}>{label}</div>
            </div>
        </div>
    );
}

export default function LcCustomers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [viewMode, setViewMode] = useState('kanban');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [dragId, setDragId] = useState(null);
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

    // Filter customers client-side for both views
    const filtered = customers.filter(c => {
        const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.code?.toLowerCase().includes(search.toLowerCase());
        const matchStage = !filterStage || c.pipelineStage === filterStage;
        const matchSource = !filterSource || c.source === filterSource;
        return matchSearch && matchStage && matchSource;
    });

    function openCreate() { setEditId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); }
    function openEdit(c) {
        setEditId(c.id);
        setForm({ name:c.name||'', phone:c.phone||'', email:c.email||'', address:c.address||'', source:c.source||'', salesPerson:c.salesPerson||'', pipelineStage:c.pipelineStage||'Khách tiềm năng', estimatedValue:c.estimatedValue||'', nextFollowUp:c.nextFollowUp?new Date(c.nextFollowUp).toISOString().split('T')[0]:'', notes:c.notes||'', gender:c.gender||'Nam', type:c.type||'Cá nhân' });
        setError(''); setShowModal(true);
    }

    async function handleSave() {
        if (!form.name.trim()) { setError('Tên khách hàng bắt buộc'); return; }
        if (!form.phone.trim()) { setError('Số điện thoại bắt buộc'); return; }
        setSaving(true); setError('');
        try {
            const url = editId ? `/api/laocai/customers/${editId}` : '/api/laocai/customers';
            const method = editId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form,estimatedValue:parseFloat(form.estimatedValue)||0}) });
            const data = await res.json();
            if (!res.ok) { setError(data.error||'Lỗi lưu'); return; }
            setShowModal(false); load();
        } catch { setError('Lỗi kết nối'); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Xóa khách hàng này?')) return;
        await fetch(`/api/laocai/customers/${id}`, { method:'DELETE' });
        load();
    }

    const f = (k,v) => setForm(p=>({...p,[k]:v}));

    async function handleDrop(targetStage) {
        if (!dragId) return;
        const card = customers.find(c => c.id === dragId);
        setDragId(null);
        setDragOverStage(null);
        if (!card || card.pipelineStage === targetStage) return;
        // Optimistic update
        setCustomers(prev => prev.map(c => c.id === dragId ? {...c, pipelineStage: targetStage} : c));
        try {
            await fetch(`/api/laocai/customers/${dragId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ pipelineStage: targetStage }),
            });
        } catch { load(); }
    }

    // KPI stats
    const totalVal = customers.reduce((a,c)=>a+(c.estimatedValue||0),0);
    const doneVal  = customers.filter(c=>c.pipelineStage==='Khách hoàn thành').reduce((a,c)=>a+(c.estimatedValue||0),0);
    const inProgress = customers.filter(c=>c.pipelineStage==='Khách chăm sóc'||c.pipelineStage==='Khách ưu tiên').length;
    const potential  = customers.filter(c=>c.pipelineStage==='Khách tiềm năng').length;

    return (
        <LcShell title="Khách hàng">
            {/* KPI row */}
            <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
                <KpiCard icon="👥" value={loading?'…':customers.length} label="Tổng KH" bg="#f0fdf4" />
                <KpiCard icon="🎯" value={loading?'…':potential}         label="Tiềm năng" bg="#eff6ff" />
                <KpiCard icon="🔥" value={loading?'…':inProgress}        label="Đang xử lý" bg="#fff7ed" />
                <KpiCard icon="💎" value={loading?'…':fmt(totalVal)||'0'} label="Giá trị deal" bg="#f5f3ff" />
                <KpiCard icon="💰" value={loading?'…':fmt(doneVal)||'0'}  label="Doanh thu" bg="#fefce8" />
            </div>

            {/* Filter + view toggle */}
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ flex:1, minWidth:200, position:'relative' }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.gray, fontSize:14 }}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tên, mã, SĐT..." style={{ width:'100%', padding:'9px 12px 9px 34px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
                <select value={filterStage} onChange={e=>setFilterStage(e.target.value)} style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, background:C.white, color:filterStage?STAGE_COLOR[filterStage]:C.text, fontWeight:filterStage?700:400, minWidth:160 }}>
                    <option value="">Tất cả giai đoạn</option>
                    {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterSource} onChange={e=>setFilterSource(e.target.value)} style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, background:C.white, minWidth:140 }}>
                    <option value="">Tất cả nguồn</option>
                    {SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>

                {/* View buttons */}
                <div style={{ display:'flex', borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
                    <button onClick={()=>setViewMode('kanban')} style={{ padding:'9px 16px', border:'none', borderRight:`1px solid ${C.border}`, background:viewMode==='kanban'?C.text:C.white, color:viewMode==='kanban'?'#fff':C.gray, fontSize:13, fontWeight:viewMode==='kanban'?700:400, cursor:'pointer', transition:'all 0.15s' }}>
                        Kanban
                    </button>
                    <button onClick={()=>setViewMode('table')} style={{ padding:'9px 16px', border:'none', background:viewMode==='table'?C.text:C.white, color:viewMode==='table'?'#fff':C.gray, fontSize:13, fontWeight:viewMode==='table'?700:400, cursor:'pointer', transition:'all 0.15s' }}>
                        Bảng
                    </button>
                </div>

                <button onClick={openCreate} style={{ padding:'9px 20px', borderRadius:10, border:'none', background:C.text, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap' }}>+ Thêm KH</button>
            </div>

            {/* ── KANBAN VIEW ── */}
            {viewMode === 'kanban' && (
                <div style={{ display:'flex', gap:0, overflowX:'auto', alignItems:'flex-start', background:C.white, borderRadius:14, border:`1px solid ${C.border}` }}>
                    {STAGES.map((stage, idx) => {
                        const color = STAGE_COLOR[stage];
                        const cards = filtered.filter(c=>c.pipelineStage===stage);
                        const totalColVal = cards.reduce((a,c)=>a+(c.estimatedValue||0),0);
                        const isLast = idx===STAGES.length-1;
                        const isDropTarget = dragOverStage === stage && dragId;
                        return (
                            <div key={stage}
                                style={{ flex:'1 1 0', minWidth:210, borderRight:isLast?'none':`1px solid ${C.border}`, display:'flex', flexDirection:'column', background:isDropTarget?`${color}08`:C.white, transition:'background 0.15s' }}
                                onDragOver={e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; setDragOverStage(stage); }}
                                onDragLeave={e=>{ if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null); }}
                                onDrop={e=>{ e.preventDefault(); handleDrop(stage); }}>
                                <div style={{ padding:'14px 14px 10px', borderBottom:`2px solid ${isDropTarget?color:color}`, background:'transparent' }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                        <div style={{ width:9,height:9,borderRadius:'50%',background:color,flexShrink:0 }} />
                                        <span style={{ fontSize:13,fontWeight:700,color:C.text }}>{stage}</span>
                                        <span style={{ fontSize:12,color:C.gray,marginLeft:2 }}>{cards.length}</span>
                                    </div>
                                    {totalColVal>0 && <div style={{ fontSize:12,color:C.gray,marginTop:4,paddingLeft:15 }}>{fmt(totalColVal)}</div>}
                                </div>
                                <div style={{ flex:1, minHeight:160 }}>
                                    {/* Drop placeholder shown when dragging over empty column */}
                                    {isDropTarget && cards.length===0 && !loading && (
                                        <div style={{ margin:'10px 10px', border:`2px dashed ${color}`, borderRadius:8, height:56, opacity:0.5 }} />
                                    )}
                                    {loading ? [1,2,3].map(i=>(
                                        <div key={i} style={{ padding:'12px 14px',borderBottom:`1px solid ${C.border}` }}>
                                            <div style={{ height:13,background:'#e2e8f0',borderRadius:4,marginBottom:8,width:'70%' }} />
                                            <div style={{ height:11,background:'#e2e8f0',borderRadius:4,width:'50%' }} />
                                        </div>
                                    )) : cards.length===0 && !isDropTarget ? (
                                        <div style={{ padding:'24px 14px',textAlign:'center',color:'#cbd5e1',fontSize:12 }}>Chưa có</div>
                                    ) : cards.map(c=>{
                                        const isDragging = dragId === c.id;
                                        return (
                                            <div key={c.id}
                                                draggable={true}
                                                onDragStart={e=>{ setDragId(c.id); e.dataTransfer.effectAllowed='move'; }}
                                                onDragEnd={()=>{ setDragId(null); setDragOverStage(null); }}
                                                onClick={()=>{ if (!dragId) openEdit(c); }}
                                                style={{ padding:'11px 14px',borderBottom:`1px solid ${C.border}`,cursor:isDragging?'grabbing':'grab',background:isDragging?'#f0fdfa':C.white,opacity:isDragging?0.5:1,transition:'opacity 0.15s, background 0.12s',position:'relative',userSelect:'none' }}
                                                onMouseEnter={e=>{ if(!isDragging) e.currentTarget.style.background='#f8fafc'; }}
                                                onMouseLeave={e=>{ if(!isDragging) e.currentTarget.style.background=C.white; }}>
                                                <div style={{ fontSize:13,fontWeight:600,color:C.text,marginBottom:6,lineHeight:1.35 }}>{c.name}</div>
                                                <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:c.estimatedValue>0?5:0 }}>
                                                    <PhoneIcon />
                                                    <span style={{ fontSize:12,color:'#475569' }}>{c.phone}</span>
                                                </div>
                                                {c.estimatedValue>0 && <div style={{ fontSize:12,fontWeight:700,color:'#10b981' }}>{fmt(c.estimatedValue)}</div>}
                                                {c.salesPerson && <div style={{ fontSize:11,color:C.textMuted,marginTop:3 }}>{c.salesPerson}</div>}
                                                {c.nextFollowUp && (() => {
                                                    const diff=Math.ceil((new Date(c.nextFollowUp)-new Date())/86400000);
                                                    return diff<=3?<div style={{ position:'absolute',top:10,right:10,width:18,height:18,borderRadius:4,background:diff<0?'#ef4444':'#f59e0b',display:'flex',alignItems:'center',justifyContent:'center' }}><span style={{ fontSize:9,color:'#fff',fontWeight:700 }}>!</span></div>:null;
                                                })()}
                                            </div>
                                        );
                                    })}
                                    {/* Drop placeholder at bottom of column with cards */}
                                    {isDropTarget && cards.length>0 && !loading && (
                                        <div style={{ margin:'6px 10px', border:`2px dashed ${color}`, borderRadius:8, height:40, opacity:0.4 }} />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── TABLE VIEW ── */}
            {viewMode === 'table' && (
                <div style={{ background:C.white,borderRadius:14,border:`1px solid ${C.border}`,overflow:'hidden' }}>
                    <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%',borderCollapse:'collapse' }}>
                            <thead>
                                <tr style={{ background:'#f8fafc' }}>
                                    {['Mã KH','Khách hàng','SĐT','Nhóm KH','Sales','Giá trị','Follow-up','Ghi chú',''].map(h=>(
                                        <th key={h} style={{ padding:'9px 14px',textAlign:'left',fontSize:10,fontWeight:700,color:C.gray,letterSpacing:0.5,textTransform:'uppercase',whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? [1,2,3,4,5].map(i=>(
                                    <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                                        {[1,2,3,4,5,6,7,8,9].map(j=><td key={j} style={{ padding:'11px 14px' }}><div style={{ height:13,background:'#e2e8f0',borderRadius:4 }}/></td>)}
                                    </tr>
                                )) : filtered.length===0 ? (
                                    <tr><td colSpan={9} style={{ padding:'40px',textAlign:'center',color:C.textMuted,fontSize:13 }}>
                                        {search||filterStage||filterSource?'Không tìm thấy khách hàng phù hợp':'Chưa có khách hàng — bấm "+ Thêm KH" để bắt đầu'}
                                    </td></tr>
                                ) : filtered.map((c,i)=>(
                                    <tr key={c.id} style={{ borderTop:`1px solid ${C.border}`,background:i%2===0?C.white:'#fafafa',cursor:'pointer' }}
                                        onMouseEnter={e=>e.currentTarget.style.background='#f0fdfa'}
                                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.white:'#fafafa'}>
                                        <td style={{ padding:'10px 14px',fontSize:11,color:C.primary,fontWeight:700 }}>{c.code}</td>
                                        <td style={{ padding:'10px 14px' }} onClick={()=>openEdit(c)}>
                                            <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{c.name}</div>
                                            {c.email&&<div style={{ fontSize:11,color:C.textMuted }}>{c.email}</div>}
                                        </td>
                                        <td style={{ padding:'10px 14px',fontSize:12,color:C.gray,whiteSpace:'nowrap' }}>{c.phone}</td>
                                        <td style={{ padding:'10px 14px' }}>
                                            <span style={{ fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,background:`${STAGE_COLOR[c.pipelineStage]||C.primary}18`,color:STAGE_COLOR[c.pipelineStage]||C.primary,whiteSpace:'nowrap' }}>{c.pipelineStage||'—'}</span>
                                        </td>
                                        <td style={{ padding:'10px 14px',fontSize:12,color:C.gray }}>{c.salesPerson||'—'}</td>
                                        <td style={{ padding:'10px 14px',fontSize:12,fontWeight:600,color:C.text,whiteSpace:'nowrap' }}>{fmt(c.estimatedValue)||'—'}</td>
                                        <td style={{ padding:'10px 14px',fontSize:11,color:c.nextFollowUp&&new Date(c.nextFollowUp)<new Date()?'#ef4444':C.textMuted,whiteSpace:'nowrap' }}>{fmtDate(c.nextFollowUp)}</td>
                                        <td style={{ padding:'10px 14px',fontSize:11,color:C.gray,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.notes||''}</td>
                                        <td style={{ padding:'10px 14px' }}>
                                            <div style={{ display:'flex',gap:5 }}>
                                                <button onClick={()=>openEdit(c)} style={{ padding:'4px 9px',borderRadius:7,border:`1px solid ${C.border}`,background:'none',fontSize:11,cursor:'pointer',color:C.gray }}>Sửa</button>
                                                <button onClick={()=>handleDelete(c.id)} style={{ padding:'4px 9px',borderRadius:7,border:'1px solid #fecaca',background:'none',fontSize:11,cursor:'pointer',color:'#ef4444' }}>Xóa</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal add/edit */}
            {showModal && (
                <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:16 }} onClick={()=>setShowModal(false)}>
                    <div style={{ background:C.white,borderRadius:18,width:'100%',maxWidth:580,maxHeight:'90vh',overflow:'auto' }} onClick={e=>e.stopPropagation()}>
                        <div style={{ padding:'18px 22px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                            <h3 style={{ margin:0,fontSize:15,fontWeight:700 }}>{editId?'Sửa khách hàng':'Thêm khách hàng mới'}</h3>
                            <button onClick={()=>setShowModal(false)} style={{ background:'none',border:'none',fontSize:20,cursor:'pointer',color:C.gray }}>×</button>
                        </div>
                        <div style={{ padding:'18px 22px' }}>
                            {error&&<div style={{ background:'#fef2f2',border:'1px solid #fecaca',borderRadius:9,padding:'9px 13px',marginBottom:14,color:'#ef4444',fontSize:13 }}>{error}</div>}
                            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:11 }}>
                                <div style={{ gridColumn:'1/-1' }}>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Tên khách hàng *</label>
                                    <input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Nguyễn Văn A" style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box',outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Số điện thoại *</label>
                                    <input value={form.phone} onChange={e=>f('phone',e.target.value)} placeholder="0901 234 567" style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box',outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Email</label>
                                    <input value={form.email} onChange={e=>f('email',e.target.value)} placeholder="email@example.com" style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box',outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Nhân viên KD</label>
                                    <input value={form.salesPerson} onChange={e=>f('salesPerson',e.target.value)} placeholder="Tên nhân viên" style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box',outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Nhóm khách hàng</label>
                                    <select value={form.pipelineStage} onChange={e=>f('pipelineStage',e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${STAGE_COLOR[form.pipelineStage]||C.border}`,fontSize:13,background:C.white,boxSizing:'border-box',color:STAGE_COLOR[form.pipelineStage]||C.text,fontWeight:600 }}>
                                        {STAGES.map(s=><option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Nguồn khách</label>
                                    <select value={form.source} onChange={e=>f('source',e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,background:C.white,boxSizing:'border-box' }}>
                                        <option value="">— Chọn nguồn —</option>
                                        {SOURCES.map(s=><option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Giá trị dự kiến (đ)</label>
                                    <input type="number" value={form.estimatedValue} onChange={e=>f('estimatedValue',e.target.value)} placeholder="0" style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box',outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Lịch follow-up</label>
                                    <input type="date" value={form.nextFollowUp} onChange={e=>f('nextFollowUp',e.target.value)} style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box',outline:'none' }} />
                                </div>
                                <div style={{ gridColumn:'1/-1' }}>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Địa chỉ</label>
                                    <input value={form.address} onChange={e=>f('address',e.target.value)} placeholder="Địa chỉ khách hàng" style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box',outline:'none' }} />
                                </div>
                                <div style={{ gridColumn:'1/-1' }}>
                                    <label style={{ fontSize:11,fontWeight:600,color:C.gray,display:'block',marginBottom:4 }}>Ghi chú</label>
                                    <textarea value={form.notes} onChange={e=>f('notes',e.target.value)} rows={3} placeholder="Ghi chú thêm..." style={{ width:'100%',padding:'9px 12px',borderRadius:9,border:`1px solid ${C.border}`,fontSize:13,boxSizing:'border-box',outline:'none',resize:'vertical' }} />
                                </div>
                            </div>
                        </div>
                        <div style={{ padding:'14px 22px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'flex-end',gap:9 }}>
                            <button onClick={()=>setShowModal(false)} style={{ padding:'9px 18px',borderRadius:9,border:`1px solid ${C.border}`,background:C.white,fontSize:13,cursor:'pointer' }}>Hủy</button>
                            <button onClick={handleSave} disabled={saving} style={{ padding:'9px 22px',borderRadius:9,border:'none',background:saving?C.gray:C.primary,color:'#fff',fontWeight:700,fontSize:13,cursor:saving?'not-allowed':'pointer' }}>
                                {saving?'Đang lưu...':editId?'💾 Cập nhật':'💾 Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}
