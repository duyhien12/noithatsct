'use client';
import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getScope, SCOPE_LABEL } from '@/lib/aiAssistant/permissions';

const ORANGE = '#F97316';
const ORANGE_DARK = '#C2410C';

const SAMPLE_QUESTIONS = {
    all: ['Tóm tắt tình hình các dự án đang thi công', 'Có rủi ro gì cần chú ý không?', 'Chi tiết dự án DA001'],
    finance: ['Công nợ hiện tại là bao nhiêu?', 'Có đợt thanh toán nào quá hạn không?', 'Chi phí dự án DA001 thế nào?'],
    sales: ['Khách hàng nào chưa được follow-up?', 'Chi tiết hợp đồng dự án DA001', 'Tạo tác vụ nhắc gọi lại khách hàng DA001'],
    production: ['Đơn hàng sản xuất nào đang trễ tiến độ?', 'Chi tiết phiếu việc dự án DA001', 'Tạo tác vụ kiểm tra tiến độ dự án DA001'],
    general: ['Tình trạng dự án DA001 hiện tại thế nào?', 'Có bao nhiêu dự án đang thi công?'],
};

function DraftCard({ action, onConfirm, onCancel }) {
    const [state, setState] = useState(action.executed ? 'confirmed' : 'pending'); // pending | confirming | confirmed | cancelled | error
    const [errorMsg, setErrorMsg] = useState('');

    const handleConfirm = async () => {
        setState('confirming');
        try {
            const res = await onConfirm(action);
            if (res?.error) { setErrorMsg(res.error); setState('error'); return; }
            setState('confirmed');
        } catch {
            setErrorMsg('Lỗi kết nối, vui lòng thử lại.');
            setState('error');
        }
    };

    const icon = action.kind === 'task' ? '📝' : '📊';
    const title = action.kind === 'task' ? 'Bản nháp tác vụ' : `Bản nháp báo cáo (${action.type || ''})`;

    return (
        <div style={{
            border: `1.5px dashed ${ORANGE}`, background: '#fff7ed', borderRadius: 10,
            padding: '10px 12px', marginTop: 8, fontSize: 13,
        }}>
            <div style={{ fontWeight: 700, color: ORANGE_DARK, marginBottom: 4 }}>{icon} {title}</div>
            <div style={{ color: 'var(--text-primary)', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{action.previewText || action.content}</div>
            {state === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleConfirm} style={{ background: ORANGE, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✅ Xác nhận</button>
                    <button onClick={() => { onCancel(action); setState('cancelled'); }} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>✕ Huỷ</button>
                </div>
            )}
            {state === 'confirming' && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Đang xử lý...</div>}
            {state === 'confirmed' && <div style={{ color: '#16a34a', fontWeight: 600, fontSize: 12 }}>✔ Đã xác nhận</div>}
            {state === 'cancelled' && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Đã huỷ bản nháp</div>}
            {state === 'error' && <div style={{ color: '#dc2626', fontSize: 12 }}>{errorMsg}</div>}
        </div>
    );
}

export default function AIAssistantPanel({ onClose }) {
    const { data: session } = useSession();
    const role = session?.user?.role || '';
    const scope = getScope(role);
    const [messages, setMessages] = useState([]); // { role: 'user'|'assistant'|'error', text, pendingActions? }
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async (text) => {
        const q = (text ?? input).trim();
        if (!q || loading) return;
        const history = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ role: m.role, content: m.text }));
        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setInput('');
        setLoading(true);
        try {
            const res = await fetch('/api/ai/project-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: q, history }),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessages(prev => [...prev, { role: 'error', text: data.error || 'Có lỗi xảy ra, vui lòng thử lại.' }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', text: data.answer, pendingActions: data.pendingActions || [] }]);
            }
        } catch {
            setMessages(prev => [...prev, { role: 'error', text: 'Không kết nối được máy chủ. Vui lòng thử lại.' }]);
        } finally {
            setLoading(false);
        }
    };

    const confirmAction = async (action) => {
        const res = await fetch('/api/ai/project-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirm: { logId: action.logId, draftId: action.draftId } }),
        });
        const data = await res.json();
        if (!res.ok) return { error: data.error || 'Không xác nhận được.' };
        return data;
    };

    const cancelAction = () => {};

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw', zIndex: 1000,
            background: 'var(--bg-primary, #fff)', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', borderLeft: `3px solid ${ORANGE}`,
        }}>
            {/* Header */}
            <div style={{
                background: `linear-gradient(135deg, ${ORANGE} 0%, ${ORANGE_DARK} 100%)`, color: '#fff',
                padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>🤖 Trợ lý AI SCT</div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>Phạm vi: {SCOPE_LABEL[scope]}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {messages.length > 0 && (
                        <button onClick={() => setMessages([])} title="Cuộc trò chuyện mới" style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, padding: '0 8px', height: 28, cursor: 'pointer', fontSize: 12 }}>🔄 Mới</button>
                    )}
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 && (
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>
                            👋 Xin chào! Hỏi tôi về dự án, tiến độ, đơn hàng xưởng, thu tiền, chi phí, công nợ trong phạm vi quyền của bạn.
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(SAMPLE_QUESTIONS[scope] || SAMPLE_QUESTIONS.general).map((q, i) => (
                                <button key={i} onClick={() => send(q)} style={{
                                    textAlign: 'left', background: '#fff7ed', border: `1px solid ${ORANGE}55`, color: ORANGE_DARK,
                                    borderRadius: 8, padding: '8px 10px', fontSize: 12.5, cursor: 'pointer',
                                }}>💬 {q}</button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                            maxWidth: '90%', padding: '8px 12px', borderRadius: 12, fontSize: 13.5, whiteSpace: 'pre-wrap', lineHeight: 1.5,
                            background: m.role === 'user' ? '#1C3A6B' : m.role === 'error' ? '#fee2e2' : 'var(--bg-secondary, #f3f4f6)',
                            color: m.role === 'user' ? '#fff' : m.role === 'error' ? '#b91c1c' : 'var(--text-primary)',
                        }}>
                            {m.text}
                        </div>
                        {m.pendingActions?.map((a, j) => (
                            <div key={j} style={{ maxWidth: '90%', width: '100%' }}>
                                <DraftCard action={a} onConfirm={confirmAction} onCancel={cancelAction} />
                            </div>
                        ))}
                    </div>
                ))}

                {loading && (
                    <div style={{ alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 12, background: 'var(--bg-secondary, #f3f4f6)', fontSize: 13, color: 'var(--text-muted)' }}>
                        Đang trả lời...
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: 12, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, flexShrink: 0 }}>
                <input
                    className="form-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Nhập câu hỏi..."
                    disabled={loading}
                    style={{ flex: 1, fontSize: 13 }}
                />
                <button onClick={() => send()} disabled={loading || !input.trim()} style={{
                    background: ORANGE, color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13,
                    opacity: (loading || !input.trim()) ? 0.6 : 1,
                }}>Gửi</button>
            </div>
        </div>
    );
}
