'use client';
import { useState } from 'react';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

export default function BudgetLockBar({ projectId, budgetStatus, budgetTotal, budgetLockedAt, budgetLockedBy, onLocked, onUnlocked }) {
    const [locking, setLocking] = useState(false);
    const [unlocking, setUnlocking] = useState(false);
    const isLocked = budgetStatus === 'locked';

    const handleLock = async () => {
        if (!confirm('Khóa dự toán? Sau khi khóa, mọi thay đổi cần phiếu điều chỉnh.')) return;
        setLocking(true);
        try {
            const res = await fetch('/api/budget/lock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, lockedBy: 'Admin' }),
            });
            if (res.ok) {
                const data = await res.json();
                onLocked?.(data);
            } else {
                const err = await res.json();
                alert(err.error || 'Lỗi khóa dự toán');
            }
        } catch { alert('Lỗi kết nối'); }
        setLocking(false);
    };

    const handleUnlock = async () => {
        if (!confirm('Mở khóa dự toán? Thao tác này cho phép chỉnh sửa lại dự toán.')) return;
        setUnlocking(true);
        try {
            const res = await fetch('/api/budget/lock', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId }),
            });
            if (res.ok) {
                const data = await res.json();
                onUnlocked?.(data);
            } else {
                const err = await res.json();
                alert(err.error || 'Lỗi mở khóa dự toán');
            }
        } catch { alert('Lỗi kết nối'); }
        setUnlocking(false);
    };

    return (
        <div className="budget-lock-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>{isLocked ? '🔒' : '📝'}</span>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                        Dự toán: <span style={{ color: isLocked ? 'var(--status-success)' : '#f59e0b' }}>{isLocked ? 'Đã khóa' : 'Nháp'}</span>
                    </div>
                    {isLocked && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Khóa bởi {budgetLockedBy || '—'} lúc {budgetLockedAt ? new Date(budgetLockedAt).toLocaleString('vi-VN') : '—'}
                        </div>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {budgetTotal > 0 && (
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tổng dự toán</div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-primary)' }}>{fmt(budgetTotal)}đ</div>
                    </div>
                )}
                {!isLocked && (
                    <button className="btn btn-warning btn-sm" onClick={handleLock} disabled={locking}>
                        {locking ? '⏳' : '🔒'} Khóa dự toán
                    </button>
                )}
                {isLocked && (
                    <button className="btn btn-secondary btn-sm" onClick={handleUnlock} disabled={unlocking}>
                        {unlocking ? '⏳' : '🔓'} Mở khóa
                    </button>
                )}
            </div>
        </div>
    );
}
