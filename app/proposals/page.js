'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const BAN_GD = ['ban_gd', 'giam_doc', 'pho_gd', 'admin'];

const TYPES = ['Đề xuất', 'Kiến nghị'];
const STATUSES = ['Mới', 'Đang xem xét', 'Đã duyệt', 'Từ chối'];

const STATUS_STYLE = {
    'Mới':           { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    'Đang xem xét':  { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    'Đã duyệt':      { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    'Từ chối':       { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

export default function ProposalsPage() {
    const { data: session, status } = useSession();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState(null);  // for detail/respond modal
    const [form, setForm] = useState({ type: 'Đề xuất', title: '', content: '' });
    const [responseText, setResponseText] = useState('');
    const [responseStatus, setResponseStatus] = useState('');
    const [saving, setSaving] = useState(false);

    const isAdmin = BAN_GD.includes(session?.user?.role);
    const myEmail = session?.user?.email || '';

    const fetchData = () => {
        const params = new URLSearchParams();
        if (filterStatus) params.set('status', filterStatus);
        if (filterType) params.set('type', filterType);
        fetch(`/api/proposals?${params}`)
            .then(r => r.json())
            .then(d => { setItems(d.data || []); setLoading(false); });
    };

    useEffect(() => {
        if (status !== 'authenticated') return;
        setLoading(true);
        fetchData();
    }, [status, filterStatus, filterType]);

    const submit = async () => {
        if (!form.title.trim()) return alert('Vui lòng nhập tiêu đề');
        setSaving(true);
        const res = await fetch('/api/proposals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        setSaving(false);
        if (res.ok) {
            setShowCreate(false);
            setForm({ type: 'Đề xuất', title: '', content: '' });
            fetchData();
        }
    };

    const respond = async () => {
        if (!selected) return;
        setSaving(true);
        const res = await fetch(`/api/proposals/${selected.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: responseStatus || selected.status, response: responseText }),
        });
        setSaving(false);
        if (res.ok) {
            setSelected(null);
            fetchData();
        }
    };

    const deleteItem = async (id) => {
        if (!confirm('Xác nhận xóa?')) return;
        await fetch(`/api/proposals/${id}`, { method: 'DELETE' });
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const openDetail = (item) => {
        setSelected(item);
        setResponseText(item.response || '');
        setResponseStatus(item.status);
    };

    return (
        <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Đề xuất - Kiến nghị</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
                        Gửi đề xuất hoặc kiến nghị đến ban quản lý
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    style={{ background: '#F47920', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                >
                    + Gửi mới
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 14, color: '#374151' }}>
                    <option value="">Tất cả loại</option>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #e2e8f0', fontSize: 14, color: '#374151' }}>
                    <option value="">Tất cả trạng thái</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Đang tải...</div>
            ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                    <div>Chưa có đề xuất hoặc kiến nghị nào</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map(item => {
                        const st = STATUS_STYLE[item.status] || STATUS_STYLE['Mới'];
                        const canDelete = isAdmin || item.submittedBy === myEmail;
                        return (
                            <div key={item.id}
                                style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', cursor: 'pointer' }}
                                onClick={() => openDetail(item)}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: '#F47920', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 5, padding: '2px 8px' }}>
                                                {item.type}
                                            </span>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 5, padding: '2px 8px' }}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{item.title}</div>
                                        <div style={{ fontSize: 13, color: '#64748b' }}>
                                            {item.submittedName || item.submittedBy} · {fmtDate(item.createdAt)}
                                        </div>
                                        {item.response && (
                                            <div style={{ marginTop: 8, fontSize: 13, color: '#374151', background: '#f8fafc', borderRadius: 6, padding: '8px 10px', borderLeft: '3px solid #F47920' }}>
                                                <span style={{ fontWeight: 600 }}>Phản hồi: </span>{item.response}
                                            </div>
                                        )}
                                    </div>
                                    {canDelete && (
                                        <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }}
                                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 13, opacity: 0.6 }}
                                            title="Xóa">✕</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>Gửi đề xuất / kiến nghị</h2>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Loại</label>
                            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Tiêu đề *</label>
                            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Nhập tiêu đề..."
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Nội dung</label>
                            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                                placeholder="Mô tả chi tiết đề xuất hoặc kiến nghị..."
                                rows={5}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowCreate(false)}
                                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                                Hủy
                            </button>
                            <button onClick={submit} disabled={saving}
                                style={{ padding: '9px 18px', borderRadius: 8, background: '#F47920', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                                {saving ? 'Đang gửi...' : 'Gửi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail / Respond Modal */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 560, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#F47920', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 5, padding: '2px 8px' }}>{selected.type}</span>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>✕</button>
                        </div>
                        <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>{selected.title}</h2>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                            {selected.submittedName || selected.submittedBy} · {fmtDate(selected.createdAt)}
                        </div>
                        {selected.content && (
                            <div style={{ fontSize: 14, color: '#374151', background: '#f8fafc', borderRadius: 8, padding: 14, marginBottom: 18, whiteSpace: 'pre-wrap' }}>
                                {selected.content}
                            </div>
                        )}

                        {isAdmin ? (
                            <>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Trạng thái</label>
                                    <select value={responseStatus} onChange={e => setResponseStatus(e.target.value)}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14 }}>
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{ marginBottom: 18 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 5 }}>Phản hồi</label>
                                    <textarea value={responseText} onChange={e => setResponseText(e.target.value)}
                                        placeholder="Nhập phản hồi..."
                                        rows={4}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                    <button onClick={() => setSelected(null)}
                                        style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                        Đóng
                                    </button>
                                    <button onClick={respond} disabled={saving}
                                        style={{ padding: '9px 18px', borderRadius: 8, background: '#F47920', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                        {saving ? 'Đang lưu...' : 'Lưu phản hồi'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                {selected.response && (
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14, marginBottom: 14 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 4 }}>Phản hồi từ quản lý</div>
                                        <div style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap' }}>{selected.response}</div>
                                    </div>
                                )}
                                <div style={{ textAlign: 'right' }}>
                                    <button onClick={() => setSelected(null)}
                                        style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                                        Đóng
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
