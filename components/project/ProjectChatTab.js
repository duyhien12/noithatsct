'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const relTime = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const isImage = (url) => /\.(jpg|jpeg|png|gif|webp|heic|avif)(\?|$)/i.test(url);

const ROLE_COLORS = {
    ban_gd: '#7c3aed', giam_doc: '#7c3aed', pho_gd: '#7c3aed',
    kinh_doanh: '#0284c7', ke_toan: '#0369a1', hanh_chinh_kt: '#0369a1',
    xuong: '#d97706', ky_thuat: '#059669', xay_dung: '#dc2626',
};

function Avatar({ name, role }) {
    const initials = name ? name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() : '?';
    const bg = ROLE_COLORS[role] || '#6b7280';
    return (
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {initials}
        </div>
    );
}

export default function ProjectChatTab({ projectId }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [text, setText] = useState('');
    const [attachments, setAttachments] = useState([]); // { url, name, isImage }
    const [uploading, setUploading] = useState(false);
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);
    const fileInputRef = useRef(null);
    const textRef = useRef(null);
    const lastMsgTime = useRef(null);

    const fetchMsgs = useCallback(async (poll = false) => {
        const url = poll && lastMsgTime.current
            ? `/api/projects/${projectId}/chat?after=${encodeURIComponent(lastMsgTime.current)}`
            : `/api/projects/${projectId}/chat`;
        const data = await fetch(url).then(r => r.json()).catch(() => []);
        if (!Array.isArray(data)) return;
        if (poll) {
            if (data.length > 0) {
                setMessages(prev => [...prev, ...data]);
                lastMsgTime.current = data[data.length - 1].createdAt;
            }
        } else {
            setMessages(data);
            if (data.length > 0) lastMsgTime.current = data[data.length - 1].createdAt;
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchMsgs();
        const iv = setInterval(() => fetchMsgs(true), 8000);
        return () => clearInterval(iv);
    }, [fetchMsgs]);

    useEffect(() => {
        if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const uploadFile = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', 'documents');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload thất bại');
        const data = await res.json();
        return { url: data.url, name: file.name, isImg: isImage(data.url) };
    };

    const handleFiles = async (files) => {
        if (!files?.length) return;
        setUploading(true);
        try {
            const results = await Promise.all(Array.from(files).map(uploadFile));
            setAttachments(prev => [...prev, ...results]);
        } catch (e) {
            alert(e.message || 'Lỗi upload file');
        }
        setUploading(false);
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const imageItems = Array.from(items).filter(it => it.type.startsWith('image/'));
        if (imageItems.length === 0) return;
        e.preventDefault();
        const files = imageItems.map(it => it.getAsFile()).filter(Boolean);
        await handleFiles(files);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        await handleFiles(e.dataTransfer.files);
    };

    const send = async () => {
        if (!text.trim() && attachments.length === 0) return;
        setSending(true);
        const res = await fetch(`/api/projects/${projectId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text.trim(), images: attachments.map(a => a.url) }),
        });
        setSending(false);
        if (!res.ok) return alert('Gửi thất bại');
        setText('');
        setAttachments([]);
        fetchMsgs();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 520 }}>
            {/* Message list */}
            <div
                style={{ flex: 1, overflowY: 'auto', padding: '12px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
            >
                {messages.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
                        <div style={{ fontSize: 36 }}>💬</div>
                        <div style={{ fontSize: 13 }}>Chưa có nhận xét — hãy bắt đầu cuộc trò chuyện</div>
                    </div>
                )}
                {messages.map((msg, i) => {
                    const imgs = (() => { try { return JSON.parse(msg.images || '[]'); } catch { return []; } })();
                    const showName = i === 0 || messages[i - 1].senderName !== msg.senderName;
                    return (
                        <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            {showName
                                ? <Avatar name={msg.senderName} role={msg.senderRole} />
                                : <div style={{ width: 34, flexShrink: 0 }} />
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                                {showName && (
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: ROLE_COLORS[msg.senderRole] || 'var(--text-primary)' }}>{msg.senderName}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relTime(msg.createdAt)}</span>
                                    </div>
                                )}
                                {msg.content && (
                                    <div style={{ background: 'var(--bg-secondary)', borderRadius: '0 10px 10px 10px', padding: '8px 12px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: 600 }}>
                                        {msg.content}
                                    </div>
                                )}
                                {imgs.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: msg.content ? 6 : 0 }}>
                                        {imgs.map((url, j) => isImage(url) ? (
                                            <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                                                <img src={url} alt="" style={{ maxHeight: 180, maxWidth: 240, borderRadius: 8, border: '1px solid var(--border-light)', objectFit: 'cover', cursor: 'zoom-in' }} />
                                            </a>
                                        ) : (
                                            <a key={j} href={url} target="_blank" rel="noopener noreferrer"
                                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 12, color: 'var(--accent-primary)', textDecoration: 'none' }}>
                                                📎 {url.split('/').pop().split('?')[0].substring(37) || 'Tài liệu'}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Attachments preview */}
            {attachments.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0', borderTop: '1px solid var(--border-light)' }}>
                    {attachments.map((a, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            {a.isImg
                                ? <img src={a.url} alt={a.name} style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border-light)' }} />
                                : <div style={{ height: 60, width: 100, borderRadius: 6, border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)', padding: 4, gap: 2 }}>
                                    <span style={{ fontSize: 20 }}>📄</span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '90%', textAlign: 'center' }}>{a.name}</span>
                                </div>
                            }
                            <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 10, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                    ))}
                    {uploading && <div style={{ height: 60, width: 60, borderRadius: 6, border: '1px dashed var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⏳</div>}
                </div>
            )}

            {/* Input area */}
            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 10, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                    style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Đính kèm file"
                    style={{ padding: '8px 10px', border: '1px solid var(--border-light)', borderRadius: 8, background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: 16, flexShrink: 0, opacity: uploading ? 0.5 : 1 }}
                >
                    📎
                </button>
                <textarea
                    ref={textRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    rows={1}
                    placeholder="Nhập nhận xét… (Enter để gửi, Shift+Enter xuống dòng, có thể paste ảnh trực tiếp)"
                    style={{ flex: 1, resize: 'none', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-light)', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.5, background: 'var(--bg-input, var(--bg-secondary))', color: 'var(--text-primary)', outline: 'none', maxHeight: 120, overflowY: 'auto' }}
                    onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                />
                <button
                    className="btn btn-primary"
                    onClick={send}
                    disabled={sending || uploading || (!text.trim() && attachments.length === 0)}
                    style={{ padding: '8px 16px', flexShrink: 0 }}
                >
                    {sending ? '...' : 'Gửi'}
                </button>
            </div>
        </div>
    );
}
