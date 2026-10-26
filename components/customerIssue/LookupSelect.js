'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Input, IconButton } from '@/components/ui';
import { issueApi } from './api';
import s from './dh360.module.css';

const FORMATTERS = {
    customers: c => ({ label: c.name, sub: [c.code, c.phone].filter(Boolean).join(' · ') }),
    projects: p => ({ label: p.name, sub: [p.code, p.customer?.name].filter(Boolean).join(' · ') }),
    users: u => ({ label: u.name, sub: [u.department].filter(Boolean).join(' · ') }),
    workOrders: w => ({ label: `${w.code} — ${w.title}`, sub: [w.status, w.assignee].filter(Boolean).join(' · ') }),
};

/**
 * Ô chọn có tìm kiếm, lấy dữ liệu từ /api/customer-issues/lookups.
 * value: { id, label, sub? } | null — onChange nhận (option | null, rawItem).
 * locked: hiện giá trị cố định, không cho đổi (VD trong tab Khách hàng).
 */
export default function LookupSelect({
    type, params, value, onChange, placeholder = 'Gõ để tìm...', locked = false,
    disabled = false, exclude = [], id, invalid, ...rest
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const wrapRef = useRef(null);
    const listId = useId();
    const paramsKey = JSON.stringify(params || {});

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await issueApi.lookup(type, { ...JSON.parse(paramsKey), search: query });
                if (!cancelled) { setItems(res.data || []); setActive(0); }
            } catch {
                if (!cancelled) setItems([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [open, query, type, paramsKey]);

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const format = FORMATTERS[type] || (x => ({ label: x.name || x.id }));
    const visible = items.filter(x => !exclude.includes(x.id));

    const pick = (item) => {
        const f = format(item);
        onChange?.({ id: item.id, label: f.label, sub: f.sub }, item);
        setOpen(false);
        setQuery('');
    };

    if (value && (locked || !open)) {
        return (
            <div className={`${s.lookupSelected} ${locked ? s.lookupSelectedLocked : ''}`.trim()} id={id}>
                <span title={value.label}>{value.label}{value.sub ? ` · ${value.sub}` : ''}</span>
                {!locked && !disabled && (
                    <IconButton icon={X} size="sm" label="Bỏ chọn" onClick={() => onChange?.(null)} />
                )}
            </div>
        );
    }

    return (
        <div className={s.lookup} ref={wrapRef}>
            <Input
                id={id}
                value={query}
                disabled={disabled}
                invalid={invalid}
                placeholder={placeholder}
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                autoComplete="off"
                onFocus={() => setOpen(true)}
                onChange={e => { setQuery(e.target.value); setOpen(true); }}
                onKeyDown={e => {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, visible.length - 1)); }
                    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
                    else if (e.key === 'Enter' && open && visible[active]) { e.preventDefault(); pick(visible[active]); }
                    else if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
                }}
                {...rest}
            />
            {open && (
                <ul className={s.lookupMenu} id={listId} role="listbox">
                    {loading && !visible.length && <li className={s.lookupEmpty}>Đang tìm…</li>}
                    {!loading && !visible.length && <li className={s.lookupEmpty}>Không có kết quả phù hợp</li>}
                    {visible.map((item, i) => {
                        const f = format(item);
                        return (
                            <li key={item.id} role="option" aria-selected={i === active}>
                                <button
                                    type="button"
                                    className={`${s.lookupItem} ${i === active ? s.lookupItemActive : ''}`.trim()}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => pick(item)}
                                >
                                    <span>{f.label}</span>
                                    {f.sub && <span className={s.lookupItemSub}>{f.sub}</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
