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
    const [tab, setTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [loadingP, setLoadingP] = useState(true);
    const [searchP, setSearchP] = useState('');
    const [filterSupplyType, setFilterSupplyType] = useState('');
    const [filterStockStatus, setFilterStockStatus] = useState('');
    const [editingP, setEditingP] = useState(null);
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
    const [editingLibCat, setEditingLibCat] = useState(null);
    const excelInputRef = useRef(null);
    const [importPreview, setImportPreview] = useState(null);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(null);
    const [uploadTarget, setUploadTarget] = useState(null);
    const activeThumb = useRef(null);
    const imgUpRef = useRef(null);
    const imgUpTarget = useRef(null);

    const fetchCategories = useCallback(() => {
        fetch('/api/product-categories').then(r => r.json()).then(async cats => {
            if (cats && cats.length > 0) {
                setCategories(cats);
            } else {
                // Fallback: fetch ALL products to build categories (independent of current filter)
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
    }, []);

    const fetchProducts = useCallback((reset = true) => {
        if (reset) { setLoadingP(true); setProducts([]); setCursor(null); setHasMore(true); }
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
        // Use categoryId for real categories, category string for fallback
        if (activeCatId && !activeCatId.startsWith('__str__')) params.set('categoryId', activeCatId);
        else if (activeCatName) params.set('category', activeCatName);
        if (searchP) params.set('search', searchP);
        if (filterSupplyType) params.set('supplyType', filterSupplyType);
        fetch(`/api/products?${params}`).then(r => r.json()).then(d => {
            const items = d.data || [];
            setProducts(items);
            setCursor(items.length === PAGE_SIZE ? items[items.length - 1].id : null);
            setHasMore(items.length === PAGE_SIZE);
            setLoadingP(false);
        });
    }, [activeCatId, activeCatName, searchP, filterSupplyType]);

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

    useEffect(() => { fetchCategories(); fetchLibrary(); }, []);
    useEffect(() => { fetchProducts(); }, [fetchProducts]);

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
    const flatCats = [];
    const walkCats = (cats, depth = 0) => { for (const c of cats) { flatCats.push({ ...c, depth }); if (c.children) walkCats(c.children, depth + 1); } };
    walkCats(categories);
    const allCats = [...new Set([...PRODUCT_CATS, ...flatCats.map(c => c.name)])].sort();
    const filteredP = products.filter(p => (!filterStockStatus || stockStatus(p) === filterStockStatus));

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
    const deleteP = async (id) => { if (!confirm('Xóa sản phẩm?')) return; await fetch(`/api/products/${id}`, { method: 'DELETE' }); fetchProducts(); fetchCategories(); };
    const duplicateP = async (p) => {
        const { id, code, createdAt, updatedAt, categoryRef, ...rest } = p;
        await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rest, name: rest.name + ' (2)', stock: 0 }) });
        fetchProducts(); fetchCategories();
    };
    const quickUpdateStock = async (productId, newStock) => {
        await fetch(`/api/products/${productId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock: Number(newStock) }) });
        fetchProducts();
    };
    const addNewProduct = () => {
        const activeCat = flatCats.find(c => c.id === activeCatId);
        setAddForm({ name: '', category: activeCat?.name || 'Nội thất thành phẩm', unit: 'cái', salePrice: 0, importPrice: 0, brand: '', supplyType: 'Mua ngoài', stock: 0, minStock: 0, supplier: '', coreBoard: '', surfaceCode: '', image: '', categoryId: activeCatId || null });
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
    const addNewLib = () => setNewLibItem({ name: '', category: filterCatL || '', subcategory: '', unit: 'cái', mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '' });
    const saveNewLib = async () => {
        if (!newLibItem?.name?.trim()) return alert('Nhập tên hạng mục');
        const res = await fetch('/api/work-item-library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLibItem) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo'); }
        setNewLibItem(null); fetchLibrary();
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
            const name = (r['Tên'] || r['name'] || r['Tên sản phẩm'] || '').trim();
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
                name, category: r['Danh mục'] || r['category'] || '',
                unit: r['ĐVT'] || r['unit'] || 'cái', salePrice, importPrice,
                stock, minStock: Number(r['Tồn tối thiểu'] || r['minStock'] || 0),
                brand: r['Thương hiệu'] || r['brand'] || '',
                supplyType: r['Nguồn cung'] || r['supplyType'] || 'Mua ngoài',
                _errors: errors, _enabled: errors.length === 0, _row: idx + 2,
            };
        }).filter(p => p.name || p._errors.length > 0);
        setImportPreview(mapped);
        e.target.value = '';
    };
    const toggleImportRow = (idx) => setImportPreview(prev => prev.map((p, i) => i === idx ? { ...p, _enabled: !p._enabled } : p));
    const confirmImport = async () => {
        const toImport = importPreview.filter(p => p._enabled && p._errors.length === 0);
        if (!toImport.length) return alert('Không có sản phẩm hợp lệ để import');
        setImporting(true);
        // Batch: POST 10 at a time
        for (let i = 0; i < toImport.length; i += 10) {
            const batch = toImport.slice(i, i + 10);
            await Promise.all(batch.map(({ _errors, _enabled, _row, ...p }) =>
                fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
            ));
        }
        setImporting(false); setImportPreview(null); fetchProducts(); fetchCategories();
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

    return (
        <div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', marginBottom: 20 }}>
                {[['products', `📦 Sản phẩm (${products.length})`], ['library', `🔧 Hạng mục thi công (${library.length})`]].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)} style={{ padding: '9px 22px', border: 'none', borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', marginBottom: -2, fontSize: 13, fontWeight: tab === key ? 700 : 400, color: tab === key ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>{label}</button>
                ))}
            </div>

            {/* ===== PRODUCTS ===== */}
            {tab === 'products' && (
                <div style={{ display: 'flex', minHeight: 'calc(100vh - 200px)', border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                    <CategorySidebar categories={categories} activeCatId={activeCatId}
                        onSelect={id => {
                            setActiveCatId(id);
                            // If it's a fake string category, set name for filtering
                            if (id?.startsWith('__str__')) {
                                const cat = categories.find(c => c.id === id);
                                setActiveCatName(cat?.name || null);
                            } else {
                                setActiveCatName(null);
                            }
                            setSelectedIds(new Set());
                        }}
                        totalCount={products.length} onRefresh={() => { fetchCategories(); fetchProducts(); }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 12, padding: '8px 16px', borderBottom: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-muted)', alignItems: 'center' }}>
                            <span>📦 <strong>{filteredP.length}</strong></span>
                            {lowStock > 0 && <span style={{ color: 'var(--status-danger)' }}>⚠️ {lowStock} sắp hết</span>}
                            <span style={{ opacity: 0.6 }}>💰 {fmtCur(products.reduce((s, p) => s + p.stock * p.salePrice, 0))}</span>
                        </div>
                        <div style={{ padding: '6px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input className="form-input" placeholder="🔍 Tìm tên, mã..." value={searchP} onChange={e => setSearchP(e.target.value)} style={{ width: 200, fontSize: 12, padding: '4px 8px' }} />
                            <select className="form-select" value={filterSupplyType} onChange={e => setFilterSupplyType(e.target.value)} style={{ fontSize: 11, width: 120, padding: '4px 6px' }}>
                                <option value="">Nguồn cung</option>{SUPPLY_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: 2, background: 'var(--surface-alt)', borderRadius: 6, padding: 2 }}>
                                {[['', 'Tất cả'], ['ok', '✅'], ['low', '⚠️'], ['out', '❌']].map(([v, l]) => (
                                    <button key={v} onClick={() => setFilterStockStatus(v)} style={{ fontSize: 10, padding: '3px 7px', border: 'none', borderRadius: 4, cursor: 'pointer', background: filterStockStatus === v ? '#fff' : 'transparent', fontWeight: filterStockStatus === v ? 600 : 400, boxShadow: filterStockStatus === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{l}</button>
                                ))}
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                                {selectedIds.size > 0 && <button className="btn btn-sm" style={{ fontSize: 11, background: '#ea580c', color: '#fff', border: 'none' }} onClick={() => { const bad = [...selectedIds].filter(id => normalizeSupply(products.find(p => p.id === id)?.supplyType) !== 'Mua ngoài'); if (bad.length) return alert('Chỉ chọn SP "Mua ngoài"'); router.push('/purchasing?createPO=1&products=' + [...selectedIds].join(',')); }}>🛒 PO ({selectedIds.size})</button>}
                                <button className="btn btn-primary btn-sm" onClick={addNewProduct} style={{ fontSize: 11 }}>+ Thêm</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => excelInputRef.current?.click()} title="Import Excel">📥</button>
                                <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelFile} />
                            </div>
                        </div>
                        <BulkActionsBar selectedIds={selectedIds} categories={flatCats} onDone={() => { setSelectedIds(new Set()); fetchProducts(); fetchCategories(); }} />
                        {loadingP ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <table className="data-table" style={{ fontSize: 12 }}>
                                    <thead><tr>
                                        <th style={{ width: 30, padding: '4px' }}><input type="checkbox" checked={filteredP.length > 0 && filteredP.every(p => selectedIds.has(p.id))} onChange={e => setSelectedIds(e.target.checked ? new Set(filteredP.map(p => p.id)) : new Set())} /></th>
                                        <th style={{ width: 34 }}>Ảnh</th><th style={{ minWidth: 170 }}>Tên SP</th><th style={{ width: 45 }}>ĐVT</th>
                                        <th style={{ width: 95 }}>Giá bán</th><th style={{ width: 55 }}>Tồn</th><th style={{ width: 95 }}>Nguồn</th><th style={{ width: 85 }}>TH</th><th style={{ width: 75 }}></th>
                                    </tr></thead>
                                    <tbody>{filteredP.map(p => {
                                        const ss = stockStatus(p);
                                        return (<tr key={p.id} style={{ background: ss === 'out' ? 'rgba(231,76,60,0.03)' : ss === 'low' ? 'rgba(234,88,12,0.02)' : '' }}>
                                            <td style={{ padding: 4, textAlign: 'center' }}><input type="checkbox" checked={selectedIds.has(p.id)} onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(p.id) : n.delete(p.id); setSelectedIds(n); }} /></td>
                                            <td style={{ padding: 3, cursor: 'pointer' }} onClick={() => { imgUpTarget.current = p.id; imgUpRef.current?.click(); }}><div style={{ width: 30, height: 30, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.image ? <img src={p.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 12, opacity: 0.2 }}>📷</span>}</div></td>
                                            <td style={{ padding: '3px 6px' }}><div><div style={{ fontWeight: 600, fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }} onClick={() => router.push(`/products/${p.id}`)}>{p.name}</div><div style={{ fontSize: 10, opacity: 0.4 }}><span style={{ fontFamily: 'monospace' }}>{p.code}</span>{p.category && <span style={{ marginLeft: 4, background: 'var(--surface-alt)', borderRadius: 3, padding: '0 4px' }}>{p.category}</span>}</div></div></td>
                                            <td style={{ padding: '3px 4px' }}>{p.unit}</td>
                                            <td style={{ fontWeight: 600, padding: '3px 4px' }}>{fmtCur(p.salePrice)}</td>
                                            <td style={{ padding: '3px 4px' }}>{isService(p) ? <span style={{ opacity: 0.3 }}>—</span> : <StockCell value={p.stock} status={ss} onSave={v => quickUpdateStock(p.id, v)} />}</td>
                                            <td style={{ padding: '3px 4px' }}><span className={`badge ${SUPPLY_BADGE[p.supplyType] || 'muted'}`} style={{ fontSize: 10 }}>{normalizeSupply(p.supplyType)}</span></td>
                                            <td style={{ fontSize: 11, padding: '3px 4px' }}>{p.brand || <span style={{ opacity: 0.2 }}>-</span>}</td>
                                            <td style={{ padding: '3px 4px' }}><div style={{ display: 'flex', gap: 1 }}><button className="btn btn-ghost btn-sm" onClick={() => startEditP(p)} style={{ fontSize: 11, padding: '1px 3px' }}>✏️</button><button className="btn btn-ghost btn-sm" onClick={() => duplicateP(p)} style={{ fontSize: 11, padding: '1px 3px' }}>📋</button><button className="btn btn-ghost btn-sm" onClick={() => deleteP(p.id)} style={{ fontSize: 11, padding: '1px 3px' }}>🗑️</button></div></td>
                                        </tr>);
                                    })}</tbody>
                                </table>
                                {hasMore && <div ref={sentinelRef} style={{ padding: 16, textAlign: 'center', opacity: 0.4, fontSize: 11 }}>Đang tải thêm...</div>}
                                {!hasMore && filteredP.length > 0 && <div style={{ padding: 10, textAlign: 'center', opacity: 0.25, fontSize: 10 }}>— Hết —</div>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== LIBRARY ===== */}
            {tab === 'library' && (
                <div style={{ display: 'flex', gap: 0, minHeight: 500, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {/* Sidebar danh mục flat */}
                    <div style={{ width: 210, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', background: 'var(--surface-alt)' }}>
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
                                onClick={() => { const name = prompt('Tên danh mục mới:'); if (name?.trim()) { setFilterCatL(name.trim()); setNewLibItem({ name: '', category: name.trim(), subcategory: '', unit: 'cái', mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '' }); } }}>
                                + Thêm danh mục
                            </button>
                        </div>
                    </div>

                    {/* Bảng hạng mục */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', overflow: 'hidden' }}>
                        <div className="card-header" style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
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
                                        {newLibItem && (
                                            <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
                                                <td style={{ padding: 4 }}><div style={{ width: 36, height: 36, borderRadius: 5, border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>📷</div></td>
                                                <td><EditCell value={newLibItem.name} onChange={v => setNewLibItem(p => ({ ...p, name: v }))} /></td>
                                                <td><EditCell value={newLibItem.unit} onChange={v => setNewLibItem(p => ({ ...p, unit: v }))} /></td>
                                                <td><EditCell value={newLibItem.unitPrice} onChange={v => setNewLibItem(p => ({ ...p, unitPrice: v }))} type="number" /></td>
                                                <td><EditCell value={newLibItem.mainMaterial} onChange={v => setNewLibItem(p => ({ ...p, mainMaterial: v }))} type="number" /></td>
                                                <td><EditCell value={newLibItem.labor} onChange={v => setNewLibItem(p => ({ ...p, labor: v }))} type="number" /></td>
                                                <td><div style={{ display: 'flex', gap: 4 }}>
                                                    <button className="btn btn-primary btn-sm" onClick={saveNewLib} style={{ fontSize: 11 }}>✓</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setNewLibItem(null)} style={{ fontSize: 11 }}>✕</button>
                                                </div></td>
                                            </tr>
                                        )}
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

            {/* Quick Edit Product Modal */}
            {editingP && (
                <div className="modal-overlay" onClick={() => setEditingP(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>✏️ Chỉnh sửa nhanh</h3>
                            <button className="modal-close" onClick={() => setEditingP(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Tên sản phẩm</label>
                                    <input className="form-input" value={editingP.data.name || ''} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, name: e.target.value } }))} autoFocus />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">ĐVT</label>
                                    <input className="form-input" value={editingP.data.unit || ''} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, unit: e.target.value } }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Danh mục</label>
                                    <select className="form-select" value={editingP.data.category || ''} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, category: e.target.value } }))}>
                                        {allCats.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Nguồn cung</label>
                                    <select className="form-select" value={normalizeSupply(editingP.data.supplyType)} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, supplyType: e.target.value } }))}>
                                        {SUPPLY_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Giá nhập</label>
                                    <input className="form-input" type="number" value={editingP.data.importPrice || 0} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, importPrice: Number(e.target.value) } }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Giá bán</label>
                                    <input className="form-input" type="number" value={editingP.data.salePrice || 0} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, salePrice: Number(e.target.value) } }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tồn kho</label>
                                    <input className="form-input" type="number" value={editingP.data.stock ?? 0} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, stock: Number(e.target.value) } }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tồn tối thiểu</label>
                                    <input className="form-input" type="number" value={editingP.data.minStock ?? 0} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, minStock: Number(e.target.value) } }))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Thương hiệu</label>
                                    <select className="form-select" value={editingP.data.brand || ''} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, brand: e.target.value } }))}>
                                        {BRANDS.map(b => <option key={b.n} value={b.n}>{b.n || '-- Không --'}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Nhà cung cấp</label>
                                    <input className="form-input" value={editingP.data.supplier || ''} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, supplier: e.target.value } }))} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setEditingP(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveP}>Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Product Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
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
                                    <select className="form-select" value={addForm.brand} onChange={e => setAddForm(f => ({ ...f, brand: e.target.value }))}>
                                        {BRANDS.map(b => <option key={b.n} value={b.n}>{b.n || '-- Không --'}</option>)}
                                    </select>
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

            {/* Import preview modal with validation */}
            {importPreview && (() => {
                const validCount = importPreview.filter(p => p._enabled && p._errors.length === 0).length;
                const errorCount = importPreview.filter(p => p._errors.length > 0).length;
                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, maxWidth: 820, width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0 }}>📥 Import — {importPreview.length} dòng</h3>
                                <button className="btn btn-ghost btn-sm" onClick={() => setImportPreview(null)}>✕</button>
                            </div>
                            {errorCount > 0 && <div style={{ padding: '8px 12px', background: 'rgba(231,76,60,0.08)', borderRadius: 6, fontSize: 12, color: '#dc2626', borderLeft: '3px solid #dc2626' }}>⚠️ {errorCount} dòng có lỗi (sẽ bị bỏ qua). Các dòng hợp lệ: <strong>{validCount}</strong></div>}
                            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-color)', borderRadius: 6 }}>
                                <table className="data-table" style={{ fontSize: 11.5 }}>
                                    <thead><tr><th style={{ width: 30 }}></th><th style={{ width: 35 }}>Row</th><th>Tên</th><th>Danh mục</th><th style={{ width: 45 }}>ĐVT</th><th style={{ width: 85 }}>Giá bán</th><th style={{ width: 45 }}>Tồn</th><th>Lỗi</th></tr></thead>
                                    <tbody>{importPreview.map((p, i) => (
                                        <tr key={i} style={{ opacity: p._enabled ? 1 : 0.4, background: p._errors.length > 0 ? 'rgba(231,76,60,0.04)' : '' }}>
                                            <td style={{ padding: '3px 4px' }}><input type="checkbox" checked={p._enabled} onChange={() => toggleImportRow(i)} disabled={p._errors.length > 0} /></td>
                                            <td style={{ opacity: .4, fontSize: 10 }}>{p._row}</td>
                                            <td style={{ fontWeight: 600 }}>{p.name || <span style={{ color: '#dc2626' }}>—</span>}</td>
                                            <td><span className="badge badge-default" style={{ fontSize: 10 }}>{p.category || '-'}</span></td>
                                            <td>{p.unit}</td>
                                            <td>{fmtCur(p.salePrice)}</td>
                                            <td>{p.stock}</td>
                                            <td>{p._errors.length > 0 ? <span style={{ color: '#dc2626', fontSize: 10 }}>{p._errors.join(', ')}</span> : <span style={{ color: '#16a34a', fontSize: 10 }}>✓</span>}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, opacity: 0.5, marginRight: 'auto' }}>Batch 10/lần • Trùng tên tự bỏ qua</span>
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
                .thumb-wrap { position: relative; }
                .thumb-wrap .thumb-overlay { position: absolute; inset: 0; border-radius: 5px; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; font-size: 13px; color: #fff; }
                .thumb-wrap:hover .thumb-overlay { opacity: 1; }
            `}</style>
        </div>
    );
}
