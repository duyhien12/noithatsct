'use client';
import { useEffect, useRef, useCallback, useId } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dùng chung.
 *
 * - Đóng bằng Escape (trừ khi `dismissible = false`).
 * - Focus bị giữ trong modal (không tab ra ngoài), trả focus về chỗ cũ khi đóng.
 * - Bấm ra ngoài chỉ đóng khi `closeOnOverlayClick = true` (mặc định).
 *   Với form quan trọng nên đặt `closeOnOverlayClick = false` để tránh mất dữ liệu.
 * - Trên mobile (<640px) modal tự trượt lên từ đáy; `drawer` = toàn màn hình.
 *
 * Giữ nguyên API cũ: isOpen, onClose, title, children, maxWidth.
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    description,
    footer,
    children,
    maxWidth = 600,
    drawer = false,
    dismissible = true,
    closeOnOverlayClick = true,
    labelledBy,
}) {
    const overlayRef = useRef(null);
    const contentRef = useRef(null);
    const restoreFocusRef = useRef(null);
    const autoId = useId();
    const titleId = labelledBy || `${autoId}-title`;
    const descId = description ? `${autoId}-desc` : undefined;

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape' && dismissible) {
            e.stopPropagation();
            onClose?.();
            return;
        }
        if (e.key !== 'Tab') return;

        const nodes = contentRef.current?.querySelectorAll(FOCUSABLE);
        if (!nodes || nodes.length === 0) {
            e.preventDefault();
            return;
        }
        const list = Array.from(nodes).filter(n => n.offsetParent !== null || n === document.activeElement);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }, [dismissible, onClose]);

    useEffect(() => {
        if (!isOpen) return undefined;

        restoreFocusRef.current = document.activeElement;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const t = setTimeout(() => {
            const target = contentRef.current?.querySelector(FOCUSABLE) || contentRef.current;
            target?.focus?.();
        }, 30);

        return () => {
            clearTimeout(t);
            document.body.style.overflow = prevOverflow;
            const el = restoreFocusRef.current;
            if (el && typeof el.focus === 'function') el.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="ui-overlay"
            onMouseDown={(e) => {
                if (e.target === overlayRef.current && closeOnOverlayClick && dismissible) onClose?.();
            }}
            onKeyDown={handleKeyDown}
        >
            <div
                ref={contentRef}
                className={`ui-modal ${drawer ? 'ui-modal--drawer' : ''}`.trim()}
                style={{ maxWidth }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                aria-label={title ? undefined : 'Hộp thoại'}
                aria-describedby={descId}
                tabIndex={-1}
            >
                <div className="ui-modal__header">
                    <div style={{ minWidth: 0 }}>
                        {title && <h2 className="ui-modal__title" id={titleId}>{title}</h2>}
                        {description && <p className="ui-modal__desc" id={descId}>{description}</p>}
                    </div>
                    {dismissible && (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Đóng"
                            title="Đóng"
                            className="ui-icon-btn"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    )}
                </div>

                <div className="ui-modal__body">{children}</div>

                {footer && <div className="ui-modal__footer">{footer}</div>}
            </div>
        </div>
    );
}
