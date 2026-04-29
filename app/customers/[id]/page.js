'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const fmt = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '';
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;
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

const PIPELINE = [
    { key: 'Khách nội thất', label: 'Khách nội thất', color: '#06b6d4', bg: '#cffafe' },
    { key: 'Tư vấn', label: 'Tư vấn', color: '#3b82f6', bg: '#dbeafe' },
    { key: 'Báo giá', label: 'Báo giá', color: '#8b5cf6', bg: '#ede9fe' },
    { key: 'Ký HĐ', label: 'Ký HĐ', color: '#10b981', bg: '#d1fae5' },
    { key: 'Thi công', label: 'Thi công', color: '#f97316', bg: '#ffedd5' },
    { key: 'VIP', label: 'VIP', color: '#ec4899', bg: '#fce7f3' },
];

const LOG_ICONS = { 'Điện thoại': '📞', 'Gặp mặt': '🤝', 'Email': '📧', 'Zalo': '💬', 'Khác': '📝' };

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

const PROCESS_STEP_DEFS = [
    { key: 'tuvan',   label: 'Tư vấn',             icon: '📞', color: '#3b82f6', bg: '#dbeafe', desc: 'Tiếp nhận & tư vấn nhu cầu khách hàng' },
    { key: 'baogía',  label: 'Báo giá',             icon: '📄', color: '#8b5cf6', bg: '#ede9fe', desc: 'Lập và gửi báo giá cho khách' },
    { key: 'kyhd',    label: 'Ký hợp đồng',         icon: '✍️', color: '#10b981', bg: '#d1fae5', desc: 'Thống nhất và ký kết hợp đồng' },
    { key: 'thicong', label: 'Thi công',             icon: '🔨', color: '#f97316', bg: '#ffedd5', desc: 'Triển khai thi công dự án' },
    { key: 'thutien', label: 'Thu tiền',             icon: '💵', color: '#f59e0b', bg: '#fef3c7', desc: 'Thanh toán và quyết toán hợp đồng' },
    { key: 'bangiao', label: 'Bàn giao & Bảo hành', icon: '🏆', color: '#ec4899', bg: '#fce7f3', desc: 'Bàn giao công trình và bảo hành' },
];

const STATUS_OPTIONS = [
    { key: 'pending',     label: 'Chưa bắt đầu', color: '#94a3b8', bg: '#f1f5f9' },
    { key: 'in_progress', label: 'Đang thực hiện', color: '#f59e0b', bg: '#fef3c7' },
    { key: 'done',        label: 'Hoàn thành',     color: '#10b981', bg: '#d1fae5' },
];

function defaultProcess() {
    return Object.fromEntries(PROCESS_STEP_DEFS.map(s => [s.key, { status: 'pending', date: '', notes: '', person: '' }]));
}

