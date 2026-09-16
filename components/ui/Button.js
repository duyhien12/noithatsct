'use client';
import { forwardRef } from 'react';
import Link from 'next/link';

/**
 * Button dùng chung — 6 biến thể thống nhất toàn hệ thống.
 *
 * variant: primary | secondary | outline | ghost | danger | danger-solid
 * size:    sm | md (mặc định) | lg
 *
 * Mỗi màn hình chỉ nên có MỘT nút primary.
 * Khi loading = true, nút tự khóa để tránh bấm lặp.
 */
const Button = forwardRef(function Button(
    {
        variant = 'secondary',
        size = 'md',
        icon: Icon,
        iconRight: IconRight,
        loading = false,
        disabled = false,
        block = false,
        href,
        type = 'button',
        className = '',
        children,
        ...rest
    },
    ref,
) {
    const classes = [
        'ui-btn',
        `ui-btn--${variant}`,
        size !== 'md' ? `ui-btn--${size}` : '',
        block ? 'ui-btn--block' : '',
        loading ? 'is-loading' : '',
        className,
    ].filter(Boolean).join(' ');

    const iconSize = size === 'sm' ? 14 : 16;

    const content = (
        <>
            {loading
                ? <span className="ui-spinner" aria-hidden="true" />
                : Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
            {children}
            {!loading && IconRight ? <IconRight size={iconSize} aria-hidden="true" /> : null}
        </>
    );

    if (href && !disabled && !loading) {
        return (
            <Link ref={ref} href={href} className={classes} {...rest}>
                {content}
            </Link>
        );
    }

    return (
        <button
            ref={ref}
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {content}
        </button>
    );
});

/**
 * Nút chỉ có icon — BẮT BUỘC truyền `label` để làm aria-label + tooltip.
 */
export const IconButton = forwardRef(function IconButton(
    { icon: Icon, label, size = 'md', bordered = false, disabled = false, href, className = '', ...rest },
    ref,
) {
    const classes = [
        'ui-icon-btn',
        size === 'sm' ? 'ui-icon-btn--sm' : '',
        bordered ? 'ui-icon-btn--bordered' : '',
        className,
    ].filter(Boolean).join(' ');

    const inner = Icon ? <Icon size={size === 'sm' ? 14 : 18} aria-hidden="true" /> : null;

    if (href && !disabled) {
        return (
            <Link ref={ref} href={href} className={classes} title={label} aria-label={label} {...rest}>
                {inner}
            </Link>
        );
    }

    return (
        <button
            ref={ref}
            type="button"
            className={classes}
            title={label}
            aria-label={label}
            disabled={disabled}
            {...rest}
        >
            {inner}
        </button>
    );
});

export default Button;
