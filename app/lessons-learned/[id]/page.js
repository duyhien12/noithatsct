'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useRole } from '@/contexts/RoleContext';
import {
    STATUS_COLORS, SEVERITY_COLORS, ALLOWED_TRANSITIONS, getLessonPermissions, canEditLesson, canTransitionStatus,
} from '@/lib/lessonLearned';
import {
    GraduationCap, Building2, AlertTriangle, Search, Wrench, ShieldCheck, Paperclip, History, Pencil, Trash2, ImageOff,
} from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—';
const isImage = (att) => att.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(att.url || '');

function Section({ icon: Icon, title, children, color = '#1C3A6B' }) {
    return (
        <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={18} color={color} /> {title}
                </h3>
            </div>
            <div className="card-body">{children}</div>
        </div>
    );
}

export default function LessonDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const toast = useToast();
    const { role, department } = useRole();
    const { data: session } = useSession();
    const perms = useMemo(() => getLessonPermissions({ role, department }), [role, department]);

    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const load = useCallback(() => {
        apiFetch(`/api/lessons-learned/${id}`).then(setLesson).catch(e => toast.error(e.message)).finally(() => setLoading(false));
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const user = { id: session?.user?.id, name: session?.user?.name, role, department };

    const changeStatus = async (status) => {
        setBusy(true);
        try {
            await apiFetch(`/api/lessons-learned/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
            toast.success(`Đã chuyển sang "${status}"`);
            load();
        } catch (e) {
            toast.error(e.message);
        }
        setBusy(false);
    };

    const handleDelete = async () => {
        try {
            await apiFetch(`/api/lessons-learned/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa bài học');
            router.push('/lessons-learned');
        } catch (e) {
            toast.error(e.message);
        }
    };

    if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Đang tải...</div>;
    if (!lesson) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--status-danger)' }}>Không tìm thấy bài học</div>;

    const nextStatuses = (ALLOWED_TRANSITIONS[lesson.status] || []).filter(s => canTransitionStatus(user, lesson.status, s));
    const images = (lesson.attachments || []).filter(isImage);
    const files = (lesson.attachments || []).filter(a => !isImage(a));
    const history = Array.isArray(lesson.history) ? [...lesson.history].reverse() : [];

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <button className="btn btn-ghost" onClick={() => router.push('/lessons-learned')} style={{ marginBottom: 8 }}>← Danh sách</button>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GraduationCap size={22} /> {lesson.code}
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StatusBadge status={lesson.severity} colorMap={SEVERITY_COLORS} />
                    <StatusBadge status={lesson.status} colorMap={STATUS_COLORS} />
                    {canEditLesson(user, lesson) && (
                        <button className="btn btn-ghost" onClick={() => router.push(`/lessons-learned/${id}/edit`)}><Pencil size={14} /> Sửa</button>
                    )}
                    {perms.canDelete && (
                        <button className="btn btn-danger" onClick={() => setDeleteOpen(true)}><Trash2 size={14} /> Xóa</button>
                    )}
                </div>
            </div>

            {nextStatuses.length > 0 && (
                <div className="card" style={{ marginBottom: 20, background: 'var(--bg-hover)' }}>
                    <div className="card-body" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="form-label" style={{ margin: 0 }}>Chuyển trạng thái:</span>
                        {nextStatuses.map(s => (
                            <button key={s} className="btn btn-secondary" disabled={busy} onClick={() => changeStatus(s)}>{s}</button>
                        ))}
                    </div>
                </div>
            )}

            <Section icon={Building2} title="Thông tin dự án">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, fontSize: 13.5 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Ngày phát sinh: </span><strong>{fmtDate(lesson.occurredAt)}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Dự án: </span><strong>{lesson.projectName || lesson.project?.name || '—'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Khách hàng: </span><strong>{lesson.customerName || lesson.customer?.name || '—'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Hạng mục: </span><strong>{lesson.category}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Người phụ trách: </span><strong>{lesson.assignee || '—'}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Người nhập: </span><strong>{lesson.createdBy || '—'}</strong></div>
                </div>
            </Section>

            <Section icon={AlertTriangle} title="Nội dung sự việc" color="#DC2626">
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{lesson.issueContent}</p>
            </Section>

            <Section icon={Search} title="Nguyên nhân" color="#D97706">
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{lesson.cause || '—'}</p>
            </Section>

            <Section icon={Wrench} title="Giải pháp xử lý" color="#2563EB">
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{lesson.solution || '—'}</p>
            </Section>

            <Section icon={ShieldCheck} title="Biện pháp phòng ngừa tái diễn" color="#059669">
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{lesson.prevention || '—'}</p>
                {lesson.notes && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Ghi chú</div>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{lesson.notes}</p>
                    </div>
                )}
                {lesson.confirmedBy && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)', fontSize: 12.5, color: 'var(--text-muted)' }}>
                        ✅ Xác nhận bởi <strong>{lesson.confirmedBy}</strong> lúc {fmtDateTime(lesson.confirmedAt)}
                    </div>
                )}
            </Section>

            {images.length > 0 && (
                <Section icon={Paperclip} title="Hình ảnh">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                        {images.map((att, i) => (
                            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <img src={att.url} alt={att.name} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                            </a>
                        ))}
                    </div>
                </Section>
            )}

            {(files.length > 0 || images.length === 0) && (
                <Section icon={Paperclip} title="File đính kèm">
                    {files.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <ImageOff size={14} /> Chưa có file đính kèm
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {files.map((att, i) => (
                                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-hover)', fontSize: 12.5, textDecoration: 'none', color: 'var(--text-primary)' }}>
                                    <Paperclip size={12} /> {att.name}
                                </a>
                            ))}
                        </div>
                    )}
                </Section>
            )}

            <Section icon={History} title="Lịch sử chỉnh sửa" color="#6b7280">
                {history.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có lịch sử</div>
                ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                        {history.map((h, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12.5, paddingBottom: 8, borderBottom: i < history.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                <span style={{ color: 'var(--text-muted)', flexShrink: 0, minWidth: 130 }}>{fmtDateTime(h.at)}</span>
                                <span><strong>{h.by}</strong> — {h.action}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Section>

            <ConfirmDialog
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Xóa bài học dự án"
                message={`Xác nhận xóa bài học ${lesson.code}? Thao tác này không thể hoàn tác.`}
            />
        </div>
    );
}
