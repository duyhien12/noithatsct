'use client';
import { useState, useEffect, useRef, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import LcShell from '../../_components/LcShell';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);
const fmtShort = (n) => { if (!n) return '0đ'; if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ'; if (n >= 1e6) return Math.round(n / 1e6) + ' tr'; return n.toLocaleString('vi-VN') + 'đ'; };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const timeAgo = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days} ngày trước`;
    return fmtDate(d);
};

const STAGES = [
    { key: 'Khách tiềm năng',  color: '#2563eb', bg: '#eff6ff' },
    { key: 'Khách chăm sóc',   color: '#0891b2', bg: '#ecfeff' },
    { key: 'Khách ưu tiên',    color: '#7c3aed', bg: '#f5f3ff' },
    { key: 'Khách hợp đồng',   color: '#ea580c', bg: '#fff7ed' },
    { key: 'Khách hoàn thành', color: '#64748b', bg: '#f8fafc' },
];

const PROCESS_STEP_DEFS = [
    { key: 'tuvan',   label: 'Tư vấn',             icon: '📞', color: '#3b82f6', bg: '#dbeafe', desc: 'Tiếp nhận & tư vấn nhu cầu khách hàng' },
    { key: 'baogía',  label: 'Báo giá',             icon: '📄', color: '#8b5cf6', bg: '#ede9fe', desc: 'Lập và gửi báo giá cho khách' },
    { key: 'kyhd',    label: 'Ký hợp đồng',         icon: '✍️', color: '#10b981', bg: '#d1fae5', desc: 'Thống nhất và ký kết hợp đồng' },
    { key: 'thicong', label: 'Thi công',             icon: '🔨', color: '#f97316', bg: '#ffedd5', desc: 'Triển khai thi công dự án' },
    { key: 'thutien', label: 'Thu tiền',             icon: '💵', color: '#f59e0b', bg: '#fef3c7', desc: 'Thanh toán và quyết toán hợp đồng' },
    { key: 'bangiao', label: 'Bàn giao & Bảo hành', icon: '🏆', color: '#ec4899', bg: '#fce7f3', desc: 'Bàn giao công trình và bảo hành' },
];

const STATUS_OPTIONS = [
    { key: 'pending',     label: 'Chưa bắt đầu',  color: '#94a3b8' },
    { key: 'in_progress', label: 'Đang thực hiện', color: '#f59e0b' },
    { key: 'done',        label: 'Hoàn thành',     color: '#10b981' },
];

function defaultProcess() {
    return Object.fromEntries(PROCESS_STEP_DEFS.map(s => [s.key, { status: 'pending', date: '', notes: '', person: '' }]));
}

function Avatar({ name, size = 32 }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ec4899', '#06b6d4'];
    const color = colors[(name || '').charCodeAt(0) % colors.length] || '#6b7280';
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
            {initials}
        </div>
    );
}

