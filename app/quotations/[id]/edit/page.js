'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';
import { QUOTATION_TYPES, QUOTATION_STATUSES, PRESET_CATEGORIES, fmt, emptyMainCategory } from '@/lib/quotation-constants';
import useQuotationForm from '@/hooks/useQuotationForm';
import useAutoSaveDraft from '@/hooks/useAutoSaveDraft';
import TreeSidebar from '@/components/quotation/TreeSidebar';
import QuotationSummary from '@/components/quotation/QuotationSummary';
import CategoryTable from '@/components/quotation/CategoryTable';

export default function EditQuotationPage() {
    const router = useRouter();
    const params = useParams();
    const toast = useToast();
    const hook = useQuotationForm({ toast });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploadingCell, setUploadingCell] = useState(null);
    const imgInputRef = useRef(null);
    const imgUploadTarget = useRef(null);
    const [treeSidebarOpen, setTreeSidebarOpen] = useState(false);
    const [qMeta, setQMeta] = useState({ status: 'Nháp', revision: 1, code: '', parentId: null, children: [] });

    const {
        form, setForm, mainCategories, setMainCategories,
        customers, filteredProjects, activeMainIdx, setActiveMainIdx,
        addMainCategory, removeMainCategory, updateMainCategoryName, applyPresetCategory, recalc, buildPayload,
    } = hook;

    // Load quotation data → convert flat categories (with group) into 3-level mainCategories
    useEffect(() => {
        apiFetch(`/api/quotations/${params.id}`).then(q => {
            const isDienNuoc = q.type === 'Thi công điện nước';
            setForm({
                customerId: q.customerId || '',
                projectId: q.projectId || '',
                type: q.type || 'Thi công thô',
                notes: q.notes || '',
                vat: q.vat ?? 10,
                discount: q.discount ?? 0,
                managementFeeRate: q.managementFeeRate ?? 5,
                designFee: q.designFee ?? 0,
                otherFee: q.otherFee ?? 0,
                adjustment: q.adjustment ?? 0,
                adjustmentType: q.adjustmentType || 'amount',
                status: q.status || 'Nháp',
                terms: q.terms || '',
                promoText: q.promoText || '',
            });
            setQMeta({
                status: q.status || 'Nháp', revision: q.revision || 1, code: q.code || '',
                parentId: q.parentId || null, children: q.children || [],
                lockedAt: q.lockedAt, createdAt: q.createdAt,
            });
            if (q.categories && q.categories.length > 0) {
                // Group categories by `group` field → build mainCategories
                const grouped = {};
                const groupOrder = [];
                q.categories.forEach(cat => {
                    const g = cat.group || cat.name || 'Hạng mục';
                    if (!grouped[g]) {
                        grouped[g] = [];
                        groupOrder.push(g);
                    }
                    grouped[g].push(cat);
                });

                const mcs = groupOrder.map(g => ({
                    _key: Date.now() + Math.random(),
                    name: g,
                    subtotal: 0,
                    subcategories: grouped[g].map(cat => ({
                        _key: Date.now() + Math.random(),
                        name: cat.name || '',
                        image: cat.image || '',
                        subtotal: cat.subtotal || 0,
                        ...(isDienNuoc && cat.sharedUnit != null ? {
                            sharedUnit: cat.sharedUnit,
                            sharedQuantity: cat.sharedQuantity ?? 1,
                            sharedUnitPrice: cat.sharedUnitPrice ?? 0,
                        } : {}),
                        items: (cat.items || []).map(item => ({
                            _key: Date.now() + Math.random(),
                            name: item.name || '',
                            unit: item.unit || 'm²',
                            quantity: item.quantity || 0,
                            volume: item.volume || 0,
                            mainMaterial: item.mainMaterial || 0,
                            auxMaterial: item.auxMaterial || 0,
                            labor: item.labor || 0,
                            unitPrice: item.unitPrice || 0,
                            amount: item.amount || 0,
                            description: item.description || '',
                            length: item.length || 0,
                            width: item.width || 0,
                            height: item.height || 0,
                            image: item.image || '',
                            productId: item.productId || null,
                            subItems: (item.subItems || []).map(si => ({
                                _key: Date.now() + Math.random(),
                                name: si.name || '', unit: si.unit || 'cái',
                                quantity: si.quantity || 0, volume: si.volume || 0,
                                unitPrice: si.unitPrice || 0, amount: si.amount || 0,
                                description: si.description || '',
                                length: si.length || 0, width: si.width || 0, height: si.height || 0,
                                image: si.image || '',
                            })),
                        })),
                    })),
                }));
                setMainCategories(recalc(mcs, q.type));
                if (q.deductions) hook.setDeductions((q.deductions || []).map(d => ({ ...d, _key: Date.now() + Math.random() })));
                if (q.paymentSchedule && Array.isArray(q.paymentSchedule) && q.paymentSchedule.length > 0) {
                    hook.setPaymentSchedule(q.paymentSchedule);
                }
            }
            setLoading(false);
        }).catch(e => {
            toast.error(e.message);
            setLoading(false);
        });
    }, [params.id]);

    // Auto-save draft
    useAutoSaveDraft({
        key: `quotation_draft_${params.id}`,
        data: { form, mainCategories },
        enabled: !loading,
        onRestore: (draft) => {
            if (draft.form) setForm(draft.form);
            if (draft.mainCategories) setMainCategories(draft.mainCategories);
            toast.info('Đã khôi phục bản nháp chưa lưu');
        },
    });

    // Image upload (items + subcategories)
    const handleImageClick = (mi, si, ii) => {
        imgUploadTarget.current = { mi, si, ii };
        imgInputRef.current?.click();
    };

    const handleSubcategoryImageClick = (mi, si) => {
        imgUploadTarget.current = { mi, si, ii: null, isSubcategory: true };
        imgInputRef.current?.click();
    };



    const handleImgChange = async (e) => {
        const file = e.target.files?.[0];
        const t = imgUploadTarget.current;
        if (!file || !t) { e.target.value = ''; return; }

        setUploadingCell(t);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('type', 'products');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload failed');
            const { url } = await res.json();

            if (t.isSubcategory) {
                hook.updateSubcategoryImage(t.mi, t.si, url);
            } else {
                const mcs = [...mainCategories];
                const sub = mcs[t.mi].subcategories[t.si];
                sub.items[t.ii] = { ...sub.items[t.ii], image: url };
                mcs[t.mi] = { ...mcs[t.mi], subcategories: [...mcs[t.mi].subcategories] };
                setMainCategories(mcs);
            }
            toast.success('Đã tải ảnh lên');
        } catch (err) {
            toast.error('Lỗi tải ảnh: ' + err.message);
        }
        setUploadingCell(null);
        imgUploadTarget.current = null;
        e.target.value = '';
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await apiFetch(`/api/quotations/${params.id}`, {
                method: 'PUT', body: JSON.stringify(buildPayload()),
            });
            try { localStorage.removeItem(`quotation_draft_${params.id}`); } catch { }
            // Update meta in case revision/status changed
            if (res.revision) setQMeta(m => ({ ...m, revision: res.revision, status: res.status || m.status }));
            if (res.status) setForm(f => ({ ...f, status: res.status }));
            toast.success('Đã cập nhật báo giá!');
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const handleClone = async (type) => {
        try {
            const res = await apiFetch(`/api/quotations/${params.id}`, {
                method: 'POST', body: JSON.stringify({ type }),
            });
            toast.success(type === 'supplemental' ? 'Đã tạo BG bổ sung!' : 'Đã tạo bản copy!');
            router.push(`/quotations/${res.id}/edit`);
        } catch (e) { toast.error(e.message); }
    };

    const isLocked = ['Hợp đồng', 'Từ chối'].includes(qMeta.status);
    const isWarning = qMeta.status === 'Gửi KH';
    const isConfirmed = qMeta.status === 'Xác nhận';

    const handleConfirmKH = async () => {
        try {
            await apiFetch(`/api/quotations/${params.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'Xác nhận' }) });
            setQMeta(m => ({ ...m, status: 'Xác nhận' }));
            toast.success('Đã xác nhận KH duyệt báo giá!');
        } catch (err) { toast.error(err.message); }
    };

    const handleGoToContract = () => {
        router.push(`/contracts/create?quotationId=${params.id}&customerId=${form.customerId}&projectId=${form.projectId || ''}&type=${encodeURIComponent(form.type)}&value=${hook.grandTotal || 0}`);
    };

    if (loading) return <div style={{ padding: 60, textAlign: 'center' }}>Đang tải...</div>;

    return (
        <div className="quotation-layout">
            <button className="btn btn-primary quotation-tree-toggle" onClick={() => setTreeSidebarOpen(true)}>
                🔧 Thư viện
            </button>
            {treeSidebarOpen && <div className="quotation-tree-overlay" onClick={() => setTreeSidebarOpen(false)} />}
            <div className={`quotation-tree-wrapper ${treeSidebarOpen ? 'open' : ''}`}>
                <TreeSidebar hook={hook} onClose={() => setTreeSidebarOpen(false)} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div className="quotation-page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h2 style={{ margin: 0 }}>Sửa Báo Giá</h2>
                        {qMeta.code && <span style={{ fontSize: 12, fontFamily: 'monospace', opacity: 0.5 }}>{qMeta.code}</span>}
                        {qMeta.revision > 1 && <span className="badge info" style={{ fontSize: 11 }}>v{qMeta.revision}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" onClick={() => router.push('/quotations')}>← Quay lại</button>
                        <button className="btn btn-ghost" onClick={() => window.open(`/quotations/${params.id}/pdf`, '_blank')}>📄 PDF</button>
                        {isLocked ? (
                            <>
                                {qMeta.status === 'Xác nhận' && (
                                    <button className="btn btn-primary" onClick={handleGoToContract}>📋 Tạo hợp đồng</button>
                                )}
                                <button className="btn btn-secondary" onClick={() => handleClone('supplemental')}>📋 Tạo BG bổ sung</button>
                                <button className="btn btn-ghost" onClick={() => handleClone('copy')}>📋 Tạo bản copy</button>
                            </>
                        ) : (
                            <>
                                {!['Xác nhận', 'Từ chối'].includes(qMeta.status) && (
                                    <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', fontWeight: 600 }}
                                        onClick={handleConfirmKH} title="Khách hàng đã duyệt báo giá này">
                                        ✓ KH xác nhận
                                    </button>
                                )}
                                {isConfirmed && (
                                    <button className="btn btn-primary" onClick={handleGoToContract}>📋 Tạo hợp đồng</button>
                                )}
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Cập nhật'}</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Lock / Warning banners */}
                {isLocked && (
                    <div style={{ padding: '10px 16px', background: qMeta.status === 'Hợp đồng' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', border: `1px solid ${qMeta.status === 'Hợp đồng' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`, borderRadius: 8, marginBottom: 12, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🔒 Báo giá đã <strong>{qMeta.status}</strong> — không thể chỉnh sửa.</span>
                        <button className="btn btn-primary btn-sm" onClick={() => handleClone('supplemental')} style={{ fontSize: 12 }}>📋 Tạo BG bổ sung</button>
                    </div>
                )}
                {isWarning && (
                    <div style={{ padding: '10px 16px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                        ⚠️ BG đã gửi khách hàng. Sửa sẽ ghi nhận thay đổi.
                    </div>
                )}
                {isConfirmed && (
                    <div style={{ padding: '10px 16px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: 8, marginBottom: 12, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>✅ Khách hàng đã xác nhận báo giá. Sửa sẽ tự động chuyển về "Gửi KH" và tăng phiên bản.</span>
                        <button className="btn btn-primary btn-sm" onClick={handleGoToContract} style={{ whiteSpace: 'nowrap', marginLeft: 12 }}>📋 Tạo hợp đồng</button>
                    </div>
                )}
                {qMeta.parentId && (
                    <div style={{ padding: '8px 16px', background: 'rgba(35,64,147,0.06)', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
                        📎 BG bổ sung cho: <a href={`/quotations/${qMeta.parentId}/edit`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>BG gốc</a>
                    </div>
                )}
                {qMeta.children?.length > 0 && (
                    <div style={{ padding: '8px 16px', background: 'rgba(35,64,147,0.06)', borderRadius: 8, marginBottom: 12, fontSize: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>📎 BG bổ sung:</span>
                        {qMeta.children.map(c => (
                            <a key={c.id} href={`/quotations/${c.id}/edit`} style={{ color: 'var(--primary)', textDecoration: 'underline' }}>{c.code}</a>
                        ))}
                    </div>
                )}

                {/* Thông tin chung */}
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
                                <label className="form-label">Trạng thái</label>
                                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    {QUOTATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Ghi chú</label>
                                <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main category tabs (Level 1) — sticky */}
                <div className="quotation-sticky-bar">
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

                    {/* Main category name — preset selector + free input */}
                    <div style={{ marginBottom: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select className="form-select" style={{ width: 220, fontSize: 13, flexShrink: 0 }}
                            value={PRESET_CATEGORIES.some(p => p.name === mainCategories[activeMainIdx]?.name) ? mainCategories[activeMainIdx]?.name : ''}
                            onChange={e => { if (e.target.value) applyPresetCategory(activeMainIdx, e.target.value); }}>
                            <option value="">— Chọn nhóm mẫu —</option>
                            {PRESET_CATEGORIES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                        </select>
                        <input className="form-input" placeholder="Hoặc nhập tên hạng mục tùy chỉnh..."
                            value={mainCategories[activeMainIdx]?.name || ''}
                            onChange={e => updateMainCategoryName(activeMainIdx, e.target.value)}
                            style={{ fontWeight: 600, fontSize: 15, flex: 1 }} />
                    </div>
                </div>

                {/* Subcategory sections (Level 2 + Level 3) */}
                <CategoryTable mi={activeMainIdx} hook={hook} onImageClick={handleImageClick} onSubcategoryImageClick={handleSubcategoryImageClick} quotationType={form.type} />

                {/* Upload indicator */}
                {uploadingCell && (
                    <div style={{ position: 'fixed', bottom: 20, right: 20, background: 'var(--accent-primary)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Đang tải ảnh...
                    </div>
                )}

                <QuotationSummary hook={hook} />
            </div>

            <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImgChange} />


        </div>
    );
}
