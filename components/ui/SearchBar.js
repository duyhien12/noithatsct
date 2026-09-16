'use client';
import { useState, useEffect, useRef, useId } from 'react';
import { Search, X } from 'lucide-react';

/** Ô tìm kiếm có debounce + nút xóa. Giữ nguyên API cũ. */
export default function SearchBar({
    value,
    onChange,
    placeholder = 'Tìm kiếm...',
    debounceMs = 300,
    width = 260,
    className = '',
}) {
    const [internal, setInternal] = useState(value || '');
    const timer = useRef(null);
    const id = useId();

    useEffect(() => { setInternal(value || ''); }, [value]);
    useEffect(() => () => clearTimeout(timer.current), []);

    const handleChange = (e) => {
        const v = e.target.value;
        setInternal(v);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => onChange?.(v), debounceMs);
    };

    const handleClear = () => {
        clearTimeout(timer.current);
        setInternal('');
        onChange?.('');
    };

    return (
        <div className={`ui-search ${className}`.trim()} style={{ width }}>
            <span className="ui-search__icon" aria-hidden="true"><Search size={15} /></span>
            <input
                id={id}
                type="search"
                className="ui-input"
                value={internal}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={placeholder}
            />
            {internal && (
                <button
                    type="button"
                    className="ui-search__clear"
                    onClick={handleClear}
                    aria-label="Xóa tìm kiếm"
                    title="Xóa tìm kiếm"
                >
                    <X size={14} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
