'use client';
import { splitMentionSegments } from '@/lib/mentions';

/** Hiển thị nội dung ghi chú/bình luận với các @tên được tô nổi bật */
export default function MentionText({ text, userNames = [], mentionStyle }) {
    const segments = splitMentionSegments(text, userNames);
    return segments.map((seg, i) => seg.type === 'mention' ? (
        <span key={i} style={{ fontWeight: 700, color: '#2563eb', background: 'rgba(37,99,235,0.1)', borderRadius: 4, padding: '0 3px', ...mentionStyle }}>
            @{seg.value}
        </span>
    ) : (
        <span key={i}>{seg.value}</span>
    ));
}
