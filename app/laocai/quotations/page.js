'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', muted:'#94a3b8', bg:'#f8fafc' };

const STATUS_COLOR = {
    'Nháp':     '#94a3b8',
    'Gửi KH':   '#3b82f6',
    'Chờ duyệt':'#f59e0b',
    'Đã duyệt': '#10b981',
    'Từ chối':  '#ef4444',
    'Hủy':      '#ef4444',
};
const QUOTATION_TYPES = ['Báo giá nội thất','Thi công thô','Thi công nội thất','Cung cấp vật tư','Trọn gói','Thiết kế'];

function fmt(n) { if (!n) return '0'; if (n>=1e9) return (n/1e9).toFixed(1)+' tỷ'; if (n>=1e6) return Math.round(n/1e6)+' tr'; return n.toLocaleString('vi-VN'); }
function fmtDate(d) { if (!d) return '—'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; }

function KpiCard({ icon, value, label, color, lightBg }) {
    return (
        <div style={{ background:C.white, borderRadius:16, padding:'20px 22px', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:16, flex:'1 1 0', minWidth:140, boxShadow:'0 1px 4px rgba(0,0,0,0.05)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, borderRadius:'16px 16px 0 0' }} />
            <div style={{ width:50, height:50, borderRadius:14, background:lightBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>{icon}</div>
            <div>
                <div style={{ fontSize:22, fontWeight:800, color:C.text, lineHeight:1.1 }}>{value}</div>
                <div style={{ fontSize:12, color:C.gray, marginTop:4, fontWeight:500 }}>{label}</div>
            </div>
        </div>
    );
}

export default function LcQuotations() {
    const router = useRouter();
    const [quotations, setQuotations] = useState([]);
    const [templates, setTemplates]   = useState([]);
    const [customers, setCustomers]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    // Create modal state
    const [showModal, setShowModal]     = useState(false);
    const [selTemplate, setSelTemplate] = useState(null); // null = blank, object = template
    const [modalStep, setModalStep]     = useState(1);    // 1=pick template, 2=fill form
    const [form, setForm] = useState({ customerId:'', type:'Báo giá nội thất', notes:'', vat:10, discount:0, managementFeeRate:5, designFee:0 });
    const [creating, setCreating]       = useState(false);
    const [createErr, setCreateErr]     = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [qRes, tRes, cRes] = await Promise.all([
                fetch('/api/laocai/quotations'),
                fetch('/api/quotation-templates?limit=50'),
                fetch('/api/laocai/customers'),
            ]);
            if (qRes.ok) { const d = await qRes.json(); setQuotations(d.quotations||[]); }
            if (tRes.ok) { const d = await tRes.json(); setTemplates(d.data||[]); }
            if (cRes.ok) { const d = await cRes.json(); setCustomers(d.customers||[]); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = quotations.filter(q => {
        const ms = !search || q.code?.toLowerCase().includes(search.toLowerCase()) || q.customer?.name?.toLowerCase().includes(search.toLowerCase());
        const mst = !statusFilter || q.status === statusFilter;
        return ms && mst;
    });

    function openCreate() {
        setSelTemplate(null);
        setModalStep(1);
        setForm({ customerId:'', type:'Báo giá nội thất', notes:'', vat:10, discount:0, managementFeeRate:5, designFee:0 });
        setCreateErr('');
        setShowModal(true);
    }

    function pickTemplate(t) {
        setSelTemplate(t);
        setForm(f => ({ ...f, type: t?.type||'Báo giá nội thất', vat: t?.vat||10, discount: t?.discount||0, managementFeeRate: t?.managementFeeRate||5, designFee: t?.designFee||0 }));
        setModalStep(2);
    }

    async function handleCreate() {
        if (!form.customerId) { setCreateErr('Vui lòng chọn khách hàng'); return; }
        setCreating(true); setCreateErr('');
        try {
            const payload = {
                customerId: form.customerId,
                type: form.type,
                notes: form.notes,
                status: 'Nháp',
                vat: Number(form.vat),
                discount: Number(form.discount),
                managementFeeRate: Number(form.managementFeeRate),
                designFee: Number(form.designFee),
                categories: selTemplate?.categories?.map(cat => ({
                    name: cat.name,
                    group: '',
                    items: (cat.items||[]).map(item => ({
                        name: item.name,
                        unit: item.unit||'',
                        quantity: item.quantity||0,
                        mainMaterial: item.mainMaterial||0,
                        auxMaterial: item.auxMaterial||0,
                        labor: item.labor||0,
                        unitPrice: item.unitPrice||0,
                        amount: item.amount||0,
                        length: item.length||0,
                        width: item.width||0,
                        height: item.height||0,
                        volume: item.volume||0,
                        description: item.description||'',
                    })),
                })) || [],
            };
            const res = await fetch('/api/quotations', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) { setCreateErr(data.error||'Lỗi tạo báo giá'); return; }
            setShowModal(false);
            router.push(`/laocai/quotations/${data.id}`);
        } catch(e) { setCreateErr('Lỗi kết nối'); }
        finally { setCreating(false); }
    }

    const fld = (k,v) => setForm(p=>({...p,[k]:v}));

    // KPI
    const totalVal = quotations.reduce((a,q)=>a+(q.grandTotal||0),0);
    const countNhap = quotations.filter(q=>q.status==='Nháp').length;
    const countApproved = quotations.filter(q=>q.status==='Đã duyệt').length;
    const countSent = quotations.filter(q=>q.status==='Gửi KH').length;

    return (
        <LcShell title="Báo Giá">

            {/* KPI */}
            <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
                <KpiCard icon="📋" value={loading?'…':quotations.length} label="Tổng báo giá"   color="#0f766e" lightBg="#f0fdf4" />
                <KpiCard icon="✏️"  value={loading?'…':countNhap}        label="Nháp"           color="#94a3b8" lightBg="#f8fafc" />
                <KpiCard icon="📤" value={loading?'…':countSent}         label="Đã gửi KH"     color="#3b82f6" lightBg="#eff6ff" />
                <KpiCard icon="✅" value={loading?'…':countApproved}     label="Đã duyệt"      color="#10b981" lightBg="#f0fdf4" />
                <KpiCard icon="💰" value={loading?'…':fmt(totalVal)}     label="Tổng giá trị"  color="#7c3aed" lightBg="#f5f3ff" />
            </div>

            {/* ── Action bar ── */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, padding:'12px 18px', background:C.white, borderRadius:12, border:`1px solid ${C.border}`, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                    <span style={{ fontSize:15 }}>📐</span>
                    <span style={{ fontSize:13, fontWeight:600, color:C.text }}>Mẫu báo giá</span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#f0fdf4', color:C.primary, border:`1px solid ${C.primary}33` }}>{templates.length}</span>
                </div>
                <button onClick={openCreate} style={{ padding:'8px 18px', borderRadius:9, border:'none', background:C.primary, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:`0 2px 8px ${C.primary}55` }}>
                    + Tạo báo giá
                </button>
            </div>

            {/* ── Danh sách báo giá ── */}
            <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:200, position:'relative' }}>
                    <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.muted, fontSize:14, pointerEvents:'none' }}>🔍</span>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm mã báo giá, khách hàng..."
                        style={{ width:'100%', padding:'9px 12px 9px 36px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, outline:'none', boxSizing:'border-box', background:C.white }} />
                </div>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
                    style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${statusFilter?STATUS_COLOR[statusFilter]:C.border}`, fontSize:13, background:C.white, color:statusFilter?STATUS_COLOR[statusFilter]:C.gray, fontWeight:statusFilter?700:400, minWidth:150 }}>
                    <option value="">Tất cả trạng thái</option>
                    {Object.keys(STATUS_COLOR).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={load} style={{ padding:'9px 14px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, fontSize:13, color:C.gray, cursor:'pointer' }}>↻</button>
            </div>

            <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ background:C.bg }}>
                                {['Mã BG','Khách hàng','Loại','Tổng tiền','Trạng thái','Ngày tạo',''].map(h=>(
                                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:C.muted, letterSpacing:0.6, textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:`1px solid ${C.border}` }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [1,2,3].map(i=>(
                                <tr key={i}><td colSpan={7} style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}` }}><div style={{ height:14, background:'#e2e8f0', borderRadius:4 }}/></td></tr>
                            )) : filtered.length===0 ? (
                                <tr><td colSpan={7} style={{ padding:'48px', textAlign:'center', color:C.muted, fontSize:13 }}>
                                    {quotations.length===0 ? '📋 Chưa có báo giá nào — chọn mẫu bên trên để tạo mới' : '🔍 Không tìm thấy kết quả phù hợp'}
                                </td></tr>
                            ) : filtered.map(q => {
                                const sc = STATUS_COLOR[q.status]||C.gray;
                                return (
                                    <tr key={q.id} style={{ borderBottom:`1px solid ${C.border}`, background:C.white, cursor:'pointer' }}
                                        onMouseEnter={e=>e.currentTarget.style.background='#f0fdfa'}
                                        onMouseLeave={e=>e.currentTarget.style.background=C.white}
                                        onClick={()=>router.push(`/laocai/quotations/${q.id}`)}>
                                        <td style={{ padding:'11px 16px', fontSize:12, color:C.primary, fontWeight:700 }}>{q.code}</td>
                                        <td style={{ padding:'11px 16px' }}>
                                            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{q.customer?.name||'—'}</div>
                                            {q.customer?.code && <div style={{ fontSize:11, color:C.muted }}>{q.customer.code}</div>}
                                        </td>
                                        <td style={{ padding:'11px 16px', fontSize:12, color:C.gray }}>{q.type||'—'}</td>
                                        <td style={{ padding:'11px 16px', fontSize:13, fontWeight:700, color:'#10b981', whiteSpace:'nowrap' }}>{fmt(q.grandTotal)} đ</td>
                                        <td style={{ padding:'11px 16px' }}>
                                            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:`${sc}15`, color:sc, border:`1px solid ${sc}33` }}>{q.status||'Nháp'}</span>
                                        </td>
                                        <td style={{ padding:'11px 16px', fontSize:12, color:C.muted, whiteSpace:'nowrap' }}>{fmtDate(q.createdAt)}</td>
                                        <td style={{ padding:'11px 16px' }}>
                                            <button onClick={e=>{e.stopPropagation();router.push(`/laocai/quotations/${q.id}`);}}
                                                style={{ padding:'5px 12px', borderRadius:8, border:`1px solid ${C.border}`, background:'none', fontSize:11, cursor:'pointer', color:C.gray, fontWeight:500 }}>Xem</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Create Modal ── */}
            {showModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16, backdropFilter:'blur(2px)' }}
                    onClick={()=>setShowModal(false)}>
                    <div style={{ background:C.white, borderRadius:20, width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
                        onClick={e=>e.stopPropagation()}>

                        {/* Header */}
                        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                {modalStep===2 && (
                                    <button onClick={()=>setModalStep(1)} style={{ width:28, height:28, borderRadius:7, border:`1px solid ${C.border}`, background:C.bg, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', color:C.gray }}>←</button>
                                )}
                                <div>
                                    <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:C.text }}>
                                        {modalStep===1 ? 'Tạo báo giá mới' : 'Thông tin báo giá'}
                                    </h3>
                                    <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                                        Bước {modalStep}/2 — {modalStep===1 ? 'Chọn mẫu hoặc tạo trống' : selTemplate ? `Từ mẫu: ${selTemplate.name}` : 'Báo giá trống'}
                                    </div>
                                </div>
                            </div>
                            <button onClick={()=>setShowModal(false)} style={{ width:32, height:32, borderRadius:8, background:C.bg, border:`1px solid ${C.border}`, fontSize:18, cursor:'pointer', color:C.gray, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                        </div>

                        {/* Step 1 – Pick template or blank */}
                        {modalStep===1 && (
                            <div style={{ padding:'20px 24px' }}>
                                <p style={{ margin:'0 0 14px', fontSize:13, color:C.gray }}>Chọn mẫu để điền sẵn hạng mục, hoặc tạo báo giá trống và nhập tay.</p>

                                {/* Blank option */}
                                <button onClick={()=>{ setSelTemplate(null); setModalStep(2); }}
                                    style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:12, border:`2px dashed ${C.border}`, background:C.bg, cursor:'pointer', marginBottom:14, textAlign:'left' }}
                                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.primary; e.currentTarget.style.background='#f0fdfa'; }}
                                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.bg; }}>
                                    <div style={{ width:38, height:38, borderRadius:10, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>📄</div>
                                    <div>
                                        <div style={{ fontSize:13, fontWeight:700, color:C.text }}>Tạo báo giá trống</div>
                                        <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>Không dùng mẫu — tự nhập hạng mục</div>
                                    </div>
                                    <span style={{ marginLeft:'auto', color:C.muted, fontSize:16 }}>→</span>
                                </button>

                                {/* Template list */}
                                {templates.length > 0 && (
                                    <>
                                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                                            <div style={{ flex:1, height:1, background:C.border }} />
                                            <span style={{ fontSize:11, color:C.muted, fontWeight:600, whiteSpace:'nowrap' }}>hoặc chọn mẫu có sẵn</span>
                                            <div style={{ flex:1, height:1, background:C.border }} />
                                        </div>
                                        <div style={{ display:'flex', flexDirection:'column', gap:7, maxHeight:320, overflowY:'auto', paddingRight:2 }}>
                                            {templates.map(t => {
                                                const itemCount = t.categories?.reduce((a,cat)=>a+(cat.items?.length||0),0)||0;
                                                return (
                                                    <button key={t.id} onClick={()=>pickTemplate(t)}
                                                        style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 14px', borderRadius:11, border:`1px solid ${C.border}`, background:C.white, cursor:'pointer', textAlign:'left', width:'100%' }}
                                                        onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.primary; e.currentTarget.style.background='#f0fdfa'; e.currentTarget.style.boxShadow=`0 2px 8px rgba(15,118,110,0.08)`; }}
                                                        onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.white; e.currentTarget.style.boxShadow='none'; }}>
                                                        <div style={{ width:38, height:38, borderRadius:10, background:`${C.primary}12`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:19, flexShrink:0 }}>📐</div>
                                                        <div style={{ flex:1, minWidth:0 }}>
                                                            <div style={{ fontSize:13, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                                                            <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{t.categories?.length||0} phòng • {itemCount} hạng mục con</div>
                                                        </div>
                                                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20, background:`${C.primary}12`, color:C.primary, whiteSpace:'nowrap', flexShrink:0 }}>{t.type||'—'}</span>
                                                        <span style={{ color:C.muted, fontSize:14, flexShrink:0 }}>→</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                                {!loading && templates.length===0 && (
                                    <div style={{ textAlign:'center', padding:'16px 0', color:C.muted, fontSize:12 }}>📭 Chưa có mẫu — tạo mẫu từ trang quản trị chính</div>
                                )}
                            </div>
                        )}

                        {/* Step 2 – Fill form */}
                        {modalStep===2 && (
                            <div style={{ padding:'20px 24px' }}>
                                {createErr && (
                                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'10px 14px', marginBottom:16, color:'#dc2626', fontSize:13 }}>⚠️ {createErr}</div>
                                )}

                                {selTemplate && (
                                    <div style={{ marginBottom:16, padding:'10px 14px', background:'#f0fdfa', borderRadius:10, border:`1px solid ${C.primary}33`, display:'flex', alignItems:'center', gap:10 }}>
                                        <span style={{ fontSize:16 }}>📐</span>
                                        <div style={{ flex:1 }}>
                                            <div style={{ fontSize:13, color:C.primary, fontWeight:700 }}>{selTemplate.name}</div>
                                            <div style={{ fontSize:11, color:C.muted }}>{selTemplate.categories?.length||0} phòng • {selTemplate.categories?.reduce((a,c)=>a+(c.items?.length||0),0)||0} hạng mục con</div>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                                    <div style={{ gridColumn:'1/-1' }}>
                                        <label style={lbl}>Khách hàng *</label>
                                        <select value={form.customerId} onChange={e=>fld('customerId',e.target.value)} style={inp()}>
                                            <option value="">— Chọn khách hàng —</option>
                                            {customers.map(c=><option key={c.id} value={c.id}>{c.name} {c.code?`(${c.code})`:''}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ gridColumn:'1/-1' }}>
                                        <label style={lbl}>Loại báo giá</label>
                                        <select value={form.type} onChange={e=>fld('type',e.target.value)} style={inp()}>
                                            {QUOTATION_TYPES.map(t=><option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={lbl}>VAT (%)</label>
                                        <input type="number" value={form.vat} onChange={e=>fld('vat',e.target.value)} style={inp()} />
                                    </div>
                                    <div>
                                        <label style={lbl}>Chiết khấu (%)</label>
                                        <input type="number" value={form.discount} onChange={e=>fld('discount',e.target.value)} style={inp()} />
                                    </div>
                                    <div style={{ gridColumn:'1/-1' }}>
                                        <label style={lbl}>Ghi chú</label>
                                        <textarea value={form.notes} onChange={e=>fld('notes',e.target.value)} rows={2} placeholder="Ghi chú cho báo giá..."
                                            style={{ ...inp(), resize:'vertical' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ padding:'14px 24px', borderTop:`1px solid ${C.border}`, display:'flex', justifyContent:'flex-end', gap:10, background:C.bg, borderRadius:'0 0 20px 20px' }}>
                            <button onClick={()=>setShowModal(false)} style={{ padding:'9px 18px', borderRadius:10, border:`1px solid ${C.border}`, background:C.white, fontSize:13, cursor:'pointer', fontWeight:500, color:C.gray }}>Hủy</button>
                            {modalStep===2 && (
                                <button onClick={handleCreate} disabled={creating}
                                    style={{ padding:'9px 22px', borderRadius:10, border:'none', background:creating?C.gray:C.primary, color:'#fff', fontWeight:700, fontSize:13, cursor:creating?'not-allowed':'pointer', boxShadow:creating?'none':`0 2px 8px ${C.primary}55` }}>
                                    {creating ? 'Đang tạo…' : '📋 Tạo báo giá'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}

const lbl = { fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 };
function inp() {
    return { width:'100%', padding:'10px 13px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:13, boxSizing:'border-box', outline:'none', background:'#fff', fontFamily:'inherit' };
}
