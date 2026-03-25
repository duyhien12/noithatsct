'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import CategorySidebar from '@/components/products/CategorySidebar';
import BulkActionsBar from '@/components/products/BulkActionsBar';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);
const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
const SUPPLY_TYPES = ['Mua ngoài', 'Sản xuất nội bộ', 'Dịch vụ'];
const SUPPLY_BADGE = { 'Sản xuất nội bộ': 'info', 'Mua ngoài': 'success', 'Dịch vụ': 'purple', 'Mua thương mại': 'success', 'Vật tư lưu kho': 'success' };
const SUPPLY_COLOR = { 'Sản xuất nội bộ': { bg: '#234093', color: '#fff' }, 'Mua ngoài': { bg: '#f0ebe3', color: '#8a7350' }, 'Dịch vụ': { bg: '#f3eeff', color: '#7c3aed' } };
const STOCK_DOT = { ok: { color: '#22c55e', label: 'Còn hàng' }, low: { color: '#eab308', label: 'Sắp hết' }, out: { color: '#ef4444', label: 'Hết hàng' }, service: { color: '#a3a3a3', label: 'Dịch vụ' } };
const SUPPLY_ICON = { 'Mua ngoài': '🛒', 'Sản xuất nội bộ': '🔨', 'Dịch vụ': '🧠' };
const normalizeSupply = (t) => (t === 'Mua thương mại' || t === 'Vật tư lưu kho') ? 'Mua ngoài' : (t || 'Mua ngoài');
const CORE_BOARD_TYPES = ['MDF thường', 'MDF chống ẩm', 'MFC', 'Gỗ tự nhiên', 'Nhựa', 'Kính', 'Khác'];
const isService = (p) => normalizeSupply(p.supplyType) === 'Dịch vụ';
const stockStatus = (p) => isService(p) ? 'service' : p.stock === 0 ? 'out' : (p.minStock > 0 && p.stock <= p.minStock) ? 'low' : 'ok';
const BRANDS = [{ n: '', logo: '' }, { n: 'Dulux', logo: 'https://logo.clearbit.com/dulux.com' }, { n: 'Jotun', logo: 'https://logo.clearbit.com/jotun.com' }, { n: 'TOA', logo: 'https://logo.clearbit.com/toagroup.com' }, { n: 'Nippon', logo: 'https://logo.clearbit.com/nipponpaint.com' }, { n: 'Hafele', logo: 'https://logo.clearbit.com/hafele.com' }, { n: 'Blum', logo: 'https://logo.clearbit.com/blum.com' }, { n: 'Hettich', logo: 'https://logo.clearbit.com/hettich.com' }, { n: 'Panasonic', logo: 'https://logo.clearbit.com/panasonic.com' }, { n: 'Daikin', logo: 'https://logo.clearbit.com/daikin.com' }, { n: 'Mitsubishi', logo: 'https://logo.clearbit.com/mitsubishielectric.com' }, { n: 'Samsung', logo: 'https://logo.clearbit.com/samsung.com' }, { n: 'LG', logo: 'https://logo.clearbit.com/lg.com' }, { n: 'Rossi', logo: 'https://logo.clearbit.com/rossigroup.com.vn' }, { n: 'Caesar', logo: 'https://logo.clearbit.com/caesar.com.tw' }, { n: 'Toto', logo: 'https://logo.clearbit.com/toto.com' }, { n: 'Grohe', logo: 'https://logo.clearbit.com/grohe.com' }, { n: 'HMF', logo: '' }, { n: 'AA', logo: '' }, { n: 'Hoa Phat', logo: 'https://logo.clearbit.com/hoaphat.com.vn' }];
const PRODUCT_CATS = ['Nội thất thành phẩm', 'Gỗ tự nhiên', 'Gỗ công nghiệp', 'Đá & Gạch', 'Sơn & Keo', 'Phụ kiện nội thất', 'Thiết bị điện', 'Vật liệu xây dựng', 'Rèm cửa', 'Thiết bị vệ sinh', 'Điều hòa', 'Decor', 'Đồ rời', 'Phòng thờ'];

function EditCell({ value, onChange, type = 'text', style = {}, options }) {
    if (options) return (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 12, background: 'var(--bg-input)', ...style }}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );
    return <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 12, background: 'var(--bg-input)', ...style }} />;
}

function InlineBrandCell({ value, onSave }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value || '');
    if (editing) return (
        <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={() => { setEditing(false); if (val !== (value || '')) onSave(val); }}
            onKeyDown={e => {
                if (e.key === 'Enter') { setEditing(false); if (val !== (value || '')) onSave(val); }
                if (e.key === 'Escape') { setEditing(false); setVal(value || ''); }
            }}
            style={{ width: 80, fontSize: 11, padding: '2px 4px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)' }}
            placeholder="Nhập..."
        />
    );
    return (
        <span
            onClick={() => { setVal(value || ''); setEditing(true); }}
            style={{ cursor: 'pointer', fontSize: 11, color: value ? 'inherit' : undefined, opacity: value ? 1 : 0.25, display: 'inline-block', minWidth: 30 }}
            title="Click để sửa"
        >{value || '—'}</span>
    );
}

function InlineCodeCell({ value, onSave, onCopy }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value || '');
    if (editing) return (
        <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={() => { setEditing(false); if (val !== (value || '')) onSave(val); }}
            onKeyDown={e => {
                if (e.key === 'Enter') { setEditing(false); if (val !== (value || '')) onSave(val); }
                if (e.key === 'Escape') { setEditing(false); setVal(value || ''); }
            }}
            style={{ width: 70, fontFamily: 'monospace', fontSize: 10.5, padding: '2px 4px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)' }}
            placeholder="Nhập mã..."
        />
    );
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span
                onClick={() => { setVal(value || ''); setEditing(true); }}
                style={{ fontFamily: 'monospace', fontSize: 10.5, opacity: value ? 0.7 : 0.3, cursor: 'pointer' }}
                title="Click để sửa mã"
            >{value || '—'}</span>
            {value && <button onClick={onCopy} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, opacity: 0.3, padding: 0 }} title="Copy mã">📋</button>}
        </div>
    );
}

function InlineDimensionsCell({ value, onSave }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value || '');
    if (editing) return (
        <input
            autoFocus
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={() => { setEditing(false); if (val !== (value || '')) onSave(val); }}
            onKeyDown={e => {
                if (e.key === 'Enter') { setEditing(false); if (val !== (value || '')) onSave(val); }
                if (e.key === 'Escape') { setEditing(false); setVal(value || ''); }
            }}
            style={{ width: 110, fontSize: 11, padding: '2px 4px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)' }}
            placeholder="VD: 600x800x20"
        />
    );
    return (
        <span
            onClick={() => { setVal(value || ''); setEditing(true); }}
            style={{ cursor: 'pointer', fontSize: 11, opacity: value ? 1 : 0.25, display: 'inline-block', minWidth: 30 }}
            title="Click để sửa kích thước"
        >{value || '—'}</span>
    );
}

function StockCell({ value, status, onSave }) {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(value);
    if (editing) return (
        <input autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
            onBlur={() => { setEditing(false); if (Number(val) !== value) onSave(val); }}
            onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); if (Number(val) !== value) onSave(val); } if (e.key === 'Escape') setEditing(false); }}
            style={{ width: 55, fontSize: 12, padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--bg-input)' }} />
    );
    return (
        <div onClick={() => { setVal(value); setEditing(true); }} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1 }} title="Click để sửa tồn kho">
            <span style={{ color: status === 'out' ? 'var(--status-danger)' : status === 'low' ? '#ea580c' : '', fontWeight: status !== 'ok' ? 600 : 400 }}>{value}</span>
            {status === 'out' && <span style={{ fontSize: 9, background: '#dc2626', color: '#fff', borderRadius: 3, padding: '0px 3px', width: 'fit-content' }}>Hết</span>}
            {status === 'low' && <span style={{ fontSize: 9, background: '#ea580c', color: '#fff', borderRadius: 3, padding: '0px 3px', width: 'fit-content' }}>Sắp hết</span>}
        </div>
    );
}

const PAGE_SIZE = 50;

