'use client';
import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 600 }) {
    const overlayRef = useRef(null);
    const contentRef = useRef(null);

    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                const focusable = contentRef.current?.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
                focusable?.focus();
            }, 50);
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className="modal-overlay"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div
                ref={contentRef}
                className="modal-content"
                style={{ maxWidth }}
            >
                <div className="modal-header">
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{title}</h3>
                    <button
                        onClick={onClose}
                        aria-label="Đóng"
                        className="modal-close"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}
