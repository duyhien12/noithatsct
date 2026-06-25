'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import LcShell from '../../_components/LcShell';

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtN = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '';
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const toRoman = (i) => ROMAN[i] || `${i+1}`;

function calcKLAuto(row) {
    const dvt = (row.dvt||'').toLowerCase().trim();
    const d = parseFloat(row.dai)||0, s = parseFloat(row.sau)||0;
    const c = parseFloat(row.cao)||0, sl = parseFloat(row.slCai)||0;
    const r4 = n => Math.round(n*10000)/10000;
    if (d && c) {
        if (dvt==='m3'||dvt==='m³') return r4(d*s*c*Math.max(sl,1));
        return r4(d*c*Math.max(sl,1));
    }
    if (d && (dvt==='md'||dvt==='mét'||dvt==='m')) return r4(d*Math.max(sl,1));
    return sl||0;
}
function calcKL(row) {
    if (row.khoiLuong!==''&&row.khoiLuong!=null) { const m=parseFloat(row.khoiLuong); if (!isNaN(m)) return m; }
    return calcKLAuto(row);
}
const calcTT = row => Math.round(calcKL(row)*(parseFloat(row.donGia)||0));
const isTruParent = row => /trừ/i.test(row.chatLieu||'');

const emptyRow = () => ({ _k: Math.random().toString(36).slice(2), hangMuc:'', chatLieu:'', dai:'', sau:'', cao:'', slCai:'', dvt:'m²', khoiLuong:'', donGia:'', mergedWithPrev:false });
const emptyRoom = (name='') => ({ _k: Math.random().toString(36).slice(2), name, rows:[emptyRow(),emptyRow(),emptyRow()] });
const emptySection = (name='') => ({ _k: Math.random().toString(36).slice(2), name, rooms:[emptyRoom('')] });

const COLS = [
    { key:'hangMuc',   label:'HẠNG MỤC',    w:110, align:'left' },
    { key:'chatLieu',  label:'CHẤT LIỆU',   grow:true, align:'left', textarea:true },
    { key:'dai',       label:'Dài',          w:52, num:true },
    { key:'sau',       label:'Sâu',          w:52, num:true },
    { key:'cao',       label:'Cao',          w:52, num:true },
    { key:'slCai',     label:'SL\nCÁI',     w:46, num:true },
    { key:'dvt',       label:'ĐVT',          w:48, align:'center' },
    { key:'khoiLuong', label:'KHỐI\nLƯỢNG', w:70, num:true },
    { key:'donGia',    label:'ĐƠN GIÁ',     w:94, num:true },
];
const COL_KEYS = COLS.map(c=>c.key);

// ── Table styles ──────────────────────────────────────────────────────────────
const TH = { background:'#1e3a5f', color:'#fff', fontSize:9.5, fontWeight:700, textAlign:'center', whiteSpace:'pre-line', padding:'5px 3px', border:'1px solid #0f2335', userSelect:'none', lineHeight:1.3 };
const TD = { border:'1px solid #d1d5db', padding:0 };
const IS = { width:'100%', height:'100%', border:'none', outline:'none', padding:'5px', fontSize:11.5, background:'transparent', fontFamily:'inherit', boxSizing:'border-box' };
const AUTO_TD = { ...TD, padding:'5px 6px', fontSize:11.5, textAlign:'right', fontWeight:700, color:'#1e3a5f', background:'#eef2f7', whiteSpace:'nowrap' };

