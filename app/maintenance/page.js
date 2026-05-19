'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPES     = ['Bảo hành', 'Bảo dưỡng định kỳ', 'Sửa chữa phát sinh'];
const CATEGORIES = ['Cửa / cánh cửa', 'Tủ / ngăn kéo', 'Sàn / gỗ ốp', 'Sơn / bề mặt', 'Phụ kiện / bản lề', 'Đèn / điện', 'Khác'];
const PRIORITIES = ['Khẩn cấp', 'Cao', 'Trung bình', 'Thấp'];
const STATUSES   = ['Tiếp nhận', 'Phân công', 'Đang xử lý', 'Chờ phụ kiện', 'Hoàn thành', 'Đã đánh giá', 'Huỷ'];
const SLA_HOURS  = { 'Khẩn cấp': 4, 'Cao': 24, 'Trung bình': 72, 'Thấp': 168 };
const WORKFLOW   = ['Tiếp nhận', 'Phân công', 'Đang xử lý', 'Hoàn thành', 'Đã đánh giá'];
const NEXT_STATUS = { 'Tiếp nhận': 'Phân công', 'Phân công': 'Đang xử lý', 'Đang xử lý': 'Hoàn thành', 'Chờ phụ kiện': 'Đang xử lý', 'Hoàn thành': 'Đã đánh giá' };
const NEXT_LABEL  = { 'Tiếp nhận': '→ Phân công', 'Phân công': '▶ Bắt đầu xử lý', 'Đang xử lý': '✓ Đánh dấu hoàn thành', 'Chờ phụ kiện': '▶ Tiếp tục xử lý', 'Hoàn thành': '⭐ Nhập đánh giá KH' };