export default function ProductsPage() {
    const router = useRouter();
    const [tab, setTab] = useState('s1');
    const [products, setProducts] = useState([]);
    const [loadingP, setLoadingP] = useState(true);
    const [searchP, setSearchP] = useState('');
    const [filterSupplyType, setFilterSupplyType] = useState('');
    const [filterStockStatus, setFilterStockStatus] = useState('');
    const [filterSupplier, setFilterSupplier] = useState('');
    const [supplierStats, setSupplierStats] = useState({ s1: 0, s2: 0, total: 0 });
    const [supplierLabel1, setSupplierLabel1] = useState('SP Thái');
    const [supplierLabel2, setSupplierLabel2] = useState('SP An Cường');
    const [editingLabel, setEditingLabel] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [editingP, setEditingP] = useState(null);
    const [quickEditP, setQuickEditP] = useState(new Map());
    const [newProduct, setNewProduct] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', category: 'Nội thất thành phẩm', unit: 'cái', salePrice: 0, importPrice: 0, brand: '', supplyType: 'Mua ngoài', stock: 0, minStock: 0, supplier: '', coreBoard: '', surfaceCode: '', image: '' });
    const [categories, setCategories] = useState([]);
    const [activeCatId, setActiveCatId] = useState(null);
    const [activeCatName, setActiveCatName] = useState(null);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef(null);
    const loadingMore = useRef(false);
    const [library, setLibrary] = useState([]);
    const [loadingL, setLoadingL] = useState(true);
    const [searchL, setSearchL] = useState('');
    const [filterCatL, setFilterCatL] = useState('');
    const [editingL, setEditingL] = useState(null);
    const [newLibItem, setNewLibItem] = useState(null);
    const [showAddLibModal, setShowAddLibModal] = useState(false);
    const [showAddCatModal, setShowAddCatModal] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [editingLibCat, setEditingLibCat] = useState(null);
    const excelInputRef = useRef(null);
    const [importPreview, setImportPreview] = useState(null);
    const [importing, setImporting] = useState(false);
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(null);
    const [uploadTarget, setUploadTarget] = useState(null);
    const activeThumb = useRef(null);
    const imgUpRef = useRef(null);
    const imgUpTarget = useRef(null);
    const [productDragState, setProductDragState] = useState(null);

    useEffect(() => {
        const check = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) setViewMode(v => v === 'list' ? 'grid' : v);
        };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const fetchCategories = useCallback(() => {
        const supplierParam = tab === 's1' ? 'Thái' : tab === 's2' ? 'An Cường' : '';
        const url = supplierParam ? `/api/product-categories?supplier=${encodeURIComponent(supplierParam)}` : '/api/product-categories';
        fetch(url).then(r => r.json()).then(async cats => {
            if (cats && cats.length > 0) {
                // Filter by supplier field if available, otherwise show all
                if (supplierParam) {
                    const getCount = c => (c._count?.products || 0) + (c.children || []).reduce((s, ch) => s + (ch._count?.products || 0), 0);
                    const filtered = cats.filter(c =>
                        c.supplier === supplierParam ||   // explicit supplier match
                        getCount(c) > 0                  // has products for this supplier tab
                    );
                    setCategories(filtered.length > 0 ? filtered : cats);
                } else {
                    setCategories(cats);
                }
            } else {
                // Fallback: fetch ALL products to build categories
                const res = await fetch('/api/products?limit=9999');
                const d = await res.json();
                const allP = d.data || [];
                const names = [...new Set([...PRODUCT_CATS, ...allP.map(p => p.category).filter(Boolean)])].sort();
                const fakeCats = names.map(name => ({
                    id: `__str__${name}`, name, _count: { products: allP.filter(p => p.category === name).length },
                    children: [],
                }));
                setCategories(fakeCats);
            }
        }).catch(() => { });
    }, [tab]);

    const fetchProducts = useCallback((reset = true) => {
        if (reset) { setLoadingP(true); setProducts([]); setCursor(null); setHasMore(true); }
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (activeCatId && !activeCatId.startsWith('__str__')) params.set('categoryId', activeCatId);
        else if (activeCatName) params.set('category', activeCatName);
        if (searchP) params.set('search', searchP);
        if (filterSupplyType) params.set('supplyType', filterSupplyType);
        // Filter by supplier based on active tab
        if (tab === 's1') params.set('supplier', 'Thái');
        if (tab === 's2') params.set('supplier', 'An Cường');
        fetch(`/api/products?${params}`).then(r => r.json()).then(d => {
            const items = d.data || [];
            setProducts(items);
            setCursor(items.length === PAGE_SIZE ? items[items.length - 1].id : null);
            setHasMore(items.length === PAGE_SIZE);
            setLoadingP(false);
        });
    }, [activeCatId, activeCatName, searchP, filterSupplyType, tab]);

    const loadMore = useCallback(() => {
        if (!cursor || !hasMore || loadingMore.current) return;
        loadingMore.current = true;
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), cursor });
        if (activeCatId && !activeCatId.startsWith('__str__')) params.set('categoryId', activeCatId);
        else if (activeCatName) params.set('category', activeCatName);
        if (searchP) params.set('search', searchP);
        fetch(`/api/products?${params}`).then(r => r.json()).then(d => {
            const items = d.data || [];
            setProducts(prev => [...prev, ...items]);
            setCursor(d.nextCursor);
            setHasMore(!!d.nextCursor);
            loadingMore.current = false;
        });
    }, [cursor, hasMore, activeCatId, activeCatName, searchP]);

    const fetchLibrary = () => { setLoadingL(true); fetch('/api/work-item-library?limit=1000').then(r => r.json()).then(d => { setLibrary(d.data || []); setLoadingL(false); }); };

    useEffect(() => {
        fetchCategories();
        fetchLibrary();
        fetch('/api/products?limit=2000').then(r => r.json()).then(d => {
            const all = d.data || [];
            setSupplierStats({
                s1: all.filter(p => (p.supplier || '').toLowerCase().includes('thái') || (p.category || '').toLowerCase().includes('thái')).length,
                s2: all.filter(p => (p.supplier || '').toLowerCase().includes('an cường') || (p.category || '').toLowerCase().includes('an cường')).length,
                total: all.length,
            });
        }).catch(() => {});
    }, []);
    useEffect(() => { fetchProducts(); }, [fetchProducts]);
    useEffect(() => { fetchProducts(); fetchCategories(); }, [tab]); // refetch when tab changes

    useEffect(() => {
        if (!sentinelRef.current) return;
        const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) loadMore(); }, { threshold: 0.1 });
        obs.observe(sentinelRef.current);
        return () => obs.disconnect();
    }, [loadMore]);

    const [pasteReady, setPasteReady] = useState(false);
    useEffect(() => {
        const handler = async (e) => {
            if (!imgUpTarget.current) return;
            const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
            if (!item) return;
            e.preventDefault();
            const file = item.getAsFile();
            if (!file) return;
            const fd = new FormData(); fd.append('file', file); fd.append('type', 'products');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const { url } = await res.json();
            const target = imgUpTarget.current;
            imgUpTarget.current = null; setPasteReady(false);
            if (target === 'new') { setNewProduct(p => ({ ...p, image: url })); }
            else { await fetch(`/api/products/${target}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) }); fetchProducts(); }
        };
        document.addEventListener('paste', handler);
        return () => document.removeEventListener('paste', handler);
    }, []);

    // --- Products handlers ---
    const visibleCategories = categories;

    const flatCats = [];
    const walkCats = (cats, depth = 0) => { for (const c of cats) { flatCats.push({ ...c, depth }); if (c.children) walkCats(c.children, depth + 1); } };
    walkCats(categories);
    const leafCats = flatCats.filter(c => !c.children || c.children.length === 0);
    const allCats = [...new Set([...PRODUCT_CATS, ...leafCats.map(c => c.name)])].sort();
    const matchSupplier = (p, label) => {
        const kw = label.toLowerCase().replace(/^sp\s*/i, '').trim();
        if (!kw) return true;
        return (p.supplier || '').toLowerCase().includes(kw) || (p.category || '').toLowerCase().includes(kw) || (p.name || '').toLowerCase().includes(kw);
    };
    const filteredP = products.filter(p => {
        if (filterStockStatus && stockStatus(p) !== filterStockStatus) return false;
        return true;
    });
    const countS1 = products.filter(p => matchSupplier(p, supplierLabel1)).length;
    const countS2 = products.filter(p => matchSupplier(p, supplierLabel2)).length;

    const startEditP = (p) => {
        const { id, code, createdAt, updatedAt, deletedAt, inventoryTx, quotationItems, materialPlans, purchaseItems, bomComponents, bomUsedIn, categoryRef, ...clean } = p;
        setEditingP({ id, data: { ...clean } });
    };
    const saveP = async () => {
        const { id, data } = editingP;
        const res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi cập nhật'); }
        setEditingP(null); fetchProducts(); fetchCategories();
    };
    const startQuickEditP = (p) => {
        setQuickEditP(prev => {
            const m = new Map(prev);
            if (m.has(p.id)) { m.delete(p.id); } else {
                m.set(p.id, { name: p.name || '', unit: p.unit || 'cái', category: p.category || '', salePrice: p.salePrice || 0, importPrice: p.importPrice || 0, stock: p.stock ?? 0, minStock: p.minStock ?? 0, supplyType: normalizeSupply(p.supplyType), brand: p.brand || '', supplier: p.supplier || '' });
            }
            return m;
        });
    };
    const updateQuickField = (id, field, value) => {
        setQuickEditP(prev => {
            const m = new Map(prev);
            const row = { ...m.get(id), [field]: value };
            m.set(id, row);
            return m;
        });
    };
    const cancelQuickEditP = (id) => {
        setQuickEditP(prev => { const m = new Map(prev); m.delete(id); return m; });
    };
    const saveQuickP = async (id) => {
        const data = quickEditP.get(id);
        if (!data) return;
        const res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi cập nhật'); }
        cancelQuickEditP(id);
        fetchProducts(); fetchCategories();
    };
    const saveAllQuickP = async () => {
        const entries = [...quickEditP.entries()];
        if (!entries.length) return;
        let ok = 0, fail = 0;
        for (const [id, data] of entries) {
            const res = await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (res.ok) ok++; else fail++;
        }
        setQuickEditP(new Map());
        fetchProducts(); fetchCategories();
        if (fail) alert(`Đã lưu ${ok}, lỗi ${fail}`);
    };
    const deleteP = async (id) => { if (!confirm('Xóa sản phẩm?')) return; await fetch(`/api/products/${id}`, { method: 'DELETE' }); fetchProducts(); fetchCategories(); };
    const duplicateP = async (p) => {
        const { id, code, createdAt, updatedAt, deletedAt, inventoryTx, quotationItems, materialPlans, purchaseItems, bomComponents, bomUsedIn, categoryRef, attributes, ...rest } = p;
        await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rest, name: rest.name + ' (2)', stock: 0 }) });
        fetchProducts(); fetchCategories();
    };
    const quickUpdateStock = async (productId, newStock) => {
        await fetch(`/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock: Number(newStock) }) });
        fetchProducts();
    };
    const quickUpdateBrand = async (productId, brand) => {
        await fetch(`/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand }) });
        fetchProducts();
    };
    const quickUpdateCode = async (productId, code) => {
        await fetch(`/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
        fetchProducts();
    };
    const quickUpdateDimensions = async (productId, dimensions) => {
        await fetch(`/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dimensions }) });
        fetchProducts();
    };
    const addNewProduct = () => {
        const activeCat = flatCats.find(c => c.id === activeCatId);
        // Only set categoryId if it's a leaf (no children)
        let catId = activeCatId || null;
        let catName = activeCat?.name || 'Nội thất thành phẩm';
        if (activeCat?.children?.length > 0) {
            // Parent selected: use first leaf child
            const firstLeaf = activeCat.children.find(c => !c.children?.length);
            catId = firstLeaf?.id || null;
            catName = firstLeaf?.name || catName;
        }
        const autoSupplier = tab === 's1' ? 'Thái' : tab === 's2' ? 'An Cường' : '';
        setAddForm({ name: '', category: catName, unit: 'cái', salePrice: 0, importPrice: 0, brand: '', supplyType: 'Mua ngoài', stock: 0, minStock: 0, supplier: autoSupplier, coreBoard: '', surfaceCode: '', image: '', categoryId: catId });
        setShowAddModal(true);
    };
    const handleImgUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const fd = new FormData(); fd.append('file', file); fd.append('type', 'products');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const { url } = await res.json();
        if (imgUpTarget.current === 'new') { setNewProduct(p => ({ ...p, image: url })); }
        else if (imgUpTarget.current) { await fetch(`/api/products/${imgUpTarget.current}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) }); fetchProducts(); }
        imgUpTarget.current = null; e.target.value = '';
    };
    const saveRenameLibCat = async () => {
        if (!editingLibCat || editingLibCat.new === editingLibCat.old) { setEditingLibCat(null); return; }
        if (!editingLibCat.new.trim()) { setEditingLibCat(null); return; }
        await fetch('/api/work-item-library', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldCategory: editingLibCat.old, newCategory: editingLibCat.new.trim() }) });
        setEditingLibCat(null); fetchLibrary();
    };

    // --- Library handlers (from original) ---
    const lCats = [...new Set(library.map(i => i.category).filter(Boolean))].sort();
    const filteredL = library.filter(i =>
        (!filterCatL || i.category === filterCatL) &&
        (!searchL || i.name.toLowerCase().includes(searchL.toLowerCase()))
    );
    const startEditL = (item) => setEditingL({ id: item.id, data: { ...item } });
    const saveL = async () => {
        const { id, data } = editingL;
        const { id: _, createdAt, updatedAt, ...clean } = data;
        const res = await fetch(`/api/work-item-library/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi cập nhật'); }
        setEditingL(null); fetchLibrary();
    };
    const deleteL = async (id) => { if (!confirm('Xóa hạng mục?')) return; await fetch(`/api/work-item-library/${id}`, { method: 'DELETE' }); fetchLibrary(); };
    const addNewLib = () => { setNewLibItem({ name: '', category: filterCatL || '', subcategory: '', unit: 'cái', mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '' }); setShowAddLibModal(true); };
    const saveNewLib = async () => {
        if (!newLibItem?.name?.trim()) return alert('Nhập tên hạng mục');
        const res = await fetch('/api/work-item-library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLibItem) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo'); }
        setNewLibItem(null); setShowAddLibModal(false); fetchLibrary();
    };

    // --- Save new product ---
    const saveNewProduct = async () => {
        if (!addForm.name?.trim()) return alert('Nhập tên sản phẩm');
        const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo'); }
        setShowAddModal(false); fetchProducts(); fetchCategories();
    };

    // --- Excel import with validation ---
    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        const existingNames = new Set(products.map(p => p.name.toLowerCase().trim()));
        const seenNames = new Set();
        const mapped = rows.map((r, idx) => {
            const name = (r['Tên sản phẩm'] || r['Tên'] || r['name'] || '').trim();
            const salePrice = Number(r['Giá bán'] || r['salePrice'] || 0);
            const importPrice = Number(r['Giá nhập'] || r['importPrice'] || 0);
            const stock = Number(r['Tồn kho'] || r['stock'] || 0);
            const errors = [];
            if (!name) errors.push('Thiếu tên');
            if (name && existingNames.has(name.toLowerCase())) errors.push('Trùng SP đã có');
            if (name && seenNames.has(name.toLowerCase())) errors.push('Trùng trong file');
            if (isNaN(salePrice) || salePrice < 0) errors.push('Giá bán sai');
            if (isNaN(stock) || stock < 0) errors.push('Tồn kho sai');
            if (name) seenNames.add(name.toLowerCase());
            return {
                name,
                category: r['Danh mục'] || r['category'] || '',
                unit: r['ĐVT'] || r['unit'] || 'cái',
                salePrice, importPrice,
                stock, minStock: Number(r['Tồn tối thiểu'] || r['minStock'] || 0),
                brand: r['Thương hiệu'] || r['brand'] || '',
                supplyType: r['Nguồn cung'] || r['supplyType'] || 'Mua ngoài',
                supplier: r['Nhà cung cấp'] || r['supplier'] || '',
                color: r['Màu sắc'] || r['color'] || '',
                material: r['Chất liệu'] || r['material'] || '',
                origin: r['Xuất xứ'] || r['origin'] || '',
                location: r['Kho/Vị trí'] || r['location'] || '',
                description: r['Mô tả'] || r['description'] || '',
                _errors: errors, _enabled: errors.length === 0, _row: idx + 2,
            };
        }).filter(p => p.name || p._errors.length > 0);
        setImportPreview(mapped);
        e.target.value = '';
    };
    const parsePastedText = (text) => {
        if (!text?.trim()) return alert('Chưa có dữ liệu! Paste từ Excel vào ô bên trên.');
        const lines = text.split('\n').map(l => l.split('\t').map(c => c.trim()));
        if (lines.length < 2) return alert('Cần ít nhất 2 dòng (header + data)');
        const headerMap = { 'tên': 'name', 'tên sản phẩm': 'name', 'name': 'name', 'tên sp': 'name', 'danh mục': 'category', 'category': 'category', 'đvt': 'unit', 'unit': 'unit', 'đơn vị': 'unit', 'giá bán': 'salePrice', 'saleprice': 'salePrice', 'giá nhập': 'importPrice', 'importprice': 'importPrice', 'tồn kho': 'stock', 'stock': 'stock', 'tồn': 'stock', 'thương hiệu': 'brand', 'brand': 'brand', 'nguồn cung': 'supplyType', 'supplytype': 'supplyType', 'nhà cung cấp': 'supplier', 'supplier': 'supplier', 'tồn tối thiểu': 'minStock', 'minstock': 'minStock' };
        const headers = lines[0].map(h => headerMap[h.toLowerCase()] || null);
        if (!headers.includes('name')) return alert('Không tìm thấy cột "Tên" trong header. Hàng đầu tiên phải là tiêu đề: Tên, Danh mục, ĐVT, Giá bán...');
        const existingNames = new Set(products.map(p => p.name.toLowerCase().trim()));
        const seenNames = new Set();
        const mapped = lines.slice(1).filter(cols => cols.some(c => c)).map((cols, idx) => {
            const row = {};
            headers.forEach((key, i) => { if (key && cols[i]) row[key] = cols[i]; });
            const name = (row.name || '').trim();
            const salePrice = Number(row.salePrice || 0);
            const importPrice = Number(row.importPrice || 0);
            const stock = Number(row.stock || 0);
            const errors = [];
            if (!name) errors.push('Thiếu tên');
            if (name && existingNames.has(name.toLowerCase())) errors.push('Trùng SP đã có');
            if (name && seenNames.has(name.toLowerCase())) errors.push('Trùng trong paste');
            if (name) seenNames.add(name.toLowerCase());
            return {
                name, category: row.category || '', unit: row.unit || 'cái', salePrice, importPrice,
                stock, minStock: Number(row.minStock || 0), brand: row.brand || '',
                supplyType: row.supplyType || 'Mua ngoài', supplier: row.supplier || '',
                _errors: errors, _enabled: errors.length === 0, _row: idx + 2,
            };
        }).filter(p => p.name || p._errors.length > 0);
        if (!mapped.length) return alert('Không parse được dữ liệu nào');
        setShowPasteModal(false); setPasteText('');
        setImportPreview(mapped);
    };
    const toggleImportRow = (idx) => setImportPreview(prev => prev.map((p, i) => i === idx ? { ...p, _enabled: !p._enabled } : p));
    const confirmImport = async () => {
        const toImport = importPreview.filter(p => p._enabled && p._errors.length === 0);
        if (!toImport.length) return alert('Không có sản phẩm hợp lệ để import');
        setImporting(true);
        const products = toImport.map(({ _errors, _enabled, _row, ...p }) => p);
        const res = await fetch('/api/products/bulk-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products }),
        });
        const json = await res.json();
        setImporting(false);
        if (!res.ok) return alert(json.error || 'Import thất bại');
        setImportPreview(null);
        fetchProducts(); fetchCategories();
        alert(`✅ Đã import ${json.count}/${json.total} sản phẩm thành công!`);
    };

    const downloadTemplate = () => {
        const catList = categories.flatMap(c => c.children?.length ? c.children.flatMap(c2 => c2.children?.length ? c2.children.map(c3 => c3.name) : [c2.name]) : [c.name]);
        const wb = XLSX.utils.book_new();

        // Sheet 1: Template
        const templateData = [
            ['Tên sản phẩm', 'Danh mục', 'ĐVT', 'Giá bán', 'Giá nhập', 'Tồn kho', 'Tồn tối thiểu', 'Thương hiệu', 'Nguồn cung', 'Nhà cung cấp', 'Màu sắc', 'Chất liệu', 'Xuất xứ', 'Kho/Vị trí', 'Mô tả'],
            ['Ống nước PPR DN25', 'Cấp thoát nước', 'cây', 75000, 55000, 150, 20, 'Bình Minh', 'Mua ngoài', 'Bình Minh Plastic', '', '', 'Việt Nam', 'Kho A', ''],
            ['Sơn nội thất Dulux 18L', 'Sơn & Keo', 'thùng', 850000, 650000, 30, 5, 'Dulux', 'Mua ngoài', 'NPP Dulux HN', 'Trắng', '', 'Thái Lan', '', ''],
            ['Gạch lát nền 60x60', 'Vật liệu xây dựng', 'm²', 120000, 90000, 200, 50, '', 'Mua ngoài', '', 'Xám', 'Gốm sứ', 'Việt Nam', 'Kho B', ''],
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(templateData);
        ws1['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 15 }, { wch: 20 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Sản phẩm');

        // Sheet 2: Danh mục
        const catData = [['Danh mục hợp lệ (copy vào cột Danh mục)'], ...catList.map(c => [c])];
        const ws2 = XLSX.utils.aoa_to_sheet(catData);
        ws2['!cols'] = [{ wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws2, 'Danh mục');

        // Sheet 3: Hướng dẫn
        const guideData = [
            ['Hướng dẫn nhập liệu'],
            [''],
            ['Cột', 'Bắt buộc', 'Ghi chú'],
            ['Tên sản phẩm', 'Bắt buộc', 'Không được trùng với SP đã có'],
            ['Danh mục', 'Bắt buộc', 'Xem sheet "Danh mục" để biết danh mục hợp lệ'],
            ['ĐVT', 'Bắt buộc', 'cái / m² / m / kg / bộ / set / thùng / cây / tấm / ...'],
            ['Giá bán', 'Không', 'Số nguyên, đơn vị VNĐ (không dùng dấu chấm/phẩy)'],
            ['Giá nhập', 'Không', 'Số nguyên, đơn vị VNĐ'],
            ['Tồn kho', 'Không', 'Số nguyên, mặc định 0'],
            ['Tồn tối thiểu', 'Không', 'Cảnh báo khi tồn kho ≤ giá trị này'],
            ['Thương hiệu', 'Không', ''],
            ['Nguồn cung', 'Không', 'Mua ngoài / Sản xuất nội bộ / Dịch vụ (mặc định: Mua ngoài)'],
            ['Nhà cung cấp', 'Không', ''],
            ['Màu sắc', 'Không', ''],
            ['Chất liệu', 'Không', ''],
            ['Xuất xứ', 'Không', ''],
            ['Kho/Vị trí', 'Không', ''],
            ['Mô tả', 'Không', ''],
            [''],
            ['Lưu ý:', '', 'Không xóa hàng tiêu đề (hàng 1). Xóa các dòng ví dụ và nhập dữ liệu thực tế từ hàng 2.'],
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(guideData);
        ws3['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 55 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Hướng dẫn');

        XLSX.writeFile(wb, 'mau_import_san_pham.xlsx');
    };

    // --- Thumbnail upload ---
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]; if (!file || !activeThumb.current) return;
        const { id, entity } = activeThumb.current;
        setUploading(id);
        const fd = new FormData(); fd.append('file', file); fd.append('type', entity === 'library' ? 'work-items' : 'products');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const { url } = await res.json();
        const apiUrl = entity === 'library' ? `/api/work-item-library/${id}` : `/api/products/${id}`;
        await fetch(apiUrl, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
        setUploading(null); activeThumb.current = null; e.target.value = '';
        entity === 'library' ? fetchLibrary() : fetchProducts();
    };
    const Thumb = ({ image, id, entity }) => (
        <div className="thumb-wrap" onClick={() => { activeThumb.current = { id, entity }; fileInputRef.current?.click(); }} style={{ position: 'relative', cursor: 'pointer', width: 36, height: 36 }}>
            {uploading === id
                ? <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏳</div>
                : image
                    ? <img src={image} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border-color)', display: 'block' }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 5, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, opacity: 0.3 }}>📷</div>
            }
            <div className="thumb-overlay">📤</div>
        </div>
    );

    const lowStock = products.filter(p => p.stock <= p.minStock && p.minStock > 0).length;
    const outStock = products.filter(p => !isService(p) && p.stock === 0).length;
    const copyCode = (code) => { navigator.clipboard.writeText(code); };

    return (
        <div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Tabs */}
            <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '2px solid var(--border-color)', marginBottom: 20 }}>
                {/* SP Thái tab */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: tab === 's1' ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -2 }}>
                    <button onClick={() => setTab('s1')} style={{ padding: '9px 8px 9px 16px', border: 'none', background: 'none', fontSize: 13, fontWeight: tab === 's1' ? 700 : 400, color: tab === 's1' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                        📦{' '}
                        {editingLabel === 's1'
                            ? <input autoFocus value={supplierLabel1} onChange={e => setSupplierLabel1(e.target.value)}
                                onBlur={() => setEditingLabel(null)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(null); }}
                                onClick={ev => ev.stopPropagation()}
                                style={{ width: 80, fontSize: 13, fontWeight: 700, padding: '1px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'white', color: 'var(--primary)' }} />
                            : <span onDoubleClick={ev => { ev.stopPropagation(); setEditingLabel('s1'); }}>{supplierLabel1}</span>
                        }{' '}({countS1})
                    </button>
                </div>
                {/* SP An Cường tab */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: tab === 's2' ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -2 }}>
                    <button onClick={() => setTab('s2')} style={{ padding: '9px 8px 9px 16px', border: 'none', background: 'none', fontSize: 13, fontWeight: tab === 's2' ? 700 : 400, color: tab === 's2' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                        📦{' '}
                        {editingLabel === 's2'
                            ? <input autoFocus value={supplierLabel2} onChange={e => setSupplierLabel2(e.target.value)}
                                onBlur={() => setEditingLabel(null)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(null); }}
                                onClick={ev => ev.stopPropagation()}
                                style={{ width: 80, fontSize: 13, fontWeight: 700, padding: '1px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'white', color: 'var(--primary)' }} />
                            : <span onDoubleClick={ev => { ev.stopPropagation(); setEditingLabel('s2'); }}>{supplierLabel2}</span>
                        }{' '}({countS2})
                    </button>
                </div>
                <button onClick={() => setTab('library')} style={{ padding: '9px 22px', border: 'none', borderBottom: tab === 'library' ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', marginBottom: -2, fontSize: 13, fontWeight: tab === 'library' ? 700 : 400, color: tab === 'library' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                    🔧 Hạng mục thi công ({library.length})
                </button>
            </div>

            {/* ===== PRODUCTS ===== */}
            {(tab === 's1' || tab === 's2') && (
                <div style={{ display: 'flex', minHeight: isMobile ? 'auto' : 'calc(100vh - 200px)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>

                    {/* Mobile sidebar overlay backdrop */}
                    {isMobile && sidebarOpen && (
                        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
                    )}

                    {/* Sidebar */}
                    <div style={isMobile ? {
                        position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-260px', width: 240, height: '100vh',
                        zIndex: 50, transition: 'left 0.25s ease', boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.2)' : 'none',
                        overflowY: 'auto', background: 'var(--bg-card)'
                    } : {}}>
                        <CategorySidebar categories={visibleCategories} activeCatId={activeCatId}
                            supplier={tab === 's1' ? 'Thái' : tab === 's2' ? 'An Cường' : ''}
                            onSelect={id => {
                                setActiveCatId(id);
                                if (id?.startsWith('__str__')) {
                                    const cat = categories.find(c => c.id === id);
                                    setActiveCatName(cat?.name || null);
                                } else {
                                    setActiveCatName(null);
                                }
                                setSelectedIds(new Set());
                                if (isMobile) setSidebarOpen(false);
                            }}
                            totalCount={products.length} onRefresh={() => { fetchCategories(); fetchProducts(); }}
                            dragState={productDragState} setDragState={setProductDragState}
                            onProductDrop={async (productIds, catId, catName) => {
                                await fetch('/api/products', {
                                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'bulkCategory', ids: productIds, categoryId: catId, category: catName }),
                                });
                                fetchProducts(); fetchCategories();
                            }} />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        {/* Toolbar */}
                        {isMobile ? (
                            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {/* Row 1: category button + search + add */}
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button onClick={() => setSidebarOpen(true)} style={{ flexShrink: 0, padding: '7px 10px', border: '1px solid var(--border-color)', borderRadius: 7, background: activeCatId ? 'var(--primary)' : 'var(--surface-alt)', color: activeCatId ? '#fff' : 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }} title="Danh mục">☰</button>
                                    <input className="form-input" placeholder="🔍 Tìm sản phẩm..." value={searchP} onChange={e => setSearchP(e.target.value)} style={{ flex: 1, minWidth: 0, fontSize: 13, padding: '7px 10px', borderRadius: 7 }} />
                                    <button onClick={() => setShowFilters(f => !f)} style={{ flexShrink: 0, padding: '7px 10px', border: '1px solid var(--border-color)', borderRadius: 7, background: (filterSupplyType || filterStockStatus) ? '#234093' : 'var(--surface-alt)', color: (filterSupplyType || filterStockStatus) ? '#fff' : 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>⚙️</button>
                                    <button onClick={addNewProduct} style={{ flexShrink: 0, padding: '7px 12px', border: 'none', borderRadius: 7, background: '#DBB35E', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+</button>
                                </div>
                                {/* Row 2: filters (collapsible) */}
                                {showFilters && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <select className="form-select" value={filterSupplyType} onChange={e => setFilterSupplyType(e.target.value)} style={{ flex: 1, fontSize: 12, padding: '6px 8px' }}>
                                                <option value="">Tất cả nguồn cung</option>{SUPPLY_TYPES.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                            <div style={{ display: 'flex', gap: 0, background: 'var(--surface-alt)', borderRadius: 6, padding: 2, border: '1px solid var(--border-color)' }}>
                                                <button onClick={() => setViewMode('list')} style={{ fontSize: 11, padding: '4px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', background: viewMode === 'list' ? '#fff' : 'transparent', fontWeight: viewMode === 'list' ? 600 : 400 }}>☰</button>
                                                <button onClick={() => setViewMode('grid')} style={{ fontSize: 11, padding: '4px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', background: viewMode === 'grid' ? '#fff' : 'transparent', fontWeight: viewMode === 'grid' ? 600 : 400 }}>⊞</button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {[['', 'Tất cả', '#666'], ['ok', '🟢 Còn', '#22c55e'], ['low', '🟡 Sắp hết', '#eab308'], ['out', '🔴 Hết', '#ef4444']].map(([v, l, c]) => (
                                                <button key={v} onClick={() => setFilterStockStatus(v)} style={{ flex: 1, fontSize: 11, padding: '5px 4px', border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer', background: filterStockStatus === v ? c : 'var(--surface-alt)', color: filterStockStatus === v ? '#fff' : 'var(--text-muted)', fontWeight: filterStockStatus === v ? 700 : 400 }}>{l}</button>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => excelInputRef.current?.click()} style={{ flex: 1, fontSize: 12 }}>📥 Import</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setPasteText(''); setShowPasteModal(true); }} style={{ flex: 1, fontSize: 12 }}>📋 Paste</button>
                                            <button className="btn btn-ghost btn-sm" onClick={downloadTemplate} style={{ flex: 1, fontSize: 12 }}>📄 Mẫu</button>
                                        </div>
                                    </div>
                                )}
                                <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelFile} />
                                {/* Stats row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                                    <span>📦 <strong>{filteredP.length}</strong> sản phẩm</span>
                                    {lowStock > 0 && <span style={{ color: '#eab308' }}>⚠️ {lowStock} sắp hết</span>}
                                    {outStock > 0 && <span style={{ color: '#ef4444' }}>🔴 {outStock} hết</span>}
                                    {selectedIds.size > 0 && <button className="btn btn-sm" style={{ fontSize: 11, background: '#ea580c', color: '#fff', border: 'none' }} onClick={() => { const bad = [...selectedIds].filter(id => normalizeSupply(products.find(p => p.id === id)?.supplyType) !== 'Mua ngoài'); if (bad.length) return alert('Chỉ chọn SP "Mua ngoài"'); router.push('/purchasing?createPO=1&products=' + [...selectedIds].join(',')); }}>🛒 PO ({selectedIds.size})</button>}
                                </div>
                            </div>
                        ) : (
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input className="form-input" placeholder="🔍 Tìm SP..." value={searchP} onChange={e => setSearchP(e.target.value)} style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '6px 10px', borderRadius: 6 }} />
                            <select className="form-select" value={filterSupplyType} onChange={e => setFilterSupplyType(e.target.value)} style={{ fontSize: 11, padding: '6px 8px' }}>
                                <option value="">Nguồn cung</option>{SUPPLY_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: 0, background: 'var(--surface-alt)', borderRadius: 6, padding: 2, border: '1px solid var(--border-color)' }}>
                                <button onClick={() => setViewMode('list')} style={{ fontSize: 11, padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', background: viewMode === 'list' ? '#fff' : 'transparent', fontWeight: viewMode === 'list' ? 600 : 400, boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'list' ? '#234093' : 'var(--text-secondary)' }}>☰ Danh sách</button>
                                <button onClick={() => setViewMode('grid')} style={{ fontSize: 11, padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', background: viewMode === 'grid' ? '#fff' : 'transparent', fontWeight: viewMode === 'grid' ? 600 : 400, boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'grid' ? '#234093' : 'var(--text-secondary)' }}>⊞ Dạng lưới</button>
                            </div>
                            <div style={{ display: 'flex', gap: 2, background: 'var(--surface-alt)', borderRadius: 6, padding: 2, border: '1px solid var(--border-color)' }}>
                                {[['', 'Tất cả', '#666'], ['ok', '🟢 Còn hàng', '#22c55e'], ['low', '🟡 Sắp hết', '#eab308'], ['out', '🔴 Hết hàng', '#ef4444']].map(([v, l, c]) => (
                                    <button key={v} onClick={() => setFilterStockStatus(v)} title={l} style={{ fontSize: 10, padding: '4px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', background: filterStockStatus === v ? '#fff' : 'transparent', fontWeight: filterStockStatus === v ? 600 : 400, boxShadow: filterStockStatus === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: filterStockStatus === v ? c : 'var(--text-muted)' }}>{l}</button>
                                ))}
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}>
                                {/* Supplier filter tags */}
                                {[
                                    { key: 's1', label: supplierLabel1, setLabel: setSupplierLabel1, count: countS1, color: '#b45309', bg: '#fffbeb' },
                                    { key: 's2', label: supplierLabel2, setLabel: setSupplierLabel2, count: countS2, color: '#7c3aed', bg: '#f5f3ff' },
                                ].map(s => (
                                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 0, border: `1.5px solid ${filterSupplier === s.key ? s.color : 'var(--border-color)'}`, borderRadius: 7, overflow: 'hidden', background: filterSupplier === s.key ? s.bg : 'var(--surface-alt)' }}>
                                        <button onClick={() => setFilterSupplier(filterSupplier === s.key ? '' : s.key)}
                                            style={{ padding: '3px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: filterSupplier === s.key ? s.color : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {s.count} {editingLabel === s.key
                                                ? <input autoFocus value={s.label} onChange={e => s.setLabel(e.target.value)}
                                                    onBlur={() => setEditingLabel(null)}
                                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(null); }}
                                                    onClick={ev => ev.stopPropagation()}
                                                    style={{ width: 80, fontSize: 11, padding: '0 2px', border: '1px solid ' + s.color, borderRadius: 3, fontWeight: 600, background: 'white' }} />
                                                : <span onDoubleClick={ev => { ev.stopPropagation(); setEditingLabel(s.key); }}>{s.label}</span>
                                            }
                                        </button>
                                    </div>
                                ))}
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>📦 <strong>{filteredP.length}</strong></span>
                                {lowStock > 0 && <span style={{ fontSize: 10, color: '#eab308' }}>⚠️{lowStock}</span>}
                                {outStock > 0 && <span style={{ fontSize: 10, color: '#ef4444' }}>🔴{outStock}</span>}
                                {selectedIds.size > 0 && <button className="btn btn-sm" style={{ fontSize: 11, background: '#ea580c', color: '#fff', border: 'none' }} onClick={() => { const bad = [...selectedIds].filter(id => normalizeSupply(products.find(p => p.id === id)?.supplyType) !== 'Mua ngoài'); if (bad.length) return alert('Chỉ chọn SP "Mua ngoài"'); router.push('/purchasing?createPO=1&products=' + [...selectedIds].join(',')); }}>🛒 PO ({selectedIds.size})</button>}
                                <button className="btn btn-sm" onClick={addNewProduct} style={{ fontSize: 11, background: '#DBB35E', color: '#fff', border: 'none', fontWeight: 700, borderRadius: 6, padding: '5px 14px' }}>+ THÊM SẢN PHẨM</button>
                                {tab === 's1' && (
                                    <button className="btn btn-ghost btn-sm" title="Gán tất cả SP chưa có nhà cung cấp vào SP Thái" onClick={async () => {
                                        const r = await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fixUnassigned', supplier: 'Thái' }) });
                                        const d = await r.json();
                                        alert(`Đã gán ${d.updated} sản phẩm chưa phân loại vào SP Thái`);
                                        fetchProducts(); fetchCategories();
                                    }} style={{ fontSize: 11, color: '#b45309' }}>🔧 Gán SP chưa phân loại</button>
                                )}
                                <button className="btn btn-ghost btn-sm" onClick={() => excelInputRef.current?.click()} title="Import sản phẩm từ Excel">📥 Import</button>
                                <button className="btn btn-ghost btn-sm" onClick={downloadTemplate} title="Tải file Excel mẫu">📄 Mẫu</button>
                                <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelFile} />
                                <button className="btn btn-ghost btn-sm" onClick={() => { setPasteText(''); setShowPasteModal(true); }} title="Paste từ Excel">📋 Paste</button>
                            </div>
                        </div>
                        )}
                        <BulkActionsBar selectedIds={selectedIds} categories={leafCats} onDone={() => { setSelectedIds(new Set()); fetchProducts(); fetchCategories(); }} />
                        {quickEditP.size > 0 && (
                            <div style={{ padding: '6px 16px', background: 'linear-gradient(90deg, #234093, #3b5998)', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>✏️ Đang sửa {quickEditP.size} sản phẩm</span>
                                <button className="btn btn-sm" onClick={saveAllQuickP} style={{ fontSize: 11, padding: '3px 12px', background: '#DBB35E', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 700 }}>💾 Lưu tất cả</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setQuickEditP(new Map())} style={{ fontSize: 11, color: '#fff', opacity: 0.8 }}>✕ Hủy tất cả</button>
                            </div>
                        )}
                        {loadingP ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                            <div style={{ flex: 1, overflowY: 'auto' }}>

                                {/* ========= LIST VIEW ========= */}
                                {viewMode === 'list' && (<>
                                    <table className="data-table" style={{ fontSize: 12 }}>
                                        <thead><tr>
                                            <th style={{ width: 30, padding: '4px' }}><input type="checkbox" checked={filteredP.length > 0 && filteredP.every(p => selectedIds.has(p.id))} onChange={e => setSelectedIds(e.target.checked ? new Set(filteredP.map(p => p.id)) : new Set())} /></th>
                                            <th style={{ width: 38 }}>Ảnh</th><th style={{ minWidth: 160 }}>Tên SP</th><th style={{ width: 120 }}>Kích thước</th><th style={{ width: 45 }}>ĐVT</th>
                                            <th style={{ width: 100 }}>Giá bán</th><th style={{ width: 70 }}>Tồn kho</th><th style={{ width: 100 }}>Nguồn</th><th style={{ width: 85 }}>TH</th><th style={{ width: 75 }}></th>
                                        </tr></thead>
                                        <tbody>{filteredP.map(p => {
                                            const ss = stockStatus(p);
                                            const qe = quickEditP.get(p.id);
                                            const isQE = !!qe;
                                            const sc = SUPPLY_COLOR[normalizeSupply(p.supplyType)] || { bg: '#f5f5f5', color: '#666' };
                                            const sd = STOCK_DOT[ss] || STOCK_DOT.ok;
                                            return (<tr key={p.id} draggable={!isQE}
                                                onDragStart={(e) => {
                                                    const ids = selectedIds.has(p.id) && selectedIds.size > 1 ? [...selectedIds] : [p.id];
                                                    e.dataTransfer.setData('application/product-ids', JSON.stringify(ids));
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    setProductDragState({ dragId: p.id, dropId: null, type: 'product', count: ids.length });
                                                }}
                                                onDragEnd={() => setProductDragState(null)}
                                                style={{ background: isQE ? 'rgba(99,102,241,0.06)' : '', cursor: isQE ? 'default' : 'grab' }}>
                                                <td style={{ padding: 4, textAlign: 'center' }}><input type="checkbox" checked={selectedIds.has(p.id)} onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(p.id) : n.delete(p.id); setSelectedIds(n); }} /></td>
                                                <td style={{ padding: 3, cursor: 'pointer' }} onClick={() => { imgUpTarget.current = p.id; imgUpRef.current?.click(); }}><div style={{ width: 34, height: 34, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f9' }}>{p.image ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 14, opacity: 0.15 }}>📷</span>}</div></td>
                                                <td style={{ padding: '4px 6px' }}>{isQE
                                                    ? <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><input value={qe.name} onChange={e => updateQuickField(p.id, 'name', e.target.value)} style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)', fontWeight: 600 }} /><select value={qe.category} onChange={e => updateQuickField(p.id, 'category', e.target.value)} style={{ fontSize: 10, padding: '1px 3px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)' }}>{allCats.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                                    : <><div style={{ fontWeight: 600, fontSize: 12.5, color: '#234093', cursor: 'pointer' }} onClick={() => startEditP(p)}>{p.name}</div>{p.category && <span style={{ fontSize: 10, opacity: 0.45, background: 'var(--surface-alt)', borderRadius: 3, padding: '0 4px' }}>{p.category}</span>}</>}</td>
                                                <td style={{ padding: '4px 4px' }}>
                                                    <InlineDimensionsCell value={p.dimensions} onSave={v => quickUpdateDimensions(p.id, v)} />
                                                </td>
                                                <td style={{ padding: '4px 4px', fontSize: 11 }}>{isQE
                                                    ? <input value={qe.unit} onChange={e => updateQuickField(p.id, 'unit', e.target.value)} style={{ width: 40, fontSize: 11, padding: '2px 3px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)' }} />
                                                    : p.unit}</td>
                                                <td style={{ fontWeight: 600, padding: '4px 4px' }}>{isQE
                                                    ? <input type="number" value={qe.salePrice} onChange={e => updateQuickField(p.id, 'salePrice', Number(e.target.value))} style={{ width: 85, fontSize: 12, padding: '2px 4px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)', fontWeight: 600 }} />
                                                    : fmtCur(p.salePrice)}</td>
                                                <td style={{ padding: '4px 4px' }}>{isService(p) ? <span style={{ opacity: 0.3 }}>—</span> : isQE
                                                    ? <input type="number" value={qe.stock} onChange={e => updateQuickField(p.id, 'stock', Number(e.target.value))} style={{ width: 55, fontSize: 12, padding: '2px 4px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)' }} />
                                                    : <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => { /* StockCell handles click */ }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: sd.color, display: 'inline-block', flexShrink: 0 }} /><StockCell value={p.stock} status={ss} onSave={v => quickUpdateStock(p.id, v)} /></div>}</td>
                                                <td style={{ padding: '4px 4px' }}>{isQE
                                                    ? <select value={qe.supplyType} onChange={e => updateQuickField(p.id, 'supplyType', e.target.value)} style={{ fontSize: 10, padding: '2px 3px', border: '1px solid #234093', borderRadius: 4, background: 'var(--bg-input)' }}>{SUPPLY_TYPES.map(t => <option key={t}>{t}</option>)}</select>
                                                    : <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{normalizeSupply(p.supplyType)}</span>}</td>
                                                <td style={{ fontSize: 11, padding: '4px 4px' }}>
                                                    <InlineBrandCell value={p.brand} onSave={v => quickUpdateBrand(p.id, v)} />
                                                </td>
                                                <td style={{ padding: '4px 4px' }}>{isQE
                                                    ? <div style={{ display: 'flex', gap: 2 }}><button className="btn btn-sm" onClick={() => saveQuickP(p.id)} style={{ fontSize: 11, padding: '2px 6px', background: '#234093', color: '#fff', border: 'none', borderRadius: 4 }}>✓</button><button className="btn btn-ghost btn-sm" onClick={() => cancelQuickEditP(p.id)} style={{ fontSize: 11, padding: '2px 4px' }}>✕</button></div>
                                                    : <div style={{ display: 'flex', gap: 1 }}><button className="btn btn-ghost btn-sm" onClick={() => startQuickEditP(p)} style={{ fontSize: 11, padding: '1px 3px' }} title="Sửa nhanh">✏️</button><button className="btn btn-ghost btn-sm" onClick={() => duplicateP(p)} style={{ fontSize: 11, padding: '1px 3px' }}>📋</button><button className="btn btn-ghost btn-sm" onClick={() => deleteP(p.id)} style={{ fontSize: 11, padding: '1px 3px' }}>🗑️</button></div>}</td>
                                            </tr>);
                                        })}</tbody>
                                    </table>
                                </>)}

                                {/* ========= GRID/CARD VIEW ========= */}
                                {viewMode === 'grid' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(195px, 1fr))', gap: isMobile ? 8 : 12, padding: isMobile ? 8 : 12 }}>
                                        {filteredP.map(p => {
                                            const ss = stockStatus(p);
                                            const sc = SUPPLY_COLOR[normalizeSupply(p.supplyType)] || { bg: '#f5f5f5', color: '#666' };
                                            const sd = STOCK_DOT[ss] || STOCK_DOT.ok;
                                            return (
                                                <div key={p.id} className="product-card" style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-card)', transition: 'box-shadow .15s, transform .15s', cursor: 'default' }}>
                                                    {/* Image */}
                                                    <div onClick={() => { imgUpTarget.current = p.id; imgUpRef.current?.click(); }} style={{ width: '100%', aspectRatio: '4/3', background: '#f5f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                                                        {p.image
                                                            ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            : <span style={{ fontSize: 40, opacity: 0.08 }}>📷</span>}
                                                        <div className="card-img-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s', color: '#fff', fontSize: 16 }}>📤 Đổi ảnh</div>
                                                    </div>
                                                    {/* Body */}
                                                    <div style={{ padding: '10px 12px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: 13, color: '#234093', cursor: 'pointer', lineHeight: 1.3, marginBottom: 4, minHeight: 34 }} onClick={() => startEditP(p)}>{p.name}</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                                                            <span style={{ fontFamily: 'monospace', fontSize: 10.5, opacity: 0.45 }}>{p.code}</span>
                                                            <button onClick={() => copyCode(p.code)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.35, padding: 0 }} title="Copy mã">📋</button>
                                                        </div>
                                                        <div style={{ marginBottom: 6 }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 600 }}>{normalizeSupply(p.supplyType)}</span></div>
                                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{fmtCur(p.salePrice)} <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.5 }}>/ {p.unit}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sd.color, display: 'inline-block' }} />
                                                            <span style={{ color: sd.color, fontWeight: 600 }}>{sd.label}</span>
                                                            {!isService(p) && <span style={{ opacity: 0.45 }}>({p.stock})</span>}
                                                        </div>
                                                    </div>
                                                    {/* Footer actions */}
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2, padding: '6px 10px', borderTop: '1px solid var(--border-color)' }}>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => startEditP(p)} style={{ fontSize: 11 }}>Sửa</button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => deleteP(p.id)} style={{ fontSize: 11, color: '#ef4444' }}>Xóa</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {hasMore && <div ref={sentinelRef} style={{ padding: 16, textAlign: 'center', opacity: 0.4, fontSize: 11 }}>Đang tải thêm...</div>}
                                {!hasMore && filteredP.length > 0 && <div style={{ padding: 10, textAlign: 'center', opacity: 0.25, fontSize: 10 }}>— Hết —</div>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== LIBRARY ===== */}
            {tab === 'library' && (
                <div style={{ display: 'flex', gap: 0, minHeight: isMobile ? 'auto' : 500, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
                    {/* Mobile backdrop */}
                    {isMobile && sidebarOpen && (
                        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40 }} />
                    )}
                    {/* Sidebar danh mục flat */}
                    <div style={isMobile ? {
                        position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-260px', width: 240, height: '100vh',
                        zIndex: 50, transition: 'left 0.25s ease', boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.2)' : 'none',
                        overflowY: 'auto', background: 'var(--surface-alt)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column'
                    } : { width: 210, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-alt)' }}>
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-color)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8 }}>DANH MỤC</div>
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-color)' }}>
                            <input className="form-input" placeholder="Tìm kiếm..." value={searchL} onChange={e => setSearchL(e.target.value)} style={{ fontSize: 12, padding: '5px 8px', width: '100%' }} />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                            <div
                                onClick={() => setFilterCatL('')}
                                style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: filterCatL === '' ? 'var(--accent-primary)' : 'transparent', color: filterCatL === '' ? '#fff' : 'var(--text-primary)', fontWeight: filterCatL === '' ? 700 : 400, borderRadius: 6, margin: '0 4px' }}
                            >
                                <span>Tất cả</span>
                                <span style={{ fontSize: 11, opacity: 0.75 }}>{library.length}</span>
                            </div>
                            {lCats.map(c => (
                                <div key={c} style={{ margin: '1px 4px' }}>
                                    {editingLibCat?.old === c ? (
                                        <div style={{ padding: '4px 6px' }}>
                                            <input autoFocus value={editingLibCat.new}
                                                onChange={e => setEditingLibCat(p => ({ ...p, new: e.target.value }))}
                                                onBlur={saveRenameLibCat}
                                                onKeyDown={e => { if (e.key === 'Enter') saveRenameLibCat(); if (e.key === 'Escape') setEditingLibCat(null); }}
                                                style={{ width: '100%', fontSize: 12, padding: '4px 8px', border: '1px solid var(--accent-primary)', borderRadius: 6 }} />
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => setFilterCatL(c)}
                                            onDoubleClick={() => setEditingLibCat({ old: c, new: c })}
                                            title="Double-click để đổi tên"
                                            style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: filterCatL === c ? 'var(--accent-primary)' : 'transparent', color: filterCatL === c ? '#fff' : 'var(--text-primary)', fontWeight: filterCatL === c ? 700 : 400, borderRadius: 6 }}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📁 {c}</span>
                                            <span style={{ fontSize: 11, opacity: 0.7, flexShrink: 0, marginLeft: 4 }}>{library.filter(i => i.category === c).length}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '8px', borderTop: '1px solid var(--border-color)' }}>
                            <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: 12 }}
                                onClick={() => { setNewCatName(''); setShowAddCatModal(true); }}>
                                + Thêm danh mục
                            </button>
                        </div>
                    </div>

                    {/* Bảng hạng mục */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', overflow: 'hidden' }}>
                        <div className="card-header" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                                {isMobile && (
                                    <button onClick={() => setSidebarOpen(true)} style={{ padding: '5px 8px', border: '1px solid var(--border-color)', borderRadius: 6, background: filterCatL ? 'var(--primary)' : 'var(--surface-alt)', color: filterCatL ? '#fff' : 'var(--text-primary)', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>☰</button>
                                )}
                                <span style={{ fontSize: 13, fontWeight: 600 }}>
                                    {filterCatL ? `📁 ${filterCatL}` : 'Tất cả hạng mục'}
                                </span>
                                <span style={{ fontSize: 12, opacity: 0.5 }}>({filteredL.length})</span>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={addNewLib}>+ Thêm HM</button>
                        </div>
                        {loadingL ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                            <div style={{ overflowX: 'auto', flex: 1 }}>
                                <table className="data-table">
                                    <thead><tr>
                                        <th style={{ width: 44 }}>Ảnh</th>
                                        <th style={{ minWidth: 200 }}>Tên hạng mục</th>
                                        <th style={{ width: 55 }}>ĐVT</th>
                                        <th style={{ width: 120 }}>Đơn giá</th>
                                        <th style={{ width: 120 }}>VL chính</th>
                                        <th style={{ width: 100 }}>NC</th>
                                        <th style={{ width: 80 }}></th>
                                    </tr></thead>
                                    <tbody>
                                        {filteredL.map(item => {
                                            const isEditing = editingL?.id === item.id;
                                            const d = isEditing ? editingL.data : item;
                                            return (
                                                <tr key={item.id} style={{ background: isEditing ? 'rgba(99,102,241,0.04)' : '' }}>
                                                    <td style={{ padding: 4 }}><Thumb image={d.image} id={item.id} entity="library" /></td>
                                                    <td>{isEditing
                                                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                            <EditCell value={d.name} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, name: v } }))} />
                                                            <EditCell value={d.description || ''} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, description: v } }))} style={{ fontSize: 11 }} />
                                                        </div>
                                                        : <div>
                                                            <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                                                            {item.description && <div style={{ fontSize: 11, opacity: 0.5, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>}
                                                        </div>
                                                    }</td>
                                                    <td>{isEditing ? <EditCell value={d.unit} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, unit: v } }))} /> : item.unit}</td>
                                                    <td style={{ fontWeight: 600 }}>{isEditing ? <EditCell value={d.unitPrice} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, unitPrice: v } }))} type="number" /> : (item.unitPrice > 0 ? fmt(item.unitPrice) : '-')}</td>
                                                    <td style={{ fontSize: 12 }}>{isEditing ? <EditCell value={d.mainMaterial} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, mainMaterial: v } }))} type="number" /> : (item.mainMaterial > 0 ? fmt(item.mainMaterial) : '-')}</td>
                                                    <td style={{ fontSize: 12 }}>{isEditing ? <EditCell value={d.labor} onChange={v => setEditingL(e => ({ ...e, data: { ...e.data, labor: v } }))} type="number" /> : (item.labor > 0 ? fmt(item.labor) : '-')}</td>
                                                    <td><div style={{ display: 'flex', gap: 4 }}>
                                                        {isEditing
                                                            ? <><button className="btn btn-primary btn-sm" onClick={saveL} style={{ fontSize: 11 }}>✓ Lưu</button><button className="btn btn-ghost btn-sm" onClick={() => setEditingL(null)} style={{ fontSize: 11 }}>✕</button></>
                                                            : <><button className="btn btn-ghost btn-sm" onClick={() => startEditL(item)}>✏️</button><button className="btn btn-ghost btn-sm" onClick={() => deleteL(item.id)}>🗑️</button></>}
                                                    </div></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Product Modal — Full */}
            {editingP && (() => {
                const ep = editingP;
                const d = ep.data;
                const set = (field, value) => setEditingP(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
                const isManuf = normalizeSupply(d.supplyType) === 'Sản xuất nội bộ';
                const isSvc = normalizeSupply(d.supplyType) === 'Dịch vụ';
                return (
                    <div className="modal-overlay" onClick={() => setEditingP(null)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
                            <div className="modal-header">
                                <h3 style={{ margin: 0, fontSize: 15 }}>✏️ Sửa: {d.name || 'Sản phẩm'}</h3>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/products/${ep.id}`)} style={{ fontSize: 11 }}>🔗 Chi tiết</button>
                                    <button className="modal-close" onClick={() => setEditingP(null)}>×</button>
                                </div>
                            </div>
                            <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                                {/* Image + Name row */}
                                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                                    <div style={{ flexShrink: 0 }}>
                                        <div onClick={() => { imgUpTarget.current = ep.id; imgUpRef.current?.click(); }}
                                            style={{ width: 80, height: 80, borderRadius: 8, border: '2px dashed var(--border-color)', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-alt)', position: 'relative' }}
                                            title="Click để đổi ảnh">
                                            {d.image
                                                ? <img src={d.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <span style={{ fontSize: 28, opacity: 0.2 }}>📷</span>}
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s', color: '#fff', fontSize: 18 }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={e => e.currentTarget.style.opacity = 0}>📤</div>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div className="form-group" style={{ margin: 0 }}>
                                            <label className="form-label">Tên sản phẩm</label>
                                            <input className="form-input" value={d.name || ''} onChange={e => set('name', e.target.value)} autoFocus style={{ fontWeight: 600 }} />
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div className="form-group" style={{ margin: 0, flex: 1 }}>
                                                <label className="form-label">ĐVT</label>
                                                <input className="form-input" value={d.unit || ''} onChange={e => set('unit', e.target.value)} />
                                            </div>
                                            <div className="form-group" style={{ margin: 0, flex: 2 }}>
                                                <label className="form-label">Danh mục</label>
                                                <select className="form-select" value={d.category || ''} onChange={e => set('category', e.target.value)}>
                                                    {allCats.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Nguồn cung */}
                                <div className="form-group" style={{ marginBottom: 10 }}>
                                    <label className="form-label">Nguồn cung</label>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {SUPPLY_TYPES.map(t => (
                                            <button key={t} type="button"
                                                className={`btn btn-sm ${normalizeSupply(d.supplyType) === t ? `btn-${SUPPLY_BADGE[t] || 'primary'}` : 'btn-ghost'}`}
                                                style={{ fontSize: 11, flex: 1 }}
                                                onClick={() => set('supplyType', t)}>
                                                {SUPPLY_ICON[t]} {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Giá & Tồn */}
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Giá nhập</label>
                                        <input className="form-input" type="number" value={d.importPrice || 0} onChange={e => set('importPrice', Number(e.target.value))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Giá bán</label>
                                        <input className="form-input" type="number" value={d.salePrice || 0} onChange={e => set('salePrice', Number(e.target.value))} />
                                    </div>
                                    {!isSvc && <>
                                        <div className="form-group">
                                            <label className="form-label">Tồn kho</label>
                                            <input className="form-input" type="number" value={d.stock ?? 0} onChange={e => set('stock', Number(e.target.value))} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tồn tối thiểu</label>
                                            <input className="form-input" type="number" value={d.minStock ?? 0} onChange={e => set('minStock', Number(e.target.value))} />
                                        </div>
                                    </>}
                                </div>

                                {/* Thương hiệu & NCC */}
                                <div className="form-row">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Thương hiệu</label>
                                        <input className="form-input" list="brand-list-edit" value={d.brand || ''} onChange={e => set('brand', e.target.value)} placeholder="Nhập hoặc chọn thương hiệu..." />
                                        <datalist id="brand-list-edit">{BRANDS.filter(b => b.n).map(b => <option key={b.n} value={b.n} />)}</datalist>
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="form-label">Nhà cung cấp</label>
                                        <input className="form-input" value={d.supplier || ''} onChange={e => set('supplier', e.target.value)} />
                                    </div>
                                </div>

                                {/* Kích thước & Vật liệu */}
                                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: 8, paddingTop: 10 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5 }}>CHI TIẾT</div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Kích thước</label>
                                            <input className="form-input" value={d.dimensions || ''} onChange={e => set('dimensions', e.target.value)} placeholder="DxRxC" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Trọng lượng (kg)</label>
                                            <input className="form-input" type="number" value={d.weight || 0} onChange={e => set('weight', Number(e.target.value))} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Màu sắc</label>
                                            <input className="form-input" value={d.color || ''} onChange={e => set('color', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Chất liệu</label>
                                            <input className="form-input" value={d.material || ''} onChange={e => set('material', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Xuất xứ</label>
                                            <input className="form-input" value={d.origin || ''} onChange={e => set('origin', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Bảo hành</label>
                                            <input className="form-input" value={d.warranty || ''} onChange={e => set('warranty', e.target.value)} placeholder="VD: 12 tháng" />
                                        </div>
                                    </div>
                                    {isManuf && (
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Chất liệu cốt</label>
                                                <select className="form-select" value={d.coreBoard || ''} onChange={e => set('coreBoard', e.target.value)}>
                                                    <option value="">-- Chọn --</option>
                                                    {CORE_BOARD_TYPES.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Mã bề mặt</label>
                                                <input className="form-input" value={d.surfaceCode || ''} onChange={e => set('surfaceCode', e.target.value)} placeholder="VD: 388EV" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label className="form-label">Mô tả</label>
                                        <textarea className="form-input" rows={2} value={d.description || ''} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setEditingP(null)}>Hủy</button>
                                <button className="btn btn-primary" onClick={saveP}>💾 Lưu thay đổi</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Add Product Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>Thêm sản phẩm mới</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Tên sản phẩm *</label>
                                    <input className="form-input" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Tủ áo MDF An Cường" autoFocus />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">ĐVT *</label>
                                    <input className="form-input" value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} placeholder="cái" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Danh mục *</label>
                                    <select className="form-select" value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                                        {allCats.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Giá bán</label>
                                    <input className="form-input" type="number" value={addForm.salePrice} onChange={e => setAddForm(f => ({ ...f, salePrice: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Thương hiệu</label>
                                    <input className="form-input" list="brand-list-add" value={addForm.brand} onChange={e => setAddForm(f => ({ ...f, brand: e.target.value }))} placeholder="Nhập hoặc chọn thương hiệu..." />
                                    <datalist id="brand-list-add">{BRANDS.filter(b => b.n).map(b => <option key={b.n} value={b.n} />)}</datalist>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nguồn cung *</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {SUPPLY_TYPES.map(t => (
                                        <button key={t} type="button"
                                            className={`btn btn-sm ${addForm.supplyType === t ? `btn-${SUPPLY_BADGE[t] || 'primary'}` : 'btn-ghost'}`}
                                            style={{ fontSize: 12, flex: 1, minWidth: 120 }}
                                            onClick={() => setAddForm(f => ({ ...f, supplyType: t }))}>
                                            {SUPPLY_ICON[t]} {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {addForm.supplyType === 'Mua ngoài' && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Tồn kho ban đầu</label>
                                        <input className="form-input" type="number" value={addForm.stock} onChange={e => setAddForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tồn tối thiểu</label>
                                        <input className="form-input" type="number" value={addForm.minStock} onChange={e => setAddForm(f => ({ ...f, minStock: Number(e.target.value) }))} placeholder="Cảnh báo sắp hết" />
                                    </div>
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <label className="form-label">Nhà cung cấp</label>
                                        <input className="form-input" value={addForm.supplier} onChange={e => setAddForm(f => ({ ...f, supplier: e.target.value }))} placeholder="VD: Hafele Vietnam, Blum..." />
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">Kích thước</label>
                                <input className="form-input" value={addForm.dimensions || ''} onChange={e => setAddForm(f => ({ ...f, dimensions: e.target.value }))} placeholder="VD: 600x800x20, D600 x R400 x C200..." />
                            </div>
                            {addForm.supplyType === 'Sản xuất nội bộ' && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Chất liệu cốt</label>
                                            <select className="form-select" value={addForm.coreBoard} onChange={e => setAddForm(f => ({ ...f, coreBoard: e.target.value }))}>
                                                <option value="">-- Chọn --</option>
                                                {CORE_BOARD_TYPES.map(c => <option key={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Mã bề mặt / Mã màu</label>
                                            <input className="form-input" value={addForm.surfaceCode} onChange={e => setAddForm(f => ({ ...f, surfaceCode: e.target.value }))} placeholder="VD: 388EV, U5002..." />
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px 14px', background: 'rgba(35,64,147,0.06)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', borderLeft: '3px solid var(--primary)' }}>
                                        💡 Sau khi lưu, vào trang chi tiết sản phẩm để khai báo <strong>Định mức vật tư (BOM)</strong> — danh sách ván gỗ, nẹp chỉ cần dùng.
                                    </div>
                                </>
                            )}
                            {addForm.supplyType === 'Dịch vụ' && (
                                <div style={{ padding: '12px 14px', background: 'rgba(167,139,250,0.08)', borderRadius: 8, fontSize: 12.5, color: 'var(--text-secondary)', borderLeft: '3px solid var(--status-purple)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--status-purple)', marginBottom: 4 }}>🧠 Dịch vụ / Chất xám</div>
                                    Dịch vụ không có tồn kho hay vật tư. Chỉ cần <strong>đơn giá</strong> để sử dụng trong báo giá và hợp đồng.
                                    <br />VD: Thiết kế kiến trúc, Tư vấn nội thất, Giám sát công trình.
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveNewProduct}>Tạo sản phẩm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Library Category Modal */}
            {showAddCatModal && (
                <div className="modal-overlay" onClick={() => setShowAddCatModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>📁 Thêm danh mục mới</h3>
                            <button className="modal-close" onClick={() => setShowAddCatModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Tên danh mục *</label>
                                <input
                                    className="form-input"
                                    autoFocus
                                    value={newCatName}
                                    onChange={e => setNewCatName(e.target.value)}
                                    placeholder="VD: Nhân công, Sơn bả, Điện nước..."
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && newCatName.trim()) {
                                            setFilterCatL(newCatName.trim());
                                            setShowAddCatModal(false);
                                            setNewLibItem({ name: '', category: newCatName.trim(), subcategory: '', unit: 'cái', mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '' });
                                            setShowAddLibModal(true);
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAddCatModal(false)}>Hủy</button>
                            <button className="btn btn-primary" disabled={!newCatName.trim()} onClick={() => {
                                setFilterCatL(newCatName.trim());
                                setShowAddCatModal(false);
                                setNewLibItem({ name: '', category: newCatName.trim(), subcategory: '', unit: 'cái', mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '' });
                                setShowAddLibModal(true);
                            }}>Tạo danh mục</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Library Item Modal */}
            {showAddLibModal && newLibItem && (
                <div className="modal-overlay" onClick={() => { setShowAddLibModal(false); setNewLibItem(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>🔧 Thêm hạng mục thi công</h3>
                            <button className="modal-close" onClick={() => { setShowAddLibModal(false); setNewLibItem(null); }}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Tên hạng mục *</label>
                                    <input className="form-input" autoFocus value={newLibItem.name} onChange={e => setNewLibItem(p => ({ ...p, name: e.target.value }))} placeholder="VD: Sơn tường Dulux 2 lớp" onKeyDown={e => e.key === 'Enter' && saveNewLib()} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">ĐVT *</label>
                                    <input className="form-input" value={newLibItem.unit} onChange={e => setNewLibItem(p => ({ ...p, unit: e.target.value }))} placeholder="m2" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Danh mục</label>
                                    <input className="form-input" list="lib-cat-list" value={newLibItem.category} onChange={e => setNewLibItem(p => ({ ...p, category: e.target.value }))} placeholder="VD: Nhân công, Sơn..." />
                                    <datalist id="lib-cat-list">{lCats.map(c => <option key={c} value={c} />)}</datalist>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Đơn giá</label>
                                    <input className="form-input" type="number" value={newLibItem.unitPrice || ''} onChange={e => setNewLibItem(p => ({ ...p, unitPrice: Number(e.target.value) }))} placeholder="0" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">VL chính</label>
                                    <input className="form-input" type="number" value={newLibItem.mainMaterial || ''} onChange={e => setNewLibItem(p => ({ ...p, mainMaterial: Number(e.target.value) }))} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nhân công</label>
                                    <input className="form-input" type="number" value={newLibItem.labor || ''} onChange={e => setNewLibItem(p => ({ ...p, labor: Number(e.target.value) }))} placeholder="0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">VL phụ</label>
                                    <input className="form-input" type="number" value={newLibItem.auxMaterial || ''} onChange={e => setNewLibItem(p => ({ ...p, auxMaterial: Number(e.target.value) }))} placeholder="0" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mô tả</label>
                                <textarea className="form-input" rows={2} value={newLibItem.description} onChange={e => setNewLibItem(p => ({ ...p, description: e.target.value }))} placeholder="Ghi chú thêm về quy cách, tiêu chuẩn..." style={{ resize: 'vertical' }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => { setShowAddLibModal(false); setNewLibItem(null); }}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveNewLib}>Tạo hạng mục</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Paste from Excel modal */}
            {showPasteModal && (
                <div className="modal-overlay" onClick={() => setShowPasteModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0 }}>📋 Paste từ Excel</h3>
                            <button className="modal-close" onClick={() => setShowPasteModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ padding: '8px 12px', background: 'rgba(35,64,147,0.06)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, borderLeft: '3px solid #234093' }}>
                                💡 Copy các ô từ Excel (bao gồm hàng tiêu đề), rồi <strong>Ctrl+V</strong> vào ô bên dưới.
                                <br />Header hỗ trợ: <strong>Tên, Danh mục, ĐVT, Giá bán, Giá nhập, Tồn kho, Thương hiệu, Nguồn cung, Nhà cung cấp</strong>
                            </div>
                            <textarea
                                autoFocus
                                value={pasteText}
                                onChange={e => setPasteText(e.target.value)}
                                placeholder="Ctrl+V paste dữ liệu từ Excel vào đây...&#10;&#10;Ví dụ:&#10;Tên&#9;Danh mục&#9;ĐVT&#9;Giá bán&#10;Bản lề Blum&#9;Phụ kiện nội thất&#9;bộ&#9;350000"
                                style={{ width: '100%', minHeight: 180, fontSize: 12, fontFamily: 'monospace', padding: 10, border: '1px solid var(--border-color)', borderRadius: 6, resize: 'vertical', background: 'var(--bg-input)' }}
                            />
                            {pasteText && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{pasteText.split('\n').filter(l => l.trim()).length} dòng phát hiện</div>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowPasteModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={() => parsePastedText(pasteText)} disabled={!pasteText.trim()}>🔍 Xử lý & Preview</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import preview modal with validation */}
            {importPreview && (() => {
                const validCount = importPreview.filter(p => p._enabled && p._errors.length === 0).length;
                const errorCount = importPreview.filter(p => p._errors.length > 0).length;
                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, maxWidth: 860, width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>📥 Xem trước import — {importPreview.length} dòng</h3>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <button className="btn btn-ghost btn-sm" onClick={downloadTemplate} title="Tải file mẫu Excel">📄 Tải mẫu</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setImportPreview(null)}>✕</button>
                                </div>
                            </div>
                            {errorCount > 0 && <div style={{ padding: '8px 12px', background: 'rgba(231,76,60,0.08)', borderRadius: 6, fontSize: 12, color: '#dc2626', borderLeft: '3px solid #dc2626' }}>⚠️ {errorCount} dòng có lỗi (sẽ bị bỏ qua). Hợp lệ: <strong>{validCount}</strong></div>}
                            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-color)', borderRadius: 6 }}>
                                <table className="data-table" style={{ fontSize: 11.5 }}>
                                    <thead><tr><th style={{ width: 30 }}></th><th style={{ width: 35 }}>Row</th><th>Tên sản phẩm</th><th>Danh mục</th><th style={{ width: 45 }}>ĐVT</th><th style={{ width: 90 }}>Giá bán</th><th style={{ width: 90 }}>Giá nhập</th><th style={{ width: 45 }}>Tồn</th><th>Nguồn cung</th><th>Lỗi</th></tr></thead>
                                    <tbody>{importPreview.map((p, i) => (
                                        <tr key={i} style={{ opacity: p._enabled ? 1 : 0.4, background: p._errors.length > 0 ? 'rgba(231,76,60,0.04)' : '' }}>
                                            <td style={{ padding: '3px 4px' }}><input type="checkbox" checked={p._enabled} onChange={() => toggleImportRow(i)} disabled={p._errors.length > 0} /></td>
                                            <td style={{ opacity: .4, fontSize: 10 }}>{p._row}</td>
                                            <td style={{ fontWeight: 600 }}>{p.name || <span style={{ color: '#dc2626' }}>—</span>}</td>
                                            <td><span className="badge badge-default" style={{ fontSize: 10 }}>{p.category || '-'}</span></td>
                                            <td>{p.unit}</td>
                                            <td style={{ color: 'var(--status-success)' }}>{p.salePrice > 0 ? fmtCur(p.salePrice) : '—'}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{p.importPrice > 0 ? fmtCur(p.importPrice) : '—'}</td>
                                            <td>{p.stock}</td>
                                            <td style={{ fontSize: 10 }}>{p.supplyType || 'Mua ngoài'}</td>
                                            <td>{p._errors.length > 0 ? <span style={{ color: '#dc2626', fontSize: 10 }}>{p._errors.join(', ')}</span> : <span style={{ color: '#16a34a', fontSize: 10 }}>✓</span>}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, opacity: 0.5, marginRight: 'auto' }}>Bulk insert • Trùng tên tự bỏ qua</span>
                                <button className="btn btn-ghost" onClick={() => setImportPreview(null)}>Hủy</button>
                                <button className="btn btn-primary" onClick={confirmImport} disabled={importing || validCount === 0}>
                                    {importing ? '⏳ Đang import...' : `✅ Import ${validCount} SP`}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Hidden image upload input (product images) */}
            <input ref={imgUpRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgUpload} />

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
                .data-table, .product-card, .form-input, .form-select, .btn { font-family: 'Montserrat', sans-serif; }
                .thumb-wrap { position: relative; }
                .thumb-wrap .thumb-overlay { position: absolute; inset: 0; border-radius: 5px; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; font-size: 13px; color: #fff; }
                .thumb-wrap:hover .thumb-overlay { opacity: 1; }
                .product-card:hover { box-shadow: 0 4px 16px rgba(35,64,147,0.12); transform: translateY(-2px); }
                .product-card .card-img-overlay { opacity: 0; }
                .product-card:hover .card-img-overlay { opacity: 1 !important; }
            `}</style>
        </div>
    );
}