export default function LcQuotationEditor() {
    const router = useRouter();
    const params = useParams();
    const id = params.id;

    const [sections, setSections] = useState([emptySection('Tầng 1')]);
    const [form, setForm]         = useState({ customerId:'', vat:10, discount:0, notes:'' });
    const [customers, setCustomers] = useState([]);
    const [qMeta, setQMeta]       = useState(null);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [toast, setToast]       = useState(null);

    const cellRefs    = useRef({});
    const dragRef     = useRef(null);
    const [dragOver, setDragOver] = useState(null);

    const showToast = useCallback((msg, type='success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Load customers (LC branch)
    useEffect(() => {
        fetch('/api/laocai/customers').then(r=>r.json()).then(d=>setCustomers(d.customers||[])).catch(()=>{});
    }, []);

    // Load quotation
    useEffect(() => {
        if (!id) return;
        setLoading(true);
        fetch(`/api/quotations/${id}`, { headers:{ 'Content-Type':'application/json' } })
            .then(r => r.json())
            .then(q => {
                setForm({ customerId:q.customerId||'', vat:q.vat??10, discount:q.discount??0, notes:q.notes||'' });
                setQMeta({ code:q.code, status:q.status });
                if (q.categories?.length) {
                    const secMap = {}, secOrder = [];
                    q.categories.forEach(cat => {
                        const g = cat.group||'Tầng 1';
                        if (!secMap[g]) { secMap[g]=[]; secOrder.push(g); }
                        secMap[g].push(cat);
                    });
                    setSections(secOrder.map(g => ({
                        _k: Math.random().toString(36).slice(2),
                        name: g,
                        rooms: secMap[g].map(cat => ({
                            _k: Math.random().toString(36).slice(2),
                            name: cat.name||'',
                            rows: (cat.items||[]).length
                                ? cat.items.map((item, idx) => ({
                                    _k: Math.random().toString(36).slice(2),
                                    hangMuc: item.name==='(Hạng mục)'?'':item.name||'',
                                    chatLieu: item.description||'',
                                    dai: item.length?String(item.length):'',
                                    sau: item.width?String(item.width):'',
                                    cao: item.height?String(item.height):'',
                                    slCai: item.quantity>1?String(item.quantity):'',
                                    dvt: item.unit||'m²',
                                    donGia: item.unitPrice?String(item.unitPrice):'',
                                    khoiLuong: '',
                                    mergedWithPrev: item.mergedWithPrev||false,
                                }))
                                : [emptyRow(),emptyRow(),emptyRow()],
                        })),
                    })));
                }
            })
            .catch(() => showToast('Không tải được báo giá', 'error'))
            .finally(() => setLoading(false));
    }, [id]); // eslint-disable-line

    // ── Drag rows ─────────────────────────────────────────────────────────────
    const handleDragStart = useCallback((e, sIdx, rmIdx, rIdx) => { dragRef.current={sIdx,rmIdx,rIdx}; e.dataTransfer.effectAllowed='move'; }, []);
    const handleDragOver  = useCallback((e, sIdx, rmIdx, rIdx) => { e.preventDefault(); setDragOver({sIdx,rmIdx,rIdx}); }, []);
    const handleDragEnd   = useCallback(() => { dragRef.current=null; setDragOver(null); }, []);
    const handleDrop      = useCallback((e, toSIdx, toRmIdx, toRIdx) => {
        e.preventDefault();
        const from = dragRef.current;
        if (!from||from.sIdx!==toSIdx||from.rmIdx!==toRmIdx||from.rIdx===toRIdx) { setDragOver(null); return; }
        setSections(prev => prev.map((sec,si) => si!==toSIdx?sec:{
            ...sec, rooms:sec.rooms.map((rm,ri) => {
                if (ri!==toRmIdx) return rm;
                const rows=[...rm.rows];
                const [moved]=rows.splice(from.rIdx,1);
                rows.splice(toRIdx,0,moved);
                if (rows[0]) rows[0]={...rows[0],mergedWithPrev:false};
                return {...rm,rows};
            }),
        }));
        dragRef.current=null; setDragOver(null);
    }, []);

    // ── Row ops ───────────────────────────────────────────────────────────────
    const updateRow = useCallback((sIdx,rmIdx,rIdx,key,val) =>
        setSections(prev=>prev.map((sec,si)=>si!==sIdx?sec:{
            ...sec, rooms:sec.rooms.map((rm,ri)=>ri!==rmIdx?rm:{
                ...rm, rows:rm.rows.map((row,rii)=>rii!==rIdx?row:{...row,[key]:val}),
            }),
        })), []);

    const focusCell = useCallback((sIdx,rmIdx,rIdx,cIdx) => {
        const el = cellRefs.current[`${sIdx}-${rmIdx}-${rIdx}-${cIdx}`];
        if (el) { el.focus(); try { el.select(); } catch(_){} }
    }, []);

    const addRow = useCallback((sIdx,rmIdx,afterIdx) => {
        setSections(prev=>prev.map((sec,si)=>si!==sIdx?sec:{
            ...sec, rooms:sec.rooms.map((rm,ri)=>{
                if (ri!==rmIdx) return rm;
                const rows=[...rm.rows]; rows.splice(afterIdx+1,0,emptyRow()); return {...rm,rows};
            }),
        }));
        setTimeout(()=>focusCell(sIdx,rmIdx,afterIdx+1,0),30);
    }, [focusCell]);

    const removeRow = useCallback((sIdx,rmIdx,rIdx) =>
        setSections(prev=>prev.map((sec,si)=>si!==sIdx?sec:{
            ...sec, rooms:sec.rooms.map((rm,ri)=>{
                if (ri!==rmIdx) return rm;
                const rows=rm.rows.filter((_,i)=>i!==rIdx);
                return {...rm, rows:rows.length?rows:[emptyRow()]};
            }),
        })), []);

    const toggleMerge = useCallback((sIdx,rmIdx,rIdx) => {
        if (rIdx===0) return;
        setSections(prev=>prev.map((sec,si)=>si!==sIdx?sec:{
            ...sec, rooms:sec.rooms.map((rm,ri)=>ri!==rmIdx?rm:{
                ...rm, rows:rm.rows.map((row,rii)=>rii!==rIdx?row:{...row,mergedWithPrev:!row.mergedWithPrev}),
            }),
        }));
    }, []);

    // ── Keyboard nav ──────────────────────────────────────────────────────────
    const flatCells = useCallback(() => {
        const list=[];
        sections.forEach((sec,sIdx)=>sec.rooms.forEach((rm,rmIdx)=>rm.rows.forEach((_,rIdx)=>COL_KEYS.forEach((__,cIdx)=>list.push({sIdx,rmIdx,rIdx,cIdx})))));
        return list;
    }, [sections]);

    const navigateTab = useCallback((refKey, shiftKey) => {
        const cells=flatCells();
        const idx=cells.findIndex(c=>`${c.sIdx}-${c.rmIdx}-${c.rIdx}-${c.cIdx}`===refKey);
        const next=cells[idx+(shiftKey?-1:1)];
        if (next) setTimeout(()=>focusCell(next.sIdx,next.rmIdx,next.rIdx,next.cIdx),0);
    }, [flatCells,focusCell]);

    const handleKey = useCallback((e,sIdx,rmIdx,rIdx,cIdx) => {
        const rows=sections[sIdx]?.rooms[rmIdx]?.rows||[];
        const refKey=`${sIdx}-${rmIdx}-${rIdx}-${cIdx}`;
        if (e.key==='Tab') { e.preventDefault(); navigateTab(refKey,e.shiftKey); }
        else if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); if (rIdx+1<rows.length) focusCell(sIdx,rmIdx,rIdx+1,cIdx); else addRow(sIdx,rmIdx,rIdx); }
        else if (e.key==='ArrowDown'&&e.altKey) { e.preventDefault(); addRow(sIdx,rmIdx,rIdx); }
        else if (e.key==='Delete'&&e.ctrlKey) { e.preventDefault(); removeRow(sIdx,rmIdx,rIdx); setTimeout(()=>focusCell(sIdx,rmIdx,Math.max(0,rIdx-1),cIdx),30); }
    }, [sections,navigateTab,focusCell,addRow,removeRow]);

    const handleTextareaKey = useCallback((e,sIdx,rmIdx,rIdx,cIdx) => {
        const rows=sections[sIdx]?.rooms[rmIdx]?.rows||[];
        const refKey=`${sIdx}-${rmIdx}-${rIdx}-${cIdx}`;
        if (e.key==='Tab') { e.preventDefault(); navigateTab(refKey,e.shiftKey); }
        else if (e.key==='Enter'&&e.ctrlKey) { e.preventDefault(); if (rIdx+1<rows.length) focusCell(sIdx,rmIdx,rIdx+1,cIdx); else addRow(sIdx,rmIdx,rIdx); }
        else if (e.key==='Delete'&&e.ctrlKey) { e.preventDefault(); removeRow(sIdx,rmIdx,rIdx); setTimeout(()=>focusCell(sIdx,rmIdx,Math.max(0,rIdx-1),cIdx),30); }
    }, [sections,navigateTab,focusCell,addRow,removeRow]);

    // ── Totals ────────────────────────────────────────────────────────────────
    function buildGroups(rows) {
        const groups=[];
        rows.forEach((row,i)=>{ if (i>0&&row.mergedWithPrev) groups[groups.length-1].push(i); else groups.push([i]); });
        return groups;
    }
    function effectiveKL(rows,group,ri) {
        const row=rows[group[ri]], baseKL=calcKL(row);
        if (ri!==0||group.length===1) return baseKL;
        if (!isTruParent(row)) return baseKL;
        const firstSubKL=calcKL(rows[group[1]]);
        return Math.round((baseKL-firstSubKL)*10000)/10000;
    }
    function calcRoomTotal(rm) {
        return buildGroups(rm.rows).reduce((total,group)=>
            total+group.reduce((s,rIdx,ri)=>{ const kl=effectiveKL(rm.rows,group,ri); return s+Math.round(kl*(parseFloat(rm.rows[rIdx].donGia)||0)); },0), 0);
    }
    const roomTotals = sections.map(sec=>sec.rooms.map(rm=>calcRoomTotal(rm)));
    const secTotals  = roomTotals.map(rts=>rts.reduce((a,b)=>a+b,0));
    const rawTotal   = secTotals.reduce((a,b)=>a+b,0);
    const afterDisc  = rawTotal*(1-(form.discount||0)/100);
    const vatAmt     = afterDisc*(form.vat||0)/100;
    const grandTotal = Math.round(afterDisc+vatAmt);

    // ── Build payload ─────────────────────────────────────────────────────────
    function buildPayload(status) {
        const categories=[];
        sections.forEach((sec,si)=>{
            sec.rooms.forEach((rm,ri)=>{
                const groups=buildGroups(rm.rows);
                const groupMap=new Map();
                groups.forEach(group=>group.forEach((rIdx,ri2)=>groupMap.set(rIdx,{group,ri:ri2})));
                const items=rm.rows
                    .filter(r=>r.hangMuc||r.chatLieu||r.donGia)
                    .map((row,idx)=>{
                        const gInfo=groupMap.get(idx);
                        const kl=gInfo?effectiveKL(rm.rows,gInfo.group,gInfo.ri):calcKL(row);
                        return { name:row.hangMuc||'(Hạng mục)', description:row.chatLieu||'', unit:row.dvt||'m²', length:parseFloat(row.dai)||0, width:parseFloat(row.sau)||0, height:parseFloat(row.cao)||0, quantity:parseFloat(row.slCai)||1, volume:kl, unitPrice:parseFloat(row.donGia)||0, amount:Math.round(kl*(parseFloat(row.donGia)||0)), mergedWithPrev:row.mergedWithPrev||false, order:idx };
                    });
                if (items.length) categories.push({ group:sec.name||`Tầng ${si+1}`, name:rm.name||`Phòng ${toRoman(ri)}`, subtotal:roomTotals[si][ri], items });
            });
        });
        return { type:'Báo giá nội thất', status, customerId:form.customerId||null, vat:Number(form.vat)||0, discount:Number(form.discount)||0, notes:form.notes||'', total:rawTotal, grandTotal, categories };
    }

    async function handleSaveDraft() {
        if (!sections.some(s=>s.rooms.some(r=>r.rows.some(rw=>rw.hangMuc||rw.chatLieu||rw.donGia)))) { showToast('Chưa có hạng mục nào!','error'); return; }
        setSavingDraft(true);
        try {
            await fetch(`/api/quotations/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(buildPayload('Nháp')) });
            showToast('Đã lưu thay đổi');
        } catch { showToast('Lỗi lưu nháp','error'); }
        finally { setSavingDraft(false); }
    }

    async function handleSaveAndPdf() {
        setSaving(true);
        try {
            await fetch(`/api/quotations/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(buildPayload(qMeta?.status||'Nháp')) });
            router.push(`/quotations/${id}/pdf`);
        } catch { showToast('Lỗi lưu','error'); }
        finally { setSaving(false); }
    }

    if (loading) return (
        <LcShell title="Đang tải báo giá...">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#94a3b8' }}>Đang tải báo giá...</div>
        </LcShell>
    );

    return (
        <LcShell title={qMeta?.code||'Báo giá'}>

            {/* Toast */}
            {toast && (
                <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'12px 20px', borderRadius:12, background:toast.type==='error'?'#dc2626':'#0f766e', color:'#fff', fontSize:13, fontWeight:600, boxShadow:'0 8px 24px rgba(0,0,0,0.2)' }}>
                    {toast.type==='error'?'⚠️':'✓'} {toast.msg}
                </div>
            )}

            {/* Toolbar */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap', paddingBottom:16, borderBottom:'1px solid #e2e8f0' }}>
                <button onClick={()=>router.push('/laocai/quotations')} style={{ padding:'7px 14px', borderRadius:9, border:'1px solid #e2e8f0', background:'#f8fafc', fontSize:13, cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center', gap:5 }}>
                    ← Báo giá
                </button>
                <div>
                    <span style={{ fontSize:15, fontWeight:700, color:'#1e293b' }}>
                        {qMeta?.code ? `${qMeta.code}` : 'Báo giá nội thất'}
                    </span>
                    {qMeta?.status && (
                        <span style={{ marginLeft:8, fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0fdf4', color:'#0f766e', fontWeight:700, border:'1px solid #0f766e33' }}>{qMeta.status}</span>
                    )}
                </div>
                <div style={{ flex:1 }} />
                <button onClick={handleSaveDraft} disabled={savingDraft} style={{ padding:'8px 16px', borderRadius:9, border:'1px solid #e2e8f0', background:'#fff', fontSize:12, cursor:'pointer', color:'#64748b', fontWeight:600 }}>
                    {savingDraft?'Đang lưu...':'💾 Lưu nháp'}
                </button>
                <button onClick={handleSaveAndPdf} disabled={saving} style={{ padding:'8px 18px', borderRadius:9, border:'none', background:saving?'#94a3b8':'#1e3a5f', color:'#fff', fontSize:13, fontWeight:700, cursor:saving?'not-allowed':'pointer', boxShadow:'0 2px 8px rgba(30,58,95,0.4)' }}>
                    {saving?'Đang lưu...':'📄 Lưu & Xuất PDF'}
                </button>
            </div>

            {/* Info row */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 2fr', gap:12, marginBottom:14, padding:'14px 16px', background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                <div>
                    <label style={LBL}>Khách hàng</label>
                    <select value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} style={SEL}>
                        <option value="">-- Chọn KH --</option>
                        {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label style={LBL}>VAT (%)</label>
                    <input type="number" value={form.vat} onChange={e=>setForm(f=>({...f,vat:+e.target.value}))} min={0} max={100} style={INP} />
                </div>
                <div>
                    <label style={LBL}>Chiết khấu (%)</label>
                    <input type="number" value={form.discount} onChange={e=>setForm(f=>({...f,discount:+e.target.value}))} min={0} max={100} style={INP} />
                </div>
                <div>
                    <label style={LBL}>Ghi chú</label>
                    <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Ghi chú..." style={INP} />
                </div>
            </div>

            {/* Keyboard hint */}
            <div style={{ fontSize:11, color:'#64748b', marginBottom:12, padding:'6px 10px', background:'#f1f5f9', borderRadius:6, display:'flex', gap:14, flexWrap:'wrap' }}>
                <span>⌨️ <b>Tab/Shift+Tab</b> di chuyển ô</span>
                <span>↵ <b>Enter</b> xuống dòng</span>
                <span>⬇ <b>Alt+↓</b> thêm dòng</span>
                <span>✕ <b>Ctrl+Del</b> xóa dòng</span>
                <span style={{color:'#7c3aed'}}>💬 Chất liệu: <b>Enter</b> = xuống dòng, <b>Ctrl+Enter</b> = ô tiếp</span>
                <span>KL: Dài×Cao×SL (m²) | Dài×SL (md)</span>
                <span style={{color:'#0369a1'}}>⊞ Gộp ô / ⊟ Bỏ gộp (nút cuối dòng)</span>
            </div>

            {/* ── Sections ── */}
            {sections.map((sec,sIdx) => (
                <div key={sec._k} style={{ marginBottom:18, border:'2px solid #92D050', borderRadius:8, overflow:'hidden' }}>

                    {/* Floor header – green */}
                    <div style={{ background:'#92D050', display:'flex', alignItems:'center', padding:'8px 12px', gap:8 }}>
                        <span style={{ fontWeight:900, fontSize:16, color:'#1a5c00', minWidth:26 }}>{String.fromCharCode(65+sIdx)}.</span>
                        <input
                            style={{ flex:1, border:'none', background:'transparent', color:'#1a3500', fontWeight:700, fontSize:14, outline:'none', fontFamily:'inherit' }}
                            value={sec.name}
                            onChange={e=>setSections(p=>p.map((s,i)=>i===sIdx?{...s,name:e.target.value}:s))}
                            placeholder="Tên tầng / khu vực chính..." />
                        <span style={{ fontWeight:700, fontSize:12, color:'#1a3500', whiteSpace:'nowrap' }}>{fmtN(secTotals[sIdx])} đ</span>
                        {sections.length>1 && (
                            <button onClick={()=>setSections(p=>p.filter((_,i)=>i!==sIdx))} style={{ background:'none', border:'none', color:'#3a7c00', cursor:'pointer', fontSize:16, padding:'0 2px' }}>✕</button>
                        )}
                    </div>

                    {/* Rooms */}
                    {sec.rooms.map((rm,rmIdx) => (
                        <div key={rm._k} style={{ borderTop:rmIdx===0?'none':'2px solid #92D050' }}>

                            {/* Room header – yellow */}
                            <div style={{ background:'#FFFF00', display:'flex', alignItems:'center', padding:'5px 12px 5px 28px', gap:8, borderBottom:'1px solid #d4d400' }}>
                                <span style={{ fontWeight:800, fontSize:13, color:'#6b5800', minWidth:42 }}>{String.fromCharCode(65+sIdx)}.{toRoman(rmIdx)}.</span>
                                <input
                                    style={{ flex:1, border:'none', background:'transparent', color:'#4a3c00', fontWeight:600, fontSize:12.5, outline:'none', fontFamily:'inherit' }}
                                    value={rm.name}
                                    onChange={e=>setSections(p=>p.map((s,si)=>si!==sIdx?s:{...s,rooms:s.rooms.map((r,ri)=>ri!==rmIdx?r:{...r,name:e.target.value})}))}
                                    placeholder="Tên phòng / hạng mục (VD: Phòng khách)..." />
                                <span style={{ fontWeight:700, fontSize:12, color:'#4a3c00', whiteSpace:'nowrap' }}>{fmtN(roomTotals[sIdx][rmIdx])} đ</span>
                                {sec.rooms.length>1 && (
                                    <button onClick={()=>setSections(p=>p.map((s,si)=>si!==sIdx?s:{...s,rooms:s.rooms.filter((_,ri)=>ri!==rmIdx)}))} style={{ background:'none', border:'none', color:'#a09000', cursor:'pointer', fontSize:14 }}>✕</button>
                                )}
                            </div>

                            {/* Item table */}
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'auto', minWidth:820 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...TH, width:22, background:'#0f2335' }} />
                                            <th style={{ ...TH, width:34 }}>#</th>
                                            {COLS.map(col => (
                                                <th key={col.key} style={{ ...TH, width:col.grow?undefined:col.w, minWidth:col.grow?180:undefined }}>{col.label}</th>
                                            ))}
                                            <th style={{ ...TH, width:106 }}>THÀNH TIỀN</th>
                                            <th style={{ ...TH, width:26, background:'#0f2335' }} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const groups=[];
                                            rm.rows.forEach((row,rIdx)=>{ if (rIdx>0&&row.mergedWithPrev) groups[groups.length-1].push(rIdx); else groups.push([rIdx]); });
                                            return groups.map((group,gi)=>
                                                group.map((rIdx,ri) => {
                                                    const row=rm.rows[rIdx], isFirst=ri===0, span=group.length;
                                                    const kl=effectiveKL(rm.rows,group,ri);
                                                    const tt=Math.round(kl*(parseFloat(row.donGia)||0));
                                                    const evenBg=gi%2===1?'#f9fafb':'#fff';
                                                    const autoBg=evenBg==='#fff'?'#eef2f7':'#e8ecf2';
                                                    const isDragTarget=dragOver&&dragOver.sIdx===sIdx&&dragOver.rmIdx===rmIdx&&dragOver.rIdx===rIdx;
                                                    return (
                                                        <tr key={row._k}
                                                            draggable
                                                            onDragStart={e=>handleDragStart(e,sIdx,rmIdx,rIdx)}
                                                            onDragOver={e=>handleDragOver(e,sIdx,rmIdx,rIdx)}
                                                            onDrop={e=>handleDrop(e,sIdx,rmIdx,rIdx)}
                                                            onDragEnd={handleDragEnd}
                                                            style={{ background:evenBg, outline:isDragTarget?'2px solid #1e3a5f':'none', outlineOffset:-1 }}>
                                                            <td style={{ ...TD, textAlign:'center', cursor:'grab', padding:'0 2px', background:'#f3f4f6', color:'#9ca3af', fontSize:15, userSelect:'none' }}>⠿</td>
                                                            {isFirst && (
                                                                <td rowSpan={span} style={{ ...TD, textAlign:'center', fontSize:10, color:'#9ca3af', background:'#f3f4f6', userSelect:'none', verticalAlign:'middle' }}>
                                                                    {gi+1}
                                                                </td>
                                                            )}
                                                            {COLS.map((col,cIdx) => {
                                                                const refKey=`${sIdx}-${rmIdx}-${rIdx}-${cIdx}`;
                                                                if (col.key==='hangMuc'&&!isFirst) return null;
                                                                return (
                                                                    <td key={col.key} rowSpan={col.key==='hangMuc'?span:1} style={{ ...TD, background:evenBg, verticalAlign:col.textarea?'top':'middle' }}>
                                                                        {col.textarea ? (
                                                                            <textarea
                                                                                ref={el=>{ cellRefs.current[refKey]=el; }}
                                                                                style={{ ...IS, resize:'none', minHeight:30, overflowY:'hidden', lineHeight:1.45, whiteSpace:'pre-wrap' }}
                                                                                value={row[col.key]||''}
                                                                                rows={Math.max(1,(row[col.key]||'').split('\n').length)}
                                                                                onChange={e=>{ updateRow(sIdx,rmIdx,rIdx,'chatLieu',e.target.value); e.target.style.height='auto'; e.target.style.height=e.target.scrollHeight+'px'; }}
                                                                                onKeyDown={e=>handleTextareaKey(e,sIdx,rmIdx,rIdx,cIdx)}
                                                                                placeholder="Mô tả chất liệu..."
                                                                                tabIndex={0}
                                                                            />
                                                                        ) : col.key==='khoiLuong' ? (
                                                                            <input
                                                                                ref={el=>{ cellRefs.current[refKey]=el; }}
                                                                                style={{ ...IS, textAlign:'right' }}
                                                                                value={row.khoiLuong||''}
                                                                                onChange={e=>updateRow(sIdx,rmIdx,rIdx,'khoiLuong',e.target.value)}
                                                                                onKeyDown={e=>handleKey(e,sIdx,rmIdx,rIdx,cIdx)}
                                                                                placeholder={String(calcKLAuto(row)||'')}
                                                                                tabIndex={0}
                                                                            />
                                                                        ) : (
                                                                            <input
                                                                                ref={el=>{ cellRefs.current[refKey]=el; }}
                                                                                style={{ ...IS, textAlign:col.num?'right':col.align||'left' }}
                                                                                value={row[col.key]||''}
                                                                                onChange={e=>updateRow(sIdx,rmIdx,rIdx,col.key,e.target.value)}
                                                                                onKeyDown={e=>handleKey(e,sIdx,rmIdx,rIdx,cIdx)}
                                                                                placeholder={cIdx===0?'Hạng mục...':''}
                                                                                tabIndex={0}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ ...AUTO_TD, background:autoBg, color:tt?'#1e3a5f':'#ccc' }}>{tt?fmtN(tt):''}</td>
                                                            <td style={{ ...TD, textAlign:'center', background:'#f9fafb', verticalAlign:'middle' }}>
                                                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                                                                    <button onClick={()=>removeRow(sIdx,rmIdx,rIdx)}
                                                                        style={{ background:'none', border:'none', cursor:'pointer', color:'#d1d5db', fontSize:14, padding:'2px', lineHeight:1 }}
                                                                        onMouseEnter={e=>e.target.style.color='#ef4444'}
                                                                        onMouseLeave={e=>e.target.style.color='#d1d5db'}>✕</button>
                                                                    {rIdx>0 && (
                                                                        <button onClick={()=>toggleMerge(sIdx,rmIdx,rIdx)}
                                                                            title={row.mergedWithPrev?'Bỏ gộp ô':'Gộp ô với dòng trên'}
                                                                            style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, padding:'2px', lineHeight:1, color:row.mergedWithPrev?'#1e3a5f':'#d1d5db', fontWeight:700 }}
                                                                            onMouseEnter={e=>e.currentTarget.style.color=row.mergedWithPrev?'#ef4444':'#1e3a5f'}
                                                                            onMouseLeave={e=>e.currentTarget.style.color=row.mergedWithPrev?'#1e3a5f':'#d1d5db'}>
                                                                            {row.mergedWithPrev?'⊟':'⊞'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>

                            {/* Room footer */}
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 12px', background:'#fffde0', borderTop:'1px solid #e2e8f0' }}>
                                <button onClick={()=>addRow(sIdx,rmIdx,rm.rows.length-1)}
                                    style={{ padding:'4px 10px', border:'1px dashed #d4d400', borderRadius:6, background:'none', fontSize:12, cursor:'pointer', color:'#7c6b00' }}>
                                    + Thêm dòng
                                </button>
                                <span style={{ fontSize:12, color:'#475569' }}>
                                    Tổng phòng: <strong style={{ color:'#1e3a5f' }}>{fmtN(roomTotals[sIdx][rmIdx])} đ</strong>
                                </span>
                            </div>
                        </div>
                    ))}

                    {/* Add room */}
                    <div style={{ padding:'6px 12px', background:'#f0ffe0', borderTop:'1px solid #b8e89b', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <button onClick={()=>setSections(p=>p.map((s,si)=>si!==sIdx?s:{...s,rooms:[...s.rooms,emptyRoom('')]}))}
                            style={{ padding:'4px 10px', border:'1px dashed #92D050', borderRadius:6, background:'none', fontSize:12, cursor:'pointer', color:'#3a7c00' }}>
                            + Thêm phòng / hạng mục
                        </button>
                        <span style={{ fontSize:12, color:'#3a7c00', fontWeight:700 }}>Tổng tầng: {fmtN(secTotals[sIdx])} đ</span>
                    </div>
                </div>
            ))}

            <button onClick={()=>setSections(p=>[...p,emptySection('')])}
                style={{ marginBottom:20, padding:'8px 16px', border:'1px dashed #92D050', borderRadius:9, background:'#f0ffe0', fontSize:13, cursor:'pointer', color:'#3a7c00' }}>
                + Thêm tầng / khu vực mới
            </button>

            {/* Summary */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:40 }}>
                <div style={{ width:320, border:'1px solid #e2e8f0', borderRadius:10, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ background:'#f8fafc', padding:'9px 16px', display:'flex', justifyContent:'space-between', fontSize:13, borderBottom:'1px solid #e2e8f0' }}>
                        <span>Tổng cộng</span><strong>{fmtN(rawTotal)} đ</strong>
                    </div>
                    {form.discount>0 && (
                        <div style={{ background:'#fff5f5', padding:'7px 16px', display:'flex', justifyContent:'space-between', fontSize:12, color:'#dc2626', borderBottom:'1px solid #e2e8f0' }}>
                            <span>Chiết khấu ({form.discount}%)</span>
                            <span>− {fmtN(rawTotal*form.discount/100)} đ</span>
                        </div>
                    )}
                    {form.vat>0 && (
                        <div style={{ background:'#f8fafc', padding:'7px 16px', display:'flex', justifyContent:'space-between', fontSize:12, borderBottom:'1px solid #e2e8f0' }}>
                            <span>VAT ({form.vat}%)</span><span>{fmtN(vatAmt)} đ</span>
                        </div>
                    )}
                    <div style={{ background:'linear-gradient(135deg, #1e3a5f 0%, #1a327a 100%)', padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ color:'rgba(255,255,255,0.85)', fontWeight:700, fontSize:13 }}>TỔNG GIÁ TRỊ</span>
                        <span style={{ color:'#E05B0A', fontWeight:900, fontSize:16 }}>{fmtN(grandTotal)} đ</span>
                    </div>
                </div>
            </div>
        </LcShell>
    );
}

const LBL = { fontSize:11, fontWeight:700, color:'#64748b', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.4 };
const SEL = { width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:13, background:'#fff', boxSizing:'border-box', outline:'none', fontFamily:'inherit' };
const INP = { width:'100%', padding:'9px 12px', borderRadius:9, border:'1px solid #e2e8f0', fontSize:13, boxSizing:'border-box', outline:'none', fontFamily:'inherit' };
