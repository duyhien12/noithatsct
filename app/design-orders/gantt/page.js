import { redirect } from 'next/navigation';

// Gantt CV Thiết kế đã gộp vào trang CV Thiết kế (nút "Tiến độ") — giữ đường dẫn cũ cho bookmark.
export default function DesignTaskGanttRedirect() {
    redirect('/design-orders/cv?view=gantt');
}
