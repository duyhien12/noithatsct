'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };
const STATUS_COLOR = { 'Nháp':'#94a3b8','Đang ký':'#3b82f6','Hiệu lực':'#10b981','Hoàn thành':'#64748b','Hủy':'#ef4444' };

function fmt(n) { if (!n) return '0'; if (n>=1e9) return (n/1e9).toFixed(1)+' tỷ'; if (n>=1e6) return (n/1e6).toFixed(1)+' tr'; return n.toLocaleString('vi-VN'); }
function fmtDate(d) { if (!d) return '—'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; }

export default function LcContracts() {
    const router = useRouter();
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/laocai/contracts');
            if (res.ok) { const d = await res.json(); setContracts(d.contracts||[]); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = contracts.filter(c =>
        !search ||
        c.code?.toLowerCase().includes(search.toLowerCase()) ||
        c.customer?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const activeValue = contracts.filter(c=>c.status==='Hiệu lực').reduce((a,c)=>a+(c.contractValue||0),0);

    return (
        <LcShell title="Hợp Đồng">
            <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Tìm mã HĐ, khách hàng..." style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }} />
                <button onClick={load} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:12, color:C.gray, cursor:'pointer' }}>↻</button>
            </div>

            {!loading && (
                <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
                    <div style={{ padding:'6px 14px', borderRadius:10, background:'#f0fdfa', border:`1px solid ${C.primary}33`, fontSize:12, color:C.primary, fontWeight:700 }}>Tổng: {contracts.length} hợp đồng</div>
                    {activeValue>0 && <div style={{ padding:'6px 14px', borderRadius:10, background:'#ecfdf5', border:'1px solid #86efac', fontSize:12, color:'#10b981', fontWeight:700 }}>Đang hiệu lực: {fmt(activeValue)} đ</div>}
                </div>
            )}

            <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ background:'#f8fafc' }}>
                                {['Mã HĐ','Khách hàng','Loại','Giá trị HĐ','Trạng thái','Ngày ký','Ngày bắt đầu','Ngày KT',''].map(h=>(
                                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.gray, letterSpacing:0.5, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [1,2,3].map(i=>(
                                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                                    {[1,2,3,4,5,6,7,8,9].map(j=><td key={j} style={{ padding:'11px 14px' }}><div style={{ height:13, background:'#e2e8f0', borderRadius:4 }}/></td>)}
                                </tr>
                            )) : filtered.length===0 ? (
                                <tr><td colSpan={9} style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:13 }}>
                                    {contracts.length===0 ? 'Chưa có hợp đồng nào cho chi nhánh Lào Cai' : 'Không tìm thấy kết quả'}
                                </td></tr>
                            ) : filtered.map((c,i)=>(
                                <tr key={c.id} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?C.white:'#fafafa', cursor:'pointer' }}
                                    onMouseEnter={e=>e.currentTarget.style.background='#f0fdfa'}
                                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.white:'#fafafa'}
                                    onClick={()=>router.push(`/contracts/${c.id}`)}>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.primary, fontWeight:700 }}>{c.code}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{c.customer?.name||'—'}</div>
                                        <div style={{ fontSize:11, color:C.textMuted }}>{c.customer?.phone}</div>
                                    </td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.gray }}>{c.type||'Thi công'}</td>
                                    <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:C.text, whiteSpace:'nowrap' }}>{fmt(c.contractValue)} đ</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:20, background:`${STATUS_COLOR[c.status]||C.gray}18`, color:STATUS_COLOR[c.status]||C.gray }}>{c.status||'Nháp'}</span>
                                    </td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted, whiteSpace:'nowrap' }}>{fmtDate(c.signDate)}</td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted, whiteSpace:'nowrap' }}>{fmtDate(c.startDate)}</td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted, whiteSpace:'nowrap' }}>{fmtDate(c.endDate)}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <button onClick={e=>{e.stopPropagation();router.push(`/contracts/${c.id}`);}} style={{ padding:'4px 9px', borderRadius:7, border:`1px solid ${C.border}`, background:'none', fontSize:11, cursor:'pointer', color:C.gray }}>Xem</button>
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