export default function CustomerDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const [data, setData] = useState(null);
    const [tab, setTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [logForm, setLogForm] = useState({ type: 'Điện thoại', content: '', createdBy: '', nextFollowUp: '' });
    const [editForm, setEditForm] = useState({});
    const [processForm, setProcessForm] = useState(defaultProcess());
    const [expandedStep, setExpandedStep] = useState(null);
    const [savingProcess, setSavingProcess] = useState(false);

    // Comments
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [uploadingFile, setUploadingFile] = useState(false);
    const commentsEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const fetchData = () => {
        fetch(`/api/customers/${id}`).then(r => r.ok ? r.json() : null).then(d => {
            setData(d);
            setLoading(false);
            if (d?.processData) {
                try { setProcessForm({ ...defaultProcess(), ...JSON.parse(d.processData) }); } catch {}
            }
        });
    };
    useEffect(fetchData, [id]);

    useEffect(() => {
        fetch(`/api/customers/${id}/comments`)
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setComments(d); });
    }, [id]);

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
        const data = await res.json();
        setSendingComment(false);
        if (res.ok) {
            setComments(prev => [...prev, data]);
            setNewComment('');
            setPendingAttachments([]);
            setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    };

    const deleteComment = async (commentId) => {
        setComments(prev => prev.filter(c => c.id !== commentId));
        await fetch(`/api/customers/${id}/comments/${commentId}`, { method: 'DELETE' });
    };

    const addTrackingLog = async () => {
        if (!logForm.content.trim()) return alert('Nhập nội dung');
        const body = { ...logForm, customerId: id };
        if (data.projects?.length) body.projectId = data.projects[0].id;
        if (logForm.nextFollowUp) {
            // Update customer nextFollowUp
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

    const handleDelete = async () => {
        if (!confirm('Xóa khách hàng này và tất cả dữ liệu liên quan?')) return;
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (!res.ok) { const err = await res.json().catch(() => ({})); return alert(err.error || 'Lỗi xóa'); }
        router.push('/customers');
    };

    if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;
    if (!data) { router.push('/customers'); return null; }
    const c = data;
    const s = c.stats || { projectCount: 0, contractCount: 0, totalContractValue: 0, totalPaid: 0, totalDebt: 0 };
    const stage = PIPELINE.find(p => p.key === (c.pipelineStage || 'Khách nội thất')) || PIPELINE[0];

    // CRM Score calculation
    const score = Math.min(100,
        (c.projects?.length || 0) * 15 +
        (c.contracts?.length || 0) * 10 +
        (c.trackingLogs?.length || 0) * 5 +
        (s.totalContractValue > 0 ? 20 : 0) +
        (c.lastContactAt && (Date.now() - new Date(c.lastContactAt).getTime()) < 7 * 86400000 ? 15 : 0)
    );
    const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#94a3b8';

    const tabs = [
        { key: 'overview', label: 'Tổng quan', icon: '📋' },
        { key: 'projects', label: 'Dự án', icon: '🏗️', count: c.projects?.length },
        { key: 'contracts', label: 'Hợp đồng', icon: '📝', count: c.contracts?.length },
        { key: 'quotations', label: 'Báo giá', icon: '📄', count: c.quotations?.length },
        { key: 'timeline', label: 'Timeline', icon: '🕐', count: c.trackingLogs?.length },
        { key: 'transactions', label: 'Giao dịch', icon: '💰', count: c.transactions?.length },
        { key: 'process', label: 'Quy trình', icon: '🔄' },
        { key: 'comments', label: 'Nhận xét', icon: '💬', count: comments.length || undefined },
    ];

    const saveProcess = async () => {
        setSavingProcess(true);
        await fetch(`/api/customers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ processData: JSON.stringify(processForm) }) });
        setSavingProcess(false);
    };

    const updateStep = (key, field, value) => {
        setProcessForm(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    return (
        <div>
            <button className="btn btn-secondary" onClick={() => router.push('/customers')} style={{ marginBottom: 12 }}>← Quay lại</button>

            {/* ===== CRM HEADER ===== */}
            <div className="card" style={{ marginBottom: 16, padding: '16px' }}>
                {/* Top row: Avatar + Name + Score */}
                <div className="customer-header-top">
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${stage.color}, ${stage.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-accent)', fontSize: 12, fontWeight: 600 }}>{c.code}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: stage.bg, color: stage.color }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color }} />{stage.label}</span>
                            <span className={`badge ${c.type === 'Doanh nghiệp' ? 'info' : 'muted'}`} style={{ fontSize: 10 }}>{c.type}</span>
                            {c.source && <span className="badge muted" style={{ fontSize: 10 }}>{c.source}</span>}
                        </div>
                    </div>
                    {/* Score */}
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ position: 'relative', width: 44, height: 44 }}>
                            <svg viewBox="0 0 36 36" style={{ width: 44, height: 44, transform: 'rotate(-90deg)' }}>
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border-light)" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3" strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: scoreColor }}>{score}</div>
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>Điểm CRM</div>
                    </div>
                </div>

                {/* Contact info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10, fontSize: 13 }}>
                    {c.phone && <a href={`tel:${c.phone}`} style={{ textDecoration: 'none', color: 'var(--primary)' }}>📱 {c.phone}</a>}
                    {c.email && <a href={`mailto:${c.email}`} style={{ textDecoration: 'none', color: 'var(--primary)' }}>📧 {c.email}</a>}
                    {c.address && <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>📍 {c.address}</span>}
                </div>
                {c.representative && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Người đại diện: {c.representative}</div>}

                {/* Quick Actions - scrollable on mobile */}
                <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowLogModal(true)} style={{ whiteSpace: 'nowrap' }}>📝 Ghi chú</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, type: c.type, pipelineStage: c.pipelineStage || 'Khách nội thất', source: c.source, representative: c.representative, taxCode: c.taxCode, estimatedValue: c.estimatedValue || 0, nextFollowUp: c.nextFollowUp ? new Date(c.nextFollowUp).toISOString().split('T')[0] : '', salesPerson: c.salesPerson, designer: c.designer, notes: c.notes }); setShowEditModal(true); }} style={{ whiteSpace: 'nowrap' }}>✏️ Sửa</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => router.push('/quotations/create')} style={{ whiteSpace: 'nowrap' }}>📄 Tạo BG</button>
                    {c.phone && <a href={`tel:${c.phone}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>📞 Gọi</a>}
                    <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--status-danger)', whiteSpace: 'nowrap', marginLeft: 'auto' }}>🗑️ Xóa</button>
                </div>

                {/* Next Follow-up + Last Contact */}
                {(c.nextFollowUp || c.lastContactAt) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10, fontSize: 12 }}>
                        {c.nextFollowUp && <span style={{ padding: '3px 8px', borderRadius: 6, background: new Date(c.nextFollowUp) < new Date() ? '#fef2f2' : '#f0fdf4', color: new Date(c.nextFollowUp) < new Date() ? '#ef4444' : '#22c55e', fontWeight: 600 }}>📅 Follow-up: {fmtDate(c.nextFollowUp)}{new Date(c.nextFollowUp) < new Date() ? ' ⚠️' : ''}</span>}
                        {c.lastContactAt && <span style={{ color: 'var(--text-muted)' }}>Liên hệ cuối: {timeAgo(c.lastContactAt)}</span>}
                    </div>
                )}

                {/* Stats grid */}
                <div className="stats-grid" style={{ marginTop: 12, gap: 8 }}>
                    {[
                        { v: s.projectCount, l: 'Dự án', c: 'var(--text-accent)' },
                        { v: s.contractCount, l: 'Hợp đồng' },
                        { v: fmt(s.totalContractValue), l: 'Giá trị HĐ' },
                        { v: fmt(s.totalPaid), l: 'Đã thu', c: 'var(--status-success)' },
                        { v: fmt(s.totalDebt), l: 'Công nợ', c: s.totalDebt > 0 ? 'var(--status-danger)' : 'var(--status-success)' },
                    ].map(st => (
                        <div key={st.l} style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: st.c || 'var(--text-primary)' }}>{st.v}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{st.l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="project-tabs">
                {tabs.map(t => (
                    <button key={t.key} className={`project-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                        <span>{t.icon}</span> {t.label}
                        {t.count > 0 && <span className="tab-count">{t.count}</span>}
                    </button>
                ))}
            </div>

            {/* TAB: Tổng quan */}
            {tab === 'overview' && (
                <div className="dashboard-grid" style={{ display: 'grid', gap: 16 }}>
                    <div className="card">
                        <div className="card-header"><span className="card-title">🏗️ Dự án gần đây</span></div>
                        {(c.projects || []).slice(0, 5).map(p => (
                            <div key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer', gap: 8 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.code} • {p.area}m² • {p.floors} tầng</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : 'info'}`}>{p.status}</span>
                                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{p.progress}%</div>
                                </div>
                            </div>
                        ))}
                        {(!c.projects || c.projects.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có dự án</div>}
                    </div>
                    <div className="card">
                        <div className="card-header"><span className="card-title">🕐 Hoạt động gần đây</span><button className="btn btn-primary btn-sm" onClick={() => setShowLogModal(true)}>+ Ghi chú</button></div>
                        {(c.trackingLogs || []).slice(0, 5).map(log => (
                            <div key={log.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                                    {LOG_ICONS[log.type] || '📝'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{log.content}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.createdBy} • {timeAgo(log.createdAt)} • {log.project?.code}</div>
                                </div>
                            </div>
                        ))}
                        {(!c.trackingLogs || c.trackingLogs.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center', fontSize: 13 }}>Chưa có nhật ký</div>}
                    </div>
                </div>
            )}

            {/* TAB: Dự án */}
            {tab === 'projects' && (
                <div className="card">
                    <div className="desktop-table-view">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã</th><th>Tên</th><th>Giá trị HĐ</th><th>Đã thu</th><th>Tiến độ</th><th>Trạng thái</th><th>HĐ</th><th>CV</th></tr></thead>
                            <tbody>{(c.projects || []).map(p => (
                                <tr key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ cursor: 'pointer' }}>
                                    <td className="accent">{p.code}</td>
                                    <td className="primary">{p.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.address} • {p.area}m²</div></td>
                                    <td className="amount">{fmt(p.contractValue)}</td>
                                    <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(p.paidAmount)}</td>
                                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1, maxWidth: 80 }}><div className="progress-fill" style={{ width: `${p.progress}%` }}></div></div><span style={{ fontSize: 12 }}>{p.progress}%</span></div></td>
                                    <td><span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : 'info'}`}>{p.status}</span></td>
                                    <td>{p.contracts?.length || 0}</td>
                                    <td>{p._count?.workOrders || 0}</td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    </div>
                    <div className="mobile-card-list">
                        {(c.projects || []).map(p => (
                            <div key={p.id} className="mobile-card-item" onClick={() => router.push(`/projects/${p.id}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="card-title">{p.name}</div>
                                        <div className="card-subtitle">{p.code} • {p.area}m² • {p.floors} tầng</div>
                                    </div>
                                    <span className={`badge ${p.status === 'Hoàn thành' ? 'success' : p.status === 'Đang thi công' ? 'warning' : 'info'}`}>{p.status}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                    <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${p.progress}%` }} /></div>
                                    <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{p.progress}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                                    <span>HĐ: {fmt(p.contractValue)}</span>
                                    <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>Thu: {fmt(p.paidAmount)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {(!c.projects || c.projects.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có dự án</div>}
                </div>
            )}

            {/* TAB: Hợp đồng */}
            {tab === 'contracts' && (
                <div>
                    <div className="stats-grid" style={{ marginBottom: 24 }}>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700 }}>{(c.contracts || []).length}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng HĐ</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--status-success)' }}>{fmt(s.totalContractValue)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng giá trị</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(s.totalPaid)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đã thu</div></div>
                        <div className="stat-card"><div style={{ fontSize: 20, fontWeight: 700, color: s.totalDebt > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{fmt(s.totalDebt)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Công nợ</div></div>
                    </div>
                    <div className="card">
                        <div className="desktop-table-view">
                            <div className="table-container"><table className="data-table">
                                <thead><tr><th>Mã HĐ</th><th>Tên</th><th>Dự án</th><th>Giá trị</th><th>Đã thu</th><th>Tỷ lệ</th><th>Trạng thái</th></tr></thead>
                                <tbody>{(c.contracts || []).map(ct => {
                                    const rate = pct(ct.paidAmount, ct.contractValue);
                                    return (
                                        <tr key={ct.id} onClick={() => ct.project && router.push(`/projects/${ct.projectId}`)} style={{ cursor: 'pointer' }}>
                                            <td className="accent">{ct.code}</td>
                                            <td className="primary">{ct.name}</td>
                                            <td><span className="badge info">{ct.project?.code}</span> {ct.project?.name}</td>
                                            <td className="amount">{fmt(ct.contractValue)}</td>
                                            <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>{fmt(ct.paidAmount)}</td>
                                            <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="progress-bar" style={{ flex: 1, maxWidth: 60 }}><div className="progress-fill" style={{ width: `${rate}%` }}></div></div><span style={{ fontSize: 12 }}>{rate}%</span></div></td>
                                            <td><span className={`badge ${ct.status === 'Hoàn thành' ? 'success' : ct.status === 'Đang thực hiện' ? 'warning' : ct.status === 'Đã ký' ? 'info' : 'muted'}`}>{ct.status}</span></td>
                                        </tr>
                                    );
                                })}</tbody>
                            </table></div>
                        </div>
                        <div className="mobile-card-list">
                            {(c.contracts || []).map(ct => {
                                const rate = pct(ct.paidAmount, ct.contractValue);
                                return (
                                    <div key={ct.id} className="mobile-card-item" onClick={() => ct.project && router.push(`/projects/${ct.projectId}`)}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div className="card-title">{ct.name}</div>
                                                <div className="card-subtitle">{ct.code} • {ct.project?.name}</div>
                                            </div>
                                            <span className={`badge ${ct.status === 'Hoàn thành' ? 'success' : ct.status === 'Đang thực hiện' ? 'warning' : ct.status === 'Đã ký' ? 'info' : 'muted'}`}>{ct.status}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                            <div className="progress-bar" style={{ flex: 1 }}><div className="progress-fill" style={{ width: `${rate}%` }} /></div>
                                            <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{rate}%</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
                                            <span>Giá trị: {fmt(ct.contractValue)}</span>
                                            <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>Thu: {fmt(ct.paidAmount)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {(!c.contracts || c.contracts.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có hợp đồng</div>}
                    </div>
                </div>
            )}

            {/* TAB: Báo giá */}
            {tab === 'quotations' && (
                <div className="card">
                    <div className="desktop-table-view">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Mã</th><th>Tên</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày tạo</th><th>HĐ lực</th></tr></thead>
                            <tbody>{(c.quotations || []).map(q => (
                                <tr key={q.id}>
                                    <td className="accent">{q.code}</td>
                                    <td className="primary">{q.name}<div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.items?.length || 0} hạng mục</div></td>
                                    <td className="amount">{fmt(q.totalAmount)}</td>
                                    <td><span className={`badge ${q.status === 'Đã duyệt' ? 'success' : q.status === 'Chờ duyệt' ? 'warning' : 'muted'}`}>{q.status}</span></td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(q.createdAt)}</td>
                                    <td style={{ fontSize: 12 }}>{fmtDate(q.validUntil)}</td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    </div>
                    <div className="mobile-card-list">
                        {(c.quotations || []).map(q => (
                            <div key={q.id} className="mobile-card-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="card-title">{q.name}</div>
                                        <div className="card-subtitle">{q.code} • {q.items?.length || 0} hạng mục</div>
                                    </div>
                                    <span className={`badge ${q.status === 'Đã duyệt' ? 'success' : q.status === 'Chờ duyệt' ? 'warning' : 'muted'}`}>{q.status}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                                    <span style={{ fontWeight: 700 }}>{fmt(q.totalAmount)}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{fmtDate(q.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {(!c.quotations || c.quotations.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có báo giá</div>}
                </div>
            )}

            {/* TAB: Timeline */}
            {tab === 'timeline' && (
                <div className="card" style={{ padding: 24 }}>
                    <div className="card-header"><span className="card-title">🕐 Activity Timeline</span><button className="btn btn-primary btn-sm" onClick={() => setShowLogModal(true)}>+ Thêm ghi chú</button></div>
                    <div style={{ position: 'relative', paddingLeft: 32 }}>
                        <div style={{ position: 'absolute', left: 15, top: 0, bottom: 0, width: 2, background: 'var(--border-light)' }} />
                        {(c.trackingLogs || []).map((log, i) => (
                            <div key={log.id} style={{ position: 'relative', paddingBottom: 24, paddingLeft: 24 }}>
                                <div style={{ position: 'absolute', left: -24, top: 4, width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, zIndex: 1 }}>
                                    {LOG_ICONS[log.type] || '📝'}
                                </div>
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--border-light)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{log.content}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(log.createdAt)}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
                                        {log.createdBy && <span>👤 {log.createdBy}</span>}
                                        <span className="badge muted" style={{ fontSize: 10 }}>{log.type}</span>
                                        {log.project && <span className="badge info" style={{ fontSize: 10 }}>{log.project.code}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!c.trackingLogs || c.trackingLogs.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Chưa có hoạt động nào</div>}
                    </div>
                </div>
            )}

            {/* TAB: Giao dịch */}
            {tab === 'transactions' && (
                <div className="card">
                    <div className="card-header"><span className="card-title">💰 Lịch sử giao dịch</span></div>
                    <div className="desktop-table-view">
                        <div className="table-container"><table className="data-table">
                            <thead><tr><th>Ngày</th><th>Mô tả</th><th>Dự án</th><th>Loại</th><th>Số tiền</th></tr></thead>
                            <tbody>{(c.transactions || []).map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontSize: 12 }}>{fmtDate(t.date)}</td>
                                    <td className="primary">{t.description}</td>
                                    <td><span className="badge info">{t.project?.code}</span></td>
                                    <td><span className={`badge ${t.type === 'Thu' ? 'success' : 'danger'}`}>{t.type}</span></td>
                                    <td style={{ fontWeight: 700, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>{t.type === 'Thu' ? '+' : '-'}{fmt(t.amount)}</td>
                                </tr>
                            ))}</tbody>
                        </table></div>
                    </div>
                    <div className="mobile-card-list">
                        {(c.transactions || []).map(t => (
                            <div key={t.id} className="mobile-card-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="card-title">{t.description}</div>
                                        <div className="card-subtitle">{fmtDate(t.date)} • {t.project?.code}</div>
                                    </div>
                                    <span className={`badge ${t.type === 'Thu' ? 'success' : 'danger'}`}>{t.type}</span>
                                </div>
                                <div style={{ marginTop: 6, fontWeight: 700, fontSize: 14, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                    {t.type === 'Thu' ? '+' : '-'}{fmt(t.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                    {(!c.transactions || c.transactions.length === 0) && <div style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>Chưa có giao dịch</div>}
                </div>
            )}

            {/* TAB: Quy trình */}
            {tab === 'process' && (
                <div className="card">
                    <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                        <span className="card-title">🔄 Quy trình bán hàng</span>
                        <button className="btn btn-primary btn-sm" onClick={saveProcess} disabled={savingProcess}>
                            {savingProcess ? 'Đang lưu...' : '💾 Lưu quy trình'}
                        </button>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                        {PROCESS_STEP_DEFS.map((step, idx) => {
                            const stepData = processForm[step.key] || { status: 'pending', date: '', notes: '', person: '' };
                            const isDone = stepData.status === 'done';
                            const isActive = stepData.status === 'in_progress';
                            const isExpanded = expandedStep === step.key;
                            const statusInfo = STATUS_OPTIONS.find(o => o.key === stepData.status) || STATUS_OPTIONS[0];
                            return (
                                <div key={step.key} style={{ display: 'flex', gap: 14, marginBottom: 0 }}>
                                    {/* Connector line + icon */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 40 }}>
                                        <div
                                            onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                                            style={{
                                                width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: isDone ? 18 : 13, cursor: 'pointer', border: '2px solid',
                                                borderColor: isDone ? step.color : isActive ? step.color : 'var(--border)',
                                                background: isDone ? step.bg : isActive ? step.bg + '88' : 'var(--bg-secondary)',
                                                fontWeight: 700, color: isDone || isActive ? step.color : 'var(--text-muted)',
                                                transition: 'all .2s', userSelect: 'none',
                                            }}>
                                            {isDone ? step.icon : idx + 1}
                                        </div>
                                        {idx < PROCESS_STEP_DEFS.length - 1 && (
                                            <div style={{ width: 2, flex: 1, minHeight: 16, background: isDone ? step.color : 'var(--border)', opacity: isDone ? 0.35 : 0.15, margin: '3px 0' }} />
                                        )}
                                    </div>
                                    {/* Content block */}
                                    <div style={{ flex: 1, paddingBottom: idx < PROCESS_STEP_DEFS.length - 1 ? 12 : 4 }}>
                                        {/* Header row - always visible, clickable */}
                                        <div
                                            onClick={() => setExpandedStep(isExpanded ? null : step.key)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 8, paddingBottom: 6 }}>
                                            <span style={{ fontWeight: 700, fontSize: 14, color: isDone ? step.color : isActive ? step.color : 'var(--text-primary)' }}>
                                                {step.label}
                                            </span>
                                            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10, background: statusInfo.bg, color: statusInfo.color }}>
                                                {statusInfo.label}
                                            </span>
                                            {stepData.date && (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅 {new Date(stepData.date).toLocaleDateString('vi-VN')}</span>
                                            )}
                                            {stepData.person && (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {stepData.person}</span>
                                            )}
                                            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', transition: 'transform .2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>▶</span>
                                        </div>
                                        {!isExpanded && stepData.notes && (
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', paddingBottom: 4, paddingLeft: 2, whiteSpace: 'pre-wrap', opacity: 0.85 }}>
                                                {stepData.notes}
                                            </div>
                                        )}
                                        {/* Expanded edit form */}
                                        {isExpanded && (
                                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px', marginBottom: 8, border: `1px solid ${step.color}33` }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{step.desc}</div>
                                                {/* Status */}
                                                <div style={{ marginBottom: 10 }}>
                                                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TRẠNG THÁI</label>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        {STATUS_OPTIONS.map(opt => (
                                                            <button key={opt.key} type="button"
                                                                onClick={() => updateStep(step.key, 'status', opt.key)}
                                                                style={{ padding: '5px 12px', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s',
                                                                    borderColor: stepData.status === opt.key ? opt.color : 'var(--border)',
                                                                    background: stepData.status === opt.key ? opt.bg : 'transparent',
                                                                    color: stepData.status === opt.key ? opt.color : 'var(--text-muted)' }}>
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Date + Person */}
                                                <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                                    <div style={{ flex: 1, minWidth: 140 }}>
                                                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>NGÀY THỰC HIỆN</label>
                                                        <input type="date" className="form-input" style={{ fontSize: 13 }}
                                                            value={stepData.date || ''}
                                                            onChange={e => updateStep(step.key, 'date', e.target.value)} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 140 }}>
                                                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>NGƯỜI PHỤ TRÁCH</label>
                                                        <input type="text" className="form-input" style={{ fontSize: 13 }} placeholder="Tên nhân viên"
                                                            value={stepData.person || ''}
                                                            onChange={e => updateStep(step.key, 'person', e.target.value)} />
                                                    </div>
                                                </div>
                                                {/* Notes */}
                                                <div>
                                                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>GHI CHÚ / KẾT QUẢ</label>
                                                    <textarea className="form-input" rows={3} style={{ fontSize: 13, resize: 'vertical' }} placeholder="Mô tả chi tiết kết quả, vấn đề phát sinh..."
                                                        value={stepData.notes || ''}
                                                        onChange={e => updateStep(step.key, 'notes', e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Footer tóm tắt */}
                    <div style={{ borderTop: '1px solid var(--border-light)', padding: '12px 20px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
                                {Object.values(processForm).filter(v => v.status === 'done').length}/{PROCESS_STEP_DEFS.length}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bước xong</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>
                                {Object.values(processForm).filter(v => v.status === 'in_progress').length}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đang làm</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{fmt(s.totalPaid)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Đã thu</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: s.totalDebt > 0 ? '#ef4444' : '#94a3b8' }}>{fmt(s.totalDebt)}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Còn nợ</div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Nhận xét */}
            {tab === 'comments' && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 560 }}>
                    <div className="card-header">
                        <span className="card-title">💬 Nhận xét</span>
                        {comments.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{comments.length} tin nhắn</span>}
                    </div>
                    {/* Messages list */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {comments.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '40px 0' }}>
                                Chưa có nhận xét nào. Hãy bắt đầu cuộc trò chuyện!
                            </div>
                        )}
                        {comments.map(cm => {
                            const isMe = cm.author === session?.user?.name;
                            let attachList = [];
                            try { attachList = cm.attachments ? JSON.parse(cm.attachments) : []; } catch {}
                            const hasContent = cm.content?.trim();
                            return (
                                <div key={cm.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                                    <Avatar name={cm.author || '?'} size={32} />
                                    <div style={{ maxWidth: '80%' }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, textAlign: isMe ? 'right' : 'left' }}>
                                            {cm.author || 'Ẩn danh'} · {timeAgo(cm.createdAt)}
                                        </div>
                                        {hasContent && (
                                            <div style={{
                                                background: isMe ? 'var(--primary)' : 'var(--bg-secondary)',
                                                color: isMe ? '#fff' : 'var(--text-primary)',
                                                padding: '8px 12px', borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                                                fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                                border: isMe ? 'none' : '1px solid var(--border-light)',
                                                marginBottom: attachList.length ? 6 : 0,
                                            }}>
                                                {cm.content}
                                            </div>
                                        )}
                                        {attachList.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {attachList.map((att, i) => {
                                                    const isImg = att.type?.startsWith('image/');
                                                    return isImg ? (
                                                        <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-light)', maxWidth: 220 }}>
                                                            <img src={att.url} alt={att.name} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
                                                        </a>
                                                    ) : (
                                                        <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{
                                                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                                            borderRadius: 10, background: isMe ? 'var(--primary)' : 'var(--bg-secondary)',
                                                            border: isMe ? 'none' : '1px solid var(--border-light)',
                                                            color: isMe ? '#fff' : 'var(--text-primary)',
                                                            fontSize: 12, textDecoration: 'none', wordBreak: 'break-all',
                                                        }}>
                                                            <span style={{ fontSize: 18, flexShrink: 0 }}>📎</span>
                                                            <span>{att.name}</span>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {isMe && (
                                        <button onClick={() => deleteComment(cm.id)} title="Xóa" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 14, padding: '4px', alignSelf: 'center', flexShrink: 0 }}>×</button>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={commentsEndRef} />
                    </div>
                    {/* Pending attachments preview */}
                    {pendingAttachments.length > 0 && (
                        <div style={{ padding: '8px 16px 0', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {pendingAttachments.map((att, i) => {
                                const isImg = att.type?.startsWith('image/');
                                return (
                                    <div key={i} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, padding: isImg ? 0 : '5px 10px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', overflow: isImg ? 'hidden' : undefined, maxWidth: isImg ? 80 : 200 }}>
                                        {isImg ? (
                                            <img src={att.url} alt={att.name} style={{ width: 72, height: 72, objectFit: 'cover', display: 'block' }} />
                                        ) : (
                                            <><span style={{ fontSize: 16 }}>📎</span><span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{att.name}</span></>
                                        )}
                                        <button onClick={() => setPendingAttachments(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, padding: 0 }}>×</button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Input area */}
                    <div style={{ borderTop: '1px solid var(--border-light)', padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <Avatar name={session?.user?.name || '?'} size={30} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
                            <textarea
                                className="form-input"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendComment(); } }}
                                placeholder="Viết nhận xét... (Ctrl+Enter để gửi)"
                                rows={2}
                                style={{ fontSize: 13, resize: 'none', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottom: 'none' }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderTop: 'none', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, gap: 4 }}>
                                <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" style={{ display: 'none' }} onChange={handleFileSelect} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} title="Đính kèm ảnh / tài liệu" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px 6px', borderRadius: 6, fontSize: 16, color: 'var(--text-muted)', lineHeight: 1 }}>
                                    {uploadingFile ? '⏳' : '📎'}
                                </button>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>Ảnh, PDF, Word, Excel...</span>
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={sendComment} disabled={sendingComment || uploadingFile || (!newComment.trim() && pendingAttachments.length === 0)} style={{ fontSize: 13, padding: '8px 16px', flexShrink: 0 }}>
                            {sendingComment ? '...' : 'Gửi'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tracking Log Modal */}
            {showLogModal && (
                <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header"><h3>📝 Thêm ghi chú theo dõi</h3><button className="modal-close" onClick={() => setShowLogModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Loại liên hệ</label>
                                <select className="form-select" value={logForm.type} onChange={e => setLogForm({ ...logForm, type: e.target.value })}>
                                    <option>Điện thoại</option><option>Gặp mặt</option><option>Email</option><option>Zalo</option><option>Khác</option>
                                </select>
                            </div>
                            <div className="form-group"><label className="form-label">Nội dung *</label>
                                <textarea className="form-input" rows={3} value={logForm.content} onChange={e => setLogForm({ ...logForm, content: e.target.value })} placeholder="Nội dung trao đổi..." />
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Người ghi</label>
                                    <input className="form-input" value={logForm.createdBy} onChange={e => setLogForm({ ...logForm, createdBy: e.target.value })} placeholder="Tên nhân viên" />
                                </div>
                                <div className="form-group"><label className="form-label">Follow-up tiếp</label>
                                    <input className="form-input" type="date" value={logForm.nextFollowUp} onChange={e => setLogForm({ ...logForm, nextFollowUp: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setShowLogModal(false)}>Hủy</button><button className="btn btn-primary" onClick={addTrackingLog}>Lưu</button></div>
                    </div>
                </div>
            )}

            {/* Edit Customer Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header"><h3>✏️ Chỉnh sửa khách hàng</h3><button className="modal-close" onClick={() => setShowEditModal(false)}>×</button></div>
                        <div className="modal-body">
                            <div className="form-group"><label className="form-label">Tên</label><input className="form-input" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">SĐT</label><input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Địa chỉ</label><input className="form-input" value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Giai đoạn KD</label>
                                    <select className="form-select" value={editForm.pipelineStage || 'Khách nội thất'} onChange={e => setEditForm({ ...editForm, pipelineStage: e.target.value })}>
                                        {PIPELINE.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label className="form-label">Nguồn</label>
                                    <select className="form-select" value={editForm.source || ''} onChange={e => setEditForm({ ...editForm, source: e.target.value })}>
                                        <option value="">Chọn...</option>
                                        <option>Facebook</option><option>Zalo</option><option>Website</option><option>Instagram</option><option>Giới thiệu</option><option>Đối tác</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Giá trị deal</label><input className="form-input" type="number" value={editForm.estimatedValue || ''} onChange={e => setEditForm({ ...editForm, estimatedValue: parseFloat(e.target.value) || 0 })} /></div>
                                <div className="form-group"><label className="form-label">Follow-up</label><input className="form-input" type="date" value={editForm.nextFollowUp || ''} onChange={e => setEditForm({ ...editForm, nextFollowUp: e.target.value })} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">NV kinh doanh</label><input className="form-input" value={editForm.salesPerson || ''} onChange={e => setEditForm({ ...editForm, salesPerson: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">NV thiết kế</label><input className="form-input" value={editForm.designer || ''} onChange={e => setEditForm({ ...editForm, designer: e.target.value })} /></div>
                            </div>
                            <div className="form-group"><label className="form-label">Ghi chú</label><textarea className="form-input" rows={2} value={editForm.notes || ''} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} /></div>
                        </div>
                        <div className="modal-footer"><button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>Hủy</button><button className="btn btn-primary" onClick={saveEdit}>Lưu</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
