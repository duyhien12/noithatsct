'use client';
import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/fetchClient';

const fmtN = (n) => n ? new Intl.NumberFormat('vi-VN').format(Math.round(n)) : '';

// externalQuery: if provided, uses that as the search term (inline mode, no internal input)
// otherwise shows its own input (SP button popup mode)
export default function ProductPickerDropdown({ onSelect, onClose, externalQuery }) {
    const inline = externalQuery !== undefined;
    const [internalQuery, setInternalQuery] = useState('');
    const query = inline ? externalQuery : internalQuery;
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Popup mode: auto-focus the internal input
    useEffect(() => {
        if (!inline) inputRef.current?.focus();
    }, [inline]);

    // Popup mode: close on outside click
    useEffect(() => {
        if (inline) return; // inline mode closes via onBlur on textarea
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [inline, onClose]);

    // Fetch products when query changes
    useEffect(() => {
        if (!query?.trim()) { setResults([]); return; }
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const d = await apiFetch(`/api/products?search=${encodeURIComponent(query.trim())}&limit=10`);
                setResults(d.data || []);
            } catch { setResults([]); }
            setLoading(false);
        }, 250);
        return () => clearTimeout(t);
    }, [query]);

    // Don't render anything in inline mode if no results and no loading
    if (inline && !loading && results.length === 0) return null;

    return (
        <div
            ref={containerRef}
            onMouseDown={e => e.stopPropagation()}
            style={{
                position: 'absolute', top: '100%', left: 0, zIndex: 200,
                background: '#fff', border: '1px solid #cbd5e1', borderRadius: 6,
                boxShadow: '0 6px 18px rgba(0,0,0,0.14)', minWidth: 280, width: 'max-content', maxWidth: 390,
            }}
        >
            {/* Popup mode: internal search input */}
            {!inline && (
                <div style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>🔍</span>
                    <input
                        ref={inputRef}
                        value={internalQuery}
                        onChange={e => setInternalQuery(e.target.value)}
                        placeholder="Nhập mã SP hoặc tên sản phẩm..."
                        onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
                        style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 8px', fontSize: 12, outline: 'none', boxSizing: 'border-box', minWidth: 0 }}
                    />
                </div>
            )}

            {loading && (
                <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>Đang tìm...</div>
            )}

            {!loading && results.length > 0 && (
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                    {results.map(p => (
                        <div
                            key={p.id}
                            onMouseDown={e => { e.preventDefault(); onSelect(p); }}
                            style={{ padding: '7px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: 11, flexShrink: 0 }}>{p.code}</span>
                                <span style={{ color: '#111827', fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                            </div>
                            {p.material && (
                                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }}>{p.material}</div>
                            )}
                            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                                {p.salePrice > 0 && (
                                    <span style={{ color: '#059669', fontSize: 11 }}>{fmtN(p.salePrice)} đ/{p.unit}</span>
                                )}
                                {p.category && (
                                    <span style={{ color: '#94a3b8', fontSize: 10 }}>{p.category}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && !results.length && !inline && (
                <div style={{ padding: '10px 12px', fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                    {query?.trim() ? 'Không tìm thấy sản phẩm phù hợp' : 'Nhập mã SP (VD: SP001) hoặc tên sản phẩm'}
                </div>
            )}
        </div>
    );
}
