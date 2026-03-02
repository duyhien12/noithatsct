'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n);
const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

const SUPPLY_TYPES = ['Mua ngoài', 'Sản xuất nội bộ', 'Dịch vụ'];
// Legacy values kept for backwards compat with existing DB records
const SUPPLY_BADGE = { 'Sản xuất nội bộ': 'info', 'Mua ngoài': 'success', 'Dịch vụ': 'purple', 'Mua thương mại': 'success', 'Vật tư lưu kho': 'success' };
const SUPPLY_ICON = { 'Mua ngoài': '🛒', 'Sản xuất nội bộ': '🔨', 'Dịch vụ': '🧠' };
const normalizeSupply = (t) => (t === 'Mua thương mại' || t === 'Vật tư lưu kho') ? 'Mua ngoài' : (t || 'Mua ngoài');
const CORE_BOARD_TYPES = ['MDF thường', 'MDF chống ẩm', 'MFC', 'Gỗ tự nhiên', 'Nhựa', 'Kính', 'Khác'];
const isService = (p) => normalizeSupply(p.supplyType) === 'Dịch vụ';
const stockStatus = (p) => isService(p) ? 'service' : p.stock === 0 ? 'out' : (p.minStock > 0 && p.stock <= p.minStock) ? 'low' : 'ok';

const BRANDS = [{ n: '', logo: '' }, { n: 'Dulux', logo: 'https://logo.clearbit.com/dulux.com' }, { n: 'Jotun', logo: 'https://logo.clearbit.com/jotun.com' }, { n: 'TOA', logo: 'https://logo.clearbit.com/toagroup.com' }, { n: 'Nippon', logo: 'https://logo.clearbit.com/nipponpaint.com' }, { n: 'Hafele', logo: 'https://logo.clearbit.com/hafele.com' }, { n: 'Blum', logo: 'https://logo.clearbit.com/blum.com' }, { n: 'Hettich', logo: 'https://logo.clearbit.com/hettich.com' }, { n: 'Panasonic', logo: 'https://logo.clearbit.com/panasonic.com' }, { n: 'Daikin', logo: 'https://logo.clearbit.com/daikin.com' }, { n: 'Mitsubishi', logo: 'https://logo.clearbit.com/mitsubishielectric.com' }, { n: 'Samsung', logo: 'https://logo.clearbit.com/samsung.com' }, { n: 'LG', logo: 'https://logo.clearbit.com/lg.com' }, { n: 'Rossi', logo: 'https://logo.clearbit.com/rossigroup.com.vn' }, { n: 'Caesar', logo: 'https://logo.clearbit.com/caesar.com.tw' }, { n: 'Toto', logo: 'https://logo.clearbit.com/toto.com' }, { n: 'Grohe', logo: 'https://logo.clearbit.com/grohe.com' }, { n: 'HMF', logo: '' }, { n: 'AA', logo: '' }, { n: 'Hoa Phat', logo: 'https://logo.clearbit.com/hoaphat.com.vn' }];
const PRODUCT_CATS = ['Nội thất thành phẩm', 'Gỗ tự nhiên', 'Gỗ công nghiệp', 'Đá & Gạch', 'Sơn & Keo', 'Phụ kiện nội thất', 'Thiết bị điện', 'Vật liệu xây dựng', 'Rèm cửa', 'Thiết bị vệ sinh', 'Điều hòa', 'Decor', 'Đồ rời', 'Phòng thờ'];

// Editable cell
function EditCell({ value, onChange, type = 'text', style = {}, options }) {
    if (options) return (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 12, background: 'var(--bg-input)', ...style }}>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );
    return <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)} style={{ width: '100%', padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 12, background: 'var(--bg-input)', ...style }} />;
}

