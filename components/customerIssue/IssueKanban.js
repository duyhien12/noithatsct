'use client';
import { useState } from 'react';
import { Wrench, Paperclip, UserRound } from 'lucide-react';
import { RowMenu } from '@/components/ui';
import { TRANSITION_ACTION_LABELS, ISSUE_STATUS_LABELS } from '@/lib/customerIssue/constants';
import { allowedTargets, boardColumnOf, dropTargetStatus, dropRejectReason } from '@/lib/customerIssue/workflow';
import { IssuePriorityBadge, IssueStatusBadge, DueLabel, Avatar } from './IssueBadges';
import s from './dh360.module.css';

const COLUMN_HINTS = {
    COORDINATION: 'Tự động: đang xử lý và còn phiếu công việc chưa hoàn thành',
    CLOSING: 'Thả vào đây khi đã xử lý xong (cần kết quả xử lý)',
};

export function IssueCard({ issue, selected, permsFor, onOpen, onMove, draggable, onDragStart, onDragEnd, dragging, showStatus, ...rest }) {
    const perms = permsFor(issue);
    const moves = allowedTargets(issue.status, perms).map(to => ({
        label: TRANSITION_ACTION_LABELS[`${issue.status}>${to}`] || ISSUE_STATUS_LABELS[to],
        onClick: () => onMove(issue, to),
        danger: to === 'CANCELLED',
        separatorBefore: to === 'CANCELLED',
    }));
    const woTotal = issue._count?.workOrders || 0;
    const woOpen = issue.openWorkOrderCount || 0;
    const files = issue._count?.attachments || 0;
    const where = [issue.customer?.name, issue.project?.name].filter(Boolean).join(' · ');

    return (
        <div
            className={[s.card, selected ? s.cardSelected : '', dragging ? s.cardDragging : ''].filter(Boolean).join(' ')}
            {...rest}
            role="button"
            tabIndex={0}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => onOpen(issue)}
            onKeyDown={e => {
                if (e.target !== e.currentTarget) return; // phím trong menu chuyển trạng thái
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(issue); }
            }}
            aria-label={`${issue.code}: ${issue.title}`}
        >
            <div className={s.cardTop}>
                <span className={s.code}>{issue.code}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {showStatus && <IssueStatusBadge status={issue.status} size="sm" />}
                    <IssuePriorityBadge priority={issue.priority} />
                    {moves.length > 0 && <RowMenu items={moves} label={`Chuyển trạng thái ${issue.code}`} />}
                </span>
            </div>
            <div className={s.cardTitle}>{issue.title}</div>
            {where && <div className={s.cardSub} title={where}>{where}</div>}
            <div className={s.cardFoot}>
                <span className={s.metaItem} title="Người phụ trách">
                    {issue.assigneeName
                        ? <><Avatar name={issue.assigneeName} />{issue.assigneeName}</>
                        : <><UserRound size={13} aria-hidden="true" />Chưa phân công</>}
                </span>
                <DueLabel issue={issue} />
                <span className={s.metaItem} title={`${woTotal} phiếu công việc${woOpen ? `, ${woOpen} chưa hoàn thành` : ''}`}>
                    <Wrench size={13} aria-hidden="true" />{woOpen ? `${woOpen}/${woTotal}` : woTotal}
                </span>
                <span className={s.metaItem} title={`${files} tệp đính kèm`}>
                    <Paperclip size={13} aria-hidden="true" />{files}
                </span>
            </div>
        </div>
    );
}

/**
 * Kanban 4 cột (KANBAN_BOARD). Thả vào cột workflow + quyền cho phép (dropTargetStatus)
 * thì gọi onMove; thả sai thì onReject(lý do) và thẻ ở nguyên cột cũ.
 * Server vẫn kiểm tra lại toàn bộ khi chuyển trạng thái.
 */
export default function IssueKanban({ columns, permsFor, selectedId, onOpen, onMove, onReject }) {
    const [dragging, setDragging] = useState(null);
    const [over, setOver] = useState(null);
    const dragId = dragging?.id;

    const targetFor = (columnKey) => (dragging ? dropTargetStatus(dragging, columnKey, permsFor(dragging)) : null);

    return (
        <div className={s.board}>
            {columns.map(col => {
                const target = dragId ? targetFor(col.key) : null;
                const blocked = dragId && !target && dragging && boardColumnOf(dragging) !== col.key;
                return (
                    <section
                        key={col.key}
                        data-column={col.key}
                        className={[s.column, over === col.key && target ? s.columnDrop : '', blocked ? s.columnBlocked : ''].filter(Boolean).join(' ')}
                        aria-label={`${col.label}: ${col.total} vấn đề`}
                        onDragOver={e => {
                            // Nhận cả cột không hợp lệ (dropEffect 'none' sẽ chặn sự kiện drop)
                            // để báo lý do khi thả; cột bị chặn đã được tô màu riêng.
                            if (!dragging) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (over !== col.key) setOver(col.key);
                        }}
                        onDragLeave={e => {
                            if (!e.currentTarget.contains(e.relatedTarget)) setOver(null);
                        }}
                        onDrop={e => {
                            e.preventDefault();
                            const issue = dragging;
                            setOver(null);
                            setDragging(null);
                            if (!issue || boardColumnOf(issue) === col.key) return;
                            const to = targetFor(col.key);
                            if (to) onMove(issue, to);
                            else {
                                const reason = dropRejectReason(issue, col.key, permsFor(issue));
                                if (reason) onReject?.(reason);
                            }
                        }}
                    >
                        <header className={s.columnHead}>
                            <span className={s.columnTitle}>{col.label}</span>
                            <span className={s.columnCount}>{col.total}</span>
                        </header>
                        {COLUMN_HINTS[col.key] && <div className={s.columnHint}>{COLUMN_HINTS[col.key]}</div>}
                        <div className={s.columnBody}>
                            {col.items.length === 0 && <div className={s.columnEmpty}>Không có vấn đề</div>}
                            {col.items.map(issue => (
                                <IssueCard
                                    key={issue.id}
                                    issue={issue}
                                    selected={issue.id === selectedId}
                                    permsFor={permsFor}
                                    onOpen={onOpen}
                                    onMove={onMove}
                                    showStatus={col.statuses.length > 1}
                                    draggable
                                    dragging={dragId === issue.id}
                                    data-issue-id={issue.id}
                                    onDragStart={e => {
                                        setDragging(issue);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', issue.id);
                                    }}
                                    onDragEnd={() => { setDragging(null); setOver(null); }}
                                />
                            ))}
                            {col.total > col.items.length && (
                                <div className={s.columnMore}>
                                    Đang hiện {col.items.length}/{col.total} — dùng bộ lọc hoặc chế độ Danh sách để xem thêm
                                </div>
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
