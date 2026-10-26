'use client';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatDate, initials } from '@/lib/format';
import {
    ISSUE_STATUS_LABELS, ISSUE_STATUS_TONES, ISSUE_PRIORITY_LABELS, ISSUE_PRIORITY_TONES, OPEN_STATUSES,
} from '@/lib/customerIssue/constants';
import { isOverdue } from '@/lib/customerIssue/workflow';
import s from './dh360.module.css';

export function IssueStatusBadge({ status, size }) {
    return (
        <Badge tone={ISSUE_STATUS_TONES[status] || 'neutral'} size={size} dot>
            {ISSUE_STATUS_LABELS[status] || status}
        </Badge>
    );
}

export function IssuePriorityBadge({ priority, size = 'sm' }) {
    return (
        <Badge tone={ISSUE_PRIORITY_TONES[priority] || 'neutral'} size={size}>
            {ISSUE_PRIORITY_LABELS[priority] || priority}
        </Badge>
    );
}

const DAY = 24 * 3_600_000;

/** Hạn xử lý: đỏ khi quá hạn, vàng khi còn ≤ 1 ngày (chỉ với vấn đề còn mở). */
export function DueLabel({ issue, withIcon = true }) {
    if (!issue?.dueDate) return <span className={s.metaItem}>Chưa có hạn</span>;
    const open = OPEN_STATUSES.includes(issue.status);
    const overdue = isOverdue(issue);
    const soon = open && !overdue && new Date(issue.dueDate).getTime() - Date.now() <= DAY;
    const cls = overdue ? s.overdue : soon ? s.dueSoon : '';
    return (
        <span className={`${s.metaItem} ${cls}`.trim()} title={overdue ? 'Quá hạn xử lý' : 'Hạn xử lý'}>
            {withIcon && <CalendarClock size={13} aria-hidden="true" />}
            {formatDate(issue.dueDate)}
            {overdue && ' · Quá hạn'}
        </span>
    );
}

export function Avatar({ name }) {
    return <span className={s.avatar} aria-hidden="true">{initials(name) || '?'}</span>;
}
