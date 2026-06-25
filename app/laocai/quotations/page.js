'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };
const STATUS_COLOR = { 'Nháp':'#94a3b8','Gửi KH':'#3b82f6','Chờ duyệt':'#f59e0b','Đã duyệt':'#10b981','Từ chối':'#ef4444','Hủy':'#ef4444' };

function fmt(n) { if (!n) return '0'; if (n>=1e9) return (n/1e9).toFixed(1)+' tỷ'; if (n>=1e6) return (n/1e6).toFixed(1)+' tr'; return n.toLocaleString('vi-VN'); }
function fmtDate(d) { if (!d) return '—'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; }

export default function LcQuotations() {
    const router = useRouter();
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/laocai/quotations');
            if (res.ok) { const d = await res.json(); setQuotations(d.quotations||[]); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = quotations.filter(q =>
        !search ||
        q.code?.toLowerCase().includes(search.toLowerCase()) ||
        q.customer?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const totalValue = quotations.reduce((a,q)=>a+(q.grandTotal||0),0);

    return (
        <LcShell title="Báo Giá">
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm mã báo giá, khách hàng..." style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }} />
                <button onClick={load} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:12, color:C.gray, cursor:'pointer' }}>↻</button>
            </div>

            {!loading && (
                <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                    <div style={{ padding:'6px 14px', borderRadius:10, background:'#f0fdfa', border:`1px solid ${C.primary}33`, fontSize:12, color:C.primary, fontWeight:700 }}>Tổng: {quotations.length} báo giá</div>
                    <div style={{ padding:'6px 14px', borderRadius:10, background:'#f0fdfa', border:`1px solid ${C.primary}33`, fontSize:12, color:C.primary, fontWeight:700 }}>Tổng giá trị: {fmt(totalValue)} đ</div>
                </div>
            )}

            <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ background:'#f8fafc' }}>
                                {['Mã BG','Khách hàng','Loại','Tổng tiền','Trạng thái','Ngày tạo',''].map(h=>(
                                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.gray, letterSpacing:0.5, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [1,2,3].map(i=>(
                                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                                    {[1,2,3,4,5,6,7].map(j=><td key={j} style={{ padding:'11px 14px' }}><div style={{ height:13, background:'#e2e8f0', borderRadius:4 }}/></td>)}
                                </tr>
                            )) : filtered.length===0 ? (
                                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:13 }}>
                                    {quotations.length===0 ? 'Chưa có báo giá nào cho chi nhánh Lào Cai' : 'Không tìm thấy kết quả'}
                                </td></tr>
                            ) : filtered.map((q,i)=>(
                                <tr key={q.id} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?C.white:'#fafafa', cursor:'pointer' }}
                                    onMouseEnter={e=>e.currentTarget.style.background='#f0fdfa'}
                                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.white:'#fafafa'}
                                    onClick={()=>router.push(`/quotations/${q.id}`)}>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.primary, fontWeight:700 }}>{q.code}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{q.customer?.name||'—'}</div>
                                        <div style={{ fontSize:11, color:C.textMuted }}>{q.customer?.code}</div>
                                    </td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.gray }}>{q.type||'Thi công'}</td>
                                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:C.text, whiteSpace:'nowrap' }}>{fmt(q.grandTotal)} đ</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:`${STATUS_COLOR[q.status]||C.gray}18`, color:STATUS_COLOR[q.status]||C.gray }}>{q.status||'Nháp'}</span>
                                    </td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted, whiteSpace:'nowrap' }}>{fmtDate(q.createdAt)}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <button onClick={e=>{e.stopPropagation();router.push(`/quotations/${q.id}`);}} style={{ padding:'4px 9px', borderRadius:7, border:`1px solid ${C.border}`, background:'none', fontSize:11, cursor:'pointer', color:C.gray }}>Xem</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </LcShell>
    );
}
