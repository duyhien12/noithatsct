'use client';
import { Inbox, AlertTriangle, ShieldOff, SearchX, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * Empty state chuẩn: icon + tiêu đề + mô tả + nút hành động (nếu có quyền).
 * Không bao giờ chỉ hiện dòng chữ "Không có dữ liệu".
 */
export function EmptyState({
    icon: Icon = Inbox,
    title = 'Chưa có dữ liệu',
    description,
    action,
    className = '',
}) {
    return (
        <div className={`ui-state ${className}`.trim()}>
            <span className="ui-state__icon" aria-hidden="true"><Icon size={22} /></span>
            <h3 className="ui-state__title">{title}</h3>
            {description && <p className="ui-state__desc">{description}</p>}
            {action && <div className="ui-state__actions">{action}</div>}
        </div>
    );
}

/** Không tìm thấy kết quả lọc / tìm kiếm. */
export function NoResultsState({ onClear, keyword }) {
    return (
        <EmptyState
            icon={SearchX}
            title="Không tìm thấy kết quả"
            description={keyword
                ? `Không có dữ liệu nào khớp với "${keyword}". Thử từ khóa khác hoặc bỏ bớt bộ lọc.`
                : 'Không có dữ liệu nào khớp với bộ lọc hiện tại.'}
            action={onClear && (
                <Button variant="outline" onClick={onClear}>Xóa bộ lọc</Button>
            )}
        />
    );
}

/**
 * Lỗi tải dữ liệu. Không hiển thị stack trace cho người dùng —
 * chỉ một câu tiếng Việt dễ hiểu và nút Thử lại.
 */
export function ErrorState({
    title = 'Không tải được dữ liệu',
    description = 'Đã xảy ra lỗi khi lấy dữ liệu. Vui lòng thử lại sau ít phút.',
    onRetry,
    action,
    className = '',
}) {
    return (
        <div className={`ui-state ${className}`.trim()} role="alert">
            <span className="ui-state__icon ui-state__icon--danger" aria-hidden="true">
                <AlertTriangle size={22} />
            </span>
            <h3 className="ui-state__title">{title}</h3>
            {description && <p className="ui-state__desc">{description}</p>}
            <div className="ui-state__actions">
                {onRetry && <Button variant="primary" icon={RefreshCw} onClick={onRetry}>Thử lại</Button>}
                {action}
            </div>
        </div>
    );
}

/** Không có quyền truy cập. */
export function ForbiddenState({
    title = 'Bạn không có quyền xem nội dung này',
    description = 'Liên hệ quản trị hệ thống nếu bạn cần được cấp quyền truy cập.',
    action,
}) {
    return (
        <div className="ui-state" role="alert">
            <span className="ui-state__icon ui-state__icon--warning" aria-hidden="true">
                <ShieldOff size={22} />
            </span>
            <h3 className="ui-state__title">{title}</h3>
            {description && <p className="ui-state__desc">{description}</p>}
            <div className="ui-state__actions">
                {action || <Button variant="outline" href="/">Về Dashboard</Button>}
            </div>
        </div>
    );
}

export default EmptyState;
