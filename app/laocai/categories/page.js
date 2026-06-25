'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };

function CategoryRow({ cat, depth = 0 }) {
    const [open, setOpen] = useState(depth === 0);
    const hasChildren = cat.children && cat.children.length > 0;
    const count = cat._count?.products ?? 0;

    return (
        <>
            <tr style={{ borderTop:`1px solid ${C.border}`, background: depth===0?C.white : depth===1?'#fafafa':'#f5f5f5' }}>
                <td style={{ padding:'10px 14px', paddingLeft: 14 + depth*24 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {hasChildren && (
                            <button onClick={()=>setOpen(o=>!o)} style={{ width:20, height:20, borderRadius:5, border:`1px solid ${C.border}`, background:C.white, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:C.gray, flexShrink:0 }}>
                                {open?'▾':'▸'}
                            </button>
                        )}
                        {!hasChildren && <div style={{ width:20 }} />}
                        <span style={{ fontSize: depth===0?14:13, fontWeight: depth===0?700:500, color:C.text }}>{cat.name}</span>
                    </div>
                </td>
                <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted }}>{cat.supplier||'—'}</td>
                <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:'2px 9px', borderRadius:20, background:count>0?'#f0fdfa':'#f8fafc', color:count>0?C.primary:C.textMuted, border:`1px solid ${count>0?C.primary+'33':C.border}` }}>{count} SP</span>
                </td>
                <td style={{ padding:'10px 14px', fontSize:12, color:C.textMuted }}>{hasChildren?`${cat.children.length} nhóm con`:'—'}</td>
            </tr>
            {open && hasChildren && cat.children.map(child => (
                <CategoryRow key={child.id} cat={child} depth={depth+1} />
            ))}
        </>
    );
}

export default function LcCategories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/product-categories');
            if (res.ok) { const d = await res.json(); setCategories(Array.isArray(d)?d:[]); }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const totalCats = categories.reduce((a,c)=>a+1+(c.children?.length||0)+(c.children?.reduce((b,ch)=>b+(ch.children?.length||0),0)||0),0);
    const totalProducts = categories.reduce((a,c)=>{
        const sum = (cc) => (cc._count?.products||0) + (cc.children||[]).reduce((s,ch)=>s+sum(ch),0);
        return a + sum(c);
    },0);

    return (
        <LcShell title="Danh Mục Sản Phẩm">
            <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
                <div style={{ display:'flex', gap:10 }}>
                    {!loading && <>
                        <span style={{ padding:'6px 14px', borderRadius:20, background:'#f0fdfa', border:`1px solid ${C.primary}33`, fontSize:12, color:C.primary, fontWeight:700 }}>{totalCats} danh mục</span>
                        <span style={{ padding:'6px 14px', borderRadius:20, background:'#f0fdfa', border:`1px solid ${C.primary}33`, fontSize:12, color:C.primary, fontWeight:700 }}>{totalProducts} sản phẩm</span>
                    </>}
                </div>
                <button onClick={load} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:12, color:C.gray, cursor:'pointer' }}>↻</button>
            </div>

            <div style={{ background:C.white, borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ background:'#f8fafc' }}>
                                {['Tên danh mục','Nhà cung cấp','Số sản phẩm','Nhóm con'].map(h=>(
                                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:C.gray, letterSpacing:0.5, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [1,2,3,4,5].map(i=>(
                                <tr key={i} style={{ borderTop:`1px solid ${C.border}` }}>
                                    {[1,2,3,4].map(j=><td key={j} style={{ padding:'11px 14px' }}><div style={{ height:13, background:'#e2e8f0', borderRadius:4 }}/></td>)}
                                </tr>
                            )) : categories.length===0 ? (
                                <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:C.textMuted, fontSize:13 }}>Chưa có danh mục sản phẩm nào</td></tr>
                            ) : categories.map(cat=>(
                                <CategoryRow key={cat.id} cat={cat} depth={0} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </LcShell>
    );
}
