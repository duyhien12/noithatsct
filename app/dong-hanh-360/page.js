'use client';
import IssueWorkspace from '@/components/customerIssue/IssueWorkspace';

// Đồng hành 360 — theo dõi phản ánh của khách hàng (nhóm menu Dự án & Thi công).
// Mở thẳng một vấn đề bằng ?issue=ID (link trong thông báo).
export default function DongHanh360Page() {
    return <IssueWorkspace variant="page" />;
}
