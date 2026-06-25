export const metadata = {
    title: 'Nội Thất SCT - Chi Nhánh Lào Cai',
    description: 'Hệ thống quản lý kinh doanh & nội thất chi nhánh Lào Cai',
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function LaoCaiLayout({ children }) {
    return (
        <div style={{ margin: 0, padding: 0, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f0fdfa' }}>
            {children}
        </div>
    );
}
