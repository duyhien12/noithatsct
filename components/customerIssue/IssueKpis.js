'use client';
import { ListTodo, AlarmClock, Siren, Hourglass, CheckCircle2 } from 'lucide-react';
import { StatCard, StatGrid, SkeletonStats } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import s from './dh360.module.css';

/**
 * 5 KPI của Đồng hành 360. Bấm vào thẻ để lọc nhanh (onPick nhận patch bộ lọc).
 * Số liệu lấy từ GET /api/customer-issues/stats với cùng bộ lọc đang áp dụng.
 */
export default function IssueKpis({ stats, loading, onPick }) {
    if (loading && !stats) return <SkeletonStats count={5} />;
    if (!stats) return null;

    const avg = stats.avgResolutionHours;
    const cards = [
        { key: 'total', label: 'Tổng vấn đề', value: stats.total, icon: ListTodo, note: `${formatNumber(stats.open)} đang mở`, patch: { status: '', due: '', priority: '' } },
        { key: 'overdue', label: 'Quá hạn', value: stats.overdue, icon: AlarmClock, alert: stats.overdue > 0, note: 'Còn mở, đã qua hạn xử lý', patch: { due: 'overdue' } },
        { key: 'urgent', label: 'Khẩn cấp', value: stats.urgentOpen, icon: Siren, alert: stats.urgentOpen > 0, note: 'Ưu tiên khẩn cấp còn mở', patch: { priority: 'URGENT', status: 'OPEN' } },
        { key: 'waiting', label: 'Chờ xác nhận', value: stats.byStatus?.WAITING_CONFIRMATION || 0, icon: Hourglass, note: 'Đã xử lý, chờ khách/quản lý', patch: { status: 'WAITING_CONFIRMATION' } },
        { key: 'done', label: 'Hoàn thành', value: stats.byStatus?.DONE || 0, icon: CheckCircle2, note: `${formatNumber(stats.doneThisMonth)} trong tháng${avg != null ? ` · TB ${formatNumber(avg, { decimals: avg < 10 ? 1 : 0 })} giờ` : ''}`, patch: { status: 'DONE' } },
    ];

    return (
        <StatGrid className={s.kpiGrid}>
            {cards.map(c => (
                <button
                    key={c.key}
                    type="button"
                    onClick={() => onPick?.(c.patch)}
                    className={s.kpiButton}
                    aria-label={`${c.label}: ${c.value}. Bấm để lọc`}
                >
                    <StatCard label={c.label} value={formatNumber(c.value)} icon={c.icon} alert={c.alert} note={c.note} />
                </button>
            ))}
        </StatGrid>
    );
}
