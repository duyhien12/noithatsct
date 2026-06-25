'use client';
import { useState, useEffect, useCallback } from 'react';
import LcShell from '../_components/LcShell';

const C = { primary:'#0f766e', white:'#fff', gray:'#64748b', border:'#e2e8f0', text:'#1e293b', textMuted:'#94a3b8' };

function fmtDate(d) { if (!d) return '—'; const dt=new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`; }

export default function LcStaff() {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptId, setDeptId] = useState('');
    const [total, setTotal] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit:'100', page:'1' });
            if (search) params.set('search', search);
            if (deptId) params.set('departmentId', deptId);
            const res = await fetch(`/api/employees?${params}`);
            if (res.ok) {
                const d = await res.json();
                setEmployees(d.data || []);
                setTotal(d.total || 0);
                if (d.departments) setDepartments(d.departments);
            }
        } catch(e) { console.error(e); }
        finally { setLoading(false); }
    }, [search, deptId]);

    useEffect(() => { const t = setTimeout(load, search ? 350 : 0); return ()=>clearTimeout(t); }, [load, search]);

    return (
        <LcShell title="Nhân Viên">
            <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
                <input
                    value={search} onChange={e=>setSearch(e.target.value)}
                    placeholder="🔍 Tìm tên nhân viên..."
                    style={{ flex:1, minWidth:200, padding:'8px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, outline:'none' }}
                />
                {departments.length > 0 && (
                    <select value={deptId} onChange={e=>setDeptId(e.target.value)} style={{ padding:'8px 12px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:13, background:C.white, color:C.text, minWidth:150 }}>
                        <option value="">Tất cả phòng ban</option>
                        {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                )}
                <button onClick={load} style={{ padding:'8px 14px', borderRadius:9, border:`1px solid ${C.border}`, background:C.white, fontSize:12, color:C.gray, cursor:'pointer' }}>↻</button>
            </div>

            {!loading && <div style={{ marginBottom:12, fontSize:12, color:C.textMuted }}>Hiển thị {employees.length} / {total} nhân viên</div>}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                {loading ? [1,2,3,4,5,6].map(i=>(
                    <div key={i} style={{ background:C.white, borderRadius:14, padding:18, border:`1px solid ${C.border}`, display:'flex', gap:12, alignItems:'center' }}>
                        <div style={{ width:48, height:48, borderRadius:12, background:'#e2e8f0', flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                            <div style={{ height:14, background:'#e2e8f0', borderRadius:4, marginBottom:8, width:'60%' }} />
                            <div style={{ height:12, background:'#e2e8f0', borderRadius:4, width:'40%' }} />
                        </div>
                    </div>
                )) : employees.length===0 ? (
                    <div style={{ gridColumn:'1/-1', textAlign:'center', color:C.textMuted, fontSize:13, padding:'40px 0' }}>
                        {search ? 'Không tìm thấy nhân viên phù hợp' : 'Chưa có nhân viên nào trong hệ thống'}
                    </div>
                ) : employees.map(e=>(
                    <div key={e.id} style={{ background:C.white, borderRadius:14, padding:18, border:`1px solid ${C.border}`, display:'flex', gap:12, alignItems:'flex-start', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}
                        onMouseEnter={ev=>ev.currentTarget.style.boxShadow='0 3px 10px rgba(0,0,0,0.09)'}
                        onMouseLeave={ev=>ev.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'}>
                        <div style={{ width:48, height:48, borderRadius:12, background:`${C.primary}15`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:18, color:C.primary, flexShrink:0 }}>
                            {e.name?.[0] || '?'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:2 }}>{e.name}</div>
                            <div style={{ fontSize:12, color:C.gray, marginBottom:4 }}>{e.department?.name||'—'}</div>
                            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                {e.phone && <span style={{ fontSize:11, color:C.textMuted }}>📱 {e.phone}</span>}
                                {e.email && <span style={{ fontSize:11, color:C.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>✉️ {e.email}</span>}
                            </div>
                            {e.startDate && <div style={{ fontSize:11, color:C.textMuted, marginTop:4 }}>Từ {fmtDate(e.startDate)}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </LcShell>
    );
}
