'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { X, Pencil, Trash2, UserMinus } from 'lucide-react';
import {
    Button, IconButton, RowMenu, ConfirmDialog, Textarea, ErrorState, SkeletonCard, useToast,
} from '@/components/ui';
import { formatDateTime, formatPhone, timeAgo } from '@/lib/format';
import {
    ISSUE_STATUS, ISSUE_CATEGORY_LABELS, ISSUE_SOURCE_LABELS, TRANSITION_ACTION_LABELS, ISSUE_STATUS_LABELS,
} from '@/lib/customerIssue/constants';
import { IssueStatusBadge, IssuePriorityBadge, DueLabel, Avatar } from './IssueBadges';
import LookupSelect from './LookupSelect';
import IssueAttachments from './IssueAttachments';
import IssueWorkOrders from './IssueWorkOrders';
import IssueTimeline from './IssueTimeline';
import { issueApi } from './api';
import s from './dh360.module.css';

const CLOSED = [ISSUE_STATUS.DONE, ISSUE_STATUS.CANCELLED];
// Bước "tiến lên" hiện thành nút chính, các bước còn lại là nút phụ
const FORWARD = ['NEW>IN_PROGRESS', 'IN_PROGRESS>WAITING_CONFIRMATION', 'WAITING_CONFIRMATION>DONE', 'CANCELLED>NEW'];

function Info({ label, children, wide }) {
    return (
        <div className={`${s.infoItem} ${wide ? s.infoWide : ''}`.trim()}>
            <span className={s.infoLabel}>{label}</span>
            <span className={s.infoValue}>{children || <span className={s.placeholder}>—</span>}</span>
        </div>
    );
}

