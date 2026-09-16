'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Lỗi hệ thống (500). Không hiển thị stack trace cho người dùng —
 * chi tiết kỹ thuật chỉ ghi ra console cho lập trình viên.
 */
export default function GlobalError({ error, reset }) {
    if (process.env.NODE_ENV !== 'production') {
        console.error('[HomeERP] Lỗi không bắt được:', error);
    }

    return (
        <div className="ui-page ui-page--narrow" style={{ paddingTop: 48 }}>
            <div className="ui-card">
                <div className="ui-state" role="alert">
                    <span className="ui-state__icon ui-state__icon--danger" aria-hidden="true">
                        <AlertTriangle size={22} />
                    </span>
                    <h1 className="ui-state__title">Hệ thống gặp sự cố</h1>
                    <p className="ui-state__desc">
                        Đã xảy ra lỗi khi hiển thị nội dung này. Bạn có thể thử tải lại;
                        nếu vẫn lỗi, vui lòng báo bộ phận kỹ thuật.
                    </p>
                    {error?.digest && (
                        <p className="ui-caption">Mã sự cố: {error.digest}</p>
                    )}
                    <div className="ui-state__actions">
                        <button type="button" className="ui-btn ui-btn--primary" onClick={() => reset?.()}>
                            <RefreshCw size={16} aria-hidden="true" />
                            Thử lại
                        </button>
                        <Link href="/" className="ui-btn ui-btn--outline">Về Dashboard</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
