'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Textarea, Skeleton, useToast } from '@/components/ui';
import { formatDateTime, timeAgo } from '@/lib/format';
import { LOG_ACTION, LOG_ACTION_LABELS, ISSUE_STATUS_LABELS, ISSUE_FIELD_LABELS } from '@/lib/customerIssue/constants';
import { issueApi } from './api';
import s from './dh360.module.css';

function parseMeta(raw) {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
}

function describe(log) {
    if (log.action === LOG_ACTION.STATUS_CHANGED && log.toStatus) {
        const from = log.fromStatus ? `${ISSUE_STATUS_LABELS[log.fromStatus] || log.fromStatus} → ` : '';
        return `${from}${ISSUE_STATUS_LABELS[log.toStatus] || log.toStatus}`;
    }
    if (log.action === LOG_ACTION.UPDATED) {
        const keys = Object.keys(parseMeta(log.meta)?.changes || {});
        const names = (keys.length ? keys : (log.message || '').split(', ')).map(k => ISSUE_FIELD_LABELS[k] || k);
        return names.filter(Boolean).join(', ');
    }
    return '';
}

/** Nhật ký hoạt động — chỉ đọc; người có quyền `note` thêm được ghi chú. */
export default function IssueTimeline({ issueId, logs, loading, canNote, onAdded }) {
    const toast = useToast();
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    const add = async () => {
        if (!note.trim()) return;
        setSaving(true);
        try {
            await issueApi.addNote(issueId, note.trim());
            setNote('');
            onAdded?.();
        } catch (e) {
            toast.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={s.section} aria-labelledby="dh360-logs">
            <h3 className={s.sectionTitle} id="dh360-logs">Nhật ký hoạt động</h3>
            {canNote && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <Textarea
                        rows={2}
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Thêm ghi chú (trao đổi với khách, tiến triển xử lý…)"
                        aria-label="Nội dung ghi chú"
                        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) add(); }}
                    />
                    <div className="ui-row ui-row--end">
                        <Button variant="secondary" size="sm" icon={Send} loading={saving} disabled={!note.trim()} onClick={add}>Ghi chú</Button>
                    </div>
                </div>
            )}
            {loading && !logs ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden="true">
                    <Skeleton height={12} width="70%" /><Skeleton height={12} width="55%" /><Skeleton height={12} width="62%" />
                </div>
            ) : (
                <ol className={s.timeline}>
                    {(logs || []).map(log => {
                        const detail = describe(log);
                        const dot = log.action === LOG_ACTION.STATUS_CHANGED ? s.logDotStatus : log.action === LOG_ACTION.NOTE ? s.logDotNote : '';
                        const showMessage = log.message && log.action !== LOG_ACTION.UPDATED;
                        return (
                            <li key={log.id} className={s.logItem}>
                                <span className={`${s.logDot} ${dot}`.trim()} aria-hidden="true" />
                                <div className={s.logBody}>
                                    <div className={s.logHead}>
                                        <strong>{log.actorName || 'Hệ thống'}</strong> · {LOG_ACTION_LABELS[log.action] || log.action}
                                        {detail && <>: {detail}</>}
                                    </div>
                                    {showMessage && <p className={s.logMsg}>{log.message}</p>}
                                    <span className={s.logTime} title={formatDateTime(log.createdAt)}>{timeAgo(log.createdAt)}</span>
                                </div>
                            </li>
                        );
                    })}
                    {logs && !logs.length && <li className={s.placeholder}>Chưa có hoạt động</li>}
                </ol>
            )}
        </section>
    );
}
