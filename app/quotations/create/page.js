'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';
import { QUOTATION_TYPES, fmt, emptyMainCategory, emptySubcategory } from '@/lib/quotation-constants';
import useQuotationForm from '@/hooks/useQuotationForm';
import useAutoSaveDraft from '@/hooks/useAutoSaveDraft';
import TreeSidebar from '@/components/quotation/TreeSidebar';
import QuotationSummary from '@/components/quotation/QuotationSummary';
import CategoryTable from '@/components/quotation/CategoryTable';

export default function CreateQuotationPage() {
    const router = useRouter();
    const toast = useToast();
    const hook = useQuotationForm({ toast });
    const [saving, setSaving] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [showTemplateSave, setShowTemplateSave] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [treeSidebarOpen, setTreeSidebarOpen] = useState(false);

    const {
        form, setForm, mainCategories, setMainCategories,
        customers, filteredProjects, activeMainIdx, setActiveMainIdx,
        addMainCategory, removeMainCategory, updateMainCategoryName, recalc, buildPayload,
    } = hook;

    useEffect(() => {
        apiFetch('/api/quotation-templates?limit=1000').then(d => setTemplates(d.data || []));
    }, []);

    // Auto-save draft
    useAutoSaveDraft({
        key: 'quotation_draft_create',
        data: { form, mainCategories },
        onRestore: (draft) => {
            if (draft.form) setForm(draft.form);
            if (draft.mainCategories) setMainCategories(draft.mainCategories);
            toast.info('Đã khôi phục bản nháp chưa lưu');
        },
    });

    const loadTemplate = (tmpl) => {
        setForm(f => ({ ...f, type: tmpl.type, vat: tmpl.vat, discount: tmpl.discount, managementFeeRate: tmpl.managementFeeRate, designFee: tmpl.designFee }));
        // Convert template categories → mainCategories (each template category becomes a main category with 1 subcategory)
        const mcs = tmpl.categories.map(cat => ({
            _key: Date.now() + Math.random(),
            name: cat.name,
            subtotal: 0,
            subcategories: [{
                _key: Date.now() + Math.random(),
                name: '',
                subtotal: 0,
                items: cat.items.map(item => ({ _key: Date.now() + Math.random(), ...item, amount: 0 })),
            }],
        }));
        setMainCategories(recalc(mcs.length > 0 ? mcs : [emptyMainCategory()]));
        setActiveMainIdx(0);
        toast.success(`Đã tải mẫu "${tmpl.name}"`);
    };

    const saveAsTemplate = async () => {
        if (!templateName.trim()) return toast.warning('Nhập tên mẫu!');
        try {
            // Flatten mainCategories → categories for template save
            const flatCats = [];
            mainCategories.forEach(mc => {
                mc.subcategories.forEach(sub => {
                    flatCats.push({
                        name: mc.name + (sub.name ? ` - ${sub.name}` : ''),
                        items: sub.items.map(({ _key, ...item }) => item),
                    });
                });
            });
            await apiFetch('/api/quotation-templates', {
                method: 'POST',
                body: JSON.stringify({
                    name: templateName, type: form.type, managementFeeRate: form.managementFeeRate,
                    designFee: form.designFee, vat: form.vat, discount: form.discount,
                    categories: flatCats,
                }),
            });
            setShowTemplateSave(false);
            setTemplateName('');
            apiFetch('/api/quotation-templates?limit=1000').then(d => setTemplates(d.data || []));
            toast.success('Đã lưu mẫu!');
        } catch (e) { toast.error(e.message); }
    };

    const handleSave = async () => {
        if (!form.customerId) return toast.warning('Chọn khách hàng!');
        setSaving(true);
        try {
            const saved = await apiFetch('/api/quotations', {
                method: 'POST', body: JSON.stringify(buildPayload()),
            });
            try { localStorage.removeItem('quotation_draft_create'); } catch { }
            toast.success('Đã lưu báo giá thành công!');
            router.push(`/quotations/${saved.id}/edit`);
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="quotation-layout">
            {/* Mobile tree toggle */}
            <button className="btn btn-primary quotation-tree-toggle" onClick={() => setTreeSidebarOpen(true)}>
                🔧 Thư viện
            </button>

            {/* Tree overlay (mobile) */}
            {treeSidebarOpen && <div className="quotation-tree-overlay" onClick={() => setTreeSidebarOpen(false)} />}

            {/* LEFT: Tree sidebar */}
            <div className={`quotation-tree-wrapper ${treeSidebarOpen ? 'open' : ''}`}>
                <TreeSidebar hook={hook} onClose={() => setTreeSidebarOpen(false)} />
            </div>

            {/* RIGHT: Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="quotation-page-header">
                    <h2 style={{ margin: 0 }}>Tạo Báo Giá</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" onClick={() => router.push('/quotations')}>← Quay lại</button>
                        <button className="btn btn-secondary" onClick={() => setShowTemplateSave(true)}>Lưu mẫu</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu báo giá'}</button>
                    </div>
                </div>

                {/* Templates */}
                {templates.length > 0 && (
                    <div className="card" style={{ marginBottom: 12, padding: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: 12, opacity: 0.5 }}>Mẫu:</span>
                            {templates.map(t => (
                                <button key={t.id} className="btn btn-secondary btn-sm" onClick={() => loadTemplate(t)} style={{ fontSize: 12 }}>{t.name}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Form */}
                <div className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header"><h3>Thông tin chung</h3></div>
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <div>
                                <label className="form-label">Khách hàng *</label>
                                <select className="form-select" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value, projectId: '' })}>
                                    <option value="">-- Chọn KH --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Dự án</label>
                                <select className="form-select" value={form.projectId || ''} onChange={e => setForm({ ...form, projectId: e.target.value || null })}>
                                    <option value="">-- Chọn DA --</option>
                                    {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Loại</label>
                                <select className="form-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                    {QUOTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main category tabs (Level 1) */}
                <div className="quotation-category-tabs">
                    {mainCategories.map((mc, mi) => (
                        <button key={mc._key} className={`btn ${mi === activeMainIdx ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => { setActiveMainIdx(mi); hook.setActiveSubIdx(0); }} style={{ fontSize: 12 }}>
                            {mc.name || `Hạng mục #${mi + 1}`}
                            <span style={{ opacity: 0.5, marginLeft: 4 }}>({fmt(mc.subtotal)}đ)</span>
                            {mainCategories.length > 1 && mi === activeMainIdx && (
                                <span onClick={(e) => { e.stopPropagation(); removeMainCategory(mi); }}
                                    style={{ marginLeft: 6, opacity: 0.5, cursor: 'pointer' }}>✕</span>
                            )}
                        </button>
                    ))}
                    <button className="btn btn-ghost btn-sm" onClick={addMainCategory} style={{ fontSize: 18, padding: '2px 10px' }}>+</button>
                </div>

                {/* Main category name input */}
                <div style={{ marginBottom: 8 }}>
                    <input className="form-input" placeholder="Tên hạng mục chính (VD: Thiết kế kiến trúc, Phòng ngủ 1...)"
                        value={mainCategories[activeMainIdx]?.name || ''}
                        onChange={e => updateMainCategoryName(activeMainIdx, e.target.value)}
                        style={{ fontWeight: 600, fontSize: 15 }} />
                </div>

                {/* Subcategory sections (Level 2 + Level 3) */}
                <CategoryTable mi={activeMainIdx} hook={hook} />

                {/* Summary */}
                <QuotationSummary hook={hook} />
            </div>

            {/* Modal lưu mẫu */}
            {showTemplateSave && (
                <div className="modal-overlay" onClick={() => setShowTemplateSave(false)}>
                    <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Lưu mẫu</h3><button className="btn btn-ghost" onClick={() => setShowTemplateSave(false)}>✕</button></div>
                        <div style={{ padding: 20 }}>
                            <label className="form-label">Tên mẫu *</label>
                            <input className="form-input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="VD: Biệt thự 3 tầng..." />
                            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost" onClick={() => setShowTemplateSave(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={saveAsTemplate}>Lưu</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