export default function ProductsPage() {
    const router = useRouter();
    const [tab, setTab] = useState('products');

    // Products
    const [products, setProducts] = useState([]);
    const [loadingP, setLoadingP] = useState(true);
    const [searchP, setSearchP] = useState('');
    const [filterCatP, setFilterCatP] = useState('');
    const [filterSupplyType, setFilterSupplyType] = useState('');
    const [filterStockStatus, setFilterStockStatus] = useState('');
    const [editingP, setEditingP] = useState(null); // {id, data}
    const [newProduct, setNewProduct] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', category: 'Nội thất thành phẩm', unit: 'cái', salePrice: 0, importPrice: 0, brand: '', supplyType: 'Mua ngoài', stock: 0, minStock: 0, supplier: '', coreBoard: '', surfaceCode: '', image: '' });

    // Library
    const [library, setLibrary] = useState([]);
    const [loadingL, setLoadingL] = useState(true);
    const [searchL, setSearchL] = useState('');
    const [filterCatL, setFilterCatL] = useState('');
    const [editingL, setEditingL] = useState(null);
    const [newLibItem, setNewLibItem] = useState(null);

    // Upload
    const [editingCatName, setEditingCatName] = useState(null);
    const [editingLibCat, setEditingLibCat] = useState(null); // {old, new} for library category rename
    const excelInputRef = useRef(null);
    const [importPreview, setImportPreview] = useState(null);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(null);
    const [uploadTarget, setUploadTarget] = useState(null);
    const activeThumb = useRef(null);
    const imgUpRef = useRef(null);      // hidden input for product image
    const imgUpTarget = useRef(null);   // 'new' | {id}

    const fetchProducts = () => { setLoadingP(true); fetch('/api/products?limit=1000').then(r => r.json()).then(d => { setProducts(d.data || []); setLoadingP(false); }); };
    const fetchLibrary = () => { setLoadingL(true); fetch('/api/work-item-library?limit=1000').then(r => r.json()).then(d => { setLibrary(d.data || []); setLoadingL(false); }); };
    useEffect(() => { fetchProducts(); fetchLibrary(); }, []);

    // Global paste listener: click ô ảnh → paste ảnh từ clipboard
    const [pasteReady, setPasteReady] = useState(false); // hiện toast "Sẵn sàng paste"
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
            if (target === 'new') {
                setNewProduct(p => ({ ...p, image: url }));
            } else {
                await fetch(`/api/products/${target}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
                fetchProducts();
            }
        };
        document.addEventListener('paste', handler);
        return () => document.removeEventListener('paste', handler);
    }, []);

    // --- Products handlers ---
    const [extraCats, setExtraCats] = useState([]);
    const [addingCat, setAddingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    // Pill bar: only categories that have products (or user-added extra cats)
    const pCats = [...new Set([...products.map(p => p.category).filter(Boolean), ...extraCats])].sort();
    // Dropdown: full list for add/edit forms
    const allCats = [...new Set([...PRODUCT_CATS, ...pCats])].sort();
    const filteredP = products.filter(p =>
        (!filterCatP || p.category === filterCatP) &&
        (!filterSupplyType || normalizeSupply(p.supplyType) === filterSupplyType) &&
        (!filterStockStatus || stockStatus(p) === filterStockStatus) &&
        (!searchP || p.name.toLowerCase().includes(searchP.toLowerCase()) || (p.code || '').toLowerCase().includes(searchP.toLowerCase()))
    );

    const startEditP = (p) => setEditingP({ id: p.id, data: { ...p } });
    const saveP = async () => {
        const { id, data } = editingP;
        await fetch(`/api/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        setEditingP(null); fetchProducts();
    };
    const deleteP = async (id) => { if (!confirm('Xóa sản phẩm?')) return; await fetch(`/api/products/${id}`, { method: 'DELETE' }); fetchProducts(); };
    const duplicateP = async (p) => {
        const { id, code, createdAt, updatedAt, ...rest } = p;
        await fetch('/api/products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...rest, name: rest.name + ' (2)', stock: 0 }),
        });
        fetchProducts();
    };

    const addNewProduct = () => { setAddForm({ name: '', category: filterCatP || 'Nội thất thành phẩm', unit: 'cái', salePrice: 0, importPrice: 0, brand: '', supplyType: 'Mua ngoài', stock: 0, minStock: 0, supplier: '', coreBoard: '', surfaceCode: '', image: '' }); setShowAddModal(true); };

    // Upload ảnh sản phẩm
    const handleImgUpload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const fd = new FormData(); fd.append('file', file); fd.append('type', 'products');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const { url } = await res.json();
        if (imgUpTarget.current === 'new') {
            setNewProduct(p => ({ ...p, image: url }));
        } else if (imgUpTarget.current) {
            await fetch(`/api/products/${imgUpTarget.current}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
            fetchProducts();
        }
        imgUpTarget.current = null; e.target.value = '';
    };
    const saveRenameCategory = async () => {
        if (!editingCatName || editingCatName.new === editingCatName.old) { setEditingCatName(null); return; }
        await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldCategory: editingCatName.old, newCategory: editingCatName.new }) });
        setEditingCatName(null); fetchProducts();
    };
    const saveRenameLibCat = async () => {
        if (!editingLibCat || editingLibCat.new === editingLibCat.old) { setEditingLibCat(null); return; }
        if (!editingLibCat.new.trim()) { setEditingLibCat(null); return; }
        await fetch('/api/work-item-library', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldCategory: editingLibCat.old, newCategory: editingLibCat.new.trim() }) });
        if (filterCatL === editingLibCat.old) setFilterCatL(editingLibCat.new.trim());
        setEditingLibCat(null); fetchLibrary();
    };


    // Excel import
    const handleExcelFile = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const preview = rows.map(r => ({
            name: String(r['Tên'] || r['name'] || '').trim(),
            category: String(r['Danh mục'] || r['category'] || 'Nội thất thành phẩm').trim(),
            unit: String(r['ĐVT'] || r['unit'] || 'cái').trim(),
            importPrice: Number(r['Giá nhập'] || r['importPrice'] || 0),
            salePrice: Number(r['Giá bán'] || r['salePrice'] || 0),
            stock: Number(r['Tồn kho'] || r['stock'] || 0),
            brand: String(r['Thương hiệu'] || r['brand'] || '').trim(),
            description: String(r['Mô tả'] || r['description'] || '').trim(),
            image: '',
        })).filter(r => r.name);
        setImportPreview(preview);
        excelInputRef.current.value = '';
    };
    const confirmImport = async () => {
        if (!importPreview?.length) return;
        setImporting(true);
        for (const p of importPreview) {
            await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        }
        setImporting(false); setImportPreview(null); fetchProducts();
    };
    const saveNewProduct = async () => {
        if (!addForm.name.trim()) return alert('Vui lòng nhập tên sản phẩm');
        const res = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addForm) });
        if (!res.ok) { const err = await res.json(); return alert(err.error || 'Lỗi tạo sản phẩm'); }
        setShowAddModal(false); fetchProducts();
    };

    // --- Library handlers ---
    const lCats = [...new Set(library.map(i => i.category))].sort();
    const filteredL = library.filter(i =>
        (!filterCatL || i.category === filterCatL) &&
        (!searchL || i.name.toLowerCase().includes(searchL.toLowerCase()) || (i.subcategory || '').toLowerCase().includes(searchL.toLowerCase()))
    );

    const startEditL = (item) => setEditingL({ id: item.id, data: { ...item } });
    const saveL = async () => {
        const { id, data } = editingL;
        await fetch(`/api/work-item-library/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        setEditingL(null); fetchLibrary();
    };
    const deleteL = async (id) => { if (!confirm('Xóa hạng mục?')) return; await fetch(`/api/work-item-library/${id}`, { method: 'DELETE' }); fetchLibrary(); };
    const addNewLib = () => setNewLibItem({ name: '', category: filterCatL || '', subcategory: '', unit: 'cái', mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', image: '' });
    const saveNewLib = async () => {
        await fetch('/api/work-item-library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newLibItem, mainMaterial: Number(newLibItem.mainMaterial), auxMaterial: Number(newLibItem.auxMaterial), labor: Number(newLibItem.labor), unitPrice: Number(newLibItem.unitPrice) }) });
        setNewLibItem(null); fetchLibrary();
    };

    // Upload
    const triggerUpload = (id, entity) => { setUploadTarget({ id, entity }); fileInputRef.current?.click(); };

    const doUploadFile = useCallback(async (file, target) => {
        if (!file || !target) return;
        setUploading(target.id);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('type', target.entity === 'product' ? 'products' : 'library');
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const { url } = await res.json();
            if (target.entity === 'product') {
                await fetch(`/api/products/${target.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
                fetchProducts();
                setEditingP(p => p?.id === target.id ? { ...p, data: { ...p.data, image: url } } : p);
            } else {
                await fetch(`/api/work-item-library/${target.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: url }) });
                fetchLibrary();
                setEditingL(p => p?.id === target.id ? { ...p, data: { ...p.data, image: url } } : p);
            }
        } catch { alert('Upload lỗi'); }
        setUploading(null);
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (file && uploadTarget) await doUploadFile(file, uploadTarget);
        setUploadTarget(null); e.target.value = '';
    };

    // Paste ảnh từ clipboard (Ctrl+V) khi đang hover/focus vào thumb
    useEffect(() => {
        const onPaste = async (e) => {
            const target = activeThumb.current;
            if (!target) return;
            const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
            if (!item) return;
            e.preventDefault();
            const file = item.getAsFile();
            await doUploadFile(file, target);
        };
        document.addEventListener('paste', onPaste);
        return () => document.removeEventListener('paste', onPaste);
    }, [doUploadFile]);

    const Thumb = ({ image, id, entity }) => (
        <div
            onClick={() => triggerUpload(id, entity)}
            onMouseEnter={() => { activeThumb.current = { id, entity }; }}
            onMouseLeave={() => { if (activeThumb.current?.id === id) activeThumb.current = null; }}
            onFocus={() => { activeThumb.current = { id, entity }; }}
            onBlur={() => { if (activeThumb.current?.id === id) activeThumb.current = null; }}
            tabIndex={0}
            title="Click để chọn file · Ctrl+V để paste ảnh"
            style={{ width: 36, height: 36, cursor: 'pointer', flexShrink: 0, position: 'relative', outline: 'none' }}
            className="thumb-wrap"
        >
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
                <div>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 16 }}>
                        <div className="stat-card"><div className="stat-icon">📦</div><div><div className="stat-value">{products.length}</div><div className="stat-label">Tổng SP</div></div></div>
                        <div className="stat-card"><div className="stat-icon">📂</div><div><div className="stat-value">{pCats.length}</div><div className="stat-label">Danh mục</div></div></div>
                        <div className="stat-card"><div className="stat-icon">⚠️</div><div><div className="stat-value" style={{ color: lowStock > 0 ? 'var(--status-danger)' : '' }}>{lowStock}</div><div className="stat-label">Sắp hết</div></div></div>
                        <div className="stat-card"><div className="stat-icon">💰</div><div><div className="stat-value" style={{ fontSize: 13 }}>{fmtCur(products.reduce((s, p) => s + p.stock * p.salePrice, 0))}</div><div className="stat-label">Giá trị tồn</div></div></div>
                    </div>
                    <div className="card">
                        {/* Category filter bar */}
                        <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--border-color)', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', background: 'var(--bg)' }}>
                            {/* All pill */}
                            <button onClick={() => setFilterCatP('')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 20, border: !filterCatP ? 'none' : '1px solid var(--border-color)', background: !filterCatP ? 'var(--primary)' : 'transparent', color: !filterCatP ? '#fff' : 'var(--text-secondary)', fontSize: 12.5, fontWeight: !filterCatP ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s' }}>
                                Tất cả
                                <span style={{ background: !filterCatP ? 'rgba(255,255,255,0.25)' : 'var(--surface-alt)', color: !filterCatP ? '#fff' : 'var(--text-secondary)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{products.length}</span>
                            </button>
                            <div style={{ width: 1, height: 18, background: 'var(--border-color)', flexShrink: 0 }} />
                            {pCats.map(c => {
                                const count = products.filter(p => p.category === c).length;
                                const active = filterCatP === c;
                                return (
                                    <div key={c} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                        {editingCatName?.old === c ? (
                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                <input autoFocus value={editingCatName.new}
                                                    onChange={e => setEditingCatName(p => ({ ...p, new: e.target.value }))}
                                                    onBlur={saveRenameCategory}
                                                    onKeyDown={e => { if (e.key === 'Enter') saveRenameCategory(); if (e.key === 'Escape') setEditingCatName(null); }}
                                                    style={{ fontSize: 12, padding: '4px 12px', border: '1.5px solid var(--primary)', borderRadius: 20, width: 160, outline: 'none', background: 'var(--bg)' }} />
                                                <button onClick={saveRenameCategory} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</button>
                                                <button onClick={() => setEditingCatName(null)} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-alt)', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                                <button onClick={() => setFilterCatP(active ? '' : c)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: active ? '20px 0 0 20px' : 20, border: active ? 'none' : '1px solid var(--border-color)', borderRight: active ? 'none' : undefined, background: active ? 'var(--primary)' : 'transparent', color: active ? '#fff' : 'var(--text-secondary)', fontSize: 12.5, fontWeight: active ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                                                    {c}
                                                    <span style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--surface-alt)', color: active ? '#fff' : 'var(--text-secondary)', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 600 }}>{count}</span>
                                                </button>
                                                {active && (
                                                    <button onClick={() => setEditingCatName({ old: c, new: c })} title="Đổi tên danh mục" style={{ padding: '5px 9px', borderRadius: '0 20px 20px 0', border: 'none', background: 'var(--primary)', color: 'rgba(255,255,255,0.75)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'opacity 0.15s' }}>✏️</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div style={{ width: 1, height: 18, background: 'var(--border-color)', flexShrink: 0 }} />
                            {/* Add category */}
                            {addingCat ? (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                    <input autoFocus value={newCatName} placeholder="Tên danh mục..."
                                        onChange={e => setNewCatName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && newCatName.trim()) {
                                                const cat = newCatName.trim();
                                                if (!pCats.includes(cat)) setExtraCats(p => [...p, cat]);
                                                setFilterCatP(cat); setAddingCat(false); setNewCatName('');
                                                setNewProduct({ name: '', category: cat, unit: 'cái', importPrice: 0, salePrice: 0, stock: 0, minStock: 0, supplier: '', brand: '', description: '', image: '' });
                                            }
                                            if (e.key === 'Escape') { setAddingCat(false); setNewCatName(''); }
                                        }}
                                        style={{ fontSize: 12, padding: '5px 14px', border: '1.5px solid var(--primary)', borderRadius: 20, width: 180, outline: 'none', background: 'var(--bg)' }} />
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6, whiteSpace: 'nowrap' }}>↵ Enter để tạo</span>
                                    <button onClick={() => { setAddingCat(false); setNewCatName(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', opacity: 0.5, fontSize: 16, lineHeight: 1, padding: 2 }}>✕</button>
                                </div>
                            ) : (
                                <button onClick={() => setAddingCat(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 20, border: '1.5px dashed var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', opacity: 0.65, flexShrink: 0, transition: 'opacity 0.15s' }}>
                                    + Danh mục
                                </button>
                            )}
                        </div>
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input className="form-input" placeholder="🔍 Tìm kiếm..." value={searchP} onChange={e => setSearchP(e.target.value)} style={{ width: 200, fontSize: 13 }} />
                            <select className="form-select" value={filterSupplyType} onChange={e => setFilterSupplyType(e.target.value)} style={{ fontSize: 12, width: 140 }}>
                                <option value="">Nguồn cung</option>
                                {SUPPLY_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: 3, background: 'var(--surface-alt)', borderRadius: 8, padding: 3 }}>
                                {[['', 'Tất cả'], ['ok', 'Sẵn kho'], ['low', 'Sắp hết'], ['out', 'Hết hàng']].map(([v, label]) => (
                                    <button key={v} onClick={() => setFilterStockStatus(v)}
                                        style={{ fontSize: 11, padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', background: filterStockStatus === v ? '#fff' : 'transparent', color: filterStockStatus === v ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: filterStockStatus === v ? 600 : 400, boxShadow: filterStockStatus === v ? '0 1px 3px rgba(0,0,0,0.12)' : 'none', transition: 'all 0.15s' }}>{label}</button>
                                ))}
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                                {selectedIds.size > 0 && (
                                    <button className="btn btn-sm" style={{ fontSize: 12, background: '#ea580c', color: '#fff', border: 'none' }}
                                        onClick={() => {
                                            const nonBuy = [...selectedIds].filter(id => normalizeSupply(products.find(p => p.id === id)?.supplyType) !== 'Mua ngoài');
                                            if (nonBuy.length > 0) return alert('Vui lòng chỉ chọn sản phẩm "Mua ngoài"');
                                            router.push('/purchasing?createPO=1&products=' + [...selectedIds].join(','));
                                        }}>
                                        🛒 Tạo PO ({selectedIds.size})
                                    </button>
                                )}
                                <button className="btn btn-primary btn-sm" onClick={addNewProduct}>+ Thêm SP</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => excelInputRef.current?.click()} title="Import Excel">📥</button>
                                <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleExcelFile} />
                            </div>
                        </div>
                        {loadingP ? <div style={{ padding: 40, textAlign: 'center', opacity: 0.4 }}>Đang tải...</div> : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead><tr>
                                        <th style={{ width: 36, padding: '8px 4px' }}>
                                            <input type="checkbox" style={{ cursor: 'pointer' }}
                                                checked={filteredP.length > 0 && filteredP.every(p => selectedIds.has(p.id))}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedIds(new Set(filteredP.map(p => p.id)));
                                                    else setSelectedIds(new Set());
                                                }} />
                                        </th>
                                        <th style={{ width: 44 }}>Ảnh</th>
                                        <th style={{ minWidth: 200 }}>Tên sản phẩm</th>
                                        <th style={{ width: 55 }}>ĐVT</th>
                                        <th style={{ width: 110 }}>Giá bán</th>
                                        <th style={{ width: 65 }}>Tồn</th>
                                        <th style={{ width: 120 }}>Nguồn cung</th>
                                        <th style={{ width: 110 }}>Thương hiệu</th>
                                        <th style={{ width: 90 }}></th>
                                    </tr></thead>
                                    <tbody>
                                        {filteredP.map(p => {
                                            const isEditing = editingP?.id === p.id;
                                            const d = isEditing ? editingP.data : p;
                                            const ss = stockStatus(p);
                                            return (
                                                <tr key={p.id} style={{ background: isEditing ? 'rgba(99,102,241,0.04)' : ss === 'out' ? 'rgba(231,76,60,0.04)' : ss === 'low' ? 'rgba(234,88,12,0.03)' : '' }}>
                                                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                                                        <input type="checkbox" style={{ cursor: 'pointer' }}
                                                            checked={selectedIds.has(p.id)}
                                                            onChange={e => {
                                                                const next = new Set(selectedIds);
                                                                e.target.checked ? next.add(p.id) : next.delete(p.id);
                                                                setSelectedIds(next);
                                                            }} />
                                                    </td>
                                                    <td style={{ padding: 4, cursor: 'pointer' }}
                                                        onClick={() => { imgUpTarget.current = p.id; imgUpRef.current?.click(); }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {d.image
                                                                ? <img src={d.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                                                : <span style={{ fontSize: 16, opacity: 0.25 }}>📷</span>
                                                            }
                                                        </div>
                                                    </td>
                                                    <td>{isEditing
                                                        ? <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                            <EditCell value={d.name} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, name: v } }))} />
                                                            <EditCell value={d.category} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, category: v } }))} options={allCats} />
                                                        </div>
                                                        : <div>
                                                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary)', cursor: 'pointer' }}
                                                                onClick={() => router.push(`/products/${p.id}`)}>{p.name}</div>
                                                            <div style={{ fontSize: 11, opacity: 0.45 }}><span style={{ fontFamily: 'monospace' }}>{p.code}</span>{p.category && <span style={{ marginLeft: 6, background: 'var(--surface-alt)', borderRadius: 3, padding: '0 5px' }}>{p.category}</span>}</div>
                                                        </div>}
                                                    </td>
                                                    <td>{isEditing ? <EditCell value={d.unit} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, unit: v } }))} /> : p.unit}</td>
                                                    <td style={{ fontWeight: 600 }}>{isEditing ? <EditCell value={d.salePrice} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, salePrice: v } }))} type="number" /> : fmtCur(p.salePrice)}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                                                            {isEditing ? <EditCell value={d.stock} onChange={v => setEditingP(e => ({ ...e, data: { ...e.data, stock: v } }))} type="number" /> : <span style={{ color: ss === 'out' ? 'var(--status-danger)' : ss === 'low' ? '#ea580c' : '', fontWeight: ss !== 'ok' ? 600 : 400 }}>{p.stock}</span>}
                                                            {ss === 'out' && !isEditing && <span style={{ fontSize: 9, background: '#dc2626', color: '#fff', borderRadius: 3, padding: '1px 4px' }}>Hết</span>}
                                                            {ss === 'low' && !isEditing && <span style={{ fontSize: 9, background: '#ea580c', color: '#fff', borderRadius: 3, padding: '1px 4px' }}>Sắp hết</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: 12 }}>{isEditing ? (<select value={normalizeSupply(d.supplyType)} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, supplyType: e.target.value } }))} style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--bg-input)' }}>{SUPPLY_TYPES.map(t => <option key={t}>{t}</option>)}</select>) : <span className={`badge ${SUPPLY_BADGE[p.supplyType] || 'muted'}`}>{normalizeSupply(p.supplyType)}</span>}</td>
                                                    <td style={{ fontSize: 12 }}>{isEditing ? (<select value={d.brand || ''} onChange={e => setEditingP(ep => ({ ...ep, data: { ...ep.data, brand: e.target.value } }))} style={{ width: '100%', fontSize: 12, padding: '2px 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--bg-input)' }}>{BRANDS.map(b => <option key={b.n} value={b.n}>{b.n || '-- Không --'}</option>)}</select>) : (() => { const br = BRANDS.find(b => b.n === p.brand); return p.brand ? (<div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{br?.logo && <img src={br.logo} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />}<span>{p.brand}</span></div>) : <span style={{ opacity: 0.3 }}>-</span>; })()}</td>
                                                    <td><div style={{ display: 'flex', gap: 4 }}>
                                                        {isEditing
                                                            ? <><button className="btn btn-primary btn-sm" onClick={saveP} style={{ fontSize: 11 }}>✓ Lưu</button><button className="btn btn-ghost btn-sm" onClick={() => setEditingP(null)} style={{ fontSize: 11 }}>✕</button></>
                                                            : <><button className="btn btn-ghost btn-sm" onClick={() => startEditP(p)} title="Sửa">✏️</button><button className="btn btn-ghost btn-sm" onClick={() => duplicateP(p)} title="Copy">📋</button><button className="btn btn-ghost btn-sm" onClick={() => deleteP(p.id)} title="Xóa">🗑️</button></>}
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

            {/* Import preview modal */}
            {importPreview && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, maxWidth: 760, width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>📥 Preview Import — {importPreview.length} sản phẩm</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setImportPreview(null)}>✕</button>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--border-color)', borderRadius: 6 }}>
                            <table className="data-table" style={{ fontSize: 12 }}>
                                <thead><tr><th>#</th><th>Tên</th><th>Danh mục</th><th>ĐVT</th><th>Giá bán</th><th>Tồn</th><th>TH</th></tr></thead>
                                <tbody>{importPreview.map((p, i) => (
                                    <tr key={i}>
                                        <td style={{ opacity: .4 }}>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                                        <td><span className="badge badge-default">{p.category}</span></td>
                                        <td>{p.unit}</td>
                                        <td>{fmtCur(p.salePrice)}</td>
                                        <td>{p.stock}</td>
                                        <td>{p.brand || '-'}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setImportPreview(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>
                                {importing ? '⏳ Đang import...' : `✅ Xác nhận import ${importPreview.length} SP`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
