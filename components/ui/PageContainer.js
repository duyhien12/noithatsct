'use client';

/**
 * Khung nội dung chuẩn của một trang.
 * - Giới hạn chiều rộng hợp lý (mặc định 1600px).
 * - Padding do `.page-content` trong globals.css lo (24px desktop / 16px mobile).
 * - Các section cách nhau 24px.
 *
 * width: 'default' | 'narrow' (960px, dùng cho form) | 'full'
 */
export default function PageContainer({ width = 'default', className = '', children, ...rest }) {
    const modifier = width === 'narrow' ? 'ui-page--narrow' : width === 'full' ? 'ui-page--full' : '';
    return (
        <div className={`ui-page ${modifier} ${className}`.trim()} {...rest}>
            {children}
        </div>
    );
}

/** Nhóm các khối nội dung cách đều nhau 24px. */
export function Stack({ gap, className = '', children, ...rest }) {
    return (
        <div className={`ui-stack ${className}`.trim()} style={gap ? { gap } : undefined} {...rest}>
            {children}
        </div>
    );
}
