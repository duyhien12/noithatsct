'use client';
import { useState } from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

const VARIANTS = {
    danger:  { icon: Trash2,         tone: 'danger',  btn: 'danger-solid' },
    warning: { icon: AlertTriangle,  tone: 'warning', btn: 'primary' },
    info:    { icon: Info,           tone: 'info',    btn: 'primary' },
};

/**
 * Hộp thoại xác nhận dùng chung.
 *
 * Với hành động xóa, luôn ghi rõ ĐỐI TƯỢNG bị xóa qua `itemName`:
 *   <ConfirmDialog ... itemName="khách hàng Nguyễn Văn A" />
 */
export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Xác nhận',
    message,
    itemName,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'danger',
}) {
    const [busy, setBusy] = useState(false);
    const v = VARIANTS[variant] || VARIANTS.danger;
    const Icon = v.icon;

    const handleConfirm = async () => {
        try {
            setBusy(true);
            await onConfirm?.();
            onClose?.();
        } finally {
            setBusy(false);
        }
    };

    const body = message || (itemName
        ? `Bạn có chắc muốn xóa ${itemName}? Hành động này không thể hoàn tác.`
        : 'Bạn có chắc muốn thực hiện hành động này?');

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth={460}
            closeOnOverlayClick={false}
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={busy}>{cancelText}</Button>
                    <Button variant={v.btn} onClick={handleConfirm} loading={busy}>{confirmText}</Button>
                </>
            }
        >
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <span className={`ui-state__icon ui-state__icon--${v.tone === 'info' ? 'warning' : v.tone}`} aria-hidden="true" style={{ width: 40, height: 40, flexShrink: 0 }}>
                    <Icon size={20} />
                </span>
                <p style={{ margin: 0, color: 'var(--color-text)', lineHeight: 'var(--lh-normal)' }}>
                    {body}
                </p>
            </div>
        </Modal>
    );
}