export default function LcCustomerDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [data, setData] = useState(null);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [logForm, setLogForm] = useState({ type: 'Điện thoại', content: '', createdBy: '', nextFollowUp: '' });
    const [editForm, setEditForm] = useState({});
    const [processForm, setProcessForm] = useState(defaultProcess());
    const [expandedStep, setExpandedStep] = useState(null);
    const [savingProcess, setSavingProcess] = useState(false);
    const autoSaveTimer = useRef(null);
    const lastSavedProcessRef = useRef(null);
    const [autoSaveStatus, setAutoSaveStatus] = useState('');

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const commentsEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const fetchData = () => {
        fetch(`/api/customers/${id}`).then(r => r.ok ? r.json() : null).then(d => {
            setData(d);
            setLoading(false);
            if (d?.processData) {
                try {
                    const merged = { ...defaultProcess(), ...JSON.parse(d.processData) };
                    setProcessForm(merged);
                    lastSavedProcessRef.current = JSON.stringify(merged);
                } catch { lastSavedProcessRef.current = JSON.stringify(defaultProcess()); }
            } else {
                lastSavedProcessRef.current = JSON.stringify(defaultProcess());
            }
        });
    };
    useEffect(fetchData, [id]);

    useEffect(() => {
        fetch(`/api/customers/${id}/comments`)
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setComments(d); });
    }, [id]);

    useEffect(() => {
        const current = JSON.stringify(processForm);
        if (lastSavedProcessRef.current === null || current === lastSavedProcessRef.current) return;
        setAutoSaveStatus('saving');
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(async () => {
            await fetch(`/api/customers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ processData: current }),
            });
            lastSavedProcessRef.current = current;
            setAutoSaveStatus('saved');
            setTimeout(() => setAutoSaveStatus(''), 2000);
        }, 1500);
        return () => clearTimeout(autoSaveTimer.current);
    }, [processForm, id]);

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploadingFile(true);
        for (const file of files) {
            const isImage = file.type.startsWith('image/');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', isImage ? 'proofs' : 'documents');
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (res.ok) {
                const result = await res.json();
                setPendingAttachments(prev => [...prev, { url: result.url, name: file.name, type: file.type }]);
            }
        }
        setUploadingFile(false);
        e.target.value = '';
    };

    const sendComment = async () => {
        if (!newComment.trim() && pendingAttachments.length === 0) return;
        setSendingComment(true);
        const res = await fetch(`/api/customers/${id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newComment.trim(), attachments: pendingAttachments }),
        });
        const resData = await res.json();
        setSendingComment(false);
        if (res.ok) {
            setComments(prev => [...prev, resData]);
            setNewComment('');
            setPendingAttachments([]);
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    };

    const deleteComment = async (commentId) => {
        setComments(prev => prev.filter(c => c.id !== commentId));
        await fetch(`/api/customers/${id}/comments/${commentId}`, { method: 'DELETE' });
    };

    const saveEditComment = async (commentId) => {
        if (!editingCommentText.trim()) return;
        const res = await fetch(`/api/customers/${id}/comments/${commentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editingCommentText }),
        });
        if (res.ok) {
            const updated = await res.json();
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: updated.content } : c));
            setEditingCommentId(null);
            setEditingCommentText('');
        }
    };

    const addTrackingLog = async () => {
        if (!logForm.content.trim()) return alert('Nhập nội dung');
        const body = { ...logForm, customerId: id };
        if (data.projects?.length) body.projectId = data.projects[0].id;
        if (logForm.nextFollowUp) {
            await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nextFollowUp: new Date(logForm.nextFollowUp).toISOString(), lastContactAt: new Date().toISOString() }) });
        } else {
            await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastContactAt: new Date().toISOString() }) });
        }
        await fetch('/api/tracking-logs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        setShowLogModal(false);
        setLogForm({ type: 'Điện thoại', content: '', createdBy: '', nextFollowUp: '' });
        fetchData();
    };

    const saveEdit = async () => {
        await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
        setShowEditModal(false);
        fetchData();
    };

    const getGpsAddress = () => {
        if (!navigator.geolocation) return alert('Trình duyệt không hỗ trợ định vị');
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`, { headers: { 'Accept-Language': 'vi' } });
                    const d = await res.json();
                    setEditForm(prev => ({ ...prev, address: d.display_name || `${coords.latitude}, ${coords.longitude}` }));
                } catch {
                    setEditForm(prev => ({ ...prev, address: `${coords.latitude}, ${coords.longitude}` }));
                }
                setGpsLoading(false);
            },
            () => { alert('Không lấy được định vị'); setGpsLoading(false); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleDelete = async () => {
        if (!confirm('Xóa khách hàng này và tất cả dữ liệu liên quan?')) return;
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (!res.ok) { const err = await res.json().catch(() => ({})); return alert(err.error || 'Lỗi xóa'); }
        router.push('/laocai/customers');
    };

    const saveProcess = async () => {
        clearTimeout(autoSaveTimer.current);
        setAutoSaveStatus('saving');
        const current = JSON.stringify(processForm);
        await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ processData: current }) });
        lastSavedProcessRef.current = current;
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(''), 2000);
    };

    const updateStep = (key, field, value) => {
        setProcessForm(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    if (loading) return (
        <LcShell title="Chi tiết khách hàng">
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</div>
        </LcShell>
    );
    if (!data) { router.push('/laocai/customers'); return null; }

    const c = data;
    const s = c.stats || { projectCount: 0, contractCount: 0, totalContractValue: 0, totalPaid: 0, totalDebt: 0 };
    const stage = STAGES.find(p => p.key === c.pipelineStage) || STAGES[0];

    const score = Math.min(100,
        (c.projects?.length || 0) * 15 +
        (c.contracts?.length || 0) * 10 +
        (c.trackingLogs?.length || 0) * 5 +
        (s.totalContractValue > 0 ? 20 : 0) +
        (c.lastContactAt && (Date.now() - new Date(c.lastContactAt).getTime()) < 7 * 86400000 ? 15 : 0)
    );
    const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#94a3b8';

    const tabs = [
        { key: 'overview',  label: 'Thông tin khách hàng', icon: '📋' },
        { key: 'process',   label: 'Quy trình thực hiện',  icon: '🔄' },
        { key: 'comments',  label: 'Ghi chú', icon: '💬', count: comments.length || undefined },
    ];

    return (
        <LcShell title="Chi tiết khách hàng">
            <button
                onClick={() => router.push('/laocai/customers')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16 }}>
                ← Quay lại
            </button>

            {/* Header Card */}
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: stage.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                        {c.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{c.name}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f766e' }}>{c.code}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: stage.bg, color: stage.color }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color }} />
                                {stage.key}
                            </span>
                            {c.type && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 500 }}>{c.type}</span>}
                            {c.source && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#f1f5f9', color: '#64748b', fontWeight: 500 }}>{c.source}</span>}
                        </div>
                    </div>
                    {/* CRM Score */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ position: 'relative', width: 44, height: 44 }}>
                            <svg viewBox="0 0 36 36" style={{ width: 44, height: 44, transform: 'rotate(-90deg)' }}>
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3" strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: scoreColor }}>{score}</div>
                        </div>
                        <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>Điểm CRM</div>
                    </div>
                </div>

                {/* Contact row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 12, fontSize: 13, color: '#475569' }}>
                    {c.phone && <a href={`tel:${c.phone}`} style={{ textDecoration: 'none', color: '#0f766e' }}>📱 {c.phone}</a>}
                    {c.representative && <span>👤 {c.representative}</span>}
                    {c.address && <span>📍 {c.address}</span>}
                </div>
                {(c.nextFollowUp || c.lastContactAt) && (
                    <div style={{ display: 'flex', gap: '6px 12px', flexWrap: 'wrap', marginTop: 8, fontSize: 12 }}>
                        {c.nextFollowUp && <span style={{ padding: '3px 8px', borderRadius: 6, background: new Date(c.nextFollowUp) < new Date() ? '#fef2f2' : '#f0fdf4', color: new Date(c.nextFollowUp) < new Date() ? '#ef4444' : '#22c55e', fontWeight: 600 }}>📅 Follow-up: {fmtDate(c.nextFollowUp)}</span>}
                        {c.lastContactAt && <span style={{ color: '#94a3b8' }}>Liên hệ cuối: {timeAgo(c.lastContactAt)}</span>}
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                    <button onClick={() => setShowLogModal(true)} style={btnStyle}>📝 Ghi chú</button>
                    <button onClick={() => {
                        setEditForm({
                            name: c.name, phone: c.phone, email: c.email, address: c.address,
                            type: c.type, pipelineStage: c.pipelineStage || 'Khách tiềm năng',
                            source: c.source, representative: c.representative,
                            estimatedValue: c.estimatedValue || 0,
                            nextFollowUp: c.nextFollowUp ? new Date(c.nextFollowUp).toISOString().split('T')[0] : '',
                            salesPerson: c.salesPerson, notes: c.notes,
                        });
                        setShowEditModal(true);
                    }} style={btnStyle}>✏️ Sửa</button>
                    <button onClick={() => router.push('/laocai/quotations')} style={btnStyle}>📄 Tạo BG</button>
                    {c.phone && <a href={`tel:${c.phone}`} style={{ ...btnStyle, textDecoration: 'none' }}>📞 Gọi</a>}
                    <button onClick={handleDelete} style={{ ...btnStyle, color: '#ef4444', marginLeft: 'auto', background: 'transparent', border: '1px solid #fecaca' }}>🗑️ Xóa</button>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                    {[
                        { v: s.projectCount,             l: 'Dự án',       c: '#0f766e' },
                        { v: s.contractCount,            l: 'Hợp đồng' },
                        { v: fmtShort(c.estimatedValue), l: 'Giá trị deal' },
                        { v: fmtShort(s.totalPaid),      l: 'Đã thu',      c: '#10b981' },
                        { v: fmtShort(s.totalDebt),      l: 'Công nợ',     c: s.totalDebt > 0 ? '#ef4444' : '#10b981' },
                    ].map(st => (
                        <div key={st.l} style={{ textAlign: 'center', padding: '8px 4px', background: '#f8fafc', borderRadius: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: st.c || '#1e293b' }}>{st.v}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{st.l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .15s',
                        background: tab === t.key ? '#fff' : 'transparent',
                        color: tab === t.key ? '#0f766e' : '#64748b',
                        boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}>
                        {t.icon} {t.label}
                        {t.count > 0 && <span style={{ marginLeft: 5, background: '#0f766e', color: '#fff', borderRadius: 10, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* TAB: Thông tin khách hàng */}
            {tab === 'overview' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* Info card */}
                    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                            👤 Thông tin khách hàng
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 24px' }}>
                            <InfoField icon="👤" label="Tên dự án" value={c.name || '—'} />
                            <InfoField icon="📱" label="Số điện thoại" value={
                                <div>
                                    {c.representative && <div style={{ fontWeight: 600, fontSize: 14 }}>{c.representative}</div>}
                                    {c.phone
                                        ? <a href={`tel:${c.phone}`} style={{ fontWeight: 600, fontSize: 14, color: '#0f766e', textDecoration: 'none' }}>{c.phone}</a>
                                        : <span style={{ color: '#94a3b8' }}>—</span>}
                                </div>
                            } />
                            <InfoField icon="📍" label="Địa chỉ" value={c.address || '—'} />
                            <InfoField icon="🗺️" label="Google Maps" value={
                                c.address
                                    ? <a href={`https://maps.google.com/maps?q=${encodeURIComponent(c.address)}`} target="_blank" rel="noreferrer"
                                        style={{ fontWeight: 600, fontSize: 13, color: '#1a73e8', textDecoration: 'none' }}>Xem bản đồ →</a>
                                    : <span style={{ color: '#94a3b8' }}>—</span>
                            } />
                        </div>
                    </div>

                    {/* Bottom two cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Dự án gần đây */}
                        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>🏗️ Dự án gần đây</div>
                            {(c.projects || []).slice(0, 5).map(p => (
                                <div key={p.id} onClick={() => router.push(`/projects/${p.id}`)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', gap: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>{p.name}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{p.code} • {p.area}m² • {p.floors} tầng</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: p.status === 'Hoàn thành' ? '#d1fae5' : p.status === 'Đang thi công' ? '#fef3c7' : '#e0f2fe', color: p.status === 'Hoàn thành' ? '#10b981' : p.status === 'Đang thi công' ? '#f59e0b' : '#0891b2', fontWeight: 600 }}>{p.status}</span>
                                        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: '#0f766e' }}>{p.progress}%</div>
                                    </div>
                                </div>
                            ))}
                            {(!c.projects || c.projects.length === 0) && (
                                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Chưa có dự án</div>
                            )}
                        </div>

                        {/* Hoạt động gần đây */}
                        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: '18px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>🕐 Hoạt động gần đây</div>
                                <button onClick={() => setShowLogModal(true)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#0f766e', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Ghi chú</button>
                            </div>
                            {(c.trackingLogs || []).slice(0, 5).map(log => (
                                <div key={log.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                                        {log.type === 'Điện thoại' ? '📞' : log.type === 'Gặp mặt' ? '🤝' : log.type === 'Zalo' ? '💬' : '📝'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{log.content}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{log.createdBy} • {timeAgo(log.createdAt)}</div>
                                    </div>
                                </div>
                            ))}
                            {(!c.trackingLogs || c.trackingLogs.length === 0) && (
                                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Chưa có nhật ký</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Quy trình */}
            {tab === 'process' && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>🔄 Quy trình bán hàng</span>
                        <button onClick={saveProcess} disabled={autoSaveStatus === 'saving'}
                            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: autoSaveStatus === 'saved' ? '#10b981' : '#0f766e', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', minWidth: 120 }}>
                            {autoSaveStatus === 'saving' ? '⏳ Đang lưu...' : autoSaveStatus === 'saved' ? '✓ Đã lưu' : '💾 Lưu quy trình'}
                        </button>
                    </div>

                    {/* Progress stepper */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, padding: '20px', gap: 12 }}>
                        {PROCESS_STEP_DEFS.map((step) => {
                            const val = processForm[step.key] || {};
                            const isDone = val.status === 'done';
                            const isInProgress = val.status === 'in_progress';
                            const isExpanded = expandedStep === step.key;
                            return (
                                <div key={step.key} style={{ border: `1px solid ${isDone ? step.color + '40' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', background: isDone ? step.bg : '#fff' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }} onClick={() => setExpandedStep(isExpanded ? null : step.key)}>
                                        <span style={{ fontSize: 20 }}>{step.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: isDone ? step.color : '#1e293b' }}>{step.label}</div>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{step.desc}</div>
                                        </div>
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: isDone ? step.color : isInProgress ? '#fef3c7' : '#f1f5f9', color: isDone ? '#fff' : isInProgress ? '#f59e0b' : '#94a3b8', fontWeight: 600 }}>
                                            {isDone ? 'Hoàn thành' : isInProgress ? 'Đang làm' : 'Chưa bắt đầu'}
                                        </span>
                                    </div>
                                    {isExpanded && (
                                        <div style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', display: 'grid', gap: 10 }}>
                                            <div>
                                                <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>TRẠNG THÁI</label>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <button key={opt.key} onClick={() => updateStep(step.key, 'status', opt.key)}
                                                            style={{ flex: 1, padding: '5px', fontSize: 11, borderRadius: 7, border: `1px solid ${val.status === opt.key ? opt.color : '#e2e8f0'}`, background: val.status === opt.key ? opt.color : '#fff', color: val.status === opt.key ? '#fff' : '#64748b', cursor: 'pointer', fontWeight: 600 }}>
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>NGÀY THỰC HIỆN</label>
                                                <input type="date" value={val.date || ''} onChange={e => updateStep(step.key, 'date', e.target.value)}
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>NGƯỜI THỰC HIỆN</label>
                                                <input value={val.person || ''} onChange={e => updateStep(step.key, 'person', e.target.value)}
                                                    placeholder="Tên nhân viên..."
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, boxSizing: 'border-box' }} />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>GHI CHÚ</label>
                                                <textarea value={val.notes || ''} onChange={e => updateStep(step.key, 'notes', e.target.value)}
                                                    rows={2} placeholder="Ghi chú..."
                                                    style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, resize: 'none', boxSizing: 'border-box' }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB: Ghi chú */}
            {tab === 'comments' && (
                <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', height: 560 }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>💬 Ghi chú</span>
                        {comments.length > 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>{comments.length} tin nhắn</span>}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {comments.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '40px 0' }}>Chưa có nhận xét nào. Hãy bắt đầu!</div>
                        )}
                        {comments.map(cm => {
                            const isMe = cm.author === session?.user?.name;
                            const isEditing = editingCommentId === cm.id;
                            let attachList = [];
                            try { attachList = cm.attachments ? JSON.parse(cm.attachments) : []; } catch {}
                            return (
                                <div key={cm.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                    <Avatar name={cm.author || '?'} size={32} />
                                    <div style={{ maxWidth: '80%' }}>
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>{cm.author || 'Ẩn danh'} · {timeAgo(cm.createdAt)}</div>
                                        {isEditing ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <textarea autoFocus value={editingCommentText} onChange={e => setEditingCommentText(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEditComment(cm.id); if (e.key === 'Escape') { setEditingCommentId(null); setEditingCommentText(''); } }}
                                                    rows={3} style={{ fontSize: 13, resize: 'none', minWidth: 260, padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button onClick={() => { setEditingCommentId(null); setEditingCommentText(''); }} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Hủy</button>
                                                    <button onClick={() => saveEditComment(cm.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#0f766e', color: '#fff', fontSize: 12, cursor: 'pointer' }}>Lưu</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {cm.content?.trim() && (
                                                    <div style={{ background: isMe ? '#0f766e' : '#f8fafc', color: isMe ? '#fff' : '#1e293b', padding: '8px 12px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: isMe ? 'none' : '1px solid #e2e8f0' }}>
                                                        {cm.content}
                                                    </div>
                                                )}
                                                {attachList.map((att, i) => att.type?.startsWith('image/') ? (
                                                    <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', maxWidth: 220, marginTop: 4 }}>
                                                        <img src={att.url} alt={att.name} style={{ width: '100%', display: 'block' }} />
                                                    </a>
                                                ) : (
                                                    <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, background: isMe ? '#0f766e' : '#f8fafc', color: isMe ? '#fff' : '#1e293b', fontSize: 12, textDecoration: 'none', marginTop: 4 }}>
                                                        📎 {att.name}
                                                    </a>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                    {isMe && !isEditing && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignSelf: 'center' }}>
                                            <button onClick={() => { setEditingCommentId(cm.id); setEditingCommentText(cm.content || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 13 }}>✏️</button>
                                            <button onClick={() => deleteComment(cm.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14 }}>×</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={commentsEndRef} />
                    </div>
                    {pendingAttachments.length > 0 && (
                        <div style={{ padding: '8px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {pendingAttachments.map((att, i) => (
                                <div key={i} style={{ position: 'relative', padding: att.type?.startsWith('image/') ? 0 : '5px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', overflow: att.type?.startsWith('image/') ? 'hidden' : undefined, maxWidth: att.type?.startsWith('image/') ? 80 : 200 }}>
                                    {att.type?.startsWith('image/') ? <img src={att.url} alt={att.name} style={{ width: 72, height: 72, objectFit: 'cover', display: 'block' }} /> : <span style={{ fontSize: 12 }}>📎 {att.name}</span>}
                                    <button onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <Avatar name={session?.user?.name || '?'} size={30} />
                        <div style={{ flex: 1 }}>
                            <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendComment(); } }}
                                placeholder="Viết ghi chú... (Ctrl+Enter để gửi)" rows={2}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={{ display: 'none' }} onChange={handleFileSelect} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, padding: '2px 6px' }}>{uploadingFile ? '⏳' : '📎'}</button>
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>Ảnh, PDF, Word, Excel...</span>
                            </div>
                        </div>
                        <button onClick={sendComment} disabled={sendingComment || uploadingFile || (!newComment.trim() && pendingAttachments.length === 0)}
                            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#0f766e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, opacity: (sendingComment || (!newComment.trim() && pendingAttachments.length === 0)) ? 0.5 : 1 }}>
                            {sendingComment ? '...' : 'Gửi'}
                        </button>
                    </div>
                </div>
            )}

            {/* Log Modal */}
            {showLogModal && (
                <div style={overlayStyle} onClick={() => setShowLogModal(false)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <div style={modalHeaderStyle}><h3 style={{ margin: 0, fontSize: 16 }}>📝 Thêm ghi chú theo dõi</h3><button onClick={() => setShowLogModal(false)} style={closeBtnStyle}>×</button></div>
                        <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                            <div>
                                <label style={labelStyle}>Loại liên hệ</label>
                                <select value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value })} style={inputStyle}>
                                    <option>Điện thoại</option><option>Gặp mặt</option><option>Email</option><option>Zalo</option><option>Khác</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Nội dung *</label>
                                <textarea value={logForm.content} onChange={e => setLogForm({ ...logForm, content: e.target.value })} rows={3} placeholder="Nội dung trao đổi..." style={{ ...inputStyle, resize: 'none' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Người ghi</label>
                                    <input value={logForm.createdBy} onChange={e => setLogForm({ ...logForm, createdBy: e.target.value })} placeholder="Tên nhân viên" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Follow-up tiếp</label>
                                    <input type="date" value={logForm.nextFollowUp} onChange={e => setLogForm({ ...logForm, nextFollowUp: e.target.value })} style={inputStyle} />
                                </div>
                            </div>
                        </div>
                        <div style={modalFooterStyle}>
                            <button onClick={() => setShowLogModal(false)} style={cancelBtnStyle}>Hủy</button>
                            <button onClick={addTrackingLog} style={saveBtnStyle}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div style={overlayStyle} onClick={() => setShowEditModal(false)}>
                    <div style={{ ...modalStyle, maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div style={modalHeaderStyle}><h3 style={{ margin: 0, fontSize: 16 }}>✏️ Chỉnh sửa khách hàng</h3><button onClick={() => setShowEditModal(false)} style={closeBtnStyle}>×</button></div>
                        <div style={{ padding: 20, display: 'grid', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
                            <div>
                                <label style={labelStyle}>Tên khách hàng</label>
                                <input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Số điện thoại</label>
                                    <input value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Người đại diện</label>
                                    <input value={editForm.representative || ''} onChange={e => setEditForm({ ...editForm, representative: e.target.value })} style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Địa chỉ</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Nhập địa chỉ..." style={{ ...inputStyle, flex: 1 }} />
                                    <button type="button" onClick={getGpsAddress} disabled={gpsLoading} style={{ padding: '0 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        {gpsLoading ? '⏳' : '📍 Định vị'}
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Giai đoạn</label>
                                    <select value={editForm.pipelineStage || 'Khách tiềm năng'} onChange={e => setEditForm({ ...editForm, pipelineStage: e.target.value })} style={inputStyle}>
                                        {STAGES.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Nguồn</label>
                                    <select value={editForm.source || ''} onChange={e => setEditForm({ ...editForm, source: e.target.value })} style={inputStyle}>
                                        <option value="">Chọn...</option>
                                        <option>Facebook</option><option>Zalo</option><option>Website</option><option>Giới thiệu</option><option>Đối tác</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Giá trị deal (VNĐ)</label>
                                    <input type="number" value={editForm.estimatedValue || ''} onChange={e => setEditForm({ ...editForm, estimatedValue: parseFloat(e.target.value) || 0 })} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Follow-up</label>
                                    <input type="date" value={editForm.nextFollowUp || ''} onChange={e => setEditForm({ ...editForm, nextFollowUp: e.target.value })} style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>NV kinh doanh</label>
                                <input value={editForm.salesPerson || ''} onChange={e => setEditForm({ ...editForm, salesPerson: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Ghi chú</label>
                                <textarea value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'none' }} />
                            </div>
                        </div>
                        <div style={modalFooterStyle}>
                            <button onClick={() => setShowEditModal(false)} style={cancelBtnStyle}>Hủy</button>
                            <button onClick={saveEdit} style={saveBtnStyle}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}
        </LcShell>
    );
}

function InfoField({ icon, label, value }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{icon}</span>
            <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>{label}</div>
                {typeof value === 'string'
                    ? <div style={{ fontWeight: 500, fontSize: 14, color: '#1e293b' }}>{value}</div>
                    : value}
            </div>
        </div>
    );
}

const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8,
    border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
};

const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
};
const modalStyle = {
    background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
};
const modalHeaderStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
};
const modalFooterStyle = {
    display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: '1px solid #e2e8f0',
};
const closeBtnStyle = { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 };
const cancelBtnStyle = { padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer' };
const saveBtnStyle = { padding: '8px 20px', borderRadius: 8, border: 'none', background: '#0f766e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5 };
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
