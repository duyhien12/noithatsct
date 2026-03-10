'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange }) {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, total, hasNext, hasPrev } = pagination;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 0', fontSize: 13, color: 'var(--text-muted)',
            gap: 8, flexWrap: 'wrap',
        }}>
            <span style={{ fontSize: 12 }}>Tổng {total} bản ghi</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={!hasPrev}
                    aria-label="Trang trước"
                    style={{
                        padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)', cursor: hasPrev ? 'pointer' : 'not-allowed',
                        opacity: hasPrev ? 1 : 0.4, display: 'flex', alignItems: 'center',
                        minWidth: 40, minHeight: 40, justifyContent: 'center',
                    }}
                >
                    <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>{page} / {totalPages}</span>
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={!hasNext}
                    aria-label="Trang sau"
                    style={{
                        padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)', cursor: hasNext ? 'pointer' : 'not-allowed',
                        opacity: hasNext ? 1 : 0.4, display: 'flex', alignItems: 'center',
                        minWidth: 40, minHeight: 40, justifyContent: 'center',
                    }}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
