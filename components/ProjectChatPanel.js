'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

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
    const parts = (name || '?').trim().split(' ');
    return parts[parts.length - 1][0]?.toUpperCase() || '?';
}

function avatarBg(type) {
    return type === 'customer' ? '#059669' : '#2563eb';
}

function senderLabel(msg) {
    if (msg.senderType === 'customer') return msg.senderName;
    const roleMap = { ban_gd: 'Ban GĐ', giam_doc: 'Giám đốc', pho_gd: 'Phó GĐ', kinh_doanh: 'Kinh doanh', xuong: 'Xưởng', admin: 'Admin' };
    const roleLabel = roleMap[msg.senderRole] || '';
    return roleLabel ? `${msg.senderName} (${roleLabel})` : msg.senderName;
}

function Bubble({ msg, isMe }) {
    const [lightbox, setLightbox] = useState(null);
    const images = parseImages(msg.images);

    return (
        <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarBg(msg.senderType), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {getInitial(msg.senderName)}
            </div>
            <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, padding: '0 4px' }}>
                    {isMe ? 'Bạn' : senderLabel(msg)}
                    {msg.senderType === 'customer' && (
                        <span style={{ marginLeft: 4, fontSize: 10, background: '#d1fae5', color: '#065f46', borderRadius: 6, padding: '1px 5px' }}>KH</span>
                    )}
                </div>
                {msg.content && (
                    <div style={{
                        padding: '8px 12px',
                        borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        background: isMe ? '#1C3A6B' : msg.senderType === 'customer' ? '#ecfdf5' : '#f3f4f6',
                        color: isMe ? '#fff' : '#111827',
                        fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        border: msg.senderType === 'customer' && !isMe ? '1px solid #a7f3d0' : 'none',
                    }}>{msg.content}</div>
                )}
                {images.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {images.map((url, i) => (
                            <img key={i} src={url} alt="" onClick={() => setLightbox(url)}
                                style={{ width: images.length === 1 ? 200 : 110, height: images.length === 1 ? 150 : 110, objectFit: 'cover', borderRadius: 10, cursor: 'zoom-in', border: '1px solid #e5e7eb' }} />
                        ))}
                    </div>
                )}
                <div style={{ fontSize: 10, color: '#9ca3af', padding: '0 4px' }}>{fmtTime(msg.createdAt)}</div>
            </div>

            {lightbox && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setLightbox(null)}>
                    <img src={lightbox} alt="" style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 8, objectFit: 'contain' }} />
                    <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '50%', width: 40, height: 40, fontSize: 22, cursor: 'pointer' }}>×</button>
                </div>
            )}
        </div>
    );
}

async function compressImage(file, maxPx = 1400, quality = 0.82) {
    return new Promise(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxPx || height > maxPx) {
                const r = Math.min(maxPx / width, maxPx / height);
                width = Math.round(width * r); height = Math.round(height * r);
            }
            const c = document.createElement('canvas');
            c.width = width; c.height = height;
            c.getContext('2d').drawImage(img, 0, 0, width, height);
            c.toBlob(blob => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
        };
        img.src = url;
    });
}

// apiBase: '/api/projects/[id]/chat' hoặc '/api/progress/[code]/chat'
// myId: string để nhận diện tin của mình
// senderName: (chỉ dùng cho customer)
export default function ProjectChatPanel({ apiBase, myId, senderName, isCustomer = false }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const lastTsRef = useRef(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const fileRef = useRef(null);
    const pollingRef = useRef(null);

    const loadInitial = useCallback(async () => {
        try {
            const r = await fetch(apiBase);
            if (!r.ok) return;
            const data = await r.json();
            if (Array.isArray(data) && data.length > 0) {
                setMessages(data);
                lastTsRef.current = data[data.length - 1].createdAt;
            }
        } catch {}
    }, [apiBase]);

    const pollNew = useCallback(async () => {
        if (!lastTsRef.current) return;
        try {
            const r = await fetch(`${apiBase}?after=${encodeURIComponent(lastTsRef.current)}`);
            if (!r.ok) return;
            const data = await r.json();
            if (Array.isArray(data) && data.length > 0) {
                setMessages(prev => [...prev, ...data]);
                lastTsRef.current = data[data.length - 1].createdAt;
            }
        } catch {}
    }, [apiBase]);

    useEffect(() => { loadInitial(); }, [loadInitial]);

    useEffect(() => {
        pollingRef.current = setInterval(pollNew, 5000);
        return () => clearInterval(pollingRef.current);
    }, [pollNew]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    const sendMessage = async (extraImages = []) => {
        if (!input.trim() && extraImages.length === 0) return;
        setSending(true);
        const text = input.trim();
        setInput('');
        try {
            const body = { content: text, images: extraImages };
            if (isCustomer) body.senderName = senderName;
            await fetch(apiBase, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            // Refresh ngay lập tức
            const r = await fetch(`${apiBase}?after=${encodeURIComponent(lastTsRef.current || new Date(0).toISOString())}`);
            const data = await r.json();
            if (Array.isArray(data) && data.length > 0) {
                setMessages(prev => [...prev, ...data]);
                lastTsRef.current = data[data.length - 1].createdAt;
            }
        } catch {}
        setSending(false);
        inputRef.current?.focus();
    };

    const handleImageUpload = async (files) => {
        if (!files?.length) return;
        setUploading(true);
        const urls = [];
        for (const file of Array.from(files)) {
            if (!file.type.startsWith('image/')) continue;
            const compressed = await compressImage(file);
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
        if (urls.length > 0) await sendMessage(urls);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', background: '#fafafa', borderRadius: '0 0 0 0' }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 60 }}>
                        <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
                        Chưa có tin nhắn nào.<br />
                        <span style={{ fontSize: 12 }}>Hãy bắt đầu trao đổi với {isCustomer ? 'đội thi công' : 'khách hàng'}!</span>
                    </div>
                ) : (
                    messages.map(msg => (
                        <Bubble key={msg.id} msg={msg}
                            isMe={isCustomer ? msg.senderType === 'customer' && msg.senderName === senderName : msg.senderName === myId || (msg.senderType === 'staff' && msg.senderName === myId)} />
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Chú thích màu */}
            <div style={{ padding: '4px 16px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 16, fontSize: 11, color: '#6b7280' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />Nội bộ
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />Khách hàng
                </span>
            </div>

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
                {uploading && <div style={{ fontSize: 11, color: '#2563eb', marginBottom: 6, textAlign: 'center' }}>⏳ Đang upload ảnh...</div>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <button onClick={() => fileRef.current?.click()} title="Gửi ảnh"
                        style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🖼️
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleImageUpload(e.target.files)} />
                    <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder={isCustomer ? 'Nhắn tin cho đội thi công...' : 'Nhắn tin cho khách hàng... (Enter gửi)'}
                        rows={1} style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 20, padding: '8px 14px', fontSize: 13, resize: 'none', outline: 'none', lineHeight: 1.4, maxHeight: 100, overflowY: 'auto', fontFamily: 'inherit', background: '#f9fafb' }}
                        onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }} />
                    <button onClick={() => sendMessage()} disabled={sending || !input.trim()}
                        style={{ background: input.trim() ? '#1C3A6B' : '#e5e7eb', color: input.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: input.trim() ? 'pointer' : 'default', fontSize: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        ➤
                    </button>
                </div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>Shift+Enter xuống dòng · Enter gửi</div>
            </div>
        </div>
    );
}
