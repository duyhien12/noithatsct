'use client';
import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Field — bọc label + mô tả + control + lỗi theo đúng chuẩn:
 *  - Label luôn nằm trên control.
 *  - Trường bắt buộc có dấu *.
 *  - Mô tả hỗ trợ nằm dưới label.
 *  - Lỗi nằm dưới control, kèm icon (không chỉ dùng màu để báo lỗi).
 */
export function Field({ label, required, hint, error, htmlFor, children, className = '' }) {
    const autoId = useId();
    const id = htmlFor || autoId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errId = error ? `${id}-err` : undefined;

    const control = typeof children === 'function'
        ? children({
            id,
            'aria-invalid': error ? 'true' : undefined,
            'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined,
        })
        : children;

    return (
        <div className={`ui-field ${className}`.trim()}>
            {label && (
                <label className="ui-label" htmlFor={id}>
                    {label}
                    {required && <span className="ui-label__req" aria-hidden="true">*</span>}
                    {required && <span className="ui-sr-only">(bắt buộc)</span>}
                </label>
            )}
            {hint && <span className="ui-field__hint" id={hintId}>{hint}</span>}
            {control}
            {error && (
                <span className="ui-field__error" id={errId} role="alert">
                    <AlertCircle size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                </span>
            )}
        </div>
    );
}

export const Input = forwardRef(function Input({ invalid, numeric, className = '', ...rest }, ref) {
    return (
        <input
            ref={ref}
            className={`ui-input ${numeric ? 'ui-input--num' : ''} ${className}`.trim()}
            aria-invalid={invalid ? 'true' : undefined}
            {...rest}
        />
    );
});

export const Select = forwardRef(function Select({ invalid, className = '', children, ...rest }, ref) {
    return (
        <select
            ref={ref}
            className={`ui-select ${className}`.trim()}
            aria-invalid={invalid ? 'true' : undefined}
            {...rest}
        >
            {children}
        </select>
    );
});

export const Textarea = forwardRef(function Textarea({ invalid, className = '', ...rest }, ref) {
    return (
        <textarea
            ref={ref}
            className={`ui-textarea ${className}`.trim()}
            aria-invalid={invalid ? 'true' : undefined}
            {...rest}
        />
    );
});

export function Checkbox({ label, className = '', ...rest }) {
    return (
        <label className={`ui-checkbox-row ${className}`.trim()}>
            <input type="checkbox" className="ui-checkbox" {...rest} />
            {label && <span>{label}</span>}
        </label>
    );
}

/** Nhóm các trường trong form dài thành từng section có tiêu đề. */
export function FormSection({ title, description, children }) {
    return (
        <section className="ui-form-section">
            {title && (
                <div>
                    <h3 className="ui-form-section__title">{title}</h3>
                    {description && <p className="ui-caption" style={{ marginTop: 2 }}>{description}</p>}
                </div>
            )}
            {children}
        </section>
    );
}

/** Lưới trường tự xuống 1 cột trên mobile. */
export function FormGrid({ children, className = '' }) {
    return <div className={`ui-form-grid ${className}`.trim()}>{children}</div>;
}

/** Hàng nút Lưu / Hủy — luôn đặt cuối form. */
export function FormActions({ children }) {
    return <div className="ui-form-actions">{children}</div>;
}

export default Field;
