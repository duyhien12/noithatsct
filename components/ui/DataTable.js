'use client';
import Table from './Table';

/**
 * Giữ nguyên API cũ (columns/data/onRowClick/loading/emptyMessage) nhưng
 * render bằng component Table dùng chung — có skeleton, empty state,
 * căn phải cho số tiền và cuộn ngang trong vùng bảng.
 */
export default function DataTable({
    columns = [],
    data,
    onRowClick,
    loading,
    emptyMessage = 'Không có dữ liệu',
    emptyDescription,
    emptyAction,
    stickyHeader,
    pagination,
    onPageChange,
}) {
    return (
        <Table
            columns={columns}
            data={data}
            onRowClick={onRowClick}
            loading={loading}
            emptyTitle={emptyMessage}
            emptyDescription={emptyDescription}
            emptyAction={emptyAction}
            stickyHeader={stickyHeader}
            pagination={pagination}
            onPageChange={onPageChange}
        />
    );
}
