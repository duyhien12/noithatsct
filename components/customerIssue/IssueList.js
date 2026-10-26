'use client';
import { Eye, Pencil, Inbox } from 'lucide-react';
import { Table } from '@/components/ui';
import { timeAgo, formatDateTime } from '@/lib/format';
import { ISSUE_CATEGORY_LABELS, ISSUE_STATUS_LABELS, TRANSITION_ACTION_LABELS, ISSUE_STATUS } from '@/lib/customerIssue/constants';
import { allowedTargets } from '@/lib/customerIssue/workflow';
import { IssueStatusBadge, IssuePriorityBadge, DueLabel } from './IssueBadges';
import s from './dh360.module.css';

const CLOSED = [ISSUE_STATUS.DONE, ISSUE_STATUS.CANCELLED];

/** Chế độ Danh sách — dùng Table chung, thao tác nằm trong menu ba chấm. */
export default function IssueList({
    rows, loading, error, onRetry, pagination, onPageChange, permsFor, onOpen, onEdit, onMove,
    hideCustomer, hideProject, empty,
}) {
    const columns = [
        { key: 'code', header: 'Mã', nowrap: true, strong: true },
        { key: 'status', header: 'Trạng thái', nowrap: true, render: v => <IssueStatusBadge status={v} size="sm" /> },
        {
            key: 'title', header: 'Nội dung vấn đề',
            render: (_, r) => (
                <div style={{ minWidth: 180 }}>
                    <div className={s.listTitle} title={r.title}>{r.title}</div>
                    <div className={s.listDesc} title={r.description}>{r.description}</div>
                </div>
            ),
        },
        { key: 'area', header: 'Khu vực/hạng mục', truncate: true, render: v => v || '—' },
        { key: 'category', header: 'Nhóm vấn đề', nowrap: true, render: v => ISSUE_CATEGORY_LABELS[v] || v },
        !(hideCustomer && hideProject) && {
            key: 'customer', header: hideCustomer ? 'Dự án' : 'Khách hàng / Dự án',
            render: (_, r) => (
                <div style={{ minWidth: 140 }}>
                    {!hideCustomer && <div className={s.listTitle} style={{ fontWeight: 500 }}>{r.customer?.name}</div>}
                    {!hideProject && <div className={s.listDesc}>{r.project?.name || 'Chưa gắn dự án'}</div>}
                </div>
            ),
        },
        { key: 'priority', header: 'Ưu tiên', nowrap: true, render: v => <IssuePriorityBadge priority={v} /> },
        { key: 'assigneeName', header: 'Người phụ trách', nowrap: true, render: v => v || <span className="ui-muted">Chưa phân công</span> },
        { key: 'dueDate', header: 'Hạn xử lý', nowrap: true, render: (_, r) => <DueLabel issue={r} withIcon={false} /> },
        {
            key: 'lastActivityAt', header: 'Cập nhật gần nhất', nowrap: true,
            render: v => <span title={formatDateTime(v)}>{timeAgo(v)}</span>,
        },
    ].filter(Boolean);

    const rowActions = (r) => {
        const perms = permsFor(r);
        const items = [{ label: 'Xem chi tiết', icon: Eye, onClick: () => onOpen(r) }];
        if (perms.update && !CLOSED.includes(r.status)) items.push({ label: 'Chỉnh sửa', icon: Pencil, onClick: () => onEdit(r) });
        allowedTargets(r.status, perms).forEach((to, i) => items.push({
            label: TRANSITION_ACTION_LABELS[`${r.status}>${to}`] || ISSUE_STATUS_LABELS[to],
            onClick: () => onMove(r, to),
            danger: to === ISSUE_STATUS.CANCELLED,
            separatorBefore: i === 0 || to === ISSUE_STATUS.CANCELLED,
        }));
        return items;
    };

    return (
        <Table
            columns={columns}
            data={rows}
            loading={loading}
            error={error}
            onRetry={onRetry}
            onRowClick={onOpen}
            rowActions={rowActions}
            pagination={pagination}
            onPageChange={onPageChange}
            stickyHeader
            caption="Danh sách vấn đề Đồng hành 360"
            empty={empty}
            emptyIcon={Inbox}
            emptyTitle="Chưa có vấn đề nào"
        />
    );
}
