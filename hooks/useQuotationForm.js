'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { emptyItem, emptyCategory, UNIT_OPTIONS } from '@/lib/quotation-constants';

export default function useQuotationForm({ toast }) {
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [products, setProducts] = useState([]);
    const [library, setLibrary] = useState([]);
    const [treeSearch, setTreeSearch] = useState('');
    const [expandedNodes, setExpandedNodes] = useState({});
    const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
    const [treeTab, setTreeTab] = useState('library');
    const [editingLibItem, setEditingLibItem] = useState(null);
    const [editingLibCat, setEditingLibCat] = useState(null);
    const [editingProdCat, setEditingProdCat] = useState(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState(new Set());

    const [form, setForm] = useState({
        customerId: '', projectId: '', type: 'Thi công thô', notes: '',
        vat: 10, discount: 0, managementFeeRate: 5, designFee: 0, otherFee: 0,
        adjustment: 0, adjustmentType: 'amount', status: 'Nháp',
    });
    const [categories, setCategories] = useState([emptyCategory()]);

    // Load reference data
    useEffect(() => {
        apiFetch('/api/customers?limit=1000').then(d => setCustomers(d.data || []));
        apiFetch('/api/projects?limit=1000').then(d => setProjects(d.data || []));
        apiFetch('/api/work-item-library?limit=1000').then(d => setLibrary(d.data || []));
        apiFetch('/api/products?limit=1000').then(d => setProducts(d.data || []));
    }, []);

    const filteredProjects = useMemo(() => {
        if (!form.customerId) return projects;
        return projects.filter(p => p.customerId === form.customerId);
    }, [form.customerId, projects]);

    // === Build LIBRARY tree ===
    const libTree = useMemo(() => {
        const map = {};
        const search = treeSearch.toLowerCase();
        library.forEach(item => {
            if (search && !item.name.toLowerCase().includes(search)
                && !(item.category || '').toLowerCase().includes(search)
                && !(item.subcategory || '').toLowerCase().includes(search)) return;
            const cat = item.category || 'Khác';
            if (!map[cat]) map[cat] = {};
            const sub = item.subcategory || '';
            if (!map[cat][sub]) map[cat][sub] = [];
            map[cat][sub].push(item);
        });
        return map;
    }, [library, treeSearch]);

    // === Build PRODUCTS tree ===
    const prodTree = useMemo(() => {
        const map = {};
        const search = treeSearch.toLowerCase();
        products.forEach(p => {
            if (search && !p.name.toLowerCase().includes(search) && !(p.category || '').toLowerCase().includes(search)) return;
            const cat = p.category || 'Khác';
            if (!map[cat]) map[cat] = [];
            map[cat].push(p);
        });
        return map;
    }, [products, treeSearch]);

    // Auto expand tree nodes
    useEffect(() => {
        const nodes = {};
        if (treeTab === 'library') {
            Object.entries(libTree).forEach(([cat, subs]) => {
                nodes[`lib:${cat}`] = true;
                Object.keys(subs).forEach(sub => { if (sub) nodes[`lib:${cat}:${sub}`] = true; });
            });
        } else {
            Object.keys(prodTree).forEach(k => { nodes[k] = true; });
        }
        setExpandedNodes(nodes);
    }, [libTree, prodTree, treeTab]);

    const toggleNode = (key) => setExpandedNodes(prev => ({ ...prev, [key]: !prev[key] }));

    // === Calculation ===
    const recalc = useCallback((cats) => cats.map(cat => {
        const items = cat.items.map(item => {
            const autoQty = (item.length && item.width && item.height)
                ? item.length * item.width * item.height
                : (item.length && item.width) ? item.length * item.width : null;
            const quantity = autoQty !== null ? autoQty : (item.quantity || 0);
            const amount = quantity * (item.unitPrice || 0);
            return { ...item, quantity, amount };
        });
        return { ...cat, items, subtotal: items.reduce((s, i) => s + i.amount, 0) };
    }), []);

    const directCost = categories.reduce((s, c) => s + c.subtotal, 0);
    const managementFee = directCost * (form.managementFeeRate || 0) / 100;
    const adjustmentAmount = form.adjustmentType === 'percent'
        ? directCost * (form.adjustment || 0) / 100
        : (form.adjustment || 0);
    const total = directCost + managementFee + (form.designFee || 0) + (form.otherFee || 0) + adjustmentAmount;
    const discountAmount = total * ((form.discount || 0) / 100);
    const afterDiscount = total - discountAmount;
    const vatAmount = afterDiscount * ((form.vat || 0) / 100);
    const grandTotal = afterDiscount + vatAmount;

    // === Category/Item handlers ===
    const addCategory = () => {
        setCategories(prev => [...prev, emptyCategory()]);
        setActiveCategoryIdx(categories.length);
    };
    const removeCategory = (ci) => {
        if (categories.length <= 1) return;
        const next = recalc(categories.filter((_, i) => i !== ci));
        setCategories(next);
        setActiveCategoryIdx(Math.min(ci, next.length - 1));
    };
    const updateCategoryName = (ci, name) => {
        const c = [...categories];
        c[ci] = { ...c[ci], name };
        setCategories(c);
    };
    const addItem = (ci) => {
        const c = [...categories];
        c[ci] = { ...c[ci], items: [...c[ci].items, emptyItem()] };
        setCategories(c);
    };
    const removeItem = (ci, ii) => {
        const c = [...categories];
        if (c[ci].items.length <= 1) return;
        c[ci] = { ...c[ci], items: c[ci].items.filter((_, i) => i !== ii) };
        setCategories(recalc(c));
    };
    const updateItem = (ci, ii, field, value) => {
        const c = [...categories];
        const numFields = ['quantity', 'unitPrice', 'length', 'width', 'height'];
        c[ci].items[ii] = {
            ...c[ci].items[ii],
            [field]: numFields.includes(field) ? parseFloat(value) || 0 : value,
        };
        setCategories(recalc(c));
    };

    // === Helper: build item from library ===
    const libItemToQuotationItem = (libItem) => ({
        _key: Date.now() + Math.random(),
        name: libItem.name, unit: libItem.unit || 'm²', quantity: 0,
        mainMaterial: libItem.mainMaterial || 0, auxMaterial: libItem.auxMaterial || 0,
        labor: libItem.labor || 0, unitPrice: libItem.unitPrice || 0, amount: 0,
        description: libItem.description || '', image: libItem.image || '',
        length: 0, width: 0, height: 0,
    });

    // === Helper: build item from product ===
    const prodToQuotationItem = (prod) => ({
        _key: Date.now() + Math.random(),
        name: prod.name, unit: prod.unit || 'cái', quantity: 0,
        mainMaterial: prod.salePrice || 0, auxMaterial: 0, labor: 0,
        unitPrice: prod.salePrice || 0, amount: 0,
        description: `${prod.brand ? prod.brand + ' - ' : ''}${prod.description || ''}`.trim(),
        image: prod.image || '', length: 0, width: 0, height: 0,
        productId: prod.id || null,
    });

    // === Add from library (single) ===
    const addFromLibrary = (libItem) => {
        const ci = activeCategoryIdx;
        const c = [...categories];
        if (!c[ci].name) c[ci] = { ...c[ci], name: libItem.category || libItem.name };
        const existing = c[ci].items.filter(i => i.name.trim() !== '');
        c[ci] = { ...c[ci], items: [...existing, libItemToQuotationItem(libItem)] };
        setCategories(recalc(c));
    };

    // === Add from product (single) ===
    const addFromProduct = (prod) => {
        const ci = activeCategoryIdx;
        const c = [...categories];
        const existing = c[ci].items.filter(i => i.name.trim() !== '');
        c[ci] = { ...c[ci], items: [...existing, prodToQuotationItem(prod)] };
        setCategories(recalc(c));
    };

    // === Bulk add from library (multi-select) ===
    const addBulkFromLibrary = (libItems) => {
        if (!libItems.length) return;
        const ci = activeCategoryIdx;
        const c = [...categories];
        const existing = c[ci].items.filter(i => i.name.trim() !== '');
        const newItems = libItems.map(libItemToQuotationItem);
        if (!c[ci].name && libItems[0].category) c[ci] = { ...c[ci], name: libItems[0].category };
        c[ci] = { ...c[ci], items: [...existing, ...newItems] };
        setCategories(recalc(c));
    };

    // === Bulk add from products (multi-select) ===
    const addBulkFromProducts = (prods) => {
        if (!prods.length) return;
        const ci = activeCategoryIdx;
        const c = [...categories];
        const existing = c[ci].items.filter(i => i.name.trim() !== '');
        const newItems = prods.map(prodToQuotationItem);
        c[ci] = { ...c[ci], items: [...existing, ...newItems] };
        setCategories(recalc(c));
    };

    // === Add entire category from library tree ===
    const addCategoryFromLibrary = (catName, libItems) => {
        if (!libItems.length) return;
        const newCat = {
            _key: Date.now() + Math.random(),
            name: catName,
            items: libItems.map(libItemToQuotationItem),
            subtotal: 0,
        };
        const c = [...categories, newCat];
        setCategories(recalc(c));
        setActiveCategoryIdx(c.length - 1);
    };

    // === Add entire product category ===
    const addCategoryFromProducts = (catName, prods) => {
        if (!prods.length) return;
        const newCat = {
            _key: Date.now() + Math.random(),
            name: catName,
            items: prods.map(prodToQuotationItem),
            subtotal: 0,
        };
        const c = [...categories, newCat];
        setCategories(recalc(c));
        setActiveCategoryIdx(c.length - 1);
    };

    // === Multi-select helpers ===
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

    // === Quick-add: searchable list of all library + products ===
    const allSearchItems = useMemo(() => {
        const items = [];
        library.forEach(l => items.push({ ...l, _type: 'library', _label: l.name, _sub: l.category || '', _price: l.unitPrice }));
        products.forEach(p => items.push({ ...p, _type: 'product', _label: p.name, _sub: p.category || '', _price: p.salePrice }));
        return items;
    }, [library, products]);

    // === Inline edit handlers ===
    const saveLibItem = async () => {
        if (!editingLibItem) return;
        await apiFetch(`/api/work-item-library/${editingLibItem.id}`, {
            method: 'PUT', body: JSON.stringify({ name: editingLibItem.name }),
        });
        apiFetch('/api/work-item-library?limit=1000').then(d => setLibrary(d.data || []));
        setEditingLibItem(null);
    };

    const saveLibCategory = async () => {
        if (!editingLibCat || !editingLibCat.name.trim() || editingLibCat.old === editingLibCat.name) {
            setEditingLibCat(null);
            return;
        }
        await apiFetch('/api/work-item-library', {
            method: 'PATCH', body: JSON.stringify({ oldCategory: editingLibCat.old, newCategory: editingLibCat.name }),
        });
        apiFetch('/api/work-item-library?limit=1000').then(d => setLibrary(d.data || []));
        setEditingLibCat(null);
    };

    const saveProdCategory = async () => {
        if (!editingProdCat || !editingProdCat.name.trim()) { setEditingProdCat(null); return; }
        await apiFetch('/api/products', {
            method: 'PATCH', body: JSON.stringify({ oldCategory: editingProdCat.old, newCategory: editingProdCat.name }),
        });
        apiFetch('/api/products?limit=1000').then(d => setProducts(d.data || []));
        setEditingProdCat(null);
    };

    // === Build payload ===
    const buildPayload = () => ({
        ...form,
        directCost,
        managementFee,
        adjustmentAmount,
        total,
        grandTotal,
        categories: categories.map(cat => ({
            name: cat.name,
            subtotal: cat.subtotal,
            items: cat.items.filter(i => i.name.trim()).map(({ _key, ...item }) => item),
        })),
    });

    return {
        // Reference data
        customers, projects, products, library,
        filteredProjects,
        // Form state
        form, setForm,
        categories, setCategories,
        // Tree state
        treeSearch, setTreeSearch,
        expandedNodes, toggleNode,
        treeTab, setTreeTab,
        libTree, prodTree,
        // Inline edit state
        editingLibItem, setEditingLibItem, saveLibItem,
        editingLibCat, setEditingLibCat, saveLibCategory,
        editingProdCat, setEditingProdCat, saveProdCategory,
        // Category/Item state
        activeCategoryIdx, setActiveCategoryIdx,
        addCategory, removeCategory, updateCategoryName,
        addItem, removeItem, updateItem,
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
        discountAmount, afterDiscount, vatAmount, grandTotal,
        // Build
        buildPayload,
    };
}
