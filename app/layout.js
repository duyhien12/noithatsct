import './globals.css';
import Providers from '@/components/Providers';
import AppShell from '@/components/AppShell';

export const metadata = {
    title: 'HomeERP - Quản lý Nội thất & Xây dựng',
    description: 'Hệ thống ERP quản lý công ty nội thất và xây nhà trọn gói',
    other: {
        'zalo-platform-site-verification': 'HiIn3QtiAHPMuOCTekbKIdtA-b2Hl2yCDJWp',
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="vi">
            <body>
                <Providers>
                    <AppShell>{children}</AppShell>
                </Providers>
            </body>
        </html>
    );
}
