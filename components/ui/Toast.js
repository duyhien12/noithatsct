'use client';
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const CONFIG = {
    success: { Icon: CheckCircle2,   color: 'var(--color-success)', defaultTitle: 'Thành công' },
    error:   { Icon: XCircle,        color: 'var(--color-danger)',  defaultTitle: 'Không thực hiện được' },
    warning: { Icon: AlertTriangle,  color: 'var(--color-warning)', defaultTitle: 'Cảnh báo' },
    info:    { Icon: Info,           color: 'var(--color-info)',    defaultTitle: 'Thông tin' },
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000, title) => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, message, type, title }]);
        if (duration > 0) {
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
        }
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useMemo(() => ({
        success: (msg, title) => addToast(msg, 'success', 4000, title),
        error:   (msg, title) => addToast(msg, 'error', 6000, title),
        warning: (msg, title) => addToast(msg, 'warning', 5000, title),
        info:    (msg, title) => addToast(msg, 'info', 4000, title),
        dismiss: removeToast,
    }), [addToast, removeToast]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="ui-toasts" aria-live="polite" aria-atomic="false">
                {toasts.map(t => {
                    const cfg = CONFIG[t.type] || CONFIG.info;
                    const { Icon } = cfg;
                    return (
                        <div
                            key={t.id}
                            className={`ui-toast ui-toast--${t.type}`}
                            role={t.type === 'error' ? 'alert' : 'status'}
                        >
                            <span className="ui-toast__icon" style={{ color: cfg.color }} aria-hidden="true">
                                <Icon size={18} />
                            </span>
                            <div className="ui-toast__body">
                                <div className="ui-toast__title">{t.title || cfg.defaultTitle}</div>
                                {t.message && <div className="ui-toast__msg">{t.message}</div>}
                            </div>
                            <button
                                type="button"
                                className="ui-icon-btn ui-icon-btn--sm"
                                onClick={() => removeToast(t.id)}
                                aria-label="Đóng thông báo"
                                title="Đóng"
                            >
                                <X size={14} aria-hidden="true" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        return {
            success: console.log,
            error: console.error,
            warning: console.warn,
            info: console.log,
            dismiss: () => {},
        };
    }
    return ctx;
}
