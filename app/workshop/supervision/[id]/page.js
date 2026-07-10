'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/contexts/RoleContext';

const fmtDate = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';

const STATUS_LABEL = { pending: 'Chưa kiểm tra', pass: 'Đạt', fail: 'Không đạt' };
const STATUS_STYLE = {
    pending: { color: '#6b7280', bg: '#f3f4f6', border: 'var(--border)' },
    pass:    { color: '#15803d', bg: '#dcfce7', border: '#16a34a' },
    fail:    { color: '#dc2626', bg: '#fee2e2', border: '#dc2626' },
};

function parsePhotos(json) {
    try { const a = JSON.parse(json || '[]'); return Array.isArray(a) ? a : []; } catch { return []; }
}

function ChecklistItemRow({ item, onUpdate }) {
    const [note, setNote] = useState(item.note || '');
    const [expanded, setExpanded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const photos = parsePhotos(item.photos);
    const style = STATUS_STYLE[item.status] || STATUS_STYLE.pending;

    const setStatus = (status) => onUpdate(item.id, { status });
    const saveNote = () => { if (note !== (item.note || '')) onUpdate(item.id, { note }); };

    const handleFiles = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        try {
            const uploaded = [];
            for (const file of files) {
                const form = new FormData();
                form.append('file', file);
                form.append('type', 'proofs');
                const res = await fetch('/api/upload?type=proofs', { method: 'POST', body: form });
                const data = await res.json();
                if (data.url) uploaded.push(data.url);
            }
            if (uploaded.length) onUpdate(item.id, { photos: [...photos, ...uploaded] });
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const removePhoto = (url) => onUpdate(item.id, { photos: photos.filter(p => p !== url) });

    return (
        <div style={{ border: `1px solid ${item.status === 'fail' ? '#fecaca' : 'var(--border-light)'}`, borderRadius: 8, padding: '10px 12px', background: item.status === 'fail' ? 'rgba(220,38,38,0.03)' : 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                    {item.hint && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>💡 {item.hint}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {['pass', 'fail'].map(s => (
                        <button key={s} type="button" onClick={() => setStatus(item.status === s ? 'pending' : s)}
                            style={{
                                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                border: `1.5px solid ${item.status === s ? STATUS_STYLE[s].border : 'var(--border)'}`,
                                background: item.status === s ? STATUS_STYLE[s].bg : 'transparent',
                                color: item.status === s ? STATUS_STYLE[s].color : 'var(--text-muted)',
                            }}>
                            {STATUS_LABEL[s]}
                        </button>
                    ))}
                    <button type="button" onClick={() => setExpanded(e => !e)}
                        className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                        {expanded ? 'Thu gọn' : 'Chi tiết'}{photos.length > 0 && ` (${photos.length}📷)`}
                    </button>
                </div>
            </div>

            {expanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea className="form-input" rows={2} placeholder="Ghi chú..."
                        value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote}
                        style={{ fontSize: 12, resize: 'vertical' }} />

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {photos.map(url => (
                            <div key={url} style={{ position: 'relative' }}>
                                <a href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                                </a>
                                <button type="button" onClick={() => removePhoto(url)}
                                    style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', fontSize: 11, cursor: 'pointer', lineHeight: '18px' }}>×</button>
                            </div>
                        ))}
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                            {uploading ? 'Đang tải...' : '📷 Thêm ảnh'}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment"
                            style={{ display: 'none' }} onChange={handleFiles} />
                    </div>

                    {item.checkedBy && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Kiểm tra bởi {item.checkedBy} · {fmtDate(item.checkedAt)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function SupervisionChecklistDetail() {
    const router = useRouter();
    const { id } = useParams();
    const { role, roleInfo } = useRole();
    const [checklist, setChecklist] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchChecklist = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const res = await fetch(`/api/supervision/checklists/${id}`);
        if (res.ok) setChecklist(await res.json());
        if (!silent) setLoading(false);
    }, [id]);

    useEffect(() => {
        if (role && !['xuong', 'ban_gd', 'giam_doc', 'pho_gd'].includes(role)) {
            router.replace('/');
            return;
        }
        fetchChecklist();
    }, [role, fetchChecklist]);

    const updateItem = async (itemId, patch) => {
        // Optimistic update
        setChecklist(c => ({
            ...c,
            items: c.items.map(i => i.id === itemId ? { ...i, ...patch, photos: patch.photos ? JSON.stringify(patch.photos) : i.photos } : i),
        }));
        await fetch(`/api/supervision/checklist-items/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
        });
        fetchChecklist(true);
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            await fetch(`/api/supervision/checklists/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Hoàn thành' }),
            });
            fetchChecklist();
        } finally { setSaving(false); }
    };

    const handleReopen = async () => {
        setSaving(true);
        try {
            await fetch(`/api/supervision/checklists/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Đang thực hiện' }),
            });
            fetchChecklist();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!confirm('Xóa checklist này? Toàn bộ dữ liệu kiểm tra và ảnh đính kèm sẽ không còn hiển thị.')) return;
        setSaving(true);
        try {
            await fetch(`/api/supervision/checklists/${id}`, { method: 'DELETE' });
            router.push('/workshop/supervision');
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--text-muted)' }}>Đang tải...</div>
    );
    if (!checklist) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--text-muted)' }}>Không tìm thấy checklist</div>
    );

    const total = checklist.items.length;
    const pass = checklist.items.filter(i => i.status === 'pass').length;
    const fail = checklist.items.filter(i => i.status === 'fail').length;
    const checked = pass + fail;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

    const groups = [];
    for (const item of checklist.items) {
        let g = groups.find(g => g.name === item.groupName);
        if (!g) { g = { name: item.groupName, items: [] }; groups.push(g); }
        g.items.push(item);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
            <div>
                <Link href="/workshop/supervision" style={{ fontSize: 13, color: 'var(--text-muted)' }}>← Danh sách checklist</Link>
            </div>

            <div className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18 }}>{checklist.templateName}</h2>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            {checklist.project?.code} · {checklist.project?.name}
                        </div>
                        {checklist.createdBy && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                Tạo bởi {checklist.createdBy} · {fmtDate(checklist.createdAt)}
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{
                            fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                            background: checklist.status === 'Hoàn thành' ? '#dcfce7' : '#dbeafe',
                            color: checklist.status === 'Hoàn thành' ? '#15803d' : '#2563eb',
                        }}>{checklist.status}</span>
                        {checklist.status === 'Hoàn thành' ? (
                            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost btn-sm" disabled={saving} onClick={handleReopen}>Mở lại</button>
                                <button className="btn btn-ghost btn-sm" disabled={saving} onClick={handleDelete} style={{ color: '#dc2626' }}>🗑️ Xóa</button>
                            </div>
                        ) : (
                            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost btn-sm" disabled={saving} onClick={handleDelete} style={{ color: '#dc2626' }}>🗑️ Xóa</button>
                                <button className="btn btn-primary btn-sm" disabled={saving} onClick={handleComplete}>
                                    {saving ? 'Đang lưu...' : '✓ Hoàn thành checklist'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ marginTop: 14 }}>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: fail > 0 ? '#dc2626' : '#16a34a', transition: 'width .2s' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>
                        <span>{checked}/{total} đã kiểm tra ({pct}%)</span>
                        <span style={{ color: '#15803d' }}>✓ Đạt: {pass}</span>
                        {fail > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>✕ Không đạt: {fail}</span>}
                    </div>
                </div>
            </div>

            {groups.map(g => (
                <div key={g.name} className="card" style={{ padding: 14 }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>{g.name}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {g.items.map(item => (
                            <ChecklistItemRow key={item.id} item={item} onUpdate={updateItem} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
