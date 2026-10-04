// Cột "Đánh giá" của Nhật ký TKKT.
export const JOURNAL_STATUSES = ['Đang làm', 'Hoàn thành', 'Huỷ'];
export const DEFAULT_JOURNAL_STATUS = 'Đang làm';

export const JOURNAL_STATUS_COLORS = {
    'Đang làm':   { text: 'var(--color-warning)', bg: 'var(--color-warning-bg)', br: 'var(--color-warning-br)' },
    'Hoàn thành': { text: 'var(--color-success)', bg: 'var(--color-success-bg)', br: 'var(--color-success-br)' },
    'Huỷ':        { text: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  br: 'var(--color-danger-br)' },
};