function PeopleSection({ issue, perms, onChanged }) {
    const toast = useToast();
    const open = !CLOSED.includes(issue.status);
    const run = async (fn, okMsg) => {
        try { await fn(); toast.success(okMsg); onChanged(); } catch (e) { toast.error(e.message); }
    };
    const collaboratorIds = issue.collaborators.map(c => c.userId);

    return (
        <section className={s.section} aria-labelledby="dh360-people">
            <h3 className={s.sectionTitle} id="dh360-people">Người phụ trách & phối hợp</h3>
            <div className={s.infoGrid}>
                <div className={`${s.infoItem} ${s.infoWide}`}>
                    <span className={s.infoLabel}>Người phụ trách</span>
                    {perms.assign && open ? (
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <LookupSelect
                                    type="users"
                                    value={issue.assigneeId ? { id: issue.assigneeId, label: issue.assigneeName } : null}
                                    exclude={[issue.assigneeId, ...collaboratorIds].filter(Boolean)}
                                    placeholder="Chọn người phụ trách"
                                    aria-label="Chọn người phụ trách"
                                    onChange={u => run(() => issueApi.assign(issue.id, u ? u.id : null),
                                        u ? `Đã giao ${u.label} phụ trách.` : 'Đã bỏ phân công.')}
                                />
                            </div>
                        </div>
                    ) : (
                        <span className={s.infoValue}>
                            {issue.assigneeName
                                ? <span className={s.chip}><Avatar name={issue.assigneeName} /><span>{issue.assigneeName}</span></span>
                                : <span className={s.placeholder}>Chưa phân công</span>}
                        </span>
                    )}
                </div>
                <div className={`${s.infoItem} ${s.infoWide}`}>
                    <span className={s.infoLabel}>Người phối hợp ({issue.collaborators.length})</span>
                    <div className={s.chips}>
                        {issue.collaborators.map(c => (
                            <span key={c.userId} className={s.chip}>
                                <Avatar name={c.userName} />
                                <span>{c.userName}</span>
                                {perms.collaborators && (
                                    <IconButton icon={UserMinus} size="sm" label={`Bỏ ${c.userName}`}
                                        onClick={() => run(() => issueApi.removeCollaborator(issue.id, c.userId), `Đã bỏ ${c.userName} khỏi danh sách phối hợp.`)} />
                                )}
                            </span>
                        ))}
                        {!issue.collaborators.length && <span className={s.placeholder}>Chưa có người phối hợp</span>}
                    </div>
                    {perms.collaborators && open && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                            <LookupSelect
                                type="users"
                                value={null}
                                exclude={[issue.assigneeId, ...collaboratorIds].filter(Boolean)}
                                placeholder="Thêm người phối hợp"
                                aria-label="Thêm người phối hợp"
                                onChange={u => u && run(() => issueApi.addCollaborator(issue.id, u.id), `Đã thêm ${u.label} phối hợp xử lý.`)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function ResolutionSection({ issue, perms, onChanged }) {
    const toast = useToast();
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(issue.resolution || '');
    const [saving, setSaving] = useState(false);
    const canEdit = perms.update && !CLOSED.includes(issue.status);

    useEffect(() => { if (!editing) setText(issue.resolution || ''); }, [issue.resolution, editing]);

    const save = async () => {
        setSaving(true);
        try {
            await issueApi.update(issue.id, { resolution: text.trim() });
            toast.success('Đã lưu kết quả xử lý.');
            setEditing(false);
            onChanged();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={s.section} aria-labelledby="dh360-result">
            <div className={s.sectionHead}>
                <h3 className={s.sectionTitle} id="dh360-result">Kết quả xử lý</h3>
                {canEdit && !editing && (
                    <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                        {issue.resolution ? 'Sửa' : 'Nhập kết quả'}
                    </Button>
                )}
            </div>
            {editing ? (
                <>
                    <Textarea rows={5} value={text} onChange={e => setText(e.target.value)} aria-label="Kết quả xử lý"
                        placeholder="Đã làm gì để xử lý vấn đề; phiếu công việc hoàn thành sẽ tự nối thêm dòng vào đây" />
                    <div className="ui-row ui-row--end">
                        <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Huỷ</Button>
                        <Button variant="secondary" size="sm" loading={saving} onClick={save}>Lưu kết quả</Button>
                    </div>
                </>
            ) : issue.resolution
                ? <p className={s.prose}>{issue.resolution}</p>
                : <span className={s.placeholder}>Chưa có kết quả xử lý — cần có trước khi chuyển sang Chờ xác nhận</span>}
            {issue.confirmedAt && (
                <span className={s.rowSub}>Xác nhận hoàn thành bởi {issue.confirmedByName || '—'} lúc {formatDateTime(issue.confirmedAt)}</span>
            )}
        </section>
    );
}

/**
 * Panel chi tiết bên phải — mở trên cùng trang (không chuyển route).
 * Mọi thao tác gọi API Giai đoạn 2; quyền & bước chuyển lấy từ GET /api/customer-issues/[id].
 */
export default function IssueDetailPanel({ issueId, me, rolePerms, onClose, onChanged, onEdit, onMove, refreshKey }) {
    const toast = useToast();
    const panelRef = useRef(null);
    const [issue, setIssue] = useState(null);
    const [logs, setLogs] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [detail, log] = await Promise.all([issueApi.get(issueId), issueApi.logs(issueId)]);
            setIssue(detail);
            setLogs(log.data || []);
            setError(null);
        } catch (e) {
            setError(e);
        } finally {
            setLoading(false);
        }
    }, [issueId]);

    useEffect(() => { setIssue(null); setLogs(null); }, [issueId]);
    // refreshKey: nơi mở panel báo dữ liệu vừa đổi (VD chuyển trạng thái từ hộp thoại)
    useEffect(() => { load(); }, [load, refreshKey]);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const restore = document.activeElement;
        panelRef.current?.focus();
        return () => {
            document.body.style.overflow = prev;
            if (restore && typeof restore.focus === 'function') restore.focus();
        };
    }, []);

    const changed = () => { load(); onChanged?.(); };

    const perms = issue?.permissions || {};
    const transitions = (issue?.allowedTransitions || []).map(to => ({ to, key: `${issue.status}>${to}` }));
    const primary = transitions.find(t => FORWARD.includes(t.key));
    const secondary = transitions.filter(t => t !== primary && t.to !== ISSUE_STATUS.CANCELLED);
    const cancel = transitions.find(t => t.to === ISSUE_STATUS.CANCELLED);
    const label = (t) => TRANSITION_ACTION_LABELS[t.key] || ISSUE_STATUS_LABELS[t.to];
    const menu = [
        cancel && { label: label(cancel), danger: true, onClick: () => onMove(issue, cancel.to) },
        perms.delete && { label: 'Xoá vấn đề', icon: Trash2, danger: true, separatorBefore: !!cancel, onClick: () => setConfirmDelete(true) },
    ].filter(Boolean);

    const remove = async () => {
        try {
            await issueApi.remove(issue.id);
            toast.success(`Đã xoá ${issue.code}. Nhật ký vẫn được lưu.`);
            onChanged?.();
            onClose();
        } catch (e) {
            toast.error(e.message);
        }
    };

    return (
        <div
            className={s.panelOverlay}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
            onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
        >
            <aside
                ref={panelRef}
                className={s.panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="dh360-panel-title"
                tabIndex={-1}
            >
                <header className={s.panelHead}>
                    <div className={s.panelHeadTop}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <span className={s.code}>{issue?.code || '…'}</span>
                            {issue && <IssueStatusBadge status={issue.status} />}
                            {issue && <IssuePriorityBadge priority={issue.priority} size="md" />}
                        </span>
                        <span style={{ display: 'inline-flex', gap: 4 }}>
                            {menu.length > 0 && <RowMenu items={menu} label="Thao tác khác" />}
                            <IconButton icon={X} label="Đóng" onClick={onClose} />
                        </span>
                    </div>
                    <h2 className={s.panelTitle} id="dh360-panel-title">{issue?.title || 'Chi tiết vấn đề'}</h2>
                    {issue && (primary || secondary.length > 0 || (perms.update && !CLOSED.includes(issue.status))) && (
                        <div className={s.panelActions}>
                            {primary && <Button variant="primary" size="sm" onClick={() => onMove(issue, primary.to)}>{label(primary)}</Button>}
                            {secondary.map(t => (
                                <Button key={t.key} variant="outline" size="sm" onClick={() => onMove(issue, t.to)}>{label(t)}</Button>
                            ))}
                            {perms.update && !CLOSED.includes(issue.status) && (
                                <Button variant="outline" size="sm" icon={Pencil} onClick={() => onEdit(issue)}>Chỉnh sửa</Button>
                            )}
                        </div>
                    )}
                </header>

                <div className={s.panelBody}>
                    {error ? (
                        <ErrorState
                            title={error.status === 404 ? 'Không tìm thấy vấn đề' : 'Không tải được vấn đề'}
                            description={error.status === 404 ? 'Vấn đề đã bị xoá hoặc bạn không có quyền xem.' : error.message}
                            onRetry={error.status === 404 ? undefined : load}
                        />
                    ) : !issue ? (
                        <><SkeletonCard lines={4} /><SkeletonCard lines={3} /></>
                    ) : (
                        <>
                            {issue.statusReason && [ISSUE_STATUS.CANCELLED, ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.NEW].includes(issue.status) && (
                                <div className={s.notice}>
                                    <strong>Lý do {issue.status === ISSUE_STATUS.CANCELLED ? 'huỷ' : 'chuyển trạng thái'}:</strong> {issue.statusReason}
                                </div>
                            )}

                            <section className={s.section} aria-labelledby="dh360-info">
                                <h3 className={s.sectionTitle} id="dh360-info">Thông tin chung</h3>
                                <div className={s.infoGrid}>
                                    <Info label="Khách hàng">
                                        <Link href={`/customers/${issue.customer.id}`}>{issue.customer.name}</Link>
                                        {issue.customer.phone && <> · <a href={`tel:${issue.customer.phone}`}>{formatPhone(issue.customer.phone)}</a></>}
                                    </Info>
                                    <Info label="Dự án / công trình">
                                        {issue.project
                                            ? <Link href={`/projects/${issue.project.id}`}>{issue.project.code} — {issue.project.name}</Link>
                                            : <span className={s.placeholder}>Chưa gắn dự án</span>}
                                    </Info>
                                    <Info label="Khu vực / hạng mục">{issue.area}</Info>
                                    <Info label="Nhóm vấn đề">{ISSUE_CATEGORY_LABELS[issue.category] || issue.category}</Info>
                                    <Info label="Kênh tiếp nhận">{ISSUE_SOURCE_LABELS[issue.source]}</Info>
                                    <Info label="Người phản ánh">
                                        {[issue.reporterName, issue.reporterPhone && formatPhone(issue.reporterPhone)].filter(Boolean).join(' · ')}
                                    </Info>
                                    <Info label="Thời điểm ghi nhận">{formatDateTime(issue.reportedAt)}</Info>
                                    <Info label="Người ghi nhận">{issue.createdByName}</Info>
                                    <Info label="Hạn xử lý"><DueLabel issue={issue} /></Info>
                                    <Info label="Cập nhật gần nhất"><span title={formatDateTime(issue.lastActivityAt)}>{timeAgo(issue.lastActivityAt)}</span></Info>
                                    {issue.resolvedAt && <Info label="Báo xử lý xong">{formatDateTime(issue.resolvedAt)}</Info>}
                                </div>
                            </section>

                            <section className={s.section} aria-labelledby="dh360-desc">
                                <h3 className={s.sectionTitle} id="dh360-desc">Mô tả</h3>
                                <p className={s.prose}>{issue.description}</p>
                            </section>

                            <PeopleSection issue={issue} perms={perms} onChanged={changed} />
                            <ResolutionSection issue={issue} perms={perms} onChanged={changed} />
                            <IssueAttachments issue={issue} perms={perms} rolePerms={rolePerms} me={me} onChanged={changed} />
                            <IssueWorkOrders issue={issue} perms={perms} onChanged={changed} />
                            <IssueTimeline issueId={issue.id} logs={logs} loading={loading} canNote={!!perms.note} onAdded={changed} />
                        </>
                    )}
                </div>
            </aside>

            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={remove}
                title="Xoá vấn đề"
                itemName={issue ? `vấn đề ${issue.code} — ${issue.title}` : ''}
                confirmText="Xoá vấn đề"
            />
        </div>
    );
}
