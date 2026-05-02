'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

function parseImages(json) {
    try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; } catch { return []; }
}

function fmtTime(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const hm = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    if (isToday) return hm;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${hm}`;
}

function getInitial(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts[parts.length - 1][0]?.toUpperCase() || '?';
}

function avatarColor(name) {
    const colors = ['#2563eb','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#be185d'];
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
    return colors[h];
}

// Hiển thị 1 tin nhắn
function Bubble({ msg, isMe }) {
    const [lightbox, setLightbox] = useState(null);
    const images = parseImages(msg.images);

    return (
        <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginBottom: 10, alignItems: 'flex-end' }}>
            {/* Avatar */}
            {!isMe && (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(msg.userName), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {getInitial(msg.userName)}
                </div>
            )}

            <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                {/* Tên người gửi (chỉ hiện bên trái) */}
                {!isMe && (
                    <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, paddingLeft: 4 }}>{msg.userName}</div>
                )}

                {/* Bubble text */}
                {msg.content && (
                    <div style={{
                        padding: '8px 12px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        background: isMe ? '#2563eb' : '#f3f4f6',
                        color: isMe ? '#fff' : '#111827',
                        fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    }}>{msg.content}</div>
                )}

                {/* Ảnh */}
                {images.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 220 }}>
                        {images.map((url, i) => (
                            <img key={i} src={url} alt="" onClick={() => setLightbox(url)}
                                style={{ width: images.length === 1 ? 180 : 100, height: images.length === 1 ? 135 : 100, objectFit: 'cover', borderRadius: 10, cursor: 'pointer', border: '1px solid #e5e7eb' }} />
                        ))}
                    </div>
                )}

                <div style={{ fontSize: 10, color: '#9ca3af', paddingLeft: 4, paddingRight: 4 }}>{fmtTime(msg.createdAt)}</div>
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setLightbox(null)}>
                    <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' }} />
                    <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
            )}
        </div>
    );
}

export default function WorkshopChat() {
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [unread, setUnread] = useState(0);
    const [lastSeenAt, setLastSeenAt] = useState(() => localStorage.getItem('chat_last_seen') || null);
    const [isMobile, setIsMobile] = useState(false);
    const lastTsRef = useRef(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const fileRef = useRef(null);
    const pollingRef = useRef(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const myId = session?.user?.id || session?.user?.email;

    // Load tin đầu tiên
    const loadInitial = useCallback(async () => {
        try {
            const r = await fetch('/api/chat');
            if (!r.ok) return;
            const data = await r.json();
            if (Array.isArray(data) && data.length > 0) {
                setMessages(data);
                lastTsRef.current = data[data.length - 1].createdAt;
                // Đếm unread
                const lastSeen = localStorage.getItem('chat_last_seen');
                if (lastSeen) {
                    setUnread(data.filter(m => new Date(m.createdAt) > new Date(lastSeen) && (m.userId !== myId)).length);
                }
            }
        } catch {}
    }, [myId]);

    // Polling tin mới
    const pollNew = useCallback(async () => {
        if (!lastTsRef.current) return;
        try {
            const r = await fetch(`/api/chat?after=${encodeURIComponent(lastTsRef.current)}`);
            if (!r.ok) return;
            const data = await r.json();
            if (Array.isArray(data) && data.length > 0) {
                setMessages(prev => [...prev, ...data]);
                lastTsRef.current = data[data.length - 1].createdAt;
                if (!open) setUnread(prev => prev + data.filter(m => m.userId !== myId).length);
            }
        } catch {}
    }, [open, myId]);

    useEffect(() => { loadInitial(); }, [loadInitial]);

    useEffect(() => {
        pollingRef.current = setInterval(pollNew, 5000);
        return () => clearInterval(pollingRef.current);
    }, [pollNew]);

    // Scroll xuống khi mở hoặc có tin mới
    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [open, messages.length]);

    // Đánh dấu đã đọc khi mở chat
    useEffect(() => {
        if (open && messages.length > 0) {
            const now = new Date().toISOString();
            localStorage.setItem('chat_last_seen', now);
            setUnread(0);
        }
    }, [open, messages.length]);

    const send = async () => {
        if (!input.trim() || sending) return;
        setSending(true);
        const text = input.trim();
        setInput('');
        try {
            await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text, images: [] }),
            });
            await pollNew();
        } catch {}
        setSending(false);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const handleImageUpload = async (files) => {
        if (!files?.length) return;
        setUploading(true);
        const urls = [];
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;
            // Nén ảnh trước khi upload
            const compressed = await compressImage(file, 1200, 0.8);
            const fd = new FormData();
            fd.append('file', compressed, file.name);
            fd.append('type', 'proofs');
            try {
                const r = await fetch('/api/upload', { method: 'POST', body: fd });
                const d = await r.json();
                if (d.url) urls.push(d.url);
            } catch {}
        }
        setUploading(false);
        if (urls.length > 0) {
            setSending(true);
            try {
                await fetch('/api/chat', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: input.trim(), images: urls }),
                });
                setInput('');
                await pollNew();
            } catch {}
            setSending(false);
        }
    };

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setOpen(v => !v)}
                style={{ position: 'fixed', bottom: isMobile ? 16 : 24, right: isMobile ? 16 : 24, width: isMobile ? 48 : 52, height: isMobile ? 48 : 52, borderRadius: '50%', background: open ? '#1C3A6B' : '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(37,99,235,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 20 : 22, zIndex: 1200, transition: 'all 0.2s' }}
                title="Chat xưởng nội thất"
            >
                {open ? '✕' : '💬'}
                {!open && unread > 0 && (
                    <span style={{ position: 'absolute', top: 2, right: 2, background: '#dc2626', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Chat panel */}
            {open && (
                <div style={isMobile
                    ? { position: 'fixed', bottom: 0, right: 0, left: 0, width: '100%', height: '80vh', background: '#fff', borderRadius: '16px 16px 0 0', boxShadow: '0 -4px 30px rgba(0,0,0,0.2)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 1200, overflow: 'hidden' }
                    : { position: 'fixed', bottom: 88, right: 24, width: 360, height: 500, background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 1200, overflow: 'hidden' }
                }>
                    {/* Header */}
                    <div style={{ padding: '12px 16px', background: '#1C3A6B', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏭</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Chat xưởng nội thất</div>
                            <div style={{ fontSize: 11, opacity: 0.75 }}>Nhóm nội bộ xưởng SCT</div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#fafafa' }}>
                        {messages.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 60 }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                                Chưa có tin nhắn nào.<br />Hãy bắt đầu cuộc trò chuyện!
                            </div>
                        ) : (
                            messages.map(msg => (
                                <Bubble key={msg.id} msg={msg} isMe={msg.userId === myId} />
                            ))
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input area */}
                    <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
                        {uploading && (
                            <div style={{ fontSize: 11, color: '#2563eb', marginBottom: 6, textAlign: 'center' }}>⏳ Đang upload ảnh...</div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            {/* Image upload button */}
                            <button onClick={() => fileRef.current?.click()} title="Gửi ảnh"
                                style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                🖼️
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files)} />

                            {/* Text input */}
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Nhắn tin... (Enter để gửi)"
                                rows={1}
                                style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 20, padding: '8px 14px', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto', fontFamily: 'inherit', background: '#f9fafb' }}
                                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                            />

                            {/* Send button */}
                            <button onClick={send} disabled={sending || !input.trim()}
                                style={{ background: input.trim() ? '#2563eb' : '#e5e7eb', color: input.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: input.trim() ? 'pointer' : 'default', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                ➤
                            </button>
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>
                            Shift+Enter xuống dòng · Enter gửi
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Nén ảnh trên client trước khi upload
async function compressImage(file, maxPx = 1200, quality = 0.8) {
    return new Promise(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxPx || height > maxPx) {
                const ratio = Math.min(maxPx / width, maxPx / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
        };
        img.src = url;
    });
}
