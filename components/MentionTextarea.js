'use client';
import { useState, useRef, useMemo } from 'react';
import { normalizeForSearch } from '@/lib/mentions';

/**
 * Textarea hỗ trợ @tag tên người trong công ty với dropdown gợi ý.
 * Props giống <textarea> thông thường (value, onChange, onKeyDown, placeholder, rows, style)
 * cộng thêm `users`: [{ id, name }].
 */
export default function MentionTextarea({
    value,
    onChange,
    onKeyDown,
    onBlur,
    users = [],
    placeholder,
    rows = 2,
    style,
    containerStyle,
    textareaRef: externalRef,
    className = 'form-input',
    autoFocus = false,
}) {
    const innerRef = useRef(null);
    const taRef = externalRef || innerRef;
    const [query, setQuery] = useState(null); // null = dropdown đóng; string = đang gõ @...
    const [mentionStart, setMentionStart] = useState(-1);
    const [activeIdx, setActiveIdx] = useState(0);

    const matches = useMemo(() => {
        if (query === null) return [];
        const q = normalizeForSearch(query);
        return users
            .filter(u => u.name && normalizeForSearch(u.name).includes(q))
            .slice(0, 6);
    }, [query, users]);

    const closeDropdown = () => { setQuery(null); setMentionStart(-1); setActiveIdx(0); };

    const detectMention = (text, caret) => {
        const upto = text.slice(0, caret);
        const at = upto.lastIndexOf('@');
        if (at === -1) return closeDropdown();
        const before = upto[at - 1];
        if (before && /[\p{L}\p{N}_]/u.test(before)) return closeDropdown();
        const fragment = upto.slice(at + 1);
        if (/[\s\n]/.test(fragment) || fragment.length > 40) return closeDropdown();
        setQuery(fragment);
        setMentionStart(at);
        setActiveIdx(0);
    };

    const handleChange = (e) => {
        onChange(e);
        detectMention(e.target.value, e.target.selectionStart);
    };

    const selectUser = (name) => {
        const ta = taRef.current;
        if (!ta || mentionStart < 0) return;
        const before = value.slice(0, mentionStart);
        const caret = ta.selectionStart;
        const after = value.slice(caret);
        const next = `${before}@${name} ${after}`;
        onChange({ target: { value: next } });
        closeDropdown();
        requestAnimationFrame(() => {
            const pos = before.length + name.length + 2;
            ta.focus();
            ta.setSelectionRange(pos, pos);
        });
    };

    const handleKeyDown = (e) => {
        if (query !== null && matches.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % matches.length); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i - 1 + matches.length) % matches.length); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selectUser(matches[activeIdx].name); return; }
            if (e.key === 'Escape') { e.preventDefault(); closeDropdown(); return; }
        }
        onKeyDown?.(e);
    };

    return (
        <div style={{ position: 'relative', ...containerStyle }}>
            <textarea
                ref={taRef}
                className={className}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onBlur={e => { setTimeout(closeDropdown, 150); onBlur?.(e); }}
                placeholder={placeholder}
                rows={rows}
                style={style}
                autoFocus={autoFocus}
            />
            {query !== null && matches.length > 0 && (
                <div style={{
                    position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 50,
                    background: 'var(--card-bg, #fff)', border: '1px solid var(--border-color, #e5e7eb)',
                    borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.14)', minWidth: 200, maxWidth: 280,
                    overflow: 'hidden',
                }}>
                    {matches.map((u, i) => (
                        <button
                            type="button"
                            key={u.id}
                            onMouseDown={e => { e.preventDefault(); selectUser(u.name); }}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                                background: i === activeIdx ? 'var(--hover-bg, #f3f4f6)' : 'none',
                                border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)',
                                fontFamily: 'inherit',
                            }}
                        >
                            @{u.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
