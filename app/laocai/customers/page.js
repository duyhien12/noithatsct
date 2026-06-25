'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', grayLight:'#f8fafc', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };
const STAGES = ['Tư vấn','Báo giá','Ký HĐ','Thi công','Hoàn thành'];
const STAGE_COLOR = { 'Tư vấn':'#3b82f6','Báo giá':'#8b5cf6','Ký HĐ':'#10b981','Thi công':'#f59e0b','Hoàn thành':'#64748b' };
const SOURCES = ['Facebook','Zalo','Giới thiệu','Tìm kiếm Google','TikTok','Khác'];

function fmt(n) { if (!n) return ''; if (n>=1e9) return (n/1e9).toFixed(1)+'tỷ'; if (n>=1e6) return Math.round(n/1e6)+'tr'; return n.toLocaleString('vi-VN'); }
function fmtDate(d) { if (!d) return '—'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; }

const EMPTY_FORM = { name:'',phone:'',email:'',address:'',source:'',salesPerson:'',pipelineStage:'Tư vấn',estimatedValue:'',nextFollowUp:'',notes:'',gender:'Nam',type:'Cá nhân' };

export default function LcCustomers() {
    const router = useRouter();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStage, setFilterStage] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (filterStage) params.set('stage', filterStage);
            const res = await fetch(`/api/laocai/customers?${params}`);
            if (res.ok) { const d = await res.json(); setCustomers(d.customers || []); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, [search, filterStage]);

    useEffect(() => { load(); }, [load]);

    function openCreate() { setEditId(null); setForm(EMPTY_FORM); setError(''); setShowModal(true); }
    function openEdit(c) {
        setEditId(c.id);
        setForm({ name:c.name||'', phone:c.phone||'', email:c.email||'', address:c.address||'', source:c.source||'', salesPerson:c.salesPerson||'', pipelineStage:c.pipelineStage||'Tư vấn', estimatedValue:c.estimatedValue||'', nextFollowUp:c.nextFollowUp?new Date(c.nextFollowUp).toISOString().split('T')[0]:'', notes:c.notes||'', gender:c.gender||'Nam', type:c.type||'Cá nhân' });
        setError(''); setShowModal(true);
    }

    async function handleSave() {
        if (!form.name.trim()) { setError('Tên khách hàng bắt buộc'); return; }
        if (!form.phone.trim()) { setError('Số điện thoại bắt buộc'); return; }
        setSaving(true); setError('');
        try {
            const url = editId ? `/api/laocai/customers/${editId}` : '/api/laocai/customers';
            const method = editId ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ...form, estimatedValue: parseFloat(form.estimatedValue)||0 }) });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Lỗi lưu'); return; }
            setShowModal(false); load();
        } catch(e) { setError('Lỗi kết nối'); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Xóa khách hàng này?')) return;
        await fetch(`/api/laocai/customers/${id}`, { method: 'DELETE' });
        load();
    }

    const f = (k, v) => setForm(p => ({...p, [k]: v}));

    return (
        <LcShell title="Khách hàng">
            {/* Toolbar */}
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm tên, SĐT, mã KH..." style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }} />
                <select value={filterStage} onChange={e=>setFilterStage(e.target.value)} style={{ padding:'8px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, background:C.white }}>
                    <option value="">Tất cả stage</option>
                    {STAGES.map(s=><option key={s}>{s}</option>)}
                </select>
                <button onClick={openCreate} style={{ padding:'8px 18px', borderRadius:9, border:'none', background:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>+ Thêm khách</button>
            </div>

            {/* Stats row */}
            <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                {[{label:'Tổng',count:customers.length,color:C.primary},...STAGES.map(s=>({label:s,count:customers.filter(c=>c.pipelineStage===s).length,color:STAGE_COLOR[s]}))].map(s=>(
                    <div key={s.label} onClick={()=>setFilterStage(filterStage===s.label?'':s.label)} style={{ padding:'5px 12px', borderRadius:20, background:filterStage===s.label||(!filterStage&&s.label==='Tổng')?s.color+'22':'#f1f5f9', color:s.color, fontSize:12, fontWeight:700, cursor:'pointer', border:`1px solid ${s.color}33` }}>
                        {s.label}: {s.count}
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ background:'#f8fafc' }}>
                                {['Mã KH','Khách hàng','SĐT','Pipeline','Sales','Giá trị','Follow-up','Ghi chú',''].map(h=>(
                                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.gray, letterSpacing:0.5, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [1,2,3,4,5].map(i=>(
                                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                                    {[1,2,3,4,5,6,7,8,9].map(j=><td key={j} style={{ padding:'11px 14px' }}><div style={{ height:13, background:'#e2e8f0', borderRadius:4 }}/></td>)}
                                </tr>
                            )) : customers.length === 0 ? (
                                <tr><td colSpan={9} style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:13 }}>
                                    {search||filterStage ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng — bấm "+ Thêm khách" để bắt đầu'}
                                </td></tr>
                            ) : customers.map((c,i)=>(
                                <tr key={c.id} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?C.white:'#fafafa', cursor:'pointer' }}
                                    onMouseEnter={e=>e.currentTarget.style.background='#f0fdfa'}
                                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.white:'#fafafa'}>
                                    <td style={{ padding:'10px 14px', fontSize:11, color:C.primary, fontWeight:700 }}>{c.code}</td>
                                    <td style={{ padding:'10px 14px' }} onClick={()=>openEdit(c)}>
                                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{c.name}</div>
                                        {c.email && <div style={{ fontSize:11, color:C.textMuted }}>{c.email}</div>}
                                    </td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.gray, whiteSpace:'nowrap' }}>{c.phone}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${STAGE_COLOR[c.pipelineStage]||C.primary}18`, color:STAGE_COLOR[c.pipelineStage]||C.primary, whiteSpace:'nowrap' }}>{c.pipelineStage||'—'}</span>
                                    </td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.gray }}>{c.salesPerson||'—'}</td>
                                    <td style={{ padding:'10px 14px', fontSize:12, fontWeight:600, color:C.text, whiteSpace:'nowrap' }}>{fmt(c.estimatedValue)||'—'}</td>
                                    <td style={{ padding:'10px 14px', fontSize:11, color:c.nextFollowUp&&new Date(c.nextFollowUp)<new Date()?'#ef4444':C.textMuted, whiteSpace:'nowrap' }}>{fmtDate(c.nextFollowUp)}</td>
                                    <td style={{ padding:'10px 14px', fontSize:11, color:C.gray, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.notes||''}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <div style={{ display:'flex', gap:5 }}>
                                            <button onClick={()=>openEdit(c)} style={{ padding:'4px 9px', borderRadius:7, border:`1px solid ${C.border}`, background:'none', fontSize:11, cursor:'pointer', color:C.gray }}>Sửa</button>
                                            <button onClick={()=>handleDelete(c.id)} style={{ padding:'4px 9px', borderRadius:7, border:'1px solid #fecaca', background:'none', fontSize:11, cursor:'pointer', color:'#ef4444' }}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={()=>setShowModal(false)}>
                    <div style={{ background:C.white, borderRadius:18, width:'100%', maxWidth:580, maxHeight:'90vh', overflow:'auto' }} onClick={e=>e.stopPropagation()}>
                        <div style={{ padding:'18px 22px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <h3 style={{ margin:0, fontSize:15, fontWeight:700 }}>{editId?'Sửa khách hàng':'Thêm khách hàng mới'}</h3>
                            <button onClick={()=>setShowModal(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:C.gray }}>×</button>
                        </div>
                        <div style={{ padding:'18px 22px' }}>
                            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:9, padding:'9px 13px', marginBottom:14, color:'#ef4444', fontSize:13 }}>{error}</div>}

                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
                                <div style={{ gridColumn:'1/-1' }}>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Tên khách hàng *</label>
                                    <input value={form.name} onChange={e=>f('name',e.target.value)} placeholder="Nguyễn Văn A" style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Số điện thoại *</label>
                                    <input value={form.phone} onChange={e=>f('phone',e.target.value)} placeholder="0901 234 567" style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Email</label>
                                    <input value={form.email} onChange={e=>f('email',e.target.value)} placeholder="email@example.com" style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Nhân viên KD</label>
                                    <input value={form.salesPerson} onChange={e=>f('salesPerson',e.target.value)} placeholder="Tên nhân viên" style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Giai đoạn</label>
                                    <select value={form.pipelineStage} onChange={e=>f('pipelineStage',e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, background:C.white, boxSizing:'border-box' }}>
                                        {STAGES.map(s=><option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Nguồn khách</label>
                                    <select value={form.source} onChange={e=>f('source',e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, background:C.white, boxSizing:'border-box' }}>
                                        <option value="">— Chọn nguồn —</option>
                                        {SOURCES.map(s=><option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Giá trị dự kiến (đ)</label>
                                    <input type="number" value={form.estimatedValue} onChange={e=>f('estimatedValue',e.target.value)} placeholder="0" style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Lịch follow-up</label>
                                    <input type="date" value={form.nextFollowUp} onChange={e=>f('nextFollowUp',e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                </div>
                                <div style={{ gridColumn:'1/-1' }}>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Địa chỉ</label>
                                    <input value={form.address} onChange={e=>f('address',e.target.value)} placeholder="Địa chỉ khách hàng" style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none' }} />
                                </div>
                                <div style={{ gridColumn:'1/-1' }}>
                                    <label style={{ fontSize:11, fontWeight:600, color:C.gray, display:'block', marginBottom:4 }}>Ghi chú</label>
                                    <textarea value={form.notes} onChange={e=>f('notes',e.target.value)} rows={3} placeholder="Ghi chú thêm..." style={{ width:'100%', padding:'9px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', outline:'none', resize:'vertical' }} />
                                </div>
                            </div>
                        </div>
                        <div style={{ padding:'14px 22px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:9 }}>
                            <button onClick={()=>setShowModal(false)} style={{ padding:'9px 18px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:13, cursor:'pointer' }}>Hủy</button>
                            <button onClick={handleSave} disabled={saving} style={{ padding:'9px 22px', borderRadius:9, border:'none', background:saving?C.gray:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:saving?'not-allowed':'pointer' }}>
                                {saving ? 'Đang lưu...' : editId ? '💾 Cập nhật' : '💾 Thêm mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}
