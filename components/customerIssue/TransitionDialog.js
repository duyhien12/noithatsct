'use client';
import { useEffect, useState } from 'react';
import { Modal, Button, Field, Textarea, useToast } from '@/components/ui';
import { ISSUE_STATUS, ISSUE_STATUS_LABELS, TRANSITION_ACTION_LABELS } from '@/lib/customerIssue/constants';
import { getTransitionRule } from '@/lib/customerIssue/workflow';
import { IssueStatusBadge } from './IssueBadges';
import { issueApi } from './api';
import s from './dh360.module.css';

const REASON_LABELS = {
    CANCELLED: 'Lý do huỷ',
    IN_PROGRESS: 'Lý do (chưa đạt / mở lại)',
    NEW: 'Lý do khôi phục',
};

/** Bước chuyển cần hỏi thêm thông tin (lý do, kết quả xử lý) hoặc cần xác nhận lại. */
export function needsDialog(fromStatus, toStatus) {
    const rule = getTransitionRule(fromStatus, toStatus);
    return !!rule && (rule.reason || rule.resolution || toStatus === ISSUE_STATUS.DONE);
}

/**
 * Hộp thoại chuyển trạng thái. Điều kiện (lý do / kết quả xử lý) lấy từ workflow
 * Giai đoạn 2; API /transition kiểm tra lại và trả 409 khi người khác vừa đổi.
 */
export default function TransitionDialog({ issue, toStatus, onClose, onDone }) {
    const toast = useToast();
    const rule = issue && toStatus ? getTransitionRule(issue.status, toStatus) : null;
    const [reason, setReason] = useState('');
    const [resolution, setResolution] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    // Thẻ Kanban/danh sách không mang kết quả xử lý — lấy từ chi tiết khi cần
    useEffect(() => {
        if (!issue || !rule?.resolution) return undefined;
        let cancelled = false;
        if (issue.resolution !== undefined) {
            setResolution(issue.resolution || '');
        } else {
            issueApi.get(issue.id).then(d => { if (!cancelled) setResolution(d.resolution || ''); }).catch(() => {});
        }
        return () => { cancelled = true; };
    }, [issue, rule?.resolution]);

    if (!issue || !rule) return null;
    const title = TRANSITION_ACTION_LABELS[`${issue.status}>${toStatus}`] || ISSUE_STATUS_LABELS[toStatus];

    const submit = async () => {
        const next = {};
        if (rule.reason && !reason.trim()) next.reason = 'Vui lòng nhập lý do';
        if (rule.resolution && !resolution.trim()) next.resolution = 'Cần nhập kết quả xử lý trước khi chuyển sang Chờ xác nhận';
        setErrors(next);
        if (Object.keys(next).length) return;

        setSaving(true);
        try {
            const updated = await issueApi.transition(issue.id, {
                toStatus,
                reason: reason.trim(),
                ...(rule.resolution && { resolution: resolution.trim() }),
            });
            toast.success(`${issue.code}: ${ISSUE_STATUS_LABELS[issue.status]} → ${ISSUE_STATUS_LABELS[toStatus]}.`);
            onDone?.(updated);
        } catch (e) {
            toast.error(e.message);
            if (e.status === 409) onDone?.(null);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={title}
            description={`${issue.code} — ${issue.title}`}
            maxWidth={520}
            closeOnOverlayClick={false}
            footer={(
                <>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Huỷ</Button>
                    <Button
                        variant={toStatus === ISSUE_STATUS.CANCELLED ? 'danger-solid' : 'primary'}
                        loading={saving}
                        onClick={submit}
                    >
                        {title}
                    </Button>
                </>
            )}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <IssueStatusBadge status={issue.status} />
                    <span aria-hidden="true">→</span>
                    <IssueStatusBadge status={toStatus} />
                </div>
                {toStatus === ISSUE_STATUS.DONE && (
                    <p className={s.prose}>Xác nhận khách hàng/quản lý đã đồng ý với kết quả xử lý. Vấn đề sẽ được đóng.</p>
                )}
                {rule.resolution && (
                    <Field label="Kết quả xử lý" required error={errors.resolution} hint="Mô tả việc đã làm để khách hàng/quản lý xác nhận">
                        {props => (
                            <Textarea {...props} rows={5} value={resolution} onChange={e => setResolution(e.target.value)} />
                        )}
                    </Field>
                )}
                {rule.reason && (
                    <Field label={REASON_LABELS[toStatus] || 'Lý do'} required error={errors.reason}>
                        {props => (
                            <Textarea {...props} rows={3} value={reason} onChange={e => setReason(e.target.value)} />
                        )}
                    </Field>
                )}
            </div>
        </Modal>
    );
}
