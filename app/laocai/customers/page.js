'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', muted:'#94a3b8', bg:'#f8fafc' };
const STAGES = ['Khách tiềm năng','Khách chăm sóc','Khách ưu tiên','Khách hợp đồng','Khách hoàn thành'];
const STAGE_COLOR  = { 'Khách tiềm năng':'#2563eb','Khách chăm sóc':'#0891b2','Khách ưu tiên':'#7c3aed','Khách hợp đồng':'#ea580c','Khách hoàn thành':'#64748b' };
const STAGE_LIGHT  = { 'Khách tiềm năng':'#eff6ff','Khách chăm sóc':'#ecfeff','Khách ưu tiên':'#f5f3ff','Khách hợp đồng':'#fff7ed','Khách hoàn thành':'#f8fafc' };
const SOURCES = ['Facebook','Zalo','Giới thiệu','Tìm kiếm Google','TikTok','Khác'];

function fmt(n) { if (!n) return ''; if (n>=1e9) return (n/1e9).toFixed(1)+' tỷ'; if (n>=1e6) return Math.round(n/1e6)+' tr'; return n.toLocaleString('vi-VN'); }
function fmtDate(d) { if (!d) return '—'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; }

const EMPTY_FORM = { name:'',phone:'',email:'',address:'',source:'',salesPerson:'',pipelineStage:'Khách tiềm năng',estimatedValue:'',nextFollowUp:'',notes:'',gender:'Nam',type:'Cá nhân' };

