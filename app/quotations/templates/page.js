'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { apiFetch } from '@/lib/fetchClient';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { QUOTATION_TYPES } from '@/lib/quotation-constants';

const INTERIOR_TYPES = new Set(['Báo giá nội thất']);

const emptyItem = () => ({ _key: Math.random(), name: '', unit: 'm²', quantity: 0, mainMaterial: 0, auxMaterial: 0, labor: 0, unitPrice: 0, description: '', length: 0, width: 0, height: 0, volume: 0 });
const emptyCategory = () => ({ _key: Math.random(), name: '', items: [emptyItem()] });

function TemplateEditor({ initial, onSave, onCancel }) {
    const [name, setName] = useState(initial?.name || '');
    const [type, setType] = useState(initial?.type || 'Thi công hoàn thiện');
    const [vat, setVat] = useState(initial?.vat ?? 10);
    const [discount, setDiscount] = useState(initial?.discount ?? 0);
    const [managementFeeRate, setManagementFeeRate] = useState(initial?.managementFeeRate ?? 5);
    const [designFee, setDesignFee] = useState(initial?.designFee ?? 0);
    const [categories, setCategories] = useState(() =>
        initial?.categories?.length
            ? initial.categories.map(c => ({ _key: Math.random(), name: c.name, items: c.items.map(i => ({ _key: Math.random(), ...i })) }))
            : [emptyCategory()]
    );

    const updateCat = (ci, field, value) => setCategories(cs => cs.map((c, i) => i === ci ? { ...c, [field]: value } : c));
    const addCat = () => setCategories(cs => [...cs, emptyCategory()]);
    const removeCat = (ci) => setCategories(cs => cs.filter((_, i) => i !== ci));

    const updateItem = (ci, ii, field, value) => setCategories(cs => cs.map((c, i) => i === ci
        ? {
            ...c, items: c.items.map((item, j) => {
                if (j !== ii) return item;
                const updated = { ...item, [field]: value };
                if (['length', 'height', 'quantity'].includes(field)) {
                    updated.volume = Math.round((updated.length || 0) * (updated.height || 0) * (updated.quantity || 1) * 100) / 100;
                }
                return updated;
            })
        }
        : c
    ));
    const addItem = (ci) => setCategories(cs => cs.map((c, i) => i === ci ? { ...c, items: [...c.items, emptyItem()] } : c));
    const removeItem = (ci, ii) => setCategories(cs => cs.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c));

    const handleSave = () => {
        if (!name.trim()) return alert('Nhập tên mẫu!');
        onSave({
            name: name.trim(), type, vat: +vat, discount: +discount,
            managementFeeRate: +managementFeeRate, designFee: +designFee,
            categories: categories.map(c => ({
                name: c.name,
                items: c.items.map(({ _key, ...item }) => item),
            })),
        });
    };

    const isInterior = INTERIOR_TYPES.has(type);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Header fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <div className="form-group">
                    <label className="form-label">Tên mẫu *</label>
                    <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Biệt thự 3 tầng..." />
                </div>
                <div className="form-group">
                    <label className="form-label">Loại</label>
                    <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                        {QUOTATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">VAT (%)</label>
                    <input type="number" className="form-input" value={vat} onChange={e => setVat(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Chiết khấu (%)</label>
                    <input type="number" className="form-input" value={discount} onChange={e => setDiscount(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Phí quản lý (%)</label>
                    <input type="number" className="form-input" value={managementFeeRate} onChange={e => setManagementFeeRate(e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Phí thiết kế</label>
                    <input type="number" className="form-input" value={designFee} onChange={e => setDesignFee(e.target.value)} />
                </div>
            </div>

            {/* Categories */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>Danh mục & hạng mục</strong>
                    <button className="btn btn-secondary btn-sm" onClick={addCat}>+ Thêm danh mục</button>
                </div>
                {categories.map((cat, ci) => (
                    <div key={cat._key} className="card" style={{ marginBottom: 12, padding: 12 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                            <input className="form-input" value={cat.name} onChange={e => updateCat(ci, 'name', e.target.value)}
                                placeholder={`Tên danh mục ${ci + 1}`} style={{ flex: 1 }} />
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeCat(ci)} title="Xóa danh mục">✕</button>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', minWidth: isInterior ? 860 : 700 }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-secondary)' }}>
                                    <th style={{ padding: '4px 6px', textAlign: 'left', minWidth: 140 }}>Hạng mục</th>
                                    {isInterior ? (<>
                                        <th style={{ padding: '4px 6px', textAlign: 'left', minWidth: 160 }}>Chất liệu</th>
                                        <th style={{ padding: '4px 6px', width: 58 }}>Dài</th>
                                        <th style={{ padding: '4px 6px', width: 58 }}>Sâu</th>
                                        <th style={{ padding: '4px 6px', width: 58 }}>Cao</th>
                                        <th style={{ padding: '4px 6px', width: 52 }}>SL CÁI</th>
                                        <th style={{ padding: '4px 6px', width: 58 }}>ĐVT</th>
                                        <th style={{ padding: '4px 6px', width: 62 }}>KL</th>
                                    </>) : (<>
                                        <th style={{ padding: '4px 6px', width: 60 }}>ĐVT</th>
                                        <th style={{ padding: '4px 6px', width: 60 }}>SL</th>
                                        <th style={{ padding: '4px 6px', width: 88 }}>VL chính</th>
                                        <th style={{ padding: '4px 6px', width: 88 }}>VL phụ</th>
                                        <th style={{ padding: '4px 6px', width: 88 }}>Nhân công</th>
                                    </>)}
                                    <th style={{ padding: '4px 6px', width: 90 }}>Đơn giá</th>
                                    <th style={{ padding: '4px 6px', width: 32 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cat.items.map((item, ii) => (
                                    <tr key={item._key} style={{ borderTop: '1px solid var(--border)' }}>
                                        <td style={{ padding: '3px 4px' }}>
                                            <input className="form-input" style={{ fontSize: 12, padding: '2px 6px' }} value={item.name}
                                                onChange={e => updateItem(ci, ii, 'name', e.target.value)} placeholder="Tên hạng mục..." />
                                        </td>
                                        {isInterior ? (<>
                                            <td style={{ padding: '3px 4px' }}>
                                                <textarea className="form-input" style={{ fontSize: 12, padding: '2px 6px', resize: 'vertical', minHeight: 32 }} value={item.description}
                                                    onChange={e => updateItem(ci, ii, 'description', e.target.value)} placeholder="Mô tả chất liệu..." />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.length || ''}
                                                    onChange={e => updateItem(ci, ii, 'length', +e.target.value)} placeholder="0" />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.width || ''}
                                                    onChange={e => updateItem(ci, ii, 'width', +e.target.value)} placeholder="0" />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.height || ''}
                                                    onChange={e => updateItem(ci, ii, 'height', +e.target.value)} placeholder="0" />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.quantity || ''}
                                                    onChange={e => updateItem(ci, ii, 'quantity', +e.target.value)} placeholder="0" />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.unit}
                                                    onChange={e => updateItem(ci, ii, 'unit', e.target.value)} />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px', background: 'var(--bg-secondary)' }} value={item.volume || ''}
                                                    onChange={e => updateItem(ci, ii, 'volume', +e.target.value)} placeholder="0" />
                                            </td>
                                        </>) : (<>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.unit}
                                                    onChange={e => updateItem(ci, ii, 'unit', e.target.value)} />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.quantity}
                                                    onChange={e => updateItem(ci, ii, 'quantity', +e.target.value)} />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.mainMaterial}
                                                    onChange={e => updateItem(ci, ii, 'mainMaterial', +e.target.value)} />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.auxMaterial}
                                                    onChange={e => updateItem(ci, ii, 'auxMaterial', +e.target.value)} />
                                            </td>
                                            <td style={{ padding: '3px 4px' }}>
                                                <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.labor}
                                                    onChange={e => updateItem(ci, ii, 'labor', +e.target.value)} />
                                            </td>
                                        </>)}
                                        <td style={{ padding: '3px 4px' }}>
                                            <input type="number" className="form-input" style={{ fontSize: 12, padding: '2px 4px' }} value={item.unitPrice}
                                                onChange={e => updateItem(ci, ii, 'unitPrice', +e.target.value)} />
                                        </td>
                                        <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                                            <button onClick={() => removeItem(ci, ii)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 14 }}>✕</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: 12 }} onClick={() => addItem(ci)}>+ Thêm hạng mục</button>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={onCancel}>Hủy</button>
                <button className="btn btn-primary" onClick={handleSave}>Lưu mẫu</button>
            </div>
        </div>
    );
}

