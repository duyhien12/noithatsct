'use client';
import { useEffect, useRef, useState, useId } from 'react';
import Link from 'next/link';
import { MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState, ErrorState } from './States';
import { SkeletonTable } from './Skeleton';
import { IconButton } from './Button';

/**
 * Menu ba chấm cho mỗi dòng bảng.
 * items: [{ label, icon, onClick | href, danger, separatorBefore }]
 */
export function RowMenu({ items = [], label = 'Thao tác' }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const ref = useRef(null);
    const btnRef = useRef(null);

    // Dùng position: fixed để menu không bị cắt bởi vùng cuộn của bảng.
    const place = () => {
        const r = btnRef.current?.getBoundingClientRect();
        if (!r) return;
        setPos({ top: r.bottom + 4, right: Math.max(8, window.innerWidth - r.right) });
    };

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        const onScroll = () => setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [open]);

    if (!items.length) return null;

    return (
        <span className="ui-menu-anchor" ref={ref} onClick={(e) => e.stopPropagation()}>
            <IconButton
                ref={btnRef}
                icon={MoreHorizontal}
                label={label}
                size="sm"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => { if (!open) place(); setOpen(v => !v); }}
            />
            {open && (
                <div
                    className="ui-menu"
                    role="menu"
                    style={pos ? { position: 'fixed', top: pos.top, right: pos.right } : undefined}
                >
                    {items.map((item, i) => {
                        const cls = `ui-menu__item ${item.danger ? 'ui-menu__item--danger' : ''}`.trim();
                        const Icon = item.icon;
                        const inner = (
                            <>
                                {Icon && <Icon size={15} aria-hidden="true" />}
                                {item.label}
                            </>
                        );
                        return (
                            <span key={`${item.label}-${i}`}>
                                {item.separatorBefore && <span className="ui-menu__sep" />}
                                {item.href ? (
                                    <Link href={item.href} className={cls} role="menuitem" onClick={() => setOpen(false)}>
                                        {inner}
                                    </Link>
                                ) : (
                                    <button
                                        type="button"
                                        className={cls}
                                        role="menuitem"
                                        onClick={() => { setOpen(false); item.onClick?.(); }}
                                    >
                                        {inner}
                                    </button>
                                )}
                            </span>
                        );
                    })}
                </div>
            )}
        </span>
    );
}

/** Phân trang dùng chung cho bảng. */
export function TablePagination({ pagination, onPageChange }) {
    if (!pagination) return null;
    const { page = 1, totalPages = 1, total = 0, hasNext, hasPrev } = pagination;
    if (totalPages <= 1 && !total) return null;

    return (
        <div className="ui-pagination">
            <span>Tổng {new Intl.NumberFormat('vi-VN').format(total)} bản ghi</span>
            {totalPages > 1 && (
                <div className="ui-pagination__pages">
                    <IconButton
                        icon={ChevronLeft}
                        label="Trang trước"
                        bordered
                        disabled={hasPrev === false || page <= 1}
                        onClick={() => onPageChange?.(page - 1)}
                    />
                    <span className="ui-num" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {page} / {totalPages}
                    </span>
                    <IconButton
                        icon={ChevronRight}
                        label="Trang sau"
                        bordered
                        disabled={hasNext === false || page >= totalPages}
                        onClick={() => onPageChange?.(page + 1)}
                    />
                </div>
            )}
        </div>
    );
}

function alignClass(align) {
    if (align === 'right' || align === 'num') return 'is-num';
    if (align === 'center') return 'is-center';
    return '';
}

/**
 * Bảng dùng chung.
 *
 * columns: [{
 *   key,                  // khóa trường trong row
 *   header,               // tiêu đề cột
 *   align,                // 'left' | 'right' | 'center' | 'num' (num = căn phải + tabular)
 *   width,
 *   render(value, row),   // tùy biến nội dung ô
 *   truncate,             // cắt gọn tên dài + tooltip
 *   nowrap,               // mã / ngày tháng không xuống dòng
 *   strong,
 * }]
 *
 * Hỗ trợ: loading (skeleton), empty state, error state, chọn nhiều dòng,
 * header dính, phân trang, cuộn ngang trong chính vùng bảng.
 */
