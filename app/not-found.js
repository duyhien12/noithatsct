import Link from 'next/link';

export const metadata = {
    title: 'Không tìm thấy trang — HomeERP',
};

export default function NotFound() {
    return (
        <div className="ui-page ui-page--narrow" style={{ paddingTop: 48 }}>
            <div className="ui-card">
                <div className="ui-state">
                    <span className="ui-state__icon" aria-hidden="true" style={{ fontSize: 20, fontWeight: 700 }}>
                        404
                    </span>
                    <h1 className="ui-state__title">Không tìm thấy trang</h1>
                    <p className="ui-state__desc">
                        Trang bạn truy cập không tồn tại hoặc đã được di chuyển.
                        Hãy kiểm tra lại đường dẫn hoặc quay về trang tổng quan.
                    </p>
                    <div className="ui-state__actions">
                        <Link href="/" className="ui-btn ui-btn--primary">Về Dashboard</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