export default function QuotationTemplatesPage() {
    const router = useRouter();
    const toast = useToast();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null); // 'new' | templateId | null
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [expanded, setExpanded] = useState({});
    const [saving, setSaving] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const d = await apiFetch('/api/quotation-templates?limit=1000');
            setTemplates(d.data || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleSave = async (data) => {
        setSaving(true);
        try {
            if (editingId === 'new') {
                await apiFetch('/api/quotation-templates', { method: 'POST', body: JSON.stringify(data) });
                toast.success('Đã tạo mẫu mới!');
            } else {
                await apiFetch(`/api/quotation-templates/${editingId}`, { method: 'PUT', body: JSON.stringify(data) });
                toast.success('Đã lưu mẫu!');
            }
            setEditingId(null);
            fetchTemplates();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await apiFetch(`/api/quotation-templates/${deleteTarget}`, { method: 'DELETE' });
            toast.success('Đã xóa mẫu');
            fetchTemplates();
        } catch (e) { toast.error(e.message); }
        setDeleteTarget(null);
    };

    const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

    const editingTemplate = editingId && editingId !== 'new' ? templates.find(t => t.id === editingId) : null;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <button className="btn btn-ghost" onClick={() => router.push('/quotations')}>← Báo giá</button>
                <h2 style={{ margin: 0 }}>Quản lý mẫu báo giá</h2>
            </div>

            {/* Editor modal */}
            {editingId && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingId(null)}>
                    <div className="modal" style={{ maxWidth: 900, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h3>{editingId === 'new' ? 'Tạo mẫu mới' : 'Chỉnh sửa mẫu'}</h3>
                            <button className="btn btn-ghost" onClick={() => setEditingId(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <TemplateEditor
                                key={editingId}
                                initial={editingTemplate}
                                onSave={handleSave}
                                onCancel={() => setEditingId(null)}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="card">
                <div className="card-header">
                    <h3>Danh sách mẫu ({templates.length})</h3>
                    <button className="btn btn-primary" onClick={() => setEditingId('new')}>+ Tạo mẫu mới</button>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
                ) : templates.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có mẫu nào. Bấm "+ Tạo mẫu mới" hoặc lưu mẫu từ trang tạo báo giá.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {templates.map(t => (
                            <div key={t.id} style={{ borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                                    onClick={() => toggleExpand(t.id)}>
                                    <span style={{ fontSize: 16 }}>{expanded[t.id] ? '▼' : '▶'}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {t.type} · VAT {t.vat}% · CK {t.discount}% · {t.categories?.length || 0} danh mục
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(t.id)}>✏️ Sửa</button>
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                                            onClick={() => setDeleteTarget(t.id)}>🗑</button>
                                    </div>
                                </div>

                                {expanded[t.id] && (
                                    <div style={{ padding: '0 16px 16px 40px' }}>
                                        {(t.categories || []).map((cat, ci) => (
                                            <div key={cat.id} style={{ marginBottom: 12 }}>
                                                <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                                    {ci + 1}. {cat.name || '(Chưa đặt tên)'}
                                                </div>
                                                {cat.items?.length > 0 ? (
                                                    <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                                                <th style={{ padding: '3px 8px', textAlign: 'left' }}>Hạng mục</th>
                                                                {INTERIOR_TYPES.has(t.type) && <th style={{ padding: '3px 8px', textAlign: 'left' }}>Chất liệu</th>}
                                                                {INTERIOR_TYPES.has(t.type) && <th style={{ padding: '3px 8px', width: 120 }}>Dài×Sâu×Cao</th>}
                                                                <th style={{ padding: '3px 8px', width: 50 }}>ĐVT</th>
                                                                <th style={{ padding: '3px 8px', width: 50 }}>{INTERIOR_TYPES.has(t.type) ? 'KL' : 'SL'}</th>
                                                                <th style={{ padding: '3px 8px', width: 100, textAlign: 'right' }}>Đơn giá</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {cat.items.map(item => (
                                                                <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                                                                    <td style={{ padding: '3px 8px' }}>{item.name}</td>
                                                                    {INTERIOR_TYPES.has(t.type) && (
                                                                        <td style={{ padding: '3px 8px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>{item.description}</td>
                                                                    )}
                                                                    {INTERIOR_TYPES.has(t.type) && (
                                                                        <td style={{ padding: '3px 8px' }}>
                                                                            {[item.length, item.width, item.height].filter(v => v).join('×') || ''}
                                                                            {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                                                                        </td>
                                                                    )}
                                                                    <td style={{ padding: '3px 8px' }}>{item.unit}</td>
                                                                    <td style={{ padding: '3px 8px' }}>{INTERIOR_TYPES.has(t.type) ? (item.volume || '') : (item.quantity || '')}</td>
                                                                    <td style={{ padding: '3px 8px', textAlign: 'right' }}>
                                                                        {item.unitPrice ? item.unitPrice.toLocaleString('vi-VN') : ''}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    </div>
                                                ) : (
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chưa có hạng mục</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Xóa mẫu báo giá?"
                message="Hành động này không thể hoàn tác."
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />
        </div>
    );
}