/* ── KPI Card ── */
function KpiCard({ icon, value, label, color, lightBg }) {
    return (
        <div style={{ background:C.white, borderRadius:16, padding:'20px 22px', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:16, flex:'1 1 0', minWidth:150, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', position:'relative', overflow:'hidden' }}>
            {/* accent bar */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, borderRadius:'16px 16px 0 0' }} />
            <div style={{ width:50, height:50, borderRadius:14, background:lightBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{icon}</div>
            <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:22, fontWeight:800, color:C.text, lineHeight:1.1 }}>{value}</div>
                <div style={{ fontSize:12, color:C.gray, marginTop:4, fontWeight:500 }}>{label}</div>
            </div>
        </div>
    );
}

/* ── Phone badge ── */
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

export default function LcCustomers() {
    const [customers, setCustomers]     = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [viewMode, setViewMode]       = useState('kanban');
    const [showModal, setShowModal]     = useState(false);
    const [editId, setEditId]           = useState(null);
    const [form, setForm]               = useState(EMPTY_FORM);
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState('');
    const [dragId, setDragId]           = useState(null);
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

    const filtered = customers.filter(c => {
        const q = search.toLowerCase();
        const ms = !search || c.name?.toLowerCase().includes(q) || c.phone?.includes(search) || c.code?.toLowerCase().includes(q);
        const mg = !filterStage  || c.pipelineStage === filterStage;
        const mo = !filterSource || c.source === filterSource;
        return ms && mg && mo;
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

    const fld = (k,v) => setForm(p=>({...p,[k]:v}));

    const totalVal   = customers.reduce((a,c)=>a+(c.estimatedValue||0),0);
    const doneVal    = customers.filter(c=>c.pipelineStage==='Khách hoàn thành').reduce((a,c)=>a+(c.estimatedValue||0),0);
    const inProgress = customers.filter(c=>['Khách chăm sóc','Khách ưu tiên'].includes(c.pipelineStage)).length;
    const potential  = customers.filter(c=>c.pipelineStage==='Khách tiềm năng').length;

    return (
        <LcShell title="Khách hàng">

            {/* ── KPI ── */}
            <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
                <KpiCard icon="👥" value={loading?'…':customers.length} label="Tổng khách hàng"  color="#0f766e" lightBg="#f0fdf4" />
                <KpiCard icon="🎯" value={loading?'…':potential}         label="Tiềm năng"       color="#2563eb" lightBg="#eff6ff" />
                <KpiCard icon="🔥" value={loading?'…':inProgress}        label="Đang xử lý"      color="#ea580c" lightBg="#fff7ed" />
                <KpiCard icon="💎" value={loading?'…':(fmt(totalVal)||'0')} label="Giá trị deal" color="#7c3aed" lightBg="#f5f3ff" />
                <KpiCard icon="💰" value={loading?'…':(fmt(doneVal)||'0')}  label="Doanh thu"    color="#0891b2" lightBg="#ecfeff" />
            </div>

            {/* ── Toolbar ── */}
            <div style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap', alignItems:'center' }}>
                <div style={{ flex:1, minWidth:220, position:'relative' }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.muted, fontSize:14, pointerEvents:'none' }}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm tên, mã, SĐT..."
                        style={{ width:'100%', padding:'9px 12px 9px 36px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box', background:C.white }} />
                </div>
                <select value={filterStage} onChange={e=>setFilterStage(e.target.value)}
                    style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${filterStage?STAGE_COLOR[filterStage]:C.border}`, fontSize:13, background:C.white, color:filterStage?STAGE_COLOR[filterStage]:C.gray, fontWeight:filterStage?700:400, minWidth:160, cursor:'pointer' }}>
                    <option value="">Tất cả giai đoạn</option>
                    {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterSource} onChange={e=>setFilterSource(e.target.value)}
                    style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, background:C.white, color:C.gray, minWidth:140, cursor:'pointer' }}>
                    <option value="">Tất cả nguồn</option>
                    {SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ display:'flex', borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}`, flexShrink:0 }}>
                    <button onClick={()=>setViewMode('kanban')}
                        style={{ padding:'9px 18px', border:'none', borderRight:`1px solid ${C.border}`, background:viewMode==='kanban'?C.text:C.white, color:viewMode==='kanban'?'#fff':C.gray, fontSize:13, fontWeight:viewMode==='kanban'?700:400, cursor:'pointer', transition:'all 0.15s' }}>
                        ⊞ Kanban
                    </button>
                    <button onClick={()=>setViewMode('table')}
                        style={{ padding:'9px 18px', border:'none', background:viewMode==='table'?C.text:C.white, color:viewMode==='table'?'#fff':C.gray, fontSize:13, fontWeight:viewMode==='table'?700:400, cursor:'pointer', transition:'all 0.15s' }}>
                        ☰ Bảng
                    </button>
                </div>
                <button onClick={openCreate}
                    style={{ padding:'9px 20px', borderRadius:10, border:'none', background:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', boxShadow:`0 2px 8px ${C.primary}44`, flexShrink:0 }}>
                    + Thêm KH
                </button>
            </div>

            {/* ── KANBAN ── */}
            {viewMode === 'kanban' && (
                <div style={{ display:'flex', gap:12, overflowX:'auto', alignItems:'flex-start', paddingBottom:8 }}>
                    {STAGES.map(stage => {
                        const color  = STAGE_COLOR[stage];
                        const lightBg = STAGE_LIGHT[stage];
                        const cards  = filtered.filter(c => c.pipelineStage === stage);
                        const colVal = cards.reduce((a,c) => a+(c.estimatedValue||0), 0);
                        const isOver = dragOverStage === stage && dragId;
                        return (
                            <div key={stage}
                                style={{ flex:'1 1 0', minWidth:220, maxWidth:300, display:'flex', flexDirection:'column', borderRadius:14, border:`2px solid ${isOver?color:C.border}`, background:isOver?lightBg:C.bg, transition:'border-color 0.15s, background 0.15s' }}
                                onDragOver={e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move'; setDragOverStage(stage); }}
                                onDragLeave={e=>{ if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStage(null); }}
                                onDrop={e=>{ e.preventDefault(); handleDrop(stage); }}>

                                {/* Column header */}
                                <div style={{ padding:'12px 14px 10px', borderBottom:`1px solid ${C.border}` }}>
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                                            <div style={{ width:10, height:10, borderRadius:'50%', background:color }} />
                                            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{stage}</span>
                                        </div>
                                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${color}18`, color }}>{cards.length}</span>
                                    </div>
                                    {colVal > 0 && (
                                        <div style={{ fontSize:12, color, fontWeight:600, marginTop:6, paddingLeft:17 }}>{fmt(colVal)}</div>
                                    )}
                                </div>

                                {/* Cards list */}
                                <div style={{ flex:1, padding:'10px 10px', display:'flex', flexDirection:'column', gap:8, minHeight:200 }}>
                                    {loading ? [1,2,3].map(i=>(
                                        <div key={i} style={{ background:C.white, borderRadius:10, padding:'12px 14px', border:`1px solid ${C.border}` }}>
                                            <div style={{ height:13, background:'#e2e8f0', borderRadius:4, marginBottom:10, width:'75%' }} />
                                            <div style={{ height:11, background:'#e2e8f0', borderRadius:4, width:'55%' }} />
                                        </div>
                                    )) : cards.length === 0 ? (
                                        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 14px', gap:8 }}>
                                            {isOver
                                                ? <div style={{ width:'100%', border:`2px dashed ${color}`, borderRadius:10, height:64, opacity:0.5 }} />
                                                : <>
                                                    <div style={{ fontSize:24, opacity:0.25 }}>📭</div>
                                                    <span style={{ fontSize:12, color:C.muted }}>Chưa có khách hàng</span>
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
                                                        onClick={()=>{ if (!dragId) openEdit(c); }}
                                                        style={{
                                                            background: isDragging ? '#f0fdfa' : C.white,
                                                            border: `1px solid ${isDragging ? C.primary : C.border}`,
                                                            borderRadius:10,
                                                            padding:'12px 13px',
                                                            cursor: isDragging ? 'grabbing' : 'grab',
                                                            opacity: isDragging ? 0.55 : 1,
                                                            boxShadow: isDragging ? `0 4px 12px rgba(0,0,0,0.12)` : '0 1px 3px rgba(0,0,0,0.04)',
                                                            transition:'opacity 0.15s, box-shadow 0.15s, border-color 0.15s',
                                                            position:'relative',
                                                            userSelect:'none',
                                                        }}
                                                        onMouseEnter={e=>{ if(!isDragging){ e.currentTarget.style.boxShadow='0 3px 10px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor=color; } }}
                                                        onMouseLeave={e=>{ if(!isDragging){ e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor=C.border; } }}>

                                                        {/* follow-up badge */}
                                                        {followBadge && (
                                                            <div style={{ position:'absolute', top:10, right:10, padding:'2px 7px', borderRadius:6, background: followDiff<0?'#fef2f2':'#fffbeb', border:`1px solid ${followDiff<0?'#fecaca':'#fde68a'}`, fontSize:10, fontWeight:700, color:followDiff<0?'#ef4444':'#d97706' }}>
                                                                {followDiff<0?'Quá hạn':`${followDiff}d`}
                                                            </div>
                                                        )}

                                                        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:8, lineHeight:1.4, paddingRight: followBadge?50:0 }}>{c.name}</div>
                                                        <PhoneBadge phone={c.phone} />

                                                        {c.estimatedValue > 0 && (
                                                            <div style={{ marginTop:8, fontSize:13, fontWeight:800, color:'#10b981' }}>{fmt(c.estimatedValue)}</div>
                                                        )}

                                                        {c.salesPerson && (
                                                            <div style={{ marginTop:5, display:'flex', alignItems:'center', gap:5 }}>
                                                                <div style={{ width:18, height:18, borderRadius:'50%', background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color, fontWeight:700 }}>
                                                                    {c.salesPerson[0]}
                                                                </div>
                                                                <span style={{ fontSize:11, color:C.muted }}>{c.salesPerson}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {/* drop zone at bottom */}
                                            {isOver && (
                                                <div style={{ border:`2px dashed ${color}`, borderRadius:10, height:48, opacity:0.4 }} />
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── TABLE ── */}
            {viewMode === 'table' && (
                <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                    <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse' }}>
                            <thead>
                                <tr style={{ background:C.bg }}>
                                    {['Mã KH','Khách hàng','SĐT','Nhóm KH','Sales','Giá trị','Follow-up','Ghi chú',''].map(h=>(
                                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.muted, letterSpacing:0.6, textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? [1,2,3,4,5].map(i=>(
                                    <tr key={i}><td colSpan={9} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}><div style={{ height:14, background:'#e2e8f0', borderRadius:4 }}/></td></tr>
                                )) : filtered.length===0 ? (
                                    <tr><td colSpan={9} style={{ padding:'48px', textAlign:'center', color:C.muted, fontSize:13 }}>
                                        {search||filterStage||filterSource ? '🔍 Không tìm thấy kết quả phù hợp' : '📭 Chưa có khách hàng — bấm "+ Thêm KH" để bắt đầu'}
                                    </td></tr>
                                ) : filtered.map((c,i)=>{
                                    const sc = STAGE_COLOR[c.pipelineStage]||C.primary;
                                    const overdue = c.nextFollowUp && new Date(c.nextFollowUp) < new Date();
                                    return (
                                        <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}`, background:C.white }}
                                            onMouseEnter={e=>e.currentTarget.style.background='#f0fdfa'}
                                            onMouseLeave={e=>e.currentTarget.style.background=C.white}>
                                            <td style={{ padding:'11px 16px', fontSize:11, color:C.primary, fontWeight:700 }}>{c.code}</td>
                                            <td style={{ padding:'11px 16px', cursor:'pointer' }} onClick={()=>openEdit(c)}>
                                                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{c.name}</div>
                                                {c.email && <div style={{ fontSize:11, color:C.muted }}>{c.email}</div>}
                                            </td>
                                            <td style={{ padding:'11px 16px', fontSize:12, color:C.gray, whiteSpace:'nowrap' }}>{c.phone}</td>
                                            <td style={{ padding:'11px 16px' }}>
                                                <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background:`${sc}15`, color:sc, whiteSpace:'nowrap', border:`1px solid ${sc}33` }}>{c.pipelineStage||'—'}</span>
                                            </td>
                                            <td style={{ padding:'11px 16px', fontSize:12, color:C.gray }}>{c.salesPerson||'—'}</td>
                                            <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:'#10b981', whiteSpace:'nowrap' }}>{fmt(c.estimatedValue)||<span style={{ color:C.muted, fontSize:12, fontWeight:400 }}>—</span>}</td>
                                            <td style={{ padding:'11px 16px', fontSize:11, color:overdue?'#ef4444':C.muted, fontWeight:overdue?700:400, whiteSpace:'nowrap' }}>{fmtDate(c.nextFollowUp)}</td>
                                            <td style={{ padding:'11px 16px', fontSize:11, color:C.gray, maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.notes||''}</td>
                                            <td style={{ padding:'11px 16px' }}>
                                                <div style={{ display:'flex', gap:6 }}>
                                                    <button onClick={()=>openEdit(c)} style={{ padding:'5px 11px', borderRadius:7, border:`1px solid ${C.border}`, background:'none', fontSize:11, cursor:'pointer', color:C.gray, fontWeight:500 }}>Sửa</button>
                                                    <button onClick={()=>handleDelete(c.id)} style={{ padding:'5px 11px', borderRadius:7, border:'1px solid #fecaca', background:'none', fontSize:11, cursor:'pointer', color:'#ef4444' }}>Xóa</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── MODAL ── */}
            {showModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, backdropFilter:'blur(2px)' }}
                    onClick={()=>setShowModal(false)}>
                    <div style={{ background:C.white, borderRadius:20, width:'100%', maxWidth:600, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
                        onClick={e=>e.stopPropagation()}>
                        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div>
                                <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:C.text }}>{editId?'Chỉnh sửa khách hàng':'Thêm khách hàng mới'}</h3>
                                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{editId?'Cập nhật thông tin khách hàng':'Điền thông tin để tạo khách hàng mới'}</div>
                            </div>
                            <button onClick={()=>setShowModal(false)} style={{ width:32, height:32, borderRadius:8, background:C.bg, border:`1px solid ${C.border}`, fontSize:18, cursor:'pointer', color:C.gray, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>×</button>
                        </div>
                        <div style={{ padding:'20px 24px' }}>
                            {error && (
                                <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', marginBottom:16, color:'#dc2626', fontSize:13, display:'flex', gap:8, alignItems:'center' }}>
                                    ⚠️ {error}
                                </div>
                            )}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                                <FieldGroup label="Tên khách hàng *" col="1/-1">
                                    <input value={form.name} onChange={e=>fld('name',e.target.value)} placeholder="Nguyễn Văn A"
                                        style={inp()} />
                                </FieldGroup>
                                <FieldGroup label="Số điện thoại *">
                                    <input value={form.phone} onChange={e=>fld('phone',e.target.value)} placeholder="0901 234 567"
                                        style={inp()} />
                                </FieldGroup>
                                <FieldGroup label="Email">
                                    <input value={form.email} onChange={e=>fld('email',e.target.value)} placeholder="email@example.com"
                                        style={inp()} />
                                </FieldGroup>
                                <FieldGroup label="Nhóm khách hàng">
                                    <select value={form.pipelineStage} onChange={e=>fld('pipelineStage',e.target.value)}
                                        style={{ ...inp(), color:STAGE_COLOR[form.pipelineStage]||C.text, fontWeight:600, borderColor:STAGE_COLOR[form.pipelineStage]||C.border }}>
                                        {STAGES.map(s=><option key={s}>{s}</option>)}
                                    </select>
                                </FieldGroup>
                                <FieldGroup label="Nguồn khách">
                                    <select value={form.source} onChange={e=>fld('source',e.target.value)} style={inp()}>
                                        <option value="">— Chọn nguồn —</option>
                                        {SOURCES.map(s=><option key={s}>{s}</option>)}
                                    </select>
                                </FieldGroup>
                                <FieldGroup label="Nhân viên kinh doanh">
                                    <input value={form.salesPerson} onChange={e=>fld('salesPerson',e.target.value)} placeholder="Tên nhân viên"
                                        style={inp()} />
                                </FieldGroup>
                                <FieldGroup label="Giá trị dự kiến (đồng)">
                                    <input type="number" value={form.estimatedValue} onChange={e=>fld('estimatedValue',e.target.value)} placeholder="0"
                                        style={inp()} />
                                </FieldGroup>
                                <FieldGroup label="Lịch follow-up">
                                    <input type="date" value={form.nextFollowUp} onChange={e=>fld('nextFollowUp',e.target.value)}
                                        style={inp()} />
                                </FieldGroup>
                                <FieldGroup label="Địa chỉ" col="1/-1">
                                    <input value={form.address} onChange={e=>fld('address',e.target.value)} placeholder="Địa chỉ khách hàng"
                                        style={inp()} />
                                </FieldGroup>
                                <FieldGroup label="Ghi chú" col="1/-1">
                                    <textarea value={form.notes} onChange={e=>fld('notes',e.target.value)} rows={3} placeholder="Ghi chú thêm..."
                                        style={{ ...inp(), resize:'vertical', height:'auto' }} />
                                </FieldGroup>
                            </div>
                        </div>
                        <div style={{ padding:'16px 24px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:10, background:C.bg, borderRadius:'0 0 20px 20px' }}>
                            <button onClick={()=>setShowModal(false)} style={{ padding:'10px 20px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, fontSize:13, cursor:'pointer', fontWeight:500 }}>Hủy</button>
                            <button onClick={handleSave} disabled={saving}
                                style={{ padding:'10px 24px', borderRadius:10, border:'none', background:saving?C.gray:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:saving?'not-allowed':'pointer', boxShadow:saving?'none':`0 2px 8px ${C.primary}55` }}>
                                {saving ? 'Đang lưu…' : editId ? '💾 Cập nhật' : '✚ Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}

function FieldGroup({ label, children, col }) {
    return (
        <div style={{ gridColumn: col||'auto' }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 }}>{label}</label>
            {children}
        </div>
    );
}

function inp() {
    return { width:'100%', padding:'10px 13px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:13, boxSizing:'border-box', outline:'none', background:'#fff', fontFamily:'inherit' };
}
