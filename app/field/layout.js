export const metadata = {
    title: 'Field App - Cập nhật công trình',
    description: 'Ứng dụng cập nhật tiến độ xưởng & công trình nội thất',
    manifest: '/field-manifest.json',
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#0f172a',
};

export default function FieldLayout({ children }) {
    return (
        <div style={{ margin: 0, padding: 0, background: '#0f172a', minHeight: '100vh', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', WebkitFontSmoothing: 'antialiased' }}>
            {children}
        </div>
    );
}
