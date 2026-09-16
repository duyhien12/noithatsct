import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button, { IconButton } from '@/components/ui/Button';
import Badge, { toneOf } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Form';
import Table from '@/components/ui/Table';
import PageHeader from '@/components/ui/PageHeader';
import { EmptyState, ErrorState } from '@/components/ui/States';

vi.mock('next/link', () => ({
    default: ({ children, href, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));

describe('Button', () => {
    it('khóa nút và báo aria-busy khi đang loading', () => {
        render(<Button variant="primary" loading>Lưu</Button>);
        const btn = screen.getByRole('button', { name: /Lưu/ });
        expect(btn).toBeDisabled();
        expect(btn.getAttribute('aria-busy')).toBe('true');
    });

    it('áp đúng class biến thể', () => {
        render(<Button variant="danger">Xóa</Button>);
        expect(screen.getByRole('button').className).toContain('ui-btn--danger');
    });
});

describe('IconButton', () => {
    it('luôn có aria-label để đọc màn hình hiểu được', () => {
        render(<IconButton label="Đóng" />);
        expect(screen.getByRole('button', { name: 'Đóng' })).toBeTruthy();
    });
});

describe('Badge', () => {
    it('cùng một trạng thái cho ra cùng một tone', () => {
        expect(toneOf('Hoàn thành')).toBe('success');
        expect(toneOf('Quá hạn')).toBe('danger');
        expect(toneOf('Chờ duyệt')).toBe('warning');
        expect(toneOf('Đang thi công')).toBe('info');
        expect(toneOf('Nháp')).toBe('neutral');
    });

    it('trạng thái lạ rơi về tone trung tính', () => {
        render(<Badge status="Trạng thái lạ" />);
        expect(screen.getByText('Trạng thái lạ').className).toContain('ui-badge--neutral');
    });
});

describe('Field', () => {
    it('nối label, mô tả và lỗi vào control', () => {
        render(
            <Field label="Tên mẫu" required hint="Tối đa 80 ký tự" error="Vui lòng nhập tên mẫu.">
                {({ id, ...a11y }) => <Input id={id} {...a11y} />}
            </Field>,
        );
        const input = screen.getByLabelText(/Tên mẫu/);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(input.getAttribute('aria-describedby')).toContain('-err');
        expect(screen.getByRole('alert').textContent).toContain('Vui lòng nhập tên mẫu.');
    });
});

describe('Table', () => {
    const columns = [
        { key: 'code', header: 'Mã' },
        { key: 'amount', header: 'Số tiền', align: 'num' },
    ];

    it('hiện empty state thay vì bảng rỗng', () => {
        render(<Table columns={columns} data={[]} emptyTitle="Chưa có dữ liệu" emptyDescription="Thêm bản ghi đầu tiên." />);
        expect(screen.getByText('Chưa có dữ liệu')).toBeTruthy();
        expect(screen.getByText('Thêm bản ghi đầu tiên.')).toBeTruthy();
    });

    it('hiện error state kèm nút Thử lại', () => {
        const onRetry = vi.fn();
        render(<Table columns={columns} data={[]} error onRetry={onRetry} />);
        fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
        expect(onRetry).toHaveBeenCalled();
    });

    it('căn phải cột số tiền', () => {
        render(<Table columns={columns} data={[{ id: 1, code: 'DA01', amount: '1.000 ₫' }]} />);
        expect(screen.getByText('1.000 ₫').className).toContain('is-num');
    });

    it('chọn nhiều dòng qua checkbox', () => {
        const onSelectionChange = vi.fn();
        render(
            <Table
                columns={columns}
                data={[{ id: 1, code: 'DA01' }, { id: 2, code: 'DA02' }]}
                selectable
                selectedIds={[]}
                onSelectionChange={onSelectionChange}
            />,
        );
        fireEvent.click(screen.getByLabelText('Chọn tất cả các dòng'));
        expect(onSelectionChange).toHaveBeenCalledWith([1, 2]);
    });
});

describe('PageHeader', () => {
    it('dựng breadcrumb và tiêu đề h1', () => {
        render(
            <PageHeader
                title="Khách hàng"
                description="Quản lý khách hàng"
                breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Khách hàng' }]}
            />,
        );
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Khách hàng');
        expect(screen.getByRole('navigation', { name: 'Đường dẫn' })).toBeTruthy();
        expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeTruthy();
    });
});

describe('Trạng thái chung', () => {
    it('empty state có tiêu đề, mô tả và hành động', () => {
        render(
            <EmptyState
                title="Chưa có khách hàng"
                description="Thêm khách hàng đầu tiên để bắt đầu."
                action={<Button variant="primary">Thêm khách hàng</Button>}
            />,
        );
        expect(screen.getByText('Chưa có khách hàng')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Thêm khách hàng' })).toBeTruthy();
    });

    it('error state không lộ thông tin kỹ thuật', () => {
        render(<ErrorState />);
        const alert = screen.getByRole('alert');
        expect(alert.textContent).toContain('Không tải được dữ liệu');
        expect(alert.textContent).not.toContain('Error');
    });
});
