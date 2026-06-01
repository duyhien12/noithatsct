'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const ROLE_COLORS = {
    ban_gd: '#7c3aed', giam_doc: '#7c3aed', pho_gd: '#7c3aed',
    kinh_doanh: '#0284c7', ke_toan: '#0369a1', hanh_chinh_kt: '#0369a1',
    xuong: '#d97706', ky_thuat: '#059669', xay_dung: '#dc2626',
};

function Avatar({ name, role }) {
    const initials = name ? name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() : '?';
    const bg = ROLE_COLORS[role] || '#6b7280';
    return (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {initials}
        </div>
    );
}

function fmtDateHeader(d) {
    const date = new Date(d);
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    return `${days[date.getDay()]}, ${date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}

function fmtTime(d) {
    return new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function dateKey(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}

function PhotoGrid({ urls }) {
    if (!urls.length) return null;
    const count = urls.length;
    const gridStyle = count === 1
        ? { display: 'block' }
        : count === 2
            ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }
            : count === 3
                ? { display: 'grid', gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr', gap: 3 }
                : { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 };

    const shown = count > 4 ? urls.slice(0, 4) : urls;
    const extra = count > 4 ? count - 4 : 0;

    return (
        <div style={{ ...gridStyle, borderRadius: 10, overflow: 'hidden', marginTop: 10 }}>
            {shown.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ position: 'relative', display: 'block', gridRow: count === 3 && i === 0 ? 'span 2' : undefined }}>
                    <img
                        src={url} alt=""
                        style={{
                            width: '100%',
                            height: count === 1 ? 'auto' : count === 2 ? 220 : 160,
                            maxHeight: count === 1 ? 500 : undefined,
                            objectFit: 'cover',
                            display: 'block',
                        }}
                    />
                    {extra > 0 && i === 3 && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 700 }}>
                            +{extra}
                        </div>
                    )}
                </a>
            ))}
        </div>
    );
}

function PostForm({ projectId, onPosted }) {
    const [text, setText] = useState('');
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const fileRef = useRef(null);
    const dropRef = useRef(null);

    const uploadFiles = async (files) => {
        if (!files?.length) return;
        setUploading(true);
        try {
            const results = await Promise.all(Array.from(files).map(async (f) => {
                const fd = new FormData();
                fd.append('file', f);
                fd.append('type', 'proofs');
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!res.ok) throw new Error('Upload thất bại');
                const d = await res.json();
                return d.url;
            }));
            setImages(prev => [...prev, ...results]);
        } catch (e) {
            alert(e.message || 'Lỗi upload ảnh');
        }
        setUploading(false);
    };

    const handlePaste = async (e) => {
        const items = Array.from(e.clipboardData?.items || []).filter(it => it.type.startsWith('image/'));
        if (!items.length) return;
        e.preventDefault();
        await uploadFiles(items.map(it => it.getAsFile()).filter(Boolean));
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length) await uploadFiles(files);
    };

    const post = async () => {
        if (!text.trim() && images.length === 0) return;
        setSending(true);
        const res = await fetch(`/api/projects/${projectId}/diary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text.trim(), images }),
        });
        setSending(false);
        if (!res.ok) return alert('Đăng thất bại');
        setText('');
        setImages([]);
        onPosted();
    };

    return (
        <div
            ref={dropRef}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            style={{ border: '1px solid var(--border-light)', borderRadius: 12, padding: 14, background: 'var(--bg-secondary)', marginBottom: 20 }}
        >
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Ghi chú nhật ký lắp đặt hôm nay… (có thể paste ảnh trực tiếp)"
                rows={3}
                style={{ width: '100%', resize: 'none', border: 'none', background: 'transparent', fontSize: 14, fontFamily: 'inherit', color: 'var(--text-primary)', outline: 'none', lineHeight: 1.6 }}
            />

            {/* Ảnh preview */}
            {images.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {images.map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            <img src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-light)' }} />
                            <button
                                onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                                style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >✕</button>
                        </div>
                    ))}
                    {uploading && (
                        <div style={{ width: 80, height: 80, borderRadius: 8, border: '1px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⏳</div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={e => uploadFiles(e.target.files)} />
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        title="Thêm ảnh"
                        style={{ padding: '6px 12px', border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-primary)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: uploading ? 0.5 : 1 }}
                    >
                        📷 Thêm ảnh
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Hoặc kéo thả / paste ảnh</span>
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={post}
                    disabled={sending || uploading || (!text.trim() && images.length === 0)}
                >
                    {sending ? 'Đang đăng...' : '📤 Đăng nhật ký'}
                </button>
            </div>
        </div>
    );
}

export default function ProjectDiaryTab({ projectId, currentUserName, currentUserRole }) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    const fetchEntries = useCallback(async () => {
        const data = await fetch(`/api/projects/${projectId}/diary`).then(r => r.json()).catch(() => []);
        if (Array.isArray(data)) {
            setEntries(data.reverse()); // newest first
        }
        setLoading(false);
    }, [projectId]);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    const handleDelete = async (id) => {
        if (!confirm('Xóa bài nhật ký này?')) return;
        setDeleting(id);
        await fetch(`/api/projects/${projectId}/diary?entryId=${id}`, { method: 'DELETE' });
        setDeleting(null);
        fetchEntries();
    };

    const canDelete = (entry) => {
        const isOwner = entry.senderName === currentUserName;
        const isAdmin = ['ban_gd', 'giam_doc', 'pho_gd'].includes(currentUserRole);
        return isOwner || isAdmin;
    };

    // Group by date
    const grouped = [];
    let lastKey = null;
    for (const entry of entries) {
        const k = dateKey(entry.createdAt);
        if (k !== lastKey) {
            grouped.push({ date: entry.createdAt, key: k, entries: [] });
            lastKey = k;
        }
        grouped[grouped.length - 1].entries.push(entry);
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div>
            <PostForm projectId={projectId} onPosted={fetchEntries} />

            {entries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: 14 }}>Chưa có nhật ký — hãy đăng ảnh công trình hôm nay</div>
                </div>
            )}

            {grouped.map(group => (
                <div key={group.key} style={{ marginBottom: 28 }}>
                    {/* Date header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <div style={{ height: 1, flex: 1, background: 'var(--border-light)' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', padding: '2px 10px', background: 'var(--bg-secondary)', borderRadius: 20, border: '1px solid var(--border-light)' }}>
                            {fmtDateHeader(group.date)}
                        </span>
                        <div style={{ height: 1, flex: 1, background: 'var(--border-light)' }} />
                    </div>

                    {/* Entries for this date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {group.entries.map(entry => {
                            const imgs = (() => { try { return JSON.parse(entry.images || '[]'); } catch { return []; } })();
                            return (
                                <div key={entry.id} style={{ border: '1px solid var(--border-light)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-primary)' }}>
                                    {/* Entry header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                                        <Avatar name={entry.senderName} role={entry.senderRole} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: ROLE_COLORS[entry.senderRole] || 'var(--text-primary)' }}>{entry.senderName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(entry.createdAt)}</div>
                                        </div>
                                        {canDelete(entry) && (
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                disabled={deleting === entry.id}
                                                style={{ padding: '4px 10px', border: '1px solid var(--border-light)', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)' }}
                                            >
                                                {deleting === entry.id ? '...' : 'Xóa'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Caption */}
                                    {entry.content && (
                                        <div style={{ padding: '0 14px 10px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {entry.content}
                                        </div>
                                    )}

                                    {/* Photos */}
                                    {imgs.length > 0 && (
                                        <div style={{ padding: imgs.length === 1 ? '0 14px 14px' : '0' }}>
                                            <PhotoGrid urls={imgs} />
                                        </div>
                                    )}
                                    {imgs.length === 0 && <div style={{ paddingBottom: 6 }} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