export default function Table({
    columns = [],
    data,
    getRowId = (row, i) => row?.id ?? i,
    onRowClick,
    rowActions,
    loading = false,
    error = false,
    onRetry,
    emptyTitle = 'Chưa có dữ liệu',
    emptyDescription,
    emptyIcon,
    emptyAction,
    empty,
    selectable = false,
    selectedIds = [],
    onSelectionChange,
    stickyHeader = false,
    pagination,
    onPageChange,
    caption,
    className = '',
}) {
    const selectAllId = useId();
    const rows = Array.isArray(data) ? data : [];
    const colCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

    if (loading) return <SkeletonTable rows={6} columns={Math.max(colCount, 3)} />;
    if (error) return <ErrorState onRetry={onRetry} />;

    if (!rows.length) {
        return empty || (
            <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
            />
        );
    }

    const allSelected = selectable && rows.length > 0
        && rows.every((row, i) => selectedIds.includes(getRowId(row, i)));

    const toggleAll = () => {
        if (!onSelectionChange) return;
        onSelectionChange(allSelected ? [] : rows.map((row, i) => getRowId(row, i)));
    };

    const toggleOne = (id) => {
        if (!onSelectionChange) return;
        onSelectionChange(
            selectedIds.includes(id)
                ? selectedIds.filter(x => x !== id)
                : [...selectedIds, id],
        );
    };

    return (
        <>
            <div className={`ui-table-wrap ${stickyHeader ? 'ui-table-wrap--sticky' : ''} ${className}`.trim()}>
                <table className="ui-table">
                    {caption && <caption className="ui-sr-only">{caption}</caption>}
                    <thead>
                        <tr>
                            {selectable && (
                                <th scope="col" className="ui-table__checkbox">
                                    <input
                                        id={selectAllId}
                                        type="checkbox"
                                        className="ui-checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        aria-label="Chọn tất cả các dòng"
                                    />
                                </th>
                            )}
                            {columns.map((col, i) => (
                                <th
                                    key={col.key ?? i}
                                    scope="col"
                                    className={alignClass(col.align)}
                                    style={col.width ? { width: col.width } : undefined}
                                >
                                    {col.header}
                                </th>
                            ))}
                            {rowActions && <th scope="col" className="is-center" style={{ width: 56 }}>
                                <span className="ui-sr-only">Thao tác</span>
                            </th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, rowIdx) => {
                            const id = getRowId(row, rowIdx);
                            const selected = selectable && selectedIds.includes(id);
                            return (
                                <tr
                                    key={id}
                                    className={[
                                        onRowClick ? 'is-clickable' : '',
                                        selected ? 'is-selected' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    tabIndex={onRowClick ? 0 : undefined}
                                    onKeyDown={onRowClick ? (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onRowClick(row);
                                        }
                                    } : undefined}
                                >
                                    {selectable && (
                                        <td className="ui-table__checkbox" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="ui-checkbox"
                                                checked={selected}
                                                onChange={() => toggleOne(id)}
                                                aria-label={`Chọn dòng ${rowIdx + 1}`}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col, colIdx) => {
                                        const value = col.key ? row[col.key] : undefined;
                                        const content = col.render ? col.render(value, row) : value;
                                        const cls = [
                                            alignClass(col.align),
                                            col.truncate ? 'is-truncate' : '',
                                            col.nowrap ? 'is-nowrap' : '',
                                            col.strong ? 'is-strong' : '',
                                            col.className || '',
                                        ].filter(Boolean).join(' ');
                                        return (
                                            <td
                                                key={col.key ?? colIdx}
                                                className={cls}
                                                title={col.truncate && typeof content === 'string' ? content : undefined}
                                            >
                                                {content}
                                            </td>
                                        );
                                    })}
                                    {rowActions && (
                                        <td className="is-center">
                                            <div className="ui-table__actions">
                                                <RowMenu items={rowActions(row) || []} />
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {pagination && <TablePagination pagination={pagination} onPageChange={onPageChange} />}
        </>
    );
}
