'use client';
import { TablePagination } from './Table';

/** Giữ API cũ, render bằng phân trang dùng chung. */
export default function Pagination({ pagination, onPageChange }) {
    if (!pagination || pagination.totalPages <= 1) return null;
    return <TablePagination pagination={pagination} onPageChange={onPageChange} />;
}
