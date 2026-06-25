'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };

function fmt(n) { if (!n && n!==0) return '—'; return n.toLocaleString('vi-VN'); }

export default function LcProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '100', page: '1' });
            if (search) params.set('search', search);
            const res = await fetch(`/api/products?${params}`);
            if (res.ok) {
                const d = await res.json();
                setProducts(d.data || []);
                setTotal(d.pagination?.total || d.data?.length || 0);
            }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, [search]);

    useEffect(() => { const t = setTimeout(load, search ? 350 : 0); return ()=>clearTimeout(t); }, [load, search]);

    return (
        <LcShell title="Sản Phẩm">
            <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
                <input
                    value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="🔍 Tìm sản phẩm, mã SKU..."
                    style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }}
                />
                <button onClick={load} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:12, color:C.gray, cursor:'pointer' }}>↻</button>
            </div>

            {!loading && <div style={{ marginBottom:12, fontSize:12, color:C.textMuted }}>Hiển thị {products.length} / {total} sản phẩm</div>}

            <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ background:'#f8fafc' }}>
                                {['Mã SKU','Tên sản phẩm','Danh mục','Đơn giá','Đơn vị','Nhà CC',''].map(h=>(
                                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.gray, letterSpacing:0.5, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [1,2,3,4,5].map(i=>(
                                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                                    {[1,2,3,4,5,6,7].map(j=><td key={j} style={{ padding:'11px 14px' }}><div style={{ height:13, background:'#e2e8f0', borderRadius:4 }}/></td>)}
                                </tr>
                            )) : products.length===0 ? (
                                <tr><td colSpan={7} style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:13 }}>
                                    {search ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm nào trong hệ thống'}
                                </td></tr>
                            ) : products.map((p,i)=>(
                                <tr key={p.id} style={{ borderTop:`1px solid ${C.border}`, background:i%2===0?C.white:'#fafafa' }}
                                    onMouseEnter={e=>e.currentTarget.style.background='#f0fdfa'}
                                    onMouseLeave={e=>e.currentTarget.style.background=i%2===0?C.white:'#fafafa'}>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.primary, fontWeight:700 }}>{p.code||'—'}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{p.name}</div>
                                        {p.description && <div style={{ fontSize:11, color:C.textMuted, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:240 }}>{p.description}</div>}
                                    </td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.gray }}>{p.categoryRef?.name||p.category?.name||'—'}</td>
                                    <td style={{ padding:'10px 14px', fontSize:12, fontWeight:600, color:C.text, whiteSpace:'nowrap' }}>
                                        {p.price!=null ? fmt(p.price)+' đ' : '—'}
                                    </td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.gray }}>{p.unit||'—'}</td>
                                    <td style={{ padding:'10px 14px', fontSize:12, color:C.gray }}>{p.supplier||'—'}</td>
                                    <td style={{ padding:'10px 14px' }}>
                                        {p.imageUrl && (
                                            <img src={p.imageUrl} alt={p.name} style={{ width:36, height:36, objectFit:'cover', borderRadius:7, border:`1px solid ${C.border}` }} />
                                        )}
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
