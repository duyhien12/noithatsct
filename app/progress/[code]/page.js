'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import ProjectChatPanel from '@/components/ProjectChatPanel';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const fmtDateFull = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

export default function CustomerProgressPage() {
    const { code } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedTask, setExpandedTask] = useState(null);
    const [lightbox, setLightbox] = useState(null);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatUnread, setChatUnread] = useState(0);
    const [customerName, setCustomerName] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('customer_chat_name') || '';
        return '';
    });
    const [nameInput, setNameInput] = useState('');
    const [showNamePrompt, setShowNamePrompt] = useState(false);

    useEffect(() => {
        fetch(`/api/progress/${code}`)
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, [code]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#94a3b8' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, border: '3px solid #334155', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                Đang tải...
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
    if (!data || data.error) return (
        <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#ef4444' }}>Không tìm thấy dự án</div>
    );

    const p = data;
    const tasks = p.tasks || [];
    const thisWeek = p.thisWeekTasks || [];
    const logs = p.logs || [];
    const milestones = p.milestones || [];
    const hasSchedule = tasks.length > 0;

    const renderTask = (task, depth = 0) => {
        const isGroup = task.children && task.children.length > 0;
        const barColor = task.progress === 100 ? '#22c55e' : task.progress > 0 ? '#3b82f6' : '#334155';
        const isOverdue = task.status !== 'Hoàn thành' && new Date(task.endDate) < new Date();
        const reports = task.progressReports || [];
        const hasPhotos = reports.some(r => r.images && r.images.length > 0);
        const isExpanded = expandedTask === task.id;

        return (
            <div key={task.id}>
                <div
                    style={{
                        padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
                        cursor: hasPhotos ? 'pointer' : 'default',
                    }}
                    onClick={() => hasPhotos && setExpandedTask(isExpanded ? null : task.id)}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingLeft: depth * 20 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, minWidth: 0 }}>
                            <span style={{
                                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                background: task.progress === 100 ? '#22c55e' : task.progress > 0 ? '#3b82f6' : '#334155',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 700,
                            }}>{task.progress === 100 ? '✓' : task.isLocked ? '🔒' : ''}</span>
                            <div style={{ minWidth: 0 }}>
                                <span style={{ fontWeight: isGroup ? 700 : 500, fontSize: 14 }}>{task.name}</span>
                                {task.assignee && <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>👤 {task.assignee}</div>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {hasPhotos && <span style={{ fontSize: 12 }}>📷</span>}
                            {isOverdue && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 600 }}>Quá hạn</span>}
                            <span style={{ fontWeight: 700, color: barColor, fontSize: 14 }}>{task.progress}%</span>
                        </div>
                    </div>
                    <div style={{ marginLeft: depth * 20 + 34, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${task.progress}%`, background: barColor, borderRadius: 3, transition: 'width 0.5s' }}></div>
                    </div>
                </div>

                {/* Expanded: show progress reports with photos */}
                {isExpanded && reports.length > 0 && (
                    <div style={{ padding: '12px 0 12px 54px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(59,130,246,0.03)' }}>
                        {reports.map(r => (
                            <div key={r.id} style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                                        📤 {r.createdBy || 'Giám sát'} • {fmtDateFull(r.reportDate)}
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: 12, color: '#3b82f6' }}>{r.progressFrom}% → {r.progressTo}%</span>
                                </div>
                                {r.description && <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6, lineHeight: 1.5 }}>{r.description}</div>}
                                {/* Photos Grid */}
                                {r.images && r.images.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {r.images.map((url, j) => (
                                            <img
                                                key={j}
                                                src={url}
                                                alt={`Ảnh ${j + 1}`}
                                                onClick={(e) => { e.stopPropagation(); setLightbox(url); }}
                                                style={{
                                                    width: 80, height: 80, objectFit: 'cover',
                                                    borderRadius: 10, cursor: 'pointer',
                                                    border: '2px solid rgba(255,255,255,0.1)',
                                                    transition: 'transform 0.2s',
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {task.children && [...task.children].sort((a, b) => a.order - b.order).map(c => renderTask(c, depth + 1))}
            </div>
        );
    };

    return (
        <>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
                @media (max-width: 480px) {
                    .progress-stats { flex-direction: column; gap: 8px !important; }
                    .progress-stats > div { text-align: left; display: flex; justify-content: space-between; align-items: center; }
                }
            `}</style>
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', color: '#e2e8f0', padding: '24px 16px' }}>
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{ fontSize: 10, color: '#475569', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>CẬP NHẬT TIẾN ĐỘ DỰ ÁN</div>
                        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.3 }}>{p.name}</h1>
                        <div style={{ color: '#94a3b8', marginTop: 4, fontSize: 12 }}>{p.customer?.name} • {p.address}</div>
                    </div>

                    {/* Big Progress */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: '28px 24px', marginBottom: 20, textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>
                        <div style={{ fontSize: 56, fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{p.progress}%</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Tiến độ tổng</div>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden', marginTop: 14 }}>
                            <div style={{ height: '100%', width: `${p.progress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 5, transition: 'width 0.8s ease' }}></div>
                        </div>
                        <div className="progress-stats" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 12 }}>
                            <div><div style={{ fontWeight: 700, fontSize: 16 }}>{p.area}m²</div><div style={{ fontSize: 10, color: '#64748b' }}>Diện tích</div></div>
                            <div><div style={{ fontWeight: 700, fontSize: 16 }}>{p.floors} tầng</div><div style={{ fontSize: 10, color: '#64748b' }}>Số tầng</div></div>
                            <div><div style={{ fontWeight: 700, fontSize: 16 }}>{p.status}</div><div style={{ fontSize: 10, color: '#64748b' }}>Trạng thái</div></div>
                        </div>
                    </div>

                    {/* This Week */}
                    {thisWeek.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 2s infinite' }}></span>
                                Đang thực hiện tuần này
                            </div>
                            {thisWeek.map(t => (
                                <div key={t.id} style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1px solid rgba(59,130,246,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</div>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: t.progress > 0 ? '#3b82f6' : '#64748b' }}>{t.progress}%</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Task List — click for photos */}
                    {hasSchedule ? (
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#f8fafc' }}>
                                Chi tiết hạng mục
                                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>Bấm để xem ảnh</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '4px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                {tasks.map(t => renderTask(t, 0))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#f8fafc' }}>Chi tiết hạng mục</div>
                            {milestones.map((m, i) => (
                                <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, marginBottom: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ width: 24, height: 24, borderRadius: '50%', background: m.progress === 100 ? '#22c55e' : m.progress > 0 ? '#3b82f6' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{m.progress === 100 ? '✓' : i + 1}</span>
                                            <span style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</span>
                                        </div>
                                        <span style={{ fontWeight: 700, color: m.progress === 100 ? '#22c55e' : m.progress > 0 ? '#3b82f6' : '#64748b' }}>{m.progress}%</span>
                                    </div>
                                    <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${m.progress}%`, background: m.progress === 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: 3 }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tracking Logs */}
                    {logs.length > 0 && (
                        <div style={{ marginTop: 28 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: '#f8fafc' }}>📒 Nhật ký gần đây</div>
                            {logs.slice(0, 10).map(log => (
                                <div key={log.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '10px 14px', marginBottom: 6, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>{log.content}</div>
                                    <div style={{ fontSize: 11, color: '#64748b' }}>{fmtDateFull(log.createdAt)}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: '#334155' }}>
                        Cập nhật: {new Date().toLocaleDateString('vi-VN')} • HomeERP
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightbox && (
                <div onClick={() => setLightbox(null)} style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(0,0,0,0.95)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'zoom-out', padding: 16,
                }}>
                    <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
                </div>
            )}

            {/* Floating chat button */}
            <button onClick={() => {
                if (!customerName) { setShowNamePrompt(true); return; }
                setChatOpen(v => !v);
                setChatUnread(0);
            }}
                style={{ position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: chatOpen ? '#065f46' : '#059669', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(5,150,105,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, zIndex: 9000, transition: 'all 0.2s' }}
                title="Chat với đội thi công">
                {chatOpen ? '✕' : '💬'}
                {!chatOpen && chatUnread > 0 && (
                    <span style={{ position: 'absolute', top: 2, right: 2, background: '#dc2626', color: '#fff', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                        {chatUnread > 9 ? '9+' : chatUnread}
                    </span>
                )}
            </button>

            {/* Chat panel */}
            {chatOpen && customerName && (
                <div style={{ position: 'fixed', bottom: 92, right: 24, width: 350, height: 480, background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.25)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', zIndex: 9000, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', background: '#065f46', color: '#fff', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏗️</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Chat với đội thi công</div>
                            <div style={{ fontSize: 11, opacity: 0.8 }}>Dự án {code} · {customerName}</div>
                        </div>
                        <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', opacity: 0.8 }}>✕</button>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <ProjectChatPanel
                            apiBase={`/api/progress/${code}/chat`}
                            myId={customerName}
                            senderName={customerName}
                            isCustomer={true}
                        />
                    </div>
                </div>
            )}

            {/* Popup nhập tên lần đầu */}
            {showNamePrompt && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9100 }} onClick={() => setShowNamePrompt(false)} />
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9200, background: '#fff', borderRadius: 16, padding: 28, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>👋</div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Chào mừng!</div>
                            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>Vui lòng nhập tên để bắt đầu trao đổi với đội thi công</div>
                        </div>
                        <input autoFocus placeholder="Nhập tên của bạn..." value={nameInput} onChange={e => setNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && nameInput.trim()) { localStorage.setItem('customer_chat_name', nameInput.trim()); setCustomerName(nameInput.trim()); setShowNamePrompt(false); setChatOpen(true); }}}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #d1d5db', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
                        <button onClick={() => { if (!nameInput.trim()) return; localStorage.setItem('customer_chat_name', nameInput.trim()); setCustomerName(nameInput.trim()); setShowNamePrompt(false); setChatOpen(true); }}
                            disabled={!nameInput.trim()}
                            style={{ width: '100%', padding: '10px', background: nameInput.trim() ? '#059669' : '#d1d5db', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: nameInput.trim() ? 'pointer' : 'default' }}>
                            Bắt đầu chat →
                        </button>
                    </div>
                </>
            )}
        </>
    );
}