const STATUS_COLOR = {
    'Tiếp nhận':    { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
    'Phân công':    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    'Đang xử lý':  { bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
    'Chờ phụ kiện':{ bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
    'Hoàn thành':  { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
    'Đã đánh giá': { bg: '#fdf4ff', text: '#7e22ce', border: '#d8b4fe' },
    'Huỷ':         { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
};
const PRIORITY_COLOR = { 'Khẩn cấp': '#dc2626', 'Cao': '#f59e0b', 'Trung bình': '#3b82f6', 'Thấp': '#6b7280' };
const CATEGORY_ICON  = { 'Cửa / cánh cửa': '🚪', 'Tủ / ngăn kéo': '🗄️', 'Sàn / gỗ ốp': '🪵', 'Sơn / bề mặt': '🎨', 'Phụ kiện / bản lề': '⚙️', 'Đèn / điện': '💡', 'Khác': '🔧' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDT    = (d) => d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmt      = (n) => n ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(n) : '0đ';
const fmtFull  = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' đ';
const toInput  = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
const isOpen   = (r) => !['Hoàn thành', 'Đã đánh giá', 'Huỷ'].includes(r.status);

function slaStatus(r) {
    if (!r.slaDeadline || !isOpen(r)) return null;
    const now = Date.now();
    const deadline = new Date(r.slaDeadline).getTime();
    const diffH = (deadline - now) / 3_600_000;
    if (diffH < 0)  return { label: `Quá hạn ${Math.abs(Math.round(diffH))}h`, color: '#dc2626', bg: '#fee2e2' };
    if (diffH < 4)  return { label: `Còn ${Math.round(diffH)}h`, color: '#ea580c', bg: '#fff7ed' };
    if (diffH < 24) return { label: `Còn ${Math.round(diffH)}h`, color: '#d97706', bg: '#fffbeb' };
    return { label: `Còn ${Math.round(diffH / 24)}n`, color: '#16a34a', bg: '#f0fdf4' };
}

function warrantyStatus(r) {
    if (!r.warrantyEndDate) return null;
    const now = Date.now();
    const end = new Date(r.warrantyEndDate).getTime();
    const diffD = (end - now) / 86_400_000;
    if (diffD < 0)   return { label: 'Hết bảo hành', color: '#6b7280', bg: '#f3f4f6' };
    if (diffD < 30)  return { label: `BH còn ${Math.round(diffD)}n`, color: '#dc2626', bg: '#fee2e2' };
    if (diffD < 90)  return { label: `BH còn ${Math.round(diffD)}n`, color: '#d97706', bg: '#fffbeb' };
    return { label: `BH còn ${Math.round(diffD)}n`, color: '#16a34a', bg: '#f0fdf4' };
}

function StatusBadge({ status }) {
    const c = STATUS_COLOR[status] || STATUS_COLOR['Tiếp nhận'];
    return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:10, fontSize:11, fontWeight:600, background:c.bg, color:c.text, border:`1px solid ${c.border}` }}>{status}</span>;
}

function Stars({ value, onChange, size = 18 }) {
    return (
        <div style={{ display:'flex', gap:3 }}>
            {[1,2,3,4,5].map(n => (
                <span key={n} onClick={() => onChange?.(n)}
                    style={{ fontSize:size, cursor:onChange?'pointer':'default', color: n <= value ? '#f59e0b' : '#d1d5db' }}>★</span>
            ))}
        </div>
    );
}

// ─── Photo Upload Strip ───────────────────────────────────────────────────────
function PhotoStrip({ photos, onAdd, onRemove, label }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const list = (() => { try { return JSON.parse(photos || '[]'); } catch { return []; } })();

    const handleFile = async (file) => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload?type=proofs', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.url) onAdd(data.url);
        setUploading(false);
    };

    return (
        <div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', marginBottom:8 }}>{label}</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                {list.map((url, i) => (
                    <div key={i} style={{ position:'relative', width:80, height:80 }}>
                        <img src={url} alt="" style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'1px solid var(--border)' }} />
                        {onRemove && (
                            <button onClick={() => onRemove(i)} style={{ position:'absolute', top:-6, right:-6, width:18, height:18, borderRadius:'50%', background:'#dc2626', color:'#fff', border:'none', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>✕</button>
                        )}
                    </div>
                ))}
                <button onClick={() => inputRef.current?.click()}
                    style={{ width:80, height:80, borderRadius:8, border:'2px dashed var(--border)', background:'var(--bg-secondary)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, color:'var(--text-muted)' }}>
                    {uploading ? '⏳' : '📷'}
                    <span>{uploading ? 'Đang tải' : 'Thêm ảnh'}</span>
                </button>
                <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
            </div>
        </div>
    );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ record: initRec, onClose, onUpdated, projects }) {
    const [rec, setRec] = useState(initRec);
    const [tab, setTab] = useState('info');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({});
    const [ratingForm, setRatingForm] = useState({ customerRating: initRec.customerRating || 0, customerFeedback: initRec.customerFeedback || '' });

    useEffect(() => {
        setForm({
            title: rec.title, type: rec.type, category: rec.category, priority: rec.priority,
            status: rec.status, assignee: rec.assignee, reportedBy: rec.reportedBy,
            description: rec.description, resolution: rec.resolution, rootCause: rec.rootCause,
            notes: rec.notes, scheduledDate: toInput(rec.scheduledDate),
            nextScheduleDate: toInput(rec.nextScheduleDate),
            warrantyEndDate: toInput(rec.warrantyEndDate),
            estimatedCost: rec.estimatedCost || '', actualCost: rec.actualCost || '',
        });
        setRatingForm({ customerRating: rec.customerRating || 0, customerFeedback: rec.customerFeedback || '' });
    }, [rec.id]);

    const patch = useCallback(async (data) => {
        setSaving(true);
        const res = await fetch(`/api/maintenance/${rec.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const updated = await res.json();
        setRec(updated);
        onUpdated();
        setSaving(false);
        return updated;
    }, [rec.id]);

    const advanceStatus = async () => {
        const next = NEXT_STATUS[rec.status];
        if (!next) return;
        if (next === 'Đã đánh giá') { setTab('rating'); return; }
        await patch({ status: next });
    };

    const saveInfo = () => patch({
        ...form,
        estimatedCost: Number(form.estimatedCost) || 0,
        actualCost: Number(form.actualCost) || 0,
    });

    const saveRating = () => patch({ ...ratingForm, status: 'Đã đánh giá' });

    const addPhoto = async (field, url) => {
        const list = JSON.parse(rec[field] || '[]');
        list.push(url);
        await patch({ [field]: list });
    };

    const removePhoto = async (field, idx) => {
        const list = JSON.parse(rec[field] || '[]');
        list.splice(idx, 1);
        await patch({ [field]: list });
    };

    const sla = slaStatus(rec);
    const warranty = warrantyStatus(rec);
    const stepIdx = WORKFLOW.indexOf(rec.status);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth:700, width:'96vw', maxHeight:'92vh', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                                <span style={{ fontFamily:'monospace', fontSize:12, color:'var(--accent-primary)', fontWeight:700 }}>{rec.code}</span>
                                <StatusBadge status={rec.status} />
                                <span style={{ fontSize:11, fontWeight:700, color:PRIORITY_COLOR[rec.priority], background:PRIORITY_COLOR[rec.priority]+'18', padding:'2px 7px', borderRadius:8 }}>
                                    {rec.priority === 'Khẩn cấp' ? '🚨' : rec.priority === 'Cao' ? '⚡' : '·'} {rec.priority}
                                </span>
                                {rec.isRepeatIssue && <span style={{ fontSize:11, fontWeight:700, color:'#7c3aed', background:'#ede9fe', padding:'2px 7px', borderRadius:8 }}>🔁 Tái phát lần {rec.repeatCount}</span>}
                                {sla && <span style={{ fontSize:11, fontWeight:700, color:sla.color, background:sla.bg, padding:'2px 7px', borderRadius:8 }}>⏱ {sla.label}</span>}
                                {warranty && <span style={{ fontSize:11, fontWeight:600, color:warranty.color, background:warranty.bg, padding:'2px 7px', borderRadius:8 }}>🛡 {warranty.label}</span>}
                            </div>
                            <div style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:2 }}>{rec.title}</div>
                            <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                                {CATEGORY_ICON[rec.category]} {rec.category} &nbsp;·&nbsp; 📁 {rec.project?.name} ({rec.project?.code})
                                {rec.assignee && <>&nbsp;·&nbsp; 👤 {rec.assignee}</>}
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--text-muted)', flexShrink:0 }}>✕</button>
                    </div>

                    {/* Workflow stepper */}
                    <div style={{ display:'flex', alignItems:'center', gap:0, marginTop:14, overflowX:'auto' }}>
                        {WORKFLOW.map((s, i) => {
                            const done = stepIdx > i || (rec.status === 'Huỷ');
                            const active = stepIdx === i && rec.status !== 'Huỷ';
                            return (
                                <div key={s} style={{ display:'flex', alignItems:'center', flex:1, minWidth:0 }}>
                                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                                        <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700,
                                            background: done ? '#16a34a' : active ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                            color: (done || active) ? '#fff' : 'var(--text-muted)',
                                            border: active ? '2px solid var(--accent-primary)' : '2px solid transparent' }}>
                                            {done ? '✓' : i + 1}
                                        </div>
                                        <div style={{ fontSize:9, marginTop:2, color: active ? 'var(--accent-primary)' : done ? '#16a34a' : 'var(--text-muted)', fontWeight: active ? 700 : 400, whiteSpace:'nowrap', textAlign:'center' }}>{s}</div>
                                    </div>
                                    {i < WORKFLOW.length - 1 && <div style={{ width:24, height:2, background: done ? '#16a34a' : 'var(--border)', flexShrink:0, marginBottom:14 }} />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick action */}
                    {NEXT_STATUS[rec.status] && (
                        <div style={{ marginTop:10, display:'flex', gap:8 }}>
                            <button className="btn btn-primary" onClick={advanceStatus} disabled={saving} style={{ fontSize:12 }}>
                                {NEXT_LABEL[rec.status]}
                            </button>
                            {rec.status === 'Đang xử lý' && (
                                <button className="btn" onClick={() => patch({ status: 'Chờ phụ kiện' })} style={{ fontSize:12 }}>
                                    ⏸ Chờ phụ kiện
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
                    {['info','before','after','rating'].map(t => {
                        const labels = { info:'📋 Chi tiết', before:'📷 Ảnh trước', after:'✅ Ảnh sau', rating:'⭐ Đánh giá KH' };
                        return (
                            <button key={t} onClick={() => setTab(t)}
                                style={{ padding:'10px 16px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontWeight: tab===t ? 700 : 400, color: tab===t ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: tab===t ? '2px solid var(--accent-primary)' : '2px solid transparent' }}>
                                {labels[t]}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content */}
                <div style={{ flex:1, overflowY:'auto', padding:20 }}>
                    {tab === 'info' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                                <div><label className="form-label">Tiêu đề</label><input className="form-input" value={form.title||''} onChange={e => setForm(f=>({...f,title:e.target.value}))} /></div>
                                <div><label className="form-label">Loại</label><select className="form-select" value={form.type||''} onChange={e => setForm(f=>({...f,type:e.target.value}))}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                                <div><label className="form-label">Danh mục lỗi</label><select className="form-select" value={form.category||''} onChange={e => setForm(f=>({...f,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                                <div><label className="form-label">Mức độ ưu tiên</label><select className="form-select" value={form.priority||''} onChange={e => setForm(f=>({...f,priority:e.target.value}))}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
                                <div><label className="form-label">Trạng thái</label><select className="form-select" value={form.status||''} onChange={e => setForm(f=>({...f,status:e.target.value}))}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
                                <div><label className="form-label">Kỹ thuật viên</label><input className="form-input" value={form.assignee||''} onChange={e => setForm(f=>({...f,assignee:e.target.value}))} placeholder="Tên kỹ thuật viên" /></div>
                                <div><label className="form-label">Người báo cáo</label><input className="form-input" value={form.reportedBy||''} onChange={e => setForm(f=>({...f,reportedBy:e.target.value}))} /></div>
                                <div><label className="form-label">Ngày hẹn</label><input type="date" className="form-input" value={form.scheduledDate||''} onChange={e => setForm(f=>({...f,scheduledDate:e.target.value}))} /></div>
                                <div><label className="form-label">Lịch tiếp theo</label><input type="date" className="form-input" value={form.nextScheduleDate||''} onChange={e => setForm(f=>({...f,nextScheduleDate:e.target.value}))} /></div>
                                <div><label className="form-label">Hết hạn bảo hành</label><input type="date" className="form-input" value={form.warrantyEndDate||''} onChange={e => setForm(f=>({...f,warrantyEndDate:e.target.value}))} /></div>
                                <div><label className="form-label">CP dự kiến (đ)</label><input type="number" className="form-input" value={form.estimatedCost||''} onChange={e => setForm(f=>({...f,estimatedCost:e.target.value}))} /></div>
                                <div><label className="form-label">CP thực tế (đ)</label><input type="number" className="form-input" value={form.actualCost||''} onChange={e => setForm(f=>({...f,actualCost:e.target.value}))} /></div>
                            </div>
                            <div><label className="form-label">Mô tả sự cố</label><textarea className="form-input" rows={2} value={form.description||''} onChange={e => setForm(f=>({...f,description:e.target.value}))} style={{resize:'vertical'}} /></div>
                            <div><label className="form-label">Nguyên nhân gốc</label><textarea className="form-input" rows={2} value={form.rootCause||''} onChange={e => setForm(f=>({...f,rootCause:e.target.value}))} style={{resize:'vertical'}} /></div>
                            <div><label className="form-label">Hướng xử lý / Kết quả</label><textarea className="form-input" rows={2} value={form.resolution||''} onChange={e => setForm(f=>({...f,resolution:e.target.value}))} style={{resize:'vertical'}} /></div>
                            <div><label className="form-label">Ghi chú nội bộ</label><textarea className="form-input" rows={2} value={form.notes||''} onChange={e => setForm(f=>({...f,notes:e.target.value}))} style={{resize:'vertical'}} /></div>

                            {rec.isRepeatIssue && rec.parentIssueId && (
                                <div style={{ padding:'10px 14px', background:'#f5f3ff', borderRadius:8, border:'1px solid #ddd6fe', fontSize:12 }}>
                                    <span style={{ fontWeight:700, color:'#7c3aed' }}>🔁 Tái phát:</span> Sự cố tương tự đã xảy ra trước đó — mã phiếu gốc <span style={{ fontFamily:'monospace', fontWeight:700 }}>{rec.parentIssueId?.slice(-6)}</span>
                                </div>
                            )}

                            <div style={{ display:'flex', gap:8, paddingTop:4 }}>
                                <button className="btn btn-primary" onClick={saveInfo} disabled={saving}>{saving ? 'Đang lưu...' : '💾 Lưu thay đổi'}</button>
                            </div>

                            <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                                {[['📥 Tiếp nhận', rec.receivedAt], ['▶ Bắt đầu', rec.startedAt], ['✓ Hoàn thành', rec.completedDate]].map(([l, d]) => (
                                    <div key={l} style={{ fontSize:11 }}>
                                        <div style={{ color:'var(--text-muted)', marginBottom:2 }}>{l}</div>
                                        <div style={{ fontWeight:600 }}>{fmtDT(d)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === 'before' && (
                        <PhotoStrip photos={rec.beforePhotos} label="Ảnh hiện trạng TRƯỚC khi xử lý"
                            onAdd={url => addPhoto('beforePhotos', url)}
                            onRemove={idx => removePhoto('beforePhotos', idx)} />
                    )}

                    {tab === 'after' && (
                        <PhotoStrip photos={rec.afterPhotos} label="Ảnh kết quả SAU khi xử lý"
                            onAdd={url => addPhoto('afterPhotos', url)}
                            onRemove={idx => removePhoto('afterPhotos', idx)} />
                    )}

                    {tab === 'rating' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                            <div>
                                <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Đánh giá của khách hàng</div>
                                <Stars value={ratingForm.customerRating} onChange={v => setRatingForm(f=>({...f,customerRating:v}))} size={28} />
                                {ratingForm.customerRating > 0 && (
                                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
                                        {['','Rất không hài lòng','Không hài lòng','Bình thường','Hài lòng','Rất hài lòng'][ratingForm.customerRating]}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="form-label">Phản hồi khách hàng</label>
                                <textarea className="form-input" rows={4} value={ratingForm.customerFeedback} onChange={e => setRatingForm(f=>({...f,customerFeedback:e.target.value}))} placeholder="Ghi nhận phản hồi từ khách hàng..." style={{resize:'vertical'}} />
                            </div>
                            {rec.ratedAt && <div style={{ fontSize:12, color:'var(--text-muted)' }}>Đã đánh giá lúc {fmtDT(rec.ratedAt)}</div>}
                            <button className="btn btn-primary" onClick={saveRating} disabled={saving || !ratingForm.customerRating}>
                                {saving ? 'Đang lưu...' : '⭐ Lưu đánh giá & hoàn tất'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated, projects }) {
    const [form, setForm] = useState({ title:'', type:'Bảo hành', category:'Khác', priority:'Trung bình', status:'Tiếp nhận', projectId:'', assignee:'', reportedBy:'', scheduledDate:'', nextScheduleDate:'', warrantyEndDate:'', estimatedCost:'', description:'', notes:'' });
    const [saving, setSaving] = useState(false);
    const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    const slaH = SLA_HOURS[form.priority] ?? 72;
    const slaDeadlinePreview = form.priority ? new Date(Date.now() + slaH * 3_600_000).toLocaleString('vi-VN', { dateStyle:'short', timeStyle:'short' }) : '';

    const handleSave = async () => {
        if (!form.title.trim() || !form.projectId) return alert('Vui lòng nhập tiêu đề và chọn dự án');
        setSaving(true);
        try {
            const res = await fetch('/api/maintenance', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, estimatedCost: Number(form.estimatedCost) || 0 }),
            });
            if (!res.ok) throw new Error(await res.text());
            onCreated();
        } finally { setSaving(false); }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth:620, width:'96vw', maxHeight:'90vh', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ margin:0, fontSize:15 }}>➕ Tạo phiếu bảo dưỡng / hậu mãi mới</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body" style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14 }}>
                    <div><label className="form-label">Tiêu đề *</label><input className="form-input" value={form.title} onChange={f('title')} placeholder="Mô tả ngắn vấn đề cần xử lý" /></div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div><label className="form-label">Loại *</label><select className="form-select" value={form.type} onChange={f('type')}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
                        <div><label className="form-label">Danh mục lỗi</label><select className="form-select" value={form.category} onChange={f('category')}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
                        <div>
                            <label className="form-label">Mức độ ưu tiên</label>
                            <select className="form-select" value={form.priority} onChange={f('priority')} style={{ borderColor: PRIORITY_COLOR[form.priority] }}>
                                {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                            </select>
                            <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>SLA deadline: {slaDeadlinePreview}</div>
                        </div>
                        <div><label className="form-label">Dự án *</label>
                            <select className="form-select" value={form.projectId} onChange={f('projectId')}>
                                <option value="">-- Chọn dự án --</option>
                                {projects.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                            </select>
                        </div>
                        <div><label className="form-label">Kỹ thuật viên</label><input className="form-input" value={form.assignee} onChange={f('assignee')} placeholder="Tên KTV phụ trách" /></div>
                        <div><label className="form-label">Người báo cáo</label><input className="form-input" value={form.reportedBy} onChange={f('reportedBy')} placeholder="Khách hàng / CĐT" /></div>
                        <div><label className="form-label">Ngày hẹn xử lý</label><input type="date" className="form-input" value={form.scheduledDate} onChange={f('scheduledDate')} /></div>
                        <div><label className="form-label">Hết hạn bảo hành</label><input type="date" className="form-input" value={form.warrantyEndDate} onChange={f('warrantyEndDate')} /></div>
                        <div><label className="form-label">Lịch bảo dưỡng tiếp theo</label><input type="date" className="form-input" value={form.nextScheduleDate} onChange={f('nextScheduleDate')} /></div>
                        <div><label className="form-label">CP dự kiến (đ)</label><input type="number" className="form-input" value={form.estimatedCost} onChange={f('estimatedCost')} placeholder="0" /></div>
                    </div>
                    <div><label className="form-label">Mô tả sự cố</label><textarea className="form-input" rows={3} value={form.description} onChange={f('description')} style={{resize:'vertical'}} /></div>
                    <div><label className="form-label">Ghi chú nội bộ</label><textarea className="form-input" rows={2} value={form.notes} onChange={f('notes')} style={{resize:'vertical'}} /></div>
                </div>
                <div className="modal-footer" style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
                    <button className="btn" onClick={onClose}>Huỷ</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang tạo...' : '➕ Tạo phiếu'}</button>
                </div>
            </div>
        </div>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ records, onSelect, onRefresh }) {
    const now = Date.now();
    const open = records.filter(isOpen);
    const slaBreached = open.filter(r => r.slaDeadline && new Date(r.slaDeadline).getTime() < now);
    const slaNear  = open.filter(r => r.slaDeadline && new Date(r.slaDeadline).getTime() > now && (new Date(r.slaDeadline).getTime() - now) < 24 * 3_600_000);
    const warrantyExpiring = records.filter(r => r.warrantyEndDate && !['Huỷ'].includes(r.status) && (new Date(r.warrantyEndDate).getTime() - now) < 30 * 86_400_000 && new Date(r.warrantyEndDate).getTime() > now);
    const doneThisMonth = records.filter(r => r.completedDate && new Date(r.completedDate).getMonth() === new Date().getMonth() && new Date(r.completedDate).getFullYear() === new Date().getFullYear());
    const rated = records.filter(r => r.customerRating);
    const avgRating = rated.length ? (rated.reduce((s, r) => s + r.customerRating, 0) / rated.length).toFixed(1) : '—';
    const upcoming = records.filter(r => r.scheduledDate && new Date(r.scheduledDate).getTime() > now).sort((a,b) => new Date(a.scheduledDate)-new Date(b.scheduledDate)).slice(0,5);

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* KPIs */}
            <div className="stats-grid">
                {[
                    { icon:'🔧', label:'Tổng phiếu', val:records.length, color:'var(--text-primary)' },
                    { icon:'📂', label:'Đang mở', val:open.length, color:'#3b82f6' },
                    { icon:'🚨', label:'Vi phạm SLA', val:slaBreached.length, color: slaBreached.length > 0 ? '#dc2626' : '#16a34a' },
                    { icon:'✅', label:'Xong tháng này', val:doneThisMonth.length, color:'#16a34a' },
                    { icon:'⭐', label:'Rating TB', val:avgRating, color:'#f59e0b' },
                ].map(({ icon, label, val, color }) => (
                    <div key={label} className="stat-card">
                        <div style={{ fontSize:22 }}>{icon}</div>
                        <div style={{ fontSize:26, fontWeight:700, color, marginTop:4 }}>{val}</div>
                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{label}</div>
                    </div>
                ))}
            </div>

            {/* SLA breach alert */}
            {slaBreached.length > 0 && (
                <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'12px 16px' }}>
                    <div style={{ fontWeight:700, color:'#dc2626', fontSize:13, marginBottom:10 }}>🚨 {slaBreached.length} phiếu VI PHẠM SLA — Cần xử lý ngay</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {slaBreached.map(r => (
                            <div key={r.id} onClick={() => onSelect(r)} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'#fff', borderRadius:8, border:'1px solid #fca5a5' }}>
                                <span style={{ fontFamily:'monospace', fontSize:11, color:'#dc2626', fontWeight:700 }}>{r.code}</span>
                                <span style={{ flex:1, fontSize:12, fontWeight:600 }}>{r.title}</span>
                                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{r.project?.name}</span>
                                <StatusBadge status={r.status} />
                                <span style={{ fontSize:11, fontWeight:700, color:'#dc2626' }}>Quá hạn {Math.round((now - new Date(r.slaDeadline).getTime()) / 3_600_000)}h</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SLA near warning */}
            {slaNear.length > 0 && (
                <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:10, padding:'12px 16px' }}>
                    <div style={{ fontWeight:700, color:'#d97706', fontSize:13, marginBottom:8 }}>⚠️ {slaNear.length} phiếu sắp tới hạn SLA (trong 24h)</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {slaNear.map(r => <span key={r.id} onClick={() => onSelect(r)} style={{ cursor:'pointer', fontSize:11, padding:'4px 10px', background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:8, fontWeight:600, color:'#92400e' }}>{r.code} · {r.title.slice(0,30)}</span>)}
                    </div>
                </div>
            )}

            {/* Warranty expiring */}
            {warrantyExpiring.length > 0 && (
                <div style={{ background:'#fff7ed', border:'1px solid #fdba74', borderRadius:10, padding:'12px 16px' }}>
                    <div style={{ fontWeight:700, color:'#ea580c', fontSize:13, marginBottom:8 }}>🛡️ {warrantyExpiring.length} dự án sắp hết hạn bảo hành (trong 30 ngày)</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {warrantyExpiring.map(r => <span key={r.id} onClick={() => onSelect(r)} style={{ cursor:'pointer', fontSize:11, padding:'4px 10px', background:'#ffedd5', border:'1px solid #fdba74', borderRadius:8, fontWeight:600, color:'#9a3412' }}>{r.project?.name} · hết {fmtDate(r.warrantyEndDate)}</span>)}
                    </div>
                </div>
            )}

            {/* Upcoming schedule */}
            <div className="card">
                <div className="card-header"><span className="card-title">📅 Lịch xử lý sắp tới</span></div>
                {upcoming.length === 0 ? (
                    <div style={{ padding:'20px 0', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>Không có lịch nào sắp tới</div>
                ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                        {upcoming.map(r => (
                            <div key={r.id} onClick={() => onSelect(r)} style={{ cursor:'pointer', padding:'10px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
                                <div style={{ width:44, textAlign:'center', flexShrink:0 }}>
                                    <div style={{ fontSize:16, fontWeight:700, color:'var(--accent-primary)' }}>{new Date(r.scheduledDate).getDate()}</div>
                                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase' }}>{new Date(r.scheduledDate).toLocaleString('vi-VN',{month:'short'})}</div>
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontWeight:600, fontSize:13 }}>{r.title}</div>
                                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{CATEGORY_ICON[r.category]} {r.category} · {r.project?.name}</div>
                                </div>
                                <div style={{ textAlign:'right', flexShrink:0 }}>
                                    <StatusBadge status={r.status} />
                                    {r.assignee && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>👤 {r.assignee}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ records }) {
    // Cost by project
    const projectMap = {};
    records.forEach(r => {
        const key = r.projectId;
        if (!projectMap[key]) projectMap[key] = { name: r.project?.name || key, code: r.project?.code || '', estimated: 0, actual: 0, count: 0, open: 0 };
        projectMap[key].estimated += r.estimatedCost || 0;
        projectMap[key].actual    += r.actualCost    || 0;
        projectMap[key].count++;
        if (isOpen(r)) projectMap[key].open++;
    });
    const projectRows = Object.values(projectMap).sort((a,b) => b.actual - a.actual);

    // Category breakdown
    const catMap = {};
    records.forEach(r => { catMap[r.category] = (catMap[r.category] || 0) + 1; });
    const catRows = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
    const maxCat = catRows[0]?.[1] || 1;

    // SLA performance
    const closed = records.filter(r => ['Hoàn thành','Đã đánh giá'].includes(r.status));
    const onTime = closed.filter(r => !r.slaDeadline || !r.completedDate || new Date(r.completedDate) <= new Date(r.slaDeadline));
    const slaRate = closed.length ? Math.round((onTime.length / closed.length) * 100) : null;

    // Avg resolution time (hours)
    const withTime = closed.filter(r => r.receivedAt && r.completedDate);
    const avgHours = withTime.length ? Math.round(withTime.reduce((s,r) => s + (new Date(r.completedDate) - new Date(r.receivedAt)) / 3_600_000, 0) / withTime.length) : null;

    // Repeat issue rate
    const repeatCount = records.filter(r => r.isRepeatIssue).length;
    const repeatRate = records.length ? Math.round((repeatCount / records.length) * 100) : 0;

    // Rating distribution
    const ratingDist = [5,4,3,2,1].map(n => ({ n, count: records.filter(r => r.customerRating === n).length }));
    const totalRated = records.filter(r => r.customerRating).length;

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* KPI row */}
            <div className="stats-grid">
                {[
                    { label:'Tỉ lệ đúng SLA', val: slaRate !== null ? `${slaRate}%` : '—', color: slaRate >= 90 ? '#16a34a' : slaRate >= 70 ? '#f59e0b' : '#dc2626', icon:'⏱' },
                    { label:'Thời gian xử lý TB', val: avgHours !== null ? (avgHours >= 24 ? `${Math.round(avgHours/24)}n` : `${avgHours}h`) : '—', color:'#3b82f6', icon:'⏰' },
                    { label:'Tỉ lệ tái phát', val:`${repeatRate}%`, color: repeatRate < 15 ? '#16a34a' : '#dc2626', icon:'🔁' },
                    { label:'Đã đánh giá', val:`${totalRated}/${records.length}`, color:'#f59e0b', icon:'⭐' },
                ].map(({ label, val, color, icon }) => (
                    <div key={label} className="stat-card">
                        <div style={{ fontSize:20 }}>{icon}</div>
                        <div style={{ fontSize:24, fontWeight:700, color, marginTop:4 }}>{val}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                {/* Category chart */}
                <div className="card">
                    <div className="card-header"><span className="card-title">📊 Phân loại sự cố</span></div>
                    <div style={{ padding:'8px 0', display:'flex', flexDirection:'column', gap:8 }}>
                        {catRows.map(([cat, count]) => (
                            <div key={cat} style={{ padding:'0 16px', display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ fontSize:12, width:140, flexShrink:0 }}>{CATEGORY_ICON[cat]} {cat}</div>
                                <div style={{ flex:1, height:10, background:'var(--bg-secondary)', borderRadius:5, overflow:'hidden' }}>
                                    <div style={{ width:`${(count/maxCat)*100}%`, height:'100%', background:'var(--accent-primary)', borderRadius:5 }} />
                                </div>
                                <div style={{ fontSize:12, fontWeight:700, width:24, textAlign:'right', flexShrink:0 }}>{count}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rating distribution */}
                <div className="card">
                    <div className="card-header"><span className="card-title">⭐ Đánh giá khách hàng</span></div>
                    <div style={{ padding:'8px 0', display:'flex', flexDirection:'column', gap:8 }}>
                        {ratingDist.map(({ n, count }) => (
                            <div key={n} style={{ padding:'0 16px', display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ fontSize:13, width:60, flexShrink:0 }}>{'★'.repeat(n)}</div>
                                <div style={{ flex:1, height:10, background:'var(--bg-secondary)', borderRadius:5, overflow:'hidden' }}>
                                    <div style={{ width: totalRated ? `${(count/totalRated)*100}%` : '0%', height:'100%', background:'#f59e0b', borderRadius:5 }} />
                                </div>
                                <div style={{ fontSize:12, fontWeight:700, width:24, textAlign:'right', flexShrink:0 }}>{count}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Project warranty cost table */}
            <div className="card">
                <div className="card-header"><span className="card-title">💰 Chi phí bảo hành theo dự án</span></div>
                <div style={{ overflowX:'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Dự án</th><th>Số phiếu</th><th>Đang mở</th>
                                <th>CP dự kiến</th><th>CP thực tế</th><th>Chênh lệch</th>
                            </tr>
                        </thead>
                        <tbody>
                            {projectRows.map(p => {
                                const delta = p.actual - p.estimated;
                                return (
                                    <tr key={p.code}>
                                        <td><div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div><div style={{ fontSize:11, color:'var(--text-muted)' }}>{p.code}</div></td>
                                        <td style={{ textAlign:'center' }}>{p.count}</td>
                                        <td style={{ textAlign:'center', color: p.open > 0 ? '#f59e0b' : '#6b7280', fontWeight: p.open > 0 ? 700 : 400 }}>{p.open || '—'}</td>
                                        <td style={{ fontSize:12 }}>{fmt(p.estimated)}</td>
                                        <td style={{ fontSize:12, fontWeight:700 }}>{fmt(p.actual)}</td>
                                        <td style={{ fontSize:12, fontWeight:700, color: delta > 0 ? '#dc2626' : delta < 0 ? '#16a34a' : 'var(--text-muted)' }}>
                                            {delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {delta !== 0 ? fmt(Math.abs(delta)) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {projectRows.length === 0 && <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>Chưa có dữ liệu</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
    const [records, setRecords]     = useState([]);
    const [projects, setProjects]   = useState([]);
    const [loading, setLoading]     = useState(true);
    const [tab, setTab]             = useState('overview');
    const [selected, setSelected]   = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(Date.now());

    // Ticket list filters
    const [search, setSearch]     = useState('');
    const [fStatus, setFStatus]   = useState('');
    const [fType, setFType]       = useState('');
    const [fCat, setFCat]         = useState('');
    const [fPrio, setFPrio]       = useState('');

    const loadRecords = useCallback(async () => {
        const res = await fetch('/api/maintenance?limit=500');
        const d = await res.json();
        setRecords(d.data || []);
        setLastRefresh(Date.now());
        setLoading(false);
    }, []);

    useEffect(() => {
        loadRecords();
        fetch('/api/projects?limit=500').then(r => r.json()).then(d => setProjects(d.data || []));
    }, [loadRecords]);

    // Realtime polling every 30s
    useEffect(() => {
        const id = setInterval(loadRecords, 30_000);
        return () => clearInterval(id);
    }, [loadRecords]);

    const handleUpdated = () => loadRecords();

    const handleCreated = () => { setShowCreate(false); loadRecords(); };

    // Filtered tickets
    const filtered = records.filter(r => {
        if (fStatus && r.status !== fStatus) return false;
        if (fType   && r.type !== fType)     return false;
        if (fCat    && r.category !== fCat)  return false;
        if (fPrio   && r.priority !== fPrio) return false;
        if (search) {
            const s = search.toLowerCase();
            if (!r.title.toLowerCase().includes(s) && !r.code.toLowerCase().includes(s) && !r.project?.name?.toLowerCase().includes(s) && !(r.assignee||'').toLowerCase().includes(s)) return false;
        }
        return true;
    });

    const TABS = [
        { key:'overview', label:'🏠 Tổng quan' },
        { key:'tickets',  label:'🎫 Tickets' },
        { key:'schedule', label:'📅 Lịch' },
        { key:'analytics',label:'📊 Phân tích' },
    ];

    const secondsAgo = Math.round((Date.now() - lastRefresh) / 1000);

    return (
        <div>
            {/* Page header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
                <div>
                    <h1 style={{ fontSize:20, fontWeight:700, margin:0 }}>🔧 Trung tâm Bảo dưỡng & Hậu mãi</h1>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, display:'flex', alignItems:'center', gap:6 }}>
                        <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:'#22c55e', animation:'pulse 2s infinite' }} />
                        Live · cập nhật {secondsAgo < 5 ? 'vừa xong' : `${secondsAgo}s trước`}
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>➕ Tạo phiếu mới</button>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:4, borderBottom:'2px solid var(--border)', marginBottom:20 }}>
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ padding:'8px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13, fontWeight: tab===t.key ? 700 : 400, color: tab===t.key ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: tab===t.key ? '2px solid var(--accent-primary)' : '2px solid transparent', marginBottom:-2 }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ padding:60, textAlign:'center', color:'var(--text-muted)' }}>Đang tải dữ liệu...</div>
            ) : (
                <>
                    {tab === 'overview' && <OverviewTab records={records} onSelect={setSelected} onRefresh={loadRecords} />}

                    {tab === 'tickets' && (
                        <div>
                            <div className="filter-bar" style={{ marginBottom:16 }}>
                                <input type="text" className="form-input" placeholder="🔍 Tìm mã, tiêu đề, dự án, KTV..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex:1, minWidth:0 }} />
                                <select className="form-select" value={fStatus} onChange={e => setFStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
                                <select className="form-select" value={fType} onChange={e => setFType(e.target.value)}><option value="">Tất cả loại</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select>
                                <select className="form-select" value={fCat} onChange={e => setFCat(e.target.value)}><option value="">Tất cả danh mục</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
                                <select className="form-select" value={fPrio} onChange={e => setFPrio(e.target.value)}><option value="">Tất cả ưu tiên</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
                            </div>
                            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>{filtered.length} phiếu</div>
                            <div style={{ overflowX:'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr><th>Mã</th><th>Tiêu đề</th><th>Dự án</th><th>Danh mục</th><th>Ưu tiên</th><th>SLA</th><th>KTV</th><th>Trạng thái</th><th>Đánh giá</th></tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(r => {
                                            const sla = slaStatus(r);
                                            return (
                                                <tr key={r.id} style={{ cursor:'pointer' }} onClick={() => setSelected(r)}>
                                                    <td>
                                                        <div style={{ fontFamily:'monospace', fontSize:11, color:'var(--accent-primary)', fontWeight:700 }}>{r.code}</div>
                                                        {r.isRepeatIssue && <div style={{ fontSize:9, color:'#7c3aed', fontWeight:700 }}>🔁 Tái phát</div>}
                                                    </td>
                                                    <td style={{ maxWidth:200 }}>
                                                        <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                                                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtDate(r.receivedAt)}</div>
                                                    </td>
                                                    <td style={{ fontSize:12 }}><div style={{ fontWeight:600 }}>{r.project?.name}</div><div style={{ fontSize:10, color:'var(--text-muted)' }}>{r.project?.code}</div></td>
                                                    <td style={{ fontSize:12 }}>{CATEGORY_ICON[r.category]} {r.category}</td>
                                                    <td><span style={{ fontSize:11, fontWeight:700, color:PRIORITY_COLOR[r.priority] }}>{r.priority}</span></td>
                                                    <td>{sla ? <span style={{ fontSize:11, fontWeight:700, color:sla.color, background:sla.bg, padding:'2px 6px', borderRadius:6 }}>{sla.label}</span> : <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>}</td>
                                                    <td style={{ fontSize:12 }}>{r.assignee || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                                                    <td><StatusBadge status={r.status} /></td>
                                                    <td>{r.customerRating ? <Stars value={r.customerRating} size={13} /> : <span style={{ color:'var(--text-muted)', fontSize:11 }}>—</span>}</td>
                                                </tr>
                                            );
                                        })}
                                        {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign:'center', padding:30, color:'var(--text-muted)' }}>Không có phiếu nào</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'schedule' && (
                        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                            {(() => {
                                const now = Date.now();
                                const withDate = records.filter(r => r.scheduledDate).sort((a,b) => new Date(a.scheduledDate)-new Date(b.scheduledDate));
                                const overdue  = withDate.filter(r => new Date(r.scheduledDate).getTime() < now && isOpen(r));
                                const upcoming = withDate.filter(r => new Date(r.scheduledDate).getTime() >= now);
                                const noDate   = records.filter(r => !r.scheduledDate && isOpen(r));
                                return (
                                    <>
                                        {overdue.length > 0 && (
                                            <div>
                                                <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', marginBottom:8 }}>⚠️ Quá hạn lịch hẹn ({overdue.length})</div>
                                                {overdue.map(r => <ScheduleCard key={r.id} r={r} onClick={() => setSelected(r)} overdue />)}
                                            </div>
                                        )}
                                        {upcoming.length > 0 && (
                                            <div>
                                                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>📅 Sắp tới ({upcoming.length})</div>
                                                {upcoming.map(r => <ScheduleCard key={r.id} r={r} onClick={() => setSelected(r)} />)}
                                            </div>
                                        )}
                                        {noDate.length > 0 && (
                                            <div>
                                                <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>📋 Chưa xếp lịch ({noDate.length})</div>
                                                {noDate.map(r => <ScheduleCard key={r.id} r={r} onClick={() => setSelected(r)} />)}
                                            </div>
                                        )}
                                        {withDate.length === 0 && noDate.length === 0 && <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>Chưa có lịch bảo dưỡng nào</div>}
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {tab === 'analytics' && <AnalyticsTab records={records} />}
                </>
            )}

            {selected && (
                <DetailModal
                    key={selected.id}
                    record={selected}
                    onClose={() => setSelected(null)}
                    onUpdated={() => { handleUpdated(); }}
                    projects={projects}
                />
            )}

            {showCreate && (
                <CreateModal
                    onClose={() => setShowCreate(false)}
                    onCreated={handleCreated}
                    projects={projects}
                />
            )}
        </div>
    );
}

function ScheduleCard({ r, onClick, overdue }) {
    const sla = slaStatus(r);
    return (
        <div onClick={onClick} style={{ cursor:'pointer', padding:'12px 16px', marginBottom:6, background:'var(--card-bg)', border:`1px solid ${overdue ? '#fca5a5' : 'var(--border)'}`, borderRadius:10, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:48, textAlign:'center', flexShrink:0, background: overdue ? '#fee2e2' : 'var(--bg-secondary)', borderRadius:8, padding:'6px 0' }}>
                <div style={{ fontSize:18, fontWeight:700, color: overdue ? '#dc2626' : 'var(--accent-primary)' }}>{r.scheduledDate ? new Date(r.scheduledDate).getDate() : '—'}</div>
                <div style={{ fontSize:9, color:'var(--text-muted)', textTransform:'uppercase' }}>{r.scheduledDate ? new Date(r.scheduledDate).toLocaleString('vi-VN',{month:'short'}) : ''}</div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{CATEGORY_ICON[r.category]} {r.category} · {r.project?.name} · {r.assignee ? `👤 ${r.assignee}` : 'Chưa phân công'}</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                <StatusBadge status={r.status} />
                {sla && <span style={{ fontSize:10, color:sla.color, fontWeight:700 }}>{sla.label}</span>}
            </div>
        </div>
    );
}
