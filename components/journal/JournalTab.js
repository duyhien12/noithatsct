'use client';
import { useState, useEffect, useRef } from 'react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const relTime = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    const days = Math.floor(hrs / 24);
    return `${days} ngày trước`;
};

const TYPE_LABELS = { request: '📋 Yêu cầu', schedule: '📅 Lịch hẹn', feedback: '💬 Phản hồi' };
const STATUS_LABELS = { pending: 'Chờ xử lý', committed: 'Đã cam kết', done: 'Hoàn thành' };
const STATUS_COLORS = { pending: 'warning', committed: 'info', done: 'success' };
const SOURCE_ICONS = { paste: '📋', voice: '🎤', ocr: '📷' };

export default function JournalTab({ projectId }) {
    const [entries, setEntries] = useState([]);
    const [commitments, setCommitments] = useState([]);
    const [subTab, setSubTab] = useState('timeline'); // timeline | board
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [rawInput, setRawInput] = useState('');
    const [createdBy, setCreatedBy] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [aiPreview, setAiPreview] = useState(null); // preview before save
    const [editingCommitment, setEditingCommitment] = useState(null);
    const [addingManual, setAddingManual] = useState(false);
    const [manualForm, setManualForm] = useState({ title: '', type: 'request', assignee: '', deadline: '', notes: '' });
    const inputRef = useRef(null);

    const fetchEntries = () => fetch(`/api/journal-entries?projectId=${projectId}`).then(r => r.json()).then(setEntries).catch(() => { });
    const fetchCommitments = () => fetch(`/api/commitments?projectId=${projectId}`).then(r => r.json()).then(setCommitments).catch(() => { });
    const refresh = () => { fetchEntries(); fetchCommitments(); };

    useEffect(() => { setLoading(true); Promise.all([fetchEntries(), fetchCommitments()]).finally(() => setLoading(false)); }, [projectId]);

    // ========== INPUT + AI ==========
    const handleAnalyze = async () => {
        if (!rawInput.trim()) return;
        setAnalyzing(true);
        try {
            const res = await fetch('/api/journal-entries/analyze', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawInput }),
            });
            if (res.ok) {
                const data = await res.json();
                setAiPreview(data);
            } else {
                // AI unavailable — save directly
                await saveEntry(null);
            }
        } catch {
            await saveEntry(null);
        }
        setAnalyzing(false);
    };

    const saveEntry = async (preview) => {
        const res = await fetch('/api/journal-entries', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, rawInput, source: 'paste', createdBy, useAI: !!preview }),
        });
        if (res.ok) {
            setRawInput(''); setShowInput(false); setAiPreview(null);
            refresh();
        }
    };

    const handleSaveWithAI = () => { saveEntry(aiPreview); };
    const handleSaveWithoutAI = () => { saveEntry(null); };

    const deleteEntry = async (id) => {
        if (!confirm('Xóa nhật ký này?')) return;
        await fetch(`/api/journal-entries/${id}`, { method: 'DELETE' });
        refresh();
    };

    // ========== COMMITMENTS ==========
    const updateCommitment = async (id, data) => {
        await fetch(`/api/commitments/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        refresh();
    };

    const deleteCommitment = async (id) => {
        if (!confirm('Xóa cam kết này?')) return;
        await fetch(`/api/commitments/${id}`, { method: 'DELETE' });
        refresh();
    };

    const createManualCommitment = async () => {
        if (!manualForm.title.trim()) return;
        await fetch('/api/commitments', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...manualForm, projectId, deadline: manualForm.deadline || null }),
        });
        setManualForm({ title: '', type: 'request', assignee: '', deadline: '', notes: '' });
        setAddingManual(false);
        refresh();
    };

    // ========== OVERDUE ==========
    const overdueCount = commitments.filter(c => c.status !== 'done' && c.deadline && new Date(c.deadline) < new Date()).length;
    const grouped = {
        pending: commitments.filter(c => c.status === 'pending'),
        committed: commitments.filter(c => c.status === 'committed'),
        done: commitments.filter(c => c.status === 'done'),
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    return (
        <div>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    {[{ key: 'timeline', label: '📒 Nhật ký', icon: '' }, { key: 'board', label: '📌 Cam kết', icon: '', count: commitments.length }].map(t => (
                        <button key={t.key} onClick={() => setSubTab(t.key)}
                            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: '8px 8px 0 0', background: subTab === t.key ? 'var(--bg-card)' : 'transparent', color: subTab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)', borderBottom: subTab === t.key ? '2px solid var(--accent-primary)' : '2px solid transparent', transition: 'all 0.2s' }}>
                            {t.label} {t.count ? <span className="badge muted" style={{ fontSize: 10, marginLeft: 4 }}>{t.count}</span> : null}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {overdueCount > 0 && <span className="badge danger" style={{ animation: 'pulse 2s infinite' }}>⚠ {overdueCount} quá hạn</span>}
                    <button className="btn btn-primary btn-sm" onClick={() => { setShowInput(!showInput); setTimeout(() => inputRef.current?.focus(), 100); }}>
                        + Ghi nhật ký
                    </button>
                </div>
            </div>

            {/* INPUT AREA */}
            {showInput && (
                <div className="card" style={{ marginBottom: 20, padding: 20 }}>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                        <input className="form-input" placeholder="Người ghi (KTS)" value={createdBy}
                            onChange={e => setCreatedBy(e.target.value)} style={{ maxWidth: 200, fontSize: 13 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Paste nội dung trao đổi Zalo / ghi chú họp bên dưới</span>
                    </div>
                    <textarea ref={inputRef} className="form-input" rows={6} placeholder="Dán tin nhắn Zalo, ghi chú họp, yêu cầu khách hàng..."
                        value={rawInput} onChange={e => setRawInput(e.target.value)}
                        style={{ resize: 'vertical', fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setShowInput(false); setRawInput(''); setAiPreview(null); }}>Hủy</button>
                        <button className="btn btn-secondary btn-sm" onClick={handleSaveWithoutAI} disabled={!rawInput.trim()}>
                            💾 Lưu (không AI)
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={handleAnalyze} disabled={!rawInput.trim() || analyzing}>
                            {analyzing ? '⏳ Đang phân tích...' : '🤖 AI Phân tích & Lưu'}
                        </button>
                    </div>
                </div>
            )}

            {/* AI PREVIEW MODAL */}
            {aiPreview && (
                <div className="card" style={{ marginBottom: 20, padding: 20, border: '2px solid var(--accent-primary)', background: 'rgba(99,102,241,0.03)' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--accent-primary)' }}>🤖 Kết quả AI phân tích</div>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: 'var(--text-muted)' }}>TÓM TẮT:</div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                            {aiPreview.summary || 'Không có tóm tắt'}
                        </div>
                    </div>
                    {aiPreview.commitments?.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: 'var(--text-muted)' }}>CAM KẾT TRÍCH XUẤT ({aiPreview.commitments.length}):</div>
                            {aiPreview.commitments.map((c, i) => (
                                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                                    <span>{TYPE_LABELS[c.type] || '📋'}</span>
                                    <span style={{ flex: 1, fontWeight: 600 }}>{c.title}</span>
                                    {c.assignee && <span className="badge muted" style={{ fontSize: 10 }}>👤 {c.assignee}</span>}
                                    {c.deadline && <span className="badge info" style={{ fontSize: 10 }}>📅 {fmtDate(c.deadline)}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAiPreview(null)}>Chỉnh lại</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveWithAI}>✅ Xác nhận & Lưu</button>
                    </div>
                </div>
            )}

            {/* TIMELINE VIEW */}
            {subTab === 'timeline' && (
                <div className="journal-timeline">
                    {entries.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
                            <div>Chưa có nhật ký — bấm "Ghi nhật ký" để bắt đầu</div>
                        </div>
                    )}
                    {entries.map(entry => (
                        <div key={entry.id} className="journal-entry-card">
                            <div className="journal-entry-header">
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 20 }}>{SOURCE_ICONS[entry.source] || '📋'}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{entry.createdBy || 'Không rõ'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relTime(entry.createdAt)} • {fmtTime(entry.createdAt)}</div>
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={() => deleteEntry(entry.id)} style={{ fontSize: 11, color: 'var(--status-danger)' }}>🗑</button>
                            </div>
                            {entry.aiSummary && (
                                <div className="journal-ai-summary">
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 4 }}>🤖 AI TÓM TẮT</div>
                                    {entry.aiSummary}
                                </div>
                            )}
                            <div className="journal-raw-input">
                                <details>
                                    <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>📄 Nội dung gốc</summary>
                                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 6, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{entry.rawInput}</pre>
                                </details>
                            </div>
                            {entry.commitments?.length > 0 && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>📌 Cam kết từ nhật ký này:</div>
                                    {entry.commitments.map(c => (
                                        <div key={c.id} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '4px 0', fontSize: 12 }}>
                                            <span className={`badge ${STATUS_COLORS[c.status]}`} style={{ fontSize: 10 }}>{STATUS_LABELS[c.status]}</span>
                                            <span>{c.title}</span>
                                            {c.deadline && <span style={{ fontSize: 10, color: new Date(c.deadline) < new Date() && c.status !== 'done' ? 'var(--status-danger)' : 'var(--text-muted)' }}>📅 {fmtDate(c.deadline)}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* COMMITMENT BOARD */}
            {subTab === 'board' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAddingManual(true)}>+ Thêm cam kết thủ công</button>
                    </div>

                    {/* Manual add form */}
                    {addingManual && (
                        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 150px 140px', gap: 8, marginBottom: 8 }}>
                                <input className="form-input" placeholder="Nội dung cam kết *" value={manualForm.title}
                                    onChange={e => setManualForm(p => ({ ...p, title: e.target.value }))} style={{ fontSize: 13 }} />
                                <select className="form-select" value={manualForm.type}
                                    onChange={e => setManualForm(p => ({ ...p, type: e.target.value }))} style={{ fontSize: 12 }}>
                                    <option value="request">Yêu cầu</option>
                                    <option value="schedule">Lịch hẹn</option>
                                    <option value="feedback">Phản hồi</option>
                                </select>
                                <input className="form-input" placeholder="Người thực hiện" value={manualForm.assignee}
                                    onChange={e => setManualForm(p => ({ ...p, assignee: e.target.value }))} style={{ fontSize: 12 }} />
                                <input className="form-input" type="date" value={manualForm.deadline}
                                    onChange={e => setManualForm(p => ({ ...p, deadline: e.target.value }))} style={{ fontSize: 12 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setAddingManual(false)}>Hủy</button>
                                <button className="btn btn-primary btn-sm" onClick={createManualCommitment}>Lưu</button>
                            </div>
                        </div>
                    )}

                    {/* Board columns */}
                    <div className="commitment-board">
                        {['pending', 'committed', 'done'].map(status => (
                            <div key={status} className={`commitment-column commitment-column-${status}`}>
                                <div className="commitment-column-header">
                                    <span>{STATUS_LABELS[status]}</span>
                                    <span className={`badge ${STATUS_COLORS[status]}`} style={{ fontSize: 10 }}>{grouped[status].length}</span>
                                </div>
                                <div className="commitment-column-body">
                                    {grouped[status].map(c => {
                                        const isOverdue = c.status !== 'done' && c.deadline && new Date(c.deadline) < new Date();
                                        return (
                                            <div key={c.id} className={`commitment-card ${isOverdue ? 'commitment-overdue' : ''}`}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4 }}>
                                                    <span style={{ fontSize: 12 }}>{TYPE_LABELS[c.type] || '📋'}</span>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {c.status !== 'done' && c.status !== 'committed' && (
                                                            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '1px 4px' }}
                                                                onClick={() => updateCommitment(c.id, { status: 'committed' })} title="Đánh dấu đã cam kết">🤝</button>
                                                        )}
                                                        {c.status !== 'done' && (
                                                            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '1px 4px' }}
                                                                onClick={() => updateCommitment(c.id, { status: 'done' })} title="Hoàn thành">✅</button>
                                                        )}
                                                        {c.status === 'done' && (
                                                            <button className="btn btn-ghost" style={{ fontSize: 10, padding: '1px 4px' }}
                                                                onClick={() => updateCommitment(c.id, { status: 'pending' })} title="Mở lại">↩</button>
                                                        )}
                                                        <button className="btn btn-ghost" style={{ fontSize: 10, padding: '1px 4px', color: 'var(--status-danger)' }}
                                                            onClick={() => deleteCommitment(c.id)}>✕</button>
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 600, fontSize: 13, margin: '4px 0' }}>{c.title}</div>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                                                    {c.assignee && <span className="badge muted" style={{ fontSize: 10 }}>👤 {c.assignee}</span>}
                                                    {c.deadline && (
                                                        <span className={`badge ${isOverdue ? 'danger' : 'info'}`} style={{ fontSize: 10 }}>
                                                            {isOverdue ? '⚠ ' : '📅 '}{fmtDate(c.deadline)}
                                                        </span>
                                                    )}
                                                </div>
                                                {c.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{c.notes}</div>}
                                            </div>
                                        );
                                    })}
                                    {grouped[status].length === 0 && (
                                        <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', opacity: 0.5 }}>
                                            Trống
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
