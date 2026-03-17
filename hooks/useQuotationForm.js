'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { emptyItem, emptySubcategory, emptyMainCategory, PRESET_CATEGORIES } from '@/lib/quotation-constants';

export default function useQuotationForm() {
    // Reference data
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [products, setProducts] = useState([]);
    const [library, setLibrary] = useState([]);
    const [prodCategories, setProdCategories] = useState([]);

    // Tree sidebar state
    const [expandedNodes, setExpandedNodes] = useState({});
    const [treeTab, setTreeTab] = useState('library');
    const [treeSearch, setTreeSearch] = useState('');
    const [editingLibItem, setEditingLibItem] = useState(null);
    const [editingLibCat, setEditingLibCat] = useState(null);
    const [editingProdCat, setEditingProdCat] = useState(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());

    // Form data
    const [form, setForm] = useState({
        customerId: '', projectId: '', type: 'Thi công thô', notes: '',
        managementFeeRate: 5, designFee: 0, otherFee: 0, vat: 10, discount: 0,
        adjustment: 0, adjustmentType: 'amount',
    });

    // 3-level hierarchy state
    const [mainCategories, setMainCategories] = useState([emptyMainCategory()]);
    const [activeMainIdx, setActiveMainIdx] = useState(0);
    const [activeSubIdx, setActiveSubIdx] = useState(0);

    // Deductions / Promotions
    const [deductions, setDeductions] = useState([]);

    // Load reference data
    useEffect(() => {
        apiFetch('/api/customers?limit=1000').then(d => setCustomers(d.data || [])).catch(() => { });
        apiFetch('/api/projects?limit=1000').then(d => setProjects(d.data || [])).catch(() => { });
        apiFetch('/api/products?limit=1000').then(d => setProducts(d.data || [])).catch(() => { });
        apiFetch('/api/work-item-library?limit=1000').then(d => setLibrary(d.data || d || [])).catch(() => { });
        apiFetch('/api/product-categories').then(cats => setProdCategories(cats || [])).catch(() => { });
    }, []);

    // Filtered projects
    const filteredProjects = useMemo(() =>
        form.customerId ? projects.filter(p => p.customerId === form.customerId) : projects,
        [form.customerId, projects]
    );

    // Tree search filter
    const filteredLibrary = useMemo(() => {
        if (!treeSearch.trim()) return library;
        const q = treeSearch.toLowerCase();
        return library.filter(l => l.name.toLowerCase().includes(q) || (l.category || '').toLowerCase().includes(q));
    }, [library, treeSearch]);

    const filteredProducts = useMemo(() => {
        if (!treeSearch.trim()) return products;
        const q = treeSearch.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    }, [products, treeSearch]);

    // Build tree structures
    const libTree = useMemo(() => {
        const tree = {};
        filteredLibrary.forEach(item => {
            const cat = item.category || 'Chung';
            const sub = item.subcategory || '';
            if (!tree[cat]) tree[cat] = {};
            if (!tree[cat][sub]) tree[cat][sub] = [];
            tree[cat][sub].push(item);
        });
        return tree;
    }, [filteredLibrary]);

    // Build hierarchical product tree from categories
    const prodTree = useMemo(() => {
        if (prodCategories.length === 0) {
            // Fallback: flat tree from category string
            const tree = {};
            filteredProducts.forEach(item => {
                const cat = item.category || 'Khác';
                if (!tree[cat]) tree[cat] = { name: cat, children: [], products: [] };
                tree[cat].products.push(item);
            });
            return Object.values(tree);
        }
        // Build from ProductCategory hierarchy
        const prodByCatId = {};
        const prodNoCat = [];
        filteredProducts.forEach(p => {
            if (p.categoryId) {
                if (!prodByCatId[p.categoryId]) prodByCatId[p.categoryId] = [];
                prodByCatId[p.categoryId].push(p);
            } else {
                prodNoCat.push(p);
            }
        });
        // Collect products for a category and all its descendants
        const collectProducts = (cat) => {
            let prods = [...(prodByCatId[cat.id] || [])];
            (cat.children || []).forEach(c => { prods = prods.concat(collectProducts(c)); });
            return prods;
        };
        const tree = prodCategories.map(parent => ({
            id: parent.id,
            name: parent.name,
            products: prodByCatId[parent.id] || [],
            children: (parent.children || []).map(child => ({
                id: child.id,
                name: child.name,
                products: prodByCatId[child.id] || [],
                children: (child.children || []).map(gc => ({
                    id: gc.id,
                    name: gc.name,
                    products: prodByCatId[gc.id] || [],
                })),
            })),
            totalProducts: collectProducts(parent).length,
        })).filter(c => c.totalProducts > 0 || c.children.some(ch => (prodByCatId[ch.id] || []).length > 0));
        if (prodNoCat.length > 0) {
            tree.push({ id: '__nocat', name: 'Chưa phân loại', products: prodNoCat, children: [], totalProducts: prodNoCat.length });
        }
        return tree;
    }, [filteredProducts, prodCategories]);

    const toggleNode = (key) => setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));

    // ========================================
    // RECALC: Calculate all totals
    // ========================================
    const recalc = useCallback((mcs) => {
        return mcs.map(mc => {
            const subs = mc.subcategories.map(sub => {
                const items = sub.items.map(item => {
                    const l = Number(item.length) || 0;
                    const w = Number(item.width) || 0;
                    const h = Number(item.height) || 0;
                    let qty = Number(item.quantity) || 0;
                    if (l && w) qty = l * w * (h || 1);
                    const unitPrice = Number(item.unitPrice) || 0;
                    return { ...item, quantity: qty, amount: qty * unitPrice };
                });
                const subtotal = items.reduce((s, i) => s + i.amount, 0);
                return { ...sub, items, subtotal };
            });
            const subtotal = subs.reduce((s, sub) => s + sub.subtotal, 0);
            return { ...mc, subcategories: subs, subtotal };
        });
    }, []);

    // ========================================
    // MAIN CATEGORY (Tab) handlers
    // ========================================
    const addMainCategory = () => {
        const mc = emptyMainCategory();
        setMainCategories(prev => {
            setActiveMainIdx(prev.length);
            return [...prev, mc];
        });
        setActiveSubIdx(0);
    };

    const removeMainCategory = (mi) => {
        if (mainCategories.length <= 1) return;
        const mcs = mainCategories.filter((_, i) => i !== mi);
        setMainCategories(mcs);
        setActiveMainIdx(Math.min(mi, mcs.length - 1));
        setActiveSubIdx(0);
    };

    const updateMainCategoryName = (mi, name) => {
        const mcs = [...mainCategories];
        mcs[mi] = { ...mcs[mi], name };
        setMainCategories(mcs);
    };

    // Apply preset category → set name + auto-create subcategories
    const applyPresetCategory = (mi, presetName) => {
        const preset = PRESET_CATEGORIES.find(p => p.name === presetName);
        if (!preset) return;
        const mcs = [...mainCategories];
        mcs[mi] = {
            ...mcs[mi],
            name: preset.name,
            subcategories: preset.subcategories.map(subName => emptySubcategory(subName)),
        };
        setMainCategories(mcs);
        setActiveSubIdx(0);
    };

    // ========================================
    // SUBCATEGORY (Section) handlers
    // ========================================
    const addSubcategory = (mi) => {
        const mcs = [...mainCategories];
        mcs[mi] = {
            ...mcs[mi],
            subcategories: [...mcs[mi].subcategories, emptySubcategory()],
        };
        setMainCategories(mcs);
        setActiveSubIdx(mcs[mi].subcategories.length - 1); // new subcategory index (0-based)
    };

    const removeSubcategory = (mi, si) => {
        const mcs = [...mainCategories];
        if (mcs[mi].subcategories.length <= 1) return;
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.filter((_, i) => i !== si),
        };
        setMainCategories(recalc(mcs));
        if (activeSubIdx >= mcs[mi].subcategories.length) setActiveSubIdx(mcs[mi].subcategories.length - 1);
    };

    const updateSubcategoryName = (mi, si, name) => {
        const mcs = [...mainCategories];
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) => i === si ? { ...s, name } : s),
        };
        setMainCategories(mcs);
    };

    const updateSubcategoryImage = (mi, si, image) => {
        const mcs = [...mainCategories];
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) => i === si ? { ...s, image } : s),
        };
        setMainCategories(mcs);
    };

    // ========================================
    // ITEM handlers
    // ========================================
    const addItem = (mi, si) => {
        const mcs = [...mainCategories];
        const sub = mcs[mi].subcategories[si];
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) =>
                i === si ? { ...s, items: [...s.items, emptyItem()] } : s
            ),
        };
        setMainCategories(mcs);
    };

    const removeItem = (mi, si, ii) => {
        const mcs = [...mainCategories];
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) =>
                i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s
            ),
        };
        setMainCategories(recalc(mcs));
    };

    const updateItem = (mi, si, ii, field, value) => {
        const mcs = [...mainCategories];
        const sub = mcs[mi].subcategories[si];
        const item = { ...sub.items[ii] };

        if (['quantity', 'unitPrice', 'length', 'width', 'height', 'mainMaterial', 'auxMaterial', 'labor'].includes(field)) {
            item[field] = parseFloat(value) || 0;
            // Auto-calc unitPrice from components
            if (['mainMaterial', 'auxMaterial', 'labor'].includes(field)) {
                item.unitPrice = (item.mainMaterial || 0) + (item.auxMaterial || 0) + (item.labor || 0);
            }
        } else {
            item[field] = value;
        }

        const newItems = [...sub.items];
        newItems[ii] = item;
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) =>
                i === si ? { ...s, items: newItems } : s
            ),
        };
        setMainCategories(recalc(mcs));
    };

    // ========================================
    // SUB-ITEM (phụ kiện) handlers
    // ========================================
    const addSubItem = (mi, si, ii) => {
        const mcs = [...mainCategories];
        const sub = mcs[mi].subcategories[si];
        const item = { ...sub.items[ii] };
        item.subItems = [...(item.subItems || []), {
            _key: Date.now() + Math.random(),
            name: '', unit: 'cái', quantity: 0, volume: 0,
            unitPrice: 0, amount: 0, description: '',
            length: 0, width: 0, height: 0, image: '',
        }];
        const newItems = [...sub.items];
        newItems[ii] = item;
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) =>
                i === si ? { ...s, items: newItems } : s
            ),
        };
        setMainCategories(mcs);
    };

    const removeSubItem = (mi, si, ii, sii) => {
        const mcs = [...mainCategories];
        const sub = mcs[mi].subcategories[si];
        const item = { ...sub.items[ii] };
        item.subItems = (item.subItems || []).filter((_, j) => j !== sii);
        const newItems = [...sub.items];
        newItems[ii] = item;
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) =>
                i === si ? { ...s, items: newItems } : s
            ),
        };
        setMainCategories(recalc(mcs));
    };

    const updateSubItem = (mi, si, ii, sii, field, value) => {
        const mcs = [...mainCategories];
        const sub = mcs[mi].subcategories[si];
        const item = { ...sub.items[ii] };
        const subItems = [...(item.subItems || [])];
        const si_item = { ...subItems[sii] };
        if (['quantity', 'unitPrice', 'length', 'width', 'height'].includes(field)) {
            si_item[field] = parseFloat(value) || 0;
        } else {
            si_item[field] = value;
        }
        // Recalc sub-item amount
        const qty = si_item.quantity || 0;
        si_item.amount = qty * (si_item.unitPrice || 0);
        subItems[sii] = si_item;
        item.subItems = subItems;
        const newItems = [...sub.items];
        newItems[ii] = item;
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) =>
                i === si ? { ...s, items: newItems } : s
            ),
        };
        setMainCategories(recalc(mcs));
    };

    // ========================================
    // Helper: build item from library/product
    // ========================================
    const libItemToQuotationItem = (libItem) => ({
        _key: Date.now() + Math.random(),
        name: libItem.name, unit: libItem.unit || 'm²', quantity: 0,
        mainMaterial: libItem.mainMaterial || 0, auxMaterial: libItem.auxMaterial || 0,
        labor: libItem.labor || 0, unitPrice: libItem.unitPrice || 0, amount: 0,
        description: libItem.description || '', image: libItem.image || '',
        length: 0, width: 0, height: 0,
    });

    const prodToQuotationItem = (prod) => ({
        _key: Date.now() + Math.random(),
        name: prod.name, unit: prod.unit || 'cái', quantity: 0,
        mainMaterial: prod.salePrice || 0, auxMaterial: 0, labor: 0,
        unitPrice: prod.salePrice || 0, amount: 0,
        description: `${prod.brand ? prod.brand + ' - ' : ''}${prod.description || ''}`.trim(),
        image: prod.image || '', length: 0, width: 0, height: 0,
        productId: prod.id || null,
    });

    // ========================================
    // Tree add handlers (single)
    // ========================================
    // Library item → add as SUBCATEGORY (level 2)
    const addFromLibrary = (libItem, explicitMi) => {
        const mi = explicitMi !== undefined ? explicitMi : activeMainIdx;
        const mcs = [...mainCategories];
        const newSub = {
            _key: Date.now() + Math.random(),
            name: libItem.name,
            items: [emptyItem()],
            subtotal: 0,
        };
        mcs[mi] = { ...mcs[mi], subcategories: [...mcs[mi].subcategories, newSub] };
        setMainCategories(mcs);
        setActiveSubIdx(mcs[mi].subcategories.length - 1);
    };

    // Product → add as LINE ITEM (level 3) — unchanged
    const addFromProduct = (prod, explicitMi, explicitSi) => {
        const mi = explicitMi !== undefined ? explicitMi : activeMainIdx;
        const si = explicitSi !== undefined ? explicitSi : activeSubIdx;
        const mcs = [...mainCategories];
        const sub = mcs[mi].subcategories[si];
        const existing = sub.items.filter(i => i.name.trim() !== '');
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) =>
                i === si ? { ...s, items: [...existing, prodToQuotationItem(prod)] } : s
            ),
        };
        setMainCategories(recalc(mcs));
    };

    // ========================================
    // Tree add handlers (bulk)
    // ========================================
    // Library bulk → create one subcategory per item
    const addBulkFromLibrary = (libItems) => {
        if (!libItems.length) return;
        const mi = activeMainIdx;
        const mcs = [...mainCategories];
        const newSubs = libItems.map(libItem => ({
            _key: Date.now() + Math.random(),
            name: libItem.name,
            items: [emptyItem()],
            subtotal: 0,
        }));
        mcs[mi] = { ...mcs[mi], subcategories: [...mcs[mi].subcategories, ...newSubs] };
        setMainCategories(mcs);
        setActiveSubIdx(mcs[mi].subcategories.length - 1);
    };

    const addBulkFromProducts = (prods) => {
        if (!prods.length) return;
        const mi = activeMainIdx;
        const si = activeSubIdx;
        const mcs = [...mainCategories];
        const sub = mcs[mi].subcategories[si];
        const existing = sub.items.filter(i => i.name.trim() !== '');
        const newItems = prods.map(prodToQuotationItem);
        mcs[mi] = {
            ...mcs[mi],
            subcategories: mcs[mi].subcategories.map((s, i) =>
                i === si ? { ...s, items: [...existing, ...newItems] } : s
            ),
        };
        setMainCategories(recalc(mcs));
    };

    // Add entire tree category as subcategories
    const addCategoryFromLibrary = (catName, libItems) => {
        if (!libItems.length) return;
        const mi = activeMainIdx;
        const mcs = [...mainCategories];
        // Each library item becomes its own subcategory
        const newSubs = libItems.map(libItem => ({
            _key: Date.now() + Math.random(),
            name: libItem.name,
            items: [emptyItem()],
            subtotal: 0,
        }));
        mcs[mi] = { ...mcs[mi], subcategories: [...mcs[mi].subcategories, ...newSubs] };
        setMainCategories(mcs);
        setActiveSubIdx(mcs[mi].subcategories.length - 1);
    };

    const addCategoryFromProducts = (catName, prods) => {
        if (!prods.length) return;
        const mi = activeMainIdx;
        const mcs = [...mainCategories];
        const newSub = {
            _key: Date.now() + Math.random(),
            name: catName,
            items: prods.map(prodToQuotationItem),
            subtotal: 0,
        };
        mcs[mi] = { ...mcs[mi], subcategories: [...mcs[mi].subcategories, newSub] };
        setMainCategories(recalc(mcs));
        setActiveSubIdx(mcs[mi].subcategories.length - 1);
    };

    // ========================================
    // Multi-select helpers
    // ========================================
    const toggleSelectItem = (id) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const selectAllInCategory = (items) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            const allSelected = items.every(i => next.has(i.id));
            items.forEach(i => allSelected ? next.delete(i.id) : next.add(i.id));
            return next;
        });
    };
    const addSelected = () => {
        if (selectedItems.size === 0) return;
        if (treeTab === 'library') {
            const items = library.filter(i => selectedItems.has(i.id));
            addBulkFromLibrary(items);
        } else {
            const items = products.filter(p => selectedItems.has(p.id));
            addBulkFromProducts(items);
        }
        setSelectedItems(new Set());
        setSelectMode(false);
    };
    const clearSelection = () => {
        setSelectedItems(new Set());
        setSelectMode(false);
    };

    // Quick-add: searchable list of all library + products
    const allSearchItems = useMemo(() => {
        const items = [];
        library.forEach(l => items.push({ ...l, _type: 'library', _label: l.name, _sub: l.category || '', _price: l.unitPrice }));
        products.forEach(p => items.push({ ...p, _type: 'product', _label: p.name, _sub: p.category || '', _price: p.salePrice }));
        return items;
    }, [library, products]);

    // ========================================
    // Inline edit handlers (library/product names & categories)
    // ========================================
    const saveLibItem = async () => {
        if (!editingLibItem) return;
        try {
            await apiFetch(`/api/library/${editingLibItem.id}`, { method: 'PATCH', body: JSON.stringify({ name: editingLibItem.name }) });
            setLibrary(prev => prev.map(l => l.id === editingLibItem.id ? { ...l, name: editingLibItem.name } : l));
        } catch { }
        setEditingLibItem(null);
    };

    const saveLibCategory = async () => {
        if (!editingLibCat || editingLibCat.old === editingLibCat.name) { setEditingLibCat(null); return; }
        try {
            await apiFetch('/api/library/rename-category', {
                method: 'POST', body: JSON.stringify({ oldName: editingLibCat.old, newName: editingLibCat.name }),
            });
            setLibrary(prev => prev.map(l => l.category === editingLibCat.old ? { ...l, category: editingLibCat.name } : l));
        } catch { }
        setEditingLibCat(null);
    };

    const saveProdCategory = async () => {
        if (!editingProdCat || editingProdCat.old === editingProdCat.name) { setEditingProdCat(null); return; }
        try {
            await apiFetch('/api/products/rename-category', {
                method: 'POST', body: JSON.stringify({ oldName: editingProdCat.old, newName: editingProdCat.name }),
            });
            setProducts(prev => prev.map(p => p.category === editingProdCat.old ? { ...p, category: editingProdCat.name } : p));
        } catch { }
        setEditingProdCat(null);
    };

    // ========================================
    // DEDUCTION handlers
    // ========================================
    const addDeduction = (type = 'khuyến mại') => {
        setDeductions(prev => [...prev, { _key: Date.now() + Math.random(), type, name: '', amount: 0, productId: null }]);
    };
    const removeDeduction = (idx) => {
        setDeductions(prev => prev.filter((_, i) => i !== idx));
    };
    const updateDeduction = (idx, field, value) => {
        setDeductions(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
    };

    // ========================================
    // CALCULATIONS
    // ========================================
    const directCost = mainCategories.reduce((s, mc) => s + mc.subtotal, 0);
    const managementFee = 0;
    const beforeAdjust = directCost + (form.designFee || 0) + (form.otherFee || 0);
    const adjustmentAmount = form.adjustmentType === 'percent'
        ? beforeAdjust * (form.adjustment || 0) / 100
        : (form.adjustment || 0);
    const total = beforeAdjust + adjustmentAmount;
    const discountAmount = total * (form.discount || 0) / 100;
    const afterDiscount = total - discountAmount;
    const totalDeductions = deductions.reduce((s, d) => s + (d.amount || 0), 0);
    const grandTotal = afterDiscount - totalDeductions;

    // ========================================
    // BUILD PAYLOAD for API (flatten 3-level → categories with group)
    // ========================================
    const buildPayload = () => {
        // Flatten mainCategories → categories array with group field
        const categories = [];
        mainCategories.forEach(mc => {
            mc.subcategories.forEach(sub => {
                categories.push({
                    name: sub.name,
                    group: mc.name,
                    image: sub.image || '',
                    subtotal: sub.subtotal || 0,
                    items: sub.items.filter(i => i.name.trim() !== '').map(item => ({
                        name: item.name,
                        unit: item.unit,
                        quantity: Number(item.quantity) || 0,
                        mainMaterial: Number(item.mainMaterial) || 0,
                        auxMaterial: Number(item.auxMaterial) || 0,
                        labor: Number(item.labor) || 0,
                        unitPrice: Number(item.unitPrice) || 0,
                        amount: Number(item.amount) || 0,
                        description: item.description || '',
                        length: Number(item.length) || 0,
                        width: Number(item.width) || 0,
                        height: Number(item.height) || 0,
                        image: item.image || '',
                        productId: item.productId || null,
                    })),
                });
            });
        });

        return {
            ...form,
            categories,
            deductions: deductions.map(d => ({ type: d.type, name: d.name, amount: d.amount || 0, productId: d.productId || null })),
            directCost, managementFee, adjustmentAmount, total,
            discount: form.discount, vat: form.vat,
            grandTotal,
        };
    };

    return {
        // Reference data
        customers, projects, products, library,
        filteredProjects,
        // Form state
        form, setForm,
        // 3-level hierarchy
        mainCategories, setMainCategories,
        activeMainIdx, setActiveMainIdx,
        activeSubIdx, setActiveSubIdx,
        // Main category handlers
        addMainCategory, removeMainCategory, updateMainCategoryName, applyPresetCategory,
        // Subcategory handlers
        addSubcategory, removeSubcategory, updateSubcategoryName, updateSubcategoryImage,
        // Item handlers
        addItem, removeItem, updateItem,
        // Sub-item handlers
        addSubItem, removeSubItem, updateSubItem,
        // Tree state
        treeSearch, setTreeSearch,
        expandedNodes, toggleNode,
        treeTab, setTreeTab,
        libTree, prodTree,
        // Inline edit state
        editingLibItem, setEditingLibItem, saveLibItem,
        editingLibCat, setEditingLibCat, saveLibCategory,
        editingProdCat, setEditingProdCat, saveProdCategory,
        // Tree actions (single)
        addFromLibrary, addFromProduct,
        // Tree actions (bulk)
        addBulkFromLibrary, addBulkFromProducts,
        addCategoryFromLibrary, addCategoryFromProducts,
        // Multi-select
        selectMode, setSelectMode,
        selectedItems, toggleSelectItem, selectAllInCategory,
        addSelected, clearSelection,
        // Quick-add autocomplete
        allSearchItems,
        // Calculation
        recalc,
        directCost, managementFee, adjustmentAmount, total,
        discountAmount, afterDiscount, grandTotal,
        totalDeductions,
        // Deductions
        deductions, setDeductions, addDeduction, removeDeduction, updateDeduction,
        // Build
        buildPayload,
    };
}
